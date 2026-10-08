# ThinkStore Main V15.23 · Perfil técnico + regreso al panel principal

Base: V15.22.

## Soporte / Técnico
- Añade botón `Volver al Panel Técnico` visible únicamente para rol `technician`.
- El botón vuelve al panel principal ThinkStore sin cerrar la sesión.
- Añade tarjeta de identidad del usuario en la barra lateral de Soporte.
- Añade foto de perfil editable para el personal de Soporte.
- La imagen se recorta a 640 × 640 y se convierte a WebP antes de subirla.
- Bucket privado `support-profile-photos`.
- Cada usuario autenticado solo puede leer/escribir/borrar objetos de su propia carpeta `auth.uid()`.
- `service_users.avatar_path` guarda únicamente la ruta privada, nunca una URL pública.
- La foto se muestra mediante URL firmada temporal.
- Se puede reemplazar o quitar la foto desde la misma interfaz.

## Seguridad
- `ts_update_own_service_avatar(text)` solo permite asociar una ruta cuyo primer segmento coincide con `auth.uid()`.
- `ts_clear_own_service_avatar()` solo modifica el registro de `service_users` cuyo email coincide con el JWT autenticado.
- No se habilita modificación general de perfiles para técnicos.

## Caché
- Soporte assets: `15.23.0`.
- Service Worker: `thinkstore-support-v8-8-7-r1523`.

## SQL
Ejecutar en Supabase de Soporte:
`MIGRACION-SOPORTE-V8.8.18-PERFIL-TECNICO-REGRESO-PANEL.sql`

La migración V8.8.18 incluye V8.8.16 y V8.8.17, por lo que sustituye esas dos si todavía no se ejecutaron.
