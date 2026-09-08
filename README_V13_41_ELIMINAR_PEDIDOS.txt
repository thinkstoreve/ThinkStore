ThinkStore V13.41 — Eliminación segura de pedidos no concretados

Base: ThinkStore V13.40 completo.

Cambios:
- En Panel > Pedidos aparece "Eliminar pedido" solo para Admin/Super Admin y solo en pedidos no concretados.
- Antes de borrar se exige doble confirmación y escribir el número exacto del pedido.
- El servidor cambia primero el pedido a Cancelado, luego ejecuta ts_release_inventory y solo después elimina el pedido.
- El stock reservado vuelve a disponible; no modifica stock físico ni stock vendido.
- Si no se puede liberar el inventario, el pedido NO se elimina.
- Pedidos con pago aprobado/verificado, preparación, tránsito, guía, envío, disponible para entrega o entregados quedan protegidos contra borrado.
- Se conserva una entrada de auditoría con el motivo y los datos básicos del pedido eliminado.

No requiere SQL nuevo: reutiliza la función ts_release_inventory que ya usa ThinkStore al cancelar/rechazar pedidos.

Recomendación: probar primero con un pedido de prueba en estado "Pedido recibido" y verificar Inventario real antes/después.
