# ThinkStore Soporte V8.8.24 · Eliminación segura de fotografías

- Cada tarjeta de la galería incorpora **Eliminar**.
- Se muestra una confirmación antes de borrar.
- Si la imagen está publicada al cliente, se advierte que desaparecerá también del seguimiento.
- El backend elimina primero el objeto privado de Cloudflare R2 (o Supabase Storage para archivos antiguos) y luego su registro en `service_order_photos`.
- Técnicos solo pueden actuar sobre órdenes a las que tienen acceso; roles no autorizados no pueden borrar.
- Se registra auditoría de la eliminación.
- No requiere SQL ni variables nuevas.
