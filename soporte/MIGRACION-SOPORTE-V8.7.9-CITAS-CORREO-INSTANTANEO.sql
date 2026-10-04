-- ThinkStore Soporte V8.7.9
-- Correo INSTANTÁNEO al crear una cita web.
-- Ejecutar UNA SOLA VEZ en Supabase -> ThinkStore-Soporte.

begin;

create extension if not exists pg_net with schema extensions;

create or replace function public.ts_email_new_appointment_instant()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.event_type <> 'appointment_new' then
    return new;
  end if;

  perform net.http_post(
    url := 'https://soporte.thinkstore.com.ve/.netlify/functions/support-appointment-email',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'X-ThinkStore-Webhook','uV0rTyB7yrUdFpR5pI4mOItrtJVpdwzLQYIPkBsTWCSuJrp5'
    ),
    body := jsonb_build_object('notification_id',new.id),
    timeout_milliseconds := 5000
  );

  return new;
end $$;

drop trigger if exists trg_ts_email_new_appointment_instant on public.support_notifications;

create trigger trg_ts_email_new_appointment_instant
after insert on public.support_notifications
for each row
when (new.event_type = 'appointment_new')
execute function public.ts_email_new_appointment_instant();

notify pgrst,'reload schema';

commit;

-- Verificación
select
  exists(select 1 from pg_extension where extname='pg_net') as pg_net_ready,
  exists(select 1 from pg_trigger where tgname='trg_ts_email_new_appointment_instant') as instant_appointment_email_ready;
