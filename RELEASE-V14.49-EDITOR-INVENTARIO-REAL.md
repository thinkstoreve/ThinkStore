# ThinkStore Main V14.49 — Editor de Inventario Real restaurado

Base: V14.48 completa.

## Qué se corrigió
Se revisaron las versiones anteriores V14.36 y V14.37 y se confirmó que el
editor avanzado original seguía existiendo en `producto-editor.html`, pero el
botón **Editar** de Inventario Real estaba abriendo un editor rápido reducido.

En V14.49 el botón de Inventario Real vuelve a abrir el editor avanzado.

## Editor restaurado
- Ficha de catálogo.
- Categoría.
- Descripción.
- Orden de publicación.
- Publicado / borrador.
- Variantes por:
  - capacidad,
  - color,
  - condición.
- Stock físico.
- Stock mínimo.
- Precio USD.
- Condición Pre-Owned.
- Estado estético:
  - Excelente,
  - Bueno,
  - Bien.
- Salud de batería.
- Detalle automático del estado del equipo.
- Código corto ThinkStore.
- Imágenes:
  - portada general,
  - imagen por color,
  - encuadre,
  - mejora automática,
  - fondo transparente,
  - WEBP,
  - Cloudflare R2.
- Vista previa antes de publicar.

## Cambio de navegación
Desde **Panel → Inventario Real → Editar ficha** se abre directamente
`producto-editor.html` y queda seleccionada la variante exacta desde la que
se hizo clic.

Los botones **± Stock** e **Historial** continúan separados para operaciones
rápidas.

No requiere SQL nuevo.
