# Enterprise V8.8.22 — Navegación financiera en 5 secciones

Se reemplazó el menú principal por Inicio, Tesorería, Movimientos, Obligaciones y Reportes.

- Movimientos: accesos a ventas y cobros, registro financiero existente y caja chica.
- Obligaciones: accesos a proveedores, clientes y socios dentro de Tesorería.
- Reportes: accesos a conciliación, cierre semanal e indicadores.
- Se mantienen todos los componentes anteriores, sus funciones financieras y las conexiones de Supabase; ningún dato se modifica por este cambio de interfaz.
- Pendiente antes del deploy: pruebas funcionales en navegador con permisos reales, en especial ventas, tesorería, préstamos de socios, conciliación y cierre semanal.
- No se han ejecutado migraciones SQL ni despliegues.
