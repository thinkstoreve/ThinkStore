# ThinkStore V15.40.1 — Protección de cobros en reparaciones financiadas

## Qué corrige
- Elimina el botón de cobro completo por un solo clic en órdenes con financiación.
- Obliga a introducir el monto realmente recibido mediante **Registrar abono**.
- Valida el monto ya abonado contra el servidor en el instante del cobro, para rechazar pantallas desactualizadas.
- Conserva otros métodos de cobro y la conversión USD a VES de V15.40.
- Cambia las versiones de caché de Staff y Soporte.

## Qué NO hace
- No borra ni corrige cobros anteriores en producción.
- No resuelve idempotencia absoluta por solicitud: para eso hace falta una llave persistente en la base de datos.
- No cambia el inventario ni envía mensajes de prueba.

## Despliegue
Integra los archivos de este parche por su ruta relativa en GitHub (rama main).
Deja compilar las Netlify Functions del sitio principal y despliega Soporte si vive en otro proyecto.
Comprueba primero que Staff rechace las pantallas antiguas, luego actualiza Staff y Soporte.
Nunca publiques un ZIP mediante arrastrar si estás usando Netlify Functions de GitHub.

## Caso TS-DA53AC91
- Evento nuevo: +USD 60, 2026-10-13 23:25:44 UTC.
- El archivo de rectificación SQL es **independiente** de este parche y cambia dinero real registrado; úsalo solo tras respaldo, con orden sin operaciones concurrentes y validación de resultados.
- Después de corregir Soporte, revisar Caja Chica y Enterprise por separado.
- Conservar dos repuestos instalados, no se generó devolución de efectivo.
