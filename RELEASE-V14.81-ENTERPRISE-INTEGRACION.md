# ThinkStore Main V14.81 · Enterprise integrado

Esta versión es acumulativa sobre V14.80 y conserva:
- Staff Ventas unificado
- fotos de perfil
- BCV automático con tasa histórica
- pagos mixtos
- Caja Staff

Cambios V14.81:
- Acceso unificado abre el dominio independiente de Enterprise en vez de la copia embebida.
- `ENTERPRISE_APP_URL` permite fijar el dominio real de Enterprise sin recompilar Main. El valor por defecto es https://enterprise.thinkstore.ve.
- Caja Staff guarda equivalente USD y BCV histórico también en movimientos manuales en bolívares.
- Incluye Enterprise V10.13 como copia de compatibilidad/fallback en `/growth-enterprise/`.
- Incluye la migración `MIGRACION-V14.81-ENTERPRISE-V10.13-INTEGRACION.sql`.

Despliega Enterprise V10.13 primero y Main V14.81 al final.
