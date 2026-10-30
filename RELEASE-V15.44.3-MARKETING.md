# ThinkStore · Marketing por WhatsApp · V15.44.3

Sección de campañas, registro de autorizaciones y difusión por WhatsApp. No se enviaron campañas reales durante la implementación.
La migración de campañas y consentimientos se aplicó en Supabase principal el 30/10/2026.
Base: main c2182c4 (plantillas individuales ya publicadas).

## Cambios

- Marketing del panel incorpora un enlace a /whatsapp-marketing.html.
- Selección de hasta 250 contactos autorizados por campaña, búsqueda y selección de visibles.
- Solo plantillas de marketing aprobadas en Meta y sus variables; vista previa antes de enviar.
- La campaña se guarda sin enviar mensajes. El botón «Enviar difusión» inicia el envío por destinatario.
- Progreso e historial persistentes, pausa y reanudación. La pantalla debe permanecer abierta mientras envía; no hay campañas programadas.
- Revalidación de la autorización y aprobación de plantilla antes de cada envío.
- Referencia determinista por campaña y teléfono para impedir dobles envíos al recargar o continuar.
- Los casos sin confirmación no se reenvían automáticamente. «Enviado a Meta» significa aceptación por la API, no entrega confirmada al teléfono.
- Registro manual de autorización o baja obtenida durante atención presencial, formulario, WhatsApp o documento, con fecha y evidencia obligatorias. Registro auditado del usuario.
- El cliente también puede autorizar enviando PROMOCIONES. BAJA revoca marketing y avisos de servicio. No se presume consentimiento por compras, contactos o avisos de servicio anteriores.

## Publicación

1. Aplicar MIGRACION-MAIN-V15.44.3-MARKETING-WHATSAPP.sql en Supabase PRINCIPAL. Crea dos tablas privadas para campañas y consentimientos, sin modificar órdenes, ventas o cobros.
2. Copiar el contenido del paquete de cambios sobre la raíz del repositorio ThinkStore, conservando las carpetas. No subir el ZIP como archivo al repositorio.
3. Publicar todos los cambios juntos. No requiere modificar Inventory ni Think Care, ni nuevas credenciales.
4. Abrir /panel#marketing → Marketing por WhatsApp, o /whatsapp-marketing.html.
5. Comprobar carga de plantillas, contactos y registro de una campaña antes de iniciar envíos reales.

Validación realizada: 267 pruebas automatizadas aprobadas, sintaxis del script de la página comprobada y git diff --check sin errores.
