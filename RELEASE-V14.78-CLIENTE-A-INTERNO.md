# ThinkStore V14.78 · Cliente → Usuario interno

## Cambio principal
El Panel Admin ya no bloquea una invitación cuando el correo ya pertenece a un cliente.

Flujo nuevo:
1. El Super Admin completa nombre, correo, rol y plataformas.
2. Si el correo ya existe como cliente, el panel muestra **Promover e invitar**.
3. Al confirmar, se conserva el mismo `auth.users.id`, la cuenta, contraseña, pedidos, reparaciones e historial.
4. `profiles.is_internal` pasa a `true`, se asignan rol/permisos/plataformas y se sincronizan Inventory/Soporte.
5. Se actualiza metadata de Auth con `thinkstore_internal=true`.
6. Se envía un correo desde `admin@thinkstore.com.ve` indicando que use su contraseña habitual.

## Seguridad
- Un usuario interno ya existente no se duplica.
- La promoción solo la puede ejecutar Admin/Super Admin; las reglas de privilegio existentes siguen vigentes.
- Un fallo de correo no revierte ni elimina la cuenta; el acceso puede quedar habilitado con advertencia de envío.
- No se elimina ningún registro de `clientes` ni su historial comercial.

## Base
Acumulativa sobre V14.77 Enterprise mismo origen.
No requiere SQL adicional si ya se ejecutó SQL-01A de perfiles/clientes.
