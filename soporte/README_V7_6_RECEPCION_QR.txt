ThinkStore Soporte V7.6 — Recepción + hoja + QR + etiqueta

Cambios principales:
- Una cita web ya NO crea una orden inmediatamente.
- "Recibir equipo" abre la ficha de recepción con datos precargados.
- La orden TS-SVC se crea solo al finalizar y guardar todos los datos del ingreso.
- Tras guardar aparece un resumen con:
  * Imprimir hoja de recepción.
  * Imprimir etiqueta QR para el dispositivo.
  * Abrir seguimiento público.
- En Órdenes de servicio también quedan disponibles "Hoja" y "Etiqueta QR".
- seguimiento.html permite al cliente consultar el estado en vivo con el número de orden.
- El QR solo codifica la URL de seguimiento y el número de orden; no datos personales.

No requiere SQL nuevo si lookup_service_order ya está instalado (incluido en supabase_soporte_produccion.sql de esta base).
Para probar localmente, la hoja/etiqueta usa un QR generado por api.qrserver.com; requiere conexión a Internet al imprimir.
