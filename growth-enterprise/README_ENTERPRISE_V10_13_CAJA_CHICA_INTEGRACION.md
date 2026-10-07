# ThinkStore Enterprise V10.13 · Integración financiera + Caja Chica

## Objetivo
Enterprise consolida, controla y audita. No duplica módulos operativos de Admin, Staff, Inventory o Soporte.

## Integraciones
- Ventas normales y pagos mixtos: `pedidos` + `ts_order_payments`.
- Caja Staff: `ts_staff_cash_sessions` + `ts_staff_cash_movements`.
- Inventory: compras, costos, proveedores y COGS existentes.
- Soporte: cobros, abonos, repuestos y comisiones existentes.
- Caja Chica: tablas `enterprise_petty_cash_*`.

## Caja Chica
- Fondo principal con responsable y metas USD/Bs.
- Reposición, gasto menor, reintegro y ajuste.
- BCV histórico obligatorio en movimientos VES.
- Reposición de empresa = transferencia, no gasto.
- Dinero puesto por Freddy o Nelson = deuda de ThinkStore con ese socio.
- Gasto de Caja Chica reduce utilidad una sola vez.
- Mercancía/inventario se registra en Inventory, no en Caja Chica.
- Anulación conserva auditoría; no borra registros.

## Dominio / SSO
Dominio recomendado actual: `https://enterprise.thinkstore.ve`.
Main V14.81 permite cambiarlo con la variable `ENTERPRISE_APP_URL` si tu dominio definitivo es otro.
El botón de acceso de Enterprise vuelve al SSO de `https://thinkstore.com.ve`.

## Variables Netlify de Enterprise
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (o el equivalente ya configurado)
- `SUPPORT_SUPABASE_URL`
- `SUPPORT_SUPABASE_SERVICE_ROLE_KEY` o `SUPPORT_SUPABASE_SECRET_KEY`

## Instalación
1. Ejecutar `MIGRACION-V14.81-ENTERPRISE-V10.13-INTEGRACION.sql` en el Supabase principal, después de las migraciones finales previas.
2. Desplegar este proyecto completo en el sitio Netlify de Enterprise, incluyendo `netlify/functions`.
3. Verificar el custom domain y el HTTPS.
4. Desplegar Main V14.81 al final.
5. Ejecutar las pruebas de integración de la guía final.
