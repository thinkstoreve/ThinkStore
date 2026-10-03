# ThinkStore Main V14.53 — Dashboard + Enterprise global semanal

Base: V14.52.

## Soporte V8.2
Dashboard real por día y semana:
- servicios recibidos,
- cobrados,
- pendientes por cobrar,
- listos,
- entregados,
- por entregar,
- citas,
- servicio a domicilio,
- detalle diario.

Cobranza real:
- Estado: Pendiente / Abono parcial / Cobrado
- Monto cobrado
- Método de pago
- Nota de cobro
- Fecha de cobro
- Modalidad: Presencial / A domicilio / Envío nacional

## Enterprise V10
Conexión global entre Supabase principal + ThinkStore-Soporte:
- Ventas online
- Ventas presenciales
- Pedidos cobrados / pendientes
- Citas
- Servicio Técnico
- Servicio a domicilio
- Listos / entregados / por entregar
- Resumen diario de lunes a domingo
- Cobrado global

Distribución automática semanal sobre dinero COBRADO:
- Empresa: 50%
- Socio A: 25%
- Socio B: 25%

Los montos pendientes no entran en el reparto.

## Panel administrativo
Se activa un módulo Enterprise dentro del Panel principal, con resumen global
y enlace al panel Enterprise completo.

## SQL requerido
Ejecutar una sola vez en ThinkStore-Soporte:
`MIGRACION-SOPORTE-V8.2-COBRANZA-ENTERPRISE.sql`

## Variables requeridas en Enterprise / Netlify
Principal:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Soporte:
- SUPPORT_SUPABASE_URL
- SUPPORT_SUPABASE_SECRET_KEY
  o SUPPORT_SUPABASE_SERVICE_ROLE_KEY
