# ThinkStore V15.44 — Enterprise y aplicaciones

Paquete completo. Incluye las correcciones anteriores de Finanzas, 10 % global del técnico y catálogo completo de repuestos. Sustituye los ZIP V15.43 y V15.43.1. No se publicó ningún sitio ni se movió dinero real durante este trabajo.

## Desglose exclusivamente en Enterprise

En Tesorería → Utilidades → Liquidación automática por reparación, abrir «Ver desglose».

- Total final facturado, cobrado confirmado y saldo pendiente.
- Costo de repuestos, productos adicionales y otros costos directos.
- Comisión técnica del 10 % del total en liquidaciones nuevas; comisiones históricas se muestran tal como quedaron guardadas.
- Comisión de vendedor cuando corresponda.
- Utilidad o pérdida de la reparación y proyección de empresa, Freddy y Nelson usando los porcentajes guardados.

Ejemplo: total USD 90, repuesto USD 35, técnico USD 9, utilidad USD 46. Si la configuración es 50/25/25, la proyección es USD 23 / 11,50 / 11,50. Los centavos siempre concilian.

El detalle no registra transferencias ni reparto. El cierre semanal puede descontar gastos operativos adicionales. Si falta costo, total, técnico o una regla válida, se advierte y no se muestra reparto como disponible. Un abono parcial muestra su deuda y resultado contractual, pero no reparto disponible. Una pérdida no genera reparto positivo. Un cobro superior al total se marca para revisar. Cero por ciento se respeta, sin sustituirlo por el porcentaje predeterminado.

Este desglose se incorpora solo a Enterprise. No se añade a las pantallas de reparación de Soporte, Staff ni al documento del cliente.

## Aspecto de las apps

Main (panel), Staff, Soporte y Enterprise comparten ahora un acabado con azul ThinkStore, cabeceras con degradado, tarjetas con jerarquía, estados de selección más visibles, mejores indicadores de foco y respuesta suave al pasar el cursor o pulsar. Se adapta la densidad visual en pantallas pequeñas y se respeta `prefers-reduced-motion`.

No se inventan cifras, indicadores de conexión ni actividad en vivo. No se incorpora ningún servicio de analítica o dependencia externa. Inventory y ThinkCare no se modifican.

La vista previa HTML separada usa datos de ejemplo y el mismo renderizador del desglose. Es una muestra visual, no la aplicación autenticada ni una conexión a datos reales. La comprobación visual completa en navegador quedó pendiente: el navegador local del entorno no está instalado y la herramienta de navegador rechazó la vista HTML local por su política de URL. Se verificaron código, referencias, cálculos y pruebas; no se afirma validación visual de extremo a extremo.

## Cobros y recepción

Staff incorpora un bloqueo compartido de solicitudes: dos clics o dos botones simultáneos no lanzan dos cobros. El bloqueo cubre también las validaciones asíncronas y se libera al terminar o fallar, sin reintentar automáticamente. Se conserva la validación atómica de pago y saldo esperado existente en el servidor.

Se corrigió una colisión de nombres en el pago combinado: el texto del resumen se llamaba igual que la función que vuelve a dibujar el detalle y podía disparar un error después de un pago confirmado.

La preparación de repuestos verifica costo y precio guardados antes de reservar. Las alertas sobre técnico y reparto quedan en Enterprise. La lectura de la clave de equipo permite ahora al técnico consultar solo una orden asignada; antes otra comprobación de rol bloqueaba también esa acción de lectura. El técnico sigue sin poder crear recepciones por ese endpoint.

Las pruebas antiguas de recepción simulaban el contrato anterior basado en un cliente web registrado, sin la sesión de Soporte que el endpoint actual exige. Se actualizaron para comprobar el contrato actual: sesión y permisos, folio generado por Supabase, ausencia de cobros inyectados por navegador, preservación del folio y financiación al editar, y concurrencia. El test de caché se actualizó para verificar las versiones y dependencias reales de los archivos nuevos. No se quitaron controles de acceso para hacer pasar pruebas.

## Publicar con el menor número de builds

1. Descomprimir el ZIP y copiar el contenido de `ThinkStore-main` sobre la raíz del repositorio Main de GitHub Desktop. No introducir una carpeta `ThinkStore-main` adicional.
2. Incluir todos los cambios en el mismo commit y push, una vez revisada la configuración. No publicar por separado los ZIP anteriores.
3. Mantener juntas las carpetas `staff`, `soporte`, `growth-enterprise`, `netlify`, `scripts` y los archivos de la raíz. Los archivos nuevos de CSS, el renderizador Enterprise y el bloqueo de Staff deben publicarse junto a sus HTML y archivos de caché.
4. No hace falta publicar Inventory ni ThinkCare. No hay una nueva migración SQL.
5. Antes del push, revisar las variables privadas de servidor `MAIN_SUPABASE_SERVICE_ROLE_KEY`, `SUPPORT_SUPABASE_URL` y `SUPPORT_SUPABASE_SERVICE_ROLE_KEY` o `SUPPORT_SUPABASE_SECRET_KEY`. No copiar claves al navegador ni compartirlas por chat.
6. Opcional: ejecutar `node scripts/check-release-readiness.cjs`. Con `--server` verifica presencia y proyecto de las variables del entorno sin imprimir claves. Esta prueba no valida permisos de las claves ni una sesión real.

Límite pendiente: el ZIP conserva una redirección hacia `soporte.thinkstore.com.ve` y reglas separadas para Main, Soporte y Enterprise. Un solo repositorio puede disparar varios builds si hay varios sitios conectados. La configuración alojada de Netlify no está disponible en los archivos, por lo que no se puede garantizar la cantidad de despliegues ni confirmar las variables reales. Comprobar el sitio que sirve ese dominio antes de publicar. No se modificó hosting, DNS, reglas de build ni credenciales.

## Validación

- Suite completa: 254 pruebas aprobadas, cero fallos.
- Caso realista de pantalla: 90 − 35 − 9 = 46 y proyección 23 / 11,50 / 11,50.
- Abonos, faltantes, comisiones históricas, pérdidas, porcentajes cero, redondeo, contenido escapado y ausencia de acciones financieras en el detalle.
- Dos cobros simultáneos ejecutan una sola operación; error o cancelación libera el bloqueo.
- Catálogo de más de 1000 registros, búsqueda por metadata y costo compartido con Inventory conservados.
- Sintaxis de JavaScript y referencias locales de los archivos nuevos comprobadas.

Falta comprobar en la instalación publicada: configuración real de Finanzas, carga y aspecto con sesión real, apertura del desglose en Enterprise, acceso desde móvil y permanencia del nuevo diseño tras actualizar la caché. No efectuar cobros de prueba sobre órdenes reales.
