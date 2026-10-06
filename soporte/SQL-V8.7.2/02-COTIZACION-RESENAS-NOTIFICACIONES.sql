-- ThinkStore Soporte V8.7.2 · Migración dividida BIGINT-safe
-- Ejecutar en Supabase -> ThinkStore-Soporte -> SQL Editor
-- NO ejecutar en el Supabase principal.

-- PARTE 2 DE 4
-- Cotización, reseñas y tabla de notificaciones.

begin;

-- ============================================================
-- E. V8.6 · Cotización y aceptación del cliente
-- ============================================================

alter table public.service_orders
  add column if not exists quote_repair_details text,
  add column if not exists quote_sent_at timestamptz,
  add column if not exists quote_approved_at timestamptz,
  add column if not exists quote_terms_accepted_at timestamptz,
  add column if not exists quote_terms_version text,
  add column if not exists quote_client_comment text;

create index if not exists service_orders_quote_approval_idx
  on public.service_orders(status, quote_status, quote_approved_at);

-- ============================================================
-- F. V8.7 · Reseñas del cliente
--    order_id hereda el tipo REAL de service_orders.id.
-- ============================================================

create table if not exists public.service_feedback (
  id uuid primary key default gen_random_uuid(),
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 1 and 1200),
  client_name text,
  client_email text,
  reviewed_at timestamptz,
  reviewed_by_email text,
  created_at timestamptz not null default now()
);

do $$
declare
  parent_type text;
  child_type text;
  row_count bigint;
begin
  select format_type(a.atttypid,a.atttypmod)
    into parent_type
  from pg_attribute a
  where a.attrelid = 'public.service_orders'::regclass
    and a.attname = 'id'
    and not a.attisdropped;

  select format_type(a.atttypid,a.atttypmod)
    into child_type
  from pg_attribute a
  where a.attrelid = 'public.service_feedback'::regclass
    and a.attname = 'order_id'
    and not a.attisdropped;

  if child_type is null then
    execute format(
      'alter table public.service_feedback add column order_id %s',
      parent_type
    );
  elsif child_type <> parent_type then
    execute 'select count(*) from public.service_feedback'
      into row_count;

    if row_count > 0 then
      raise exception
        'service_feedback.order_id usa %, service_orders.id usa %, y existen % reseñas.',
        child_type, parent_type, row_count;
    end if;

    alter table public.service_feedback
      drop constraint if exists service_feedback_order_id_fkey;

    alter table public.service_feedback
      drop column order_id;

    execute format(
      'alter table public.service_feedback add column order_id %s',
      parent_type
    );
  end if;

  alter table public.service_feedback
    alter column order_id set not null;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.service_feedback'::regclass
      and conname = 'service_feedback_order_id_fkey'
  ) then
    alter table public.service_feedback
      add constraint service_feedback_order_id_fkey
      foreign key(order_id)
      references public.service_orders(id)
      on delete cascade;
  end if;
end $$;

create unique index if not exists service_feedback_order_uidx
  on public.service_feedback(order_id);

alter table public.service_feedback enable row level security;

drop policy if exists service_feedback_staff_read
  on public.service_feedback;

create policy service_feedback_staff_read
on public.service_feedback
for select
to authenticated
using (
  public.current_service_role() in
  ('superadmin','admin','reception','technician','sales','logistics')
);

drop policy if exists service_feedback_staff_update
  on public.service_feedback;

create policy service_feedback_staff_update
on public.service_feedback
for update
to authenticated
using (
  public.current_service_role() in
  ('superadmin','admin','reception','technician','sales')
)
with check (
  public.current_service_role() in
  ('superadmin','admin','reception','technician','sales')
);

grant select, update
on public.service_feedback
to authenticated;

-- ============================================================
-- G. V8.7 · Centro general de notificaciones
--
-- entity_id es TEXT porque puede referirse a entidades con IDs
-- UUID o BIGINT.
--
-- order_id y appointment_id se crean dinámicamente con el tipo
-- REAL de sus tablas padre.
-- ============================================================

create table if not exists public.support_notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  title text not null,
  message text,
  severity text not null default 'info'
    check (severity in ('info','success','warning','critical')),
  entity_type text,
  entity_id text,
  feedback_id uuid references public.service_feedback(id) on delete cascade,
  assigned_to_email text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  email_sent_at timestamptz,
  email_attempts integer not null default 0,
  email_last_error text,
  created_at timestamptz not null default now()
);

