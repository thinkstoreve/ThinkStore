# ThinkStore Main V14.48 — Inventario Real integrado

Base: V14.47 completa consolidada.

## Corrección principal
El módulo del panel administrativo vuelve a identificarse claramente como
**Inventario real** y conserva la metodología avanzada para equipos y accesorios.

### Dentro de Inventario Real
- Equipos y accesorios como área principal.
- Stock físico por SKU / variante.
- Disponible, reservado y vendido.
- Equipos individuales por serial / IMEI.
- Accesorios controlados por cantidad.
- Edición de stock y precios.
- Publicación del producto.
- Imágenes y ficha de catálogo.
- Historial de movimientos.
- Importación y descarga Excel.
- Unidades físicas.
- Filtros por categoría, capacidad, color, condición y estado.
- Vista visual y vista compacta.

### Navegación
Se añadieron accesos claros a:
- Equipos y accesorios.
- Catálogo de productos.
- Repuestos técnicos en Inventory Central.

La ruta antigua `#inventario_real` se redirige a `#inventario`, para evitar
que enlaces anteriores dejen de funcionar.

## Permisos
Admin y Super Admin siempre ven el módulo Inventario Real. Las operaciones
siguen usando la autenticación y controles del backend existentes.

No requiere SQL nuevo.
