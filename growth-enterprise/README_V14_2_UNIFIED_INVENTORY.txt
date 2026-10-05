ThinkStore V14.2 · Inventario Unificado
=====================================

Objetivo
--------
Conectar bidireccionalmente el inventario operativo de ThinkStore / Staff POS
(public.inventory_variants + public.inventory_units) con Inventory Central
(public.thinkstore_inventory_*), dentro del MISMO proyecto Supabase.

Qué sincroniza
--------------
• SKU / nombre / modelo / color / capacidad / condición
• Precio de venta
• Stock físico
• Stock reservado por pedidos
• Vendidos / disponibilidad
• Stock mínimo
• Unidades serializadas, Serial e IMEI
• Cambios de estado de unidades
• Actualización del meta de Inventory Central para que su Realtime existente refresque la app

Cómo funciona
-------------
• El enlace principal es el SKU.
• No se añade inventory_variants a Supabase Realtime; se usa únicamente
  thinkstore_inventory_meta, evitando multiplicar conexiones/carga de CPU.
• Las ventas/reservas de ThinkStore actualizan Inventory Central mediante triggers SQL.
• Los ajustes realizados en Inventory Central actualizan inventory_variants/inventory_units.
• Staff POS ya lee inventory_variants, por lo que queda sincronizado automáticamente.

Primera sincronización
----------------------
La migración ejecuta un bootstrap seguro:
1. ThinkStore es la fuente inicial para SKUs que ya existen en la tienda.
2. Inventory Central se enlaza por SKU sin duplicar esos productos.
3. Registros exclusivos de Inventory Central NO se importan automáticamente a la tienda,
   para evitar subir datos históricos/demo accidentalmente.
4. Esos huérfanos se pueden revisar e importar después con:

   select public.ts_inventory_bridge_import_orphans('main');

Comprobar salud
---------------
Desde SQL Editor (rol postgres):

select public.ts_inventory_bridge_health('main');

Instalación
-----------
1. Crear un backup de Supabase.
2. Ejecutar UNA VEZ: supabase_v14_2_unified_inventory.sql
3. Revisar el JSON que devuelve ts_inventory_bridge_health.
4. Subir V14.2 a GitHub.
5. Subir Inventory V3.2.5 a su rama cloudflare.
6. Probar un SKU de prueba:
   - ajustar +1 desde Inventory Central y comprobar ThinkStore / Staff;
   - ajustar -1 desde el panel ThinkStore y comprobar Inventory Central.

Rollback
--------
Ejecutar supabase_v14_2_unified_inventory_ROLLBACK.sql detiene los triggers sin borrar datos.

Notas
-----
• Inventory Central mantiene ubicaciones y detalle operativo.
• ThinkStore mantiene reservas/pedidos/venta presencial.
• La disponibilidad mostrada en Inventory Central usa los contadores sincronizados cuando
  un SKU está enlazado, por lo que refleja también las reservas hechas desde ThinkStore.
