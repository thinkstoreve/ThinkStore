-- ThinkStore Soporte V8.8.18
-- Clasificación financiera + Inventario técnico SOLO LECTURA + Foto de perfil.
-- Ejecutar COMPLETO en Supabase de SOPORTE.
-- Sustituye / incluye V8.8.16 y V8.8.17; es seguro repetirlo.

-- ============================================================
-- 1) Clasificación financiera de repuestos / servicios
-- ============================================================
alter table public.service_parts
  add column if not exists financial_type text default 'part';

alter table public.service_order_sale_items
  add column if not exists financial_type text default 'service_hardware',
  add column if not exists unit_cost_usd numeric(12,2) default 0;

update public.service_parts
set financial_type = case
  when lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%software%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%office%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%adobe%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%ios%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%macos%'
    then 'service_software'
  when lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%servicio%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%mano de obra%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%mantenimiento%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%microsoldadura%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%diagnóstico%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%diagnostico%'
    then 'service_hardware'
  else 'part'
end
where financial_type is null
   or financial_type not in ('part','service_hardware','service_software','product');

update public.service_order_sale_items
set financial_type = case
  when source='main_inventory' or item_type='product' then 'product'
  when lower(coalesce(name,'') || ' ' || coalesce(metadata->>'category','')) like '%software%'
    or lower(coalesce(name,'') || ' ' || coalesce(metadata->>'category','')) like '%office%'
    or lower(coalesce(name,'') || ' ' || coalesce(metadata->>'category','')) like '%adobe%'
    then 'service_software'
  else 'service_hardware'
end
where financial_type is null
   or financial_type not in ('part','service_hardware','service_software','product');

update public.service_order_sale_items
set unit_cost_usd = greatest(coalesce(unit_cost_usd,0),0);

-- ============================================================
-- 2) Bloqueo real de inventario físico para rol technician
--    El técnico puede consultar service_parts y preparar piezas
--    en una orden mediante service_order_parts, pero no alterar
--    el inventario maestro ni sus movimientos.
-- ============================================================
create or replace function public.ts_block_technician_inventory_mutation()
returns trigger
language plpgsql
security definer
set search_path=public
as 'begin
  if public.current_service_role() = ''technician'' then
    raise exception ''El inventario general es de solo lectura para técnicos'' using errcode = ''42501'';
  end if;
  if tg_op = ''DELETE'' then
    return old;
  end if;
  return new;
end';

drop trigger if exists trg_ts_technician_readonly_service_parts on public.service_parts;
create trigger trg_ts_technician_readonly_service_parts
before insert or update or delete on public.service_parts
for each row execute function public.ts_block_technician_inventory_mutation();

drop trigger if exists trg_ts_technician_readonly_part_movements on public.service_part_movements;
create trigger trg_ts_technician_readonly_part_movements
before insert or update or delete on public.service_part_movements
for each row execute function public.ts_block_technician_inventory_mutation();

notify pgrst, 'reload schema';

-- VERIFICACIÓN
select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='service_parts' and column_name='financial_type') as financial_type_ok,
  to_regprocedure('public.ts_block_technician_inventory_mutation()') is not null as readonly_guard_ok,
  exists(select 1 from pg_trigger where tgname='trg_ts_technician_readonly_service_parts' and not tgisinternal) as parts_guard_ok,
  exists(select 1 from pg_trigger where tgname='trg_ts_technician_readonly_part_movements' and not tgisinternal) as movements_guard_ok;

-- ============================================================
-- 3) Foto de perfil del personal de Soporte
--    Bucket privado: cada usuario solo administra su propia carpeta.
-- ============================================================
alter table public.service_users
  add column if not exists avatar_path text,
  add column if not exists avatar_updated_at timestamptz;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'support-profile-photos',
  'support-profile-photos',
  false,
  2097152,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists support_profile_photos_select_own_v8818 on storage.objects;
create policy support_profile_photos_select_own_v8818
on storage.objects for select to authenticated
using (
  bucket_id='support-profile-photos'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists support_profile_photos_insert_own_v8818 on storage.objects;
create policy support_profile_photos_insert_own_v8818
on storage.objects for insert to authenticated
with check (
  bucket_id='support-profile-photos'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists support_profile_photos_update_own_v8818 on storage.objects;
create policy support_profile_photos_update_own_v8818
on storage.objects for update to authenticated
using (
  bucket_id='support-profile-photos'
  and (storage.foldername(name))[1]=auth.uid()::text
)
with check (
  bucket_id='support-profile-photos'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists support_profile_photos_delete_own_v8818 on storage.objects;
create policy support_profile_photos_delete_own_v8818
on storage.objects for delete to authenticated
using (
  bucket_id='support-profile-photos'
  and (storage.foldername(name))[1]=auth.uid()::text
);

create or replace function public.ts_update_own_service_avatar(p_avatar_path text)
returns text
language plpgsql
security definer
set search_path=public
as 'declare
  v_email text := lower(coalesce(auth.jwt()->>''email'',''''));
  v_uid text := coalesce(auth.uid()::text,'''');
  v_path text := nullif(trim(p_avatar_path),'''');
begin
  if v_email='''' or v_uid='''' then
    raise exception ''Sesión requerida'' using errcode=''42501'';
  end if;
  if v_path is null or split_part(v_path,''/'',1)<>v_uid then
    raise exception ''Ruta de foto inválida'' using errcode=''42501'';
  end if;
  update public.service_users
     set avatar_path=v_path,avatar_updated_at=now()
   where lower(email)=v_email and activo=true;
  if not found then
    raise exception ''Usuario de soporte no autorizado'' using errcode=''42501'';
  end if;
  return v_path;
end';

create or replace function public.ts_clear_own_service_avatar()
returns boolean
language plpgsql
security definer
set search_path=public
as 'declare
  v_email text := lower(coalesce(auth.jwt()->>''email'',''''));
begin
  if v_email='''' or auth.uid() is null then
    raise exception ''Sesión requerida'' using errcode=''42501'';
  end if;
  update public.service_users
     set avatar_path=null,avatar_updated_at=now()
   where lower(email)=v_email and activo=true;
  if not found then
    raise exception ''Usuario de soporte no autorizado'' using errcode=''42501'';
  end if;
  return true;
end';

revoke all on function public.ts_update_own_service_avatar(text) from public;
grant execute on function public.ts_update_own_service_avatar(text) to authenticated;
revoke all on function public.ts_clear_own_service_avatar() from public;
grant execute on function public.ts_clear_own_service_avatar() to authenticated;

notify pgrst, 'reload schema';

-- VERIFICACIÓN V8.8.18
select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='service_users' and column_name='avatar_path') as avatar_path_ok,
  exists(select 1 from storage.buckets where id='support-profile-photos' and public=false) as private_avatar_bucket_ok,
  to_regprocedure('public.ts_update_own_service_avatar(text)') is not null as avatar_update_rpc_ok,
  to_regprocedure('public.ts_clear_own_service_avatar()') is not null as avatar_clear_rpc_ok;
