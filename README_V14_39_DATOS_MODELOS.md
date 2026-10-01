# ThinkStore V14.39 — Datos del cliente y selector de modelos

Proyecto completo sobre V14.38, conservando Recepción V2, usuarios/invitaciones y Marketing Empresas.

Cambios:
- Cédula/documento y dirección del cliente, disponibles en las tres categorías. Se conservan al editar y recuperar borradores y aparecen en el resumen y la hoja de recepción. Se guardan en el JSON compatible de recepción sin renombrar campos antiguos.
- Clave del equipo opcional, oculta por defecto y con botón Mostrar/Ocultar. Se guarda en una tabla interna separada, service_order_access, con acceso para administración, recepción y técnicos autorizados. No se copia al checklist, auditoría, hoja, QR, seguimiento ni borrador local. El campo existente Contraseña recibida se conserva.
- Si la orden se guarda pero falla el guardado de la clave, se avisa y se mantiene la misma orden para reintentar, sin duplicarla. Si no se puede consultar la clave al editar, el campo queda deshabilitado para no sobrescribir una clave existente.
- Fondo blanco para la inspección y la tarjeta/miniatura. Las imágenes originales transparentes se mantienen sin alteraciones.
- Selector principal de modelos: botón de flecha, apertura animada hacia abajo, búsqueda, rueda del mouse, barra de desplazamiento visible y lista completa dentro de la categoría elegida. Teclado: flechas arriba/abajo, Enter, Escape y Tab. El movimiento se reduce si el usuario tiene activada esa preferencia del sistema. Para modelos fuera de catálogo, se conserva el campo Modelo manual de Datos del equipo.

## Activar

1. Si aún no instalaste el SQL de V14.38, ejecuta primero `soporte/supabase_v14_38_staff_permissions.sql` en el proyecto Supabase de SOPORTE.
2. Ejecuta `soporte/supabase_v14_39_device_access.sql` en ese mismo proyecto para habilitar el guardado interno de claves. Es transaccional y repetible; no borra órdenes ni usuarios. La clave se almacena como texto dentro de una tabla con RLS; no se implementa cifrado adicional de aplicación.
3. Publica el proyecto completo con el procedimiento habitual, o la carpeta soporte completa si utilizas el sitio de Soporte separado. Recarga el panel para cargar los recursos V14.39.
4. Mantén las variables y configuración de invitaciones de V14.38; no cambiaron. Los campos cédula/dirección y las mejoras visuales no requieren columnas adicionales en service_orders.

Los borradores no almacenan la clave: debe volver a escribirse al recuperar un borrador nuevo. En una orden existente se consulta desde su tabla interna. Para borrar una clave previamente guardada, vacía el campo habilitado y guarda la recepción.

## Verificación y límites

33 pruebas automatizadas aprobadas con DOM/Supabase/correo simulados. Nuevas comprobaciones: cédula/dirección persistidas e impresas; clave almacenada fuera de órdenes/auditoría/impresión; fallo de clave sin duplicar orden; exclusión de claves del borrador; catálogo completo, filtrado y cierre accesible del selector. JavaScript validado e IDs/eventos del panel comprobados.

No se ejecutó SQL ni se modificó producción. Pendiente verificación visual real en navegador y prueba con Supabase: abrir y desplazar la lista, seleccionar con teclado y mouse, guardar/reabrir los nuevos campos, imprimir y comprobar que un cliente no puede consultar service_order_access. El proyecto es estático y no define un comando de compilación.

Respaldo: conservar el ZIP V14.38. Volver a ese código no elimina la tabla ni revierte permisos; las claves guardadas no estarán visibles en la interfaz anterior.
