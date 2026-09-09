-- ThinkStore Soporte · Producción real e independiente
-- Ejecutar SOLO en el proyecto Supabase de soporte.
-- Es idempotente: puede ejecutarse nuevamente sin borrar datos.

create extension if not exists pgcrypto;

create table if not exists public.service_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  nombre text not null,
  rol text not null,
  activo boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  client_name text not null,
  client_phone text not null,
  client_email text,
  device_type text,
  device_model text not null,
  serial_imei text,
  reported_issue text not null,
  accessories_received text,
  visual_condition text,
  priority text not null default 'Normal',
  status text not null default 'Recibido',
  quote_amount numeric(12,2),
  quote_currency text default 'USD',
  quote_status text default 'Pendiente',
  warranty_days int default 0,
  delivery_method text,
  tracking_company text,
  tracking_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Normaliza instalaciones antiguas donde service_orders ya existía con menos columnas.
alter table public.service_orders add column if not exists code text;
alter table public.service_orders add column if not exists client_name text;
alter table public.service_orders add column if not exists client_phone text;
alter table public.service_orders add column if not exists client_email text;
alter table public.service_orders add column if not exists device_type text;
alter table public.service_orders add column if not exists device_model text;
alter table public.service_orders add column if not exists serial_imei text;
alter table public.service_orders add column if not exists reported_issue text;
alter table public.service_orders add column if not exists accessories_received text;
alter table public.service_orders add column if not exists visual_condition text;
alter table public.service_orders add column if not exists priority text default 'Normal';
alter table public.service_orders add column if not exists status text default 'Recibido';
alter table public.service_orders add column if not exists quote_amount numeric(12,2);
alter table public.service_orders add column if not exists quote_currency text default 'USD';
alter table public.service_orders add column if not exists quote_status text default 'Pendiente';
alter table public.service_orders add column if not exists warranty_days int default 0;
alter table public.service_orders add column if not exists delivery_method text;
alter table public.service_orders add column if not exists tracking_company text;
alter table public.service_orders add column if not exists tracking_code text;
alter table public.service_orders add column if not exists created_at timestamptz default now();
alter table public.service_orders add column if not exists updated_at timestamptz default now();
alter table public.service_orders add column if not exists created_by_email text;
alter table public.service_orders add column if not exists assigned_technician_email text;
alter table public.service_orders add column if not exists device_color text;
alter table public.service_orders add column if not exists password_received boolean default false;
alter table public.service_orders add column if not exists technical_notes text;
alter table public.service_orders add column if not exists reception_checklist jsonb default '{}'::jsonb;
alter table public.service_orders add column if not exists signatures jsonb default '{}'::jsonb;
alter table public.service_orders add column if not exists delivered_at timestamptz;

-- Conserva cualquier fila antigua y le asigna valores compatibles con la interfaz nueva.
update public.service_orders set code='TS-SVC-LEGACY-'||id::text where code is null or btrim(code)='';
update public.service_orders set client_name='Cliente' where client_name is null or btrim(client_name)='';
update public.service_orders set client_phone='' where client_phone is null;
update public.service_orders set device_model='Equipo por identificar' where device_model is null or btrim(device_model)='';
update public.service_orders set reported_issue='Sin descripción migrada' where reported_issue is null or btrim(reported_issue)='';
update public.service_orders set priority='Normal' where priority is null;
update public.service_orders set status='Recibido' where status is null;
update public.service_orders set quote_status='Pendiente' where quote_status is null;
update public.service_orders set created_at=now() where created_at is null;
update public.service_orders set updated_at=coalesce(created_at,now()) where updated_at is null;

alter table public.service_orders alter column code set not null;
alter table public.service_orders alter column client_name set not null;
alter table public.service_orders alter column client_phone set not null;
alter table public.service_orders alter column device_model set not null;
alter table public.service_orders alter column reported_issue set not null;

create table if not exists public.service_order_notes (
  id uuid primary key default gen_random_uuid(),
  note text not null,
  visibility text not null default 'internal',
  created_at timestamptz not null default now()
);

alter table public.service_order_notes add column if not exists note text;
alter table public.service_order_notes add column if not exists visibility text default 'internal';
alter table public.service_order_notes add column if not exists created_at timestamptz default now();

-- Compatibilidad: instalaciones anteriores pueden usar bigint en service_orders.id.
-- Crea order_id con exactamente el mismo tipo, sin convertir ni borrar órdenes.
do $$
declare
  order_id_type text;
  notes_id_type text;
  notes_count bigint;
