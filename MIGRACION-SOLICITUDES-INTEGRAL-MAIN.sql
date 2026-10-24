-- Supabase MAIN clhnndxsgzqnihhtrout. Aditiva; ninguna solicitud genera caja.
begin;
create schema if not exists ts_migration_backup;
revoke all on schema ts_migration_backup from public,anon,authenticated;
create table if not exists ts_migration_backup.think_care_requests_pre_integral_20261024 as table public.think_care_requests;
alter table ts_migration_backup.think_care_requests_pre_integral_20261024 enable row level security;
revoke all on ts_migration_backup.think_care_requests_pre_integral_20261024 from public,anon,authenticated;
alter table public.think_care_requests
 add column if not exists request_type text not null default 'think_care',
 add column if not exists assigned_user_id uuid,
 add column if not exists assigned_email text,
 add column if not exists internal_note text,
 add column if not exists updated_at timestamptz not null default now(),
 add column if not exists revision integer not null default 0,
 add column if not exists quote_amount numeric(12,2),
 add column if not exists quote_details text,
 add column if not exists scheduled_at timestamptz,
 add column if not exists approval_evidence text,
 add column if not exists customer_approved_at timestamptz,
 add column if not exists linked_order_id text,
 add column if not exists linked_order_code text,
 add column if not exists conversion_started_at timestamptz,
 add column if not exists conversion_payload jsonb,
 add column if not exists intake_key uuid;
create unique index if not exists ts_request_intake_unique on public.think_care_requests(intake_key) where intake_key is not null;
create index if not exists ts_requests_status_date on public.think_care_requests(status,created_at desc);
create table if not exists public.thinkstore_request_events (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.think_care_requests(id) on delete restrict,
 actor_id uuid, actor_email text, action text not null, old_status text, new_status text, note text, created_at timestamptz not null default now()
);
alter table public.thinkstore_request_events add column if not exists actor_email text;
create index if not exists ts_requests_events_date on public.thinkstore_request_events(request_id,created_at desc);
alter table public.thinkstore_request_events enable row level security;
revoke all on public.thinkstore_request_events from anon,authenticated;

create or replace function public.ts_manage_request(p_id uuid,p_revision integer,p_actor uuid,p_email text,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.think_care_requests; old_status text; next_status text; payload jsonb;
begin
 select * into r from public.think_care_requests where id=p_id for update;
 if not found then raise exception 'Solicitud no encontrada'; end if;
 old_status:=r.status;
 -- Reintentar una conversión devuelve el mismo contenido congelado, nunca crea otra orden.
 if p_action='prepare_conversion' and (r.conversion_started_at is not null or r.linked_order_id is not null) then return to_jsonb(r); end if;
 if p_action='finish_conversion' then
  if r.conversion_started_at is null then raise exception 'Conversión no autorizada'; end if;
  if r.linked_order_id is not null and r.linked_order_id<>p_data->>'order_id' then raise exception 'La solicitud ya tiene otra orden'; end if;
  if nullif(p_data->>'order_id','') is null then raise exception 'Falta orden de soporte'; end if;
  if r.linked_order_id is not null then return to_jsonb(r); end if;
  update public.think_care_requests set linked_order_id=p_data->>'order_id',linked_order_code=p_data->>'order_code',revision=revision+1,updated_at=now() where id=p_id returning * into r;
 elsif p_action in ('update','approve','prepare_conversion') then
  if r.revision<>p_revision then raise exception 'La solicitud cambió. Actualiza antes de guardar'; end if;
  if r.conversion_started_at is not null or r.linked_order_id is not null then raise exception 'Solicitud convertida o en conversión. Gestiona la orden de Soporte'; end if;
  if r.status in ('cancelled','completed') then raise exception 'Solicitud cerrada. Debe revisarla administración'; end if;
  if p_action='approve' then
   if length(trim(coalesce(p_data->>'evidence','')))<8 then raise exception 'Registra la autorización verificable del cliente'; end if;
   update public.think_care_requests set approval_evidence=left(p_data->>'evidence',1200),customer_approved_at=now(),revision=revision+1,updated_at=now() where id=p_id returning * into r;
  elsif p_action='prepare_conversion' then
   if r.request_type not in ('support','appointment','think_care','technical_visit','business') then raise exception 'Las ventas se formalizan desde App Ventas, no desde Soporte'; end if;
   if r.customer_approved_at is null then raise exception 'Falta autorización del cliente'; end if;
   if length(trim(coalesce(p_data->>'confirmation','')))<8 then raise exception 'Confirma el inicio real del servicio o recepción'; end if;
   payload:=jsonb_build_object('request_id',r.id,'client_name',r.name,'client_phone',r.phone,'client_email',r.email,'device_model',r.device,'reported_issue',r.problem,'assigned_technician_email',r.assigned_email,'quote_amount',r.quote_amount,'quote_details',r.quote_details,'approval_evidence',r.approval_evidence,'customer_approved_at',r.customer_approved_at,'request_type',r.request_type,'service',r.service,'location',r.location,'confirmation',left(p_data->>'confirmation',1200),'created_by_email',p_email);
   update public.think_care_requests set conversion_started_at=now(),conversion_payload=payload,revision=revision+1,updated_at=now() where id=p_id returning * into r;
  else
   next_status:=coalesce(p_data->>'status',r.status);
   if next_status not in ('new','contacted','quoted','scheduled','completed','cancelled') then raise exception 'Estado inválido'; end if;
   if next_status='completed' and r.request_type not in ('sale','general') then raise exception 'Finaliza el servicio desde su orden de Soporte'; end if;
   if next_status='scheduled' and (nullif(p_data->>'scheduled_at','') is null or length(trim(coalesce(p_data->>'confirmation','')))<8) then raise exception 'Indica fecha, hora y confirmación del cliente'; end if;
   if nullif(p_data->>'quote_amount','') is not null and ((p_data->>'quote_amount')::numeric<0 or (p_data->>'quote_amount')::numeric>1000000) then raise exception 'Cotización inválida'; end if;
   update public.think_care_requests set status=next_status,internal_note=left(coalesce(p_data->>'note',internal_note),1200),assigned_email=case when p_data?'assigned_email' then nullif(lower(p_data->>'assigned_email'),'') else assigned_email end,
    quote_amount=case when p_data?'quote_amount' then nullif(p_data->>'quote_amount','')::numeric else quote_amount end,
    quote_details=case when p_data?'quote_details' then left(p_data->>'quote_details',1500) else quote_details end,
    scheduled_at=case when next_status='scheduled' then (p_data->>'scheduled_at')::timestamptz else scheduled_at end,
    customer_approved_at=null,approval_evidence=null,revision=revision+1,updated_at=now() where id=p_id returning * into r;
  end if;
 else raise exception 'Acción desconocida'; end if;
 insert into public.thinkstore_request_events(request_id,actor_id,actor_email,action,old_status,new_status,note)
 values(p_id,p_actor,p_email,p_action,old_status,r.status,left(coalesce(p_data->>'evidence',p_data->>'confirmation',p_data->>'note',''),1200));
 return to_jsonb(r);
end $$;
revoke all on function public.ts_manage_request(uuid,integer,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.ts_manage_request(uuid,integer,uuid,text,text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
