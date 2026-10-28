# ThinkStore V15.43 — Finanzas, costo de repuestos y 10 % global

Paquete preparado el 28/10/2026. Cambios de código comprobados localmente; pendiente publicar y verificar conexiones reales. No se registraron cobros, gastos ni transferencias reales.

## Regla acordada

Total final de reparación (después de descuentos) − costo de repuestos − otros costos directos − 10 % del total para técnico = utilidad disponible para empresa y socios. Se conserva cualquier comisión de vendedor aplicable a productos adicionales.

Ejemplo: cobro $100, repuesto $40, técnico $10, utilidad $50. Con los valores predeterminados del código: empresa $25, Freddy $12,50 y Nelson $12,50. Los porcentajes guardados en la base tienen prioridad; este paquete no modifica sus valores. Una pérdida no se convierte en utilidad positiva.

## Instalar

1. Publicar el contenido de esta carpeta en el proyecto Main, manteniendo `netlify/functions` como directorio de funciones.
2. Publicar `soporte` en el proyecto Soporte y `growth-enterprise` en Enterprise, siguiendo las configuraciones Netlify existentes. Main debe publicarse antes de usar la nueva preparación de repuestos.
3. En Main y Enterprise, comprobar las variables de servidor `MAIN_SUPABASE_SERVICE_ROLE_KEY`, `SUPPORT_SUPABASE_URL` y `SUPPORT_SUPABASE_SERVICE_ROLE_KEY` (también se acepta `SUPPORT_SUPABASE_SECRET_KEY`). La clave Main debe pertenecer al Supabase principal usado por el acceso unificado. Se conservan los alias Main anteriores. No usar la clave pública ni copiar claves privadas al navegador.
4. Volver a desplegar después de modificar variables. El error de la captura prueba que ese endpoint no encontró una clave; este paquete añade el alias MAIN que usaban otras funciones, pero no puede recuperar una clave ausente ni verificar la configuración alojada.
5. Abrir de nuevo Soporte y Enterprise para cargar los archivos actualizados.

No hay una nueva migración SQL para este cambio. Se necesitan las tablas y la función de reservas que ya utilizaba esta versión (`service_parts`, `service_order_parts`, `ts_save_service_order_parts`, `enterprise_service_settlements`, `enterprise_finance_entries`). Un error por tabla o función ausente requiere revisar la migración existente correspondiente, no ejecutar SQL genérico a ciegas.

## Uso del repuesto

- En Inventory, guardar un costo unitario numérico y un SKU único; usar exactamente el mismo SKU en Soporte. El campo principal leído es `data.purchase_price` en `thinkstore_inventory_products` del workspace `main`; también reconoce purchase_price_usd, unit_cost, unit_cost_usd, cost_price, cost_usd y cost. Cero explícito es válido; costo ausente o inválido se rechaza.
- Preparar el repuesto desde la reparación en Soporte. El servidor valida la sesión, los permisos y, para técnicos, la asignación de la reparación. Busca el SKU exacto, sincroniza el costo y usa la reserva existente, que guarda el costo unitario histórico.
- Preparar no vuelve a pagar la compra ni genera otra salida de caja. La reserva conserva el comportamiento anterior: el stock físico se consume al completar el pago. Si se necesita descontar stock al instalar antes de cobrar, eso requiere un flujo distinto y no se introduce aquí.
- Al completar el pago, se calcula la liquidación, se registra la comisión técnica del 10 % global y se envían los componentes a Tesorería. Un abono sigue siendo un abono; no se convierte en cobro total ni crea una comisión pagadera anticipadamente. Si falta asignar técnico, se reserva su comisión como «Técnico por asignar».
- Las liquidaciones anteriores no se recalculan masivamente. No volver a cobrar una orden histórica para intentar corregir sus cifras.

## Cambios incluidos

- Finanzas, resumen diario y vencimientos usan el mismo resolver de claves Main que Staff.
- Consultas independientes del resumen financiero en paralelo, límites de espera en servidor y más tiempo para responder en el navegador. Se muestra el error recibido en vez de reemplazarlo por un mensaje genérico.
- Nueva función autenticada `support-prepare-parts` y conexión desde el selector de repuestos de Soporte. Los costos no se exponen en la respuesta al técnico ni en el catálogo público.
- Costo histórico para el libro de repuestos: snapshot del movimiento, luego snapshot de la orden; el catálogo actual queda únicamente como estimación para registros antiguos sin snapshot.
- Comisión automática y ajuste manual nuevos: 10 % global. Las antiguas tasas por margen dejan de gobernar estas liquidaciones; el formulario explica la regla vigente.
- No se incluye el código de la aplicación independiente Inventory: este paquete lee sus datos ya sincronizados. Si su formulario no permite guardar el costo en ninguno de los campos admitidos, se necesita también ese proyecto para modificarlo.

## Validación

35 pruebas específicas aprobadas: cálculo 100−40−10=50, descuento, costo cero e histórico, pérdida, abonos, técnico pendiente, autenticación, SKU duplicado, costo faltante, permisos y vencimientos.

Suite completa: 240 pruebas, 234 aprobadas y 6 fallos. Los mismos 6 fallos aparecen en el ZIP original: un test de versión de caché que esperaba una marca anterior y cinco tests de recepción. No se modificó el flujo de recepción. Sintaxis de los archivos JavaScript modificados comprobada con Node.

Verificación pendiente tras publicar: sesión real, variables Netlify, lectura de Inventory, reserva de un repuesto y vista del desglose en Tesorería. No se afirma que Finanzas en producción esté reparado antes de esa comprobación.
