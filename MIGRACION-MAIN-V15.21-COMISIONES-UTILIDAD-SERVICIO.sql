-- ThinkStore Main V15.21
-- Modelo financiero: comisión por repuesto, servicio y vendedor.
-- Ejecutar COMPLETO en el Supabase PRINCIPAL.
-- Seguro para repetir.

alter table public.profiles
  add column if not exists technician_parts_commission_pct numeric(6,3),
  add column if not exists technician_service_commission_pct numeric(6,3),
  add column if not exists technician_hardware_commission_pct numeric(6,3),
  add column if not exists technician_software_commission_pct numeric(6,3),
  add column if not exists seller_commission_pct numeric(6,3);

alter table public.enterprise_finance_settings
  add column if not exists technician_parts_default_pct numeric(6,3),
  add column if not exists technician_service_default_pct numeric(6,3),
  add column if not exists technician_hardware_default_pct numeric(6,3),
  add column if not exists technician_software_default_pct numeric(6,3),
  add column if not exists seller_default_pct numeric(6,3);

create table if not exists public.enterprise_service_settlements (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  service_order_id text,
  technician_email text,
  technician_name text,
  salesperson_email text,
  subtotal_usd numeric(14,2) not null default 0,
  discount_usd numeric(14,2) not null default 0,
  collected_usd numeric(14,2) not null default 0,

  parts_revenue_usd numeric(14,2) not null default 0,
  parts_cost_usd numeric(14,2) not null default 0,
  parts_margin_usd numeric(14,2) not null default 0,
  parts_rate_pct numeric(6,3),
  parts_commission_usd numeric(14,2) not null default 0,

  hardware_service_revenue_usd numeric(14,2) not null default 0,
  software_service_revenue_usd numeric(14,2) not null default 0,
  service_direct_cost_usd numeric(14,2) not null default 0,
  hardware_rate_pct numeric(6,3),
  software_rate_pct numeric(6,3),
  service_commission_usd numeric(14,2) not null default 0,

  store_product_revenue_usd numeric(14,2) not null default 0,
  store_product_cost_usd numeric(14,2) not null default 0,
  seller_rate_pct numeric(6,3),
  seller_commission_usd numeric(14,2) not null default 0,

  inventory_recovery_usd numeric(14,2) not null default 0,
  total_commission_usd numeric(14,2) not null default 0,
  company_profit_usd numeric(14,2) not null default 0,

  metadata jsonb not null default '{}'::jsonb,
  settled_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists enterprise_service_settlements_technician_idx
  on public.enterprise_service_settlements(technician_email,settled_at desc);
create index if not exists enterprise_service_settlements_date_idx
  on public.enterprise_service_settlements(settled_at desc);

alter table public.enterprise_service_settlements enable row level security;

-- Nuevos tipos de comisión preparados para Enterprise.
alter table public.enterprise_finance_entries
  drop constraint if exists enterprise_finance_entries_type_check;

alter table public.enterprise_finance_entries
  add constraint enterprise_finance_entries_type_check check (
    entry_type in (
      'expense','purchase','refund','fee','warranty_cost','other_income',
      'receivable','receivable_collection','partner_advance','partner_repayment',
      'technician_commission','technician_payment',
      'seller_commission','seller_payment',
      'cash_adjustment'
    )
  );

notify pgrst, 'reload schema';

select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='technician_parts_commission_pct') as profile_parts_pct_ok,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='technician_service_commission_pct') as profile_service_pct_ok,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='seller_commission_pct') as profile_seller_pct_ok,
  to_regclass('public.enterprise_service_settlements') is not null as settlements_ok;
