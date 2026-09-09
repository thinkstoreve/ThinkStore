ThinkStore V13.49 · Fix inventario real

Causa corregida:
V13.48 intentaba consultar y escribir una columna `category` dentro de
`inventory_variants`, pero la base de datos actual guarda la categoría
editorial en `catalog_products`. Esto hacía fallar GET /.netlify/functions/inventory
y por eso Productos e Inventario Real mostraban “No se pudo consultar inventario”.

Cambios:
- inventory_variants vuelve a usar el esquema compatible existente.
- Las categorías continúan administrándose desde catalog_products/catalog_categories.
- Crear producto ya no intenta insertar category en inventory_variants.
- Renombrar categoría no intenta modificar una columna inexistente en inventory_variants.
- No cambia stock, reservado, vendido, pedidos ni pagos.

El SQL de V13.48 sigue siendo necesario únicamente para crear/editar categorías
persistentes (`catalog_categories`). No es necesario un SQL adicional para este fix.
