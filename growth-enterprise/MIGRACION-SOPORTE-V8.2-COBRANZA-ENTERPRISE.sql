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
