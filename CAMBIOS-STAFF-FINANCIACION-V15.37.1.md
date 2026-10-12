# ThinkStore — visibilidad financiación en App Ventas (V15.37.1)

**Base:** código recibido de la rama `main`, que ya contiene la lógica de financiación; no se sustituyeron configuraciones ni credenciales.

## Qué se corrigió
- En Staff > Reparaciones se muestra una guía para encontrar la función.
- Dentro del detalle de **todas** las reparaciones aparece la sección "Reparación financiada". Antes estaba oculta si el presupuesto era cero o la reparación estaba pagada.
- La sección muestra por qué no se puede configurar un plan (presupuesto sin confirmar, cargos pendientes, moneda distinta a USD, saldo cero o reparación cancelada).
- Se mantienen las validaciones definitivas del servidor: cliente registrado/correo confirmado, inicial positiva menor que el total, vencimiento válido y control de concurrencia.
- El formulario no registra pagos: los abonos se cobran a través de la funcionalidad existente.
- Se actualizaron los identificadores de caché/recursos de Staff; el Service Worker deja de borrar las cachés de otras aplicaciones.

## Archivos modificados
`staff/index.html`, `staff/repairs.js`, `staff/app.css`, `staff/sw.js`.

## Cómo publicar sin perder funciones
**Recomendado:** integrar los cuatro archivos en la rama `main` de GitHub y dejar que Netlify realice el build automáticamente. Evitar sustituir el proyecto publicado por un ZIP estático desde Netlify Drop: se necesitan funciones serverless bajo `netlify/functions` y configuración de build.

1. Hacer copia del estado actual de GitHub/Netlify.
2. En GitHub, actualizar únicamente los cuatro archivos modificados (en este ZIP están en `staff/`).
3. Confirmar commit en `main` (o usar una rama y Pull Request). Netlify publicará el nuevo commit.
4. Comprobar en `/staff/#repairs` que aparezca `Financiación v15.37.1`, abrir una reparación con presupuesto aprobado USD y saldo pendiente; validar el formulario **sin guardar importes reales durante las pruebas**.
5. Probar con cuenta de prueba registrada y con la configuración de Supabase/Netlify del entorno correspondiente. Si el servidor responde con error, conservar el mensaje exacto.
6. No borrar datos locales ni desregistrar service workers sin verificar primero que no haya operaciones sin sincronizar.

**No verificado:** integración real con tus sesiones, Supabase, pagos o dominios. Ningún registro ni saldo se modificó.
