ThinkStore V62 Multi-Rol Pro

Cambios incluidos:

1. Nueva página privada: panel.html
   - Cliente: cuenta, pedidos, reparaciones, garantías y puntos.
   - Vendedor: ventas, cotizaciones, clientes, pagos, preórdenes, CRM y recomendaciones.
   - Recepción / Soporte: recepción de equipos, tickets, garantías y citas.
   - Técnico: diagnóstico, reparación, repuestos y pruebas.
   - Logística: envíos, guías MRW/Zoom/Tealca y entregas.
   - Admin / Super Admin: acceso completo y permisos.

2. Navegación inteligente
   - Si no hay sesión: botón muestra Login.
   - Si es cliente: botón muestra Cuenta.
   - Si es staff/admin: botón muestra Panel.

3. Módulos Growth ocultos del sitio principal
   - Las secciones Growth/V58/V59/V60 no se muestran a clientes en la página pública.
   - Growth Enterprise permanece en admin-growth.html y panel.html.

4. Supabase preparado
   - Archivo supabase_v62_roles_permissions.sql con tablas staff_profiles, service_tickets, shipments, warranties y store_appointments.
   - Incluye base para RLS/políticas por rol.

Pasos recomendados:

1. Subir esta versión a GitHub/Netlify.
2. Ejecutar supabase_v62_roles_permissions.sql en Supabase SQL Editor.
3. Asignar tu usuario como admin en staff_profiles usando el bloque final del SQL.
4. Iniciar sesión en ThinkStore. El botón debe cambiar a Panel si tu rol es admin/staff.

Nota:
El panel funciona en modo local para pruebas. Para producción, la seguridad real depende de asignar roles en Supabase y mantener RLS activo.
