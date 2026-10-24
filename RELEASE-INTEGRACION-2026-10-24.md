# ThinkStore y Think Care · integración 24 octubre 2026

1. **Solicitudes:** bandeja común en `/solicitudes.html` y Soporte, con acceso por sesión y roles; filtros, alta manual, asignación, cotización, agenda e historial. Alertas en Administración, App Ventas y Soporte.
2. **Soporte:** autorización verificable más confirmación del inicio real; conversión recuperable con clave única entre Main y Soporte. No se generan pagos, consumo de inventario ni ingresos al recibir una solicitud.
3. **WhatsApp:** atención humana inicial conservada. El equipo asigna el bot con menú de ventas, soporte, citas, Think Care, empresas y consultas. El cliente confirma datos y autoriza avisos del servicio; BAJA siempre prevalece.
4. **Plantillas:** ocho ThinkStore y siete Think Care creadas en Meta, todavía PENDING al publicar. Cada envío comprueba consentimiento y aprobación UTILITY/es en Meta. Avisos de Think Care desde la gestión de solicitudes; estado de órdenes, abonos y ventas por los canales ya existentes y sus flags. Recordatorios automáticos de deuda siguen desactivados.
5. **Finanzas:** previsión cotizada separada de lo realmente cobrado y de saldos por cobrar; los importes se consultan de las órdenes canónicas. Enterprise mantiene sus cobros, gastos y rentabilidad existentes. Una cotización o solicitud no se contabiliza como ingreso.

## Instalación y seguridad
Migraciones MAIN y SOPORTE aditivas aplicadas el 24 octubre 2026. Copias privadas de solicitudes y órdenes previas en `ts_migration_backup`; sin modificar órdenes ni cobros existentes. RPC de gestión y conversión solo para service_role; credenciales en entorno, nunca en navegador. Una conversión que falle entre proyectos se reintenta desde Recuperar conversión pendiente.

Think Care utiliza UUID retenido en el formulario para que un reintento no duplique la solicitud.

## Validación
24 pruebas: `node --test tests/requests-integral.test.js tests/whatsapp-service-events.test.js tests/whatsapp-integral-webhook.test.js`; sintaxis y `git diff --check` aprobados. Incluye recuperación de conversión, límites de roles, ausencia de cobros al crear, consentimiento, duplicados y bloqueo por aprobación pendiente.

No implica aprobación de Meta ni verificación legal del negocio. La aprobación de plantillas y la documentación de la empresa dependen de Meta y del titular.

## Conexiones de producción verificadas
Avisos de servicio, citas, abonos y pedidos habilitados con control de aprobación de Meta; deuda automática desactivada. Relay Main–Soporte autenticado por secreto exclusivo de Functions en producción. Suscripción Meta `smb_message_echoes` activada. Las quince plantillas siguen PENDING en la comprobación final.

El subdominio `enterprise.thinkstore.com.ve` presenta un error de certificado preexistente. Los nuevos accesos usan la ruta funcional `/growth-enterprise/index.html` de ThinkStore, verificada con carga de saldos actuales. No se modificaron DNS ni certificados.
