# ThinkStore Main V14.58 — Panel Boot Robusto

Base: V14.57.

- Logo oficial ThinkStore embebido en panel.html.
- El splash ya no depende de rutas de imágenes.
- El panel abre antes de consultar datos secundarios.
- Recuperación de sesión Supabase con timeout.
- Permisos administrativos con timeout.
- Watchdog de 8 segundos.
- Si existe sesión local, abre la copia local y sincroniza después.
- Si no existe sesión, redirige al login.
- Cache PWA actualizado a V14.58.
- Reglas Netlify no-cache para panel.html y panel-sw.js.

No requiere SQL.
