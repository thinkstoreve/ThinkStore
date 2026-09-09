ThinkStore V13.36 — Guardado de perfil cliente

CORRECCIÓN
- El formulario ya no falla completo si Supabase todavía no tiene una columna nueva.
- Si PostgREST informa "Could not find ... column of clientes", el guardado reintenta automáticamente con los campos compatibles.
- Se añadió supabase_v13_36_client_profile_fields.sql para crear de forma segura los campos faltantes, incluida agencia_destino.

IMPORTANTE
Ejecutar supabase_v13_36_client_profile_fields.sql en el proyecto Supabase PRINCIPAL de ThinkStore (no en Soporte).
Después hacer un deploy sin caché.
