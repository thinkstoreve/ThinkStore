# ThinkStore V15.39.1 — Reparación del botón «Gestionar» en Soporte

## Causa confirmada

V15.39 añadió un editor de condiciones de financiación en `soporte/app.js`. La función `renderManagerFinance()` intentaba leer la variable `f`, que únicamente existía dentro de `managerFinanceHtml()`. Al abrir una orden con rol de administrador/superadministrador, provocaba `ReferenceError: f is not defined` y detenía la ejecución **antes de abrir** el modal «Gestionar».

## Cambios

- `soporte/app.js`: calcula de forma explícita el estado de financiación en ambas funciones; añade comprobaciones de elementos para que falte un campo sin romper todo el panel.
- `soporte/index.html` y `soporte/panel.html`: referencia nueva `app.js?v=15.39.1` para no reutilizar un JS cacheado.
- `soporte/sw.js`: nueva caché `thinkstore-support-v8-8-33-r15391-manager-fix`, manteniendo la infraestructura offline existente.
- `tests/support-manager-open.test.js`: prueba de regresión para perfiles `admin`, `superadmin` y `technician`.

No modifica base de datos, cobros, saldos, recibos, conciliación ni Enterprise. No requiere SQL.

## Instalación recomendada (parche)

1. **Confirma primero** que tu versión publicada corresponde a V15.39. Si GitHub o Netlify tienen cambios posteriores, comparte esa base antes de aplicar este parche para no sobrescribirlos.
2. Descomprime el ZIP de parche. En GitHub, abre `ThinkStore` → rama `main` → carpeta `soporte`.
3. Mediante **Add file → Upload files**, sube estos **cuatro archivos** dentro de `soporte/`: `app.js`, `index.html`, `panel.html`, `sw.js`. Confirma que Github los actualiza en `soporte/` (no en la raíz).
4. Opcionalmente integra `tests/support-manager-open.test.js` en `tests/` para mantener la prueba de regresión.
5. Confirma el commit. Deja que Netlify publique Main y comprueba si el Centro de Servicio Técnico tiene **un proyecto de Netlify independiente**. Si lo tiene, despliega el mismo código de `soporte/` desde el proyecto correcto.
6. En el navegador del Centro de Servicio Técnico haz `⌘ + Shift + R`. No borres almacenamiento local ni sesiones de trabajo pendientes.
7. Abre una orden con **Gestionar** y verifica: editor de financiación, historial de abonos, fotos y que **Guardar cambios** siga funcionando. Prueba sin realizar un cobro real.

## Verificación técnica

`node --check soporte/app.js`

`node --test tests/*.test.js`

Resultado local sobre esta copia: **59/59 pruebas aprobadas**. La comprobación con la sesión real y el despliegue de producción sigue pendiente.

## Precaución

No subas el ZIP completo por arrastrar a Netlify si tu sitio usa las funciones de Netlify desde GitHub. El parche es solamente para el frontend de Soporte, de modo que no requiere tocar Supabase ni endpoints de cobro.
