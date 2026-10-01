-- Ejecutar en Supabase de SOPORTE antes de usar invitaciones y permisos V14.38.
-- Requiere el esquema de producción ya instalado. No borra perfiles ni órdenes.
begin;
alter table public.service_users add column if not exists permissions jsonb default null;
-- NULL conserva los permisos históricos del rol; un array define accesos personalizados.
do $$ begin
 if not exists (select 1 from pg_constraint where conname='service_users_permissions_array' and conrelid='public.service_users'::regclass) then
  alter table public.service_users add constraint service_users_permissions_array check (permissions is null or jsonb_typeof(permissions)='array');
 end if;
end $$;
create or replace function public.service_has_any_module(modules text[])
returns boolean language sql stable security definer set search_path=public
as $$
 select coalesce((select case when rol in ('superadmin','admin') then true
   when permissions is null then true
   else permissions ?| modules end
 from public.service_users where lower(email)=lower(coalesce(auth.jwt()->>'email','')) and activo=true limit 1),false)
$$;
revoke all on function public.service_has_any_module(text[]) from public;
grant execute on function public.service_has_any_module(text[]) to authenticated;
-- Restrictive policies supplement existing role policies rather than granting new access.
drop policy if exists service_orders_module_limit on public.service_orders;
create policy service_orders_module_limit on public.service_orders as restrictive for all to authenticated
using (public.current_service_role()='client' or public.service_has_any_module(array['orders','reception','technical','sales','logistics','bitacora','clients','reports']))
with check (public.service_has_any_module(array['orders','reception','technical','sales','logistics']));
drop policy if exists service_notes_module_limit on public.service_order_notes;
create policy service_notes_module_limit on public.service_order_notes as restrictive for all to authenticated
using (public.current_service_role()='client' or public.service_has_any_module(array['orders','reception','technical','bitacora']))
with check (public.service_has_any_module(array['orders','reception','technical','bitacora']));
drop policy if exists service_photos_module_limit on public.service_order_photos;
create policy service_photos_module_limit on public.service_order_photos as restrictive for all to authenticated
using (public.service_has_any_module(array['orders','reception','technical']))
with check (public.service_has_any_module(array['orders','reception','technical']));
drop policy if exists service_files_module_limit on storage.objects;
create policy service_files_module_limit on storage.objects as restrictive for all to authenticated
using (bucket_id<>'service-order-files' or public.service_has_any_module(array['orders','reception','technical']))
with check (bucket_id<>'service-order-files' or public.service_has_any_module(array['orders','reception','technical']));


drop policy if exists service_parts_module_limit on public.service_parts;
create policy service_parts_module_limit on public.service_parts as restrictive for all to authenticated
using (public.service_has_any_module(array['parts']))
with check (public.service_has_any_module(array['parts']));

drop policy if exists service_part_movements_module_limit on public.service_part_movements;
create policy service_part_movements_module_limit on public.service_part_movements as restrictive for all to authenticated
using (public.service_has_any_module(array['parts']))
with check (public.service_has_any_module(array['parts']));

do $migration$ begin
 if to_regclass('public.service_appointments') is not null then
  execute $policy$drop policy if exists service_appointments_module_limit on public.service_appointments$policy$;
  execute $policy$create policy service_appointments_module_limit on public.service_appointments as restrictive for all to authenticated
using (public.service_has_any_module(array['appointments','reception']))
with check (public.service_has_any_module(array['appointments','reception']))$policy$;
 end if;
end $migration$;

create or replace function public.adjust_service_part_stock(p_part_id uuid,p_quantity integer,p_type text,p_order_id text default null,p_note text default null)
returns public.service_parts language plpgsql security definer set search_path=public as $$
declare part public.service_parts; next_quantity integer;
begin
  if not public.service_has_any_module(array['parts']) then raise exception 'Sin permiso de repuestos'; end if;
  if public.current_service_role() not in ('superadmin','admin','reception','technician','sales') then raise exception 'Acceso no autorizado'; end if;
  if p_quantity=0 then raise exception 'La cantidad no puede ser cero'; end if;
  select * into part from public.service_parts where id=p_part_id and active=true for update;
  if not found then raise exception 'Repuesto no encontrado'; end if;
  next_quantity:=part.quantity+p_quantity;
  if next_quantity<0 then raise exception 'Stock insuficiente. Disponible: %',part.quantity; end if;
  update public.service_parts set quantity=next_quantity,updated_at=now() where id=p_part_id returning * into part;
  insert into public.service_part_movements(part_id,order_id,movement_type,quantity,balance_after,note,actor_email)
  values(p_part_id,p_order_id,coalesce(nullif(trim(p_type),''),'ajuste'),p_quantity,next_quantity,p_note,auth.jwt()->>'email');
  return part;
end $$;
revoke all on function public.adjust_service_part_stock(uuid,integer,text,text,text) from public;
grant execute on function public.adjust_service_part_stock(uuid,integer,text,text,text) to authenticated;


notify pgrst, 'reload schema';
commit;
