# ThinkStore Main V15.22 · Inventario técnico solo lectura

Base: V15.21.

## Soporte / Técnico
- Rediseño de **Inventario de repuestos** para rol `technician`.
- Vista por grupos y tarjetas; deja de ser una lista operativa.
- Búsqueda por repuesto, SKU, modelo y color.
- Filtros por categoría y estado de stock.
- Muestra modelo, color/variante, calidad, ubicación, stock físico, mínimo y precio instalado.
- No muestra costo interno de compra al técnico.
- No muestra acciones de entrada, salida, ajuste, edición o alta de repuestos.
- Guardas adicionales en frontend para impedir abrir/ejecutar movimientos o edición con rol técnico.
- El flujo **Agregar repuesto** dentro de una orden asignada se conserva: prepara/reserva la pieza, pero no permite manipular el inventario maestro.

## Seguridad de datos
Usar `MIGRACION-SOPORTE-V8.8.17-INVENTARIO-TECNICO-SOLO-LECTURA.sql` para bloquear en la base cualquier INSERT/UPDATE/DELETE del rol technician sobre `service_parts` y `service_part_movements`, incluso si se intenta llamar un RPC de ajuste manual.

## Cache
- Soporte assets: 15.22.0
- SW: thinkstore-support-v8-8-7-r1522
