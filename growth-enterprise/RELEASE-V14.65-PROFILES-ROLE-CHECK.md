# ThinkStore Main V14.65 — Profiles Role Check Fix

Base: V14.64.

## Error corregido
`new row for relation "profiles" violates check constraint "profiles_role_check"`

## Causa
El Panel trabaja con el rol UI `superadmin`, pero `admin-users.js` convertía
ese rol a `super_admin` antes de escribirlo en `public.profiles`.

La tabla actual de ThinkStore acepta:
`superadmin`

Por eso la invitación llegaba correctamente hasta Supabase y fallaba justo al
crear el perfil interno.

## Corrección
- `superadmin` se guarda en `profiles.role` como `superadmin`.
- `super_admin` continúa siendo aceptado al leer/normalizar perfiles antiguos.
- Crear otro Super Admin desde un Super Admin vuelve a ser compatible con el
  check constraint actual.
- El mismo valor canónico se usa al modificar roles existentes.

## SQL
No requiere SQL nuevo.
No cambies ni elimines `profiles_role_check`.
