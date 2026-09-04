# ThinkStore
ThinkStore Ecommerce Apple Premium . Netlify + Supabase + Resend
# Servicio técnico y repuestos

La carpeta `soporte/` incluye el portal operativo de servicio técnico y su inventario real de repuestos. Para activar esta versión, ejecuta una vez el archivo completo `soporte/supabase_soporte_produccion.sql` en el SQL Editor del proyecto **ThinkStore-Soporte**. El script es idempotente y agrega:

- órdenes, recepción y bitácora técnica;
- asignación de técnicos, presupuestos, garantías y archivos privados;
- stock de repuestos con entradas, consumos y alertas de mínimo;
- trazabilidad del repuesto usado contra el código de la orden;
- permisos RLS y consulta pública protegida del estado de reparación.

El bloque “Servicio técnico Apple” de la tienda abre una solicitud guiada por WhatsApp y “Consultar reparación” dirige al portal real de Soporte. Enterprise consulta órdenes, auditoría, repuestos y movimientos mediante su función segura servidor a servidor.
