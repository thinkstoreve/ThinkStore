# ThinkStore Main V14.89 · Soporte SSO + App Ventas restaurado

Base: V14.88 Main + Soporte unificado.

## Restaurado
- Servicio Técnico abre dentro del Main en `/soporte/panel.html`.
- El SSO de Soporte usa `token_hash` de un solo uso y `verifyOtp`; ya no depende de `redirect_to` externo.
- App Ventas vuelve a la presentación **Servicio Técnico · Cobros y abonos**.
- Resumen simple: **Pendiente por cobrar** y **Cobrado**.
- Pestañas: **Pendientes por cobrar / Cobradas / Todas**.
- Accesos rápidos: **Nueva venta** y **Cobrar reparación**.
- Mantiene abonos, cobro final atómico V8.8.8, consumo de repuestos, historial y nota de entrega.

## No requiere SQL nuevo
Se conservan los cuatro SQL V8.8.8 ya preparados para Supabase Soporte.
