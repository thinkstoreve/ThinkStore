# Instagram y plantillas de ThinkStore

La bandeja de `whatsapp-care.html` permite elegir Instagram. La conexión permanece pendiente hasta verificar credenciales, identidad y suscripción en Meta. El modo ocupado está desactivado por defecto y se guarda por canal.

## Conexión privada del servidor

Este módulo usa **Instagram API con Instagram Login**, no el token de WhatsApp ni el inicio de sesión de Facebook Pages. En la aplicación Meta de ThinkStore, añadir el producto Instagram, autorizar la cuenta profesional `@thinkstore_ve` y habilitar `instagram_business_basic` y `instagram_business_manage_messages`. No publicar credenciales en Git ni en el navegador.

Configurar en Netlify, ámbito Functions / Production:

| Variable | Valor |
| --- | --- |
| `INSTAGRAM_ACCOUNT_ID` | `user_id` profesional que devuelve `/me?fields=user_id,username`; corresponde a `entry.id` del webhook |
| `INSTAGRAM_USERNAME` | `thinkstore_ve` |
| `INSTAGRAM_ACCESS_TOKEN` | Token privado de Instagram Login con permisos de mensajes |
| `INSTAGRAM_APP_SECRET` | Secreto de la aplicación Instagram que firma los webhooks |
| `INSTAGRAM_VERIFY_TOKEN` | Valor privado para comprobar el callback |
| `INSTAGRAM_ENABLED` | `true` tras completar la configuración |
| `INSTAGRAM_GRAPH_VERSION` | Opcional, `v24.0` por defecto |
| `OPENAI_API_KEY` | Clave existente de API; la cuenta necesita saldo y acceso al modelo |

Callback: `https://thinkstore.com.ve/.netlify/functions/instagram-webhook`. Seleccionar el campo `messages` en el panel de Meta y suscribir la cuenta profesional a `/INSTAGRAM_ACCOUNT_ID/subscribed_apps`. Los permisos y requisitos de publicación se comprueban en el panel de Meta para esa aplicación. No marcar la conexión completada solo por configurar variables.

Los tokens de Instagram caducan: renovar antes de su fecha de expiración. Esta versión muestra fallos de autorización y no extrae ni expone los secretos. La autorización de la cuenta y la suscripción a mensajes requieren la aprobación de su administrador.

## Atención automática

El interruptor **Modo ocupado** atiende mensajes directos entrantes mientras la página está cerrada. Las respuestas se identifican como asistente automático, consultan las reglas y el catálogo de ThinkStore, y no confirman pagos, citas, precios ni existencias. No inicia chats a usuarios arbitrarios ni envía campañas de Instagram. Se aplica una ventana conservadora de 24 horas desde el mensaje del cliente.

Tomar la conversación, responder manualmente o recibir ASESOR, HUMANO, PERSONA, BAJA o STOP pausa la IA del chat. **Devolver a IA automática** reanuda la atención de su siguiente mensaje si el modo ocupado está activado. Los adjuntos y errores de generación se derivan al equipo. Un error de saldo de OpenAI se muestra como tal; no se confunde con una limitación temporal.

La recepción y generación se procesan en una función Netlify background con firma HMAC, controles de cuenta, reservas únicas y bloqueo breve por conversación. Un resultado de envío incierto no se repite. Los registros se guardan con dirección interna y un espacio de nombres propio en el almacenamiento privado existente, para no mezclarse con las alertas de WhatsApp. Borradores: por usuario, cuenta y conversación.

## Plantillas

La biblioteca guarda texto, pie y botón de enlace con vista previa. En WhatsApp, los mensajes manuales con enlace usan un botón CTA dentro de la ventana de respuesta; sin botón, el pie forma parte del texto. En Instagram los enlaces y el pie se insertan como texto.

Las plantillas aprobadas de WhatsApp mantienen su definición. **Editar copia: pie y botones** permite preparar otra versión, introducir ejemplos ficticios y enviarla a revisión de Meta. La original no cambia y la copia solo se utiliza tras aprobación. Las imágenes necesitan volver a cargarse como muestra para la revisión.

## Verificación

Pruebas: `tests/instagram-inbox.test.js`, `tests/marketing-template-options.test.js` y las pruebas existentes de WhatsApp. Comprobar conexión real y recepción de una consulta propia antes de activar atención automática en producción. Las pruebas automáticas no envían mensajes reales.

Referencias oficiales:
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api
- https://developers.facebook.com/documentation/instagram-platform/webhooks/setup
- https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-management
