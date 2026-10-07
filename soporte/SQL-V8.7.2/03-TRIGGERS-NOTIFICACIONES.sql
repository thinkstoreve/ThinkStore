-- ThinkStore Soporte V8.7.2 · Migración dividida BIGINT-safe
-- Ejecutar en Supabase -> ThinkStore-Soporte -> SQL Editor
-- NO ejecutar en el Supabase principal.

-- PARTE 3 DE 4
-- Triggers de citas, mensajes, reseñas y estados.

begin;

-- ============================================================
-- H. Triggers de notificaciones
-- ============================================================

-- 1. Citas web
create or replace function public.ts_notify_service_appointment()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_type text;
  v_title text;
begin
  if tg_op = 'INSERT' then
    v_type := 'appointment_new';
    v_title := 'Nueva cita web · ' || coalesce(new.client_name,'Cliente');
  else
    if not (
      old.status is distinct from new.status
      or old.preferred_date is distinct from new.preferred_date
      or old.preferred_time is distinct from new.preferred_time
      or old.service_type is distinct from new.service_type
      or old.service_mode is distinct from new.service_mode
    ) then
      return new;
    end if;

    v_type := 'appointment_updated';
    v_title := 'Cita actualizada · ' || coalesce(new.client_name,'Cliente');
  end if;

  insert into public.support_notifications(
    event_type,
    title,
    message,
    severity,
    entity_type,
    entity_id,
    appointment_id,
    metadata
  )
  values(
    v_type,
    v_title,
    concat_ws(
      ' · ',
      nullif(new.device_model,''),
      nullif(new.service_type,''),
      nullif(new.preferred_date::text,''),
      nullif(new.preferred_time::text,''),
      nullif(new.status,'')
    ),
    case when tg_op='INSERT' then 'success' else 'info' end,
    'appointment',
    new.id::text,
    new.id,
    jsonb_build_object(
      'client_name',new.client_name,
      'client_email',new.client_email,
      'client_phone',new.client_phone,
      'device_model',new.device_model,
      'service_mode',new.service_mode,
      'status',new.status
    )
  );

  return new;
end $$;

do $$
begin
  if to_regclass('public.service_appointments') is not null then
    execute 'drop trigger if exists trg_ts_notify_service_appointment on public.service_appointments';
    execute 'create trigger trg_ts_notify_service_appointment after insert or update on public.service_appointments for each row execute function public.ts_notify_service_appointment()';
  end if;
end $$;

-- 2. Mensajes del cliente
create or replace function public.ts_notify_client_message()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  o public.service_orders%rowtype;
begin
  if new.sender_type <> 'client' then
    return new;
  end if;

  select *
    into o
  from public.service_orders
  where id = new.order_id;

  insert into public.support_notifications(
    event_type,
    title,
    message,
    severity,
    entity_type,
    entity_id,
    order_id,
    assigned_to_email,
    metadata
  )
  values(
    'client_message',
    'Nuevo mensaje · ' || coalesce(o.code,'Orden'),
    left(coalesce(new.message,''),500),
    'info',
    'order',
    o.id::text,
    o.id,
    o.assigned_technician_email,
    jsonb_build_object(
      'client_name',coalesce(new.sender_name,o.client_name,'Cliente'),
      'order_code',o.code,
      'device_model',o.device_model
    )
  );

  return new;
end $$;

drop trigger if exists trg_ts_notify_client_message
  on public.service_order_messages;

create trigger trg_ts_notify_client_message
after insert on public.service_order_messages
for each row
execute function public.ts_notify_client_message();

-- 3. Reseñas del cliente
create or replace function public.ts_notify_client_feedback()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  o public.service_orders%rowtype;
begin
  select *
    into o
  from public.service_orders
  where id = new.order_id;

  insert into public.support_notifications(
    event_type,
    title,
    message,
    severity,
    entity_type,
    entity_id,
    order_id,
    feedback_id,
    assigned_to_email,
    metadata
  )
  values(
    'client_review',
    'Nueva reseña · ' || coalesce(o.code,'Orden'),
    repeat('★',new.rating) || ' · ' || left(new.comment,500),
    case when new.rating <= 2 then 'warning' else 'success' end,
    'feedback',
    new.id::text,
    o.id,
    new.id,
    o.assigned_technician_email,
    jsonb_build_object(
      'client_name',coalesce(new.client_name,o.client_name,'Cliente'),
      'rating',new.rating,
      'order_code',o.code,
      'device_model',o.device_model
    )
  );

  return new;
end $$;

drop trigger if exists trg_ts_notify_client_feedback
  on public.service_feedback;

create trigger trg_ts_notify_client_feedback
after insert on public.service_feedback
for each row
execute function public.ts_notify_client_feedback();

-- 4. Cambios de estado de la orden
create or replace function public.ts_notify_order_status()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_type text;
  v_title text;
  v_severity text := 'info';
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if new.status = 'Aprobado por cliente' then
    v_type := 'quote_approved';
    v_title := 'Cotización aprobada · ' || new.code;
    v_severity := 'success';
  elsif new.status = 'Listo para entregar' then
    v_type := 'order_ready';
    v_title := 'Equipo listo para entregar · ' || new.code;
    v_severity := 'success';
  else
    v_type := 'order_status';
    v_title := 'Estado actualizado · ' || new.code;
  end if;

  insert into public.support_notifications(
    event_type,
    title,
    message,
    severity,
    entity_type,
    entity_id,
    order_id,
    assigned_to_email,
    metadata
  )
  values(
    v_type,
    v_title,
    coalesce(new.client_name,'Cliente')
      || ' · '
      || coalesce(new.device_model,'Equipo')
      || ' · '
      || coalesce(old.status,'')
      || ' → '
      || coalesce(new.status,''),
    v_severity,
    'order',
    new.id::text,
    new.id,
    new.assigned_technician_email,
    jsonb_build_object(
      'client_name',new.client_name,
      'order_code',new.code,
      'device_model',new.device_model,
      'previous_status',old.status,
      'status',new.status
    )
  );

  return new;
end $$;

drop trigger if exists trg_ts_notify_order_status
  on public.service_orders;

create trigger trg_ts_notify_order_status
after update of status on public.service_orders
for each row
execute function public.ts_notify_order_status();


notify pgrst, 'reload schema';
commit;
