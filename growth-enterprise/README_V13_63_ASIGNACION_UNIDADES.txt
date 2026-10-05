ThinkStore V13.63 · Unidades físicas + asignación + nota de entrega

FLUJO OPERATIVO
1. Pedido recibido.
2. Pago confirmado.
3. Asignación de unidad física.
4. Nota de entrega habilitada.
5. Despacho / entrega.

NOVEDADES
- Nuevo botón "Asignar equipo" dentro de cada pedido.
- La asignación queda bloqueada hasta confirmar el pago (excepto venta presencial).
- Soporta múltiples unidades por renglón/cantidad.
- Serial obligatorio para toda unidad.
- IMEI obligatorio para iPhone/teléfonos.
- Nuevo:
  * serial
  * IMEI cuando aplica
  * condición general = Nuevo
  * batería no aplica
- Pre-Owned:
  * serial
  * IMEI cuando aplica
  * condición general Excelente / Bueno / Bien
  * salud de batería obligatoria 1-100%
  * observaciones opcionales
- Puede registrar una unidad al asignarla o elegir una unidad física disponible ya registrada.
- Evita reutilizar una unidad ya asignada.
- Serial e IMEI son únicos.
- Reemplazar/liberar una unidad invalida la versión activa de la nota.
- La nota de entrega NO se envía automáticamente al aprobar el pago.
- La nota solo puede verse/enviarse cuando todas las unidades del pedido estén asignadas.
- La nota muestra por unidad:
  * serial
  * IMEI
  * condición comercial
  * condición general
  * batería Pre-Owned
  * observaciones
- Versionado de notas de entrega mediante delivery_note_versions.
- Cliente: la nota también queda bloqueada hasta completar la asignación física.
- Inventario visual: nuevo acceso "Unidades físicas".
- Módulo de unidades físicas con estados:
  * Disponible
  * Asignada
  * Vendida
  * Devuelta
  * En servicio
- Registro previo de unidades físicas desde Inventario.
- Intenta vincular automáticamente la unidad creada al inventory_variant correspondiente.
- Auditoría de creación, asignación y liberación.
- Al marcar Entregado, las unidades asignadas pasan a Vendida.
- Al cancelar/rechazar, se intenta liberar la unidad junto al inventario de variante.

SQL REQUERIDO
Ejecutar una sola vez:
supabase_v13_63_unidades_fisicas.sql

Crea:
- inventory_units
- order_unit_assignments
- delivery_note_versions

SEGURIDAD
- Las tablas tienen RLS habilitado.
- anon/authenticated no reciben acceso directo.
- Las operaciones se realizan mediante Netlify Functions con autorización interna.
- No modifica SKU ni IDs existentes de inventory_variants.

IMPORTANTE
No se realizaron pruebas contra el Supabase de producción ni deploy desde ChatGPT.