begin
  select format_type(a.atttypid,a.atttypmod) into order_id_type
  from pg_attribute a
  where a.attrelid='public.service_orders'::regclass and a.attname='id' and not a.attisdropped;

  select format_type(a.atttypid,a.atttypmod) into notes_id_type
  from pg_attribute a
  where a.attrelid='public.service_order_notes'::regclass and a.attname='order_id' and not a.attisdropped;

  if notes_id_type is null then
    execute format('alter table public.service_order_notes add column order_id %s',order_id_type);
  elsif notes_id_type <> order_id_type then
    execute 'select count(*) from public.service_order_notes' into notes_count;
    if notes_count > 0 then
      raise exception 'service_order_notes.order_id usa %, pero service_orders.id usa %. Hay notas existentes; no se realizó una conversión destructiva.',notes_id_type,order_id_type;
    end if;
    execute 'alter table public.service_order_notes drop column order_id';
    execute format('alter table public.service_order_notes add column order_id %s',order_id_type);
  end if;

  alter table public.service_order_notes alter column order_id set not null;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.service_order_notes'::regclass
      and conname='service_order_notes_order_id_fkey'
  ) then
    alter table public.service_order_notes
      add constraint service_order_notes_order_id_fkey
      foreign key(order_id) references public.service_orders(id) on delete cascade;
  end if;
end $$;

alter table public.service_order_notes add column if not exists author_name text;
alter table public.service_order_notes add column if not exists note_type text;
alter table public.service_order_notes add column if not exists status_after text;
alter table public.service_order_notes add column if not exists attachments text;

create table if not exists public.service_order_photos (
  id uuid primary key default gen_random_uuid(),
  file_url text not null,
  storage_path text,
  label text,
  created_by_email text,
  created_at timestamptz not null default now()
);

do $$
declare order_id_type text; photo_order_type text; photo_count bigint;
begin
  select format_type(a.atttypid,a.atttypmod) into order_id_type
  from pg_attribute a where a.attrelid='public.service_orders'::regclass and a.attname='id' and not a.attisdropped;
  select format_type(a.atttypid,a.atttypmod) into photo_order_type from pg_attribute a where a.attrelid='public.service_order_photos'::regclass and a.attname='order_id' and not a.attisdropped;
  if photo_order_type is null then
    execute format('alter table public.service_order_photos add column order_id %s',order_id_type);
  elsif photo_order_type <> order_id_type then
    execute 'select count(*) from public.service_order_photos' into photo_count;
    if photo_count > 0 then raise exception 'service_order_photos.order_id usa %, pero service_orders.id usa %. Hay archivos existentes.',photo_order_type,order_id_type; end if;
    alter table public.service_order_photos drop column order_id;
    execute format('alter table public.service_order_photos add column order_id %s',order_id_type);
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.service_order_photos'::regclass and conname='service_order_photos_order_id_fkey') then
    alter table public.service_order_photos add constraint service_order_photos_order_id_fkey foreign key(order_id) references public.service_orders(id) on delete cascade;
  end if;
end $$;

