ThinkStore V63 Admin de accesos

Incluye:
- Módulo Permisos dentro de panel.html solo para admin/superadmin.
- Crear/editar/desactivar accesos por correo.
- Roles: cliente, vendedor, recepción, soporte, técnico, logística, admin y superadmin.
- Matriz visual para activar/desactivar módulos por rol.
- SQL nuevo: supabase_v63_admin_accesos.sql

Para producción:
1. Ejecuta supabase_v62_roles_permissions.sql si no lo hiciste.
2. Ejecuta supabase_v63_admin_accesos.sql.
3. Crea primero los usuarios en Supabase Auth.
4. Asigna el primer superadmin con el bloque comentado al final del SQL.
5. Desde panel.html > Permisos podrás administrar accesos.
