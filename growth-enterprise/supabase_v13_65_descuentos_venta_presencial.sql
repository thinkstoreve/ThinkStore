-- ThinkStore V13.65 · Descuentos en venta presencial
alter table public.pedidos
  add column if not exists subtotal_usd numeric(12,2),
  add column if not exists discount_type text,
  add column if not exists discount_value numeric(12,2),
  add column if not exists discount_usd numeric(12,2),
  add column if not exists discount_reason text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='pedidos_discount_type_check') then
    alter table public.pedidos add constraint pedidos_discount_type_check
      check (discount_type is null or discount_type in ('usd','percent'));
  end if;
  if not exists (select 1 from pg_constraint where conname='pedidos_discount_usd_check') then
    alter table public.pedidos add constraint pedidos_discount_usd_check
      check (discount_usd is null or discount_usd >= 0);
  end if;
end $$;

notify pgrst, 'reload schema';
