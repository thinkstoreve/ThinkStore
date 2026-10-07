-- ThinkStore Soporte V8.8.8 · 01 · Repuestos reservados por orden
-- Ejecutar en Supabase de SOPORTE.
begin;

create extension if not exists pgcrypto;

alter table public.service_orders
  add column if not exists reserved_parts_cost numeric(12,2) not null default 0,
  add column if not exists direct_parts_cost numeric(12,2) not null default 0,
  add column if not exists inventory_consumed boolean not null default false,
  add column if not exists inventory_consumed_at timestamptz,
  add column if not exists delivery_note_generated_at timestamptz;

create table if not exists public.service_order_parts (
  id uuid primary key default gen_random_uuid(),
  order_code text not null references public.service_orders(code) on delete cascade,
  part_id uuid not null references public.service_parts(id) on delete restrict,
  quantity_reserved integer not null check(quantity_reserved > 0),
  quantity_consumed integer not null default 0 check(quantity_consumed >= 0),
  unit_cost_snapshot numeric(12,2) not null default 0,
  sale_price_snapshot numeric(12,2) not null default 0,
  status text not null default 'reserved' check(status in ('reserved','consumed','released')),
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  consumed_at timestamptz,
  unique(order_code,part_id)
);

create index if not exists service_order_parts_order_idx on public.service_order_parts(order_code,status);
create index if not exists service_order_parts_part_idx on public.service_order_parts(part_id,status);

alter table public.service_order_parts enable row level security;
drop policy if exists "service_order_parts_staff" on public.service_order_parts;
create policy "service_order_parts_staff" on public.service_order_parts
for all to authenticated
using (public.current_service_role() in ('superadmin','admin','reception','technician','sales'))
with check (public.current_service_role() in ('superadmin','admin','reception','technician','sales'));

grant select,insert,update on public.service_order_parts to authenticated;
grant select,insert,update on public.service_order_parts to service_role;

notify pgrst,'reload schema';
commit;
