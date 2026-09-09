-- ThinkStore V63 Admin de accesos y permisos
-- Ejecutar después de supabase_v62_roles_permissions.sql

-- Roles permitidos
create table if not exists role_permissions (
  role text primary key check (role in ('cliente','vendedor','recepcion','soporte','tecnico','logistica','admin','superadmin')),
  modules text[] not null default '{}',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now()
);

insert into role_permissions (role, modules) values
('cliente', array['cuenta','mis_pedidos','mis_reparaciones','garantias','puntos']),
('vendedor', array['dashboard','ventas','cotizaciones','clientes','pagos','preordenes','crm','recomendaciones']),
('recepcion', array['dashboard','recepcion','clientes','tickets','garantias','citas']),
('soporte', array['dashboard','recepcion','clientes','tickets','garantias','citas']),
('tecnico', array['dashboard','tecnico','diagnostico','repuestos','pruebas','garantias']),
('logistica', array['dashboard','logistica','guias','entregas','pedidos','preordenes']),
('admin', array['*']),
('superadmin', array['*'])
on conflict (role) do nothing;

alter table role_permissions enable row level security;

create policy if not exists "staff read role_permissions" on role_permissions
for select using (public.ts_is_staff(array['vendedor','recepcion','soporte','tecnico','logistica','admin','superadmin']));

create policy if not exists "admin manage role_permissions" on role_permissions
for all using (public.ts_is_staff(array['admin','superadmin']))
with check (public.ts_is_staff(array['admin','superadmin']));

-- Vista de usuarios internos para el administrador
create or replace view staff_access_admin as
select
  sp.id,
  sp.email,
  sp.full_name,
  sp.role,
  sp.is_active,
  sp.created_at,
  sp.updated_at
from staff_profiles sp;

-- Función segura para upsert de accesos internos
create or replace function public.ts_admin_upsert_staff_access(
  p_email text,
  p_full_name text,
  p_role text,
  p_is_active boolean default true
)
returns staff_profiles
language plpgsql
security definer
as $$
declare
  v_user auth.users%rowtype;
  v_profile staff_profiles%rowtype;
begin
  if not public.ts_is_staff(array['admin','superadmin']) then
    raise exception 'No autorizado';
  end if;

  if p_role not in ('cliente','vendedor','recepcion','soporte','tecnico','logistica','admin','superadmin') then
    raise exception 'Rol inválido';
  end if;

  select * into v_user from auth.users where lower(email)=lower(p_email) limit 1;
  if v_user.id is null then
    raise exception 'El usuario debe existir primero en Supabase Auth: %', p_email;
  end if;

  insert into staff_profiles (id,email,full_name,role,is_active,updated_at)
  values (v_user.id, lower(p_email), p_full_name, p_role, p_is_active, now())
  on conflict (id) do update set
    email=excluded.email,
    full_name=excluded.full_name,
    role=excluded.role,
    is_active=excluded.is_active,
    updated_at=now()
  returning * into v_profile;

  return v_profile;
end;
$$;

-- Admin inicial: reemplaza el correo por el tuyo y ejecútalo una sola vez.
-- insert into staff_profiles (id,email,full_name,role,is_active)
-- select id,email,coalesce(raw_user_meta_data->>'name', email),'superadmin',true
-- from auth.users where email = 'TU_CORREO_ADMIN@DOMINIO.COM'
-- on conflict (id) do update set role='superadmin', is_active=true, updated_at=now();
