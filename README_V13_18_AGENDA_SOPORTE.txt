ThinkStore V13.18 · Agenda Soporte Think

- La guía de equipos dañados ahora abre agenda-soporte.html.
- Flujo de 5 pasos: datos, equipo, servicio, fecha/hora y confirmación.
- En vista local (VS Code/Live Server) guarda una copia de PREVIEW en localStorage para poder probar sin deploy.
- En producción registra la cita mediante /.netlify/functions/support-appointment.
- La función escribe en la BASE INDEPENDIENTE DE SOPORTE, no en la base de la tienda.

Antes de publicar:
1) Ejecuta support_appointments_setup.sql en Supabase de soporte.thinkstore.com.ve.
2) En Netlify configura SUPPORT_SUPABASE_URL y SUPPORT_SUPABASE_SERVICE_ROLE_KEY.
3) La service role NUNCA debe ir en archivos del navegador.
4) Luego podemos añadir la vista "Citas" al panel de soporte para aceptar/reprogramar/cancelar.
