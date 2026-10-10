# ThinkStore Main V15.27 · Destinos bancarios en App Ventas

## App Ventas
- Nuevo selector por grupos: **Bancos nacionales**, **Bancos extranjeros**, **Pago rápido**, **Efectivo** y **Combinado**.
- Cada cobro bancario/electrónico permite seleccionar la cuenta real donde ingresa el dinero.
- Pagos combinados admiten hasta 3 métodos y cada tramo conserva su propia cuenta destino.
- El último tramo sigue calculándose automáticamente.
- Logos bancarios compactos; Banco de Venezuela, Banesco, Venezolano de Crédito y Banco Pichincha usan PNG transparentes preparados para la interfaz.

## Destinos disponibles
- VES: Banco de Venezuela, Banesco, BNC, Bancamiga, Venezolano de Crédito.
- USD: Bank of America, Chase, Banco Pichincha · Ecuador, Zelle, Binance.
- Pago Móvil inicia en Bancamiga, pero Staff puede cambiar la cuenta.
- Zelle se asocia automáticamente a Zelle y USDT a Binance.

## Caja Chica / Enterprise
- Al aprobar una venta se registra un movimiento `sale_receipt` en la cuenta elegida.
- Los cobros de Servicio Técnico registran `service_receipt` por cada pago/abono.
- Cada movimiento utiliza una clave externa idempotente para no duplicar el dinero al refrescar o reintentar.
- Caja Chica suma esos cobros al disponible total sin convertirlos en un gasto/ingreso contable duplicado.

## Ventas online
- Pago Móvil, Zelle y USDT guardan automáticamente su destino configurado en el pedido.
- Al aprobar el comprobante, Enterprise coloca el importe en la cuenta correspondiente.

## SQL requerido
Ejecutar en el **Supabase principal** antes de probar:
`MIGRACION-MAIN-V15.27-DESTINOS-PAGO-CUENTAS.sql`

La migración es aditiva: no borra saldos, pedidos ni movimientos existentes.
