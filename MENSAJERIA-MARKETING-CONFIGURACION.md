# Bandeja de ThinkStore Marketing

Página: `/whatsapp-care.html`. Acceso desde WhatsApp Marketing → Bandeja de mensajes · IA.

## Funciones

Escritorio de cuatro columnas, diseño adaptable a móviles, respuestas manuales, ocho respuestas rápidas con búsqueda y atajos `/`, emojis, negrita, enlaces, notas internas y borradores por usuario guardados en el servidor. Las sugerencias de IA siempre se revisan en el editor antes de enviar.

Los avisos de citas, pagos y reparaciones de la tienda conservan su canal Meta y configuración actuales. El selector Wati es independiente; no migra ni sustituye el número oficial.

## Conexión Wati +1

Configurar como variables privadas de las funciones de Netlify:

- `WATI_API_BASE_URL`: origen regional HTTPS mostrado por Wati; por defecto `https://live-mt-server.wati.io`. Sin el tenant en la ruta para API v3.
- `WATI_API_TOKEN`: token con lectura de conversaciones y escritura de mensajes, según los permisos y plan de la cuenta.
- `WATI_CHANNEL_ID`: identificador exacto del canal WhatsApp +1.
- `WATI_CHANNEL_PHONE`: número completo del canal, con código internacional y solo dígitos.

Se usa API v3: listado de conversaciones por canal, historial por ID y envío de texto a conversación activa. El backend verifica el canal de cada historial antes de permitir un envío. Si Wati no devuelve el canal, rechaza el envío hasta verificar el contrato de esa cuenta. Debe probarse contra respuestas reales de la cuenta al activar sus credenciales. La interfaz consulta los cambios cada ocho segundos con la página abierta; no es una integración por webhooks.

HTTP 200 solo significa aceptación por Wati. La entrega se consulta en el historial del proveedor. Un envío de resultado desconocido queda bloqueado para evitar duplicados y debe reconciliarse manualmente en Wati. Fuera de la ventana de atención se utiliza una plantilla aprobada desde Wati; no se altera ninguna autorización comercial.

## Sugerencias con IA

- `OPENAI_API_KEY`: clave privada del proyecto OpenAI.
- `THINKSTORE_AI_MODEL`: modelo compatible con Responses; por defecto `gpt-4.1-mini`.

Se envían como máximo doce mensajes de texto del chat, sin adjuntar la ficha del contacto ni las notas internas. `store:false`. La clave nunca se entrega al navegador. Las instrucciones limitan precios, existencias y confirmaciones a datos de referencia. El asesor revisa siempre el resultado. No hay respuestas automáticas ni envíos al generar una sugerencia. Si no se configura la clave se muestra el motivo y el editor manual permanece disponible.

## Persistencia y seguridad

Reutiliza la tabla protegida `whatsapp_message_log` y la autenticación interna existente. Borradores y notas tienen `direction=internal` y claves separadas por canal/conversación; los borradores también se separan por usuario. No requiere cambiar los permisos públicos ni ejecutar una nueva migración. Las reservas de envíos Wati no comparten claves con Meta.

Pruebas: `node --test tests/whatsapp-workspace.test.js tests/whatsapp-inbox.test.js`.
