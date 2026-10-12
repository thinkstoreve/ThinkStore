# ThinkStore V15.37.3 · Recepción completa el perfil registrado

## Problema corregido

Cuando una persona se registraba en la web y pedía cita sin completar cédula/RIF o dirección, Recepción de Soporte rechazaba la creación de su orden aunque el personal rellenara esos campos manualmente. La validación anterior consultaba y rechazaba el perfil incompleto **antes** de aceptar lo ingresado en recepción.

## Solución

1. Recepción envía los datos escritos en el formulario al endpoint seguro `registered-customer` con `source=support`.
2. El endpoint verifica que quien opera tenga una sesión de Soporte y un rol autorizado, y resuelve el cliente por correo en Supabase Main.
3. El servidor comprueba la vinculación con Auth y que el correo esté confirmado antes de completar campos.
4. Completa únicamente campos vacíos del perfil canónico (`nombre`, `telefono`, `cedula_rif`, `direccion`, `ciudad`, `estado`) con valores del formulario; no reemplaza datos existentes. Valida el perfil completo antes de escribir.
5. Usa un PATCH condicional; si se modificó el perfil concurrentemente, devuelve un mensaje para reintentar, sin sobreescribir los datos nuevos.
6. Tras la actualización, Recepción genera o actualiza la orden con el perfil canónico, conserva el flujo de cita web, fotos, bitácora y notificaciones.

## Archivos modificados

- `netlify/functions/registered-customer-core.js`
- `netlify/functions/registered-customer.js`
- `soporte/app.js`
- `soporte/index.html`
- `soporte/panel.html`
- `soporte/sw.js`
- `tests/reception-complete-profile.test.js`
- `tests/registered-customer-reception-api.test.js`

## Publicación

- Aplicar el parche conservando su estructura de carpetas sobre el **repositorio actual**. No reemplazar el repositorio completo con el parche.
- Publicar a través de GitHub / Netlify para que se compile `netlify/functions`.
- **Main primero** (`thinkstore.com.ve`), porque allí reside la función que actualiza el perfil en Supabase principal.
- **Soporte después** (`soporte.thinkstore.com.ve`), con las nuevas versiones de app.js, index/panel y sw.js. Si Soporte es un proyecto Netlify separado, asegurar que detecte cambios del mismo repositorio o desplegar esa aplicación desde su fuente.
- Evitar desplegar el ZIP como arrastrar y soltar en Netlify: eso podría omitir la compilación de funciones.
- No ejecutar SQL ni borrar cachés del navegador que puedan contener datos pendientes de sincronización.
- Probar con una cuenta real autorizada cuyo correo esté confirmado y le falten documento y dirección, completar ambos desde Soporte y verificar en CRM, recepción y cita convertida.

## Validación realizada

32 pruebas unitarias locales con APIs simuladas: todas pasan; sintaxis de módulos JS verificada. No se han modificado datos reales ni se ha publicado código en producción.

## Salvaguardas

- Mantiene la verificación previa del correo confirmado y las autorizaciones de personal de Soporte.
- La recepción no puede reescribir identidad existente arbitrariamente ni aceptar un cliente con correo no verificado.
- No se añaden nuevos cobros ni se modifica financiación, inventario o stock.
- Los datos de identidad consignados manualmente deben contrastarse con el documento aportado por el cliente; la comprobación de formato y correo no equivale a verificación documental.
