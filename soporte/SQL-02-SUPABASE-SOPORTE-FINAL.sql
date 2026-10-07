-- =============================================================
-- THINKSTORE · SQL SOPORTE FINAL
-- Soporte V8.8.5 · Enterprise V10.9
-- Ejecutar ÚNICAMENTE en el proyecto Supabase de SOPORTE.
-- Incluye cobranza base, identidad Freddy e historial auditable de abonos.
-- =============================================================

-- ThinkStore Soporte V8.2 / Enterprise V10
-- Cobranza real de Servicio Técnico + modalidad de atención
-- Ejecutar UNA VEZ en el proyecto Supabase ThinkStore-Soporte.

begin;

alter table public.service_orders
  add column if not exists service_mode text default 'Presencial',
  add column if not exists payment_status text default 'Pendiente',
  add column if not exists amount_paid numeric(12,2) default 0,
  add column if not exists payment_method text,
  add column if not exists payment_notes text,
  add column if not exists paid_at timestamptz;

update public.service_orders
set service_mode = coalesce(nullif(btrim(service_mode),''),'Presencial')
where service_mode is null or btrim(service_mode)='';

update public.service_orders
set payment_status = coalesce(nullif(btrim(payment_status),''),'Pendiente')
where payment_status is null or btrim(payment_status)='';

update public.service_orders
set amount_paid = coalesce(amount_paid,0)
where amount_paid is null;

create index if not exists service_orders_payment_status_idx
  on public.service_orders(payment_status);

create index if not exists service_orders_paid_at_idx
  on public.service_orders(paid_at desc);

create index if not exists service_orders_service_mode_idx
  on public.service_orders(service_mode);

notify pgrst, 'reload schema';

commit;


-- ===== IDENTIDAD SOPORTE =====
-- ThinkStore Soporte V8.8.4 · Identidad canónica Freddy Sedispa
-- Ejecutar en el Supabase de SOPORTE.
-- No cambia roles, permisos ni contraseña.

begin;

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data,'{}'::jsonb)
  || jsonb_build_object('full_name','Freddy Sedispa','name','Freddy Sedispa')
where lower(email)='thinkstore.ve@gmail.com';

update public.service_users
set nombre='Freddy Sedispa'
where lower(email)='thinkstore.ve@gmail.com';

commit;

select email,nombre,rol,activo
from public.service_users
where lower(email)='thinkstore.ve@gmail.com';


-- ===== HISTORIAL DE ABONOS =====
-- ThinkStore Soporte V8.8.5 · Historial de abonos para Enterprise
-- Ejecutar en el proyecto Supabase de SOPORTE.
-- Registra cada incremento/reverso de amount_paid sin cambiar el flujo existente.

begin;

create extension if not exists pgcrypto;

create table if not exists public.service_payment_events (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  order_code text,
  event_type text not null default 'payment',
  amount_delta numeric(12,2) not null,
  balance_after numeric(12,2) not null default 0,
  payment_method text,
  reference text,
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint service_payment_events_type_check check (event_type in ('payment','adjustment','reversal','opening_balance'))
);

create index if not exists service_payment_events_order_idx on public.service_payment_events(service_order_id,occurred_at desc);
create index if not exists service_payment_events_occurred_idx on public.service_payment_events(occurred_at desc);

create or replace function public.ts_capture_service_payment_event()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  old_amount numeric(12,2):=coalesce(old.amount_paid,0);
  new_amount numeric(12,2):=coalesce(new.amount_paid,0);
  delta numeric(12,2):=new_amount-old_amount;
  etype text;
begin
  if delta=0 then return new; end if;
  etype:=case when delta>0 then 'payment' else 'reversal' end;
  insert into public.service_payment_events(
    service_order_id,order_code,event_type,amount_delta,balance_after,payment_method,notes,occurred_at
  ) values (
    new.id,new.code,etype,delta,new_amount,new.payment_method,new.payment_notes,
    coalesce(new.paid_at,new.updated_at,now())
  );
  return new;
end;
$$;

drop trigger if exists ts_service_payment_event on public.service_orders;
create trigger ts_service_payment_event
after update of amount_paid on public.service_orders
for each row execute function public.ts_capture_service_payment_event();

-- Backfill seguro: crea un saldo inicial solo si la orden ya estaba pagada y aún no tiene eventos.
insert into public.service_payment_events(service_order_id,order_code,event_type,amount_delta,balance_after,payment_method,notes,occurred_at)
select o.id,o.code,'opening_balance',coalesce(o.amount_paid,0),coalesce(o.amount_paid,0),o.payment_method,
       'Saldo inicial importado al activar Enterprise V10.7',coalesce(o.paid_at,o.updated_at,o.created_at,now())
from public.service_orders o
where coalesce(o.amount_paid,0)<>0
  and not exists(select 1 from public.service_payment_events e where e.service_order_id=o.id);

alter table public.service_payment_events enable row level security;

drop policy if exists "service staff read payment events" on public.service_payment_events;
create policy "service staff read payment events" on public.service_payment_events
for select to authenticated using (
  public.current_service_role() in ('superadmin','admin','reception','technician','sales','logistics')
);

notify pgrst, 'reload schema';
commit;
