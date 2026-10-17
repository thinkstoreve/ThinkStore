# Soporte V8.8.11 — Esquema compacto y miniatura de impresión

- Se compactó el visor del esquema en Recepción para escritorio, preservando los clics de marcas.
- La hoja impresa de recepción incluye una miniatura de la imagen correspondiente al modelo cuando está disponible.
- Reconstruye las marcas guardadas en la vista general (`all`) desde `visual_condition`. Las marcas realizadas en vistas específicas permanecen descritas en observaciones, pero no se superponen a la miniatura general.
- La clave/PIN no se agrega a hojas impresas, etiquetas, correos ni seguimiento.
- No se modificaron lógica de cobro, órdenes ni datos en Supabase.
- Verificar localmente con Live Server: seleccionar iPhone 8, colocar una marca en vista Completo, guardar una orden de prueba en entorno autorizado y abrir Hoja. El dibujo y la marca deben mostrarse sin PIN.
- Esta entrega no ha sido probada con autenticación ni datos reales en producción; no desplegar hasta validación.
