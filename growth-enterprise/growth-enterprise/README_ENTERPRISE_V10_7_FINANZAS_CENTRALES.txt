ThinkStore Enterprise V10.7 · Finanzas Centrales

Base acumulativa: V10.6 Online + SSO Directo.
No desplegar todavía si se está preparando el ecosistema completo.

NUEVO
1. Tesorería & Socios
   - Gastos y compras con detalle, proveedor/beneficiario, método de pago y referencia.
   - Registra quién pagó: Empresa, Freddy o Nelson.
   - Si Freddy/Nelson paga un gasto de la empresa, el sistema aumenta automáticamente la deuda de la empresa con ese socio.
   - Aportes/préstamos de socios separados de ingresos y utilidades.
   - Devoluciones parciales a socios sin contabilizarlas por segunda vez como gasto.
   - Cuentas por cobrar manuales y abonos parciales.
   - Métodos de pago consolidados: tienda, Servicio Técnico y movimientos Enterprise.
   - Costos de garantía, comisiones bancarias, devoluciones y otros ingresos.

2. Comisión de técnicos
   - Se enlaza a una orden real de soporte.
   - Regla por defecto: 50% sobre NETO del servicio.
   - Base neta = valor del servicio - repuestos - otros costos directos.
   - La comisión se devenga antes del reparto de socios.
   - Pago al técnico se registra aparte para evitar descontar dos veces.

3. Auditoría semanal
   - Ventas cobradas de tienda.
   - Cobros/abonos de Servicio Técnico.
   - Otros ingresos y abonos manuales.
   - Gastos, compras, garantías, devoluciones y comisiones bancarias.
   - Comisión técnica devengada.
   - Resultado neto y utilidad distribuible.
   - Reparto: 50% Empresa / 25% Freddy / 25% Nelson.
   - Si hay pérdida, el reparto es $0 y se muestra pérdida por compensar.
   - Cierre semanal guarda snapshot de auditoría y no se sobreescribe una semana ya cerrada.

4. Regla contable importante
   - NUNCA se reparte 50/25/25 sobre ventas brutas.
   - Aportes de socios NO son ingresos.
   - Devoluciones a socios NO son gastos nuevos.
   - Un gasto pagado por un socio reduce la utilidad una vez y crea una deuda de la empresa con ese socio.
   - El pago posterior de esa deuda solo reduce caja, no vuelve a reducir la utilidad.

5. Historial de abonos de Servicio Técnico
   Ejecutar MIGRACION-SOPORTE-V8.8.5-HISTORIAL-ABONOS-ENTERPRISE.sql en Supabase Soporte.
   Registra cada cambio de amount_paid como evento; Enterprise puede auditar abonos por semana sin contar el saldo acumulado varias veces.

SQL PRINCIPAL
Ejecutar MIGRACION-ENTERPRISE-V10.7-FINANZAS-CENTRALES.sql en Supabase principal.
Crea:
- enterprise_finance_settings
- enterprise_finance_entries
- enterprise_weekly_audits

No cambia pedidos, clientes, inventario, comprobantes, correos ni Service Orders existentes.
Las escrituras financieras se hacen desde la Netlify Function Enterprise con service_role; el navegador no escribe directamente el ledger.

CONEXIONES
- Tienda / App Ventas: pedidos y métodos de pago del Supabase principal.
- Servicio Técnico: service_orders y, si está instalada la migración V8.8.5, service_payment_events.
- Enterprise: ledger financiero manual + auditorías + obligaciones de socios + comisiones técnicas.
- Garantías: el módulo existente permanece y Finanzas añade el tipo de gasto Costo de garantía.

SIGUIENTE FASE RECOMENDADA
- Ordenes de compra de proveedores conectadas a Inventory y COGS por unidad vendida.
- Conciliación de Zelle/Pago Móvil/Efectivo contra caja y cuentas bancarias.
- Presupuestos mensuales por categoría.
- Adjuntar factura/comprobante a cada gasto.
- Aprobación dual Freddy + Nelson para cerrar semana o gastos superiores a un límite.
