# ThinkStore Main · V14.76 · Staff con venta presencial unificada

Base: ZIP ThinkStore-main (9)(1) del 05-10-2026, con despliegue FINAL V14.75.

## Cambio visible

En `/staff/` > Vender se usa el mismo recorrido de `venta-presencial.html`:
1. Datos del cliente (sin obligarlo a registrarse).
2. Selección de productos desde el mismo catálogo y stock con variantes, lector de código y Pre-Order. El carrito sigue accesible.
3. Pago y entrega con Efectivo USD, Pago Móvil, Zelle, descuento, entrega, nota, guardar en espera o confirmar pago.

La pantalla se adapta a escritorio/iPad/teléfono. Al terminar, permite una nueva venta desde el paso 1.

## No se duplican operaciones

Staff conserva autenticación por usuario y permisos, la creación de pedido existente (`admin-create-sale`) y la confirmación (`admin-update-order`).
No se introduce otra base de datos, tabla, orden de ventas ni SQL nuevo.
Cada transacción sigue registrada en el sistema principal y conserva `pos_source = staff_app` para Enterprise.

## Publicación

Desplegar este ZIP **solo** en el sitio Netlify principal de ThinkStore y de forma completa, sin copiar una carpeta por separado. Requiere las migraciones correspondientes al conjunto FINAL V14.75 ya descritas en `00-LEEME-DEPLOY-FINAL.txt`.

No publicar antes de respaldar el despliegue anterior y comprobar que la versión en producción coincide con la base utilizada.

## Pruebas después del deploy

1. Abrir `/staff/`, entrar como cuenta interna con permiso `staff.access` y `ventas`.
2. Abrir Vender: confirmar que inicia en Cliente y valida los datos.
3. Seleccionar stock y una Pre-Order, revisar carrito y pasar al pago.
4. Comprobar pago móvil (monto Bs), Zelle, referencia, entrega y descuento.
5. Guardar en espera y comprobar que aparece una sola venta `Pago por verificar`.
6. Crear una nueva venta y confirmar; verificar un único código TS y vendedor atribuido.
7. Revisar Admin, inventario y Enterprise para comprobar misma transacción y montos.
8. Verificar el flujo en iPhone/iPad y refrescar la PWA para actualizar el service worker.

Sin una sesión y los datos de Supabase de producción no se pueden validar ventas reales ni el despliegue desde este archivo.
