-- ThinkStore Soporte V8.8.16
-- Clasificación financiera interna de repuestos y servicios.
-- Ejecutar COMPLETO en el Supabase de SOPORTE.
-- El cliente continúa viendo un único precio publicado.

alter table public.service_parts
  add column if not exists financial_type text default 'part';

alter table public.service_order_sale_items
  add column if not exists financial_type text default 'service_hardware',
  add column if not exists unit_cost_usd numeric(12,2) default 0;

update public.service_parts
set financial_type = case
  when lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%software%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%office%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%adobe%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%ios%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%macos%'
    then 'service_software'
  when lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%servicio%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%mano de obra%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%mantenimiento%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%microsoldadura%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%diagnóstico%'
    or lower(coalesce(category,'') || ' ' || coalesce(name,'')) like '%diagnostico%'
    then 'service_hardware'
  else 'part'
end
where financial_type is null
   or financial_type not in ('part','service_hardware','service_software','product');

update public.service_order_sale_items
set financial_type = case
  when source='main_inventory' or item_type='product' then 'product'
  when lower(coalesce(name,'') || ' ' || coalesce(metadata->>'category','')) like '%software%'
    or lower(coalesce(name,'') || ' ' || coalesce(metadata->>'category','')) like '%office%'
    or lower(coalesce(name,'') || ' ' || coalesce(metadata->>'category','')) like '%adobe%'
    then 'service_software'
  else 'service_hardware'
end
where financial_type is null
   or financial_type not in ('part','service_hardware','service_software','product');

update public.service_order_sale_items
set unit_cost_usd = greatest(coalesce(unit_cost_usd,0),0);

notify pgrst, 'reload schema';

select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='service_parts' and column_name='financial_type') as service_parts_financial_type_ok,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='service_order_sale_items' and column_name='financial_type') as sale_items_financial_type_ok,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='service_order_sale_items' and column_name='unit_cost_usd') as sale_items_cost_ok;
