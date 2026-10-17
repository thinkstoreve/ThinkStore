# Soporte V8.8.16 — CORS de recepción y caché de Service Worker

## Causa verificada

La función del **sitio MAIN** `netlify/functions/registered-reception.js` devolvía OPTIONS sin Access-Control-Allow-Origin, aunque el panel opera en `https://soporte.thinkstore.com.ve`. El navegador cancela el POST antes de crear la orden.

## Cambios

- Main: respuesta CORS restringida a los orígenes HTTPS reconocidos, con preflight OPTIONS, métodos y encabezados autorizados. Conserva autorización JWT y restricciones de roles.
- Soporte: `sw.js` clona la respuesta antes de entregarla al navegador, evitando el error `Response body is already used`.

## Publicación

**Corregir solo Soporte no soluciona el CORS:** la función debe actualizarse en el sitio Netlify que sirve `https://thinkstore.com.ve/.netlify/functions/registered-reception` (MAIN). El service worker se actualiza en el despliegue independiente de Soporte. No desplegar ZIP completo de Main en el sitio Soporte ni viceversa.

## Comprobación

Hacer OPTIONS al endpoint con Origin: https://soporte.thinkstore.com.ve y Access-Control-Request-Headers: authorization,content-type. Debe devolver Access-Control-Allow-Origin exactamente igual al Origin, y Access-Control-Allow-Methods: POST, OPTIONS. Después, crear orden de prueba desde el panel. CORS resuelto no garantiza éxito de BD: pueden aparecer errores de permisos, esquema o función SQL, que deben tratarse por separado.

No se ha publicado ni se han creado órdenes reales en este proceso.
