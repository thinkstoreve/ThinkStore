-- ThinkStore Service Center / Asistech Legacy
-- Ejecutar en Supabase SQL Editor después del esquema principal de ThinkStore.
create extension if not exists "pgcrypto";

create type public.ts_role as enum ('superadmin','admin','reception','technician','sales','logistics','client');
create type public.service_status as enum ('Recibido','En diagnóstico','Cotización enviada','Aprobado por cliente','En reparación','Esperando repuesto','Listo para entregar','Entregado','No aprobado','Cancelado');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.ts_role not null default 'client',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  client_id uuid references public.profiles(id),
  client_name text not null,
  client_phone text not null,
  client_email text,
  device_type text,
  device_model text not null,
  serial_imei text,
  reported_issue text not null,
  accessories_received text,
  visual_condition text,
  priority text not null default 'Normal',
  status public.service_status not null default 'Recibido',
  assigned_technician uuid references public.profiles(id),
  quote_amount numeric(12,2),
  quote_currency text default 'USD',
  quote_status text default 'Pendiente',
  warranty_days int default 0,
  delivery_method text,
  tracking_company text,
  tracking_code text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.service_orders(id) on delete cascade,
  author_id uuid references public.profiles(id),
  note text not null,
  visibility text not null default 'internal', -- internal/client
  created_at timestamptz not null default now()
);

create table if not exists public.service_order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.service_orders(id) on delete cascade,
  file_url text not null,
  label text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.service_orders enable row level security;
alter table public.service_order_notes enable row level security;
alter table public.service_order_photos enable row level security;

create or replace function public.current_role()
returns public.ts_role language sql stable as $$
  select role from public.profiles where id = auth.uid() and active = true
$$;

create policy "profiles_select_own_or_staff" on public.profiles for select using (
  id = auth.uid() or public.current_role() in ('superadmin','admin','reception')
);

create policy "orders_staff_all" on public.service_orders for all using (
  public.current_role() in ('superadmin','admin','reception','technician','sales','logistics')
) with check (
  public.current_role() in ('superadmin','admin','reception','technician','sales','logistics')
);

create policy "orders_client_own" on public.service_orders for select using (
  client_id = auth.uid()
);

create policy "notes_staff_all" on public.service_order_notes for all using (
  public.current_role() in ('superadmin','admin','reception','technician','sales','logistics')
) with check (
  public.current_role() in ('superadmin','admin','reception','technician','sales','logistics')
);

create policy "notes_client_visible" on public.service_order_notes for select using (
  visibility='client' and exists (select 1 from public.service_orders o where o.id=order_id and o.client_id=auth.uid())
);

create policy "photos_staff_all" on public.service_order_photos for all using (
  public.current_role() in ('superadmin','admin','reception','technician')
) with check (
  public.current_role() in ('superadmin','admin','reception','technician')
);
