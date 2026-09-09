ThinkStore V55 - Auditoría técnica Dashboard / Correos

Correcciones aplicadas:
- admin-update-order ahora acepta THINKSTORE_ADMIN_SECRET o THINKSTORE_ADMIN_CODE/[CODIGO ADMIN], igual que admin-data.
- Se evitó el envío duplicado de correos: si Netlify actualiza el estado y envía correo, el frontend ya no dispara otro correo adicional.
- El botón manual de correo usa Resend en lugar de abrir el cliente de correo local.
- Los correos de estado apuntan al enlace de seguimiento del pedido.
- Reply-To respeta pedidos, preórdenes y soporte según el estado.

Revisión técnica:
- admin-data lee clientes directamente desde Supabase con Service Role.
- Dashboard debe mostrar todos los registros reales de la tabla clientes.
- Si una consulta de pedidos falla, clientes no se bloquea.
