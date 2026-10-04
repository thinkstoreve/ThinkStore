# ThinkStore V14.69 · Hotfix Administradores y perfiles

## Corrección
- Permite al Super Admin promover un usuario interno/socio a **Administrador**.
- Compatibilidad automática con esquemas `role/active` y esquemas históricos `rol/activo`.
- No intenta escribir columnas modernas opcionales si todavía no existen en `profiles`.
- Mantiene sincronización de Inventory, Soporte, Enterprise y metadatos Auth.
- Solo Super Admin puede conceder o modificar niveles Administrador/Super Admin.
- Los errores de actualización muestran detalle útil si Supabase rechaza una operación.

## Deploy
Desplegar este paquete sobre el sitio principal ThinkStore en Netlify. No requiere SQL nuevo para promover a Administrador.
