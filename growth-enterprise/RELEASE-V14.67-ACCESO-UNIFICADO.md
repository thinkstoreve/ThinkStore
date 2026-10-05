# ThinkStore Main V14.67 · Acceso unificado

- Un solo correo/contraseña para el ecosistema ThinkStore.
- Super Admin / Administrador: acceso total.
- Equipo y accesos permite asignar App Ventas, Soporte, Inventory, Enterprise y Marketing.
- Lanzador central con SSO mediante enlaces seguros de Supabase.
- Invitaciones desde ThinkStore Admin <admin@thinkstore.com.ve>.
- No requiere migración SQL nueva: reutiliza permission_overrides, thinkstore_inventory_users y service_users existentes.

## Redirect URLs requeridas en Supabase Auth
Proyecto principal:
- https://inventory.thinkstore.com.ve/**
- https://enterprise.thinkstore.com.ve/**
- https://thinkstore.com.ve/**

Proyecto ThinkStore-Soporte:
- https://soporte.thinkstore.com.ve/**

## Variables ya usadas
Main / Netlify:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPPORT_SUPABASE_URL
- SUPPORT_SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY

Opcional:
- FROM_ADMIN_EMAIL = ThinkStore Admin <admin@thinkstore.com.ve>
- REPLY_TO_ADMIN = admin@thinkstore.com.ve

## Roles de plataforma
- Inventory: Viewer / Editor / Admin.
- Enterprise: Viewer / Manager.
- Soporte: Recepción / Técnico / Ventas / Logística / Admin.
- Marketing: Viewer / Sender.

El administrador total (admin/superadmin) recibe acceso completo a todas las plataformas.
Las invitaciones usan `ThinkStore Admin <admin@thinkstore.com.ve>` cuando FROM_ADMIN_EMAIL no está definido.
