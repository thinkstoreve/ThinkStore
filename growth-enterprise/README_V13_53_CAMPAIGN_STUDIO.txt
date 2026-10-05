ThinkStore V13.53 · Campaign Studio

- Interfaz de Marketing rediseñada con editor + vista previa en vivo.
- Audiencias: todos los contactos, registrados, ventas directas, compradores y newsletter.
- Los usuarios registrados se obtienen de clientes, profiles y Supabase Auth.
- Los compradores de ventas directas se incorporan desde los campos guest/customer del pedido.
- Deduplicación automática por correo.
- Generador de mensajes para ofertas generales, Navidad, Black Friday, Día de las Madres, Día del Padre, regreso a clases y aniversario.
- Imagen publicitaria con carga JPG/PNG/WEBP, vista previa, cover/contain y ajuste horizontal/vertical.
- Nueva Netlify Function campaign-image.js: crea/usa el bucket público marketing-campaigns en Supabase Storage y sube la imagen al enviar.
- Envío por Resend con concurrencia moderada y registro de resultados.
- Mantiene el resto del proyecto completo de V13.52.

Requiere las variables ya usadas por Marketing: RESEND_API_KEY, SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
No requiere SQL nuevo.
