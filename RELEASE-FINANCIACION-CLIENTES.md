# Clientes registrados y reparación financiada

Preparado el 12 de octubre de 2026 sobre ThinkStore main V15.36 (3f66ec6). **Pendiente de publicar y validar con sesiones reales.**

## Comportamiento

- App Ventas carga por correo el perfil registrado y usa sus datos canónicos. El servidor exige nombre, CI/RIF, dirección, teléfono y correo confirmado en Auth. No crea cuentas ni declara verificada una identidad por completar un formulario.
- Recepción de Soporte valida el mismo registro en el servidor antes de crear o editar. Conserva la financiación al editar el checklist. La edición detecta cambios concurrentes.
- App Ventas configura por reparación una inicial pactada y una sola fecha de vencimiento. Requiere presupuesto confirmado en USD, saldo pendiente y cargos consolidados. Guardar el plan no registra ningún cobro ni cambia el estado técnico. Los cobros y abonos usan el flujo existente.
- Resumen amarillo en Ventas, Soporte, Enterprise y Mis reparaciones: inicial pactada/recibida, abonos posteriores, saldo pendiente y vencimiento. El crédito vence al acabar la fecha pactada en Caracas. Se conserva el historial de cambios de las condiciones.
- El perfil del cliente consulta reparaciones por su ID autenticado vinculado a la recepción, sin aceptar un ID de cliente del navegador. Las órdenes antiguas se vinculan individualmente al validar la recepción o configurar su financiación; no se hace una asociación masiva por nombre.
- Los recordatorios de reparaciones solo consideran créditos registrados con vencimiento válido, saldo y datos de cliente verificados. No se convierten todos los presupuestos pendientes en créditos vencidos. Se excluyen cancelados y otras monedas.
- Escribir un saludo no autoriza recordatorios. Para avisos automáticos se exige opt-in explícito mediante ACTIVAR; BAJA detiene los avisos. Se conservan los límites existentes. El envío sigue apagado hasta comprobar facturación, aprobación de plantilla, idioma y prueba real.

## Publicación

1. Aplicar el parche al repositorio, revisar diferencias y publicar en una rama/PR. No sustituir el repositorio por el ZIP parcial.
2. Desplegar Main, Soporte y Enterprise (tienen archivos y funciones separados). Publicar Main antes de Soporte, porque Recepción consulta registered-customer y registered-reception en el sitio principal.
3. Se reutilizan reception_checklist y las tablas existentes: no requiere nuevas columnas ni una migración destructiva. Los permisos actuales de Supabase no se modifican. La obligatoriedad se implementa en los flujos de App Ventas y Recepción; no es una auditoría de todos los accesos directos heredados a Supabase.
4. Probar en vista previa con cuentas de prueba autorizadas: cliente sin registro, correo sin confirmar, perfil incompleto y cliente válido; guardar plan; registrar inicial mediante el cobro existente; registrar abono; verificar las tres vistas y que otro cliente no ve la orden.
5. Confirmar cachés/PWA actualizadas. Verificar dominios, variables existentes y permisos de los proyectos independientes.
6. Para WhatsApp, comprobar plantilla aprobada y su código de idioma exacto, método de pago, opt-in y una entrega controlada antes de habilitar WHATSAPP_DEBT_AUTOMATION_ENABLED. Esta entrega no cambia variables ni envía mensajes.

## Validación realizada

12 pruebas automatizadas locales pasan: cálculo de pagos, vencimiento Caracas, fechas inválidas, escape HTML, ausencia de datos privados en resumen público, validación de registro/correo, inicial fuera de rango, concurrencia, recepción canónica y autorización, selección de candidatos y automatización apagada. Consultas externas simuladas; no se realizaron pagos ni pruebas con clientes reales.

Sintaxis de JavaScript y scripts de HTML comprobada. Vista previa con el componente real revisada en navegador; al pasar de USD 45 a USD 100 recibidos, el saldo cambia de USD 55 a cero y el estado a Pagado.

Pendiente: publicación, validación integral con Supabase/Netlify reales y activación de notificaciones. La veracidad documental de CI/dirección requiere revisión del personal; el sistema valida presencia y correo confirmado.
