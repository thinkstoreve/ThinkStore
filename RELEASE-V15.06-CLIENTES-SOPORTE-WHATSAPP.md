# ThinkStore Main V15.06 · Clientes en Soporte + WhatsApp

Base: **V15.05 – Seguimiento Servicio Detallado**.

## Cambios aplicados

### 1. WhatsApp de Servicio Técnico
- Número operativo actualizado a **0414-1032030** (`+58 414 103 2030`).
- Actualizado en seguimiento del cliente, coordinación de entrega, envíos/regiones, Nota de Entrega de Servicio Técnico y campañas de Servicio Técnico.
- El número de **Pago Móvil Bancamiga 0412-0142898** no se modifica porque corresponde a datos de pago, no al WhatsApp comercial.

### 2. Buscar / agregar cliente al crear una orden
En **Soporte → Nueva orden → Datos del cliente** se incorpora el botón **Buscar / agregar cliente**.

El buscador permite localizar por:
- Nombre.
- Teléfono.
- Correo.
- Cédula / RIF.

Fuentes combinadas:
- Clientes registrados en el CRM principal de ThinkStore (`clientes`).
- Clientes atendidos anteriormente en `service_orders`.

Al seleccionar un cliente se completan automáticamente nombre, teléfono, correo, documento, dirección, ciudad/estado, empresa y contacto preferido cuando estén disponibles.

### 3. Cliente nuevo
- Botón **Agregar cliente nuevo** dentro del mismo selector.
- Limpia únicamente los datos del cliente; no borra el resto de la recepción.
- Después de guardar su primera orden, ese cliente queda disponible en futuras búsquedas desde el historial de Servicio Técnico.

### 4. Conexión segura entre Main y Soporte
- Nuevo endpoint `/.netlify/functions/support-client-directory`.
- Valida el token de sesión de Soporte y el rol interno antes de consultar el CRM principal.
- Solo perfiles autorizados de Soporte pueden consultar el directorio.
- No expone service-role keys al navegador.
- Si el CRM principal no responde, Soporte continúa funcionando y utiliza el historial local de reparaciones como respaldo.

### 5. PWA / caché
- Caché de Soporte incrementada para forzar la carga de la nueva interfaz después del deploy.

## Base de datos
**No requiere SQL nuevo.** Utiliza las tablas existentes `clientes` y `service_orders`.

## Deploy
Desplegar el ZIP completo de V15.06 para incluir tanto la interfaz de Soporte como la nueva función segura del directorio de clientes.
