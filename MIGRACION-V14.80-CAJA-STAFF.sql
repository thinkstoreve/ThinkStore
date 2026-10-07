-- ThinkStore Main V14.80 | Caja Staff | Supabase PRINCIPAL
-- Ejecutar DESPUES de V14.79. No borra ni altera ventas, cobros ni cajas previas.
-- Cada caja corresponde a un usuario interno. Ventas se LEEN desde pedidos y ts_order_payments:
-- NO se duplican como movimientos manuales ni se vuelven a contabilizar.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ts_staff_cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  business_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Caracas')::date,
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  opened_by uuid NOT NULL REFERENCES auth.users(id),
  opening_usd numeric(18,2) NOT NULL DEFAULT 0 CHECK(opening_usd>=0),
  opening_ves numeric(18,2) NOT NULL DEFAULT 0 CHECK(opening_ves>=0),
  opening_note text,
  counted_usd numeric(18,2) CHECK(counted_usd>=0),
  counted_ves numeric(18,2) CHECK(counted_ves>=0),
  closing_note text,
  verified_methods jsonb NOT NULL DEFAULT '[]'::jsonb,
  closing_snapshot jsonb,
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ts_staff_cash_one_per_user_day UNIQUE(user_id,business_date)
);
CREATE UNIQUE INDEX IF NOT EXISTS ts_staff_cash_open_only ON public.ts_staff_cash_sessions(user_id) WHERE status='open';
CREATE INDEX IF NOT EXISTS ts_staff_cash_opened_idx ON public.ts_staff_cash_sessions(opened_at DESC);
CREATE TABLE IF NOT EXISTS public.ts_staff_cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ts_staff_cash_sessions(id),
  type text NOT NULL CHECK(type IN ('ingreso','gasto','retiro','ajuste','devolucion')),
  direction text NOT NULL CHECK(direction IN ('in','out')),
  CONSTRAINT ts_staff_cash_direction_type CHECK ((type='ajuste') OR (type='ingreso' AND direction='in') OR (type IN ('gasto','retiro','devolucion') AND direction='out')), 
  method text NOT NULL CHECK(method IN ('Efectivo USD','Efectivo Bs','Zelle','Pago Móvil','Transferencia USD','Transferencia Bs','Punto de venta Bs')),
  currency text NOT NULL CHECK(currency IN ('USD','VES')),
  amount numeric(18,2) NOT NULL CHECK(amount>0),
  concept text NOT NULL CHECK(length(trim(concept)) BETWEEN 3 AND 180),
  reference text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ts_staff_cash_method_currency CHECK(
   (method IN ('Efectivo USD','Zelle','Transferencia USD') AND currency='USD') OR
   (method IN ('Efectivo Bs','Pago Móvil','Transferencia Bs','Punto de venta Bs') AND currency='VES')
  ),
  CONSTRAINT ts_staff_cash_ref_required CHECK(method LIKE 'Efectivo %' OR length(trim(coalesce(reference,'')))>0)
);
CREATE INDEX IF NOT EXISTS ts_staff_cash_moves_session_idx ON public.ts_staff_cash_movements(session_id,created_at);
CREATE TABLE IF NOT EXISTS public.ts_staff_cash_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES public.ts_staff_cash_sessions(id),
 action text NOT NULL,
 actor_id uuid NOT NULL REFERENCES auth.users(id),
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ts_staff_cash_audit_session_idx ON public.ts_staff_cash_audit(session_id,created_at);
ALTER TABLE public.ts_staff_cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_staff_cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ts_staff_cash_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ts_staff_cash_sessions, public.ts_staff_cash_movements, public.ts_staff_cash_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.ts_staff_cash_sessions TO service_role;
GRANT SELECT,INSERT ON public.ts_staff_cash_movements, public.ts_staff_cash_audit TO service_role;

