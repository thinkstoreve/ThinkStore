ThinkStore Enterprise V10.8 · Inventory + Finanzas conectadas

Base acumulativa: Enterprise V10.7 + V10.6 SSO online.

Conexiones nuevas:
- Lee costos de compra reales desde ThinkStore Inventory Central.
- Calcula COGS por cada venta usando snapshot histórico de pedido_items.
- Fallback de costo por variant_id/SKU contra Inventory cuando una venta histórica no tiene snapshot.
- Calcula valor actual del inventario a costo.
- Lee compras, pagos parciales y saldos pendientes con proveedores.
- Distingue compras de inventario (activo/caja) de gastos operativos (P&L).
- Aportes de Freddy/Nelson usados para pagar compras quedan como deuda de la empresa al socio.
- Servicio Técnico: costo de repuestos consumidos se obtiene de service_part_movements × service_parts.unit_cost.
- Comisión técnica usa repuestos reales por orden como base automática.
- Auditoría semanal: ingresos - COGS - repuestos - costos directos - gastos operativos - comisión técnica.
- Reparto posterior: 50% empresa / 25% Freddy / 25% Nelson.
- Cuentas por cobrar, cuentas por pagar, caja y utilidad quedan separadas.

No desplegar sin ejecutar las migraciones indicadas cuando se decida publicar.
