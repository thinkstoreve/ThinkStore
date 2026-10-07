# ThinkStore Main V14.83

- Staff y operaciones presenciales fijados al Supabase principal de ThinkStore.
- Compatibilidad con perfiles por `id`, `user_id` y tabla legacy `roles_usuarios`.
- Caja Staff, avatar y creación/confirmación de venta usan el mismo Supabase principal.
- Enterprise conserva `https://enterprise.thinkstore.ve` como dominio canónico.
- Mientras ese DNS esté caído, Acceso Unificado usa temporalmente `https://enterprise.thinkstore.com.ve`.
- Cuando `.ve` vuelva a resolver, se selecciona automáticamente de nuevo.
- No requiere SQL nuevo.
