-- ThinkStore V14.79: pagos divididos (USD + VES) para ventas presenciales.
-- Aplicar DESPUÉS de V14.78 en Supabase PRINCIPAL. No afecta pedidos históricos.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ts_order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  line_no integer NOT NULL CHECK (line_no BETWEEN 1 AND 12),
  method text NOT NULL,
  currency text NOT NULL CHECK(currency IN ('USD','VES')),
  amount numeric(18,2) NOT NULL CHECK(amount > 0),
  usd_equivalent numeric(18,2) NOT NULL CHECK(usd_equivalent > 0),
  reference text,
  bcv_rate numeric(18,6),
  bcv_effective_date date,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected')),
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  UNIQUE (pedido_id,line_no)
);
CREATE INDEX IF NOT EXISTS ts_order_payments_order_status_idx ON public.ts_order_payments(pedido_id,status);
CREATE INDEX IF NOT EXISTS ts_order_payments_confirmed_idx ON public.ts_order_payments(confirmed_at) WHERE status='confirmed';
ALTER TABLE public.ts_order_payments ENABLE ROW LEVEL SECURITY;
-- Lectura/escritura de abonos solo por el servidor (service_role); nada desde anon o autenticados.
REVOKE ALL ON public.ts_order_payments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ts_order_payments TO service_role;

-- Registrar todos los abonos y confirmar la venta dentro de UNA MISMA transacción.
CREATE OR REPLACE FUNCTION public.ts_confirm_pos_mixed_payment(
  p_order_id uuid, p_lines jsonb, p_actor text,
  p_rate numeric DEFAULT NULL, p_effective_date date DEFAULT NULL,
  p_source text DEFAULT NULL, p_checked_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_order public.pedidos%ROWTYPE; v_line jsonb; v_total numeric(18,2):=0;
  v_ves numeric(18,2):=0; v_row int:=0; v_now timestamptz:=now();
BEGIN
  SELECT * INTO v_order FROM public.pedidos WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;
  IF v_order.metodo_pago IS DISTINCT FROM 'Pago mixto' THEN RAISE EXCEPTION 'El pedido no es de pago mixto'; END IF;
  IF coalesce(v_order.payment_decision_locked,false) THEN RAISE EXCEPTION 'La decisión de pago ya está bloqueada'; END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines)<>'array' OR jsonb_array_length(p_lines)<2 OR jsonb_array_length(p_lines)>12 THEN
     RAISE EXCEPTION 'Se requieren entre 2 y 12 abonos'; END IF;
  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    v_row:=v_row+1;
    IF (v_line->>'line_no')::int IS DISTINCT FROM v_row THEN RAISE EXCEPTION 'Secuencia de abonos inválida'; END IF;
    IF coalesce((v_line->>'amount')::numeric,0)<=0 OR coalesce((v_line->>'usd_equivalent')::numeric,0)<=0 THEN
      RAISE EXCEPTION 'Importe de abono inválido'; END IF;
    IF v_line->>'currency' NOT IN ('USD','VES') THEN RAISE EXCEPTION 'Moneda inválida'; END IF;
    IF (v_line->>'currency')='VES' THEN
      IF p_rate IS NULL OR p_rate<=0 OR p_effective_date IS NULL THEN RAISE EXCEPTION 'BCV no verificado'; END IF;
      IF round(((v_line->>'amount')::numeric/p_rate),2) IS DISTINCT FROM round((v_line->>'usd_equivalent')::numeric,2) THEN
        RAISE EXCEPTION 'Conversión BCV no coincide'; END IF;
      v_ves:=v_ves+(v_line->>'amount')::numeric;
    ELSE
      IF round((v_line->>'amount')::numeric,2) IS DISTINCT FROM round((v_line->>'usd_equivalent')::numeric,2) THEN
        RAISE EXCEPTION 'Importe USD no coincide'; END IF;
    END IF;
    v_total:=v_total+(v_line->>'usd_equivalent')::numeric;
  END LOOP;
  IF round(v_total,2) IS DISTINCT FROM round(coalesce(v_order.total_usd,0),2) THEN
    RAISE EXCEPTION 'Abonos insuficientes o superiores al total. Faltan o sobran USD %',round(coalesce(v_order.total_usd,0)-v_total,2); END IF;
  DELETE FROM public.ts_order_payments WHERE pedido_id=p_order_id AND status='pending';
  IF EXISTS (SELECT 1 FROM public.ts_order_payments WHERE pedido_id=p_order_id AND status='confirmed') THEN
    RAISE EXCEPTION 'Existen abonos confirmados; impide duplicar cobros'; END IF;
  INSERT INTO public.ts_order_payments(pedido_id,line_no,method,currency,amount,usd_equivalent,reference,bcv_rate,bcv_effective_date,status,recorded_by,confirmed_at)
  SELECT p_order_id,(value->>'line_no')::int,value->>'method',value->>'currency',
         (value->>'amount')::numeric,(value->>'usd_equivalent')::numeric,nullif(value->>'reference',''),
         CASE WHEN value->>'currency'='VES' THEN p_rate ELSE NULL END,
         CASE WHEN value->>'currency'='VES' THEN p_effective_date ELSE NULL END,
         'confirmed',p_actor,v_now
  FROM jsonb_array_elements(p_lines);
  UPDATE public.pedidos SET estado='Pago verificado',payment_decision='approved',payment_decision_locked=true,
    payment_decision_at=v_now,payment_decision_by=p_actor,
    total_bs=CASE WHEN v_ves>0 THEN v_ves ELSE NULL END,
    bcv_rate=CASE WHEN v_ves>0 THEN p_rate ELSE NULL END,
    bcv_effective_date=CASE WHEN v_ves>0 THEN p_effective_date ELSE NULL END,
    bcv_source=CASE WHEN v_ves>0 THEN p_source ELSE NULL END,
    bcv_checked_at=CASE WHEN v_ves>0 THEN p_checked_at ELSE NULL END,
    updated_at=v_now WHERE id=p_order_id;
  RETURN jsonb_build_object('ok',true,'paid_usd',v_total,'paid_ves',v_ves,'lines',v_row);
END $$;
REVOKE ALL ON FUNCTION public.ts_confirm_pos_mixed_payment(uuid,jsonb,text,numeric,date,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ts_confirm_pos_mixed_payment(uuid,jsonb,text,numeric,date,text,timestamptz) TO service_role;
COMMIT;
NOTIFY pgrst,'reload schema';
