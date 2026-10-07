# ThinkStore Main V14.85 · Servicio Técnico restaurado en Staff

- Restaura la pestaña **Servicio Técnico** en la barra lateral de ThinkStore Staff.
- Se muestra a administradores/superadministradores y a cuentas con permiso `platform.support`.
- También es compatible con roles de recepción, soporte, técnico y logística cuando tienen acceso a Staff.
- Usa el acceso unificado existente mediante `sso-entry.html?platform=support`; no solicita una segunda contraseña.
- Mantiene intactos V14.84 Staff Auth, ventas, pagos mixtos, BCV, Caja Staff y Enterprise fallback.
- Actualiza el Service Worker a `thinkstore-staff-v14-85-0` para invalidar la UI anterior.
- No requiere SQL nuevo.
