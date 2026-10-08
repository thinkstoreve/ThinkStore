# ThinkStore Main — V15.14 · Repuestos preparados hasta el pago

## Servicio Técnico · Gestionar orden

### Flujo correcto de inventario
- El botón **Descontar del inventario** se reemplazó por **Agregar repuesto**.
- Al agregar un repuesto a una reparación, el sistema usa `ts_save_service_order_parts` y lo deja en estado **reserved / Preparado**.
- Preparar un repuesto **NO descuenta el stock físico**.
- El stock se consume únicamente cuando App Ventas completa el pago, mediante el cierre atómico existente `ts_service_record_payment_atomic` → `ts_consume_reserved_service_parts`.
- Las reservas de otras órdenes se descuentan del stock disponible mostrado para evitar prometer la misma unidad dos veces.

### Rechazo / cancelación
- Si el cliente no aprueba la cotización desde el seguimiento, los repuestos preparados se liberan automáticamente.
- Si Soporte cambia la orden a **No aprobado** o **Cancelado**, también se liberan.
- Si se marca manualmente la cotización como **Rechazado**, se liberan.
- El técnico puede quitar uno o todos los repuestos preparados y guardar los cambios antes del pago.

### Interfaz
- Los repuestos preparados aparecen con fondo/sombra amarilla y etiqueta **Preparado**.
- Los repuestos consumidos al pagar aparecen en verde como **Consumido**.
- Cada repuesto muestra:
  - miniatura cuando existe `catalog_details.image_url` / `image_url`,
  - nombre y SKU,
  - disponibilidad real,
  - precio de venta fijado,
  - cantidad,
  - subtotal a cobrar.
- Se muestra **Total repuestos a cobrar**.
- Al reabrir Gestionar, los repuestos preparados se cargan automáticamente en la selección.

### Compatibilidad con App Ventas
- Al reservar se guarda `sale_price_snapshot`, por lo que App Ventas recibe el precio fijado del repuesto para esa reparación.
- El pago final consume los repuestos reservados y los marca como `consumed`.

## Caché
- Soporte actualizado a `15.14.0` / service worker `r1514`.

## SQL
- No requiere SQL nuevo si ya se aplicó el paquete V8.8.8 de pago/inventario (`service_order_parts`, `ts_save_service_order_parts`, `ts_consume_reserved_service_parts`, cierre atómico).
- Movimientos antiguos que ya fueron descontados por versiones anteriores permanecen como históricos y no se revierten automáticamente.
