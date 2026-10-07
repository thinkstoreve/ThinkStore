# ThinkStore Main V14.98 · Soporte login responsive + Recepcionista

Cambios acotados:
- Login de Soporte rediseñado y responsive para móvil/escritorio.
- Acceso unificado destacado: vendedores habilitados entran con la misma cuenta ThinkStore.
- Rol de Soporte `reception` mostrado como **Recepcionista**.
- Un vendedor puede tener App Ventas + Servicio Técnico y usar Soporte como Recepcionista.
- Recepcionista limitado a Dashboard, Notificaciones, Citas, Órdenes, Recepción y Clientes.
- Bienvenida personalizada al entrar a Soporte con nombre y rol.
- Cada recepción registra nombre, correo, rol y hora de quien ingresó el equipo.
- La lista de órdenes y el modal de recepción muestran quién recibió el equipo.
- Cache de Soporte actualizado para evitar UI antigua.

Sin cambios en:
- Enterprise.
- BCV automático.
- Caja Staff.
- Reparaciones / cobros.
- Inventario y finanzas fuera de los permisos de rol.

No requiere SQL nuevo: utiliza `created_by_email`, `reception_checklist` y `service_users` existentes.
