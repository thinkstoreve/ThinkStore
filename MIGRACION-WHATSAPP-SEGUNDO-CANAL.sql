-- MAIN · Canal +1 independiente. Aditiva e idempotente; no copia ni modifica los chats del +58.
BEGIN;

create extension if not exists pgcrypto;
create table if not exists public.whatsapp_us_contacts (
 phone_e164 text primary key,
 customer_id text,
 name text,
 opt_in boolean not null default false,
 opt_in_source text,
 opt_in_at timestamptz,
 opt_out_at timestamptz,
 last_inbound_at timestamptz,
 last_outbound_at timestamptz,
 last_message_preview text,
 last_intent text,
 needs_human boolean not null default false,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.whatsapp_us_message_log (
 id uuid primary key default gen_random_uuid(),
 wa_message_id text unique,
 phone_e164 text,
 direction text not null,
 message_type text,
 template_name text,
 status text,
 source text,
 entity_type text,
 entity_id text,
 body_preview text,
 payload jsonb not null default '{}'::jsonb,
 status_payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists whatsapp_us_message_log_phone_idx on public.whatsapp_us_message_log(phone_e164,created_at desc);
create index if not exists whatsapp_us_message_log_entity_idx on public.whatsapp_us_message_log(entity_type,entity_id,created_at desc);
create table if not exists public.whatsapp_us_reminder_state (
 entity_type text not null,
 entity_id text not null,
 phone_e164 text not null,
 last_balance_usd numeric(12,2) not null default 0,
 last_sent_at timestamptz,
 sent_count integer not null default 0,
 last_message_id text,
 updated_at timestamptz not null default now(),
 primary key(entity_type,entity_id,phone_e164)
);
alter table public.whatsapp_us_contacts enable row level security;
alter table public.whatsapp_us_message_log enable row level security;
alter table public.whatsapp_us_reminder_state enable row level security;
revoke all on public.whatsapp_us_contacts from anon,authenticated;
revoke all on public.whatsapp_us_message_log from anon,authenticated;
revoke all on public.whatsapp_us_reminder_state from anon,authenticated;
notify pgrst,'reload schema';

create table if not exists public.whatsapp_us_staff_reads (
 user_id uuid not null,message_id uuid not null references public.whatsapp_us_message_log(id) on delete cascade,
 read_at timestamptz not null default now(),primary key(user_id,message_id)
);
alter table public.whatsapp_us_staff_reads enable row level security;
revoke all on public.whatsapp_us_staff_reads from public,anon,authenticated;
grant all on public.whatsapp_us_staff_reads to service_role;
create index if not exists whatsapp_us_inbound_alert_idx on public.whatsapp_us_message_log(phone_e164,created_at desc,id desc) where direction='inbound';
create or replace function public.ts_whatsapp_us_alerts(p_user uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if p_user is null then raise exception 'Sesión de usuario requerida';end if;
 with unread as (
 select m.phone_e164,count(*) as unread_count,(array_agg(m.id order by m.created_at desc,m.id desc))[1] as latest_id,max(m.created_at) as latest_at
 from public.whatsapp_us_message_log m where m.direction='inbound' and m.phone_e164 is not null and not exists(select 1 from public.whatsapp_us_staff_reads r where r.user_id=p_user and r.message_id=m.id) group by m.phone_e164
 ), top_rows as (select u.*,c.name from unread u left join public.whatsapp_us_contacts c using(phone_e164) order by latest_at desc,latest_id desc limit 100)
 select jsonb_build_object('total',coalesce((select sum(unread_count) from unread),0),'conversations',coalesce((select jsonb_agg(to_jsonb(t)) from top_rows t),'[]'::jsonb)) into result;
 return result;
end $$;
create or replace function public.ts_whatsapp_us_inbox(p_user uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_user is null then raise exception 'Sesión de usuario requerida';end if;
 return coalesce((select jsonb_agg(to_jsonb(t)) from (
 select c.*,l.body_preview as latest_preview,l.direction as latest_direction,l.created_at as latest_at,l.status as latest_status,
 (select count(*) from public.whatsapp_us_message_log m where m.phone_e164=c.phone_e164 and m.direction='inbound' and not exists(select 1 from public.whatsapp_us_staff_reads r where r.user_id=p_user and r.message_id=m.id)) as unread_count
 from public.whatsapp_us_contacts c left join lateral(select body_preview,direction,created_at,status from public.whatsapp_us_message_log m where m.phone_e164=c.phone_e164 order by created_at desc,id desc limit 1) l on true
 order by coalesce(l.created_at,c.last_inbound_at,c.created_at) desc,c.phone_e164 limit 200
 ) t),'[]'::jsonb);
end $$;
create or replace function public.ts_whatsapp_us_mark_read(p_user uuid,p_phone text,p_ids uuid[]) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
 if p_user is null or p_phone !~ '^[0-9]{8,15}$' or p_ids is null or cardinality(p_ids)>100 then raise exception 'Lectura inválida';end if;
 insert into public.whatsapp_us_staff_reads(user_id,message_id)
 select p_user,m.id from public.whatsapp_us_message_log m where m.id=any(p_ids) and m.phone_e164=p_phone and m.direction='inbound' on conflict do nothing;
 get diagnostics n=row_count;return n;
end $$;
revoke all on function public.ts_whatsapp_us_alerts(uuid),public.ts_whatsapp_us_inbox(uuid),public.ts_whatsapp_us_mark_read(uuid,text,uuid[]) from public,anon,authenticated;
grant execute on function public.ts_whatsapp_us_alerts(uuid),public.ts_whatsapp_us_inbox(uuid),public.ts_whatsapp_us_mark_read(uuid,text,uuid[]) to service_role;
notify pgrst,'reload schema';

CREATE TABLE IF NOT EXISTS public.whatsapp_us_notification_outbox (
  event_key text PRIMARY KEY,
  phone_e164 text NOT NULL,
  template_name text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  provider_message_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_us_outbox_entity_idx ON public.whatsapp_us_notification_outbox(entity_type,entity_id,created_at DESC);
ALTER TABLE public.whatsapp_us_notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_us_notification_outbox FROM anon, authenticated;
NOTIFY pgrst, 'reload schema';

GRANT ALL ON public.whatsapp_us_contacts,public.whatsapp_us_message_log,public.whatsapp_us_staff_reads,public.whatsapp_us_notification_outbox,public.whatsapp_us_reminder_state TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
