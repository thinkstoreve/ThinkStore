# Entregas y opiniones del cliente

Recepción y Administración distinguen «Reparado y entregado al cliente» y «No reparado y entregado al cliente». La base conserva `status=Entregado` y añade `delivery_outcome`, manteniendo la compatibilidad de caja, inventario y reportes. El seguimiento y correo identifican la devolución sin reparar.

Una entrega nueva crea un evento privado por orden. Las entregas anteriores a la migración quedan excluidas, incluso si luego se reabren. «Listo para entregar» y «No reparado» no solicitan opiniones todavía. Ambos resultados de entrega invitan a valorar la atención de forma neutral, sin filtrar por puntuación ni ofrecer incentivos.

Dos plantillas en español: `ts_entrega_reparada_opinion_v1` y `ts_entrega_sin_reparar_opinion_v1`. Se verifica en Meta que estén aprobadas como utilidad y que el cliente tenga consentimiento de WhatsApp y no haya solicitado BAJA. Una reclasificación a marketing bloquea el envío y requiere revisar el consentimiento y la configuración.

El envío se intenta al confirmar la entrega. El resumen programado existente recupera hasta cinco pendientes cada cinco minutos, sin depender de tener el navegador abierto. Caducan a los siete días. La reserva atómica por orden impide envíos concurrentes o por cambios repetidos del estado. Un rechazo explícito de Meta permite reintento manual, hasta tres intentos; una respuesta incierta queda bloqueada para verificación y nunca se reenvía automáticamente. Una confirmación de aceptación no equivale a recepción o lectura por el cliente.

En Gestionar aparece el estado de la invitación y el control de reintento seguro. No se envía a clientes históricos ni se realizan envíos reales durante las pruebas.

Migración: `MIGRACION-SOPORTE-VALORACIONES-20261024.sql`, solo proyecto Soporte. Pruebas: Node (45 casos) y `tests/review-delivery-rollback.sql` para validación transaccional. No modifica saldos, pagos, pedidos ni órdenes de producción durante las pruebas.
