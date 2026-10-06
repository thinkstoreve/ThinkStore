# ThinkStore Main V14.86 — App Ventas Auth Token Fix

- Corrige el rechazo de usuarios internos al iniciar sesión en App Ventas.
- La causa era el recorte del Bearer token a 400 caracteres en `staff-pos.js`.
- El token de Supabase ahora se procesa completo, sin truncarlo.
- La misma corrección se aplica a `service-sales.js` para cobros y reparaciones.
- App Ventas reconoce acceso por `staff.access`, `platform.staff`, `ventas`, `pagos` o acceso completo `*`.
- Super Admin y Admin conservan acceso completo.
- Clientes públicos siguen bloqueados.
- No requiere migración SQL.
