ThinkStore Enterprise V10.4 · Recovery + SSO

- Elimina el bloqueo en la pantalla histórica “Sin conexión”.
- Desregistra Service Workers/cachés antiguos de Enterprise y fuerza una sola recarga limpia.
- /offline.html recupera automáticamente Enterprise cuando existe Internet.
- SSO robusto: espera el callback de Supabase y abre la sesión aunque llegue después de DOMContentLoaded.
- Compatibilidad de perfiles: role/active y rol/activo; full_name y nombre.
- No requiere SQL nuevo.
- Deploy: reemplazar únicamente el sitio Enterprise en Netlify.
