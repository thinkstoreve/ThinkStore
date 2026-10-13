-- ThinkStore V15.39 — Soporte, anulación trazable de abonos parciales.
-- Ejecutar SOLO en Supabase SOPORTE después de verificar un respaldo.
-- No borra pagos existentes; el trigger de service_orders crea el movimiento negativo.
-- Requiere service_orders.id BIGINT y service_payment_events.id UUID.
BEGIN;
-- Verifica la estructura real para impedir aplicar esta migración al proyecto equivocado.
DO $check$
DECLARE order_type text; event_pk_type text; event_fk_type text;
BEGIN
  SELECT format_type(a.atttypid,a.atttypmod) INTO order_type FROM pg_attribute a
   WHERE a.attrelid=to_regclass('public.service_orders') AND a.attname='id' AND NOT a.attisdropped;
  SELECT format_type(a.atttypid,a.atttypmod) INTO event_pk_type FROM pg_attribute a
   WHERE a.attrelid=to_regclass('public.service_payment_events') AND a.attname='id' AND NOT a.attisdropped;
  SELECT format_type(a.atttypid,a.atttypmod) INTO event_fk_type FROM pg_attribute a
   WHERE a.attrelid=to_regclass('public.service_payment_events') AND a.attname='service_order_id' AND NOT a.attisdropped;
  IF order_type IS DISTINCT FROM 'bigint' OR event_fk_type IS DISTINCT FROM 'bigint' OR event_pk_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'Esquema incompatible (orden %, historial FK %, evento ID %); no se hicieron cambios',order_type,event_fk_type,event_pk_type;
  END IF;
END;
$check$;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.service_payment_voids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id bigint NOT NULL REFERENCES public.service_orders(id),
  original_event_id uuid NOT NULL UNIQUE REFERENCES public.service_payment_events(id),
  amount_usd numeric(12,2) NOT NULL CHECK (amount_usd > 0),
  actor_email text NOT NULL,
  reason text NOT NULL CHECK (char_length(reason)>=10),
  cash_sync_status text NOT NULL DEFAULT 'pending' CHECK (cash_sync_status IN ('pending','posted','not_applicable')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_payment_voids_order_idx ON public.service_payment_voids(service_order_id,created_at DESC);
ALTER TABLE public.service_payment_voids ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_payment_voids FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.service_payment_voids TO service_role;

CREATE OR REPLACE FUNCTION public.ts_service_void_partial_payment(
 p_order_code text, p_event_id uuid, p_reason text, p_actor_email text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
 o public.service_orders%rowtype;
 e public.service_payment_events%rowtype;
 latest_id uuid;
 already public.service_payment_voids%rowtype;
 before_paid numeric(12,2);
 after_paid numeric(12,2);
BEGIN
 IF coalesce(char_length(trim(p_reason)),0)<10 OR char_length(p_reason)>500 THEN RAISE EXCEPTION 'Indica un motivo de 10 a 500 caracteres'; END IF;
 IF coalesce(char_length(trim(p_actor_email)),0)<5 THEN RAISE EXCEPTION 'Identidad de administrador requerida'; END IF;
 SELECT * INTO o FROM public.service_orders WHERE upper(code)=upper(trim(p_order_code)) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Orden no encontrada'; END IF;
 SELECT * INTO already FROM public.service_payment_voids WHERE original_event_id=p_event_id;
 IF FOUND THEN
   IF already.service_order_id<>o.id THEN RAISE EXCEPTION 'El evento no pertenece a esta orden'; END IF;
   RETURN jsonb_build_object('ok',true,'duplicate',true,'event_id',p_event_id,'order_id',o.id,'order_code',o.code,'reversal_usd',already.amount_usd,'after',coalesce(o.amount_paid,0));
 END IF;
 SELECT * INTO e FROM public.service_payment_events WHERE id=p_event_id AND service_order_id=o.id FOR UPDATE;
 IF NOT FOUND OR e.amount_delta<=0 OR e.event_type<>'payment' THEN RAISE EXCEPTION 'Este movimiento no puede anularse'; END IF;
 before_paid:=round(coalesce(o.amount_paid,0),2);
 IF before_paid<=0 OR before_paid>=round(coalesce(o.quote_amount,0),2) OR lower(coalesce(o.payment_status,'')) IN ('pagado','cobrado') THEN
   RAISE EXCEPTION 'Solo se pueden anular abonos de órdenes con pago parcial; los pagos cerrados requieren conciliación manual';
 END IF;
 -- No se revierte automáticamente inventario ya consumido.
 IF EXISTS (SELECT 1 FROM public.service_order_parts WHERE order_code=o.code AND coalesce(quantity_consumed,0)>0 AND status <> 'released') THEN
   RAISE EXCEPTION 'Esta orden ya consumió inventario; requiere conciliación manual';
 END IF;
 SELECT p.id INTO latest_id FROM public.service_payment_events p
 WHERE p.service_order_id=o.id AND p.event_type='payment' AND p.amount_delta>0
 AND NOT EXISTS (SELECT 1 FROM public.service_payment_voids v WHERE v.original_event_id=p.id)
 ORDER BY p.created_at DESC,p.id DESC LIMIT 1;
 IF latest_id IS DISTINCT FROM p_event_id THEN RAISE EXCEPTION 'Solo puedes anular el último abono activo. Corrige desde el más reciente'; END IF;
 IF before_paid+0.005<e.amount_delta THEN RAISE EXCEPTION 'El importe supera el dinero recibido'; END IF;
 after_paid:=round(before_paid-e.amount_delta,2);
 INSERT INTO public.service_payment_voids(service_order_id,original_event_id,amount_usd,actor_email,reason)
 VALUES(o.id,p_event_id,e.amount_delta,trim(p_actor_email),trim(p_reason));
 UPDATE public.service_orders
 SET amount_paid=after_paid,
     payment_status=CASE WHEN after_paid<=0 THEN 'Pendiente' ELSE 'Abono parcial' END,
     payment_method=CASE WHEN after_paid<=0 THEN NULL ELSE payment_method END,
     payment_notes=left(concat_ws(E'\n',nullif(payment_notes,''),'ANULACIÓN DE ABONO '||p_event_id::text||': '||trim(p_reason)),1800),
     paid_at=now(),updated_at=now()
 WHERE id=o.id;
 RETURN jsonb_build_object('ok',true,'duplicate',false,'event_id',p_event_id,'order_id',o.id,'order_code',o.code,'reversal_usd',e.amount_delta,'before',before_paid,'after',after_paid,'reason',p_reason);
END;
$$;
REVOKE ALL ON FUNCTION public.ts_service_void_partial_payment(text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ts_service_void_partial_payment(text,uuid,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
