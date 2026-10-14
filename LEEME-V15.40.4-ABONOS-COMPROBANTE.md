# ThinkStore V15.40.4 — Abonos reales y comprobante provisional

**Estado:** parche preparado. No se instaló en GitHub, Netlify ni Supabase; no se registró ningún cobro. Basado en V15.40.3.

## Cambio de comportamiento

- **App Ventas → Reparaciones → Registrar abono:** el botón ya no queda silenciosamente inactivo al tener `0,00`; al pulsarlo informa que primero se debe introducir el dinero realmente recibido. El importe permanece **vacío** al abrir, por seguridad.
- Permite introducir `20`, `20,00`, `20.00`, `1.234,56` o `1,234.56`; interpreta las cifras en el cliente, y envía el valor numérico al servidor. El servidor comprueba que el monto sea positivo, no supere la deuda, conserve máximo 2 decimales y coincida con el saldo previamente leído.
- Se ve en tiempo real cuánto se distribuye y cuánto queda pendiente. Ejemplo: saldo previo USD 60 + dinero recibido hoy USD 20 = abonado total USD 80 / pendiente USD 40. No existe cobro automático de los USD 40 restantes.
- Conserva la confirmación `RECIBIDO xx.xx` para registrar dinero real. Pago combinado sigue suspendido temporalmente para financiaciones y permanece la comprobación anticobros repetidos de V15.40.3 (última hora: mismo importe y método), que no sustituye idempotencia persistente.
- **Comprobante provisional de abonos**: solo disponible con abono confirmado y saldo pendiente. Muestra cliente, equipo, orden, total, abonado, deuda pendiente, vencimiento y las fechas/importes de los movimientos (incluidas anulaciones), y permite imprimirlo o guardarlo como PDF. No es Nota de Entrega y no se envía automáticamente por correo.
- **Nota de Entrega definitiva**: sigue bloqueada mientras exista deuda; cuando un pago confirmado deja saldo cero, el flujo existente crea la nota y la envía al email del cliente. Se muestran total abonado, saldo 0 y fecha de cancelación.
- Los repuestos instalados **no se liberan ni se consumen otra vez** por emitir un comprobante. Tampoco se modifica el estado técnico al emitirlo.

## Archivos modificados

- `staff/repairs.js`
- `staff/index.html`
- `staff/sw.js`
- `netlify/functions/staff-repairs.js`
- `netlify/functions/service-payment-receipt-template.js` (NUEVO)
- `netlify/functions/service-delivery-note-template.js`
- `tests/financed-cash-safety.test.js`
- `tests/financed-partial-note-flow.test.js` (NUEVO)

## Instalación y validación

1. Respaldar los archivos que vas a reemplazar en `main` y confirmar que el parche V15.40.3 está integrado en tu rama.
2. Integrar **todos** los archivos, respetando las rutas. `service-payment-receipt-template.js` debe quedar en `netlify/functions/`.
3. Verificar el deploy que sirve `/staff/` y las funciones de Netlify; actualizar caché con recarga forzada. No usar el ZIP de versiones anteriores encima de este.
4. Probar únicamente en un **pedido de prueba**, no en `TS-DA53AC91`: saldo USD 60, abono real USD 20 → recibido USD 80, deuda USD 40, sin Nota de Entrega y con comprobante imprimible.
5. Probar que pulsar `Registrar abono` con monto vacío muestra aviso y **no** crea movimiento, y que un importe superior al saldo se rechaza.
6. Probar un pago final real en la orden de prueba: cambia a Pagado, nota definitiva y correo una sola vez. Verificar integridad del inventario y conciliación de Caja/Enterprise; confirmar envío de Resend.
7. Verificar que la orden real `TS-DA53AC91` siga USD 60 recibidos / USD 60 pendientes, sin registrar ningún cobro de prueba.

## Limitaciones importantes

- Las 17 pruebas automatizadas de este parche son **locales**. Falta una prueba transaccional real en un entorno de prueba conectado a Supabase y Resend.
- No agrega una clave de idempotencia de cobros a nivel PostgreSQL; necesaria para garantizar que solicitudes simultáneas o reintentos no dupliquen cobros.
- La sincronización de Enterprise V15.40.3 todavía debe validarse en producción, particularmente para pagos parciales. Este parche no hace ajustes SQL de la orden real ni corrige pagos históricos.
- No se envían comprobantes provisionales automáticamente por correo; el correo de Nota de Entrega sigue reservado para pago completo.
