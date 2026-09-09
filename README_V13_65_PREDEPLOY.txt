ThinkStore V13.65 · PRE-DEPLOY acumulativo

BASE
V13.64, que ya contiene V13.61 + V13.62 + V13.63.

NUEVO: DESCUENTOS EN VENTA PRESENCIAL
- Tipo de descuento: monto USD o porcentaje.
- Campo de motivo comercial.
- Cálculo automático:
  subtotal original -> descuento -> total final.
- Pago Móvil calcula Bs sobre el total final.
- El pedido guarda subtotal, descuento y total final.
- Caja/dashboard continúan leyendo total_usd, ahora con el monto final real.
- Auditoría registra subtotal, descuento, motivo y total.
- La Nota de Entrega muestra subtotal, descuento y total final.
- Cambiar el descuento invalida una versión previa de la Nota de Entrega.

VENTAS YA CREADAS
- En Pedidos > venta presencial aparece “Aplicar descuento / Editar descuento”.
- Permite corregir una venta que quedó en espera antes de emitir la Nota de Entrega.
- No permite alterar una venta ya cerrada/entregada.

SERIAL EN VENTA PRESENCIAL
- Se restauró como campo opcional.
- Si tienes el equipo en la mano puedes registrar serial durante la venta.
- iPhone/teléfono: IMEI si registras serial.
- Pre-Owned: condición general.
- Salud de batería solo se exige en equipos donde aplica (iPhone/iPad/MacBook/Watch).
- Mac mini/iMac/Mac de escritorio Pre-Owned no exigen porcentaje de batería.
- Si se registra serial en la venta, el backend crea/asigna la unidad física automáticamente.
- Si se deja vacío, se usa después Pedidos > Asignar equipo.
- Ventas antiguas con serial en pedido_items muestran ese serial prellenado al asignar.

REGLA NOTA DE ENTREGA
La Nota de Entrega requiere DOS condiciones:
1. Pago confirmado.
2. Todas las unidades físicas asignadas.
Registrar serial antes del pago no habilita la nota por sí solo.

CATÁLOGO/PRE-ORDER
- Conserva catálogo completo por categorías.
- Venta desde stock reserva inventario.
- Pre-Order no descuenta ni reserva stock.
- Variantes del catálogo sin stock también se pueden vender como Pre-Order.

SQL PARA DEPLOY
Recomendado ejecutar:
supabase_v13_65_DEPLOY_ACUMULATIVO.sql

Incluye de forma idempotente:
- V13.63 unidades físicas / asignaciones / versiones de nota.
- V13.65 columnas de descuento en pedidos.

También se incluye:
supabase_v13_65_descuentos_venta_presencial.sql
por si V13.63 ya fue aplicado y solo necesitas la parte nueva.

VALIDACIÓN
Revisión estática completa: JavaScript, scripts inline, referencias locales,
Netlify Functions y ZIP. No sustituye prueba real contra Supabase/Resend/Storage.

PRUEBA OPERATIVA RECOMENDADA DESPUÉS DEL DEPLOY
1. Abrir venta presencial.
2. Ver Mac mini y categorías.
3. Elegir Stock o Pre-Order.
4. Registrar serial ahora o dejar pendiente.
5. Aplicar descuento.
6. Guardar en espera.
7. Confirmar pago.
8. Asignar/verificar unidad física.
9. Abrir Nota de Entrega.
10. Confirmar subtotal, descuento, total final y serial.
11. Marcar Entregado y validar stock/unidad Vendida.
