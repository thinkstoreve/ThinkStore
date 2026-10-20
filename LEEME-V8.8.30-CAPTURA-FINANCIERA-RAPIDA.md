# ThinkStore V8.8.30 — Ingreso de montos más sencillo

Base: ZIP acumulado V8.8.29. Se preservan los archivos, métodos, saldos y lógica existente.

## Cambios
- Los formularios financieros existentes que contienen `amount_usd` presentan el importe en primer lugar, en tamaño legible.
- Entrada numérica optimizada para móvil (`inputmode=decimal`).
- Atajos para agregar $5, $10, $50, $100 y opción Limpiar, sin sustituir la entrada manual de decimales.
- Reutiliza la acción `finPost` existente para guardar en el backend, sin crear otra fuente de movimientos.
- No se alteraron los flujos automáticos de Staff/Soporte, cálculos, base de datos ni los logotipos integrados en la V8.8.29.

## Pendientes de verificación
- Prueba autenticada de cada formulario de Enterprise con Supabase y revisión en móviles reales.
- Integración real y sincronizada de metas de ahorro (siguen siendo borradores locales según V8.8.28).
- Validación de reglas financieras y operaciones de distintos medios de pago.

Sin deploy; sin ejecución de migraciones SQL.
