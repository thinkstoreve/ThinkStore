# ThinkStore V14.40 — Clave del dispositivo y autorización de pruebas

Proyecto completo sobre V14.39.

- El campo se identifica como «Clave de desbloqueo del dispositivo (para pruebas)» y aclara que corresponde al PIN, contraseña o patrón del equipo, para diagnóstico y verificaciones después de la reparación.
- La hoja generada incluye, dentro de Términos y condiciones de recepción, la autorización condicionada a la entrega voluntaria de la clave, el uso exclusivo para el servicio técnico y las pruebas posteriores a la reparación, y la información al cliente cuando la falta de clave limite esas pruebas.
- La clave continúa siendo interna: no se imprime ni se expone en QR, etiqueta o seguimiento público. Se mantiene el almacenamiento separado y los permisos de V14.39.

No hay SQL adicional respecto de V14.39. Si todavía no aplicaste las migraciones V14.38 y V14.39, siguen siendo necesarias para permisos y guardado de claves; ambas están incluidas en la carpeta soporte.

Verificación: sintaxis de app.js correcta y las 12 pruebas de recepción/impresión/datos aprobadas. Sin cambios en producción. La paginación final de la hoja debe comprobarse en la vista previa de impresión, especialmente con observaciones largas.
