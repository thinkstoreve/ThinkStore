-- ThinkStore V62 Multi-Rol Pro
-- Ejecutar en Supabase SQL Editor.

-- 1) Rol en clientes existentes
alter table if exists clientes
add column if not exists role text default 'cliente';

alter table if exists clientes
add column if not exists is_active boolean default true;

-- 2) Perfiles internos de equipo ThinkStore
create table if not exists staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'cliente' check (role in ('cliente','vendedor','recepcion','soporte','tecnico','logistica','admin','superadmin')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3) Citas de tienda
create table if not exists store_appointments (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references auth.users(id) on delete set null,
  customer_name text,
  customer_email text,
  customer_phone text,
  type text not null default 'Diagnóstico',
  appointment_date date,
  appointment_time time,
  status text not null default 'Pendiente',
  notes text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4) Tickets / recepción de equipos
create table if not exists service_tickets (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default ('TS-RP-' || upper(substr(gen_random_uuid()::text,1,6))),
  cliente_id uuid references auth.users(id) on delete set null,
  customer_name text,
  customer_email text,
  customer_phone text,
  device text,
  serial_imei text,
  issue text,
  diagnosis text,
  status text not null default 'Recibido',
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5) Logística y guías
create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid,
  order_code text,
  company text check (company in ('MRW','Zoom','Tealca','Retiro en tienda','Delivery ThinkStore')),
  guide_number text,
  status text not null default 'Preparando',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6) Garantías digitales
create table if not exists warranties (
  id uuid primary key default gen_random_uuid(),
  warranty_code text unique not null default ('GT-' || upper(substr(gen_random_uuid()::text,1,8))),
  cliente_id uuid references auth.users(id) on delete set null,
  order_code text,
  product text,
  serial_imei text,
  start_date date default current_date,
  end_date date,
  status text not null default 'Activa',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 7) Activar RLS
alter table staff_profiles enable row level security;
alter table store_appointments enable row level security;
alter table service_tickets enable row level security;
alter table shipments enable row level security;
alter table warranties enable row level security;

-- Helper: usuario interno activo
create or replace function public.ts_is_staff(allowed_roles text[] default array['vendedor','recepcion','soporte','tecnico','logistica','admin','superadmin'])
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.staff_profiles sp
    where sp.id = auth.uid()
      and sp.is_active = true
      and sp.role = any(allowed_roles)
  );
$$;

-- Políticas básicas
create policy if not exists "staff read staff_profiles" on staff_profiles
for select using (id = auth.uid() or public.ts_is_staff(array['admin','superadmin']));

create policy if not exists "admin manage staff_profiles" on staff_profiles
for all using (public.ts_is_staff(array['admin','superadmin']))
with check (public.ts_is_staff(array['admin','superadmin']));

create policy if not exists "appointments staff all" on store_appointments
for all using (public.ts_is_staff(array['recepcion','soporte','vendedor','admin','superadmin']))
with check (public.ts_is_staff(array['recepcion','soporte','vendedor','admin','superadmin']));

create policy if not exists "tickets staff all" on service_tickets
for all using (public.ts_is_staff(array['recepcion','soporte','tecnico','admin','superadmin']))
with check (public.ts_is_staff(array['recepcion','soporte','tecnico','admin','superadmin']));

create policy if not exists "shipments logistics all" on shipments
for all using (public.ts_is_staff(array['logistica','vendedor','admin','superadmin']))
with check (public.ts_is_staff(array['logistica','vendedor','admin','superadmin']));

create policy if not exists "warranties staff all" on warranties
for all using (public.ts_is_staff(array['recepcion','soporte','tecnico','admin','superadmin']))
with check (public.ts_is_staff(array['recepcion','soporte','tecnico','admin','superadmin']));

-- Para asignar un admin inicial manualmente, reemplaza el correo:
-- insert into staff_profiles (id,email,full_name,role)
-- select id,email,coalesce(raw_user_meta_data->>'name', email),'admin'
-- from auth.users where email = 'TU_CORREO_ADMIN@DOMINIO.COM'
-- on conflict (id) do update set role='admin', is_active=true, updated_at=now();
