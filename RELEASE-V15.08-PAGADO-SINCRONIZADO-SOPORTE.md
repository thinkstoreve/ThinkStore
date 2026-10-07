# ThinkStore V15.08 — Pagado sincronizado en Recepción

## Corrección principal
- Al completar una reparación desde App Ventas, `payment_status` se normaliza automáticamente a **Pagado**.
- Se conserva el estado técnico de la orden (Recibido, En reparación, Listo, etc.); el pago aparece como estado financiero independiente.
- Recepción muestra una insignia verde **✓ Pagado** debajo del estado técnico.
- Los abonos muestran **Abono parcial** y las órdenes sin cobro **Pendiente**.

## Sincronización automática
- El panel de Soporte consulta únicamente los campos de cobro de `service_orders` cada 6 segundos.
- Si App Ventas cobra desde otra pestaña o dispositivo, Recepción, Órdenes, Área Técnica, Ventas, Logística y Dashboard se actualizan sin recargar manualmente.
- Se mantiene el polling de notificaciones por separado.

## Compatibilidad
- No requiere SQL nuevo: el backend normaliza `Cobrado` -> `Pagado` al finalizar el cobro aunque el RPC instalado sea el anterior.
- El SQL incluido también queda actualizado para instalaciones futuras.
- Los cobros parciales siguen usando `Abono parcial`.
