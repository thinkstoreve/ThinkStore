# ThinkStore V8.8.25 — Venta presencial y asignación selectiva

Base: ThinkStore-Enterprise-Corregido-Base-Usuario-2026-10-19.zip (ZIP subido en el turno anterior).

- POS: conserva confirmación de pago automática al pulsar Cobrar; se aclara el mensaje de confirmación.
- Admin: productos accesorios (cargadores, cables, fundas) no requieren serial ni bloquean nota de entrega.
- Admin: equipos electrónicos incluidos iPhone, iPad, MacBook, Apple Watch, AirPods y cornetas sí requieren unidad física/serial. IMEI solo donde corresponde.
- Servidor: comprobación de cobertura en unit-assignments.js y admin-update-order.js; accesorios se omiten también en validación del servidor.
- No se han ejecutado migraciones, ni publicado a Netlify, ni probado contra Supabase real.
- Validación pendiente: confirmar clasificación de categorías no contempladas por el identificador conservador y probar pedidos mixtos y los flujos de entrega.
