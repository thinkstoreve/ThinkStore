# Soporte V8.8.8 — Acceso único (basado en V8.8.7)

- Interfaz oficial: `/panel.html` en el dominio de Soporte.
- `/` y `/index.html` redirigen a `panel.html` en el mismo origen, conservando query y hash.
- No se modifica `panel.html`, `app.js`, Supabase, credenciales, funciones financieras ni la web principal.
- **Importante:** en el dominio principal `thinkstore.com.ve/soporte/*` existe una redirección a `soporte.thinkstore.com.ve`, que se conserva.
- No hay cambios de base de datos ni SQL.
- Pruebas por realizar tras despliegue: acceso por `/`, `/index.html`, `/panel.html`, sesión y creación de orden en navegador real.
- Versión anterior base: `ThinkStore-Soporte-V8.8.7-RECEPCION-UNIFICADA-COMPLETO.zip`.
