# Marketing y atención nativa de ThinkStore

La bandeja funciona con el canal oficial de WhatsApp Cloud API de ThinkStore. No requiere Wati.

## Plantillas

«Crear plantillas» abre una biblioteca guardada en el servidor: nuevas plantillas, edición, eliminación, generación con IA y uso en el editor. Las plantillas de esta biblioteca son textos reutilizables. Para iniciar una conversación fuera de la ventana de 24 horas siguen siendo necesarias las plantillas aprobadas por Meta y las autorizaciones correspondientes; «Campañas y plantillas» conserva ese flujo. No se ha configurado ningún envío de campañas automático desde esta biblioteca.

## IA automática

Configurar en Netlify, únicamente como variables privadas de funciones:

- `OPENAI_API_KEY`: clave de API de OpenAI; ChatGPT Plus no proporciona esta clave.
- `THINKSTORE_AI_MODEL`: opcional, predeterminado `gpt-4.1-mini`.
- `WHATSAPP_APP_SECRET`: firma de los eventos recibidos desde Meta.
- Las credenciales existentes del canal oficial y de Supabase permanecen necesarias.

Administración puede activar «IA automática». Se guarda en el servidor y funciona con la página cerrada. Responde solo a nuevos mensajes de texto recibidos hace menos de cinco minutos, nunca inicia campañas. Las conversaciones en atención humana siguen en pausa hasta usar «Asignar IA automática». Las solicitudes guiadas ya activas tienen prioridad. Si el usuario pide una persona, se pausa. Responder desde el editor también pasa la conversación al equipo.

Antes de generar se reserva el ID del mensaje; si el envío queda sin confirmar no se reintenta automáticamente. Un fallo pausa el chat para revisión del equipo. Se revalida la atención humana y la configuración antes de enviar. Las respuestas no confirman citas, pagos ni acciones privadas y no solicitan contraseñas. Se envía a OpenAI un máximo de diez mensajes de texto, excluyendo notas internas, con `store:false`.

No hay una clave de IA incorporada al código. Sin las credenciales, la interfaz indica la configuración pendiente y no permite activar el envío automático.
