ThinkStore Soporte V8.6
Cotización -> aprobación del cliente -> alerta al técnico

FLUJO

1. Técnico abre Gestionar orden.
2. Indica:
   - Técnico responsable
   - Monto
   - Detalle de la reparación propuesta
3. Pulsa "Enviar cotización al cliente".
4. La orden cambia a "Cotización enviada".
5. Se envía correo premium con botón "Revisar cotización".
6. Cliente entra al seguimiento seguro.
7. Puede:
   - leer el trabajo propuesto,
   - escribir una pregunta,
   - usar respuestas rápidas,
   - revisar diagnóstico, fotos y bitácora.
8. Al pulsar "Aprobar cotización":
   - aparecen las políticas,
   - debe marcar "He leído y acepto",
   - puede dejar un comentario,
   - pulsa "Aceptar y aprobar cotización".
9. Automáticamente:
   - status = Aprobado por cliente
   - quote_status = Aprobado
   - se guarda fecha/hora de aceptación
   - se guarda versión de políticas
   - se agrega entrada de bitácora
   - se genera alerta interna para el técnico.
10. El Panel de Soporte consulta alertas cada 12 segundos.

IMPORTANTE
El SQL V8.6 es acumulativo. Si todavía no ejecutaste V8.4 o V8.5,
puedes ejecutar directamente:
MIGRACION-SOPORTE-V8.6-COTIZACION-APROBACION.sql

Ejecutarlo únicamente en Supabase -> ThinkStore-Soporte.
