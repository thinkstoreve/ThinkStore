# ThinkStore Main V14.77 — Fotos de perfil Staff

Actualización incremental sobre **Main V14.76** (incluye las mejoras del flujo de venta presencial).

## Qué se agregó
- **Staff > Cuenta**: subir, cambiar o quitar la foto del usuario autenticado.
- Disponible para **vendedor**, **administrador** y **superadministrador** (sin poder editar fotos ajenas).
- Vista de la foto en la cabecera de Staff y en la ficha de cuenta; iniciales de respaldo.
- Preprocesamiento del archivo desde el navegador (máximo 512 px, JPG/WEBP), sin subir la foto original.
- Guardado privado en **Supabase Storage**, en el bucket `staff-profile-photos`.
- URL temporal firmada, no URL pública, generada en backend y renovada en cada inicio/actualización de la app.
- No toca ventas, pedidos, usuarios, roles ni permisos.

## Orden de despliegue
1. Supabase **PRINCIPAL** > SQL Editor: `MIGRACION-V14.77-FOTO-PERFIL-STAFF.sql` (solo una vez).
2. Netlify > **Main**: desplegar el ZIP completo `ThinkStore-main-V14.77-STAFF-FOTOS-PERFIL.zip` en el sitio principal.
   - Importante: desplegar el **proyecto completo con `netlify/functions`** (usar Netlify CLI o conexión Git del proyecto), no únicamente los archivos estáticos arrastrados al publicador.
3. En Staff, entrar con cada rol autorizado, ir a **Cuenta > Cambiar foto**, elegir imagen y comprobarla en la cabecera y tras refrescar.
4. Probar **Quitar foto**: vuelve a mostrar las iniciales del usuario.

### Variables existentes necesarias en Netlify (Main)
- `SUPABASE_URL` o `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` o `SUPABASE_SERVICE_KEY`

No se necesitan variables nuevas, pero la llave `service_role` jamás debe exponerse al navegador.
No ejecutar la migración en el proyecto de Supabase independiente de Soporte: corresponde al Supabase PRINCIPAL.

### Nota de seguridad
- Solo el usuario autenticado cuyo `profiles.id` coincida con el JWT puede editar su propia foto.
- La foto se almacena en un bucket privado y las imágenes aceptadas son JPG/WEBP, limitadas en tamaño y firma binaria.
- El endpoint impide que se modifiquen roles/permisos, que se edite el perfil de otra persona y que perfiles de clientes públicos usen la función.
- La URL firmada expira a los 7 días; recargar Staff obtiene un enlace nuevo.

La conexión real a la cuenta del negocio se valida después del despliegue. Las pruebas locales usan Supabase simulado.
