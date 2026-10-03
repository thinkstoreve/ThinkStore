# ThinkStore Main V14.54 — Responsive + Offline Suite

Base: V14.53.

## Dispositivos
Se adapta de forma específica a:
- Escritorio / Mac / PC
- iPad y tablets
- iPhone / Android

Incluye layouts, tablas, modales, menús, editores y controles táctiles adaptativos.

## Panel administrativo
`panel.html` ahora es una PWA independiente:
- manifest propio,
- service worker propio,
- apertura local después de la primera carga,
- cache de lecturas reales por usuario,
- cola local de operaciones,
- sincronización al reconectar.

## Soporte
Incluye ThinkStore Soporte V8.3 responsive + offline.

## Enterprise
Incluye ThinkStore Enterprise V10.1 responsive + offline.

## Inventory
Se mantiene como proyecto separado en V3.2.24, porque su despliegue es Cloudflare Pages.
Inventory ya poseía guardado local / pendingOfflineSync / recuperación de conflictos;
V3.2.24 corrige y amplía PWA + responsive.

## Límites reales del modo offline
- Primera instalación / primer acceso requieren Internet.
- Correos, WhatsApp, tasas, pagos externos y servicios de terceros requieren Internet.
- Las operaciones pendientes se mantienen localmente y se reintentan al reconectar.
- No cierres sesión ni borres datos del navegador mientras existan cambios pendientes.
