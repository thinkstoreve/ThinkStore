-- ThinkStore V13.55 · Caja diaria + CRM + inventario + auditoría
-- Ejecutar una sola vez en el proyecto Supabase principal de ThinkStore.

create extension if not exists pgcrypto;

create table if not exists public.ts_cash_closures (
  id uuid primary key default gen_random_uuid(),
  business_date date not null,
  actor_email text,
  expected_cash_usd numeric(14,2) not null default 0,
  counted_cash_usd numeric(14,2) not null default 0,
  cash_difference_usd numeric(14,2) not null default 0,
  zelle_usd numeric(14,2) not null default 0,
  pago_movil_usd numeric(14,2) not null default 0,
  pago_movil_ves numeric(18,2) not null default 0,
  pos_usd numeric(14,2) not null default 0,
  pos_ves numeric(18,2) not null default 0,
  total_confirmed_usd numeric(14,2) not null default 0,
  pending_usd numeric(14,2) not null default 0,
  confirmed_count integer not null default 0,
  pending_count integer not null default 0,
  cancelled_count integer not null default 0,
  note text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ts_cash_closures_date_idx on public.ts_cash_closures(business_date desc,created_at desc);

create table if not exists public.ts_customer_crm (
  email text primary key,
  tags text[] not null default '{}'::text[],
  internal_note text,
  updated_by text,
  updated_at timestamptz not null default now()
);
create index if not exists ts_customer_crm_tags_idx on public.ts_customer_crm using gin(tags);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid,
  pedido_id uuid,
  movement_type text not null,
  quantity integer not null default 0,
  note text,
  actor_user_id uuid,
  actor_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_variant_idx on public.inventory_movements(variant_id,created_at desc);
create index if not exists inventory_movements_pedido_idx on public.inventory_movements(pedido_id,created_at desc);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log(created_at desc);
create index if not exists admin_audit_log_entity_idx on public.admin_audit_log(entity_type,entity_id,created_at desc);

alter table public.ts_cash_closures enable row level security;
alter table public.ts_customer_crm enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.admin_audit_log enable row level security;

revoke all on public.ts_cash_closures from anon,authenticated;
revoke all on public.ts_customer_crm from anon,authenticated;
revoke all on public.inventory_movements from anon,authenticated;
revoke all on public.admin_audit_log from anon,authenticated;

notify pgrst, 'reload schema';
