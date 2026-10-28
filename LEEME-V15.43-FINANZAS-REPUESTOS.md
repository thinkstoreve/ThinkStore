> Documento histórico de V15.43.1. Para este paquete consultar LEEME-V15.44-ENTERPRISE-Y-APPS.md.

# ThinkStore V15.43.1 — Catálogo completo, costo compartido y 10 % global

Paquete completo actualizado el 28/10/2026. Sustituye V15.43 e incluye sus cambios financieros. Pendiente publicar y comprobar con la instalación real. No se realizaron cobros ni movimientos reales.

## Hallazgo al revisar Inventory

La pestaña «Repuestos de servicio técnico» de Inventory escribe directamente en `service_parts` del Supabase de Soporte. Soporte consulta esa misma tabla. No son dos catálogos que haya que copiar por SKU. El costo técnico correcto es `service_parts.unit_cost`, no el precio de compra de los productos de tienda guardados en `thinkstore_inventory_products`.

Este paquete corrige esa suposición de V15.43: preparar un repuesto verifica el costo de su propia ficha técnica y llama a la reserva existente. No copia precios, no crea referencias duplicadas y no exige que el repuesto exista como producto de tienda. No se modifica ningún archivo del proyecto Inventory ni ThinkCare.

## Selector de repuestos corregido

- Carga paginada con orden estable: no se limita a la primera respuesta de Supabase.
- Busca todas las palabras, sin exigir una frase contigua; ignora mayúsculas, tildes y separadores.
- Incluye SKU, modelo, serie, compatibilidad, reparación, calidad y clasificación. Estos campos de catálogo sí los usa Inventory, pero el selector anterior omitía varios.
- Identifica mejor variantes con nombres como «Estándar»: por ejemplo «Pantalla iPhone 15 Plus · Estándar».
- Si falla una página, muestra error en vez de presentar una lista parcial como si estuviera completa.
- Conserva controles de activo, existencias, reserva, permisos y asignación del técnico.

No se confirmó el contenido de la base en producción. La captura prueba que el SKU ST-PANT-STD-15PL tiene stock 1, costo USD 35 y precio final USD 90. La corrección se verificó con fixtures de ese SKU y más de 1000 registros; la prueba real queda pendiente tras publicar.

## Finanzas y reparto

Total final de reparación − costo de repuestos − otros costos directos − 10 % del total para el técnico = utilidad para empresa y socios. Se conserva cualquier comisión aplicable de vendedor a productos adicionales.

Ejemplo de la captura, si el total de la reparación es USD 90: costo USD 35, técnico USD 9 y utilidad USD 46 antes de otros gastos. No se usa el precio anterior de USD 120 como base de comisión. Se conservan los porcentajes guardados de empresa y socios; el paquete no modifica esos registros.

La reserva guarda el costo histórico. Preparar no vuelve a pagar una compra ni genera otra salida de caja. El stock físico se descuenta al completar el pago, conservando el flujo anterior. Un abono parcial no se convierte en cobro total ni crea anticipadamente una comisión pagadera. Las liquidaciones antiguas no se recalculan masivamente.

## Archivos y publicación

1. Descomprimir el ZIP y copiar el contenido de `ThinkStore-main` sobre la raíz del repositorio Main en GitHub Desktop. No crear una segunda carpeta `ThinkStore-main` dentro del repositorio.
2. Mantener juntas las carpetas `staff`, `soporte`, `growth-enterprise`, `netlify` y los archivos de la raíz. Staff conserva sus archivos; usa la función de liquidación actualizada en `netlify/functions/staff-repairs.js`.
3. El selector actualizado necesita publicar `soporte/app.js`, `soporte/parts-catalog.js`, `soporte/panel.html` y `soporte/sw.js` juntos. El servidor necesita la nueva versión de `netlify/functions/support-prepare-parts.js`. Incluya todo el paquete en una sola actualización del repositorio para no hacer pushes de prueba separados.
4. Inventory en Cloudflare y ThinkCare no necesitan publicación para este paquete. No mezclar su ZIP con Main.
5. Antes del push, verificar las variables privadas ya configuradas en el sitio que ejecuta las funciones: `MAIN_SUPABASE_SERVICE_ROLE_KEY`, `SUPPORT_SUPABASE_URL` y `SUPPORT_SUPABASE_SERVICE_ROLE_KEY` (o `SUPPORT_SUPABASE_SECRET_KEY`). La URL de Soporte debe coincidir con la que usa Inventory. No colocar claves privadas en archivos del navegador ni compartirlas en capturas.
6. Volver a desplegar después de cambiar variables y abrir de nuevo el panel para cargar la versión actualizada.

Un repositorio y un despliegue no son necesariamente lo mismo: el ZIP conserva `_redirects`, que envía `/soporte` a `soporte.thinkstore.com.ve`, y reglas de build para Main, Soporte y Enterprise. No se modificó la topología de hosting. Comprobar qué sitio sirve ese dominio antes de publicar; si está conectado a otro sitio, deberá recibir la carpeta Soporte actualizada. Sin ver la configuración de Netlify no se puede garantizar cuántos builds disparará un push. No repetir publicaciones a ciegas.

## Configuración de Finanzas

Finanzas, resumen diario y vencimientos comparten ahora el resolver de claves de Staff, incluido el alias `MAIN_SUPABASE_SERVICE_ROLE_KEY`. Las lecturas independientes del resumen se ejecutan en paralelo; se añadieron límites de espera y mensajes que conservan el error recibido.

El aviso de configuración de la captura indica una clave ausente en ese endpoint. El código no puede recuperar claves faltantes ni comprobar variables alojadas. La reparación en producción solo se confirma al consultar Finanzas con una sesión real después de publicar.

No se agrega una nueva migración SQL. Se utilizan las tablas y la función de reserva ya existentes en la versión recibida. Si falta alguna estructura, revisar su migración específica; no ejecutar SQL genérico sin identificar el error.

## Validación local

40 pruebas específicas aprobadas: cálculo financiero, escenario USD 90/35/9/46, descuento, costo histórico y cero, pérdida, abonos, permisos, asignación, ficha sin costo, paginación de más de 1000 repuestos, búsqueda por metadata y errores de carga.

Suite completa: 245 pruebas, 239 aprobadas y 6 fallos preexistentes también reproducidos con el ZIP original: un test que espera una antigua marca de caché y cinco tests del flujo de recepción. No se modificó recepción. La sintaxis JavaScript de los archivos modificados fue comprobada con Node.

Comprobación pendiente tras publicar: abrir una reparación, buscar «pantalla 15 plus» o «ST-PANT-STD-15PL», confirmar que la variante con stock 1 aparece y revisar su costo guardado al prepararla. No registrar cobros de prueba sobre órdenes reales.
