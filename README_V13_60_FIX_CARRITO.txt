ThinkStore V13.60 · Hotfix carrito principal

CAUSA CORREGIDA
- index.html seguía cargando script.js con ?v=13.38.
- Chrome podía reutilizar una versión anterior del script aunque el ZIP nuevo ya estuviera desplegado.
- El carrito además dependía de drawCart() antes de añadir la clase open; cualquier error de render podía impedir que se mostrara.

SOLUCIÓN
- Cache-busting actualizado a script.js?v=13.60 y data.js?v=13.60.
- El botón del carrito usa tsOpenCartSafe().
- El modal se abre primero y después se ejecutan las rutinas de render protegidas individualmente.
- openCart / closeCart quedan apuntando al flujo seguro para compatibilidad.
- No se modifica el contenido del carrito ni el flujo de compra.
- Se conserva íntegra la V13.59 y su editor avanzado de productos.

SQL
No requiere SQL adicional.
Los SQL V13.57/V13.59 siguen siendo necesarios únicamente para las funciones Pre-Owned correspondientes.
