-- Eliminación recuperable de ventas de prueba. Instalar NO elimina ninguna venta.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ts_test_order_archive(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE, code text NOT NULL,
 status text NOT NULL CHECK(status IN ('deleted','restored')), reason text NOT NULL,
 snapshot jsonb NOT NULL, inventory_delta jsonb NOT NULL DEFAULT '[]', adjustment_ids uuid[] NOT NULL DEFAULT '{}',
 deleted_by uuid NOT NULL, deleted_email text, deleted_at timestamptz NOT NULL DEFAULT now(),
 restored_by uuid, restored_at timestamptz
);
ALTER TABLE public.ts_test_order_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ts_test_order_archive FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ts_test_order_archive TO service_role;

CREATE OR REPLACE FUNCTION public.ts_test_order_bundle(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE bundle jsonb; pair text[]; rows_json jsonb;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Acceso no autorizado'; END IF;
 SELECT jsonb_build_object('pedidos',jsonb_build_array(to_jsonb(p))) INTO bundle FROM public.pedidos p WHERE id=p_id;
 IF bundle IS NULL THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;
 FOREACH pair SLICE 1 IN ARRAY ARRAY[
 ['pedido_items','pedido_id'],['comprobantes','pedido_id'],['inventory_reservations','pedido_id'],
 ['ts_order_payments','pedido_id'],['order_status_history','order_id'],['email_delivery_log','pedido_id'],
 ['delivery_note_versions','pedido_id'],['order_unit_assignments','pedido_id']]
 LOOP
  IF to_regclass('public.'||pair[1]) IS NOT NULL THEN
   IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=pair[1] AND column_name=pair[2]) THEN
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) FROM public.%I t WHERE %I=$1',pair[1],pair[2]) INTO rows_json USING p_id;
    bundle:=bundle||jsonb_build_object(pair[1],rows_json);
   ELSE RAISE EXCEPTION 'Estructura incompatible en %. Revisa la relación antes de limpiar',pair[1]; END IF;
  END IF;
 END LOOP;
 RETURN bundle;
