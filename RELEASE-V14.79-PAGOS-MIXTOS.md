# ThinkStore Main V14.79 — Pagos mixtos (Staff + Admin)

**Base acumulativa:** V14.78 (BCV automático), V14.77 (fotos Staff), V14.76 (ventas Staff).

## Mejoras
- En **Staff → Vender → Pago y entrega** y **Admin → Venta presencial**, nuevo botón «Pago mixto · USD + Bs.» además de los métodos únicos anteriores.
- Hasta **12 abonos por venta**, combinables: Efectivo USD, Efectivo Bs, Pago Móvil, Transferencia Bs, Punto de venta Bs, Zelle y Transferencia USD.
- Importes originales en USD o Bs. según método; referencias independientes; saldo USD y saldo convertido a Bs. **automático** con BCV vigente y su fecha valor.
- «Completar saldo en el último abono» calcula el remanente sin operaciones manuales. Guarda en espera abonos parciales; **nunca confirma como pagado si faltan fondos o sobran**.
- El servidor **revalida BCV** y recalcula cada abono; no confía en totales enviados por el navegador. Si la tasa cambia antes de confirmar, requiere revisar y volver a calcular el cobro en Bs.
- `public.ts_order_payments` almacena abonos con monto original, equivalente USD, método, referencia, tasa/fecha y estado. Las líneas `pending` no son ingresos confirmados.
- RPC de Supabase confirma **pedido y todas sus líneas simultáneamente**, bloquea dobles aprobaciones; una venta = un pedido. El total del pedido en USD **no se multiplica** por la cantidad de abonos.
- La nota de entrega y su texto de correo muestran el desglose de los abonos una vez confirmado el pago.

## Ejemplo simulado
Venta por USD 100: USD 40 en efectivo + USD 60 × tasa BCV 50 = **Bs. 3000** en Pago Móvil. El pedido continúa por USD 100 y se guardan **2 líneas** de pago, no dos ventas.

## Orden de despliegue
1. **Supabase principal de ThinkStore:** ejecutar `MIGRACION-V14.79-PAGOS-MIXTOS.sql`. Debe haberse ejecutado previamente `MIGRACION-V14.78-TASA-BCV.sql`, además de las migraciones de Staff/ventas de versiones anteriores.
2. **Netlify sitio Main:** desplegar el directorio completo `ThinkStore-main/` del ZIP, **incluyendo `/netlify/functions`**. Un drag-and-drop de solo archivos estáticos no basta para desplegar Functions; usa repositorio Git o Netlify CLI.
3. Revisar `/staff/` y `/venta-presencial.html`, elegir «Pago mixto», introducir al menos dos abonos, verificar BCV y confirmar una venta de prueba.
4. Confirmar en Supabase: `pedidos.metodo_pago='Pago mixto'`, `pedidos.estado='Pago verificado'`, `ts_order_payments.status='confirmed'` para sus líneas, y que no se repita `pedidos.total_usd`.
5. Revisar Nota de Entrega con desglose, y diferencias entre subtotal, descuentos y abonos.

## SQL de comprobación (sustituye el código)
```sql
SELECT p.codigo,p.total_usd,p.total_bs,p.estado,l.line_no,l.method,l.currency,l.amount,l.usd_equivalent,l.reference,l.bcv_rate,l.status
FROM public.pedidos p
JOIN public.ts_order_payments l ON l.pedido_id=p.id
WHERE p.codigo='TS-2026-00001'
ORDER BY l.line_no;
```

## Consideraciones
- Un **pago parcial se guarda en espera** con líneas `pending`, pero el registro posterior de más abonos a ese pedido pendiente todavía requiere una pantalla de seguimiento/cobranza; no se marca como pagado automáticamente.
- Las cifras agregadas por métodos en **Enterprise** requieren que el sitio Enterprise independiente consulte `ts_order_payments` (en el despliegue de Enterprise); esta versión de Main prepara los datos y **no despliega Enterprise**.
- El BCV llega desde la fuente espejo declarada en V14.78; su publicación puede retrasarse respecto al anuncio oficial. Sin tasa verificada no se autorizan nuevos cobros en Bs.
- Pruebas: unidad de validación y autorización simulada, UI Staff/Admin en escritorio y móvil. **No se ha probado todavía contra el Supabase real ni se ha publicado en producción.**
