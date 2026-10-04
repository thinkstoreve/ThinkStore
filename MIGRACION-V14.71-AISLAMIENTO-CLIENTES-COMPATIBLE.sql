-- ThinkStore V14.71 · Aislamiento Clientes compatible con profiles_role_check
-- Ejecutar UNA VEZ en el Supabase PRINCIPAL.
-- IMPORTANTE: NO cambia profiles.role a 'cliente' porque este proyecto usa un CHECK
-- que no acepta ese valor. La separación Cliente/Personal se hace con is_internal.

begin;

alter table public.profiles
  add column if not exists is_internal boolean not null default false,
  add column if not exists internal_origin text,
  add column if not exists internal_invited_at timestamptz,
  add column if not exists internal_invited_by uuid references auth.users(id) on delete set null;

create index if not exists profiles_is_internal_idx
  on public.profiles (is_internal)
  where is_internal = true;

-- Limpia cualquier trigger antiguo que intentara escribir role='cliente'.
drop trigger if exists trg_thinkstore_enforce_public_client_role on public.profiles;
drop trigger if exists trg_thinkstore_enforce_public_client_rol on public.profiles;
drop trigger if exists trg_thinkstore_enforce_internal_profile on public.profiles;
drop function if exists public.thinkstore_enforce_public_client_role();
drop function if exists public.thinkstore_enforce_public_client_rol();
drop function if exists public.thinkstore_enforce_internal_profile();

-- 1) Personal creado por invitación administrativa: metadata de Auth manda.
update public.profiles p
set is_internal = true,
    internal_origin = coalesce(p.internal_origin,'panel_invite'),
    internal_invited_at = coalesce(p.internal_invited_at,p.created_at,now())
from auth.users u
where u.id=p.id
  and (
    lower(coalesce(u.raw_app_meta_data->>'thinkstore_internal','')) in ('true','1','yes')
    or lower(coalesce(u.raw_user_meta_data->>'thinkstore_internal','')) in ('true','1','yes')
  );

-- 2) Admin / Super Admin bootstrap existentes se conservan SIEMPRE como internos.
do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role') then
    execute $q$
      update public.profiles p
      set is_internal=true,
          internal_origin=coalesce(p.internal_origin,'legacy_admin'),
          internal_invited_at=coalesce(p.internal_invited_at,p.created_at,now())
      where lower(replace(coalesce(p.role,''),' ','_')) in
        ('admin','administrator','gerente','superadmin','super_admin')
    $q$;
  end if;

  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='rol') then
    execute $q$
      update public.profiles p
      set is_internal=true,
          internal_origin=coalesce(p.internal_origin,'legacy_admin'),
          internal_invited_at=coalesce(p.internal_invited_at,p.created_at,now())
      where lower(replace(coalesce(p.rol,''),' ','_')) in
        ('admin','administrator','gerente','superadmin','super_admin')
    $q$;
  end if;
end $$;

-- 3) Personal histórico legítimo: rol interno y NO existe como cliente público.
do $$
begin
  if to_regclass('public.clientes') is not null then
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role') then
      execute $q$
        update public.profiles p
        set is_internal=true,
            internal_origin=coalesce(p.internal_origin,'legacy_staff'),
            internal_invited_at=coalesce(p.internal_invited_at,p.created_at,now())
        where coalesce(p.is_internal,false)=false
          and lower(replace(coalesce(p.role,''),' ','_')) in
            ('vendedor','recepcion','recepción','soporte','tecnico','técnico','logistica','logística','marketing')
          and not exists(select 1 from public.clientes c where c.id=p.id)
      $q$;
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='rol') then
      execute $q$
        update public.profiles p
        set is_internal=true,
            internal_origin=coalesce(p.internal_origin,'legacy_staff'),
            internal_invited_at=coalesce(p.internal_invited_at,p.created_at,now())
        where coalesce(p.is_internal,false)=false
          and lower(replace(coalesce(p.rol,''),' ','_')) in
            ('vendedor','recepcion','recepción','soporte','tecnico','técnico','logistica','logística','marketing')
          and not exists(select 1 from public.clientes c where c.id=p.id)
      $q$;
    end if;
  end if;
end $$;

-- 4) Todo usuario que existe en clientes y NO fue marcado explícitamente como personal
-- queda fuera de los paneles. NO tocamos role/rol para respetar profiles_role_check.
do $$
begin
  if to_regclass('public.clientes') is not null then
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role') then
      execute $q$
        update public.profiles p
        set is_internal=false,
            internal_origin=null,
            internal_invited_at=null,
            internal_invited_by=null
        where exists(select 1 from public.clientes c where c.id=p.id)
          and lower(replace(coalesce(p.role,''),' ','_')) not in
            ('admin','administrator','gerente','superadmin','super_admin')
          and not exists (
            select 1 from auth.users u
            where u.id=p.id
              and (
                lower(coalesce(u.raw_app_meta_data->>'thinkstore_internal','')) in ('true','1','yes')
                or lower(coalesce(u.raw_user_meta_data->>'thinkstore_internal','')) in ('true','1','yes')
              )
          )
      $q$;
    elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='rol') then
      execute $q$
        update public.profiles p
        set is_internal=false,
            internal_origin=null,
            internal_invited_at=null,
            internal_invited_by=null
        where exists(select 1 from public.clientes c where c.id=p.id)
          and lower(replace(coalesce(p.rol,''),' ','_')) not in
            ('admin','administrator','gerente','superadmin','super_admin')
          and not exists (
            select 1 from auth.users u
            where u.id=p.id
              and (
                lower(coalesce(u.raw_app_meta_data->>'thinkstore_internal','')) in ('true','1','yes')
                or lower(coalesce(u.raw_user_meta_data->>'thinkstore_internal','')) in ('true','1','yes')
              )
          )
      $q$;
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='custom_role_key') then
      execute $q$
        update public.profiles p set custom_role_key=null
        where coalesce(p.is_internal,false)=false
          and exists(select 1 from public.clientes c where c.id=p.id)
      $q$;
    end if;

    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='permission_overrides') then
      execute $q$
        update public.profiles p set permission_overrides='{"allow":[],"deny":[]}'::jsonb
        where coalesce(p.is_internal,false)=false
          and exists(select 1 from public.clientes c where c.id=p.id)
      $q$;
    end if;
  end if;
end $$;

comment on column public.profiles.is_internal is
  'TRUE exclusivamente para personal ThinkStore autorizado. FALSE para clientes, aunque profiles.role conserve un valor legado por compatibilidad del CHECK.';

commit;

-- VERIFICACIÓN 1: clientes expuestos como internos. Debe devolver 0 filas.
select p.id, p.email, p.role, p.is_internal
from public.profiles p
where coalesce(p.is_internal,false)=true
  and exists(select 1 from public.clientes c where c.id=p.id)
  and lower(replace(coalesce(p.role,''),' ','_')) not in
      ('admin','administrator','gerente','superadmin','super_admin')
order by p.created_at desc;

-- VERIFICACIÓN 2: personal interno real.
select p.id, p.email, p.role, p.is_internal, p.internal_origin
from public.profiles p
where coalesce(p.is_internal,false)=true
order by p.created_at desc;
