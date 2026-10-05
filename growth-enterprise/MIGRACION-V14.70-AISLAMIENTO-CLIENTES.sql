-- ThinkStore V14.70 · Aislamiento definitivo Clientes / Personal interno
-- Ejecutar UNA VEZ en el Supabase PRINCIPAL de ThinkStore.
-- No elimina clientes ni pedidos. Corrige perfiles públicos que quedaron como vendedor
-- y evita que un registro normal vuelva a heredar un rol interno.

begin;

alter table public.profiles
  add column if not exists is_internal boolean not null default false,
  add column if not exists internal_origin text,
  add column if not exists internal_invited_at timestamptz,
  add column if not exists internal_invited_by uuid references auth.users(id) on delete set null;

-- Personal creado correctamente por invitación / metadata interna.
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

-- Conserva personal histórico: si NO existe en la tabla clientes y su rol ya era interno,
-- se marca como personal para no perder vendedores/técnicos antiguos legítimos.
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
          and lower(replace(coalesce(p.role,''),' ','_')) in ('vendedor','recepcion','soporte','tecnico','logistica','admin','administrator','gerente','superadmin','super_admin')
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
          and lower(replace(coalesce(p.rol,''),' ','_')) in ('vendedor','recepcion','soporte','tecnico','logistica','admin','administrator','gerente','superadmin','super_admin')
          and not exists(select 1 from public.clientes c where c.id=p.id)
      $q$;
    end if;
  end if;
end $$;

-- Todo perfil que también existe en clientes y NO fue invitado como personal queda Cliente.
do $$
begin
  if to_regclass('public.clientes') is not null then
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role') then
      execute $q$
        update public.profiles p set role='cliente'
        where coalesce(p.is_internal,false)=false
          and exists(select 1 from public.clientes c where c.id=p.id)
      $q$;
      execute 'alter table public.profiles alter column role set default ''cliente''';
    end if;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='rol') then
      execute $q$
        update public.profiles p set rol='cliente'
        where coalesce(p.is_internal,false)=false
          and exists(select 1 from public.clientes c where c.id=p.id)
      $q$;
      execute 'alter table public.profiles alter column rol set default ''cliente''';
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

-- Guardia permanente para el esquema moderno con columna role.
do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role') then
    execute $fn$
      create or replace function public.thinkstore_enforce_public_client_role()
      returns trigger language plpgsql security definer set search_path=public as $body$
      begin
        if coalesce(new.is_internal,false)=false then
          new.role := 'cliente';
        end if;
        return new;
      end;
      $body$;
    $fn$;
    execute 'drop trigger if exists trg_thinkstore_enforce_public_client_role on public.profiles';
    execute 'create trigger trg_thinkstore_enforce_public_client_role before insert or update on public.profiles for each row execute function public.thinkstore_enforce_public_client_role()';
  end if;
end $$;

-- Guardia permanente para esquemas históricos con columna rol.
do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='rol') then
    execute $fn$
      create or replace function public.thinkstore_enforce_public_client_rol()
      returns trigger language plpgsql security definer set search_path=public as $body$
      begin
        if coalesce(new.is_internal,false)=false then
          new.rol := 'cliente';
        end if;
        return new;
      end;
      $body$;
    $fn$;
    execute 'drop trigger if exists trg_thinkstore_enforce_public_client_rol on public.profiles';
    execute 'create trigger trg_thinkstore_enforce_public_client_rol before insert or update on public.profiles for each row execute function public.thinkstore_enforce_public_client_rol()';
  end if;
end $$;

-- Limpia permisos opcionales para perfiles públicos.
do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='custom_role_key') then
    execute 'update public.profiles set custom_role_key=null where coalesce(is_internal,false)=false';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='permission_overrides') then
    execute 'update public.profiles set permission_overrides=''{"allow":[],"deny":[]}''::jsonb where coalesce(is_internal,false)=false';
  end if;
end $$;

commit;

-- Verificación opcional: debe devolver SOLO personal real.
-- select id,email,role,is_internal,internal_origin from public.profiles where is_internal=true order by created_at desc;
