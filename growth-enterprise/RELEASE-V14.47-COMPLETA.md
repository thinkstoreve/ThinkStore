# ThinkStore Main V14.47 — Versión completa consolidada

Base consolidada:
- Última versión completa y estable: V14.38 (Orden + logo oficial).
- Cambios V14.47 incorporados directamente, sin depender de un parche separado.

## Incluye V14.47
- `servicio-precios.html` actualizado.
- `netlify/functions/service-parts.js` actualizado.
- El catálogo público de Servicio Técnico puede leer los repuestos desde
  `public.service_parts` del Supabase de Soporte.
- Los cambios realizados desde Inventory se reflejan en el catálogo público.
- Descuentos por repuesto:
  - precio original,
  - porcentaje,
  - precio final,
  - precio anterior tachado,
  - burbuja `-XX%`.
- Si las variables de Soporte no están configuradas, conserva el flujo anterior
  como fallback para reducir el riesgo de caída.

## Variables requeridas en Netlify
Configura para el proyecto principal:
- `SUPPORT_SUPABASE_URL`
- `SUPPORT_SUPABASE_SECRET_KEY`
  o `SUPPORT_SUPABASE_SERVICE_ROLE_KEY`

Deben corresponder al proyecto **ThinkStore-Soporte**.

## Flujo después del deploy
Inventory V3.2.20
→ Supabase ThinkStore-Soporte / `service_parts`
→ función pública `service-parts.js`
→ `servicio-precios.html`

Por tanto, después de este deploy no hace falta volver a desplegar la web
por cada cambio de repuesto, precio, imagen, calidad o descuento.

## Nota de consolidación
No se incorporaron al runtime archivos incompletos de las pruebas V14.42–V14.46
detectadas anteriormente en `ThinkStore-main (9).zip`, porque ese paquete
carecía de varios módulos/migraciones y podía introducir regresiones.
Esta V14.47 prioriza la última base completa estable más la integración pública
actual de repuestos y descuentos.
