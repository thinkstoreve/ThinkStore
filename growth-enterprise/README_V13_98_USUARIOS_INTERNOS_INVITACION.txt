ThinkStore V13.98 · Usuarios internos + invitación por correo

Cambios principales
- Usuarios internos muestra únicamente empleados, administradores y socios autorizados.
- Los perfiles con rol Cliente quedan excluidos desde la función administrativa.
- Administrador y Super Admin pueden invitar empleados desde el panel.
- Administrador puede asignar roles operativos, pero no crear/modificar Admin o Super Admin.
- Super Admin puede asignar todos los roles internos y administrar roles personalizados.
- La invitación crea el acceso en Supabase Auth y envía un correo ThinkStore mediante Resend.
- El empleado abre el enlace y crea su propia contraseña en panel-login.html.
- Si falla el correo, se revierte la cuenta incompleta.
- Se registra el alta en audit_log cuando la tabla está disponible.

Configuración requerida
- SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Netlify (ya usados por el panel).
- RESEND_API_KEY en Netlify (ya usada por correos/campañas ThinkStore).
- En Supabase Authentication > URL Configuration, permitir:
  https://thinkstore.com.ve/panel-login.html?view=recovery

No requiere SQL nuevo si ya están desplegados profiles, ts_roles y permisos actuales.
