# ThinkStore V14.92 — Fix build Netlify

Base: V14.91 Unificado Diagnóstico.

Corrección única:
- Se normalizó un nombre de archivo SQL histórico dentro de `soporte/SQL-V8.7.2/` que contenía caracteres `#` inválidos para Netlify.
- No se modificó la lógica de Main, App Ventas, Soporte, Enterprise ni Inventory.

El archivo renombrado es:
`02-COTIZACION-RESENAS-NOTIFICACIONES.sql`
