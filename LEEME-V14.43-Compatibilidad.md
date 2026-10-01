# Corrección V14.43 · Identificadores de órdenes

La migración V14.42 asumía que service_orders.id era UUID. La base existente usa bigint; por ello la transacción fallaba completa y tampoco se creaba published.

1. En Supabase de Soporte ejecutar completo supabase_v14_43_workshop_compat.sql. Reemplaza la migración de taller V14.42. Detecta el tipo real de la clave, sin convertir ni borrar órdenes existentes. El archivo V14.42 dentro del nuevo paquete también contiene esta corrección para evitar repetir el fallo.
2. Cuando termine correctamente, ejecutar las 18 partes del catálogo previamente entregadas, una por consulta. Ejecutar después 19_verificar.sql: 4354 presentes, 0 faltantes. No hay que modificar esos archivos.
3. Actualizar sitio principal y Soporte con ThinkStore V14.43; actualizar Inventory con V3.2.9. El servidor y el selector de órdenes también necesitaban aceptar IDs numéricos. Se conservan las categorías Electrónicos y Herramientas de servicio añadidas a Mobiliario.

No hace falta ejecutar ambas migraciones (V14.42 y V14.43). No elimina tablas ni cambia IDs. Conserva las variables de servidor y los pasos de activación descritos en la guía V14.42.

Verificación: 47 pruebas automatizadas aprobadas y comprobaciones PostgreSQL aisladas con órdenes UUID y bigint: migración repetida, cotización vinculada, abonos, stock, seguridad y catálogo completo. No se ejecutó en producción; sigue pendiente la comprobación en el sitio desplegado.
