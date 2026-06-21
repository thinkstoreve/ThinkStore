-- ThinkStore V64 Registro Seguro por Roles
-- Ejecutar en Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  nombre text,
  telefono text,
  rol text not null default 'cliente' check (rol in ('cliente','vendedor','recepcion','soporte','tecnico','logistica','admin','superadmin')),
  activo boolean not null default true,
  requiere_2fa boolean not null default false,
  comision_pct numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.role_permissions (
  rol text primary key,
  permisos jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.internal_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nombre text,
  rol text not null check (rol in ('vendedor','recepcion','soporte','tecnico','logistica','admin','superadmin')),
  token text not null unique default encode(gen_random_bytes(24),'hex'),
  activo boolean not null default true,
  expires_at timestamptz default (now() + interval '7 days'),
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users(id),
  actor_email text,
  accion text not null,
  detalle text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.internal_invitations enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.current_role()
returns text language sql stable as $$
  select coalesce((select rol from public.profiles where id = auth.uid() and activo = true), 'cliente')
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.current_role() in ('admin','superadmin')
$$;

create policy "profiles_self_or_admin_select" on public.profiles
for select using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_self_cliente" on public.profiles
for insert with check (id = auth.uid() and rol = 'cliente');

create policy "profiles_admin_update" on public.profiles
for update using (public.is_admin()) with check (public.is_admin());

create policy "role_permissions_admin_all" on public.role_permissions
for all using (public.is_admin()) with check (public.is_admin());

create policy "invitations_admin_all" on public.internal_invitations
for all using (public.is_admin()) with check (public.is_admin());

create policy "audit_admin_select" on public.audit_log
for select using (public.is_admin());

create policy "audit_insert_authenticated" on public.audit_log
for insert with check (auth.uid() is not null);

insert into public.role_permissions (rol, permisos) values
('cliente','["cuenta","mis_pedidos","mis_reparaciones","garantias","puntos"]'),
('vendedor','["dashboard","ventas","cotizaciones","clientes","pagos","preordenes","crm","recomendaciones","comisiones"]'),
('recepcion','["dashboard","recepcion","clientes","tickets","garantias","citas"]'),
('soporte','["dashboard","recepcion","clientes","tickets","garantias","citas"]'),
('tecnico','["dashboard","tecnico","diagnostico","repuestos","pruebas","garantias"]'),
('logistica','["dashboard","logistica","guias","entregas","pedidos","preordenes"]'),
('admin','["*"]'),
('superadmin','["*"]')
on conflict (rol) do nothing;

-- IMPORTANTE: crea tu primer Super Admin manualmente después de registrar tu usuario en Auth.
-- Reemplaza el correo por el tuyo:
-- update public.profiles set rol='superadmin', activo=true where email='TU_CORREO_ADMIN@DOMINIO.COM';
