ThinkStore V13.58 · Carrito + Dashboard administrativo

CAMBIOS
- Corregida la apertura del carrito desde el icono de la página principal.
- El carrito puede abrirse para revisar productos incluso antes de iniciar sesión.
- Se conserva el flujo de identificación/registro al confirmar la compra.
- El administrador sigue entrando al módulo Dashboard, pero se eliminó la sensación
  de pantalla simple de bienvenida.
- Nuevo Centro de Operaciones administrativo:
  * ventas confirmadas del día
  * pagos por revisar
  * alertas de inventario
  * Pre-Orders / tránsito
  * actividad reciente
  * accesos rápidos a caja, inventario, marketing, CRM, logística y auditoría
  * resumen operativo con datos reales disponibles
- El hero genérico se oculta únicamente en el Dashboard de admin/superadmin.
- Se conserva íntegramente V13.57: Inventario Visual, Pre-Owned, cosmetic_grade,
  SKU técnico, códigos cortos, auditoría y demás módulos.

SQL
Si todavía no fue ejecutado, sigue siendo requerido:
supabase_v13_57_inventario_visual.sql
