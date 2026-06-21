ThinkStore V50 - Dashboard Administrador Seguro

Este paquete agrega un dashboard administrador conectado de forma segura a Supabase usando Netlify Functions.

Para que funcione al 100%, crea estas variables en Netlify > Project configuration > Environment variables:

1) RESEND_API_KEY
   Ya fue configurada previamente.

2) SUPABASE_URL
   Valor: la URL de tu proyecto Supabase. Ejemplo:
   https://clhnndxsgzqnihhtrout.supabase.co

3) SUPABASE_SERVICE_ROLE_KEY
   Valor: Supabase > Project Settings > API > service_role key.
   IMPORTANTE: marcar como Secret. Nunca colocar esta clave en el frontend.

4) THINKSTORE_ADMIN_SECRET
   Valor recomendado: THINK2026
   Debe coincidir con el código administrador que usas para abrir el panel.

Qué incluye:
- Dashboard administrador leyendo clientes reales desde Supabase.
- Pedidos reales desde Supabase.
- Comprobantes desde Supabase cuando existan.
- Cambio de estado de pedido vía función segura.
- Historial de estados preparado.
- Correos automáticos se disparan cuando cambia el estado.
- Fallback local si la función no está configurada aún.

Ruta funciones:
- /.netlify/functions/admin-data
- /.netlify/functions/admin-update-order
- /.netlify/functions/send-email

No subas a Netlify hasta que terminemos V50 Enterprise Final, salvo que quieras probar esta etapa.
