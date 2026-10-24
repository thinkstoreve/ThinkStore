begin;
create schema if not exists ts_migration_backup;
revoke all on schema ts_migration_backup from public,anon,authenticated;
create table if not exists ts_migration_backup.enterprise_plan_pre_20261024 (name text primary key,payload jsonb,created_at timestamptz default now());
alter table ts_migration_backup.enterprise_plan_pre_20261024 enable row level security;
revoke all on ts_migration_backup.enterprise_plan_pre_20261024 from public,anon,authenticated;
insert into ts_migration_backup.enterprise_plan_pre_20261024(name,payload) values
 ('pay_function',to_jsonb(pg_get_functiondef('public.enterprise_pay_scheduled(uuid,jsonb)'::regprocedure))),
 ('schedule',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.enterprise_payment_schedule t)),
 ('finance_entries',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.enterprise_finance_entries t)),
 ('bank_movements',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.enterprise_petty_cash_bank_movements t)) on conflict(name) do nothing;
create table if not exists public.enterprise_goals (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 3 and 100),
 metric text not null check(metric in ('collected_usd','profit_usd','cash_usd')), quarter text not null check(quarter ~ '^20[0-9]{2}-Q[1-4]$'),
 target numeric(18,2) not null check(target>0 and target<=100000000), status text not null default 'proposed' check(status in ('proposed','active','archived')),
 notes text, revision integer not null default 0, actor_email text not null, created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.enterprise_recurring_templates (
 id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 3 and 160),category text not null check(category in ('rent','service','subscription','supplier','payroll','tax','other')),
 counterparty text,amount numeric(18,2) check(amount>0 and amount<=100000000),currency text not null default 'USD' check(currency in ('USD','VES')),
 due_day integer check(due_day between 1 and 31),remind_days integer not null default 3 check(remind_days between 0 and 30),active boolean not null default false,
 notes text,revision integer not null default 0,actor_email text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(not active or(amount is not null and due_day is not null))
);
create table if not exists public.enterprise_planning_audit (
 id uuid primary key default gen_random_uuid(),entity text not null,entity_id uuid not null,action text not null,actor_email text,before_data jsonb,after_data jsonb,created_at timestamptz not null default now()
);
alter table public.enterprise_goals enable row level security;
alter table public.enterprise_recurring_templates enable row level security;
alter table public.enterprise_planning_audit enable row level security;
revoke all on public.enterprise_goals,public.enterprise_recurring_templates,public.enterprise_planning_audit from public,anon,authenticated;
grant all on public.enterprise_goals,public.enterprise_recurring_templates,public.enterprise_planning_audit to service_role;
create or replace function public.enterprise_plan_audit() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.enterprise_planning_audit(entity,entity_id,action,actor_email,before_data,after_data) values(TG_TABLE_NAME,new.id,TG_OP,new.actor_email,case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
revoke all on function public.enterprise_plan_audit() from public,anon,authenticated;
drop trigger if exists enterprise_goal_audit on public.enterprise_goals;
create trigger enterprise_goal_audit after insert or update on public.enterprise_goals for each row execute function public.enterprise_plan_audit();
drop trigger if exists enterprise_recurring_audit on public.enterprise_recurring_templates;
create trigger enterprise_recurring_audit after insert or update on public.enterprise_recurring_templates for each row execute function public.enterprise_plan_audit();
alter table public.enterprise_payment_schedule add column if not exists recurring_template_id uuid references public.enterprise_recurring_templates(id) on delete restrict;
alter table public.enterprise_payment_schedule add column if not exists period_month date;
create unique index if not exists enterprise_recurring_month_unique on public.enterprise_payment_schedule(recurring_template_id,period_month) where recurring_template_id is not null;
create or replace function public.enterprise_generate_month(p_month date,p_actor text)
returns integer language plpgsql security invoker set search_path=public,pg_temp as $$
declare n integer;
begin
 if p_month is null or p_month<>date_trunc('month',p_month)::date or p_month<date_trunc('month',now() at time zone 'America/Caracas')::date or p_month>(date_trunc('month',now() at time zone 'America/Caracas')+interval '12 months')::date then raise exception 'Selecciona el mes actual o uno de los próximos doce meses';end if;
 insert into public.enterprise_payment_schedule(title,category,counterparty,amount,currency,due_date,remind_days,notes,created_by_email,recurring_template_id,period_month)
 select title,category,counterparty,amount,currency,p_month+(least(due_day,extract(day from (p_month+interval '1 month - 1 day'))::integer)-1),remind_days,notes,p_actor,id,p_month from public.enterprise_recurring_templates where active
 on conflict(recurring_template_id,period_month) where recurring_template_id is not null do nothing;
 get diagnostics n=row_count;return n;
end $$;
revoke all on function public.enterprise_generate_month(date,text) from public,anon,authenticated;
grant execute on function public.enterprise_generate_month(date,text) to service_role;
-- Propuestas de planificación; nunca son saldos, gastos ni pagos.
insert into public.enterprise_goals(id,name,metric,quarter,target,notes,actor_email) values
('20261024-0001-4000-8000-000000000001','Cobros del trimestre','collected_usd','2026-Q4',3000,'Objetivo inicial editable. Solo cobros de ventas y Soporte, no solicitudes o presupuestos.','integration-authorized'),
('20261024-0001-4000-8000-000000000002','Utilidad distribuible del trimestre','profit_usd','2026-Q4',500,'Propuesta editable. Se calcula desde la contabilidad canónica, después de costos y gastos.','integration-authorized'),
('20261024-0001-4000-8000-000000000003','Reserva operativa de referencia','cash_usd','2026-Q4',500,'Compara el saldo actual de cuentas USD. No inmoviliza ni declara reservado ese dinero.','integration-authorized') on conflict(id) do nothing;
insert into public.enterprise_recurring_templates(id,title,category,notes,actor_email) values
('20261024-0002-4000-8000-000000000001','Alquiler del local','rent','Completar importe, beneficiario y día real antes de activar.','integration-authorized'),
('20261024-0002-4000-8000-000000000002','Internet de la empresa','service','Completar importe, proveedor y día real antes de activar.','integration-authorized'),
('20261024-0002-4000-8000-000000000003','Electricidad','service','Completar importe, proveedor y día real antes de activar.','integration-authorized'),
('20261024-0002-4000-8000-000000000004','Agua y servicios del local','service','Completar importe, proveedor y día real antes de activar.','integration-authorized'),
('20261024-0002-4000-8000-000000000005','Telefonía de la empresa','service','Completar importe, proveedor y día real antes de activar.','integration-authorized'),
('20261024-0002-4000-8000-000000000006','Suscripciones y plataformas','subscription','Completar importe y proveedor real; crear una plantilla por servicio.','integration-authorized'),
('20261024-0002-4000-8000-000000000007','Proveedores de mercancía','supplier','Recordatorio de compra. El pago se gestiona en Inventory para no duplicar costos.','integration-authorized') on conflict(id) do nothing;
create or replace function public.enterprise_pay_scheduled(p_id uuid,p_payment jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
 planned public.enterprise_payment_schedule%rowtype;
 entry_id uuid;
 usd numeric(18,2);
 native_amount numeric(18,2);
 native_currency text;
 payer text;
 bank_account public.enterprise_petty_cash_bank_accounts%rowtype;
 available numeric;
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
 if payer='company' then
  select * into bank_account from public.enterprise_petty_cash_bank_accounts where id=nullif(p_payment->>'bank_account_id','')::uuid and active for update;
  if not found or bank_account.currency<>native_currency then raise exception 'Selecciona la cuenta real de salida en la moneda del pago';end if;
  select bank_account.opening_balance+coalesce(sum(case when direction='in' then amount else -amount end),0) into available from public.enterprise_petty_cash_bank_movements where account_id=bank_account.id and status='posted';
  if available<native_amount then raise exception 'Saldo insuficiente en la cuenta seleccionada';end if;
 end if;
 insert into public.enterprise_finance_entries
 (occurred_at,entry_type,category,description,amount_usd,original_amount,currency,exchange_rate,payment_method,reference,counterparty,funded_by,source_system,source_id,status,notes,metadata,created_by_email,created_by_name)
 values
 ((p_payment->>'occurred_at')::timestamptz,'expense',case planned.category when 'rent' then 'Alquiler' when 'service' then 'Servicios' when 'subscription' then 'Suscripciones' when 'payroll' then 'Personal' when 'tax' then 'Impuestos' else 'Otro gasto' end,planned.title,round(usd,2),round(native_amount,2),native_currency,(p_payment->>'exchange_rate')::numeric,p_payment->>'payment_method',nullif(p_payment->>'reference',''),planned.counterparty,payer,'enterprise_schedule',planned.id::text,'posted',planned.notes,jsonb_build_object('scheduled_payment_id',planned.id,'due_date',planned.due_date,'rate_date',p_payment->>'rate_date'),p_payment->>'created_by_email',p_payment->>'created_by_name') returning id into entry_id;
 if payer='company' then
  insert into public.enterprise_petty_cash_bank_movements(account_id,movement_type,direction,currency,amount,related_petty_movement_id,description,reference,created_by_email,created_by_name,occurred_at)
  values(bank_account.id,'expense_payment','out',native_currency,native_amount,'expense:'||entry_id,planned.title,p_payment->>'reference',p_payment->>'created_by_email',p_payment->>'created_by_name',(p_payment->>'occurred_at')::timestamptz);
 end if;
 update public.enterprise_payment_schedule set status='paid',paid_entry_id=entry_id,paid_at=now(),updated_at=now() where id=planned.id;
 return jsonb_build_object('already_paid',false,'entry_id',entry_id);
end;
$$;
revoke all on function public.enterprise_pay_scheduled(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.enterprise_pay_scheduled(uuid,jsonb) to service_role;

create or replace function public.enterprise_schedule_void_bank() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status='void' and old.status is distinct from 'void' then
  update public.enterprise_petty_cash_bank_movements set status='void',void_reason='Gasto vinculado anulado: '||new.id,updated_at=now() where related_petty_movement_id='expense:'||new.id and movement_type='expense_payment' and status='posted';
 end if;return new;
end $$;
revoke all on function public.enterprise_schedule_void_bank() from public,anon,authenticated;
drop trigger if exists enterprise_schedule_void_bank on public.enterprise_finance_entries;
create trigger enterprise_schedule_void_bank after update of status on public.enterprise_finance_entries for each row execute function public.enterprise_schedule_void_bank();

notify pgrst,'reload schema';
commit;
