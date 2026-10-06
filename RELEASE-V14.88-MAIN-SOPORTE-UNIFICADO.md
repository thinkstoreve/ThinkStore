# ThinkStore V14.88 — Main + Soporte unificado

Esta versión integra ThinkStore Soporte V8.8.8 dentro de `/soporte/` y publica sus funciones desde `netlify/functions`.

## Deploy
Subir **solo este Main** a Netlify. No es necesario desplegar el proyecto de Soporte por separado.

## Variables necesarias en el sitio Main
- SUPPORT_SUPABASE_URL
- SUPPORT_SUPABASE_SERVICE_ROLE_KEY (o SUPPORT_SUPABASE_SECRET_KEY)
- RESEND_API_KEY
- variables existentes del Supabase principal

## SQL
Los SQL de V8.8.8 se ejecutan una sola vez en el Supabase de Soporte.

## Ruta
- Panel Soporte: `/soporte/panel.html`
- Seguimiento: `/soporte/seguimiento.html`
