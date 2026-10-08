# ThinkStore Main — V15.12 · Fotos seguras + precio automático de repuestos

## 1. Fotografías en Gestionar
- El panel de Soporte ya no depende únicamente de una URL firmada del navegador.
- Se añadió `file_data` al backend seguro de Soporte para recuperar imágenes privadas mediante Service Role y entregarlas al usuario autenticado como Data URL.
- Si ese método no está disponible, conserva el fallback por URL firmada.
- Las miniaturas vuelven a renderizarse dentro de las tarjetas de `Fotografías y archivos`.
- Al tocar una fotografía se abre el visor ampliado tipo lightbox sin salir de Gestionar.
- Se mantiene la privacidad del bucket `service-order-files`.

## 2. Precio automático del repuesto en App Ventas
- App Ventas busca primero `sale_price_snapshot` guardado en la orden.
- Si la orden antigua tiene el snapshot en 0, usa automáticamente `service_parts.sale_price` del repuesto correspondiente.
- Para órdenes antiguas que solo tienen movimiento de inventario, se reconstruye el repuesto desde `service_part_movements` + `service_parts`.
- Cada línea muestra:
  - nombre,
  - SKU,
  - estado,
  - cantidad,
  - precio unitario,
  - subtotal.
- El resumen muestra `Total repuestos`.
- Si realmente no existe precio configurado en el catálogo, aparece `Precio no configurado` / `Sin precio` en vez de mostrar $0.00 como si fuera válido.

## 3. Soporte · selector de repuestos
- Al seleccionar un repuesto el técnico también ve su **precio de venta** configurado, además de stock y costo.
- Esto permite comprobar antes de usarlo que el precio de caja es el correcto.

## 4. Caché
- Soporte y App Ventas suben a assets `15.12.0`.
- El Service Worker de Soporte cambia de caché para eliminar la versión anterior.

## SQL
- No requiere SQL nuevo.
