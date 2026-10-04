ThinkStore Soporte V7.19 — Estándar de observaciones por modelo

Desde esta versión, cada modelo con recursos visuales propios usa el mismo contrato:
- thumbnail: miniatura transparente del modelo.
- inspectionViews.all: composición completa de inspección.
- inspectionViews.front: solo vista frontal.
- inspectionViews.side: solo laterales disponibles.
- inspectionViews.back: solo vista trasera.

La vista Completo no superpone caras. Las vistas se distribuyen separadas sobre fondo transparente.
Los próximos modelos deben incorporarse siguiendo exactamente este patrón sin modificar los modelos ya aprobados.

En iPhone 8 se reorganizó la vista Completo con frontal, trasera y laterales separados, y la pestaña Lateral muestra ambos laterales a partir del recurso disponible.
