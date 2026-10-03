# ThinkStore Main V14.61 — Navegación + Enterprise interno

Base: V14.60.

## Panel
- Controlador central de navegación para todos los botones/tabs de módulos.
- Ya no depende solamente de `onclick` inline.
- El módulo activo cambia sin recargar la página.
- Si una pestaña falla, el error se muestra dentro del Panel.
- Se refuerzan pointer-events del sidebar.

## Enterprise
Enterprise abre dentro del Panel Administrativo y no redirige al subdominio.

Incluye:
- resumen semanal,
- ventas online y presenciales,
- cobros,
- citas,
- reparto 50 / 25 / 25,
- accesos a Ventas, Pedidos, Pagos, Clientes e Inventario.

Si la función `enterprise-summary` no responde, el Panel usa un resumen local
de ventas/citas en lugar de quedar vacío.

## Enterprise standalone V10.2
- Elimina el antiguo service worker que mostraba `offline.html`.
- Borra caches `thinkstore-enterprise-*`.
- Quita `offline-runtime.js`.
- Manifest con rutas relativas.
- Recuperación de contraseña con URL dinámica.
- No vuelve a interceptar navegaciones.

Si `enterprise.thinkstore.com.ve` continúa enviando a `instantfwding.com`,
eso corresponde al DNS/forwarding del subdominio. V14.61 ya no depende de ese
subdominio para usar Enterprise.

No requiere SQL.
