-- ThinkStore V14.1 · Internal Staff Isolation
-- Ejecutar UNA SOLA VEZ en Supabase SQL Editor ANTES de desplegar V14.1.
-- Separa definitivamente clientes públicos de personal interno.
-- No borra usuarios.

begin;

alter table public.profiles
  add column if not exists is_internal boolean not null default false,
  add column if not exists internal_origin text,
  add column if not exists internal_invited_at timestamptz,
  add column if not exists internal_invited_by uuid references auth.users(id) on delete set null;

create index if not exists profiles_is_internal_idx
  on public.profiles (is_internal)
  where is_internal = true;

-- Cuentas creadas por el flujo de invitación V13.98+.
update public.profiles p
set
  is_internal = true,
  internal_origin = coalesce(p.internal_origin, 'panel_invite'),
  internal_invited_at = coalesce(p.internal_invited_at, p.created_at, now())
from auth.users u
where u.id = p.id
  and (
    lower(coalesce(u.raw_app_meta_data ->> 'thinkstore_internal','')) in ('true','1','yes')
    or lower(coalesce(u.raw_user_meta_data ->> 'thinkstore_internal','')) in ('true','1','yes')
  );

-- Conserva administradores/socios bootstrap existentes.
update public.profiles
set
  is_internal = true,
  internal_origin = coalesce(internal_origin, 'legacy_admin'),
  internal_invited_at = coalesce(internal_invited_at, created_at, now())
where lower(replace(coalesce(role,''),' ','_')) in ('admin','administrator','gerente','superadmin','super_admin');

-- Conserva invitaciones del sistema anterior, si existen.
do $$
begin
  if to_regclass('public.internal_invitations') is not null then
    execute $q$
      update public.profiles p
      set
        is_internal = true,
        internal_origin = coalesce(p.internal_origin, 'legacy_invitation'),
        internal_invited_at = coalesce(p.internal_invited_at, i.created_at, p.created_at, now()),
        internal_invited_by = coalesce(p.internal_invited_by, i.created_by)
      from public.internal_invitations i
      where lower(coalesce(p.email,'')) = lower(coalesce(i.email,''))
        and coalesce(i.activo,true) = true
    $q$;
  end if;
end $$;

-- Corrige clientes históricos que quedaron con rol interno sin invitación.
update public.profiles
set
  role = 'cliente',
  custom_role_key = null,
  permission_overrides = '{"allow":[],"deny":[]}'::jsonb
where is_internal = false
  and lower(replace(coalesce(role,''),' ','_')) in
      ('vendedor','recepcion','recepción','soporte','tecnico','técnico','logistica','logística','admin','administrator','gerente','superadmin','super_admin');

alter table public.profiles alter column role set default 'cliente';

-- Seguridad permanente: sin marca interna, siempre Cliente.
create or replace function public.thinkstore_enforce_internal_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.is_internal,false) = false then
    new.role := 'cliente';
    new.custom_role_key := null;
    new.permission_overrides := '{"allow":[],"deny":[]}'::jsonb;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_thinkstore_enforce_internal_profile on public.profiles;
create trigger trg_thinkstore_enforce_internal_profile
before insert or update of role, is_internal, custom_role_key, permission_overrides
on public.profiles
for each row execute function public.thinkstore_enforce_internal_profile();

comment on column public.profiles.is_internal is
  'TRUE solo para personal ThinkStore autorizado por invitación administrativa o bootstrap de administrador.';

commit;

-- Verificación opcional:
-- select full_name,email,role,is_internal,internal_origin from public.profiles order by is_internal desc,created_at desc;
