-- ThinkStore V14.72 · Invitaciones internas compatibles con profiles_role_check
-- Ejecutar UNA VEZ en el Supabase PRINCIPAL.
-- No elimina ni modifica profiles_role_check.
-- Corrige el trigger histórico handle_new_user() para normalizar roles antes de insertar.

begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='role'
  ) then
    execute $fn$
      create or replace function public.handle_new_user()
      returns trigger
      language plpgsql
      security definer
      set search_path = public
      as $body$
      declare
        requested_role text;
        safe_role text;
      begin
        requested_role := lower(replace(replace(coalesce(new.raw_user_meta_data->>'role',''),'-','_'),' ','_'));

        -- Canonicaliza valores de interfaz a los admitidos por el esquema Growth.
        safe_role := case requested_role
          when 'superadmin' then 'super_admin'
          when 'super_admin' then 'super_admin'
          when 'administrator' then 'admin'
          when 'admin' then 'admin'
          when 'gerente' then 'gerente'
          when 'vendedor' then 'vendedor'
          when 'sales' then 'vendedor'
          when 'tecnico' then 'tecnico'
          when 'technician' then 'tecnico'
          when 'recepcion' then 'recepcion'
          when 'reception' then 'recepcion'
          when 'soporte' then 'recepcion'
          when 'support' then 'recepcion'
          when 'logistica' then 'logistica'
          when 'logistics' then 'logistica'
          when 'marketing' then 'marketing'
          else 'vendedor'
        end;

        insert into public.profiles (id, email, full_name, role, active)
        values (
          new.id,
          new.email,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
          safe_role,
          true
        )
        on conflict (id) do nothing;

        return new;
      end;
      $body$;
    $fn$;
  end if;
end $$;

-- Asegura que el trigger siga apuntando a la función corregida.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='role'
  ) then
    drop trigger if exists on_auth_user_created on auth.users;
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

commit;

-- Verificación opcional: debe devolver la definición de profiles_role_check sin modificarla.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid='public.profiles'::regclass
  and conname='profiles_role_check';
