# ThinkStore V15.22 · App Ventas

## Caja Staff
- Corrige el falso bloqueo cuando `pedidos.bcv_rate` no existe en un esquema anterior.
- Caja intenta el esquema moderno y, si esa columna no está disponible, continúa con `total_bs`, que conserva el monto real cobrado en bolívares.
- La migración V14.80 solo se reporta como faltante cuando realmente faltan objetos propios de Caja Staff (`ts_staff_cash_*` / RPC de caja).
- Se conservan separados efectivo USD, efectivo Bs. y medios electrónicos para el arqueo.

## Reparaciones · Inventory de Servicio Técnico
- La búsqueda de “Añadir servicio o producto” ahora consulta también repuestos físicos de `service_parts`.
- Se distinguen `Repuesto ST`, `Servicio`, `Mano de obra` y `Producto tienda`.
- El stock disponible de repuestos descuenta reservas de otras órdenes.
- Al añadir un `Repuesto ST`, App Ventas lo reserva mediante la función existente `ts_save_service_order_parts` y recalcula el total de la reparación.
- Los productos de tienda continúan usando el inventario principal y su reserva independiente.

## Interfaz
- Iconos SVG lineales en navegación, caja, escáner, búsqueda y actualización.
- Navegación con estado activo más claro.
- Tarjetas de Caja con acentos azul, verde, naranja y violeta sin abandonar el fondo limpio de ThinkStore.
- Mejor diferenciación visual entre USD, Bs., movimientos y arqueo.
- Repuestos de Servicio Técnico se identifican visualmente en el buscador.
- Se actualizó el Service Worker a `thinkstore-staff-v15-22-0` para evitar que el navegador conserve la interfaz anterior.

## SQL
Esta versión no agrega una migración SQL nueva. Usa las tablas/RPC ya existentes. Si la reserva de repuestos no existiera en un entorno distinto, requiere el bloque de inventario de Soporte V8.8.8 que ya forma parte del proyecto.

## Base
Este ZIP parte del paquete completo V10.21.1 HOTFIX, por lo que conserva también la corrección de Caja Chica de Enterprise.
