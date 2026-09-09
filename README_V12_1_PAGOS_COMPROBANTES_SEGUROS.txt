THINKSTORE V12.1 — COMPROBANTES + BLOQUEO DE PAGOS

CORRECCIONES INCLUIDAS
1. Ver comprobante ya no reutiliza enlaces firmados vencidos.
   - El panel solicita una URL firmada NUEVA cada vez que se pulsa Ver comprobante/Abrir.
   - La URL dura 10 minutos.
   - Los comprobantes existentes que guardaron accidentalmente una URL firmada completa se normalizan en servidor.

2. Aprobar/Rechazar pago queda bloqueado después de la decisión.
   - Ambos botones pasan a gris/deshabilitado.
   - El bloqueo se guarda en Supabase y persiste al recargar o entrar desde otro equipo.
   - El backend impide revertir un pago aprobado o continuar un pago rechazado sin desbloqueo.

3. Desbloqueo de Gerencia.
   - Botón “Desbloquear decisión”.
   - Motivo obligatorio.
   - Código validado en Netlify Function, nunca expuesto en JavaScript del navegador.
   - Solo Gerencia/Admin/Super Admin puede desbloquear.
   - Se registra en order_status_history y admin_audit_log cuando esas tablas existen.

PASO OBLIGATORIO EN SUPABASE
Ejecutar: supabase_v12_payment_lock.sql

VARIABLE DE ENTORNO EN NETLIFY
Agregar:
THINKSTORE_MANAGER_CODE = <tu código privado de gerencia>

Si no defines THINKSTORE_MANAGER_CODE, el backend usa THINKSTORE_ADMIN_CODE como respaldo si ya existe.
No pongas este código dentro de panel.html ni script.js.

ARCHIVOS PRINCIPALES MODIFICADOS
- panel.html
- netlify/functions/admin-data.js
- netlify/functions/admin-update-order.js
- netlify/functions/admin-receipt.js (nuevo)
- supabase_v12_payment_lock.sql (nuevo)
