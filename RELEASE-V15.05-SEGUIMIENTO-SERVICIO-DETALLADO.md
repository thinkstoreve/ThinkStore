# ThinkStore Main V15.05 · Seguimiento de Servicio Técnico detallado

Base: **ThinkStore Main V15.04 · Correos de Cuenta + info@**.

## Seguimiento privado por QR / número de orden
- Se conserva el portal privado existente y su integración con Supabase.
- QR nuevo: abre directamente con `orden + token privado`.
- Consulta manual: número de orden + últimos 4 dígitos del teléfono registrado.
- El serial / IMEI se entrega al navegador únicamente en formato enmascarado.
- Vista responsive renovada para móvil y escritorio.
- Encabezado con cliente, equipo, orden, estado, color, recepción, modalidad y última actualización.
- Progreso visual: Recibido → Diagnóstico → Cotización → Reparación → Pruebas → Listo → Entregado.
- Secciones detalladas: última actualización, diagnóstico, fotos, cotización, historial, mensajes, pago, entrega y garantía.
- Fotos públicas agrupadas por etapa y ampliables.
- Línea de tiempo con cambios visibles al cliente.
- Mensajería integrada con Soporte.
- Actualización automática del portal cada 15 segundos.

## Cotización desde el seguimiento
- Aprobar cotización conserva aceptación obligatoria de términos y registro de fecha/hora.
- Nueva opción **No aprobar** con comentario opcional.
- Aprobación y rechazo generan auditoría, nota visible y alerta a Soporte.
- El cliente recibe confirmación por correo de su decisión.

## Correos automáticos de Servicio Técnico
Se envían automáticamente únicamente en los hitos definidos:
1. Equipo recibido / orden creada.
2. Diagnóstico disponible.
3. Cotización enviada.
4. Cotización aprobada.
5. Cotización no aprobada.
6. Reparación iniciada.
7. Equipo listo para entregar.
8. Equipo entregado / servicio completado.

Los estados internos menores permanecen visibles en seguimiento sin generar correos automáticos. **Esperando repuesto** continúa disponible para aviso manual cuando haga falta.

## Recepción y estados
- Una nueva orden genera `public_token` seguro cuando el navegador lo soporta.
- Al crear la orden, el correo inicial de recepción se dispara automáticamente si el cliente tiene correo registrado.
- Nuevo estado **Diagnóstico disponible** en Soporte.
- Cada cambio de estado publica una actualización legible para el cliente en su historial.

## Nota de entrega / QR
- Corregido el QR para incluir siempre número de orden y, cuando exista, token privado.
- El QR apunta al portal de Soporte.
- Contacto de WhatsApp de la nota actualizado a **+58 414 103 2030**.

## Correos
- Se unificó el envío de actualizaciones con la plantilla premium existente de ThinkStore.
- Remitente/reply-to continúa en `soporte@thinkstore.com.ve`.
- Asuntos diferenciados para recepción, diagnóstico, cotización, aprobación, reparación, listo, entregado y no aprobado.

## Pruebas realizadas
- Validación de sintaxis de los archivos JavaScript modificados.
- Prueba simulada del portal: acceso público restringido, validación por últimos 4 dígitos, acceso por token, rechazo de teléfono incorrecto, enmascarado de serial y cálculo de saldo.
- Validación de los 8 asuntos/plantillas de correo y enlace seguro con orden + token.
- Validación del QR de Nota de Entrega.
- Verificación de sincronía de las funciones duplicadas Main/Soporte.

## Despliegue
- Desplegar este ZIP como nueva versión de **ThinkStore Main**.
- No requiere SQL nuevo.
- Mantener las variables existentes de Supabase y Resend.
- Recomendado: `SUPPORT_PUBLIC_URL=https://soporte.thinkstore.com.ve`.
