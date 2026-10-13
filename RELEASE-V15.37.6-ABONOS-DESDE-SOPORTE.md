# ThinkStore V15.37.6 — Abonos desde Soporte

- El cobro en «Gestionar» se envía a la función segura `support-record-payment` del proyecto **Main**.
- Main valida el JWT de Supabase Soporte y permite cobrar a administradores de Soporte; recepción requiere permiso explícito `pagos`.
- Usa el MISMO controlador `staff-repairs.js` de App Ventas: RPC atómico, eventos, BCV, notas, caja, consumo de inventario al completar el pago y sincronización Enterprise.
- Al finalizar vuelve a consultar los eventos y el saldo desde Supabase Soporte; si falla la confirmación advierte no repetir cobro.
- Los técnicos no pueden cobrar y guardar cambios técnicos nunca registra pagos.
- No incluye SQL ni modificaciones de datos históricos.

## Publicación segura

1. Copiar los archivos de este parche a `main` del repositorio ThinkStore, manteniendo rutas.
2. Publicar **Main** en Netlify y verificar que `/.netlify/functions/support-record-payment` exista (GET devuelve 405, sin credenciales).
3. Publicar **Soporte**, si es otro proyecto; confirmar que el sitio tenga acceso a `thinkstore.com.ve`.
4. Probar primero con una orden de prueba sin pagos. Confirmar el nuevo evento en `service_payment_events`, el saldo y la caja de Enterprise.
5. Nunca reintentar un cobro tras timeout sin consultar primero movimientos y referencia en caja.

**Roles:** admin/superadmin pueden cobrar; recepción únicamente con permiso explícito de cobros. No aceptar dinero de prueba de un cliente real.
