# Ficha CRM con equipos y origen

Datos: migración aplicada y 19.143 atenciones cargadas en Supabase principal. Los siguientes archivos integran estos antecedentes con la ficha CRM.

La ficha añade dos cuadros: origen confirmado y equipos/atenciones. Presenta hasta cinco atenciones inicialmente, con opción de mostrar más. Distingue registros de FileMaker, órdenes ThinkStore y citas. Una cita no cuenta como equipo recibido; ENTREGADO conserva ese estado sin afirmar que se reparó.

## Datos preparados

19.143 atenciones vinculadas mediante los identificadores de registro originales a los 12.440 contactos ya importados. Hay 42 registros sin descripción del equipo y cinco fechas que no se pudieron interpretar: se conserva el texto original. Los 146 registros sin identidad/contacto útil de la extracción previa no se asignan por aproximación.

El paquete de datos está en `../extraction/repair-history`. Contiene solo UUID de cliente, identificador de registro histórico, equipo, estado, número de orden y fecha. No contiene claves de equipos, notas técnicas, importes ni seriales.

## Aplicación

1. En Supabase principal, ejecutar MIGRACION-MAIN-V15.44.5-HISTORIAL-CLIENTES.sql. Las tablas nuevas tienen RLS y acceso exclusivo de service_role.
2. Ejecutar los archivos history-00.sql hasta history-19.sql en orden. Cada lote es idempotente; comprobar el total de 19.143 al terminar.
3. Publicar juntos los archivos de esta modificación en main para un solo despliegue. No subir los lotes privados al repositorio público.
4. Verificar una ficha FileMaker con varias atenciones, una ficha ThinkStore, una ficha con correo/teléfono compartido y una cita pendiente. Verificar acceso denegado sin sesión.

Los registros antiguos sin origen comprobable muestran No documentado. Administración puede confirmar un origen con referencia, fecha y usuario. Los nuevos registros del formulario público guardan Página principal automáticamente; las nuevas recepciones guardan el canal de ingreso y la cita enlazada, cuando existe. No se modifica el origen FileMaker de los contactos migrados.

La vinculación histórica exige nombre normalizado más cédula, correo o teléfono coincidente, o el UUID seleccionado explícitamente en una recepción nueva. No enlaza por nombre solo ni por teléfono compartido entre nombres distintos. Un conflicto de cédula impide la asociación por contacto. Las fuentes no disponibles muestran un aviso de historial parcial.

Validación local: 276 pruebas correctas, sintaxis de scripts y diff --check. La verificación visual y funcional se realiza tras publicar el cambio.
