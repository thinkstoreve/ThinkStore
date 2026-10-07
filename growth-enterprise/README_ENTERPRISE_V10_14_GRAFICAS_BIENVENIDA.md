# ThinkStore Enterprise V10.14 · Gráficas + Bienvenida Premium

Actualización visual sobre V10.13. No requiere SQL nuevo y conserva Caja Chica, Caja Staff, pagos mixtos, conciliación, COGS, socios e integración con Soporte/Inventory.

## Mejoras
- Bienvenida personalizada con el nombre del usuario autenticado.
- Saludo según la hora de Caracas.
- Animación de entrada premium mientras Enterprise sincroniza datos.
- Transición suave al cambiar de módulo.
- Resumen gráfico ejecutivo con datos reales:
  - entradas y salidas por día de la semana;
  - origen de ingresos: tienda / Servicio Técnico / otros;
  - cobrado vs costos vs utilidad distribuible;
  - principales métodos de cobro;
  - salud de conexiones del ecosistema.
- Respeta `prefers-reduced-motion`.
- Dominio visual corregido a `enterprise.thinkstore.ve`.

## Datos
La serie diaria se genera en `netlify/functions/enterprise-finance.js` a partir de las mismas fuentes contables que ya usa Enterprise. No crea movimientos nuevos ni modifica las reglas financieras.

## Deploy
Desplegar el ZIP completo en el sitio Netlify de `enterprise.thinkstore.ve` incluyendo `netlify/functions/`.
No ejecutar SQL adicional para esta versión.

## Pruebas recomendadas
1. Entrar como Freddy y verificar bienvenida personalizada.
2. Entrar como Nelson y verificar que cambie el nombre automáticamente.
3. Revisar Resumen y confirmar que los gráficos coincidan con Tesorería/Conciliación.
4. Registrar una venta, actualizar Enterprise y verificar cambio de entradas.
5. Registrar un gasto y verificar cambio en salidas.
6. Probar escritorio y móvil.
