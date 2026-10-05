-- ThinkStore Unified Inventory Bridge — rollback seguro
-- Detiene la sincronización bidireccional SIN borrar inventario ni pedidos.
begin;
drop trigger if exists trg_ts_bridge_inventory_product on public.thinkstore_inventory_products;
drop trigger if exists trg_ts_bridge_inventory_stock on public.thinkstore_inventory_stock;
drop trigger if exists trg_ts_bridge_inventory_unit on public.thinkstore_inventory_units;
drop trigger if exists trg_ts_bridge_store_variant on public.inventory_variants;
drop trigger if exists trg_ts_bridge_store_unit on public.inventory_units;
notify pgrst, 'reload schema';
commit;
