ThinkStore V13.66 · PRE-DEPLOY

BASE
V13.65 acumulativa.

POLÍTICA DE GARANTÍA
Se restauró la política previamente definida y ahora aparece:
- En la Nota de Entrega abierta/imprimible.
- En el HTML del correo de Nota de Entrega.
- En la versión de texto del correo.
- En Venta Presencial, para que el vendedor vea las mismas condiciones.

Texto aplicado:
La garantía cubre fallas de funcionamiento atribuibles al equipo durante el plazo indicado. No cubre golpes, humedad, manipulación externa, accesorios de terceros ni intervenciones no autorizadas. La evaluación técnica determina la procedencia.

Cada producto sigue mostrando sus días de garantía individuales.

PAYMENT LOCK
El SQL acumulativo V13.66 incluye ahora supabase_v12_payment_lock.sql.
Esto resuelve el error de desbloqueo de decisiones de pago.

SQL RECOMENDADO ANTES DEL DEPLOY
supabase_v13_66_DEPLOY_ACUMULATIVO.sql

Incluye:
1. Bloqueo/desbloqueo seguro de decisiones de pago.
2. Unidades físicas y asignación de serial/IMEI.
3. Versionado/invalidez de Nota de Entrega.
4. Descuentos de venta presencial.

FLUJO DE NOTA DE ENTREGA
La nota permanece bloqueada hasta que:
- el pago esté confirmado, y
- todas las unidades físicas estén asignadas.

DESCUENTOS
Se conserva subtotal original, descuento, motivo y total final.
La Nota de Entrega refleja el precio final real.
