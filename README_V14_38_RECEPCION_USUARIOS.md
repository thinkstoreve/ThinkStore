# ThinkStore V14.38 — Recepción y usuarios de Soporte

Versión completa basada en V14.37. Incluye Recepción V2 y Marketing Empresas.

## Cambios solicitados

- Hoja de recepción: logo oficial negro de ThinkStore en lugar del monograma TS, cabecera compacta, márgenes A4 y bloques que evitan cortes interiores al imprimir. El logo se incluyó dentro de soporte/assets para funcionar también con Soporte como sitio separado.
- Pestaña Recepción: cabecera clara, textos oscuros legibles, botones secundarios visibles y mayor espacio para acciones y estado. En pantallas estrechas la tabla permite desplazamiento horizontal. No cambia el tema del resto del panel.
- Usuarios y roles / Permisos: formulario para añadir e invitar por correo a recepcionistas y técnicos, editar el nombre/rol, activar o desactivar y seleccionar accesos por módulo. Solo administradores y superadministradores pueden gestionar estas cuentas. Se conservan los roles administrativos y las cuentas existentes.
- Las invitaciones se envían desde Supabase Auth. El destinatario abre el enlace y define su contraseña. Un fallo de correo se informa como tal, aunque el perfil se haya guardado; una cuenta ya registrada puede acceder con su contraseña existente.

## Activación — esta versión SÍ incluye SQL nuevo

1. Conserva V14.37 como respaldo y prueba primero en una vista previa.
2. En el SQL Editor del proyecto **Supabase de Soporte**, ejecuta `soporte/supabase_v14_38_staff_permissions.sql`. Requiere el esquema de producción de Soporte instalado. El script es transaccional y repetible; añade una columna de permisos, una función de comprobación y políticas restrictivas. No elimina usuarios ni órdenes. Los usuarios antiguos con permisos NULL conservan el comportamiento de su rol.
3. En el hosting de Soporte configura `SUPPORT_SUPABASE_URL` y `SUPPORT_SUPABASE_SERVICE_ROLE_KEY` con los valores del proyecto de Soporte. La clave service_role es exclusiva del servidor: nunca se pega en HTML ni en app.js. Si Soporte se despliega separado, también son compatibles las variables SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY que ya utilizaba su función; se recomiendan las variables SUPPORT_* explícitas.
4. En Supabase Authentication configura el correo/SMTP para invitaciones y añade `https://soporte.thinkstore.com.ve/index.html` a las Redirect URLs autorizadas. Si usas otro dominio o la subcarpeta del sitio principal, configura `SUPPORT_INVITE_REDIRECT_URL` con la URL HTTPS de su página index.html y autorízala en Supabase. Ejemplo de subcarpeta: `https://TU-DOMINIO/soporte/index.html`.
5. Publica el proyecto con el procedimiento habitual de Netlify, incluyendo sus funciones. Si publicas solo Soporte, despliega el contenido completo de la carpeta soporte; su netlify.toml ya declara las funciones. Si publicas el sitio completo, la función de la raíz dirige las acciones al módulo de Soporte y exige las variables SUPPORT_* para no usar por error el proyecto principal.
6. Recarga el panel e inicia sesión como administrador. En Usuarios y roles completa nombre, correo, rol y permisos y pulsa **Añadir e invitar por correo**. Para una cuenta existente, pulsa **Editar permisos** y luego **Guardar cambios**. Pide a la persona que recargue el panel después de cambiarle permisos.

Documentación oficial de invitaciones: https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail
URLs de redirección: https://supabase.com/docs/guides/auth/redirect-urls

## Alcance de permisos

Los controles seleccionan accesos a módulos dentro del rol elegido, sin permitir elevar a un técnico/recepcionista a administrador. Resumen permanece disponible. Los módulos operativos comparten órdenes: Órdenes, Recepción y Área técnica pueden necesitar los mismos registros; desmarcar una pantalla no es una restricción por campo ni una regla de “solo mis órdenes”. Las políticas nuevas limitan las familias de datos de órdenes, bitácora, fotos, almacenamiento, citas y repuestos; la función de movimientos de stock también comprueba el permiso de repuestos. Mantienen las comprobaciones de rol anteriores y el seguimiento público existente.

## Verificación

29 pruebas aprobadas: las 21 previas más 8 de gestión de usuarios. Incluyen rechazo de roles no autorizados, protección de cuentas administrativas y cuenta propia, permisos fuera del rol, guardado antes de envío, error de correo, falta de migración, edición sin enviar correo y fallo de red. Las pruebas de impresión comprueban que se usa el logo oficial y se elimina TS.

Todos los archivos JavaScript/CJS pasan validación sintáctica; el panel conserva IDs únicos y sus manejadores de eventos. Es un sitio estático, sin comando de compilación definido.

Las pruebas usan Supabase y correo simulados. No se ejecutó SQL en producción ni se enviaron invitaciones reales. No se verificó esta entrega visualmente en un navegador ni con PostgreSQL real. Antes de publicar definitivamente, comprobar contraste y botones en Recepción, hoja impresa con logo, una invitación a un correo propio de prueba y un acceso con cada rol y permisos seleccionados.

## Reversión

Se puede volver al ZIP V14.37. Las políticas de permisos de V14.38 seguirán aplicando hasta que un administrador las revierta; volver al código no revierte SQL. No eliminar datos ni usuarios. Conservar el script y revisar los permisos personalizados antes de cualquier reversión de base de datos.
