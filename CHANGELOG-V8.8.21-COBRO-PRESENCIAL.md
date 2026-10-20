# V8.8.21 · Cobro presencial (pendiente de deploy)

- El botón «Cobrar y confirmar venta» llama al endpoint seguro que confirma el pago y bloquea la decisión; no exige segunda verificación administrativa.
- Si todos los productos son accesorios sin serial, genera y envía automáticamente la Nota de Entrega al correo tras confirmar el pago.
- Si hay equipos que requieren serial aún no asignado, confirma el cobro pero deja la nota pendiente, sin enviar una nota incompleta.
- El resultado en pantalla informa si el correo fue enviado o quedó pendiente.
- Se conserva «Guardar en espera», validación de pagos mixtos, tasa BCV y protección contra doble confirmación.
- No se modificaron tablas ni datos de Supabase. Requiere probar cobros y correo en entorno autorizado antes de publicar.
