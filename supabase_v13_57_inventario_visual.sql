-- ThinkStore V13.57 · Inventario visual
-- No reemplaza SKU ni relaciones existentes.
-- Solo añade el estado estético opcional para equipos Pre-Owned.

alter table public.inventory_variants
  add column if not exists cosmetic_grade text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='inventory_variants_cosmetic_grade_check'
  ) then
    alter table public.inventory_variants
      add constraint inventory_variants_cosmetic_grade_check
      check (cosmetic_grade is null or cosmetic_grade in ('Excelente','Bueno','Bien'));
  end if;
end $$;

create index if not exists inventory_variants_cosmetic_grade_idx
  on public.inventory_variants(cosmetic_grade);

notify pgrst, 'reload schema';
