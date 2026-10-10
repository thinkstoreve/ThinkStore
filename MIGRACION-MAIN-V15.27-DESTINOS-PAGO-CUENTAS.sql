-- ThinkStore Main V15.27 · Destinos bancarios de cobros + conciliación automática con Caja Chica
-- Ejecutar UNA VEZ en el Supabase PRINCIPAL de ThinkStore.
-- ADITIVA: no borra pedidos, pagos, saldos ni movimientos existentes.

begin;

alter table public.pedidos
  add column if not exists payment_destination_code text,
  add column if not exists payment_destination_name text;

-- El desglose de pagos mixtos ya existe desde V14.79. Agregamos el destino por tramo
-- únicamente cuando la tabla está disponible, para mantener la migración idempotente.
do $$
begin
  if to_regclass('public.ts_order_payments') is not null then
    alter table public.ts_order_payments
      add column if not exists destination_code text,
      add column if not exists destination_name text;
  end if;
end $$;

-- Caja Chica por cuentas debe existir desde Enterprise V10.21.
-- No recreamos ni tocamos saldos; solo protegemos la referencia externa usada para
-- evitar que un mismo cobro aprobado se contabilice dos veces.
do $$
begin
  if to_regclass('public.enterprise_petty_cash_bank_movements') is not null then
    if not exists (
      select 1 from pg_indexes
      where schemaname='public'
        and indexname='enterprise_petty_bank_operational_source_uidx'
    ) then
      execute $idx$
        create unique index enterprise_petty_bank_operational_source_uidx
        on public.enterprise_petty_cash_bank_movements(related_petty_movement_id)
        where related_petty_movement_id is not null
          and (related_petty_movement_id like 'sale:%' or related_petty_movement_id like 'service:%')
          and status <> 'void'
      $idx$;
    end if;
  end if;
end $$;

-- Normaliza nombres de las cuentas ya creadas sin cambiar balances ni movimientos.
do $$
begin
  if to_regclass('public.enterprise_petty_cash_bank_accounts') is not null then
    update public.enterprise_petty_cash_bank_accounts
      set institution_name='Banco Pichincha', display_name='Banco Pichincha · Ecuador', updated_at=now()
      where code='pichincha';
    update public.enterprise_petty_cash_bank_accounts
      set institution_name='Banco Venezolano de Crédito', display_name='Venezolano de Crédito', updated_at=now()
      where code='bvc';
  end if;
end $$;

notify pgrst, 'reload schema';
commit;

-- Verificación: los primeros dos valores deben ser TRUE. Las tablas de Caja Chica
-- también deben aparecer si ya ejecutaste Enterprise V10.21.
select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='pedidos' and column_name='payment_destination_code') as pedido_destination_code_ok,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='pedidos' and column_name='payment_destination_name') as pedido_destination_name_ok,
  to_regclass('public.ts_order_payments') as pagos_mixtos,
  to_regclass('public.enterprise_petty_cash_bank_accounts') as cuentas_caja_chica,
  to_regclass('public.enterprise_petty_cash_bank_movements') as movimientos_caja_chica;
