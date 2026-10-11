# ThinkStore Main V15.29 · Catálogo Servicio Técnico sincronizado con Inventory

Base: V15.28 CHACAO / previa cita.

## Cambios
- El catálogo público de Servicio Técnico ya no deja de leer Inventory cuando existen registros en Supabase de Soporte.
- `/.netlify/functions/service-parts` fusiona ahora:
  - repuestos publicados y activos de Soporte;
  - productos/repuestos activos de ThinkStore Inventory;
  - variantes de inventario vinculadas cuando corresponda.
- Nuevos repuestos como **Circuito de carga** y **Cambio de IC** se clasifican automáticamente por equipo según nombre, modelo y compatibilidad.
- Se conservan precio de servicio cuando existe en Soporte y disponibilidad/stock real desde Inventory cuando existe el mismo SKU.
- Los productos marcados como ocultos/inactivos no se exponen desde Inventory.
- Los filtros del catálogo público se actualizan automáticamente con nuevas series, reparaciones, modelos y calidades recibidas desde Inventory.
- El síntoma **No carga** puede mostrar tanto Flex de carga como Circuito de carga.
- Se añadieron Circuito de carga y Cambio de IC a los filtros base de iPhone, iPad y Mac.
- La carga del catálogo usa `no-store` y un parámetro anticaché para reflejar publicaciones nuevas con mayor rapidez.

## Deploy
No requiere SQL nuevo.
Desplegar el ZIP completo en Netlify sobre la V15.28.

## Validación realizada
- Sintaxis Netlify Function: OK.
- Sintaxis JavaScript del catálogo público: OK.
- Prueba de fusión Soporte + Inventory: OK.
- Caso probado: Circuito de carga iPhone 13 publicado en Inventory aparece como iPhone / Circuito de carga con stock disponible.
