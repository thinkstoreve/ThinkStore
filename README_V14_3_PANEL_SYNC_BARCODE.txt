ThinkStore V14.3 — Panel limpio + Inventory Sync + Barcode POS

CAMBIOS
1. Panel
- La bienvenida usa el nombre real del usuario autenticado.
- El hero de bienvenida solo aparece en la página Inicio de cada rol.
- Los KPIs genéricos ya no se repiten en Ventas, Inventario, Pedidos, etc.
- La pestaña Inventario abre el inventario unificado real.

2. Inventory Central -> ThinkStore
- Los productos creados en Inventory Central con SKU válido se importan automáticamente a inventory_variants.
- Los productos ya existentes que quedaron huérfanos por la política V14.2 se importan al ejecutar el parche.
- Se crea/actualiza una ficha administrativa de catálogo como borrador (published=false); no se publica automáticamente al cliente final.
- Stock, reserva, precio y disponibilidad siguen unidos por SKU.

3. Barcode POS
- ThinkStore Staff y Venta presencial aceptan lector físico tipo teclado (HID).
- Admite etiqueta de producto TSP, etiqueta de unidad TSU, código original, SKU, serial e IMEI.
- Un TSU añade la unidad física exacta (serial/IMEI) al carrito.
- El lector puede enviar Enter; no requiere cámara.

INSTALACIÓN SOBRE V14.2
- Ejecutar UNA SOLA VEZ en Supabase: supabase_v14_3_inventory_sync_barcode.sql
- Desplegar luego esta versión.
- Inventory Central debe actualizarse a V3.2.6 en su rama cloudflare.

PRUEBA RECOMENDADA
A) Crear producto en Inventory con SKU + precio + stock/unidad.
B) Confirmar que aparezca en ThinkStore > Inventario y /staff/.
C) Imprimir/abrir etiqueta TSP o TSU.
D) En Staff o Venta presencial, escanear con lector USB/Bluetooth configurado como teclado y terminador Enter.
