# ThinkStore Main V15.20 · Menú técnico + Centro de Servicio Técnico

## Panel interno por rol

### Técnico
El menú del técnico conserva la interfaz limpia del panel, pero ahora utiliza iconos lineales ThinkStore y cada módulo carga datos reales del usuario autenticado:

- Dashboard
- Panel técnico
- Diagnóstico
- Repuestos
- Garantías
- Centro de Servicio Técnico

`Panel técnico`, `Diagnóstico`, `Repuestos` y `Garantías` consultan el endpoint personal por rol y muestran solamente información asociada al correo del técnico autenticado.

### Centro de Servicio Técnico
Se conecta el acceso directo al SSO interno existente de ThinkStore:

1. El usuario ya tiene una sesión abierta en el Main.
2. `Centro de Servicio Técnico` llama a `admin-sso` con `platform=support`.
3. El backend valida la sesión Main y el rol autorizado.
4. Se genera una sesión de Soporte de un solo uso.
5. Se abre `/soporte/panel.html` y el panel valida el token automáticamente.

No se solicita nuevamente correo ni contraseña.

## Panel de Soporte · Rol technician

La interfaz de Soporte queda adaptada al técnico autenticado:

- La consulta de órdenes se filtra por `assigned_technician_email`.
- El dashboard muestra únicamente sus órdenes y métricas personales.
- Notas, fotos, repuestos y movimientos visibles se limitan a las órdenes asignadas cargadas en la sesión.
- Se bloquea la gestión de una orden que no esté asignada al técnico.
- El técnico no puede reasignar técnicos.
- El técnico no puede modificar campos de cobro, forma de pago, entrega o recepción.
- Los cambios de estado se limitan al flujo técnico permitido.
- Recepción de equipos queda reservada a roles con permiso de recepción.

## Dashboard de Soporte para técnico

Muestra:

- Asignados
- Reparados
- No reparados
- Aprobados
- No aprobados
- Cobrados
- Repuestos preparados
- En proceso
- Órdenes asignadas recientes

## Interfaz

- Iconos SVG lineales actualizados en Main y Soporte.
- `Centro de Servicio Técnico` tiene tratamiento visual destacado.
- Diseño responsive conservado.
- Caché de Main: `thinkstore-admin-v15-20`.
- Caché de Soporte: `thinkstore-support-v8-8-7-r1520`.
- Assets Soporte: `15.20.0`.

## Backend personal

`role-dashboard.js` amplía la respuesta del técnico con:

- órdenes asignadas;
- diagnósticos / trabajos realizados / pruebas;
- repuestos de sus órdenes;
- precio de venta de repuestos;
- métricas personales;
- comisión/base comisionable cuando existe información configurada.

## Base de datos

No requiere SQL nuevo para esta versión.

> Nota: esta versión restringe las consultas y acciones de la aplicación según el técnico autenticado. No modifica las políticas RLS globales históricas del Supabase de Soporte.
