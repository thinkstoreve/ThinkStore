THINKSTORE · ENTERPRISE + SOPORTE EN PRODUCCIÓN

Este paquete mantiene separadas las fuentes:
- Tienda / Panel: Supabase principal existente.
- Enterprise: lee la base principal con la sesión del administrador.
- Soporte: Supabase independiente mediante un puente Netlify seguro.

ANTES DEL DEPLOY

1. En el SQL Editor del proyecto Supabase de SOPORTE, ejecutar completo:
   soporte/supabase_soporte_produccion.sql

   Aunque hayas ejecutado una versión anterior, vuelve a ejecutar la incluida
   en este paquete para crear archivos privados, auditoría y campos operativos.

2. En las variables de entorno del deploy que sirve Enterprise agregar:
   SUPPORT_SUPABASE_URL = URL del proyecto Supabase de soporte
   SUPPORT_SUPABASE_SERVICE_ROLE_KEY = service_role del proyecto de soporte

3. Conservar las variables que ya usa ThinkStore:
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   RESEND_API_KEY y configuración actual de correos

3B. En el Supabase PRINCIPAL "thinkstore", ejecutar una sola vez:
    supabase_enterprise_auditoria.sql

4. En el sitio Netlify de SOPORTE agregar:
   SUPPORT_SUPABASE_URL = URL del proyecto ThinkStore-Soporte
   SUPPORT_SUPABASE_SERVICE_ROLE_KEY = service_role de ThinkStore-Soporte
   RESEND_API_KEY = clave de Resend existente
   FROM_SOPORTE_EMAIL = ThinkStore Soporte <soporte@thinkstore.com.ve> (opcional)

IMPORTANTE

- La service_role de soporte nunca debe ponerse en support-config.js ni en el navegador.
- Los cambios de pedidos desde Enterprise reutilizan admin-update-order; conservan historial y correos.
- El stock físico se administra desde Panel Multi-Rol; Enterprise muestra datos reales y abre ese módulo.
- Las campañas se envían desde el módulo oficial Marketing del Panel Multi-Rol para conservar Resend.
- No se borran ni mezclan tablas del Supabase principal.

PRUEBA RECOMENDADA

1. Crear una orden en Soporte y agregar una entrada de bitácora.
2. Abrir Enterprise, actualizar y confirmar que ambas aparezcan.
3. Cambiar el estado desde Enterprise y comprobarlo en Soporte.
4. Cambiar un pedido desde Enterprise y confirmar estado, historial y correo.
5. Editar el nombre/teléfono de un cliente desde CRM y verificar en clientes.
6. Asignar técnico, presupuesto y garantía a una orden de soporte.
7. Subir una fotografía privada y abrirla desde la orden.
8. Enviar una actualización de soporte al correo de prueba.

MEJORAS DE LANZAMIENTO

- Recepción guarda checklist, firmas, color, contraseña recibida y observaciones.
- Gestión real de técnico, presupuesto, garantía y logística.
- Archivos privados en Storage (bucket service-order-files).
- Auditoría separada de Soporte en service_audit_log.
- Enterprise muestra y modifica Soporte mediante el puente servidor a servidor.