create table if not exists public.service_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.service_parts (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  category text,
  compatible_models text,
  quantity integer not null default 0 check(quantity>=0),
  minimum_stock integer not null default 0 check(minimum_stock>=0),
  unit_cost numeric(12,2),
  sale_price numeric(12,2),
  location text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_part_movements (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.service_parts(id) on delete restrict,
  order_id text,
  movement_type text not null,
  quantity integer not null check(quantity<>0),
  balance_after integer not null,
  note text,
  actor_email text,
  created_at timestamptz not null default now()
);

create unique index if not exists service_orders_code_idx on public.service_orders(code);
create index if not exists service_orders_status_idx on public.service_orders(status);
create index if not exists service_orders_updated_idx on public.service_orders(updated_at desc);
create index if not exists service_notes_order_idx on public.service_order_notes(order_id,created_at desc);
create index if not exists service_photos_order_idx on public.service_order_photos(order_id,created_at desc);
create index if not exists service_audit_created_idx on public.service_audit_log(created_at desc);
create index if not exists service_parts_sku_idx on public.service_parts(sku);
create index if not exists service_parts_stock_idx on public.service_parts(quantity,minimum_stock);
create index if not exists service_part_movements_idx on public.service_part_movements(part_id,created_at desc);

create or replace function public.current_service_role()
returns text
language sql
stable
security definer
set search_path=public
as $$
  select rol from public.service_users
  where lower(email)=lower(coalesce(auth.jwt()->>'email','')) and activo=true
  limit 1
$$;

create or replace function public.touch_service_order()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists service_orders_touch_updated_at on public.service_orders;
create trigger service_orders_touch_updated_at before update on public.service_orders
for each row execute function public.touch_service_order();
drop trigger if exists service_parts_touch_updated_at on public.service_parts;
create trigger service_parts_touch_updated_at before update on public.service_parts
for each row execute function public.touch_service_order();

alter table public.service_orders enable row level security;
alter table public.service_order_notes enable row level security;
alter table public.service_users enable row level security;
alter table public.service_order_photos enable row level security;
alter table public.service_audit_log enable row level security;
alter table public.service_parts enable row level security;
alter table public.service_part_movements enable row level security;

drop policy if exists "service users read own profile" on public.service_users;
drop policy if exists "service_users_own_profile" on public.service_users;
drop policy if exists "service_users_admin_all" on public.service_users;
create policy "service_users_own_profile" on public.service_users
for select to authenticated
using (lower(email)=lower(coalesce(auth.jwt()->>'email','')));
create policy "service_users_admin_all" on public.service_users
for all to authenticated
using (public.current_service_role() in ('superadmin','admin'))
with check (public.current_service_role() in ('superadmin','admin'));

drop policy if exists "orders_staff_all" on public.service_orders;
drop policy if exists "orders_client_own" on public.service_orders;
drop policy if exists "service_orders_staff_production" on public.service_orders;
create policy "service_orders_staff_production" on public.service_orders
for all to authenticated
using (public.current_service_role() in ('superadmin','admin','reception','technician','sales','logistics'))
with check (public.current_service_role() in ('superadmin','admin','reception','technician','sales','logistics'));

drop policy if exists "notes_staff_all" on public.service_order_notes;
drop policy if exists "notes_client_visible" on public.service_order_notes;
drop policy if exists "service_notes_staff_production" on public.service_order_notes;
create policy "service_notes_staff_production" on public.service_order_notes
for all to authenticated
using (public.current_service_role() in ('superadmin','admin','reception','technician','sales','logistics'))
with check (public.current_service_role() in ('superadmin','admin','reception','technician','sales','logistics'));

drop policy if exists "service_photos_staff_production" on public.service_order_photos;
create policy "service_photos_staff_production" on public.service_order_photos for all to authenticated
using (public.current_service_role() in ('superadmin','admin','reception','technician'))
with check (public.current_service_role() in ('superadmin','admin','reception','technician'));

drop policy if exists "service_audit_staff_read" on public.service_audit_log;
drop policy if exists "service_audit_staff_insert" on public.service_audit_log;
create policy "service_audit_staff_read" on public.service_audit_log for select to authenticated
using (public.current_service_role() in ('superadmin','admin'));
create policy "service_audit_staff_insert" on public.service_audit_log for insert to authenticated
with check (public.current_service_role() in ('superadmin','admin','reception','technician','sales','logistics'));

drop policy if exists "service_parts_staff" on public.service_parts;
create policy "service_parts_staff" on public.service_parts for all to authenticated
using (public.current_service_role() in ('superadmin','admin','reception','technician','sales'))
with check (public.current_service_role() in ('superadmin','admin','reception','technician','sales'));
drop policy if exists "service_part_movements_staff" on public.service_part_movements;
create policy "service_part_movements_staff" on public.service_part_movements for select to authenticated
using (public.current_service_role() in ('superadmin','admin','reception','technician','sales'));

grant select on public.service_users to authenticated;
grant select,insert,update on public.service_orders to authenticated;
grant select,insert,update on public.service_order_notes to authenticated;
grant select,insert,update,delete on public.service_order_photos to authenticated;
grant select,insert on public.service_audit_log to authenticated;
grant select,insert,update on public.service_parts to authenticated;
grant select on public.service_part_movements to authenticated;
grant execute on function public.current_service_role() to authenticated;

insert into storage.buckets(id,name,public) values('service-order-files','service-order-files',false)
on conflict(id) do update set public=false;
drop policy if exists "service_files_staff_read" on storage.objects;
drop policy if exists "service_files_staff_write" on storage.objects;
create policy "service_files_staff_read" on storage.objects for select to authenticated
using (bucket_id='service-order-files' and public.current_service_role() in ('superadmin','admin','reception','technician'));
create policy "service_files_staff_write" on storage.objects for all to authenticated
using (bucket_id='service-order-files' and public.current_service_role() in ('superadmin','admin','reception','technician'))
with check (bucket_id='service-order-files' and public.current_service_role() in ('superadmin','admin','reception','technician'));

create or replace function public.adjust_service_part_stock(p_part_id uuid,p_quantity integer,p_type text,p_order_id text default null,p_note text default null)
returns public.service_parts language plpgsql security definer set search_path=public as $$
declare part public.service_parts; next_quantity integer;
begin
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

create or replace function public.lookup_service_order(p_code text)
returns table(code text, client_name text, device_model text, status text, updated_at timestamptz)
language sql stable security definer set search_path=public as $$
  select o.code,o.client_name,o.device_model,o.status::text,o.updated_at
  from public.service_orders o where upper(o.code)=upper(trim(p_code)) limit 1
$$;
revoke all on function public.lookup_service_order(text) from public;
grant execute on function public.lookup_service_order(text) to anon, authenticated;

notify pgrst, 'reload schema';
