-- ThinkStore V13.65 · SQL acumulativo para deploy
-- Seguro para ejecutar si V13.63 ya fue aplicado: usa CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- ThinkStore V13.63 · Unidades físicas + asignación a pedidos
-- No reemplaza inventory_variants ni sus SKU. Añade trazabilidad por unidad física.

create table if not exists public.inventory_units (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid null,
  product_name text not null,
  model text null,
  serial_number text not null,
  imei text null,
  commercial_condition text not null default 'Nuevo',
  general_condition text null,
  battery_health_pct integer null,
  notes text null,
  status text not null default 'available',
  created_by_email text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inventory_units_serial_unique
  on public.inventory_units (lower(serial_number));
create unique index if not exists inventory_units_imei_unique
  on public.inventory_units (imei)
  where imei is not null and btrim(imei) <> '';
create index if not exists inventory_units_variant_idx on public.inventory_units(variant_id);
create index if not exists inventory_units_status_idx on public.inventory_units(status);
create index if not exists inventory_units_product_idx on public.inventory_units(product_name);

do $$
begin
  if not exists (select 1 from pg_constraint where conname='inventory_units_status_check') then
    alter table public.inventory_units add constraint inventory_units_status_check
      check (status in ('available','assigned','sold','returned','in_service'));
  end if;
  if not exists (select 1 from pg_constraint where conname='inventory_units_battery_check') then
    alter table public.inventory_units add constraint inventory_units_battery_check
      check (battery_health_pct is null or battery_health_pct between 1 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname='inventory_units_general_condition_check') then
    alter table public.inventory_units add constraint inventory_units_general_condition_check
      check (general_condition is null or general_condition in ('Excelente','Bueno','Bien','Nuevo'));
  end if;
end $$;

create table if not exists public.order_unit_assignments (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null,
  pedido_item_id uuid not null,
  unit_id uuid not null references public.inventory_units(id) on delete restrict,
  slot_index integer not null default 1,
  active boolean not null default true,
  assigned_by_email text null,
  assigned_at timestamptz not null default now(),
  released_at timestamptz null,
  release_reason text null
);

create unique index if not exists order_unit_assignment_slot_active_unique
  on public.order_unit_assignments(pedido_item_id,slot_index)
  where active=true;
create unique index if not exists order_unit_assignment_unit_active_unique
  on public.order_unit_assignments(unit_id)
  where active=true;
create index if not exists order_unit_assignment_order_idx
  on public.order_unit_assignments(pedido_id,active);

create table if not exists public.delivery_note_versions (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null,
  version integer not null,
  status text not null default 'active',
  assignments_fingerprint text not null,
  html_snapshot text null,
  text_snapshot text null,
  created_by_email text null,
  created_at timestamptz not null default now(),
  invalidated_at timestamptz null,
  invalidated_reason text null
);

create unique index if not exists delivery_note_versions_order_version_unique
  on public.delivery_note_versions(pedido_id,version);
create index if not exists delivery_note_versions_active_idx
  on public.delivery_note_versions(pedido_id,status,created_at desc);

alter table public.inventory_units enable row level security;
alter table public.order_unit_assignments enable row level security;
alter table public.delivery_note_versions enable row level security;

revoke all on public.inventory_units from anon, authenticated;
revoke all on public.order_unit_assignments from anon, authenticated;
revoke all on public.delivery_note_versions from anon, authenticated;

notify pgrst, 'reload schema';


-- ThinkStore V13.65 · Descuentos en venta presencial
alter table public.pedidos
  add column if not exists subtotal_usd numeric(12,2),
  add column if not exists discount_type text,
  add column if not exists discount_value numeric(12,2),
  add column if not exists discount_usd numeric(12,2),
  add column if not exists discount_reason text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='pedidos_discount_type_check') then
    alter table public.pedidos add constraint pedidos_discount_type_check
      check (discount_type is null or discount_type in ('usd','percent'));
  end if;
  if not exists (select 1 from pg_constraint where conname='pedidos_discount_usd_check') then
    alter table public.pedidos add constraint pedidos_discount_usd_check
      check (discount_usd is null or discount_usd >= 0);
  end if;
end $$;

notify pgrst, 'reload schema';
