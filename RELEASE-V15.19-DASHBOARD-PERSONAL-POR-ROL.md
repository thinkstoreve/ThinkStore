# ThinkStore Main V15.19 · Dashboard personal por rol

## Objetivo
El panel principal del personal interno deja de mostrar métricas globales y presenta únicamente resultados asociados al usuario autenticado.

## Técnico
- Equipos asignados.
- Reparados.
- No reparados.
- Aprobados por cliente.
- No aprobados.
- Reparaciones cobradas y monto cobrado.
- Órdenes abiertas asignadas.
- Comisión generada registrada.
- Base comisionable y porcentaje (muestra "Por definir" hasta configurarlo).
- Lista de sus órdenes recientes.

La consulta se filtra en servidor por `assigned_technician_email`.

## Vendedor
- Ventas realizadas.
- Ventas cobradas.
- Pendientes.
- Canceladas / rechazadas.
- Monto vendido.
- Monto cobrado.
- Comisión personal y base comisionable.
- Lista de sus ventas recientes.

La consulta se filtra en servidor por `salesperson_user_id` o `salesperson_email`.

## Recepción / Soporte
- Equipos recibidos por el usuario.
- En proceso.
- Listos para entregar.
- Entregados.
- Cobrados y monto cobrado.
- Lista de recepciones propias recientes.

## Seguridad
- Las métricas personales se calculan en `/.netlify/functions/role-dashboard` usando la sesión interna real.
- No se envían al navegador datos globales para estos roles.
- Admin y Super Admin conservan el dashboard global existente.

## Navegación
- Vendedor, Recepción, Soporte, Técnico y Logística abren `Dashboard` como inicio de su rol.
- Los módulos operativos continúan sujetos a los permisos actuales.

## Comisión
La interfaz queda preparada para porcentajes individuales. Hasta definirlos, muestra `Por definir`. Si ya existen movimientos de comisión de técnico en Enterprise, se reflejan automáticamente.

## SQL
No requiere SQL nuevo.
