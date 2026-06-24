ThinkStore Enterprise V9 · Ecosistema + Mobile/PWA

Incluye:
- Centro de Operaciones unificado.
- PWA instalable en iPhone, iPad, Android, Mac y Windows.
- CRM real reforzado con Cliente 360.
- Ventas, Inventario, Finanzas, Marketing y BI leyendo datos reales visibles de Supabase.
- Centro de Alertas del ecosistema.
- ThinkStore AI 2.0 con recomendaciones cruzadas.
- Conexión opcional a Supabase de Soporte mediante support-config.js si soporte.thinkstore.com.ve usa otro proyecto.

Modo seguro:
- No modifica pedidos.
- No valida pagos.
- No toca Resend.
- No cambia correos automáticos.
- No altera notas de entrega.
- No rompe el panel actual de administración.

Para conectar Soporte externo:
1. Abrir growth-enterprise/support-config.js.
2. Colocar enabled:true, url y anonKey del proyecto Supabase de Soporte.
3. Hacer commit y deploy.
