-- Ejecutar SOLO en ThinkStore-Soporte. Aditiva, sin cambios financieros.
BEGIN;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS delivery_outcome text CHECK(delivery_outcome IN ('repaired','not_repaired'));
CREATE TABLE IF NOT EXISTS public.service_review_deliveries (
 order_id bigint PRIMARY KEY REFERENCES public.service_orders(id),
 outcome text NOT NULL CHECK(outcome IN ('repaired','not_repaired','legacy')),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','sent','failed','unknown','skipped','excluded')),
 reason text,
 provider_message_id text,
 attempts integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_review_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_review_deliveries FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.service_review_deliveries TO service_role;
CREATE INDEX IF NOT EXISTS service_review_pending_idx ON public.service_review_deliveries(created_at) WHERE state='pending';
-- Marca histórica: nunca crear invitaciones retroactivas, incluso tras reabrir una orden.
INSERT INTO public.service_review_deliveries(order_id,outcome,state,reason)
 SELECT id,'legacy','excluded','historical_delivery' FROM public.service_orders
 WHERE status='Entregado' OR delivered_at IS NOT NULL ON CONFLICT(order_id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.ts_capture_review_delivery() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE staff_role text;
BEGIN
 IF NEW.status='Entregado' AND OLD.status IS DISTINCT FROM 'Entregado' THEN
  IF NEW.delivery_outcome IS NULL THEN
   -- Conserva compatibilidad con clientes antiguos, sin inventar un resultado técnico.
   RETURN NEW;
  END IF;
  IF auth.role()='authenticated' THEN
   SELECT lower(rol) INTO staff_role FROM public.service_users WHERE lower(email)=lower(auth.jwt()->>'email') AND activo IS DISTINCT FROM false LIMIT 1;
   IF staff_role IS NULL OR staff_role NOT IN ('superadmin','admin','reception') THEN
    RAISE EXCEPTION 'La entrega debe confirmarla Recepción o Administración';
   END IF;
  END IF;
  INSERT INTO public.service_review_deliveries(order_id,outcome)
   VALUES(NEW.id,NEW.delivery_outcome) ON CONFLICT(order_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ts_review_delivery ON public.service_orders;
CREATE TRIGGER ts_review_delivery AFTER UPDATE OF status,delivery_outcome ON public.service_orders
 FOR EACH ROW EXECUTE FUNCTION public.ts_capture_review_delivery();
REVOKE ALL ON FUNCTION public.ts_capture_review_delivery() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.ts_claim_review_delivery(p_id bigint,p_retry boolean DEFAULT false)
RETURNS SETOF public.service_review_deliveries LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 UPDATE public.service_review_deliveries SET state='processing',reason=NULL,attempts=attempts+1,updated_at=now()
 WHERE order_id=p_id AND (state='pending' OR (p_retry AND state='failed' AND attempts<3)) RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.ts_claim_review_delivery(bigint,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ts_claim_review_delivery(bigint,boolean) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
