# Segundo WhatsApp de ThinkStore

Canal `meta-us`: **+1 555-780-5646**. El +58 conserva su configuración y su almacenamiento.

## Preparación

1. Ejecutar `MIGRACION-WHATSAPP-SEGUNDO-CANAL.sql` en el proyecto principal. Es una transacción aditiva e idempotente: crea tablas y funciones del canal US sin modificar registros existentes. Solo el servidor con `service_role` tiene acceso.
2. Autorizar la aplicación propia de ThinkStore para gestionar y enviar mensajes en la cuenta de Meta correspondiente al +1. Usar un token de esa aplicación con acceso a ese activo; las credenciales de OpenAI no sirven para WhatsApp. No copiar claves a chats ni al repositorio.
3. Configurar en Netlify, contexto Production / Functions:

| Variable | Valor o procedencia |
| --- | --- |
| `WHATSAPP_US_PHONE_NUMBER_ID` | `1370682272805383` |
| `WHATSAPP_US_BUSINESS_ACCOUNT_ID` | `1604603670987071` (cuenta de mensajes Thinkstore - Zoho Corporation, verificar acceso de la aplicación) |
| `WHATSAPP_US_ACCESS_TOKEN` | Token privado con acceso al activo +1 |
| `WHATSAPP_US_APP_SECRET` | Secreto privado de la aplicación que firma los eventos de ese canal |
| `WHATSAPP_US_VERIFY_TOKEN` | Token privado de verificación del webhook |
| `WHATSAPP_US_GRAPH_VERSION` | Versión de Graph habilitada para la aplicación |
| `WHATSAPP_US_ENABLED` | Mantener `false` hasta verificar el webhook; cambiar a `true` al terminar la configuración |

4. Registrar y verificar el callback `https://thinkstore.com.ve/.netlify/functions/whatsapp-us-webhook` con el token de verificación del canal. Si se usa la misma aplicación del +58, conservar su callback global y establecer un callback alternativo exclusivo para la cuenta del +1 mediante `override_callback_uri` y `verify_token` al suscribir esa cuenta en `/{WABA-ID}/subscribed_apps`. Verificar la suscripción de la aplicación ThinkStore Mensajería (`1316000427204759`) y el callback alternativo mediante GET antes de habilitar envíos. No reemplazar el callback global del +58 ni desconectar otros proveedores como paso de prueba. Referencia oficial: https://www.postman.com/meta/whatsapp-business-platform/request/un84tul/override-callback-url
5. Tras aplicar la configuración de Functions, seleccionar el +1 en `whatsapp-care.html`. El diagnóstico debe mostrar el número correcto, firma, verificación y almacenamiento disponibles. Las acciones del canal permanecen bloqueadas si falta configuración o si el identificador de teléfono no coincide.
6. Hacer una prueba entrante desde un teléfono del propietario, verificar que aparece solo en el canal +1 y enviar una respuesta de prueba autorizada. Confirmar el estado en Meta antes de activar atención automática.

## Comportamiento

- Contactos, historial, lecturas, notas, borradores, configuración de IA y reservas de envío independientes.
- Respuestas manuales y archivos dentro de la ventana de atención; fuera de ella se utilizan plantillas aprobadas y consentimiento registrado.
- La biblioteca y las plantillas consultadas pertenecen al canal seleccionado.
- Las automatizaciones existentes de citas, pagos y campañas siguen usando el +58. Las difusiones del +1 quedan bloqueadas hasta integrar ese flujo.
- La IA automática del canal nuevo comienza desactivada. Necesita créditos de OpenAI por separado.
- Los mensajes antiguos de otros proveedores no se importan mediante la conexión del webhook.

## Validación

73 pruebas específicas de WhatsApp aprobadas antes de publicación, incluyendo concurrencia sin mutar el entorno del proceso, credenciales y tablas aisladas, remitente esperado, autenticación y firma del webhook. La prueba de entrega real requiere completar los pasos de Meta y configuración privada.
