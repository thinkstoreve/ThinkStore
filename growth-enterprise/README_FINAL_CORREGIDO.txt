ThinkStore Growth Enterprise - versión corregida final

Cambios aplicados:
1. Login real con Supabase Auth.
2. Eliminado modo demo por clave.
3. supabase.js crea window.supabaseClient de forma segura.
4. Validación de administrador compatible con:
   - public.profiles (nuevo esquema recomendado)
   - public.roles_usuarios (tabla que ya tienes actualmente)
5. Dashboard protegido: si no hay sesión o rol admin/super_admin, vuelve al login.
6. Conteos compatibles con tablas en inglés o español:
   - orders / pedidos
   - customers / clientes
   - products / productos
7. Módulo de accesos tipo Shopify Staff compatible con profiles y roles_usuarios.

Pasos:
1. Reemplaza la carpeta growth-enterprise actual en GitHub por esta carpeta.
2. Commit changes.
3. Espera el deploy de Netlify.
4. Abre https://enterprise.thinkstore.com.ve
5. Entra con el correo administrador de Supabase Auth.
6. Verifica que el usuario tenga rol super_admin o admin y activo TRUE.

Importante:
- En Supabase Authentication > URL Configuration conserva:
  https://enterprise.thinkstore.com.ve
  https://enterprise.thinkstore.com.ve/
  https://enterprise.thinkstore.com.ve/dashboard.html
  https://thinkstore.com.ve
  https://thinkstore.com.ve/
  https://thinkstore.com.ve/reset-password
