# V8.8.28 — Enterprise: acceso financiero simplificado inspirado en Rial

Base: ThinkStore V8.8.27 completa, conservada íntegra.

## Cambios
- Inicio: accesos directos Entrada, Salida, Transferir, Metas e Historial, con textos aclaratorios.
- Entrada/Salida reutilizan los formularios financieros existentes; venta, soporte, inventario, deudas y aportes conservan sus sistemas de origen.
- Gráfica de entradas y salidas por los últimos siete días disponibles del libro de movimientos consultado; NO se confunde con ganancia.
- Nueva sección Ahorros y metas: nombre, objetivo, importe referencial, barra de progreso, eliminación.
- Borradores de metas almacenados **solo en el navegador del dispositivo**; no se sincronizan con Supabase, no crean cuentas, no registran fondos ni cambian saldos. Se declara expresamente en pantalla.
- Estilo limpio ThinkStore con adaptación móvil y actualización de versiones CSS/JS para evitar archivos obsoletos.

## Alcance y pruebas pendientes
- No se modificó el esquema SQL ni funciones financieras del servidor.
- Metas sincronizadas entre usuarios y cuentas de ahorro contables necesitan diseño de datos y pruebas con Supabase antes de implementarse.
- Validar inicio de sesión, operaciones autorizadas, arqueo, resumen, permisos y gráficos con datos reales antes de deploy.
- El ZIP raíz sirve como base acumulada. Sitios separados Netlify (Main, Soporte, Enterprise, Inventory) conservan configuraciones distintas y pueden necesitar publicaciones por separado durante una misma ventana de despliegue.
