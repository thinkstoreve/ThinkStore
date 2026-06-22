-- ThinkStore-Soporte Auth V2
-- Ejecutar en el proyecto Supabase exclusivo de soporte.

create table if not exists public.service_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  nombre text not null,
  rol text not null check (rol in ('superadmin','admin','reception','technician','sales','logistics','client')),
  activo boolean default true,
  created_at timestamptz default now()
);

create index if not exists service_users_email_idx on public.service_users (lower(email));

alter table public.service_users enable row level security;

drop policy if exists "service users read own profile" on public.service_users;
create policy "service users read own profile"
on public.service_users
for select
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'));

insert into public.service_users (email,nombre,rol,activo)
values ('soporte@thinkstore.com.ve','Administrador ThinkStore','superadmin',true)
on conflict (email) do update set
nombre = excluded.nombre,
rol = excluded.rol,
activo = true;
