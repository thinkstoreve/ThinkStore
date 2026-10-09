-- ThinkStore Enterprise V10.21 · Caja Chica por cuentas
-- Supabase PRINCIPAL.
-- ADITIVA: no borra, reinicia ni modifica los saldos/movimientos existentes de Caja Chica.
-- Los valores actuales permanecen en el total general y aparecerán como "Saldo sin asignar"
-- hasta que se distribuyan entre las cuentas creadas aquí.

begin;

create extension if not exists pgcrypto;

create table if not exists public.enterprise_petty_cash_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  institution_name text not null,
  display_name text not null,
  currency text not null,
  account_type text not null default 'bank',
  domain text,
  alias text,
  account_last4 text,
  opening_balance numeric(18,2) not null default 0,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enterprise_petty_bank_currency_check check (currency in ('USD','VES')),
  constraint enterprise_petty_bank_type_check check (account_type in ('bank','wallet','payment_network')),
  constraint enterprise_petty_bank_opening_check check (opening_balance >= 0),
  constraint enterprise_petty_bank_last4_check check (account_last4 is null or account_last4 ~ '^[0-9]{1,4}$')
);

create table if not exists public.enterprise_petty_cash_bank_movements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.enterprise_petty_cash_bank_accounts(id) on delete restrict,
  counterparty_account_id uuid references public.enterprise_petty_cash_bank_accounts(id) on delete set null,
  movement_type text not null default 'petty',
  direction text not null,
  currency text not null,
  amount numeric(18,2) not null,
  related_petty_movement_id text,
  transfer_group text,
  description text,
  reference text,
  status text not null default 'posted',
  void_reason text,
  created_by_email text,
  created_by_name text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enterprise_petty_bank_move_direction_check check (direction in ('in','out')),
  constraint enterprise_petty_bank_move_currency_check check (currency in ('USD','VES')),
  constraint enterprise_petty_bank_move_amount_check check (amount > 0),
  constraint enterprise_petty_bank_move_status_check check (status in ('posted','void'))
);

create index if not exists enterprise_petty_bank_accounts_currency_idx
  on public.enterprise_petty_cash_bank_accounts(currency,active,sort_order);
create index if not exists enterprise_petty_bank_movements_account_idx
  on public.enterprise_petty_cash_bank_movements(account_id,occurred_at desc);
create index if not exists enterprise_petty_bank_movements_related_idx
  on public.enterprise_petty_cash_bank_movements(related_petty_movement_id)
  where related_petty_movement_id is not null;
create index if not exists enterprise_petty_bank_movements_transfer_idx
  on public.enterprise_petty_cash_bank_movements(transfer_group)
  where transfer_group is not null;

-- Cuentas USD solicitadas.
insert into public.enterprise_petty_cash_bank_accounts
(code,institution_name,display_name,currency,account_type,domain,sort_order)
values
('boa','Bank of America','Bank of America','USD','bank','bankofamerica.com',10),
('chase','Chase','Chase','USD','bank','chase.com',20),
('pichincha','Banco Pichincha','Banco Pichincha','USD','bank','pichincha.com',30),
('binance','Binance','Binance','USD','wallet','binance.com',40),
('zelle','Zelle','Zelle','USD','payment_network','zellepay.com',50),
('banesco','Banesco','Banesco','VES','bank','banesco.com',110),
('bnc','Banco Nacional de Crédito','BNC','VES','bank','bnc.com.ve',120),
('bdv','Banco de Venezuela','Banco de Venezuela','VES','bank','bancodevenezuela.com',130),
('bancamiga','Bancamiga','Bancamiga','VES','bank','bancamiga.com',140),
('bvc','Banco Venezolano de Crédito','Venezolano de Crédito','VES','bank','venezolano.com',150)
on conflict (code) do update set
  institution_name=excluded.institution_name,
  display_name=excluded.display_name,
  currency=excluded.currency,
  account_type=excluded.account_type,
  domain=excluded.domain,
  sort_order=excluded.sort_order,
  updated_at=now();

-- Las escrituras pasan únicamente por la Function Enterprise usando service_role.
alter table public.enterprise_petty_cash_bank_accounts enable row level security;
alter table public.enterprise_petty_cash_bank_movements enable row level security;
revoke insert,update,delete on public.enterprise_petty_cash_bank_accounts from anon,authenticated;
revoke insert,update,delete on public.enterprise_petty_cash_bank_movements from anon,authenticated;

-- Lectura opcional para administradores autenticados. Enterprise normalmente lee vía Function.
drop policy if exists "Enterprise admins read petty bank accounts" on public.enterprise_petty_cash_bank_accounts;
create policy "Enterprise admins read petty bank accounts" on public.enterprise_petty_cash_bank_accounts
for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and coalesce(p.active,true)=true and p.role in ('super_admin','admin','gerente'))
  or exists(select 1 from public.roles_usuarios r where (r.id=auth.uid() or lower(r.email)=lower(coalesce(auth.jwt()->>'email',''))) and coalesce(r.activo,true)=true and r.rol in ('super_admin','admin','gerente'))
);

drop policy if exists "Enterprise admins read petty bank movements" on public.enterprise_petty_cash_bank_movements;
create policy "Enterprise admins read petty bank movements" on public.enterprise_petty_cash_bank_movements
for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and coalesce(p.active,true)=true and p.role in ('super_admin','admin','gerente'))
  or exists(select 1 from public.roles_usuarios r where (r.id=auth.uid() or lower(r.email)=lower(coalesce(auth.jwt()->>'email',''))) and coalesce(r.activo,true)=true and r.rol in ('super_admin','admin','gerente'))
);

grant select on public.enterprise_petty_cash_bank_accounts to authenticated;
grant select on public.enterprise_petty_cash_bank_movements to authenticated;

notify pgrst, 'reload schema';
commit;

-- Verificación rápida: debe devolver 10 cuentas y no toca saldos previos.
select currency,count(*) as cuentas
from public.enterprise_petty_cash_bank_accounts
where active=true
group by currency
order by currency;
