-- ThinkStore · Integración final Staff Caja + Enterprise V10.13 + Caja Chica
-- Supabase PRINCIPAL
-- Requiere: V14.79 pagos mixtos + V14.80 Caja Staff + Finanzas Enterprise existentes.
-- Migración ADITIVA: no borra ventas, cobros, cierres ni movimientos históricos.

BEGIN;

-- ============================================================
-- 1) Caja Staff: conservar equivalencia USD histórica en movimientos VES
-- ============================================================
ALTER TABLE public.ts_staff_cash_movements
  ADD COLUMN IF NOT EXISTS usd_equivalent numeric(18,2),
  ADD COLUMN IF NOT EXISTS bcv_rate numeric(18,6),
  ADD COLUMN IF NOT EXISTS bcv_effective_date date,
  ADD COLUMN IF NOT EXISTS bcv_source text,
  ADD COLUMN IF NOT EXISTS bcv_checked_at timestamptz;

COMMENT ON COLUMN public.ts_staff_cash_movements.usd_equivalent IS
  'Equivalente USD congelado al registrar el movimiento. Para USD coincide con amount; para VES usa BCV vigente.';
COMMENT ON COLUMN public.ts_staff_cash_movements.bcv_rate IS
  'Tasa BCV histórica aplicada al movimiento en VES.';

-- Backfill seguro: solo movimientos USD. No se inventa una tasa histórica para VES.
UPDATE public.ts_staff_cash_movements
SET usd_equivalent = amount
WHERE currency='USD' AND usd_equivalent IS NULL;

-- Sustituye la misma RPC de V14.80 para persistir equivalencia/tasa histórica.
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
 v_usd_equiv numeric;
 v_bcv_rate numeric;
 v_bcv_effective date;
 v_bcv_source text;
 v_bcv_checked timestamptz;
