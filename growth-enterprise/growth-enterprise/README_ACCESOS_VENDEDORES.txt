ThinkStore Growth Enterprise · Accesos tipo Shopify Staff

1) Sube esta carpeta growth-enterprise al repositorio y despliega en Netlify.
2) En Supabase > SQL Editor ejecuta supabase-setup.sql.
3) Para que el panel cree usuarios reales de Supabase Auth automáticamente, despliega la Edge Function:

   supabase functions deploy create-staff-user

4) Variables requeridas en Supabase Edge Functions:
   SUPABASE_URL
   SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY

5) Si la Edge Function no está instalada, el panel guardará la invitación en staff_invitations como pendiente.
6) El administrador puede cambiar roles y activar/desactivar usuarios desde Growth Enterprise > Accesos.

Roles disponibles:
- vendedor: ventas, pedidos y clientes básicos
- gerente: ventas, clientes, inventario y reportes comerciales
- marketing: campañas y clientes segmentados
- logistica: envíos, tracking y entregas
- recepcion: recepción de equipos y órdenes de servicio
- tecnico: diagnóstico y bitácora técnica
- admin: acceso completo
