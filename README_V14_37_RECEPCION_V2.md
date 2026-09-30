# ThinkStore V14.37 — Soporte / Recepción V2

Base: ThinkStore-main-V14.36-Marketing-Empresas.zip, localizado en Documents. Esta entrega incluye el proyecto completo y conserva Marketing Empresas.

## Cambios

- Recepción clara (#F5F5F7), tarjetas blancas y campos más cómodos. Los estilos están limitados a Recepción.
- Apple, Otros equipos y Consolas y controles comparten el formulario y la tabla service_orders.
- Apple conserva catálogo, miniaturas, serial/IMEI, diagramas y checklist. Se restauran las marcas al editar órdenes antiguas.
- Marcas y modelos manuales; plataforma gaming; inspección por tipo de equipo; fallas rápidas; diagnóstico inicial y observaciones.
- Fotos con selector/cámara y miniaturas, usando service-order-files y service_order_photos. Límite de 8 MB por foto. Si una foto falla, la orden queda guardada y se reintentan las pendientes sobre la misma orden.
- Resumen visible y confirmación antes del guardado. Protección frente a doble clic durante el envío.
- Guardar/recuperar borrador, incluido contenido fotográfico, en IndexedDB por correo del usuario. El borrador pertenece a ese navegador y no se sincroniza entre equipos. Guardar un borrador nuevo reemplaza el borrador anterior del mismo usuario.
- Editar recepción no escribe el estado operativo de la orden, para conservar también los cambios concurrentes del técnico.

## Compatibilidad y datos

No se necesita ejecutar SQL. Los nuevos datos se guardan en el JSON existente:

`service_orders.reception_checklist.__reception_v2`

Incluye `device_category` (apple/other/gaming), marca, tipo, plataforma, condición, inspección, diagnóstico y marcas visuales. Los campos históricos conservan sus nombres. Los registros sin categoría se interpretan como Apple. Los elementos desconocidos del checklist se conservan al editar.

Se reutilizan número de orden, QR, etiqueta, hoja de recepción, seguimiento, clientes, bitácora, permisos y conexión Supabase existentes. No se cambiaron las rutas, políticas RLS, tablas, credenciales, funciones de servidor ni los módulos Enterprise/Marketing. No se realizó ninguna escritura en producción.

## Verificación realizada

- 21 pruebas automatizadas aprobadas: 8 de recepción con DOM/Supabase simulados y 13 verificaciones preexistentes de Marketing/Enterprise.
- Recepción: Apple y marcas visuales; otros equipos y marcas manuales; gaming y plataforma; fallback antiguo; conservación de estado y checklist desconocido; fallo/reintento de fotos sin duplicados; permisos y revisión; recuperación de borrador.
- Validación sintáctica de los 103 archivos JavaScript/CJS del paquete, sin errores.
- IDs HTML únicos y manejadores de eventos disponibles.
- Paquete completo comparado con V14.36: los archivos ajenos a la recepción permanecen idénticos, salvo metadatos de versión y nuevos documentos/pruebas.

El proyecto publica archivos estáticos y no define un comando de compilación. Se verificó su sintaxis y sus pruebas; no se ejecutó un despliegue Netlify.

Limitaciones: no se pudo ejecutar la verificación visual en Chrome por restricciones del entorno. Las pruebas usan servicios simulados; no validan autenticación, RLS, almacenamiento, cámara, impresión física ni sincronización real de Enterprise contra producción. Antes de publicar, probar en el entorno de prueba con una sesión del rol recepción: crear una orden por categoría, recuperar un borrador, tomar/subir una foto, reabrirla y abrir hoja, etiqueta y seguimiento. La asignación de números conserva el mecanismo anterior (no se cambió la concurrencia del servidor).

Para repetir las pruebas: `node --test tests/*.test.cjs`.

## Instalación y reversión

Publicar el contenido completo con el procedimiento habitual. Si Soporte se publica como sitio separado, actualizar su carpeta soporte incluyendo reception-v2.css y app.js. Recargar el panel para cargar V14.37. Mantener la configuración Supabase/hosting actual.

Para volver al código anterior, desplegar el ZIP V14.36 conservado. No hay migraciones que revertir. No borrar las órdenes ni sus fotos. La interfaz antigua no muestra los nuevos metadatos y podría reemplazarlos si se edita y guarda una recepción desde esa versión; evitar editar órdenes V2 con la interfaz anterior.
