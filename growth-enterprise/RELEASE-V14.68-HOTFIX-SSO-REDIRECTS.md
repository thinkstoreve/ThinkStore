# ThinkStore Main V14.68 · Hotfix SSO / Redirects seguros

## Qué corrige
- App Ventas, Marketing y Panel Admin ya no fuerzan `https://thinkstore.com.ve`; usan el origen real desde el que está abierto el Panel.
- `SITE_URL` del frontend toma `window.location.origin`, evitando saltos al dominio equivocado durante recuperación/autenticación.
- El SSO valida el destino solicitado antes de redirigir cuando Supabase devuelve un `redirect_to` diferente.
- Mantiene Soporte, Inventory y Enterprise en sus dominios dedicados.

## IMPORTANTE: configuración obligatoria en Supabase
El hotfix evita redirecciones peligrosas, pero Supabase debe permitir explícitamente los destinos de SSO.

### Proyecto principal ThinkStore → Authentication → URL Configuration
Site URL: usa el dominio principal REAL que abre correctamente el Panel.

Redirect URLs recomendadas:
- https://inventory.thinkstore.com.ve/
- https://enterprise.thinkstore.com.ve/
- https://thinkstore.com.ve/**
- https://www.thinkstore.com.ve/**  (solo si www también se usa)

### Proyecto ThinkStore-Soporte → Authentication → URL Configuration
Redirect URLs:
- https://soporte.thinkstore.com.ve/panel.html
- https://soporte.thinkstore.com.ve/**

## DNS / dominios
`thinkstore.com.ve`, `soporte.thinkstore.com.ve`, `inventory.thinkstore.com.ve` y `enterprise.thinkstore.com.ve` deben resolver a sus despliegues reales. No deben usar URL forwarding/parking.

## Seguridad
Si un token terminó visible en un dominio ajeno (por ejemplo `instantfwding.com/#access_token=...`), cierra/revoca esa sesión antes de volver a probar.
