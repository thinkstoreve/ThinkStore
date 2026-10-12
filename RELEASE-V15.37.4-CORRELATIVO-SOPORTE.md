# ThinkStore V15.37.4 — Numeración cronológica de órdenes de Servicio Técnico

## Problema identificado

La recepción mostraba el formato `TS-SVC-2026-0007`, pero el endpoint seguro `netlify/functions/registered-reception.js` ignoraba el folio que calculaba el navegador y lo reemplazaba por `TS-` seguido de 8 caracteres UUID aleatorios (ejemplo: `TS-DA53AC91`).

## Corrección

- El servidor asigna el siguiente folio por año de Venezuela: `TS-SVC-2026-0008`, `TS-SVC-2026-0009`, etc.
- Una función SQL de Supabase Soporte reserva cada número mediante una actualización atómica de una fila por año. Dos recepciones simultáneas no reciben el mismo folio.
- Antes de asignar, compara con el mayor número `TS-SVC-<año>-<número>` ya existente. No reinicia la cuenta desde `0001` si ya existen órdenes ese año.
- El cliente web deja de calcular/enviar un folio basado en la lista que tenga cargada: el servidor es la única autoridad. La auditoría usa el código realmente devuelto.
- Editar una recepción no genera folio nuevo ni modifica el código de la orden.
- Si falta la migración SQL, el servidor informa el problema y **no crea una orden con un código aleatorio**.
- **No** cambia automáticamente ninguna orden ya creada (incluida `TS-DA53AC91`). No modifica notas, pagos, repuestos ni fechas.

## Orden de instalación, obligatorio

1. **Supabase Soporte**: abre SQL Editor en el proyecto usado por `SUPPORT_SUPABASE_URL` y ejecuta `MIGRACION-SOPORTE-V15.37.4-FOLIOS-ORDENES.sql`. No lo ejecutes en la BD del sitio principal si Main y Soporte usan proyectos distintos. El script crea solo una tabla de contadores y una función; no renumera órdenes existentes.
2. **GitHub**: en el repositorio actual de ThinkStore, rama `main`, incorpora los archivos del parche respetando sus rutas. El archivo SQL puede quedar versionado en la raíz.
3. **Netlify Main** (`thinkstore.com.ve`): verifica que el despliegue nuevo de `main` esté Published. La función `registered-reception` de Main es la que efectúa el alta de la orden.
4. **Netlify Soporte** (`soporte.thinkstore.com.ve`): si es otro proyecto, confirma que también se ha actualizado con la versión de `soporte/app.js`, `soporte/index.html`, `soporte/panel.html` y `soporte/sw.js`.
5. **Prueba segura**: al crear **una recepción real**, comprueba que el código de la orden sigue al último `TS-SVC-2026-xxxx` existente. No simules guardados de clientes sin permiso. Edita la orden existente y comprueba que mantiene el mismo código.

> Importante: no desplegar el ZIP mediante arrastrar/soltar en Netlify; el proyecto usa funciones de servidor que requieren compilación. No borres datos del navegador para forzar la actualización.

## Orden antigua con folio aleatorio

El código `TS-DA53AC91` **permanece intacto** para conservar enlaces, avisos e historial ya emitido. Si deseas corregir esa orden específicamente, revisa primero si su código aparece en correos, facturas, notas de entrega o sistemas externos. La renumeración de históricos requiere una operación separada y auditada; este parche no la hace.

## Limitación habitual de secuencias

La reserva es única y ascendente, pero un intento de crear orden que falle **después** de reservar un folio puede dejar un salto. Esto evita duplicaciones; no promete que no existan huecos.

## Pruebas

`node --test tests/*.test.js` — 35 pruebas superadas con APIs simuladas. Se probó que al crear la recepción se usa el folio retornado por Supabase, que no se aceptan códigos enviados por el cliente, que editar no renumera y que una función SQL ausente bloquea la creación sin generar un folio aleatorio. Aún hay que ejecutar la migración y validar en el entorno real.
