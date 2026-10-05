# ThinkStore Main V14.71 — Clientes / Personal compatible con profiles_role_check

Base: V14.70.

## Corrección
El Supabase principal usa un `profiles_role_check` que no admite `cliente` en `profiles.role`.
V14.70 intentaba escribir ese valor y la migración fallaba con error 23514.

V14.71 cambia el diseño:
- `is_internal` es la fuente de verdad para acceso a paneles.
- Los clientes pueden conservar un `role` legado permitido por el CHECK, pero se ignora por completo si `is_internal=false`.
- Admin/Super Admin e invitados internos se conservan como personal.
- Clientes existentes dejan de aparecer en Usuarios internos.
- El registro público ya no envía `role=cliente` a Auth, evitando choques con triggers antiguos que copian metadata a `profiles.role`.
- No se elimina ni modifica `profiles_role_check`.

## Orden
1. Ejecutar `MIGRACION-V14.71-AISLAMIENTO-CLIENTES-COMPATIBLE.sql`.
2. Desplegar V14.71 en ThinkStore Main.
