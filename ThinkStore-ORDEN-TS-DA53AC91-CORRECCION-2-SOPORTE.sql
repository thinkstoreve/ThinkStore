-- THINKSTORE | RECTIFICACIÓN EXTRAORDINARIA #2 | TS-DA53AC91
-- DESTINO: Supabase SOPORTE (NO Main/Enterprise)
-- ATENCIÓN: Este es un cambio de producción, no una consulta de prueba.
-- Ejecutar una sola vez, tras respaldo y con esta orden sin operaciones de cobro en curso.
-- Objetivo: anular el pago ficticio +USD 60 del 13/oct/2026 a las
-- 23:25:44 UTC (19:25:44 Caracas). Preservar el pago real +USD 60 y DOS
-- líneas de repuestos ya instalados. NO registrar devolución de efectivo.
-- No usar el script anterior: apuntaba al pago de 16:39:37 UTC, ya anulado.
BEGIN;
DO $reconcile$
DECLARE
  o public.service_orders%ROWTYPE;
  v_payment_id uuid;
  v_last_payment_id uuid;
  v_payment_matches integer;
  v_installed integer;
  v_total numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('thinkstore:reconciliacion:TS-DA53AC91'));
  IF to_regclass('public.service_payment_voids') IS NULL
    OR to_regclass('public.service_payment_events') IS NULL
    OR to_regclass('public.service_order_parts') IS NULL THEN
    RAISE EXCEPTION 'Falta estructura de auditoría. No se alteró nada.';
  END IF;
  SELECT * INTO o FROM public.service_orders WHERE code='TS-DA53AC91' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La orden indicada no existe.'; END IF;
  IF round(coalesce(o.quote_amount,0),2)<>120.00
     OR round(coalesce(o.amount_paid,0),2)<>120.00
     OR lower(trim(coalesce(o.payment_status,'')))<>'pagado' THEN
    RAISE EXCEPTION 'Estado inesperado: presupuesto %, cobrado %, estado %. Detenido.',o.quote_amount,o.amount_paid,o.payment_status;
  END IF;
  SELECT count(*) INTO v_installed
    FROM public.service_order_parts p WHERE p.order_code=o.code
    AND coalesce(p.quantity_consumed,0)>0 AND coalesce(p.status,'')<>'released';
  IF v_installed<>2 THEN RAISE EXCEPTION 'Se esperaban exactamente 2 líneas instaladas; hay %. Detenido.',v_installed; END IF;
  SELECT count(*),max(e.id) INTO v_payment_matches,v_payment_id
    FROM public.service_payment_events e
    WHERE e.service_order_id=o.id AND e.event_type='payment'
    AND round(e.amount_delta,2)=60.00
    AND e.created_at>=timestamptz '2026-10-13 23:25:44+00'
    AND e.created_at<timestamptz '2026-10-13 23:25:45+00';
  IF v_payment_matches<>1 THEN RAISE EXCEPTION 'Se esperaba UN pago +60 a las 23:25:44 UTC; encontrados %. No se modificó nada.',v_payment_matches; END IF;
  -- El pago real fue registrado a las 16:32:41 UTC; debe conservarse.
  IF NOT EXISTS(SELECT 1 FROM public.service_payment_events e WHERE e.service_order_id=o.id
    AND e.event_type='payment' AND round(e.amount_delta,2)=60.00
    AND e.created_at>=timestamptz '2026-10-13 16:32:41+00'
    AND e.created_at<timestamptz '2026-10-13 16:32:42+00') THEN
    RAISE EXCEPTION 'No se encontró el pago legítimo inicial de USD 60. Detenido.';
  END IF;
  -- No repetir anulaciones.
  IF EXISTS(SELECT 1 FROM public.service_payment_voids WHERE original_event_id=v_payment_id) THEN
    RAISE EXCEPTION 'Este cobro ya fue anulado: %. Detenido.',v_payment_id;
  END IF;
  -- El duplicado nuevo debe ser el último movimiento POSITIVO.
  SELECT e.id INTO v_last_payment_id FROM public.service_payment_events e
    WHERE e.service_order_id=o.id AND e.event_type='payment' AND e.amount_delta>0
    ORDER BY e.created_at DESC,e.id DESC LIMIT 1;
  IF v_last_payment_id IS DISTINCT FROM v_payment_id THEN
    RAISE EXCEPTION 'Existe un pago posterior. No se anula un evento antiguo. Detenido.';
  END IF;
  SELECT round(coalesce(sum(e.amount_delta),0),2) INTO v_total
    FROM public.service_payment_events e WHERE e.service_order_id=o.id;
  IF v_total<>120.00 THEN RAISE EXCEPTION 'El historial neto es %, se esperaba 120. Detenido.',v_total; END IF;
  INSERT INTO public.service_payment_voids
     (service_order_id,original_event_id,amount_usd,actor_email,reason,cash_sync_status)
  VALUES (o.id,v_payment_id,60.00,current_user||'@sql-editor',
    'Segunda rectificación controlada: cobro ficticio USD 60 ingresado a las 19:25:44; el cliente pagó solo el primer abono de USD 60. No hubo dinero adicional ni devolución. Mantener instalados los 2 repuestos.',
    'pending');
  -- El trigger existente debe añadir un reverso -60 al historial.
  UPDATE public.service_orders
    SET amount_paid=60.00,payment_status='Abono parcial',paid_at=NULL,
        delivery_note_generated_at=NULL,updated_at=now(),
        payment_notes=left(concat_ws(E'\n',nullif(o.payment_notes,''),
          'SEGUNDA RECTIFICACIÓN: anulado el pago ficticio '||v_payment_id::text||
          ' de USD 60 (19:25:44). Cobrado neto USD 60, pendiente USD 60. Repuestos instalados sin reponer. Caja y Enterprise requieren conciliación; no hubo reembolso.'),1800)
  WHERE id=o.id;
  SELECT round(coalesce(sum(e.amount_delta),0),2) INTO v_total
    FROM public.service_payment_events e WHERE e.service_order_id=o.id;
  IF v_total<>60.00 THEN RAISE EXCEPTION 'No se produjo el reverso del pago ficticio. Historial neto %. Se deshace toda la operación.',v_total; END IF;
  RAISE NOTICE 'RECTIFICACIÓN SOPORTE OK. Evento anulado %. Cobrado 60; saldo 60; dos líneas instaladas.',v_payment_id;
END;
$reconcile$;
COMMIT;

-- VERIFICACIÓN DE SOLO LECTURA (después de COMMIT)
SELECT o.code,o.quote_amount,o.amount_paid,
  round(o.quote_amount-o.amount_paid,2) AS saldo_usd,o.payment_status,
  (SELECT round(coalesce(sum(e.amount_delta),0),2) FROM public.service_payment_events e
    WHERE e.service_order_id=o.id) AS historial_neto_usd,
  (SELECT count(*) FROM public.service_order_parts p WHERE p.order_code=o.code
    AND coalesce(p.quantity_consumed,0)>0 AND coalesce(p.status,'')<>'released') AS lineas_instaladas
FROM public.service_orders o WHERE o.code='TS-DA53AC91';
