THINKSTORE — FIX ESTADOS Y CORREOS

Problema corregido:
- Supabase rechazaba el cambio de estado cuando public.pedidos no tenía la columna updated_at.
- Como la actualización fallaba antes de llegar a Resend, no se enviaba el correo al cliente.

Corrección incluida:
- admin-update-order reintenta de forma compatible sin updated_at si detecta una base antigua.
- supabase_fix_pedidos_updated_at.sql agrega la columna, actualiza registros anteriores,
  instala el trigger automático y recarga la caché del esquema.

Despliegue:
1. Ejecutar supabase_fix_pedidos_updated_at.sql en el Supabase principal.
2. Publicar este ZIP en Netlify.
3. Cambiar el estado de un pedido de prueba y verificar el mensaje de confirmación.
