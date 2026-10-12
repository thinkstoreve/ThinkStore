# ThinkStore V15.37.5 — Conciliación de abonos financiados

## Situación detectada
En el modal «Gestionar orden» de Servicio Técnico, los campos «Estado de cobro», «Monto cobrado USD» y «Método de pago» son de solo lectura. Guardar las condiciones de financiación (inicial pactada y fecha de vencimiento) **no** registra una entrada de caja; los abonos realmente recibidos se registran en App Ventas con un medio de cobro real.

## Cambios
- Soporte > Gestionar incorpora **Financiación y abonos recibidos**: presupuesto, suma real abonada, saldo y vencimiento, con la etiqueta **Condición de pago: Financiado** si existe un plan.
- Historial de pagos confirmado (medio de cobro, importe, fecha y referencia) leído de `service_payment_events`. Este historial es de consulta, no crea pagos.
- Botón **Actualizar pagos** que consulta directamente en el Supabase de Soporte el estado real y evita mostrar datos de una sesión/caché antigua.
- El selector existente ahora se titula «Método del último cobro» para dejar claro que «Financiado» es una condición del plan y **no** una cuenta o método bancario.
- Soporte conserva su vista técnica editable sin sobrescribir cambios todavía no guardados cuando se refresca el resumen de pagos.
- La función `support-actions` permite la nueva lectura `payment_detail` únicamente a personal autenticado de Soporte, con control por técnico en instalaciones independientes.
- El botón «Cobrar en App Ventas» abre la reparación correspondiente automáticamente desde el enlace de Soporte.
- En Staff se reconcilia cada abono: tras guardar, el cliente vuelve a leer la orden y el historial y avisa si no puede confirmar su registro. **Ante incertidumbre no reintentar sin comprobar caja.**
- Actualización de versiones de recursos y cachés para evitar servir archivos anteriores. No se eliminan cachés de otras aplicaciones.

## Seguridad de la caja
- Esta actualización **no cambia importes, no crea abonos, no aplica descuentos, no descuenta repuestos, no modifica financiaciones existentes y no ejecuta SQL**.
- Ninguna operación de lectura financiera realiza INSERT/PATCH/DELETE en Supabase.
- La inicial pactada en el plan no se suma a lo recibido hasta que se cobre efectivamente mediante **Registrar abono** en App Ventas.
- Si existe dinero cobrado físicamente pero no aparece en el historial, confirmar primero el registro en la caja y en Supabase; no repetir la transacción a ciegas.

## Publicación
1. Subir los archivos del parche respetando las rutas en la rama GitHub `main` del proyecto ThinkStore. No arrastrar el ZIP a Netlify como despliegue manual de estáticos: hay funciones de servidor.
2. Esperar a que Netlify publique la rama `main` para `thinkstore.com.ve`.
3. Si `soporte.thinkstore.com.ve` se publica desde un proyecto Netlify independiente con base `soporte`, publicar también ese proyecto tras actualizar los archivos.
4. Verificar la reparación con una sesión real: en App Ventas, el cliente debe registrar un pago con su medio (Zelle, Pago Móvil, efectivo, etc.). Verificar que aumente `amount_paid` y que exista una fila en `service_payment_events`, y después pulsar **Actualizar pagos** en Soporte > Gestionar.
5. No repetir ninguna transacción existente. Si el historial no coincide con caja, recopilar el ID de la operación para reconciliar antes de actuar.

## Archivos incluidos en el parche
- `soporte/app.js`
- `soporte/panel.html`
- `soporte/index.html`
- `soporte/styles.css`
- `soporte/sw.js`
- `soporte/netlify/functions/support-actions.js`
- `netlify/functions/support-actions.js`
- `staff/repairs.js`
- `staff/index.html`
- `staff/sw.js`
- `tests/support-financed-abonos.test.js`
- `RELEASE-V15.37.5-ABONOS-FINANCIACION-SOPORTE.md`

## Validación local
43 pruebas pasadas (`node --test tests/*.test.js`). No hay acceso ni verificación contra datos financieros de producción. No se ha publicado esta actualización a GitHub/Netlify.
