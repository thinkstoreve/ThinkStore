-- Supabase Principal. Ejecutar después de revisar el cambio.
-- Añade cuentas físicas en cero; no distribuye ni modifica saldos existentes.
begin;
alter table public.enterprise_petty_cash_bank_accounts
  drop constraint enterprise_petty_bank_type_check;
alter table public.enterprise_petty_cash_bank_accounts
  add constraint enterprise_petty_bank_type_check
  check (account_type in ('bank','wallet','payment_network','cash'));

insert into public.enterprise_petty_cash_bank_accounts
  (code,institution_name,display_name,currency,account_type,sort_order)
values
  ('cash_usd','Efectivo USD','Efectivo USD','USD','cash',5),
  ('cash_ves','Efectivo Bs','Efectivo Bs','VES','cash',105)
on conflict (code) do nothing;
commit;
