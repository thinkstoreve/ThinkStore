# ThinkStore Main V14.74

## Snapshot de costo por venta

- Tienda online envía `inventory_variant_id` y `sku` en cada línea de pedido.
- App Ventas/POS conserva la misma referencia de Inventory.
- El trigger del Supabase principal congela `unit_cost_usd` y `cost_total_usd` al crear la línea.
- Enterprise usa ese snapshot para margen bruto y auditoría semanal, aunque el costo del producto cambie después.
- Ventas históricas sin snapshot intentan backfill mediante variant_id, SKU o coincidencia de producto.
