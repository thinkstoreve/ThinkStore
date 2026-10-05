-- ThinkStore Enterprise V10.7 · Finanzas Centrales
-- Ejecutar en el proyecto Supabase PRINCIPAL de ThinkStore.
-- No elimina ni modifica tablas operativas existentes.

begin;

create extension if not exists pgcrypto;

create table if not exists public.enterprise_finance_settings (
  id text primary key default 'default',
  company_share_pct numeric(6,3) not null default 50,
  freddy_share_pct numeric(6,3) not null default 25,
  nelson_share_pct numeric(6,3) not null default 25,
  technician_default_pct numeric(6,3) not null default 50,
  timezone text not null default 'America/Caracas',
  updated_at timestamptz not null default now(),
  constraint enterprise_finance_settings_split_check
    check (company_share_pct >= 0 and freddy_share_pct >= 0 and nelson_share_pct >= 0
      and abs((company_share_pct + freddy_share_pct + nelson_share_pct) - 100) < 0.001),
  constraint enterprise_finance_settings_tech_check
    check (technician_default_pct >= 0 and technician_default_pct <= 100)
);

insert into public.enterprise_finance_settings(id,company_share_pct,freddy_share_pct,nelson_share_pct,technician_default_pct)
values ('default',50,25,25,50)
on conflict (id) do nothing;

create table if not exists public.enterprise_finance_entries (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  entry_type text not null,
  category text,
  description text not null,
  amount_usd numeric(14,2) not null default 0,
  original_amount numeric(14,2),
  currency text not null default 'USD',
  exchange_rate numeric(18,6),
  payment_method text,
  reference text,
  counterparty text,
  partner_key text,
  funded_by text not null default 'company',
  source_system text not null default 'manual',
  source_id text,
  source_code text,
  related_entry_id uuid references public.enterprise_finance_entries(id) on delete set null,
  status text not null default 'posted',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_email text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enterprise_finance_entries_type_check check (entry_type in (
    'expense','purchase','refund','fee','warranty_cost','other_income',
    'receivable','receivable_collection','partner_advance','partner_repayment',
    'technician_commission','technician_payment','cash_adjustment'
  )),
  constraint enterprise_finance_entries_status_check check (status in ('pending','partial','paid','posted','void')),
  constraint enterprise_finance_entries_partner_check check (partner_key is null or partner_key in ('freddy','nelson')),
  constraint enterprise_finance_entries_funded_check check (funded_by in ('company','freddy','nelson')),
  constraint enterprise_finance_entries_amount_check check (amount_usd >= 0),
  constraint enterprise_finance_entries_currency_check check (char_length(currency) between 2 and 10)
);

create index if not exists enterprise_finance_entries_occurred_idx on public.enterprise_finance_entries(occurred_at desc);
create index if not exists enterprise_finance_entries_type_idx on public.enterprise_finance_entries(entry_type);
create index if not exists enterprise_finance_entries_partner_idx on public.enterprise_finance_entries(partner_key) where partner_key is not null;
create index if not exists enterprise_finance_entries_funded_idx on public.enterprise_finance_entries(funded_by);
create index if not exists enterprise_finance_entries_source_idx on public.enterprise_finance_entries(source_system,source_id);
create index if not exists enterprise_finance_entries_related_idx on public.enterprise_finance_entries(related_entry_id) where related_entry_id is not null;

create table if not exists public.enterprise_weekly_audits (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  status text not null default 'draft',
  gross_collected numeric(14,2) not null default 0,
  total_outflows numeric(14,2) not null default 0,
  distributable_profit numeric(14,2) not null default 0,
  company_share numeric(14,2) not null default 0,
  freddy_share numeric(14,2) not null default 0,
  nelson_share numeric(14,2) not null default 0,
  snapshot jsonb not null default '{}'::jsonb,
  notes text,
  created_by_email text,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint enterprise_weekly_audits_status_check check (status in ('draft','review','closed')),
  constraint enterprise_weekly_audits_period_check check (week_end >= week_start),
  unique(week_start,week_end)
);

create index if not exists enterprise_weekly_audits_week_idx on public.enterprise_weekly_audits(week_start desc);

-- Ledger financiero: lectura únicamente para administradores internos.
alter table public.enterprise_finance_entries enable row level security;
alter table public.enterprise_weekly_audits enable row level security;
alter table public.enterprise_finance_settings enable row level security;

drop policy if exists "Enterprise admins read finance entries" on public.enterprise_finance_entries;
create policy "Enterprise admins read finance entries" on public.enterprise_finance_entries
for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and coalesce(p.active,true)=true and p.role in ('super_admin','admin','gerente'))
  or exists(select 1 from public.roles_usuarios r where (r.id=auth.uid() or lower(r.email)=lower(coalesce(auth.jwt()->>'email',''))) and coalesce(r.activo,true)=true and r.rol in ('super_admin','admin','gerente'))
);

drop policy if exists "Enterprise admins read weekly audits" on public.enterprise_weekly_audits;
create policy "Enterprise admins read weekly audits" on public.enterprise_weekly_audits
for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and coalesce(p.active,true)=true and p.role in ('super_admin','admin','gerente'))
  or exists(select 1 from public.roles_usuarios r where (r.id=auth.uid() or lower(r.email)=lower(coalesce(auth.jwt()->>'email',''))) and coalesce(r.activo,true)=true and r.rol in ('super_admin','admin','gerente'))
);

drop policy if exists "Enterprise admins read finance settings" on public.enterprise_finance_settings;
create policy "Enterprise admins read finance settings" on public.enterprise_finance_settings
for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and coalesce(p.active,true)=true and p.role in ('super_admin','admin','gerente'))
  or exists(select 1 from public.roles_usuarios r where (r.id=auth.uid() or lower(r.email)=lower(coalesce(auth.jwt()->>'email',''))) and coalesce(r.activo,true)=true and r.rol in ('super_admin','admin','gerente'))
);

-- Las escrituras quedan centralizadas en la Function Enterprise con service_role.
-- Esto evita que una sesión del navegador pueda insertar o alterar movimientos directamente.

create or replace function public.enterprise_finance_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists enterprise_finance_entries_touch on public.enterprise_finance_entries;
create trigger enterprise_finance_entries_touch before update on public.enterprise_finance_entries
for each row execute function public.enterprise_finance_touch_updated_at();

drop trigger if exists enterprise_weekly_audits_touch on public.enterprise_weekly_audits;
create trigger enterprise_weekly_audits_touch before update on public.enterprise_weekly_audits
for each row execute function public.enterprise_finance_touch_updated_at();

notify pgrst, 'reload schema';
commit;
