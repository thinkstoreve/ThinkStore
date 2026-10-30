# ThinkStore V15.44.1 — Separar abonos y utilidad

Incluye todos los cambios de V15.44. Corrección preparada el 29/10/2026, pendiente subir al repositorio y publicar. No se modificaron pagos, costos, saldos, cierres ni repartos en la base de datos.

## Comprobado en producción

La configuración de Enterprise ya contiene MAIN_SUPABASE_SERVICE_ROLE_KEY para Functions/Production y las URLs correctas de Main y Soporte. Se realizó un único despliegue de Enterprise para cargarla. Tras iniciar sesión, la consulta diaria funciona. Netlify muestra sitios distintos para Main, Soporte y Enterprise, aunque comparten el repositorio.

La orden TS-SVC-2026-0015 del 28 de octubre muestra total USD 90, cobro USD 70, pendiente USD 20 y repuesto con costo histórico USD 35. La vista antigua de Tesorería trataba los USD 70 recibidos como utilidad, porque aún no había consumo/liquidación final que descontara costos y comisión. Ese reparto no debe ejecutarse.

## Corrección preparada

- Mantener los cobros de servicio en caja y en la conciliación, sin convertir anticipos sin liquidación completa en utilidad distribuible.
- Reconocer el resultado de una reparación únicamente cuando existe una liquidación completa y coherente con una orden totalmente cobrada, con costos y comisiones verificables.
- Reconocer la utilidad íntegra al completar el pago, incluso si parte del anticipo se cobró en una semana anterior. Ejemplo: al recibir los USD 20 finales, la liquidación 90−35−9 reconoce USD 46 una sola vez, no USD 20 ni USD 70.
- Evitar restar nuevamente comisiones y costos automáticos ya incluidos en esa liquidación. Los ajustes manuales siguen descontándose por separado.
- Conservar las pérdidas. Devoluciones/anulaciones de servicios sin conciliación quedan señaladas y no habilitan reparto.
- Mostrar en Tesorería y en el cierre el importe de abonos pendiente de liquidar, y explicar la nueva fórmula.
- Aplicar el mismo criterio en el resumen financiero semanal y la estimación diaria.
- Unificar enterprise-summary de Enterprise con el endpoint canónico de Main, aceptar MAIN_SUPABASE_SERVICE_ROLE_KEY, y corregir referencias a variables inexistentes en ese endpoint.
- Corregir un error en la pantalla de resumen: una captura de error usaba `msg` fuera de su ámbito. Este error se introdujo en la modificación anterior y queda corregido aquí.
- Reintentar la consulta diaria al estar lista la sesión, para que no se quede en «Inicia sesión» después de que el usuario ya entró.

La consulta de repuestos, el 10 % global del técnico, los permisos y las mejoras visuales de V15.44 se conservan. No se requieren cambios de Inventory, ThinkCare ni una nueva migración SQL.

## Publicación

El despliegue que ya se hizo solo cargó la configuración: NO contiene estas correcciones nuevas.

Copiar el contenido de ThinkStore-main sobre la raíz del repositorio Main y reunirlo en un solo commit/push. No introducir otra carpeta ThinkStore-main dentro del repositorio. Puede hacerse con GitHub Desktop. Para que el asistente pueda publicarlo mediante el navegador se necesita iniciar sesión en GitHub; la sesión conectada está actualmente cerrada.

Los archivos modificados frente a V15.44 están listados en ARCHIVOS-V15.44.1.txt. No hay cambios en Soporte; su regla de build existente puede omitir la publicación. Main y Enterprise consumen los endpoints modificados y pueden iniciar builds por el mismo push: un único repositorio no garantiza un único deploy. No volver a desplegar todos los proyectos manualmente ni repetir pushes de prueba.

No se alteró la configuración de builds, hosting, credenciales o los valores de las variables.

## Verificación

260 pruebas aprobadas, cero fallos. Pruebas nuevas del endpoint financiero completo y del resumen semanal, además del modelo compartido: anticipo 70/90 excluido de reparto, liquidación final 46 con anticipo de otra semana, costos faltantes, pérdidas, duplicados, devoluciones sin conciliar y alias MAIN.

Falta verificar en producción después de publicar: la orden con USD 70 cobrado debe mostrar esos USD 70 como pendientes de liquidar y USD 0 de utilidad distribuible atribuible a esa reparación. No cobrar los USD 20 restantes ni cerrar la semana como prueba. Verificar sin modificar datos reales.
