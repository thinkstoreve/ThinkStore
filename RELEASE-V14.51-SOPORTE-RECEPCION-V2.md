# ThinkStore Main V14.51 — Soporte · Recepción V2 restaurada

Corrige la regresión en la que Soporte volvió a mostrar la recepción antigua
oscura de cuatro pasos.

## Restaurado
- Fondo claro `#F5F5F7`.
- Apple / Otros equipos / Consolas y controles.
- `device_category`: `apple | other | gaming`.
- Fallas rápidas.
- Checklist adaptativo.
- Inspección visual adaptativa.
- Fotos privadas: frontal / trasera / detalle.
- Resumen en vivo.
- Apertura y edición de recepciones existentes.

## Se conserva
Supabase ThinkStore-Soporte, QR, seguimiento, hoja de recepción, etiquetas,
bitácora, clientes, órdenes y archivos privados.

No requiere SQL nuevo: los metadatos V2 se guardan en
`reception_checklist.__meta`; las fotos reutilizan `service-order-files` y
`service_order_photos`.
