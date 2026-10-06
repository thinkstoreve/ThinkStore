ThinkStore Soporte V8.5 — Portal Cliente Premium

CORREO
- Diseño minimalista tipo Apple.
- Logo ThinkStore visible.
- Solo muestra orden, equipo, estado y botón "Ver seguimiento".
- Los detalles técnicos ya no saturan el correo.

SEGUIMIENTO
- Enlace seguro por token por orden.
- Estado y línea de progreso.
- Resumen técnico.
- Bitácora y diagnóstico detallados.
- Trabajo realizado, repuestos, pruebas y observaciones.
- Galería de imágenes publicadas por el técnico.
- Mensajes del técnico.
- El cliente puede responder desde el mismo seguimiento.
- Actualización automática cada 15 segundos.

PANEL DE SOPORTE
- Las fotos pueden marcarse "Visible para el cliente".
- Cada imagen puede llevar descripción.
- Se puede publicar/ocultar una imagen después de subirla.
- Nuevo hilo "Mensajes con el cliente" en la gestión de la orden.

SEGURIDAD
- El detalle completo no se abre solo con el número de orden.
- Correos y QR usan un token único de la orden.
- La vista por código sin token solo muestra estado básico.
- Respuestas del cliente pasan por una Netlify Function validada por token.

ANTES DEL DEPLOY
Ejecutar una vez MIGRACION-SOPORTE-V8.5-PORTAL-CLIENTE.sql en Supabase ThinkStore-Soporte.
No ejecutar en el Supabase principal de ThinkStore.
