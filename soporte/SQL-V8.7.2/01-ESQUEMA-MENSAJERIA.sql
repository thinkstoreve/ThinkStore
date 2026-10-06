-- ThinkStore Soporte V8.7.2 · Migración dividida BIGINT-safe
-- Ejecutar en Supabase -> ThinkStore-Soporte -> SQL Editor
-- NO ejecutar en el Supabase principal.

-- PARTE 1 DE 4
-- Bitácora, token seguro, fotos y mensajería.

begin;

-- ============================================================
-- A. V8.4 · Bitácora detallada visible para el cliente
-- ============================================================

alter table public.service_order_notes
  add column if not exists client_title text,
  add column if not exists diagnosis text,
  add column if not exists work_performed text,
  add column if not exists parts_used text,
  add column if not exists tests_performed text,
  add column if not exists client_notes text;

create index if not exists service_notes_client_visibility_idx
  on public.service_order_notes(order_id, visibility, created_at desc);

-- ============================================================
-- B. V8.5 · Token seguro de seguimiento
-- ============================================================

alter table public.service_orders
  add column if not exists public_token uuid default gen_random_uuid();

update public.service_orders
set public_token = gen_random_uuid()
where public_token is null;

alter table public.service_orders
  alter column public_token set default gen_random_uuid();

alter table public.service_orders
  alter column public_token set not null;

create unique index if not exists service_orders_public_token_uidx
  on public.service_orders(public_token);

-- ============================================================
-- C. V8.5 · Fotos públicas / privadas
-- ============================================================

alter table public.service_order_photos
  add column if not exists visibility text default 'internal',
  add column if not exists client_caption text;

update public.service_order_photos
set visibility = 'internal'
where visibility is null;

alter table public.service_order_photos
  alter column visibility set default 'internal';

alter table public.service_order_photos
  alter column visibility set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'service_order_photos_visibility_check'
      and conrelid = 'public.service_order_photos'::regclass
  ) then
    alter table public.service_order_photos
      add constraint service_order_photos_visibility_check
      check (visibility in ('internal','client'));
  end if;
end $$;

create index if not exists service_photos_public_idx
  on public.service_order_photos(order_id, visibility, created_at desc);

-- ============================================================
-- D. V8.5 · Mensajería cliente <-> técnico
--    order_id hereda el tipo REAL de service_orders.id.
-- ============================================================

create table if not exists public.service_order_messages (
  id uuid primary key default gen_random_uuid(),
  sender_type text not null check (sender_type in ('staff','client')),
  sender_name text,
  message text not null check (char_length(message) between 1 and 2000),
  created_by_email text,
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

  if parent_type is null then
    raise exception 'No se pudo detectar public.service_orders.id';
  end if;

  select format_type(a.atttypid,a.atttypmod)
    into child_type
  from pg_attribute a
  where a.attrelid = 'public.service_order_messages'::regclass
    and a.attname = 'order_id'
    and not a.attisdropped;

  if child_type is null then
    execute format(
      'alter table public.service_order_messages add column order_id %s',
      parent_type
    );
  elsif child_type <> parent_type then
    execute 'select count(*) from public.service_order_messages'
      into row_count;

    if row_count > 0 then
      raise exception
        'service_order_messages.order_id usa %, service_orders.id usa %, y existen % mensajes. No se realizó ningún cambio destructivo.',
        child_type, parent_type, row_count;
    end if;

    alter table public.service_order_messages
      drop constraint if exists service_order_messages_order_id_fkey;

    alter table public.service_order_messages
      drop column order_id;

    execute format(
      'alter table public.service_order_messages add column order_id %s',
      parent_type
    );
  end if;

  alter table public.service_order_messages
    alter column order_id set not null;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.service_order_messages'::regclass
      and conname = 'service_order_messages_order_id_fkey'
  ) then
    alter table public.service_order_messages
      add constraint service_order_messages_order_id_fkey
      foreign key(order_id)
      references public.service_orders(id)
      on delete cascade;
  end if;
end $$;

create index if not exists service_order_messages_order_idx
  on public.service_order_messages(order_id, created_at);

alter table public.service_order_messages enable row level security;

drop policy if exists service_messages_staff_all
  on public.service_order_messages;

create policy service_messages_staff_all
on public.service_order_messages
for all
to authenticated
using (
  public.current_service_role() in
  ('superadmin','admin','reception','technician','sales','logistics')
)
with check (
  public.current_service_role() in
  ('superadmin','admin','reception','technician','sales','logistics')
);

grant select, insert, update, delete
on public.service_order_messages
to authenticated;


notify pgrst, 'reload schema';
commit;
