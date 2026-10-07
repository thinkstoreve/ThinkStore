# ThinkStore Main V14.88 · Main + Soporte unificado

Restauración de la arquitectura unificada que evita desplegar Soporte por separado.

## Incluye
- Main completo actual.
- Staff con Ventas, Caja, Servicio Técnico y Reparaciones.
- `/soporte/` dentro del mismo Main.
- Funciones necesarias de Soporte disponibles desde el Netlify del Main.
- SSO de Servicio Técnico hacia `/soporte/panel.html`.
- Seguimiento público desde `/soporte/seguimiento.html`.

## Flujo V8.8.8 restaurado
1. Soporte → Gestionar reparación → seleccionar y **Guardar repuestos**.
2. Los repuestos quedan reservados; el stock físico no baja todavía.
3. Staff → Reparaciones puede registrar abonos parciales.
4. Al completar el saldo, `ts_service_record_payment_atomic` consume las reservas dentro de la misma transacción del Supabase de Soporte.
5. Si no hay stock suficiente, el pago final falla y no cambia el estado de cobro.
6. La orden cambia a **Cobrado**, los movimientos quedan ligados al código de orden y Enterprise los lee desde el historial de Soporte.
7. La nota de entrega queda preparada; el estado técnico no cambia automáticamente a “Listo para entregar”.

## SQL obligatorio una sola vez
Ejecutar en Supabase de Soporte, en orden:
1. SQL-SOPORTE-V8.8.8-01-ORDEN-REPUESTOS.sql
2. SQL-SOPORTE-V8.8.8-02-GUARDAR-REPUESTOS.sql
3. SQL-SOPORTE-V8.8.8-03-CONSUMIR-AL-PAGO.sql
4. SQL-SOPORTE-V8.8.8-04-PAGO-ATOMICO.sql

Después de esto, los cambios normales de Main + Staff + Soporte requieren un solo deploy del repositorio Main.
