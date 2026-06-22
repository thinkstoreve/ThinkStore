ThinkStore Soporte - Supabase Auth V2

Cambios incluidos:
- Login ahora usa correo + contraseña con Supabase Auth.
- Proyecto conectado: https://tnezvnziqnjxhcwjtcuy.supabase.co
- El rol se lee desde public.service_users.
- Se eliminan usuarios locales del login.
- Se agregó pantalla para crear contraseña desde enlaces de invitación o recuperación.
- Interfaz y fondo se mantienen.

Usuario superadmin configurado en service_users:
soporte@thinkstore.com.ve

Pasos:
1. Reemplaza todo el contenido de ThinkStore/soporte/ con este ZIP descomprimido.
2. Commit + Push.
3. En Supabase ThinkStore-Soporte, invita a soporte@thinkstore.com.ve si aún no existe.
4. Acepta la invitación y crea contraseña.
5. Entra desde soporte.thinkstore.com.ve usando correo + contraseña.

Importante:
- No mezclar con Supabase de la tienda principal.
- No compartir la secret/service role key en frontend.