BEGIN
 IF p_actor IS NULL THEN RAISE EXCEPTION 'Actor obligatorio'; END IF;

 IF p_action='open' THEN
   v_open_usd:=(p_data->>'opening_usd')::numeric;
   v_open_ves:=(p_data->>'opening_ves')::numeric;
   IF v_open_usd IS NULL OR v_open_ves IS NULL OR v_open_usd<0 OR v_open_ves<0
     OR v_open_usd>1000000000 OR v_open_ves>100000000000
     OR round(v_open_usd,2)<>v_open_usd OR round(v_open_ves,2)<>v_open_ves THEN
      RAISE EXCEPTION 'Saldo inicial inválido';
   END IF;
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
   RAISE EXCEPTION 'No puedes modificar la caja de otro usuario';
 END IF;

 IF p_action='reopen' THEN
   IF NOT p_manager OR s.status<>'closed' THEN RAISE EXCEPTION 'Solo administración puede reabrir un cierre'; END IF;
   v_reason:=trim(coalesce(p_data->>'reason',''));
   IF length(v_reason)<8 THEN RAISE EXCEPTION 'Indica el motivo de reapertura'; END IF;
   IF EXISTS(SELECT 1 FROM public.ts_staff_cash_sessions WHERE user_id=s.user_id AND status='open' AND id<>s.id) THEN
     RAISE EXCEPTION 'El empleado ya tiene otra caja abierta';
   END IF;
   INSERT INTO public.ts_staff_cash_audit(session_id,action,actor_id,details)
   VALUES(s.id,'reopen',p_actor,jsonb_build_object('reason',left(v_reason,500),'old_close',s.closing_snapshot,'old_closed_at',s.closed_at));
   UPDATE public.ts_staff_cash_sessions
   SET status='open',closed_at=NULL,closed_by=NULL,closing_snapshot=NULL,updated_at=now()
   WHERE id=s.id RETURNING * INTO s;
   RETURN to_jsonb(s);
 END IF;

 IF s.status<>'open' THEN RAISE EXCEPTION 'La caja está cerrada'; END IF;

 IF p_action='movement' THEN
   v_type:=p_data->>'type';
   v_direction:=p_data->>'direction';
   v_method:=p_data->>'method';
   v_currency:=p_data->>'currency';
   v_amount:=(p_data->>'amount')::numeric;
   v_concept:=left(trim(coalesce(p_data->>'concept','')),180);
   v_ref:=left(trim(coalesce(p_data->>'reference','')),120);
   v_usd_equiv:=NULLIF(p_data->>'usd_equivalent','')::numeric;
   v_bcv_rate:=NULLIF(p_data->>'bcv_rate','')::numeric;
   v_bcv_effective:=NULLIF(p_data->>'bcv_effective_date','')::date;
   v_bcv_source:=left(trim(coalesce(p_data->>'bcv_source','')),120);
   v_bcv_checked:=NULLIF(p_data->>'bcv_checked_at','')::timestamptz;

   IF v_amount IS NULL OR v_amount<=0 OR v_amount>100000000000 OR round(v_amount,2)<>v_amount THEN
      RAISE EXCEPTION 'Monto inválido';
   END IF;

   IF v_currency='USD' THEN
     v_usd_equiv:=v_amount;
     v_bcv_rate:=NULL; v_bcv_effective:=NULL; v_bcv_source:=NULL; v_bcv_checked:=NULL;
   ELSIF v_currency='VES' THEN
     IF v_bcv_rate IS NULL OR v_bcv_rate<=0 OR v_bcv_effective IS NULL OR v_usd_equiv IS NULL OR v_usd_equiv<=0 THEN
       RAISE EXCEPTION 'Movimiento en bolívares sin BCV histórico verificado';
     END IF;
     IF round(v_amount/v_bcv_rate,2) IS DISTINCT FROM round(v_usd_equiv,2) THEN
       RAISE EXCEPTION 'Equivalencia BCV del movimiento no coincide';
     END IF;
   ELSE
     RAISE EXCEPTION 'Moneda inválida';
   END IF;

   INSERT INTO public.ts_staff_cash_movements(
     session_id,type,direction,method,currency,amount,concept,reference,created_by,
     usd_equivalent,bcv_rate,bcv_effective_date,bcv_source,bcv_checked_at
   ) VALUES (
     s.id,v_type,v_direction,v_method,v_currency,v_amount,v_concept,NULLIF(v_ref,''),p_actor,
     v_usd_equiv,v_bcv_rate,v_bcv_effective,NULLIF(v_bcv_source,''),v_bcv_checked
   );

   INSERT INTO public.ts_staff_cash_audit(session_id,action,actor_id,details)
   VALUES(s.id,'movement',p_actor,jsonb_build_object(
     'type',v_type,'direction',v_direction,'method',v_method,'currency',v_currency,
     'amount',v_amount,'usd_equivalent',v_usd_equiv,'bcv_rate',v_bcv_rate,'concept',v_concept
   ));

 ELSIF p_action IN ('draft','close') THEN
   v_count_usd:=(p_data->>'counted_usd')::numeric;
   v_count_ves:=(p_data->>'counted_ves')::numeric;
   IF v_count_usd IS NULL OR v_count_ves IS NULL OR v_count_usd<0 OR v_count_ves<0 OR
      v_count_usd>1000000000 OR v_count_ves>100000000000 OR
      round(v_count_usd,2)<>v_count_usd OR round(v_count_ves,2)<>v_count_ves THEN
      RAISE EXCEPTION 'Conteo inválido';
   END IF;
   IF p_action='close' AND jsonb_typeof(p_data->'snapshot') IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Cierre sin conciliación';
   END IF;
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
   VALUES(s.id,p_action,p_actor,jsonb_build_object(
     'counted_usd',v_count_usd,'counted_ves',v_count_ves,'note',s.closing_note,
     'snapshot',coalesce(p_data->'snapshot','{}'::jsonb)
   ));
 ELSE
   RAISE EXCEPTION 'Acción inválida';
 END IF;
 RETURN to_jsonb(s);
END $$;

