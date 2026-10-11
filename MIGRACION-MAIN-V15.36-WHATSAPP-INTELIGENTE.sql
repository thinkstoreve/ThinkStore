-- ThinkStore Main V15.36 · WhatsApp inteligente
-- Ejecutar en Supabase PRINCIPAL. Aditiva: no borra datos existentes.
begin;
create extension if not exists pgcrypto;
create table if not exists public.whatsapp_contacts (
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
create table if not exists public.whatsapp_message_log (
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
create index if not exists whatsapp_message_log_phone_idx on public.whatsapp_message_log(phone_e164,created_at desc);
create index if not exists whatsapp_message_log_entity_idx on public.whatsapp_message_log(entity_type,entity_id,created_at desc);
create table if not exists public.whatsapp_reminder_state (
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
alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_message_log enable row level security;
alter table public.whatsapp_reminder_state enable row level security;
revoke all on public.whatsapp_contacts from anon,authenticated;
revoke all on public.whatsapp_message_log from anon,authenticated;
revoke all on public.whatsapp_reminder_state from anon,authenticated;
notify pgrst,'reload schema';
commit;
select to_regclass('public.whatsapp_contacts') is not null as whatsapp_contacts_ok,
       to_regclass('public.whatsapp_message_log') is not null as whatsapp_message_log_ok,
       to_regclass('public.whatsapp_reminder_state') is not null as whatsapp_reminder_state_ok;