-- order_id dinámico
do $$
declare
  parent_type text;
  child_type text;
  row_count bigint;
begin
  select format_type(a.atttypid,a.atttypmod)
    into parent_type
  from pg_attribute a
  where a.attrelid = 'public.service_orders'::regclass
    and a.attname = 'id'
    and not a.attisdropped;

  select format_type(a.atttypid,a.atttypmod)
    into child_type
  from pg_attribute a
  where a.attrelid = 'public.support_notifications'::regclass
    and a.attname = 'order_id'
    and not a.attisdropped;

  if child_type is null then
    execute format(
      'alter table public.support_notifications add column order_id %s',
      parent_type
    );
  elsif child_type <> parent_type then
    execute 'select count(*) from public.support_notifications'
      into row_count;

    if row_count > 0 then
      raise exception
        'support_notifications.order_id usa %, service_orders.id usa %, y existen % notificaciones.',
        child_type, parent_type, row_count;
    end if;

    alter table public.support_notifications
      drop constraint if exists support_notifications_order_id_fkey;

    alter table public.support_notifications
      drop column order_id;

    execute format(
      'alter table public.support_notifications add column order_id %s',
      parent_type
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.support_notifications'::regclass
      and conname = 'support_notifications_order_id_fkey'
  ) then
    alter table public.support_notifications
      add constraint support_notifications_order_id_fkey
      foreign key(order_id)
      references public.service_orders(id)
      on delete cascade;
  end if;
end $$;

-- appointment_id dinámico
do $$
declare
  parent_type text;
  child_type text;
  row_count bigint;
begin
  if to_regclass('public.service_appointments') is null then
    return;
  end if;

  select format_type(a.atttypid,a.atttypmod)
    into parent_type
  from pg_attribute a
  where a.attrelid = 'public.service_appointments'::regclass
    and a.attname = 'id'
    and not a.attisdropped;

  if parent_type is null then
    return;
  end if;

  select format_type(a.atttypid,a.atttypmod)
    into child_type
  from pg_attribute a
  where a.attrelid = 'public.support_notifications'::regclass
    and a.attname = 'appointment_id'
    and not a.attisdropped;

  if child_type is null then
    execute format(
      'alter table public.support_notifications add column appointment_id %s',
      parent_type
    );
  elsif child_type <> parent_type then
    execute 'select count(*) from public.support_notifications'
      into row_count;

    if row_count > 0 then
      raise exception
        'support_notifications.appointment_id usa %, service_appointments.id usa %, y existen % notificaciones.',
        child_type, parent_type, row_count;
    end if;

    alter table public.support_notifications
      drop constraint if exists support_notifications_appointment_id_fkey;

    alter table public.support_notifications
      drop column appointment_id;

    execute format(
      'alter table public.support_notifications add column appointment_id %s',
      parent_type
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.support_notifications'::regclass
      and conname = 'support_notifications_appointment_id_fkey'
  ) then
    alter table public.support_notifications
      add constraint support_notifications_appointment_id_fkey
      foreign key(appointment_id)
      references public.service_appointments(id)
      on delete cascade;
  end if;
end $$;

create index if not exists support_notifications_created_idx
  on public.support_notifications(created_at desc);

create index if not exists support_notifications_unread_idx
  on public.support_notifications(read_at, created_at desc);

create index if not exists support_notifications_email_idx
  on public.support_notifications(email_sent_at, created_at);

create index if not exists support_notifications_order_idx
  on public.support_notifications(order_id, created_at desc);

alter table public.support_notifications enable row level security;

drop policy if exists support_notifications_staff_select
  on public.support_notifications;

create policy support_notifications_staff_select
on public.support_notifications
for select
to authenticated
using (
  public.current_service_role() in
  ('superadmin','admin','reception','technician','sales','logistics')
);

drop policy if exists support_notifications_staff_update
  on public.support_notifications;

create policy support_notifications_staff_update
on public.support_notifications
for update
to authenticated
using (
  public.current_service_role() in
  ('superadmin','admin','reception','technician','sales','logistics')
)
with check (true);

grant select, update
on public.support_notifications
to authenticated;


notify pgrst, 'reload schema';
commit;
