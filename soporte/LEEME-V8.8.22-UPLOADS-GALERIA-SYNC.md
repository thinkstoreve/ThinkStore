# ThinkStore Soporte V8.8.22

- Las Functions/R2 ya no pasan por la cola offline.
- Subidas de imágenes muestran progreso y error real.
- Imágenes de reparación se guardan obligatoriamente en R2 cuando son imágenes.
- Miniaturas se cargan desde el backend privado con fallback visible y botón Reintentar.
- Lightbox mejorado con X/Cerrar grande y ESC.
- Cola offline descarta operaciones binarias antiguas no reproducibles y no bloquea el resto por errores permanentes.
- Bitácora añade plantilla Equipo listo y activa correo automáticamente cuando la orden tiene email.

No requiere SQL nuevo. Mantiene las variables SUPPORT_R2_* ya configuradas.
