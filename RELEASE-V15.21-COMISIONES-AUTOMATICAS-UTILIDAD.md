# ThinkStore Main V15.21 · Comisiones automáticas y utilidad real

## Modelo financiero
- El cliente continúa viendo un único precio publicado con instalación incluida.
- Internamente cada línea se clasifica como:
  - Repuesto + instalación
  - Servicio hardware
  - Servicio software
  - Producto / accesorio
- El costo real de inventario se recupera antes de calcular comisiones.
- Comisión de repuesto: se calcula únicamente sobre el margen del repuesto después de recuperar su costo.
- Comisión de servicio: se calcula sobre el servicio neto después de costos directos.
- Hardware y software heredan el % general de servicio, con overrides opcionales.
- Productos/accesorios de tienda no generan comisión técnica; quedan preparados para comisión de vendedor.

## Configuración por empleado
Administración → Usuarios permite definir:
- Técnico: % repuesto, % servicio y overrides opcionales hardware/software.
- Vendedor: % venta.

El porcentaje individual tiene prioridad sobre la regla global.

## Enterprise / Tesorería
- Nueva liquidación automática por reparación pagada.
- Guarda ingreso, descuento, recuperación de inventario, margen, comisiones y utilidad de empresa.
- Crea automáticamente la comisión técnica pendiente al cobrar.
- Evita duplicar una comisión automática mediante el registro manual.
- Tesorería muestra:
  - Fondo recuperado de inventario
  - Utilidad de Servicio Técnico
  - Comisión técnica generada
  - Comisión de vendedor generada
- Enterprise permite configurar porcentajes globales por defecto.

## Cobro
La liquidación se genera solamente cuando la reparación queda Pagada. Si la sincronización financiera falla después del cobro, el pago no se revierte y App Ventas devuelve una advertencia para revisión.

## SQL requerido antes del deploy
1. Supabase PRINCIPAL: `MIGRACION-MAIN-V15.21-COMISIONES-UTILIDAD-SERVICIO.sql`
2. Supabase SOPORTE: `MIGRACION-SOPORTE-V8.8.16-CLASIFICACION-FINANCIERA.sql`

## Caché
- Panel Main: `thinkstore-admin-v15-21`
- Soporte: `r1521 / 15.21.0`
- Enterprise app: `10.19`