REVOKE ALL ON FUNCTION public.ts_staff_cash_action(uuid,text,jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ts_staff_cash_action(uuid,text,jsonb,boolean) TO service_role;

-- ============================================================
-- 2) Caja Chica Enterprise
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enterprise_petty_cash_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  custodian_name text,
  custodian_email text,
  target_usd numeric(18,2) NOT NULL DEFAULT 0 CHECK(target_usd>=0),
  target_ves numeric(18,2) NOT NULL DEFAULT 0 CHECK(target_ves>=0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_petty_cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.enterprise_petty_cash_accounts(id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  movement_type text NOT NULL CHECK(movement_type IN ('fund','expense','refund','adjustment')),
  direction text NOT NULL CHECK(direction IN ('in','out')),
  currency text NOT NULL CHECK(currency IN ('USD','VES')),
  amount numeric(18,2) NOT NULL CHECK(amount>0),
  usd_equivalent numeric(18,2) NOT NULL CHECK(usd_equivalent>0),
  bcv_rate numeric(18,6),
  bcv_effective_date date,
  bcv_source text,
  bcv_checked_at timestamptz,
  category text,
  vendor text,
  description text NOT NULL,
  source_payment_method text,
  reference text,
  receipt_url text,
  funded_by text NOT NULL DEFAULT 'company' CHECK(funded_by IN ('company','freddy','nelson')),
  status text NOT NULL DEFAULT 'posted' CHECK(status IN ('posted','void')),
  created_by uuid REFERENCES auth.users(id),
  created_by_email text,
  voided_at timestamptz,
  voided_by uuid REFERENCES auth.users(id),
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enterprise_petty_cash_currency_bcv CHECK(
    (currency='USD' AND round(usd_equivalent,2)=round(amount,2)) OR
    (currency='VES' AND bcv_rate IS NOT NULL AND bcv_rate>0 AND bcv_effective_date IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS enterprise_petty_cash_movements_account_idx
  ON public.enterprise_petty_cash_movements(account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS enterprise_petty_cash_movements_status_idx
  ON public.enterprise_petty_cash_movements(status, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.enterprise_petty_cash_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.enterprise_petty_cash_accounts(id),
  movement_id uuid REFERENCES public.enterprise_petty_cash_movements(id),
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  actor_email text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_petty_cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_petty_cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_petty_cash_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.enterprise_petty_cash_accounts, public.enterprise_petty_cash_movements, public.enterprise_petty_cash_audit
  FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.enterprise_petty_cash_accounts TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.enterprise_petty_cash_movements TO service_role;
GRANT SELECT,INSERT ON public.enterprise_petty_cash_audit TO service_role;

INSERT INTO public.enterprise_petty_cash_accounts(slug,name)
VALUES('main','Caja chica principal')
ON CONFLICT(slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ts_enterprise_petty_cash_action(
  p_actor uuid,
  p_actor_email text,
  p_action text,
  p_data jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path=public
AS $$
DECLARE
  a public.enterprise_petty_cash_accounts%ROWTYPE;
  m public.enterprise_petty_cash_movements%ROWTYPE;
  v_id uuid;
  v_type text;
  v_direction text;
  v_currency text;
  v_amount numeric;
  v_usd numeric;
  v_rate numeric;
  v_effective date;
  v_balance numeric;
  v_reason text;
BEGIN
  IF p_actor IS NULL THEN RAISE EXCEPTION 'Actor obligatorio'; END IF;

  SELECT * INTO a
  FROM public.enterprise_petty_cash_accounts
  WHERE id = NULLIF(p_data->>'account_id','')::uuid
     OR (NULLIF(p_data->>'account_id','') IS NULL AND slug='main')
  ORDER BY CASE WHEN slug='main' THEN 0 ELSE 1 END
  LIMIT 1;
  IF NOT FOUND OR a.active IS DISTINCT FROM true THEN RAISE EXCEPTION 'Caja chica no disponible'; END IF;

  IF p_action='movement' THEN
    v_type:=trim(coalesce(p_data->>'movement_type',''));
    v_direction:=trim(coalesce(p_data->>'direction',''));
    v_currency:=upper(trim(coalesce(p_data->>'currency','')));
    v_amount:=NULLIF(p_data->>'amount','')::numeric;
    v_usd:=NULLIF(p_data->>'usd_equivalent','')::numeric;
    v_rate:=NULLIF(p_data->>'bcv_rate','')::numeric;
    v_effective:=NULLIF(p_data->>'bcv_effective_date','')::date;

    IF v_type NOT IN ('fund','expense','refund','adjustment') THEN RAISE EXCEPTION 'Tipo de Caja Chica inválido'; END IF;
    IF v_type='fund' OR v_type='refund' THEN v_direction:='in'; END IF;
    IF v_type='expense' THEN v_direction:='out'; END IF;
    IF v_type='adjustment' AND v_direction NOT IN ('in','out') THEN RAISE EXCEPTION 'Selecciona entrada o salida para el ajuste'; END IF;
    IF v_currency NOT IN ('USD','VES') THEN RAISE EXCEPTION 'Moneda inválida'; END IF;
    IF v_amount IS NULL OR v_amount<=0 OR round(v_amount,2)<>v_amount THEN RAISE EXCEPTION 'Monto inválido'; END IF;

    IF v_currency='USD' THEN
      v_usd:=v_amount; v_rate:=NULL; v_effective:=NULL;
    ELSE
      IF v_rate IS NULL OR v_rate<=0 OR v_effective IS NULL OR v_usd IS NULL OR v_usd<=0 THEN
        RAISE EXCEPTION 'Movimiento en bolívares sin tasa BCV verificada';
      END IF;
      IF round(v_amount/v_rate,2) IS DISTINCT FROM round(v_usd,2) THEN
        RAISE EXCEPTION 'Equivalencia BCV de Caja Chica no coincide';
      END IF;
    END IF;

    IF length(trim(coalesce(p_data->>'description','')))<3 THEN RAISE EXCEPTION 'Describe el movimiento'; END IF;

    IF v_direction='out' THEN
      SELECT coalesce(sum(CASE WHEN direction='in' THEN amount ELSE -amount END),0)
      INTO v_balance
      FROM public.enterprise_petty_cash_movements
      WHERE account_id=a.id AND status='posted' AND currency=v_currency;
      IF round(v_amount,2)>round(v_balance,2) THEN RAISE EXCEPTION 'El movimiento supera el saldo disponible en Caja Chica'; END IF;
    END IF;

    INSERT INTO public.enterprise_petty_cash_movements(
      account_id,occurred_at,movement_type,direction,currency,amount,usd_equivalent,
      bcv_rate,bcv_effective_date,bcv_source,bcv_checked_at,category,vendor,description,
      source_payment_method,reference,receipt_url,funded_by,created_by,created_by_email
    ) VALUES (
      a.id,coalesce(NULLIF(p_data->>'occurred_at','')::timestamptz,now()),v_type,v_direction,v_currency,v_amount,v_usd,
      v_rate,v_effective,NULLIF(trim(coalesce(p_data->>'bcv_source','')),''),NULLIF(p_data->>'bcv_checked_at','')::timestamptz,
      NULLIF(trim(coalesce(p_data->>'category','')),''),NULLIF(trim(coalesce(p_data->>'vendor','')),''),
      left(trim(p_data->>'description'),220),NULLIF(trim(coalesce(p_data->>'source_payment_method','')),''),
      NULLIF(trim(coalesce(p_data->>'reference','')),''),NULLIF(trim(coalesce(p_data->>'receipt_url','')),''),
      CASE WHEN v_type='fund' AND p_data->>'funded_by' IN ('freddy','nelson') THEN p_data->>'funded_by' ELSE 'company' END,
      p_actor,NULLIF(trim(coalesce(p_actor_email,'')),'')
    ) RETURNING * INTO m;

    INSERT INTO public.enterprise_petty_cash_audit(account_id,movement_id,action,actor_id,actor_email,details)
    VALUES(a.id,m.id,'movement',p_actor,p_actor_email,jsonb_build_object(
      'movement_type',m.movement_type,'direction',m.direction,'currency',m.currency,'amount',m.amount,
      'usd_equivalent',m.usd_equivalent,'funded_by',m.funded_by,'description',m.description
    ));
    RETURN to_jsonb(m);
  END IF;

  IF p_action='void' THEN
    v_id:=NULLIF(p_data->>'id','')::uuid;
    v_reason:=trim(coalesce(p_data->>'reason',''));
    IF v_id IS NULL THEN RAISE EXCEPTION 'Movimiento requerido'; END IF;
    IF length(v_reason)<5 THEN RAISE EXCEPTION 'Indica el motivo de anulación'; END IF;
    SELECT * INTO m FROM public.enterprise_petty_cash_movements WHERE id=v_id AND account_id=a.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Movimiento de Caja Chica no encontrado'; END IF;
    IF m.status='void' THEN RAISE EXCEPTION 'El movimiento ya está anulado'; END IF;
    UPDATE public.enterprise_petty_cash_movements
    SET status='void',voided_at=now(),voided_by=p_actor,void_reason=left(v_reason,300)
    WHERE id=m.id RETURNING * INTO m;
    INSERT INTO public.enterprise_petty_cash_audit(account_id,movement_id,action,actor_id,actor_email,details)
    VALUES(a.id,m.id,'void',p_actor,p_actor_email,jsonb_build_object('reason',left(v_reason,300)));
    RETURN to_jsonb(m);
  END IF;

  IF p_action='account' THEN
    UPDATE public.enterprise_petty_cash_accounts
    SET custodian_name=NULLIF(trim(coalesce(p_data->>'custodian_name','')),''),
        custodian_email=NULLIF(lower(trim(coalesce(p_data->>'custodian_email',''))),''),
        target_usd=greatest(0,coalesce(NULLIF(p_data->>'target_usd','')::numeric,target_usd)),
        target_ves=greatest(0,coalesce(NULLIF(p_data->>'target_ves','')::numeric,target_ves)),
        updated_at=now()
    WHERE id=a.id RETURNING * INTO a;
    INSERT INTO public.enterprise_petty_cash_audit(account_id,action,actor_id,actor_email,details)
    VALUES(a.id,'account',p_actor,p_actor_email,jsonb_build_object('custodian_name',a.custodian_name,'target_usd',a.target_usd,'target_ves',a.target_ves));
    RETURN to_jsonb(a);
  END IF;

  RAISE EXCEPTION 'Acción de Caja Chica inválida';
END $$;

REVOKE ALL ON FUNCTION public.ts_enterprise_petty_cash_action(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ts_enterprise_petty_cash_action(uuid,text,text,jsonb) TO service_role;

COMMIT;
NOTIFY pgrst,'reload schema';
