# Growth Enterprise · Fix Supabase Roles

Cambios aplicados:
- El login consulta primero `public.roles_usuarios` por email.
- `public.profiles` queda como respaldo para evitar bloqueos por RLS/500.
- El módulo de Accesos usa `roles_usuarios` como fuente principal.
- Se agregó recuperación de contraseña:
  - Botón "¿Olvidaste tu contraseña?"
  - Página `/reset-password` con Netlify redirect hacia `reset-password.html`
  - Archivo `_redirects`

Importante en Supabase > Authentication > URL Configuration:
Agrega también:
https://enterprise.thinkstore.com.ve/reset-password

Luego reemplaza la carpeta `growth-enterprise` en GitHub por esta versión y haz commit.
