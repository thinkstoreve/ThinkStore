ThinkStore Growth Enterprise - Supabase Auth

Cambios aplicados:
- Se eliminó la clave demo thinkstore2026.
- El login ahora usa Supabase Auth con email + contraseña.
- El panel solo abre si el usuario existe en public.profiles con role admin/super_admin y active=true.
- Se agregó supabase-setup.sql para crear profiles, RLS y trigger de creación de perfiles.

Pasos:
1. Sube/reemplaza esta carpeta growth-enterprise en GitHub.
2. Espera el deploy de Netlify.
3. En Supabase > SQL Editor ejecuta supabase-setup.sql.
4. En Supabase > Authentication > Users crea o invita el usuario administrador.
5. Copia el UUID del usuario y ejecuta el UPDATE indicado al final de supabase-setup.sql.
6. Abre https://enterprise.thinkstore.com.ve e inicia sesión con ese correo y contraseña.

Notas:
- La anon public key puede vivir en frontend; lo importante es tener RLS activo.
- No uses service_role en archivos públicos.
