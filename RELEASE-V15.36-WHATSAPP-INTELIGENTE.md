# ThinkStore Main V15.36 · WhatsApp inteligente

## Incluye
- Webhook oficial para WhatsApp Business Platform / Cloud API.
- Respuestas automáticas Thinky por WhatsApp a consultas de productos, accesorios, Servicio Técnico, pagos, envíos, Trade-In, agenda y software.
- Búsqueda en catálogo/Inventory y repuestos publicados.
- Comandos de privacidad: `BAJA`, `STOP` o `SALIR` pausan automatizaciones; `ACTIVAR` las reactiva.
- `ASESOR`, `HUMANO`, `PERSONA` o `AGENTE` marca la conversación para atención humana.
- Registro de mensajes y estados en Supabase principal.
- Recordatorios automáticos de saldos pendientes de Servicio Técnico y cuentas por cobrar de Enterprise que tengan WhatsApp, con control anti-repetición.
- Enterprise ahora permite guardar el WhatsApp al registrar una cuenta por cobrar.
- El recordatorio automático queda DESACTIVADO por defecto.

## SQL
Ejecutar `MIGRACION-MAIN-V15.36-WHATSAPP-INTELIGENTE.sql` en el Supabase PRINCIPAL.

## Variables Netlify requeridas
- `WHATSAPP_ACCESS_TOKEN` (token permanente / System User; nunca incluir en código)
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN` (texto secreto elegido por ThinkStore)
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_GRAPH_VERSION` (versión indicada actualmente por Meta)
- `THINKSTORE_PUBLIC_URL=https://thinkstore.com.ve`

## Recordatorios de saldo
Variables opcionales:
- `WHATSAPP_DEBT_AUTOMATION_ENABLED=false` (cambiar a `true` solo después de probar)
- `WHATSAPP_DEBT_TEMPLATE_NAME=thinkstore_saldo_pendiente`
- `WHATSAPP_TEMPLATE_LANG=es_VE`
- `WHATSAPP_DEBT_MIN_AGE_HOURS=24`
- `WHATSAPP_DEBT_INTERVAL_HOURS=72`
- `WHATSAPP_DEBT_MAX_REMINDERS=3`
- `WHATSAPP_DEBT_DAILY_LIMIT=25`

Plantilla recomendada de utilidad (4 variables):
`Hola {{1}}. Te recordamos que la orden {{2}} mantiene un saldo pendiente de {{3}} por {{4}}. Si ya realizaste el pago, ignora este mensaje o responde a este chat para verificarlo. ThinkStore.`

La plantilla debe ser creada y aprobada en Meta antes de activar los recordatorios salientes.

## Webhook Meta
URL: `https://thinkstore.com.ve/.netlify/functions/whatsapp-webhook`
Token de verificación: exactamente el valor configurado en `WHATSAPP_VERIFY_TOKEN`.
Suscribir el webhook al campo de mensajes de WhatsApp.
