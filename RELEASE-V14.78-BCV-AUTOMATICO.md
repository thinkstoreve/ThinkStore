# ThinkStore Main V14.78 · BCV automático

**Incluye íntegramente V14.77 (foto de perfil Staff) y V14.76 (venta presencial unificada).**

## Nueva función
- Tasa **oficial USD → Bs. vigente**, con fecha valor publicada por el BCV (no la tasa de mañana anunciada hoy).
- Verificación automática cada **60 segundos** por pestaña activa, al volver a la ventana y al recuperar internet.
- Conversor centralizado en `ts-fx.js`, usado por checkout web, Staff, panel Admin y venta presencial.
- BCV visible en cabecera de Staff; el módulo de cobro muestra monto en Bs. y fecha de vigencia.
- `fx-rate-core.js` centraliza la consulta: primario `bcv.today/api/v1/rate.json`; respaldo mismo dataset vía CDN jsDelivr. Ambos son **servicios externos no oficiales** que copian la publicación del BCV; no se declara acceso directo al sitio del BCV.
- No se usan tasas numéricas fijas. Si no es posible verificar, se informa y se bloquea la confirmación de nuevos pagos en Bs.
- Revalidación en servidor al crear una venta y nuevamente al confirmar su pago. Si cambia la tasa entre ambos pasos, el vendedor/administrador deberá verificar el monto actualizado y confirmarlo expresamente.
- Cada pedido guarda la tasa, fecha valor, fuente y última verificación. Pedidos históricos NO son recalculados.

## Instalación
1. Ejecuta `MIGRACION-V14.78-TASA-BCV.sql` **una sola vez** en Supabase **principal** (antes del deploy).
2. Despliega **todo el directorio ThinkStore-main** en el sitio Netlify Main, **incluyendo `netlify/functions`**.
3. Asegúrate de que las funciones Netlify estén activas y consulta `/.netlify/functions/exchange-rate`; debe devolver `ok:true`, `effective_date` y `stale:false`.
4. En Staff, verifica cabecera BCV y cálculo Pago Móvil. Prueba venta simulada de bajo monto y su confirmación. Comprueba `pedidos.total_bs` y `bcv_rate` en Supabase.

## Condiciones importantes
- No hay conexión push o webhook del propio BCV; cambios se reflejan después de que el proveedor publique la tasa y el siguiente sondeo la detecte. El intervalo de consulta es ~1 min, sujeto a conectividad y caché del proveedor.
- El precio de los productos y comisiones sigue registrado en USD.
- Enterprise y Soporte son **dominios de despliegue independientes**; esta versión actualiza el código fuente incluido dentro de Main, pero NO publica automáticamente aquellos sitios.
- No se pudo ejecutar una verificación real contra Supabase ni despliegue remoto.