-- Todas las mutaciones se realizan en UNA transacción SQL. La API verifica JWT y permisos
-- antes de llamar a esta función con la clave service_role, NUNCA desde el navegador.
CREATE OR REPLACE FUNCTION public.ts_staff_cash_action(
 p_actor uuid, p_action text, p_data jsonb DEFAULT '{}'::jsonb, p_manager boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE
 s public.ts_staff_cash_sessions%ROWTYPE;
 v_id uuid;
 v_amount numeric;
 v_open_usd numeric;
 v_open_ves numeric;
 v_method text;
 v_currency text;
 v_type text;
 v_direction text;
 v_concept text;
 v_ref text;
 v_reason text;
 v_count_usd numeric;
 v_count_ves numeric;
BEGIN
 IF p_actor IS NULL THEN RAISE EXCEPTION 'Actor obligatorio'; END IF;
 IF p_action='open' THEN
   v_open_usd:=(p_data->>'opening_usd')::numeric;
   v_open_ves:=(p_data->>'opening_ves')::numeric;
   IF v_open_usd IS NULL OR v_open_ves IS NULL OR v_open_usd<0 OR v_open_ves<0
     OR v_open_usd>1000000000 OR v_open_ves>100000000000
     OR round(v_open_usd,2)<>v_open_usd OR round(v_open_ves,2)<>v_open_ves THEN
      RAISE EXCEPTION 'Saldo inicial inválido'; END IF;
   INSERT INTO public.ts_staff_cash_sessions(user_id,opened_by,opening_usd,opening_ves,opening_note)
   VALUES (p_actor,p_actor,v_open_usd,v_open_ves,left(trim(coalesce(p_data->>'note','')),500)) RETURNING * INTO s;
   INSERT INTO public.ts_staff_cash_audit(session_id,action,actor_id,details)
   VALUES(s.id,'open',p_actor,jsonb_build_object('opening_usd',s.opening_usd,'opening_ves',s.opening_ves));
   RETURN to_jsonb(s);
 END IF;
 v_id:=(p_data->>'session_id')::uuid;
 IF v_id IS NULL THEN RAISE EXCEPTION 'Caja obligatoria'; END IF;
 SELECT * INTO s FROM public.ts_staff_cash_sessions WHERE id=v_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Caja no encontrada'; END IF;
 IF s.user_id<>p_actor AND NOT (p_manager AND p_action='reopen') THEN
   RAISE EXCEPTION 'No puedes modificar la caja de otro usuario'; END IF;
 IF p_action='reopen' THEN
   IF NOT p_manager OR s.status<>'closed' THEN RAISE EXCEPTION 'Solo administración puede reabrir un cierre'; END IF;
   v_reason:=trim(coalesce(p_data->>'reason',''));
   IF length(v_reason)<8 THEN RAISE EXCEPTION 'Indica el motivo de reapertura'; END IF;
   IF EXISTS(SELECT 1 FROM public.ts_staff_cash_sessions WHERE user_id=s.user_id AND status='open' AND id<>s.id) THEN
     RAISE EXCEPTION 'El empleado ya tiene otra caja abierta'; END IF;
   INSERT INTO public.ts_staff_cash_audit(session_id,action,actor_id,details)
   VALUES(s.id,'reopen',p_actor,jsonb_build_object('reason',left(v_reason,500),'old_close',s.closing_snapshot,'old_closed_at',s.closed_at));
   UPDATE public.ts_staff_cash_sessions SET status='open',closed_at=NULL,closed_by=NULL,closing_snapshot=NULL,updated_at=now()
   WHERE id=s.id RETURNING * INTO s;
   RETURN to_jsonb(s);
 END IF;
 IF s.status<>'open' THEN RAISE EXCEPTION 'La caja está cerrada'; END IF;
 IF p_action='movement' THEN
   v_type:=p_data->>'type';v_direction:=p_data->>'direction';v_method:=p_data->>'method';v_currency:=p_data->>'currency';
   v_amount:=(p_data->>'amount')::numeric;
   v_concept:=left(trim(coalesce(p_data->>'concept','')),180);
   v_ref:=left(trim(coalesce(p_data->>'reference','')),120);
   IF v_amount IS NULL OR v_amount<=0 OR v_amount>100000000000 OR round(v_amount,2)<>v_amount THEN
      RAISE EXCEPTION 'Monto inválido'; END IF;
   INSERT INTO public.ts_staff_cash_movements(session_id,type,direction,method,currency,amount,concept,reference,created_by)
   VALUES (s.id,v_type,v_direction,v_method,v_currency,v_amount,v_concept,NULLIF(v_ref,''),p_actor);
   INSERT INTO public.ts_staff_cash_audit(session_id,action,actor_id,details)
   VALUES(s.id,'movement',p_actor,jsonb_build_object('type',v_type,'direction',v_direction,'method',v_method,'currency',v_currency,'amount',v_amount,'concept',v_concept));
 ELSIF p_action IN ('draft','close') THEN
   v_count_usd:=(p_data->>'counted_usd')::numeric;v_count_ves:=(p_data->>'counted_ves')::numeric;
   IF v_count_usd IS NULL OR v_count_ves IS NULL OR v_count_usd<0 OR v_count_ves<0 OR
      v_count_usd>1000000000 OR v_count_ves>100000000000 OR
      round(v_count_usd,2)<>v_count_usd OR round(v_count_ves,2)<>v_count_ves THEN
      RAISE EXCEPTION 'Conteo inválido'; END IF;
   IF p_action='close' AND jsonb_typeof(p_data->'snapshot') IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Cierre sin conciliación'; END IF;
   UPDATE public.ts_staff_cash_sessions SET
     counted_usd=v_count_usd,counted_ves=v_count_ves,
     closing_note=left(trim(coalesce(p_data->>'note','')),500),
     verified_methods=coalesce(p_data->'verified_methods','[]'::jsonb),
     closing_snapshot=CASE WHEN p_action='close' THEN p_data->'snapshot' ELSE closing_snapshot END,
     status=CASE WHEN p_action='close' THEN 'closed' ELSE status END,
     closed_at=CASE WHEN p_action='close' THEN now() ELSE closed_at END,
     closed_by=CASE WHEN p_action='close' THEN p_actor ELSE closed_by END,
     updated_at=now() WHERE id=s.id RETURNING * INTO s;
   INSERT INTO public.ts_staff_cash_audit(session_id,action,actor_id,details)
   VALUES(s.id,p_action,p_actor,jsonb_build_object('counted_usd',v_count_usd,'counted_ves',v_count_ves,'note',s.closing_note,'snapshot',coalesce(p_data->'snapshot','{}'::jsonb)));
 ELSE RAISE EXCEPTION 'Acción inválida'; END IF;
 RETURN to_jsonb(s);
END $$;
REVOKE ALL ON FUNCTION public.ts_staff_cash_action(uuid,text,jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ts_staff_cash_action(uuid,text,jsonb,boolean) TO service_role;
COMMIT;
NOTIFY pgrst,'reload schema';
