# ThinkStore Main V14.55 — Panel Boot Fix

Base: V14.54.

## Problema corregido
El registro del service worker del Panel Administrativo se insertó por error
dentro de una plantilla JavaScript utilizada para imprimir el cierre de caja.

Eso producía un error de sintaxis en el script principal y el Panel quedaba
permanentemente en:

`Preparando tu cuenta…`

## Corrección
- Se eliminó la inserción defectuosa.
- El service worker `panel-sw.js` ahora se registra únicamente al final real
  de `panel.html`.
- Se validaron con `node --check` todos los bloques JavaScript inline de
  `panel.html`.
- Se añadió un watchdog de arranque de 12 segundos para evitar que una futura
  excepción deje la pantalla de carga bloqueada indefinidamente.
- Se conservan todas las funciones de V14.54:
  - Responsive escritorio / iPad / móvil.
  - PWA.
  - modo offline.
  - Enterprise global.
  - Inventory conectado.
  - Soporte V8.3.
  - Enterprise V10.1.

No requiere SQL nuevo.
