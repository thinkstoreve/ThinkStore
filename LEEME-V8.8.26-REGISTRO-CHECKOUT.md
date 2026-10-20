# V8.8.26 – Registro y checkout

- Registro valida documento, teléfono, dirección, ciudad y estado.
- Perfil nuevo incluye documento y domicilio en metadatos de sesión mientras se confirma el correo.
- Correcciones en checkout persisten en tabla clientes de Supabase y actualizan la sesión local solo tras éxito.
- Checkout verifica y sincroniza los datos antes de avanzar y finalizar pedidos.
- Clientes existentes completan los campos faltantes sin vaciar carrito.
- No requiere cambios SQL. No se realizó despliegue.
