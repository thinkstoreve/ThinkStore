# ThinkStore V8.8.24 — versión completa unificada (SIN DEPLOY)

Base: ThinkStore V8.8.20 acumulada. Se incorporan únicamente las diferencias sucesivas de V8.8.21, V8.8.22 y V8.8.23.

## Correcciones incorporadas
- V8.8.20: asignación de serial limitada a equipos correspondientes (iPhone/iPad/MacBook/etc.), accesorios sin bloqueo para nota de entrega.
- V8.8.21: cobro presencial confirmado directamente al cobrar y flujo de nota de entrega según seriales requeridos.
- V8.8.22: reorganización de navegación financiera Enterprise (Inicio/Tesorería/Movimientos/Obligaciones/Reportes).
- V8.8.23: renovación de estilos, resumen financiero y acceso rápido en Enterprise inspirados en referencias visuales, sin imágenes de capturas incrustadas.
- Conserva versiones previas de Soporte y el resto del sistema contenido en V8.8.20.

## Precauciones
- No se ha hecho despliegue ni ejecutado SQL.
- Validar antes de desplegar con cuentas y pedidos de prueba: cobros, idempotencia, email, notas de entrega, inventario, accesos, métricas Enterprise.
- Esta unificación integra los archivos de código; no garantiza que la base de datos actual tenga todas las migraciones requeridas.
- El ZIP contiene archivos del sitio principal, Soporte, Staff y Enterprise en carpetas separadas; desplegar a cada sitio con su configuración correspondiente. No equivale a que un único sitio Netlify publique automáticamente todos los subdominios.
