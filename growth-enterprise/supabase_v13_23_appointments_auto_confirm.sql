-- ThinkStore V13.23 · Ejecutar SOLO en Supabase ThinkStore-Soporte.
-- Hace que las nuevas citas web queden agendadas automáticamente.
alter table public.service_appointments
  alter column status set default 'agendada';

-- Convierte únicamente solicitudes antiguas que todavía estaban esperando confirmación.
update public.service_appointments
set status = 'agendada', updated_at = now()
where status in ('pendiente_confirmacion','pendiente');
