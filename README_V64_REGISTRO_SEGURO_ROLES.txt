ThinkStore V64 Registro Seguro por Roles

Incluye:
- Registro público solo para clientes.
- Roles internos solo por invitación creada por Admin/Super Admin.
- Panel de Usuarios internos e invitaciones.
- Matriz de permisos por rol.
- 2FA opcional para accesos internos.
- Auditoría local de cambios.
- Comisiones para vendedores.
- SQL de Supabase: supabase_v64_roles_seguro.sql

Uso recomendado:
1. Subir el ZIP a GitHub/Netlify.
2. Ejecutar supabase_v64_roles_seguro.sql en Supabase.
3. Registrar tu cuenta principal desde la web.
4. En Supabase, asignar tu correo como superadmin.
5. Desde el panel, crear invitaciones para vendedores, recepción, técnicos y logística.

Nota:
La versión incluida funciona en modo local para probar el flujo visual. Para producción, se debe conectar la lectura/escritura de perfiles, invitaciones y permisos a Supabase con RLS activo.
