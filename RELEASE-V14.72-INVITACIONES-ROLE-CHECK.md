# ThinkStore Main V14.72 — Invitaciones compatibles con `profiles_role_check`

## Corrección

La invitación administrativa podía fallar antes de enviar el correo porque `auth.admin.generateLink()` incluía el rol de interfaz en `user_metadata`. El trigger histórico `handle_new_user()` copiaba ese valor directamente a `profiles.role`, mientras el esquema Growth admite valores como `super_admin` y no `superadmin`, y usa `recepcion` como base para Soporte.

## Cambios

- La invitación ya no envía `role` durante la creación inicial del usuario Auth.
- El perfil interno se crea/actualiza después usando el esquema real detectado (`role/active` o `rol/activo`).
- `superadmin` se almacena como `super_admin` cuando la tabla usa `profiles.role`.
- `soporte` usa `recepcion` como rol base de BD en el esquema Growth; el acceso específico de Soporte se conserva en `platform_access`/SSO.
- Las actualizaciones de rol también respetan el formato real de la tabla.
- El frontend envía explícitamente el rol base seleccionado.
- Se incluye una migración SQL que endurece `handle_new_user()` sin eliminar ni ampliar `profiles_role_check`.

## Orden

1. Ejecutar `MIGRACION-V14.72-INVITACIONES-ROLE-CHECK.sql` en el Supabase principal.
2. Desplegar el ZIP V14.72 en ThinkStore Main / Netlify.
3. Volver a enviar la invitación.
