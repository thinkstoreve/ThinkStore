-- ThinkStore Soporte · acceso del panel privado a las citas web
-- Ejecutar SOLO en el proyecto Supabase ThinkStore-Soporte.
alter table public.service_appointments enable row level security;

drop policy if exists "service_staff_read_appointments" on public.service_appointments;
create policy "service_staff_read_appointments"
on public.service_appointments
for select
to authenticated
using (
  exists (
    select 1 from public.service_users su
    where lower(su.email) = lower(coalesce(auth.jwt()->>'email',''))
      and su.activo = true
  )
);

drop policy if exists "service_staff_update_appointments" on public.service_appointments;
create policy "service_staff_update_appointments"
on public.service_appointments
for update
to authenticated
using (
  exists (
    select 1 from public.service_users su
    where lower(su.email) = lower(coalesce(auth.jwt()->>'email',''))
      and su.activo = true
  )
)
with check (
  exists (
    select 1 from public.service_users su
    where lower(su.email) = lower(coalesce(auth.jwt()->>'email',''))
      and su.activo = true
  )
);
