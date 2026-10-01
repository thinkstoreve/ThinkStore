-- Ejecutar en Supabase de Soporte después de V14.38.
-- La clave del equipo se separa de la orden y de los datos de seguimiento.
begin;
create table if not exists public.service_order_access (
 order_id uuid primary key references public.service_orders(id) on delete cascade,
 access_code text,
 updated_at timestamptz not null default now()
);
alter table public.service_order_access enable row level security;
revoke all on public.service_order_access from anon,authenticated;
grant select,insert,update on public.service_order_access to authenticated;
drop policy if exists service_order_access_internal on public.service_order_access;
create policy service_order_access_internal on public.service_order_access for all to authenticated
using (public.current_service_role() in ('superadmin','admin','reception','technician') and public.service_has_any_module(array['orders','reception','technical']))
with check (public.current_service_role() in ('superadmin','admin','reception','technician') and public.service_has_any_module(array['orders','reception','technical']));
notify pgrst, 'reload schema';
commit;
