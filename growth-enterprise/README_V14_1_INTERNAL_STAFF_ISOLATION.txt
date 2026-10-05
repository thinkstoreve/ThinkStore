ThinkStore V14.1 · Internal Staff Isolation

CORRECCIÓN PRINCIPAL
- Usuarios internos ya NO se determina por el campo role.
- Solo aparece personal con profiles.is_internal = true.
- Esta marca se crea únicamente mediante invitación administrativa.
- Los clientes históricos que quedaron como Vendedor por error vuelven a Cliente.
- ThinkStore Staff /staff/ también exige is_internal=true.
- El panel ya no descarga todos los profiles públicos al refrescar datos.

ANTES DE DESPLEGAR
1. Ejecutar supabase_v14_1_internal_staff_isolation.sql en Supabase SQL Editor.
2. Confirmar que el SQL termina sin error.
3. Subir V14.1 a GitHub.

IMPORTANTE
Los Admin/Super Admin existentes se conservan como internos durante la migración.
Las invitaciones creadas desde V13.98+ se reconocen automáticamente usando Auth metadata thinkstore_internal=true.
