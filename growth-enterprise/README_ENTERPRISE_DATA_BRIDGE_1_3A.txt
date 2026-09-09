ThinkStore Enterprise Production 1.3-A · Data Bridge

Qué activa:
- Lectura real mediante RPC enterprise_dashboard_snapshot().
- Clientes, pedidos, comprobantes, productos, preórdenes y soporte en modo seguro.
- No escribe, no valida pagos, no cambia estados, no toca Resend ni notas de entrega.

Paso obligatorio en Supabase:
1. Abrir Supabase > SQL Editor.
2. Pegar y ejecutar growth-enterprise/enterprise-data-bridge.sql.
3. Entrar a Enterprise y pulsar Actualizar ecosistema.

Si no ejecutas el SQL, Enterprise seguirá intentando lectura directa, pero puede mostrar 0 cuando RLS bloquee tablas.