END $$;
REVOKE ALL ON FUNCTION public.ts_test_order_bundle(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ts_test_order_bundle(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.ts_test_order_action(p_id uuid,p_mode text,p_actor uuid,p_email text,p_reason text DEFAULT '',p_confirm text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 o public.pedidos%ROWTYPE; a public.ts_test_order_archive%ROWTYPE; b jsonb; delta jsonb:='[]'; d jsonb; item jsonb;
 blockers text[]:='{}'; counts jsonb:='{}'; tbl text; col text; columns_sql text; r record;
 adjust_ids uuid[]:='{}'; adjust_id uuid; qty integer; sold_qty integer; reserved_qty integer; v public.inventory_variants%ROWTYPE;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Acceso no autorizado'; END IF;
 IF p_mode NOT IN ('preview','delete','restore') OR p_mode IS NULL THEN RAISE EXCEPTION 'Acción inválida'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('test-order:'||p_id::text,0));
 IF to_regclass('public.order_unit_assignments') IS NOT NULL THEN EXECUTE 'LOCK TABLE public.order_unit_assignments IN SHARE ROW EXCLUSIVE MODE'; END IF;
 IF p_mode='restore' THEN
  SELECT * INTO a FROM public.ts_test_order_archive WHERE order_id=p_id FOR UPDATE;
  IF NOT FOUND OR a.status<>'deleted' THEN RAISE EXCEPTION 'No hay una venta eliminada para restaurar'; END IF;
  IF p_confirm IS DISTINCT FROM 'RESTAURAR '||a.code OR length(trim(p_reason))<10 THEN RAISE EXCEPTION 'Escribe RESTAURAR y el código exacto e indica un motivo'; END IF;
  IF EXISTS(SELECT 1 FROM public.pedidos WHERE id=p_id OR codigo=a.code) THEN RAISE EXCEPTION 'Ya existe una orden con este identificador o código'; END IF;
  -- Restaurar por diferencias, nunca sobrescribir un saldo posterior de inventario.
  FOR d IN SELECT value FROM jsonb_array_elements(a.inventory_delta) ORDER BY value->>'variant_id' LOOP
   SELECT * INTO v FROM public.inventory_variants WHERE id=(d->>'variant_id')::uuid FOR UPDATE;
   IF NOT FOUND OR v.stock_on_hand-(d->>'hand')::integer < v.stock_reserved+(d->>'reserved')::integer THEN RAISE EXCEPTION 'Inventario insuficiente para restaurar la venta. Revisa existencias'; END IF;
   UPDATE public.inventory_variants SET stock_on_hand=stock_on_hand-(d->>'hand')::integer,
    stock_sold=stock_sold+(d->>'sold')::integer,stock_reserved=stock_reserved+(d->>'reserved')::integer,updated_at=now() WHERE id=v.id;
  END LOOP;
  -- Primero el padre, luego sus documentos dependientes.
  FOREACH tbl IN ARRAY ARRAY['pedidos','pedido_items','comprobantes','inventory_reservations','ts_order_payments','order_status_history','email_delivery_log','delivery_note_versions','order_unit_assignments'] LOOP
   IF jsonb_array_length(COALESCE(a.snapshot->tbl,'[]'))>0 THEN
    SELECT string_agg(format('%I',attname),',' ORDER BY attnum) INTO columns_sql FROM pg_attribute WHERE attrelid=to_regclass('public.'||tbl) AND attnum>0 AND NOT attisdropped AND attgenerated='';
    IF columns_sql IS NULL THEN RAISE EXCEPTION 'Falta la tabla % para restaurar',tbl; END IF;
    EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_recordset(NULL::public.%I,$1)',tbl,columns_sql,columns_sql,tbl) USING a.snapshot->tbl;
   END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(a.snapshot->'__units','[]')) LOOP
   EXECUTE 'SELECT to_jsonb(u) FROM public.inventory_units u WHERE id=$1 FOR UPDATE' INTO d USING (item->>'id')::uuid;
   IF d IS NULL OR d->>'status'<>'available' THEN RAISE EXCEPTION 'La unidad fue usada después de eliminar la prueba; revisa Inventory'; END IF;
   IF EXISTS(SELECT 1 FROM public.order_unit_assignments x WHERE x.unit_id=(item->>'id')::uuid AND x.active=true AND x.pedido_id<>p_id) THEN RAISE EXCEPTION 'La unidad está asignada a otra venta'; END IF;
   EXECUTE 'UPDATE public.inventory_units SET status=$1 WHERE id=$2' USING item->>'status',(item->>'id')::uuid;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(a.snapshot->'__audits_before','[]')) LOOP
   EXECUTE 'SELECT to_jsonb(t) FROM public.enterprise_weekly_audits t WHERE id=$1 FOR UPDATE' INTO d USING (item->>'id')::uuid;
   IF d IS DISTINCT FROM (SELECT value FROM jsonb_array_elements(a.snapshot->'__audits_after') WHERE value->>'id'=item->>'id') THEN RAISE EXCEPTION 'El cierre fue modificado posteriormente. Revisa su restauración'; END IF;
   EXECUTE 'UPDATE public.enterprise_weekly_audits SET status=$1,snapshot=$2 WHERE id=$3' USING item->>'status',item->'snapshot',(item->>'id')::uuid;
  END LOOP;
  DELETE FROM public.inventory_movements WHERE id=ANY(a.adjustment_ids);
  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(a.snapshot->'inventory_movements','[]')) LOOP
   UPDATE public.inventory_movements SET pedido_id=p_id,note=item->>'note' WHERE id=(item->>'id')::uuid;
   IF NOT FOUND THEN RAISE EXCEPTION 'Falta un movimiento original de inventario; la restauración se canceló'; END IF;
  END LOOP;
  UPDATE public.ts_test_order_archive SET status='restored',restored_at=now(),restored_by=p_actor WHERE id=a.id;
  INSERT INTO public.admin_audit_log(actor_email,action,entity_type,entity_id,before_data,after_data)
   VALUES(p_email,'restore_test_order','pedido',p_id::text,jsonb_build_object('archive_id',a.id),jsonb_build_object('code',a.code,'reason',p_reason,'actor_id',p_actor));
  RETURN jsonb_build_object('ok',true,'restored',true,'code',a.code);
 END IF;
 SELECT * INTO o FROM public.pedidos WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;
 b:=public.ts_test_order_bundle(p_id);
 SELECT b||jsonb_build_object('inventory_movements',COALESCE(jsonb_agg(to_jsonb(m)),'[]')) INTO b FROM public.inventory_movements m WHERE pedido_id=p_id;
 FOR tbl IN SELECT jsonb_object_keys(b) LOOP counts:=counts||jsonb_build_object(tbl,jsonb_array_length(b->tbl)); END LOOP;
 -- Rechazar relaciones nuevas que podrían desaparecer por cascada sin copia.
 IF EXISTS(SELECT 1 FROM pg_constraint WHERE contype='f' AND confrelid='public.pedidos'::regclass
   AND conrelid NOT IN ('public.pedido_items'::regclass,'public.comprobantes'::regclass,'public.inventory_movements'::regclass,'public.inventory_reservations'::regclass,'public.ts_order_payments'::regclass))
  OR EXISTS(SELECT 1 FROM pg_constraint WHERE contype='f' AND confrelid IN ('public.pedido_items'::regclass,'public.comprobantes'::regclass,'public.inventory_reservations'::regclass,'public.ts_order_payments'::regclass)) THEN
  blockers:=array_append(blockers,'Hay dependencias nuevas: requieren revisar el respaldo antes de eliminar');
 END IF;
 IF jsonb_array_length(COALESCE(b->'order_unit_assignments','[]'))>0 THEN
  IF to_regclass('public.inventory_units') IS NULL THEN blockers:=array_append(blockers,'No se puede verificar la unidad en Inventory');
  ELSE
   EXECUTE 'SELECT id FROM public.inventory_units WHERE id IN (SELECT unit_id FROM public.order_unit_assignments WHERE pedido_id=$1 AND active=true) ORDER BY id FOR UPDATE' USING p_id;
   EXECUTE 'SELECT coalesce(jsonb_agg(to_jsonb(u)),''[]''::jsonb) FROM public.inventory_units u WHERE id IN (SELECT unit_id FROM public.order_unit_assignments WHERE pedido_id=$1 AND active=true)' INTO d USING p_id;
   b:=b||jsonb_build_object('__units',d);
   FOR item IN SELECT value FROM jsonb_array_elements(d) LOOP
    EXECUTE 'SELECT id FROM public.inventory_units WHERE id=$1 FOR UPDATE' INTO adjust_id USING (item->>'id')::uuid;
    IF item->>'status' IS NULL OR item->>'status' NOT IN ('sold','reserved','available') THEN blockers:=array_append(blockers,'La unidad tiene un estado que requiere revisión manual'); END IF;
    IF EXISTS(SELECT 1 FROM public.order_unit_assignments x WHERE x.unit_id=(item->>'id')::uuid AND x.active=true AND x.pedido_id<>p_id) THEN blockers:=array_append(blockers,'La unidad aparece en otra venta activa'); END IF;
   END LOOP;
   IF (SELECT count(DISTINCT unit_id) FROM public.order_unit_assignments WHERE pedido_id=p_id AND active=true)<>jsonb_array_length(d) THEN blockers:=array_append(blockers,'Falta una unidad asignada en Inventory'); END IF;
  END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.enterprise_finance_entries e WHERE e.status<>'void' AND (e.source_id=p_id::text OR e.source_code=o.codigo)) THEN blockers:=array_append(blockers,'Tiene movimientos financieros vinculados. Revísalos antes de eliminar la prueba'); END IF;
 IF EXISTS(SELECT 1 FROM public.ts_staff_cash_sessions s WHERE s.status='closed' AND (s.closing_snapshot::text LIKE '%'||p_id::text||'%' OR s.closing_snapshot::text LIKE '%'||o.codigo||'%')) THEN blockers:=array_append(blockers,'Forma parte de un cierre de Caja Staff confirmado. Requiere rectificar ese cierre primero'); END IF;
 IF to_regclass('public.enterprise_weekly_audits') IS NOT NULL THEN
  EXECUTE 'SELECT id FROM public.enterprise_weekly_audits WHERE status=''closed'' AND (snapshot::text LIKE $1 OR snapshot::text LIKE $2) ORDER BY id FOR UPDATE' USING '%'||p_id::text||'%','%'||o.codigo||'%';
  EXECUTE 'SELECT coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) FROM public.enterprise_weekly_audits t WHERE status=''closed'' AND (snapshot::text LIKE $1 OR snapshot::text LIKE $2)' INTO d USING '%'||p_id::text||'%','%'||o.codigo||'%';
  b:=b||jsonb_build_object('__audits_before',d);
  FOR item IN SELECT value FROM jsonb_array_elements(d) LOOP
   IF item#>>'{snapshot,reconciliation,current,status}'='closed' AND item#>>'{snapshot,reconciliation,totals,completed}'='true' AND (item#>>'{snapshot,reconciliation,totals,difference}')::numeric=0 THEN
    blockers:=array_append(blockers,'Está incluida en un cierre financiero conciliado. Rectifica el cierre primero');
   END IF;
  END LOOP;
 END IF;
 FOR r IN SELECT variant_id,sum(quantity) FILTER(WHERE status='sold') sold,sum(quantity) FILTER(WHERE status='reserved') reserved
  FROM public.inventory_reservations WHERE pedido_id=p_id GROUP BY variant_id ORDER BY variant_id LOOP
  SELECT * INTO v FROM public.inventory_variants WHERE id=r.variant_id FOR UPDATE;
  sold_qty:=COALESCE(r.sold,0);reserved_qty:=COALESCE(r.reserved,0);
  IF v.id IS NULL OR v.stock_sold<sold_qty OR v.stock_reserved<reserved_qty THEN blockers:=array_append(blockers,'El inventario no coincide con las reservas de esta orden'); END IF;
  delta:=delta||jsonb_build_array(jsonb_build_object('variant_id',r.variant_id,'product',v.product_name,'hand',sold_qty,'sold',sold_qty,'reserved',reserved_qty));
 END LOOP;
 IF p_mode='preview' THEN RETURN jsonb_build_object('ok',true,'code',o.codigo,'status',o.estado,'total_usd',o.total_usd,'counts',counts,'inventory',delta,'blockers',to_jsonb(blockers),'can_delete',cardinality(blockers)=0,'units_to_release',jsonb_array_length(COALESCE(b->'__units','[]')),'closings_to_review',jsonb_array_length(COALESCE(b->'__audits_before','[]'))); END IF;
 IF p_actor IS NULL OR p_confirm IS DISTINCT FROM 'ELIMINAR '||o.codigo OR length(trim(COALESCE(p_reason,'')))<10 THEN RAISE EXCEPTION 'Confirma ELIMINAR y el código exacto; motivo mínimo 10 caracteres'; END IF;
 IF cardinality(blockers)>0 THEN RAISE EXCEPTION '%',array_to_string(blockers,' · '); END IF;
 IF EXISTS(SELECT 1 FROM public.ts_test_order_archive WHERE order_id=p_id AND status='deleted') THEN RAISE EXCEPTION 'La venta ya está eliminada'; END IF;
 FOR d IN SELECT value FROM jsonb_array_elements(delta) LOOP
  UPDATE public.inventory_variants SET stock_on_hand=stock_on_hand+(d->>'hand')::integer,
   stock_sold=stock_sold-(d->>'sold')::integer,stock_reserved=stock_reserved-(d->>'reserved')::integer,updated_at=now() WHERE id=(d->>'variant_id')::uuid;
  qty:=(d->>'hand')::integer+(d->>'reserved')::integer;
  IF qty>0 THEN
   INSERT INTO public.inventory_movements(variant_id,movement_type,quantity,note,actor_user_id)
    VALUES((d->>'variant_id')::uuid,'adjustment',qty,'Reversión de venta de prueba '||o.codigo||': '||left(p_reason,180),p_actor) RETURNING id INTO adjust_id;
   adjust_ids:=array_append(adjust_ids,adjust_id);
  END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(b->'__units','[]')) LOOP
  EXECUTE 'UPDATE public.inventory_units SET status=''available'' WHERE id=$1' USING (item->>'id')::uuid;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(b->'__audits_before','[]')) LOOP
  EXECUTE 'UPDATE public.enterprise_weekly_audits SET status=''draft'',snapshot=coalesce(snapshot,''{}''::jsonb)||jsonb_build_object(''test_cleanup'',jsonb_build_object(''order_id'',$1,''code'',$2,''reason'',$3,''at'',now())) WHERE id=$4' USING p_id,o.codigo,p_reason,(item->>'id')::uuid;
 END LOOP;
 IF jsonb_array_length(COALESCE(b->'__audits_before','[]'))>0 THEN
  EXECUTE 'SELECT coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) FROM public.enterprise_weekly_audits t WHERE id IN (SELECT (value->>''id'')::uuid FROM jsonb_array_elements($1))' INTO d USING b->'__audits_before';
  b:=b||jsonb_build_object('__audits_after',d);
 END IF;
 INSERT INTO public.ts_test_order_archive(order_id,code,status,reason,snapshot,inventory_delta,adjustment_ids,deleted_by,deleted_email)
 VALUES(p_id,o.codigo,'deleted',left(p_reason,500),b,delta,adjust_ids,p_actor,p_email)
 ON CONFLICT(order_id) DO UPDATE SET status='deleted',reason=EXCLUDED.reason,snapshot=EXCLUDED.snapshot,inventory_delta=EXCLUDED.inventory_delta,adjustment_ids=EXCLUDED.adjustment_ids,deleted_by=p_actor,deleted_email=p_email,deleted_at=now(),restored_at=NULL,restored_by=NULL;
 UPDATE public.inventory_movements SET pedido_id=NULL,note=COALESCE(note,'')||' [Prueba eliminada '||o.codigo||']' WHERE pedido_id=p_id;
 -- No emitir correos ni registrar una salida/devolución ficticia de dinero.
 FOREACH tbl IN ARRAY ARRAY['order_unit_assignments','delivery_note_versions','email_delivery_log','order_status_history','ts_order_payments','comprobantes','inventory_reservations','pedido_items'] LOOP
  IF b ? tbl THEN
   col:=CASE WHEN tbl='order_status_history' THEN 'order_id' ELSE 'pedido_id' END;
   EXECUTE format('DELETE FROM public.%I WHERE %I=$1',tbl,col) USING p_id;
  END IF;
 END LOOP;
 DELETE FROM public.pedidos WHERE id=p_id;
 INSERT INTO public.admin_audit_log(actor_email,action,entity_type,entity_id,before_data,after_data)
  VALUES(p_email,'delete_test_order','pedido',p_id::text,jsonb_build_object('code',o.codigo,'total_usd',o.total_usd),jsonb_build_object('reason',p_reason,'actor_id',p_actor,'recoverable',true,'counts',counts,'inventory',delta));
 RETURN jsonb_build_object('ok',true,'deleted',true,'recoverable',true,'code',o.codigo);
END $$;
REVOKE ALL ON FUNCTION public.ts_test_order_action(uuid,text,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ts_test_order_action(uuid,text,uuid,text,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
