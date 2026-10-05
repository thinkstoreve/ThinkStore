-- ThinkStore Enterprise V10.9 · Conciliación de caja y métodos de pago
-- Ejecutar en el Supabase PRINCIPAL de ThinkStore.
-- Aditivo e idempotente: no elimina ventas, compras, gastos ni auditorías.

begin;

create extension if not exists pgcrypto;

create table if not exists public.enterprise_reconciliations (
  id uuid primary key default gen_random_uuid(),
  period_type text not null default 'weekly',
  period_start date not null,
  period_end date not null,
  status text not null default 'review',
  expected jsonb not null default '{}'::jsonb,
  actual jsonb not null default '{}'::jsonb,
  differences jsonb not null default '{}'::jsonb,
  total_expected numeric(14,2) not null default 0,
  total_actual numeric(14,2) not null default 0,
  total_difference numeric(14,2) not null default 0,
  notes text,
  created_by_email text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint enterprise_reconciliations_period_type_check check (period_type in ('daily','weekly','custom')),
  constraint enterprise_reconciliations_status_check check (status in ('draft','review','closed')),
  constraint enterprise_reconciliations_period_check check (period_end >= period_start),
  unique(period_type,period_start,period_end)
);

create index if not exists enterprise_reconciliations_period_idx
  on public.enterprise_reconciliations(period_start desc, period_end desc);

alter table public.enterprise_reconciliations enable row level security;

drop policy if exists "Enterprise admins read reconciliations" on public.enterprise_reconciliations;
create policy "Enterprise admins read reconciliations" on public.enterprise_reconciliations
for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and coalesce(p.active,true)=true and p.role in ('super_admin','admin','gerente'))
  or exists(select 1 from public.roles_usuarios r where (r.id=auth.uid() or lower(r.email)=lower(coalesce(auth.jwt()->>'email',''))) and coalesce(r.activo,true)=true and r.rol in ('super_admin','admin','gerente'))
);

-- Escritura solo desde la Function de Enterprise con service_role.
revoke insert,update,delete on public.enterprise_reconciliations from anon,authenticated;
grant select on public.enterprise_reconciliations to authenticated;

create or replace function public.enterprise_reconciliation_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists enterprise_reconciliations_touch on public.enterprise_reconciliations;
create trigger enterprise_reconciliations_touch before update on public.enterprise_reconciliations
for each row execute function public.enterprise_reconciliation_touch_updated_at();

notify pgrst,'reload schema';
commit;

select to_regclass('public.enterprise_reconciliations') as reconciliation_table;
