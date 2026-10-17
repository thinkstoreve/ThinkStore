# ThinkStore Enterprise — cierre de correcciones, pendiente de despliegue

## Alcance
Base original: ThinkStore-main (4).zip. Cambios integrados exclusivamente en:
- growth-enterprise/app.js
- growth-enterprise/netlify/functions/enterprise-finance.js
- netlify/functions/enterprise-finance.js (espejo de la función)

Las demás aplicaciones y archivos permanecen como en la base. Este ZIP es el árbol completo, **no un parche suelto**. No implica que Netlify esté actualizado.

## Correcciones incluidas
- Título Operación; presentación de Efectivo USD/Bs dentro de Caja Chica (cuentas ya creadas en Supabase Principal con saldo de apertura 0).
- Paneles explicativos para cifras agregadas, sin inventar transacciones faltantes.
- Auditoría/diagnósticos de solo lectura de abonos de Soporte, pagos parciales online y estado de las consultas.
- Trazabilidad informativa de métodos de pago y movimientos no identificados; sin autocorrección de saldos.
- No se alteró la ruta de cobros de Staff ni las comisiones, inventario, Resend ni las órdenes.

## Confirmaciones de datos aportadas mediante SQL Editor
- Soporte: orden TS-DA53AC91, precio final 120 USD, abonado neto 60 USD, crédito pendiente 60 USD, vencimiento acordado 2026-11-02.
- Principal: liquidación rectificada a collected_usd=60, metadatos de conciliación guardados; comisión técnica 7.50 USD pendiente, sin cambiar.
- Caja Chica: 6 movimientos identificados para la orden, 3 in y 3 out en VES, neto 0 VES.
- Soporte: 2 anulaciones de 60 USD con cash_sync_status pending. NO sincronizar ni generar egresos automáticamente hasta identificar el destino de caja.
- Principal: tres liquidaciones de reparaciones, con importes cobrados 60, 70 y 160 USD; Soporte reportó 60 pendientes solo en la orden de crédito.
- Principal: ts_staff_cash_movements, ts_order_payments y orders registraron 0 filas; hay 1 sesión Staff, 1 auditoría Staff, 0 cierres y 12 movimientos Enterprise.

## Diferencias abiertas; no se inventó corrección
- Las cifras históricas Staff 160 USD vs Enterprise 120 USD en cuentas por cobrar no están comparadas todavía en el mismo instante / ventana temporal. No introducir ajuste manual de 40 USD.
- Pago Móvil +0.14 USD y Sin definir -0.14 USD: origen sin verificación definitiva. El diagnóstico registra trazabilidad disponible, sin alterar la contabilidad.
- Revisar interfaz y permisos con sesiones reales después de desplegar; las pruebas locales no prueban red ni Supabase en vivo.

## Pruebas locales ejecutadas
- node --check de los tres JavaScript modificados: correcto.
- node --test tests/*.test.js: 76/76 correctas, sin fallas.

## Antes de publicar
- Hacer copia verificable del deploy previo.
- Revisar en Netlify la configuración de carpeta base, directorio de publicación y las funciones para evitar publicar la raíz incorrecta.
- Comprobar que la función enterprise-finance.js desplegada corresponde a la app del sitio; mantener secretos fuera del ZIP.
- Probar con acceso autorizado: cobrado 60 y por cobrar 60 para TS-DA53AC91; vencimiento 2026-11-02; cuentas físicas y detalles; conexión de Soporte, Staff y tienda.
- NO reejecutar los SQL de alta de cuentas ni el SQL de rectificación del crédito.
