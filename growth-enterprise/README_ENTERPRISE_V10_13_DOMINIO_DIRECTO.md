# Enterprise V10.13 · Dominio directo recuperado
- Misma versión funcional que growth-enterprise del Main V14.89.
- Mantiene enterprise.thinkstore.com.ve como acceso directo.
- Elimina permanentemente el Service Worker/PWA offline antiguo.
- recovery-v1013.html limpia caché y almacenamiento heredado una sola vez.
- Recomendación Netlify del sitio independiente: Base directory = growth-enterprise, Publish directory = ., Functions directory = netlify/functions.
- El sitio independiente y el Main pueden desplegarse desde el mismo repositorio/branch; un solo push actualiza ambos proyectos automáticamente.
