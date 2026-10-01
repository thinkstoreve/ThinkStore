# ThinkStore V14.42 · Taller, repuestos y liquidación

Entrega del 30 de septiembre de 2026. Incluye las mejoras anteriores de Recepción V2, logo oficial, roles e invitaciones, cédula/dirección, clave privada del dispositivo, términos de pruebas y botón Garantía Apple.

## Qué incorpora

- Panel administrativo y Soporte: resumen real de cotizaciones, cobros, mano de obra y márgenes del taller; módulo Cobros y liquidación semanal.
- Panel administrativo, Inventory y Soporte: pestaña Repuestos de servicio técnico, con una sola fuente de datos independiente del inventario de productos.
- Catálogo público de servicio técnico conectado exclusivamente a los repuestos publicados del taller.
- Cotizaciones por conceptos: mano de obra, repuesto y servicio/costo externo. Cobros parciales en USD o VES con tasa registrada, saldos y detalle.
- Liquidación de lunes a sábado, según fecha del cobro en Caracas: solo mano de obra cobrada; empresa 50%, Freddy 25%, Nelson 25%. Domingo se muestra aparte y no entra en ese reparto. Consulta semanal y exportación CSV; no envía informes automáticamente ni realiza transferencias.

## Activación: no basta con subir el ZIP

1. Conservar una copia de la versión desplegada y respaldo de la base de datos. Estos paquetes no han modificado producción.
2. En el Supabase de **Soporte**, con el esquema de producción existente, ejecutar `soporte/supabase_v14_42_workshop.sql`. Es una migración adicional transaccional; no ejecutar este archivo en el Supabase del catálogo general/Inventory. Si se viene de una versión anterior a V14.39, aplicar primero las migraciones V14.38 de permisos y V14.39 de acceso privado al equipo incluidas en Soporte.
3. Ejecutar `soporte/supabase_v14_42_catalog_seed.sql` en el mismo Supabase de Soporte. Importa 4.354 fichas únicas del catálogo de 4.480 referencias. Se puede repetir: no sobrescribe un SKU existente. No inventa compras, stock, costos ni precios; importa stock cero y costo/precio pendientes. Las fichas se publican como referencias con precio por consultar. No ejecutar el antiguo `supabase_service_parts_catalog.sql` como sustituto de esta migración.
4. Configurar en el servidor de los tres sitios las variables `SUPPORT_SUPABASE_URL` y `SUPPORT_SUPABASE_SERVICE_ROLE_KEY` con el proyecto de Soporte. La clave privada va en variables del servidor, nunca en HTML ni en `config.js`.
5. Admin e Inventory conservan su propio proyecto para iniciar sesión. El nuevo servidor acepta `THINKSTORE_SUPABASE_URL` y `THINKSTORE_SUPABASE_SERVICE_ROLE_KEY`, o sus equivalentes `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. Estas variables corresponden al proyecto de autenticación de cada aplicación; las variables SUPPORT corresponden al taller. Soporte también admite sus variables SUPABASE existentes como alternativa a SUPPORT.
6. Desplegar la raíz del paquete ThinkStore para el sitio principal y la carpeta `soporte/` para el sitio independiente de Soporte, conservando sus dominios y variables. Desplegar el paquete Inventory V3.2.7 por separado en su sitio actual. En Cloudflare Pages, mantener publicación `app` e incluir la carpeta `functions`; en Netlify usar la configuración incluida. Una subida de archivos estáticos sin funciones de servidor no activa estos módulos.
7. Entrar como administrador. Registrar costos, precios y existencias reales en Repuestos de servicio técnico. Realizar una cotización y un cobro controlados y comprobar saldo, stock y reporte semanal en el despliegue de prueba antes de uso diario.

## Permisos

Administradores pueden gestionar y ver liquidaciones. Recepción/ventas pueden cotizar y registrar cobros con el permiso `finance`; si tienen una lista personalizada de permisos, añadirlo expresamente en Roles. Técnicos siguen usando el permiso `parts`. Inventory permite la pestaña a superadministradores y usuarios con permiso de stock; sus endpoints no permiten operar cobros. Se verifican sesión y perfil en servidor.

## Criterios de cálculo y operación

Una cotización no equivale a dinero cobrado. Los presupuestos antiguos sin desglose se muestran aparte: no se reconstruyen fechas ni cobros inexistentes. El campo de presupuesto tradicional sigue operativo; los informes de caja y reparto se basan exclusivamente en cotizaciones desglosadas y cobros del módulo nuevo. Registrar las nuevas operaciones allí y evitar duplicar una misma cotización/venta.

En un abono se asignan proporcionalmente ingresos y costos entre todos los conceptos. El costo del repuesto queda guardado en la cotización; no cambia al editar después el inventario. El margen mostrado es ingresos cobrados menos costos directos proporcionales, antes de gastos generales. Solo mano de obra participa en el reparto. Los centavos residuales se ajustan en Nelson para que la suma coincida exactamente.

El primer cobro descuenta una sola vez la cantidad completa de repuestos cotizados, incluso si es un abono; los siguientes abonos no descuentan stock. No registrar otra salida manual por esa venta. Sin existencias suficientes se rechaza todo el cobro. Movimiento sirve para entradas, apertura y ajustes documentados.

Los cobros registrados son inmutables en esta versión. Solo se anulan cotizaciones sin cobros; no incluye devoluciones, reembolsos ni reversión de cobros desde la interfaz. Revisar fecha, tasa e importe antes de confirmar. El reporte calcula importes a distribuir, no registra pagos efectivos a socios.

## Verificación realizada

- 46 pruebas automatizadas aprobadas: recepción Apple/Otros/Gaming, conservación de datos y estados, fotos y reintentos, permisos, APIs, separación de inventarios, fechas y cálculos de liquidación.
- Sintaxis de los archivos JavaScript modificados y de los scripts del panel comprobada.
- PostgreSQL aislado con PGlite: migración repetible, importación de catálogo repetible, costos autorizados, abonos, conversión USD/VES, idempotencia, bloqueo de sobrepagos y stock insuficiente, restricciones de acceso directo: aprobado.
- Son aplicaciones web estáticas con funciones de servidor; no hay un comando de compilación web en sus paquetes. No se generaron instaladores nativos de Inventory ni se probó el empaquetado de Cloudflare/Netlify en sus servidores.
- La revisión visual en navegador quedó pendiente: Chrome no pudo arrancar en este entorno. No se verificaron credenciales, configuración alojada, SMTP ni operaciones sobre Supabase de producción. Se requiere la comprobación del punto 7 después de configurar el entorno de prueba.
