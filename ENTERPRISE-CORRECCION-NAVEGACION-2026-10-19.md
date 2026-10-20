# Enterprise – Corrección sobre ZIP aportado por el usuario

Se conservan los archivos y servicios de `ThinkStore-main (3)(2).zip`.

## Cambios comprobables
- Menú principal: Inicio, Tesorería, Movimientos, Obligaciones y Reportes.
- Los módulos operativos secundarios permanecen en «Más herramientas».
- Obligaciones incorpora tarjetas financieras, cuentas manuales y accesos reales a Tesorería.
- Reportes incorpora valores del origen financiero, conteos y exportación CSV de movimientos.
- Se evita un posible fallo de referencia en navegación cuando `titles` no está definido.

## Limitaciones y pendientes
- No se ha probado autenticación real, conciliación con Supabase, ni envíos de correos.
- No se ha certificado la equivalencia visual completa con Fina Partner.
- No se deben publicar cambios sin probar las rutas de Tesorería, obligaciones y reportes con una sesión autorizada.
- No se ejecutaron migraciones SQL.
