# ThinkStore Main V14.59 — Panel Recuperado

Base: V14.58.

- Restaura el logo de carga anterior: `logo-thinkstore.png` (T blanca sobre negro).
- El Panel muestra su interfaz antes de consultar datos secundarios.
- Supabase, permisos y datos reales se refrescan en segundo plano.
- Fail-safe absoluto a los 5 segundos.
- Se elimina `offline-runtime.js` solamente del Panel Administrativo.
- Se desregistra `panel-sw.js` y se limpian caches `thinkstore-admin-*` antiguos.
- Inventory, Soporte y Enterprise mantienen sus implementaciones offline.
- No requiere SQL.
