create table if not exists public.service_order_parts (
  id uuid primary key default gen_random_uuid(),
  service_order_id bigint not null references public.service_orders(id) on delete cascade,
  order_code text not null,
  part_id uuid not null references public.service_parts(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_cost_snapshot numeric(12,2),
  sale_price_snapshot numeric(12,2),
  status text not null default 'pending' check (status in ('pending','consumed','released')),
  created_by text,
  consumed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  consumed_at timestamptz,
  unique(service_order_id, part_id)
);

create index if not exists service_order_parts_order_idx
  on public.service_order_parts(service_order_id, status);
create index if not exists service_order_parts_part_idx
  on public.service_order_parts(part_id, status);

alter table public.service_order_parts enable row level security;

drop policy if exists "service_order_parts_staff" on public.service_order_parts;
create policy "service_order_parts_staff" on public.service_order_parts
for select to authenticated
using (public.current_service_role() in ('superadmin','admin','reception','technician','sales'));

grant select on public.service_order_parts to authenticated;
