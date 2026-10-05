-- ThinkStore Growth Enterprise · Supabase Auth + Roles
-- Ejecutar en Supabase SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'vendedor',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('super_admin','admin','gerente','vendedor','tecnico','recepcion','logistica','marketing'))
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles can read own profile" on public.profiles;
create policy "Profiles can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Admins can read profiles" on public.profiles;
create policy "Admins can read profiles"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.active = true
        and p.role in ('admin','super_admin')
    )
  );

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.active = true
        and p.role in ('admin','super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.active = true
        and p.role in ('admin','super_admin')
    )
  );

-- Auto-crear perfil básico cuando se registra/invita un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'vendedor'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- PASO FINAL:
-- 1) Crea/invita tu usuario administrador desde Authentication > Users.
-- 2) Copia su UUID.
-- 3) Ejecuta este UPDATE reemplazando el UUID:
-- update public.profiles
-- set role = 'admin', active = true, full_name = 'Administrador ThinkStore'
-- where id = 'AQUI_UUID_DEL_USUARIO';

-- Staff invitations: accesos creados desde Growth Enterprise cuando la Edge Function no está instalada.
create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  role text not null default 'vendedor',
  status text not null default 'pending',
  notes text,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_invitations_role_check check (role in ('super_admin','admin','gerente','vendedor','tecnico','recepcion','logistica','marketing')),
  constraint staff_invitations_status_check check (status in ('pending','sent','accepted','cancelled'))
);

alter table public.staff_invitations enable row level security;

drop policy if exists "Admins can manage staff invitations" on public.staff_invitations;
create policy "Admins can manage staff invitations"
  on public.staff_invitations
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.active = true
        and p.role in ('admin','super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.active = true
        and p.role in ('admin','super_admin')
    )
  );

-- Nota importante:
-- Para crear usuarios Auth desde el panel sin exponer service_role en el frontend,
-- instala la Edge Function create-staff-user incluida en la carpeta supabase/functions.
