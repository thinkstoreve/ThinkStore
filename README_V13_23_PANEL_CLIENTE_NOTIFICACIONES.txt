ThinkStore V13.23 · Panel Cliente Premium + citas automáticas

- Panel del cliente renovado: saludo, KPIs útiles, cuenta, pedidos con progreso, reparaciones/citas, garantías, Trade-IN y VIP.
- Corrige fechas inválidas mostrando “—” si un registro no contiene una fecha válida.
- Mejora detección de totales desde varios campos reales del pedido.
- Las citas web nuevas se guardan con estado “agendada”, sin requerir confirmación manual.
- La cita envía un correo transaccional mediante Resend a la dirección del cliente.
- El panel cliente consulta sus citas de la base independiente ThinkStore-Soporte mediante una Netlify Function autenticada.
- Ejecutar supabase_v13_23_appointments_auto_confirm.sql SOLO en Supabase ThinkStore-Soporte.
- Requiere en Netlify: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPPORT_SUPABASE_URL, SUPPORT_SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.
