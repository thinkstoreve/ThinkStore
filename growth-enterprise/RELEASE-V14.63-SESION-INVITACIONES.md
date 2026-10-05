# ThinkStore Main V14.63 — Sesión segura / Invitaciones

Base: V14.62.

## Problema corregido
El Panel podía abrir usando la copia local del Super Admin aunque la sesión
segura de Supabase ya hubiese expirado.

Eso permitía ver el Panel, pero acciones protegidas como:
- listar empleados,
- invitar usuarios,
- crear roles,
- cambiar accesos,
fallaban con `Sesión no autorizada`.

## Corrección
- Antes de una operación administrativa se valida la sesión Supabase real.
- Si está por expirar se intenta `refreshSession()`.
- Si no existe sesión válida, el Panel pide revalidación.
- La revalidación obliga a ingresar de nuevo la contraseña.
- El borrador de `Invitar empleado` se conserva.
- Al volver, abre de nuevo `Equipo y accesos`.
- `admin-users` devuelve un código de diagnóstico de autenticación sin exponer
  tokens ni secretos.

## Super Admin
Un Super Admin autenticado puede invitar a otro Super Admin.
No se cambia la regla de seguridad que impide a un Admin normal crear otro
Admin/Super Admin.

No requiere SQL nuevo.
