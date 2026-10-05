ThinkStore V14.37 — Integración de etiquetas con HereLabel

Cambios:
- Soporte genera la etiqueta QR como PDF en medida real.
- Formato 40 x 60 mm disponible para la etiquetadora M1.
- Se conserva el formato anterior.
- Nuevo botón "Abrir en HereLabel" dentro del selector de formato.
- En iPhone/iPad usa la hoja Compartir del sistema para enviar el PDF directamente a HereLabel.
- Si el navegador no permite compartir archivos, descarga el PDF como alternativa.
- Se conserva la opción "Imprimir desde navegador".
- No se modificaron Supabase, órdenes, QR de seguimiento ni estados del servicio.

Nota técnica:
HereLabel admite importar/imprimir PDFs. Desde Safari/iOS no existe un deep-link público documentado de HereLabel que permita seleccionar la app sin interacción del usuario. Por seguridad de iOS, la apertura se realiza desde una acción del usuario; tras pulsar "Abrir en HereLabel", seleccionar HereLabel en la hoja Compartir.
