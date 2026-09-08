ThinkStore V13.40 — Proyecto completo + conversión BCV
Base: ThinkStore V13.39; Soporte consolidado desde V7.24.

Tienda: catálogo, inventario y precios base continúan en USD.
Checkout: Pago Móvil y Punto de venta muestran el equivalente en VES.
El pedido conserva total_usd y utiliza el campo total_bs existente.
La venta administrativa vuelve a consultar la tasa en el servidor.
Soporte y Enterprise: conversor en Ventas/Cotizaciones; no se altera
la lógica de órdenes ni se confirma automáticamente ningún pago.

Fuente: DolarApi, cotización oficial BCV; opcional BCV_API_KEY para
bcvapi.cc. No se incluye ninguna clave privada ni tasa numérica fija.
Si la consulta falla y no hay una tasa reciente válida, se informa
que no está disponible. No se inventa un valor ni se convierte a cero.
La fecha y fuente se muestran al usuario.

No requiere SQL nuevo para esta modificación.
Para probar funciones en la Mac, usar Netlify Dev con el proyecto
correspondiente; Live Server no ejecuta las funciones Netlify.
No se ha publicado ni verificado contra la base de datos de producción.
Revisar métodos, montos y comprobantes antes de recibir pagos.
