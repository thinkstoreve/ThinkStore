# ThinkStore Main V14.62 — Equipo y accesos / App Ventas

Base: V14.61.

## Cómo funciona App Ventas
No existe usuario o contraseña predeterminados.

El Administrador / Super Admin:
1. Abre `Equipo y accesos`.
2. Pulsa `Invitar empleado`.
3. Escribe nombre, correo y rol.
4. Activa o desactiva `Acceso a App Ventas`.
5. Envía la invitación.

El empleado recibe un correo y crea su propia contraseña.

Luego inicia sesión en:
`/staff/`

con:
- correo de la invitación,
- contraseña creada por el propio empleado.

## Control de acceso
Nuevo permiso:
`staff.access`

Por defecto:
- Vendedor: App Ventas habilitada.
- Admin / Super Admin: acceso completo.
- Otros roles: deshabilitado salvo que el administrador lo active.

En la tabla de empleados aparece una columna:
`App Ventas`
- Con acceso
- Sin acceso

El backend `staff-pos` valida este permiso. No basta con conocer un correo y
contraseña: la cuenta también debe ser interna, estar activa y tener App Ventas
habilitada.

No requiere SQL nuevo porque usa `permission_overrides`, que ya existe.
