-- Ejecutar una sola vez en Supabase PRINCIPAL (clhnndxsgzqnihhtrout).
-- Programar no altera caja ni utilidad. El pago explícito crea un solo gasto.
begin;
create table if not exists public.enterprise_payment_schedule (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(title) between 3 and 160),
 category text not null check(category in ('rent','service','subscription','supplier','payroll','tax','other')),
 counterparty text,
 amount numeric(18,2) not null check(amount>0 and amount<=100000000),
 currency text not null check(currency in ('USD','VES')),
 due_date date not null,
 remind_days integer not null default 3 check(remind_days between 0 and 30),
 notes text,
 status text not null default 'planned' check(status in ('planned','paid','cancelled')),
 paid_entry_id uuid constraint enterprise_schedule_paid_entry_fk references public.enterprise_finance_entries(id) on delete restrict,
 paid_at timestamptz,
 cancelled_reason text,
 created_by_email text not null,
 created_by_name text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint enterprise_schedule_paid_link check(status<>'paid' or paid_entry_id is not null)
);
create index if not exists enterprise_schedule_due_idx on public.enterprise_payment_schedule(status,due_date);
alter table public.enterprise_payment_schedule enable row level security;
revoke all on public.enterprise_payment_schedule from anon,authenticated;
grant all on public.enterprise_payment_schedule to service_role;

-- Una transacción y bloqueo por vencimiento: reintentar no duplica el gasto.
create or replace function public.enterprise_pay_scheduled(p_id uuid,p_payment jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
 planned public.enterprise_payment_schedule%rowtype;
 entry_id uuid;
 usd numeric(18,2);
 native_amount numeric(18,2);
 native_currency text;
 payer text;
begin
 select * into planned from public.enterprise_payment_schedule where id=p_id for update;
 if not found then raise exception 'Vencimiento no encontrado';end if;
 if planned.status='paid' then return jsonb_build_object('already_paid',true,'entry_id',planned.paid_entry_id);end if;
 if planned.status<>'planned' then raise exception 'El recordatorio está archivado';end if;
 if planned.updated_at is distinct from (p_payment->>'expected_updated_at')::timestamptz then raise exception 'El vencimiento cambió; actualiza y reintenta';end if;
 if planned.category='supplier' then raise exception 'Las compras de mercancía se pagan desde Inventory';end if;
 usd=(p_payment->>'amount_usd')::numeric;native_amount=(p_payment->>'original_amount')::numeric;native_currency=p_payment->>'currency';payer=p_payment->>'funded_by';
 if usd is null or usd<=0 or usd>100000000 or native_amount is null or native_amount<=0 or native_amount>100000000 then raise exception 'Importe de pago inválido';end if;
 if native_currency is null or payer is null or native_currency not in ('USD','VES') or payer not in ('company','freddy','nelson') then raise exception 'Moneda o responsable inválido';end if;
 if nullif(p_payment->>'created_by_email','') is null then raise exception 'Actor requerido';end if;
 insert into public.enterprise_finance_entries
 (occurred_at,entry_type,category,description,amount_usd,original_amount,currency,exchange_rate,payment_method,reference,counterparty,funded_by,source_system,source_id,status,notes,metadata,created_by_email,created_by_name)
 values
 ((p_payment->>'occurred_at')::timestamptz,'expense',case planned.category when 'rent' then 'Alquiler' when 'service' then 'Servicios' when 'subscription' then 'Suscripciones' when 'payroll' then 'Personal' when 'tax' then 'Impuestos' else 'Otro gasto' end,planned.title,round(usd,2),round(native_amount,2),native_currency,(p_payment->>'exchange_rate')::numeric,p_payment->>'payment_method',nullif(p_payment->>'reference',''),planned.counterparty,payer,'enterprise_schedule',planned.id::text,'posted',planned.notes,jsonb_build_object('scheduled_payment_id',planned.id,'due_date',planned.due_date,'rate_date',p_payment->>'rate_date'),p_payment->>'created_by_email',p_payment->>'created_by_name') returning id into entry_id;
 update public.enterprise_payment_schedule set status='paid',paid_entry_id=entry_id,paid_at=now(),updated_at=now() where id=planned.id;
 return jsonb_build_object('already_paid',false,'entry_id',entry_id);
end;
$$;
revoke all on function public.enterprise_pay_scheduled(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.enterprise_pay_scheduled(uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
