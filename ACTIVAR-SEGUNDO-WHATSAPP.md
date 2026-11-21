# Segundo WhatsApp de ThinkStore

Canal `meta-us`: **+1 555-780-5646**. El +58 conserva su configuración y su almacenamiento.

## Preparación

1. Ejecutar `MIGRACION-WHATSAPP-SEGUNDO-CANAL.sql` en el proyecto principal. Es una transacción aditiva e idempotente: crea tablas y funciones del canal US sin modificar registros existentes. Solo el servidor con `service_role` tiene acceso.
2. Para usar la misma aplicación **ThinkStore Mensajería**, configurar en Netlify únicamente estas variables en Production / Functions. La aplicación reutiliza internamente las credenciales privadas que ya están en el servidor. No copia ni devuelve sus valores al navegador ni al repositorio.

| Variable | Valor |
| --- | --- |
| `WHATSAPP_US_USE_PRIMARY_APP` | `true` |
| `WHATSAPP_US_PHONE_NUMBER_ID` | `1370682272805383` |
| `WHATSAPP_US_BUSINESS_ACCOUNT_ID` | `1604603670987071` |
| `WHATSAPP_US_ENABLED` | `true` |

3. Publicar la versión que admite este modo. La reutilización de `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` y `WHATSAPP_VERIFY_TOKEN` solo ocurre con la bandera explícita anterior; el remitente y la cuenta de mensajes nunca se heredan del +58.
4. Seleccionar el +1 en Mensajería. El diagnóstico consulta en Meta la aplicación asociada al token, el remitente, su cuenta, la suscripción y el callback efectivo. Solo administración puede autorizar la conexión. El botón exige confirmación explícita y no envía mensajes. Si falta acceso a ese activo, asignarlo primero en Meta al usuario del sistema/aplicación propios mediante su flujo de autorización.
5. En modo compartido, la suscripción de la cuenta del +1 usa el callback global existente. El webhook firmado identifica el remitente de cada evento y guarda los datos en su canal. No cambia el callback global ni la cuenta del +58. Los proveedores existentes conservan sus propias suscripciones. Para una aplicación independiente, dejar la bandera en `false`, configurar `WHATSAPP_US_ACCESS_TOKEN`, `WHATSAPP_US_APP_SECRET`, `WHATSAPP_US_VERIFY_TOKEN` y `WHATSAPP_US_GRAPH_VERSION`, y utilizar el callback alternativo `https://thinkstore.com.ve/.netlify/functions/whatsapp-us-webhook` solo para la suscripción de esa aplicación. Referencia: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/override
6. Hacer una prueba entrante desde un teléfono del propietario, verificar que aparece solo en el canal +1 y enviar una respuesta de prueba autorizada. Confirmar el estado en Meta antes de activar atención automática.

## Comportamiento

- Contactos, historial, lecturas, notas, borradores, configuración de IA y reservas de envío independientes.
- Respuestas manuales y archivos dentro de la ventana de atención. Para iniciar un contacto se elige una plantilla aprobada; el envío individual del operador no exige una palabra clave ni inscribe al contacto en campañas. Debe utilizarse para comunicaciones que el destinatario haya aceptado recibir. Las bajas registradas en cualquiera de los dos números bloquean ese envío. Las campañas mantienen su selección de destinatarios autorizados.
- La biblioteca y las plantillas consultadas pertenecen al canal seleccionado.
- Las automatizaciones existentes de citas, pagos y campañas siguen usando el +58. Las difusiones del +1 quedan bloqueadas hasta integrar ese flujo.
- La IA automática del canal nuevo comienza desactivada. Necesita créditos de OpenAI por separado.
- Los mensajes antiguos de otros proveedores no se importan mediante la conexión del webhook.

## Validación

90 pruebas específicas de WhatsApp aprobadas antes de publicación, incluyendo concurrencia sin mutar el entorno del proceso, credenciales y tablas aisladas, remitente esperado, autenticación y firma del webhook. La prueba de entrega real requiere completar los pasos de Meta y configuración privada.
