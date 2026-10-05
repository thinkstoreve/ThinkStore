ThinkStore V11 - Supabase preparado

Cambios incluidos:
- Admin oculto del menú público.
- Admin accesible desde: https://thinkstore.com.ve/?admin=1 o #admin
- Botones móviles corregidos.
- WhatsApp flotante ajustado.
- Botón de recuperación de contraseña añadido.
- Archivo supabase-config.js creado.
- Archivo supabase_schema_thinkstore.sql incluido para crear tablas y políticas RLS.

Para conectar Supabase:
1. En Supabase ejecuta supabase_schema_thinkstore.sql desde SQL Editor.
2. Abre supabase-config.js.
3. Coloca tu Publishable key donde dice PEGA_AQUI_TU_PUBLISHABLE_KEY.
4. No uses ni pegues la Secret key.
5. Sube este ZIP a Netlify.

Modo seguro:
Si no colocas la Publishable key, la tienda sigue funcionando en modo local con localStorage.
