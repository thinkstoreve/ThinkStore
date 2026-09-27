ThinkStore V14.0 · ThinkStore Staff / POS interno
=================================================

NUEVO
-----
Se añade una app interna instalable (PWA) inspirada en la experiencia Shopify POS:

  https://thinkstore.com.ve/staff/

La app usa el MISMO Supabase, catálogo, inventario, pedidos y sistema de roles de ThinkStore.
No crea una base de datos paralela.

FUNCIONES DE LA APP
-------------------
• Inicio de sesión con cuenta interna ThinkStore.
• Carga automática de nombre, rol y permisos.
• Inicio personalizado con métricas del día.
• Tienda interna visual para venta presencial.
• Búsqueda y filtros por categoría.
• Stock real y variantes por color/capacidad/condición.
• Pre-Order cuando no hay stock.
• Carrito de venta.
• Checkout con cliente, pago, entrega, descuento y nota.
• Guardar venta en espera o cobrar y confirmar.
• Historial de ventas recientes.
• Cada venta queda atribuida al empleado que la registró.
• Pantalla Cuenta con rol y permisos.
• Instalación en iPhone/iPad/Android/escritorio como PWA.
• Acceso rápido al panel administrativo completo.

ROLES Y PERMISOS
----------------
La app permite iniciar sesión solo a usuarios internos activos.

La sección Vender aparece únicamente cuando el acceso efectivo contiene:
  ventas

o acceso completo (*).

Esto respeta:
• rol base
• rol personalizado
• permission_overrides.allow
• permission_overrides.deny

Los clientes normales de la tienda no pueden entrar en ThinkStore Staff.

ATRIBUCIÓN DE VENTAS
--------------------
Cada venta presencial nueva registra en pedidos:
• salesperson_user_id
• salesperson_email
• salesperson_name
• pos_source

ThinkStore Staff usa pos_source = staff_app.
La venta presencial clásica conserva pos_source = panel_pos.

PASO OBLIGATORIO EN SUPABASE
----------------------------
Antes de usar ThinkStore Staff, ejecutar UNA SOLA VEZ:

  supabase_v14_0_staff_pos.sql

Este SQL NO elimina ventas ni productos. Solo añade las columnas e índices de atribución.

PRERREQUISITOS YA EXISTENTES
----------------------------
La instalación actual debe tener aplicadas las migraciones de venta presencial que ya usa ThinkStore:
• supabase_v13_44_ventas_presenciales.sql
• supabase_v13_65_descuentos_venta_presencial.sql

ARCHIVOS PRINCIPALES NUEVOS
---------------------------
/staff/index.html
/staff/app.css
/staff/app.js
/staff/manifest.webmanifest
/staff/sw.js
/staff/icon-192.png
/staff/icon-512.png
/staff/icon-512-maskable.png
/netlify/functions/staff-pos.js
/supabase_v14_0_staff_pos.sql

ARCHIVOS ACTUALIZADOS
---------------------
• panel.html
  Añade acceso "App Ventas" para Vendedor/Admin/Super Admin.

• netlify/functions/admin-create-sale.js
  Respeta permisos efectivos de ventas y guarda el vendedor real.

• netlify/functions/admin-update-order.js
  Permite confirmar el cobro desde la app cuando el usuario tiene permiso Ventas.

• _redirects
  Redirección limpia /staff → /staff/

• package.json
  Versión 14.0.0

INSTALAR COMO APP
-----------------
iPhone / iPad:
1. Abrir https://thinkstore.com.ve/staff/ en Safari.
2. Compartir.
3. Añadir a pantalla de inicio.

Android / Chrome / escritorio:
1. Abrir ThinkStore Staff.
2. Usar "Instalar app" desde Cuenta o el botón de instalación del navegador.

SEGURIDAD
---------
• No se incluye service_role en el frontend.
• Los endpoints internos validan JWT de Supabase.
• El Service Worker no cachea /.netlify/functions/ ni Supabase.
• Un vendedor solo ve sus propias ventas cuando la migración V14.0 está aplicada.
• Administrador / Socio Administrador puede ver el resumen del equipo.

PRUEBA RECOMENDADA DESPUÉS DEL DEPLOY
-------------------------------------
1. Ejecutar supabase_v14_0_staff_pos.sql.
2. Abrir /staff/.
3. Entrar como Vendedor.
4. Confirmar que muestre su rol.
5. Abrir Vender.
6. Añadir un producto desde stock o Pre-Order.
7. Completar cliente y pago.
8. Guardar en espera.
9. Confirmar una segunda venta.
10. Revisar Ventas y comprobar que aparecen atribuidas al empleado.
11. Abrir el panel completo y confirmar el pedido.

ThinkStore V14.0
