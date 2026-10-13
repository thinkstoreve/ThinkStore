# ThinkStore V15.39 · Correcciones de financiación y abonos

## Qué cambia
- En **Soporte → Gestionar → Financiación y abonos** se muestra el resumen de los cobros reales y se puede editar la **inicial pactada** y la **fecha de vencimiento** (rol administrador/superadministrador).
- Los importes introducidos en presupuesto, financiación y nuevos abonos aceptan `1.234,56`, `1,234.56`, `78,40` o `78.40` y se muestran como `1.234,56` al salir del campo.
- Los administradores pueden **anular el último abono activo de una orden con pago parcial** e introducir el correcto con «Registrar nuevo abono». La anulación **no borra** el movimiento original: crea un evento negativo en Supabase Soporte con autor y motivo.
- El resumen diario de App Ventas y Enterprise considera también el movimiento negativo, para que la caja no contabilice dos veces el pago corregido.
- Si el recibo estaba vinculado a Caja Chica, intenta crear un movimiento inverso en la **misma cuenta, por la misma moneda e importe original**. Si falla la conciliación, lo comunica, conserva el movimiento pendiente y permite «Conciliar caja» de nuevo.
- Los pagos cerrados/pagados, con inventario consumido, siguen protegidos: requieren revisión manual de Caja, inventario y nota de entrega; esta versión **no autoriza** anularlos desde Gestionar.
- Los datos anteriores y el correo al cliente no se borran. Anular un abono **no ejecuta una devolución bancaria al cliente**.

## Orden de instalación
1. **Copia de seguridad** de los dos proyectos Supabase (Main/Enterprise y Soporte) y confirma la rama/commit actual de GitHub.
2. Abre el proyecto **Supabase Soporte** y ejecuta **MIGRACION-SOPORTE-V15.39-ANULACION-ABONOS.sql** en SQL Editor. No lo ejecutes en el Supabase principal.
3. Aplica el **parche ZIP V15.39** respetando las rutas dentro del repositorio en la rama principal; revisa el diff y registra un commit. No subas el ZIP sin descomprimir mediante Netlify.
4. Verifica los despliegues: **Main** actualiza `staff-repairs`, `support-record-payment` y `support-actions` y `service-sales`; **Soporte** actualiza el panel, estilos, script, caché y su `support-actions`.
5. Abre una **orden de prueba** con un abono parcial y comprueba: anular el último abono; evento negativo; saldo disminuido; nota histórica; movimiento inverso en Caja Chica; nuevo abono; conciliación correcta en Enterprise.
6. Si Caja Chica muestra **conciliación pendiente**, NO vuelvas a anular el mismo abono ni registres otro movimiento de ajuste. Utiliza «Conciliar caja» y revisa la cuenta antes de continuar.

## Ejemplo
Presupuesto: $120,00. Abonos: $0,07 y $78,40. Si el de $78,40 estaba mal, pulsa **Anular** en ese último abono activo. El historial conservará el original y mostrará su reverso. El recibido quedará temporalmente en $0,07; escribe el nuevo monto correcto y confirma «Registrar nuevo abono».

## Limitaciones
- Requiere la función SQL y los dos despliegues. No se ha ejecutado nada sobre las bases de producción desde este paquete.
- Se ha validado con pruebas locales, **no con un cobro real**.
- La cuenta bancaria puede requerir conciliación si Supabase Main no responde; se muestra advertencia explícita. No garantiza reembolsos bancarios o cancelación de una transferencia externa.
- El cálculo de tasas BCV sigue realizándose en el servidor al confirmar un nuevo abono en bolívares.
- Los planes financiados deben satisfacer los requisitos previos existentes de cliente verificado y presupuesto en USD.
