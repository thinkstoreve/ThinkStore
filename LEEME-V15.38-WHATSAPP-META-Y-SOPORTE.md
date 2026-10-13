# ThinkStore V15.38 · WhatsApp Meta y avisos de Servicio Técnico

## Estado
Este release queda PREPARADO, NO publicado en Netlify ni aprobado por Meta. No se enviaron mensajes reales.
Basado en el respaldo ThinkStore-main V15.37.6. Aplique el PARCHE sobre la rama actual, no reemplace a ciegas un `main` más nuevo.

## Integraciones preparadas
1. Plantillas oficiales Meta (8 mensajes de utilidad propuestos). Meta puede aprobar, rechazar o reclasificar cada una.
2. Soporte: recepción, cotización, diagnóstico, cambio de estado, bitácora visible al cliente y equipo listo: el mismo evento que disparaba correo solicita también el aviso WhatsApp. No cambia correos existentes.
3. Cita web: el notificador de Soporte intenta WhatsApp una vez que confirma el aviso de cita al equipo.
4. Pedidos: cambios de estado desde Administración pueden disparar la plantilla de pedido con WHATSAPP_ORDER_NOTIFICATIONS_ENABLED=true.
5. Abonos: App Ventas comprueba que existe un evento de pago real con ID antes de solicitar la confirmación WhatsApp. No genera movimientos, ni descuenta stock.
6. Deuda financiada: tarea existente diaria de Netlify a las 09:00 hora Caracas; solo saldos vencidos y clientes opt-in; máximo 3 recordatorios espaciados por 72 h; desactivada hasta autorización.
7. Idempotencia: tabla `whatsapp_notification_outbox` con ID por tipo/evento. Evita duplicaciones por guardados repetidos. Un evento fallido se marca `failed` y NO se reenvía automáticamente; conciliar antes de reintentar.
8. Comandos `ACTIVAR` y `BAJA` del webhook ya existen y siguen operativos. Opt-in por categoría debe comunicarse claramente al cliente.

## Orden de publicación
1. Ejecutar MIGRACION-MAIN-V15.38-WHATSAPP-OUTBOX.sql en Supabase PRINCIPAL. Hacer respaldo y verificar que se creó la tabla.
2. Copiar el contenido de la carpeta `netlify/functions/` del parche al repositorio Main y los archivos `soporte/` a Soporte; revisar merge si GitHub está más actualizado.
3. Publicar Main en Netlify y después Soporte (si tiene un proyecto separado). No subir ZIP como drag&drop si las funciones requieren build.
4. Crear y solicitar revisión de las ocho plantillas en Meta WhatsApp Manager usando `WHATSAPP-META-PLANTILLAS-V15.38.json`. Idioma `es`. Verificar APROBADA una a una y los ejemplos de variables.
5. Main Netlify Environment variables requeridas: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET, WHATSAPP_GRAPH_VERSION, MAIN/SUPPORT SUPABASE URL y SERVICE_ROLE adecuados (ver V15.36), WHATSAPP_EVENTS_SECRET (secreto largo aleatorio compartido solo entre servidores), WHATSAPP_TEMPLATE_LANG=es. Soporte: WHATSAPP_EVENTS_SECRET (el mismo), THINKSTORE_MAIN_URL=https://thinkstore.com.ve.
6. SOLO tras aprobar plantillas, confirmar opt-ins de prueba y probar manualmente, configurar en Main: WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED=true, WHATSAPP_APPOINTMENT_NOTIFICATIONS_ENABLED=true, WHATSAPP_PAYMENT_NOTIFICATIONS_ENABLED=true y WHATSAPP_ORDER_NOTIFICATIONS_ENABLED=true. No activar a ciegas.
7. WHATSAPP_DEBT_AUTOMATION_ENABLED permanece false inicialmente. WHATSAPP_DEBT_TEMPLATE_NAME=ts_financiamiento_recordatorio_v2; WHATSAPP_DEBT_MIN_AGE_HOURS=24, WHATSAPP_DEBT_INTERVAL_HOURS=72, WHATSAPP_DEBT_MAX_REMINDERS=3, WHATSAPP_DEBT_DAILY_LIMIT=25. Probar con un cliente consentido y un saldo vencido antes de habilitar.
8. Asegurar que el cliente dio su teléfono y consentimiento explícito en WhatsApp, incluyendo avisos de reparación y recordatorios de saldo. No importar clientes preexistentes como opt-in. BAJA detiene todos los avisos.

## Pruebas y límites
* Ejecutar desde raíz `node --test tests/*.test.js`.
* Los mensajes usan plantillas incluso fuera de 24 horas: nunca envía texto libre automático por este flujo.
* Meta cobra según sus tarifas; configurar límites y monitorear calidad/errores y estados `delivered`/`read` por webhook.
* Los avisos de cuenta por cobrar son de transacciones reales, no mensajes de cobro agresivo. Los pagos no se exigen por WhatsApp y el cliente puede solicitar verificación.
* No se exponen tokens privados de seguimiento, documentos de identidad, números completos bancarios ni fotos en las plantillas.
* El estado `sent` refleja aceptación de API, NO entrega confirmada; verificar estados de webhook.
* Pedidos: el mensaje se conecta a actualizaciones de estado desde el panel administrativo; verificar aparte el flujo de creación inicial de compras en línea antes de prometer envío en ese evento.
