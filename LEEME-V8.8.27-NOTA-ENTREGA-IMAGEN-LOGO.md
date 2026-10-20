# ThinkStore V8.8.27 – Nota de entrega

- Cabecera de la nota de entrega: isotipo ThinkStore recortado de un recurso existente (sin texto duplicado), mayor tamaño y compatible con impresión.
- Miniaturas: lectura de campos alternativos de imagen y resolución de imagen principal en `catalog_products` y `catalog_product_images` para notas abiertas por Administración o el cliente. Si el recurso remoto falla, se oculta la imagen rota.
- Accesorios: no se imprime «Serial: Por registrar» cuando el pedido no guarda un serial. Los seriales efectivamente registrados siguen mostrándose.
- Sin cambios de esquema ni migraciones, sin deploy.

**Pendiente de probar con Supabase y URLs R2 reales:** resolución de imágenes para productos sin coincidencia exacta de nombre, generación de email y entrega al cliente.
