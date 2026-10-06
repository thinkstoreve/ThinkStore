# ThinkStore Main V14.91 — sitio unificado

La base es V14.90, incluyendo Soporte V8.8.8, App Ventas y Enterprise completo.

## Un solo deploy del sitio Netlify Main

En el repositorio GitHub principal, reemplaza el CONTENIDO de la raíz publicada por los archivos de la carpeta `ThinkStore-main/` de este ZIP, sin crear una segunda carpeta anidada `ThinkStore-main` si la raíz actual ya es el sitio. El Main publica `.` y las funciones `netlify/functions/`.

Rutas:
* `/` — Tienda ThinkStore
* `/staff/` — App Ventas
* `/soporte/` — Soporte V8.8.8
* `/growth-enterprise/` — Enterprise completo V10.14
* `/inventory/` — Inventory V3.2.32 (nuevo, ejecutado en Netlify)
* `/suite-status.html` — comprobaciones de rutas y funciones

Atención: UN SOLO DEPLOY no cambia la asignación de dominios de proyectos Netlify independientes. Para recuperar `enterprise.thinkstore.com.ve`, primero desasigna ese subdominio del sitio Netlify antiguo y añádelo como Domain alias al sitio Netlify Main. La regla de redirects del Main redirige la raíz de ese dominio a `/growth-enterprise/`.

Desactiva deploys automáticos del sitio Enterprise/Soporte antiguos, si siguen enlazados al mismo GitHub, para evitar compilaciones dobles.

Variables que deben estar configuradas EN EL SITIO MAIN de Netlify:
`SUPABASE_URL` (Principal, misma URL que supabase-config.js), `SUPABASE_SERVICE_ROLE_KEY` (clave secreta Principal), `SUPPORT_SUPABASE_URL`, `SUPPORT_SUPABASE_SERVICE_ROLE_KEY` o `SUPPORT_SUPABASE_SECRET_KEY`, `RESEND_API_KEY`. Para las imágenes de Inventory R2, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`. Nunca incorporar estas claves en archivos públicos.

No requiere SQL NUEVO: conserva las migraciones ya ejecutadas. La integración de inventario al Main no duplica ni migra tablas; sigue consultando los Supabase existentes. Si las funciones retornan 401/503, revisar sesión/Netlify env antes de modificar SQL o permisos.

El antiguo sitio `enterprise.thinkstore.com.ve` puede continuar mostrando una página offline hasta transferir el dominio y limpiar su Service Worker en el navegador; un ZIP no puede modificar un proyecto Netlify diferente.
