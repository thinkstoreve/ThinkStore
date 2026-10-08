# ThinkStore Main — V15.11 · Repuestos visibles + Cobro premium simplificado

## Mejoras principales

### 1) App Ventas · Reparaciones
- El bloque **Repuestos** ahora muestra con más claridad los repuestos usados por el técnico.
- Cada repuesto enseña:
  - nombre,
  - SKU (si existe),
  - estado (**Reservado**, **Consumido** o **Reportado por técnico**),
  - cantidad,
  - subtotal.
- Se añade un resumen **Total repuestos** al final del bloque.
- Si la orden no tiene repuestos en `service_order_parts`, App Ventas intenta usar como respaldo lo indicado en `parts_used` dentro de las notas técnicas.

### 2) Métodos de pago simplificados
- Se consolida la interfaz en **6 métodos principales**:
  - Efectivo
  - Pago Móvil
  - Zelle
  - Transferencia
  - Punto de venta
  - Otros
- Cada método muestra su logo/icono.
- Se mantienen subopciones compactas para variantes como USD / Bs. / EUR / USDT.
- Se refuerza la animación al pulsar cada método.

### 3) Botón de cobro más limpio
- El botón principal ya no muestra `+ Nota de Entrega`.
- Ahora se presenta como:
  - **Cobrar saldo**
  - o **Cobrar $X.XX** cuando la orden no tiene total previo.
- Al completar el pago, aparece una confirmación que indica:
  - que la orden quedó **Pagada**,
  - que la **Nota de Entrega fue creada**,
  - y que **fue enviada al cliente** cuando el correo se procesó correctamente.

### 4) Caché forzada en Staff
- Se actualizan los assets de Staff a versión **15.11.0** para obligar al navegador a cargar la interfaz nueva y evitar que siga mostrando el módulo viejo de reparaciones.

## Archivos tocados
- `staff/repairs.js`
- `staff/app.css`
- `staff/index.html`
- `netlify/functions/staff-repairs.js`

## SQL
- **No requiere SQL nuevo.**
