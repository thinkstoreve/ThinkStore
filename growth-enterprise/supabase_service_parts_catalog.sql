-- ThinkStore · Catálogo técnico de repuestos y servicios
-- Preparado para conectar servicio-precios.html con inventario real.
-- NO ejecutar hasta revisar nombres/tabla actual de inventario de Soporte.

create extension if not exists pgcrypto;

create table if not exists public.service_parts_catalog (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  category text not null check (category in ('iPhone','Mac','iPad','Apple Watch','AirPods')),
  series text not null,
  model text not null,
  model_type text,
  repair text not null,
  quality text not null default 'Estándar' check (quality in ('Estándar','AAA','Original')),

  -- Catálogo / precio
  title text not null,
  description text,
  compatibility text,
  price_usd numeric(12,2) not null default 0,
  original_price_usd numeric(12,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  is_offer boolean not null default false,

  -- Imágenes
  image_url text,
  thumbnail_url text,
  gallery jsonb not null default '[]'::jsonb,

  -- Servicio
  warranty text default '3 meses de garantía',
  repair_time text default 'Según diagnóstico',
  service_modes jsonb not null default '["Normal","Delivery","Priority"]'::jsonb,
  priority_fee_usd numeric(12,2) not null default 0,
  delivery_fee_from_usd numeric(12,2) not null default 0,

  -- Inventario
  stock_total integer not null default 0 check (stock_total >= 0),
  stock_reserved integer not null default 0 check (stock_reserved >= 0),
  stock_min integer not null default 0 check (stock_min >= 0),
  stock_location text,
  supplier text,
  supplier_sku text,
  cost_usd numeric(12,2) not null default 0,

  -- Estado público
  active boolean not null default true,
  public boolean not null default true,
  catalog_only boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_parts_catalog_category_idx on public.service_parts_catalog(category);
create index if not exists service_parts_catalog_series_idx on public.service_parts_catalog(series);
create index if not exists service_parts_catalog_model_idx on public.service_parts_catalog(model);
create index if not exists service_parts_catalog_repair_idx on public.service_parts_catalog(repair);
create index if not exists service_parts_catalog_quality_idx on public.service_parts_catalog(quality);
create index if not exists service_parts_catalog_active_public_idx on public.service_parts_catalog(active, public);

create table if not exists public.service_part_movements (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.service_parts_catalog(id) on delete cascade,
  movement_type text not null check (movement_type in ('entrada','reserva','liberacion','consumo','ajuste','devolucion')),
  quantity integer not null check (quantity <> 0),
  service_order_id uuid,
  note text,
  performed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists service_part_movements_part_idx on public.service_part_movements(part_id, created_at desc);
create index if not exists service_part_movements_order_idx on public.service_part_movements(service_order_id);

create or replace function public.service_parts_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_service_parts_updated_at on public.service_parts_catalog;
create trigger trg_service_parts_updated_at
before update on public.service_parts_catalog
for each row execute function public.service_parts_set_updated_at();

-- Stock disponible calculado para el catálogo.
create or replace view public.service_parts_public as
select
  id, sku, category, series, model, model_type, repair, quality,
  title as name, description, compatibility,
  price_usd, original_price_usd, discount_percent, is_offer,
  image_url, thumbnail_url, gallery,
  warranty, repair_time, service_modes,
  greatest(stock_total - stock_reserved, 0) as available,
  stock_total, stock_reserved, stock_min,
  active, public, catalog_only, sort_order,
  updated_at
from public.service_parts_catalog
where active = true and public = true;

-- RLS: el público solo debe leer el catálogo. Escrituras deben hacerse desde backend/service role.
alter table public.service_parts_catalog enable row level security;
alter table public.service_part_movements enable row level security;

drop policy if exists "Public read service catalog" on public.service_parts_catalog;
create policy "Public read service catalog"
on public.service_parts_catalog
for select
to anon, authenticated
using (active = true and public = true);

-- No se crean políticas públicas de INSERT/UPDATE/DELETE a propósito.
-- La administración del inventario debe utilizar usuarios autorizados o una función backend.
