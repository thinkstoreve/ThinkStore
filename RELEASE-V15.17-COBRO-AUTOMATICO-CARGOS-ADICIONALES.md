# ThinkStore Main V15.17 · Cobro automático + cargos adicionales

## App Ventas · Reparaciones
- Cuando la orden no tiene cotización manual, el total se calcula automáticamente desde los repuestos preparados/consumidos.
- Ejemplo: Back Cover iPhone 11 a $40 → Total a cobrar $40, sin escribir el importe manualmente.
- El saldo pendiente usa el total calculado y respeta abonos anteriores.

## Cargos adicionales
Nueva sección **Cargos adicionales** dentro del cobro de la reparación:
- Mano de obra.
- Servicios técnicos definidos en Inventory / `service_parts`.
- Productos del inventario principal: cases, cargadores, vidrios, accesorios, etc.
- Buscador único desde App Ventas.
- Usa el precio fijado en Inventory; si no hay precio configurado, no permite añadirlo.

## Inventario
- Los productos físicos del Inventory principal se reservan al añadirlos a la reparación.
- Al quitarlos antes del cobro, la reserva se libera.
- Solo se descuentan del stock físico cuando la reparación queda completamente Pagada.
- Se registra movimiento `service_sale` en `inventory_movements`.
- Mano de obra/servicios no consumen stock físico.

## Facturación
- `quote_amount` se sincroniza con el total real al registrar el primer pago.
- Los cargos añadidos después de un abono incrementan el total una sola vez en el siguiente cobro.
- Los cargos ya incluidos en un pago no se pueden eliminar silenciosamente.
- Nota de Entrega incluye repuestos + servicios/productos adicionales.

## SQL requeridos antes del deploy
1. Supabase de Soporte:
   - `MIGRACION-SOPORTE-V8.8.14-CARGOS-ADICIONALES-VENTAS.sql`
2. Supabase principal:
   - `MIGRACION-MAIN-V15.17-RESERVA-PRODUCTOS-SERVICIO.sql`

## Caché
- Staff assets: 15.17.0.
- Service Worker: `thinkstore-staff-v15-17-0`.
