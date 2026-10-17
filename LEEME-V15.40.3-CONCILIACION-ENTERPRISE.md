# ThinkStore V15.40.3 — Protección de abonos + conciliación Enterprise

**Estado:** paquete preparado y probado localmente. No está publicado en Netlify ni modifica Supabase por sí mismo.

## Incidencia confirmada

En `TS-DA53AC91`, Supabase Soporte registra correctamente USD 60 cobrados y USD 60 pendientes (2 repuestos consumidos), mientras que Supabase Principal / Enterprise volvió a mostrar USD 120 cobrados y `NULL` en el saldo pendiente.

En la función `netlify/functions/staff-repairs.js`, `syncEnterpriseServiceSettlement()` escribía `collected_usd: round(finalTotal)` incluso cuando la suma efectivamente cobrada (`order.amount_paid`) era menor, y sobrescribía `metadata` con un objeto que no conservaba `payment_reconciliation`. Un cierre nuevo podía volver a borrar una conciliación manual.

## Cambios incluidos

- Incluye todas las protecciones de V15.40.2 para abonos financiados: confirmación exacta `RECIBIDO xx.xx`, comprobación del servidor y alerta por pagos iguales y recientes; no hay pagos combinados en financiaciones mientras dure la revisión.
- **V15.40.3** ajusta la sincronización de `enterprise_service_settlements`:
  - `collected_usd` se obtiene de `order.amount_paid`, limitado al monto de la factura.
  - `metadata.payment_reconciliation.receivable_usd` = factura menos dinero recibido.
  - Se conservan los metadatos de auditoría y los campos preexistentes de conciliación.
  - Las nuevas entradas de comisión solo se crean cuando el importe de la factura ya está realmente cubierto. Las comisiones anteriores requieren revisión manual.
- No toca inventario; los 2 repuestos instalados se conservan consumidos.
- No realiza `UPDATE` en bases de datos ni registra pagos reales durante la instalación.

## Instalación segura

1. **Bloquear temporalmente cobros de reparaciones financiadas y respaldar los dos proyectos Supabase.**
2. Usar este único ZIP **V15.40.3** en GitHub `main` (no aplicar V15.40.2 por separado): copiar el contenido conservando rutas `staff/`, `soporte/`, `netlify/functions/` y `tests/`.
3. Confirmar los despliegues completos de Netlify Main y del sitio Soporte, con sus funciones actualizadas. No subir únicamente el HTML o los archivos de la carpeta `staff`.
4. Vaciar/refrescar Service Workers de Staff y Soporte si aún se muestran versiones anteriores.
5. Validar con **entorno y datos de prueba**, sin tocar la orden real: abono parcial con dinero recibido, prueba de cierre final autorizado, rechazo sin confirmación, prevención de cobro reciente duplicado y que Enterprise registre ingresos parciales correctamente.
6. Reconsultar **Supabase Soporte**, orden `TS-DA53AC91`, para verificar que permanece en USD 60 recibido / USD 60 pendiente, sin nuevos eventos.
7. **Solo después de confirmar la publicación**, si Enterprise sigue en USD 120 con `payment_reconciliation` ausente y se mantienen las validaciones previas, ejecutar el SQL ya preparado `ThinkStore-CORRECCION-TS-DA53AC91-2-ENTERPRISE.sql` en **Supabase Principal** una única vez, con respaldo y verificando sus condiciones. No ejecutar SQL de anulación en Soporte otra vez.
8. Comprobar liquidación, Caja Chica, Caja Staff, comisiones pendientes y, si corresponde, avisos enviados al cliente.

## Limitaciones

- Las validaciones locales **no demuestran** que la versión esté instalada ni funcionando en producción.
- V15.40.3 mitiga sobrescrituras en `enterprise_service_settlements`, pero no implementa una transacción entre dos proyectos Supabase ni una clave persistente de idempotencia. La protección completa contra pagos simultáneos exige cambios adicionales en el RPC de cobro.
- Si una corrección se aplica manualmente mientras otra sesión registra un pago, la lectura previa de metadatos puede competir con esa escritura. Por eso se solicita detener cobros durante la conciliación.
- No volver a pulsar `Registrar abono` en la orden real hasta que el cliente entregue dinero nuevo y esté validada la versión desplegada.
