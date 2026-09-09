-- ThinkStore V13.59 · Editor de productos
-- Extiende la ficha Pre-Owned sin tocar SKU, IDs ni relaciones.

alter table public.inventory_variants
  add column if not exists battery_health_pct integer,
  add column if not exists cosmetic_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='inventory_variants_battery_health_check'
  ) then
    alter table public.inventory_variants
      add constraint inventory_variants_battery_health_check
      check (battery_health_pct is null or (battery_health_pct between 0 and 100));
  end if;
end $$;

notify pgrst, 'reload schema';
