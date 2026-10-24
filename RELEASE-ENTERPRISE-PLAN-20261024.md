# Enterprise · planificación y saldo verificado

Banesco: corrección autorizada de un movimiento de venta sin registro de origen ni pagos asociados. Se conserva el registro anulado, el motivo y una copia privada en Supabase. Los detalles financieros y referencias reales quedan en la auditoría privada, fuera de este informe técnico. No se alteraron otras cuentas ni se creó un gasto de ajuste.

DNS: el CNAME enterprise apuntaba a thinkstore-enterprise.netify.app. Se corrigió en Cloudflare a thinkstore-entreprise.netlify.app, solo DNS. Netlify reconoce el destino; renovar el wildcard heredado falló por el desafío DNS _acme-challenge del dominio raíz. Se conserva la ruta segura /growth-enterprise/ y no se eliminó la zona DNS histórica ni se deshabilitó TLS. La verificación directa del subdominio fue bloqueada por revisión automática de seguridad debido al certificado previo.

Metas compartidas en Supabase: propuestas Q4 2026 de 3.000 USD en cobros, 500 USD en utilidad distribuible y 500 USD de disponibilidad en cuentas USD como referencia de reserva. Son editables y no inmovilizan dinero. Los avances provienen del mismo resumen financiero canónico, con consultas de trimestre completas; no de importes escritos como ahorro.

Siete plantillas mensuales borrador: alquiler, internet, electricidad, agua/servicios, telefonía, suscripciones y proveedores de mercancía. No se inventaron importes ni beneficiarios. Solo se activan con importe y día real; se generan meses de forma explícita e idempotente, ajustando días 29–31 al cierre del mes. Los pagos de mercancía siguen en Inventory.

Pago mensual: confirmación explícita de un pago ya realizado. ThinkStore exige cuenta de salida y moneda coincidente, verifica saldo y registra gasto, movimiento bancario y vencimiento en una transacción. Los socios conservan su tratamiento actual. Anular el gasto anula también su movimiento vinculado; reintentar no crea otro pago.

Migración aplicada con copia privada de la función anterior y registros afectados. Prueba SQL completa con ROLLBACK valida pago único, anulación vinculada y febrero con día 31, sin dejar registros de prueba.
