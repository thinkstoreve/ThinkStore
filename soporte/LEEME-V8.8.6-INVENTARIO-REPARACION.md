# ThinkStore Soporte V8.8.6

Base acumulativa: V8.8.5 FINAL.

## Inventario dentro de la reparación

En **Gestionar orden** se agregó el bloque **Inventario de la reparación**. El técnico puede buscar cualquier producto/repuesto activo de `service_parts` por nombre, SKU, categoría, modelo compatible o ubicación.

- Selección múltiple.
- Cantidad por producto.
- Validación del stock disponible.
- Confirmación antes de descontar.
- Descuento mediante la RPC existente `adjust_service_part_stock`.
- Cada consumo queda ligado al código de orden en `service_part_movements`.
- Se añade una entrada interna de bitácora con los repuestos usados y el costo directo calculado con `unit_cost`.
- La orden muestra su historial de productos consumidos.

No requiere SQL nuevo: utiliza las tablas y la RPC ya instaladas en V8.7/V8.8.

## Indicador de sincronización

El indicador flotante muestra `Sincronizando…` / `Online · sincronizado` durante la conexión y, cuando termina, se reduce automáticamente a un pequeño punto. Si se pierde internet vuelve a mostrarse completo. Al tocar el punto compacto vuelve a expandirse temporalmente.

## Caché

El Service Worker cambia a `thinkstore-support-v8-8-6` para que el navegador reemplace los archivos antiguos tras el deploy.
