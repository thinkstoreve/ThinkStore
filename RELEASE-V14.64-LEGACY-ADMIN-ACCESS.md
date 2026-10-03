# ThinkStore Main V14.64 — Acceso administrativo legado

Base: V14.63.

## Problema
Las cuentas administrativas creadas antes de la separación `is_internal`
podían tener rol `super_admin` / `admin` correcto, pero `is_internal` vacío o false.
El Panel mostraba SUPER ADMIN, pero `admin-users` respondía:
`Acceso administrativo no autorizado`.

## Corrección
- `admin-users` reconoce como internos los perfiles con roles internos válidos,
  aunque sean cuentas anteriores a `is_internal`.
- `authenticate()` usa la misma regla de compatibilidad.
- El listado de empleados consulta perfiles y filtra en servidor, por lo que
  también aparecen administradores/empleados legados.
- Las cuentas nuevas siguen creándose con `is_internal=true`.
- Un Super Admin puede invitar a otro Super Admin.

No requiere SQL nuevo.
