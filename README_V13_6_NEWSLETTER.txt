ThinkStore V13.6 · Newsletter de ofertas

Incluye:
- Sección premium de suscripción en Inicio y Contacto.
- Validación de correo y estados accesibles de éxito/error.
- Guardado real preparado en Supabase (tabla newsletter_subscribers).
- Los suscriptores pueden formar parte de campañas de Marketing/Resend.
- Nueva audiencia: "Suscriptores de ofertas".
- Audiencia "Clientes + suscriptores web" deduplica correos antes de enviar.
- Política de privacidad enlazada desde el formulario.

Para activar el guardado real antes del lanzamiento:
1. Abrir Supabase > SQL Editor.
2. Ejecutar una sola vez: supabase_v13_6_newsletter.sql
3. Probar una suscripción desde la web.

En Visual Studio / Live Server el diseño puede revisarse inmediatamente. Sin ejecutar el SQL, el formulario informará que falta activar la tabla y no fingirá que guardó el correo.
