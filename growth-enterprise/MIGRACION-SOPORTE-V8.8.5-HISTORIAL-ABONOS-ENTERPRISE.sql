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
