-- Ejecutar en Supabase PRINCIPAL antes de publicar la ficha V15.44.5.
-- No crea órdenes activas, cobros, garantías ni cuentas de acceso.
begin;
create table if not exists public.ts_customer_repair_history (
 id uuid primary key,customer_id uuid not null references public.ts_imported_customers(id),
 record_id text not null unique,device text not null,status text,order_code text,
 received_at date,received_raw text,source text not null default 'filemaker',
 created_at timestamptz not null default now()
);
create index if not exists ts_customer_repair_history_customer_date on public.ts_customer_repair_history(customer_id,received_at desc);
alter table public.ts_customer_repair_history enable row level security;
revoke all on public.ts_customer_repair_history from public,anon,authenticated;
grant select,insert,update on public.ts_customer_repair_history to service_role;
create table if not exists public.ts_customer_origins (
 customer_id uuid primary key,origin text not null check(origin in ('website','panel','web_appointment','unknown')),
 evidence text not null,recorded_by uuid,recorded_at timestamptz not null default now()
);
alter table public.ts_customer_origins enable row level security;
revoke all on public.ts_customer_origins from public,anon,authenticated;
grant select,insert,update on public.ts_customer_origins to service_role;
commit;
