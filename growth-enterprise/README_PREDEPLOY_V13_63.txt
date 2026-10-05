ThinkStore V13.63 · PRE-DEPLOY VALIDADO

VALIDACIONES ESTÁTICAS
- ZIP de origen íntegro.
- JavaScript externo comprobado: 75
- Scripts inline comprobados: 15
- Errores de sintaxis: 0
- Referencias locales faltantes: 0
- Netlify Functions principales faltantes: 0
- Archivos críticos presentes: True
- SQL V13.63 presente: True

RESULTADO
APTO PARA PRE-DEPLOY ESTÁTICO

ANTES DE PRODUCCIÓN
1. Ejecutar supabase_v13_63_unidades_fisicas.sql.
2. Confirmar migrations anteriores necesarias ya aplicadas.
3. Probar en staging/preview:
   - login
   - carrito
   - métodos de pago
   - carga de comprobante
   - creación de pedido
   - aprobación de pago
   - asignación de unidad
   - serial / IMEI
   - batería y condición general Pre-Owned
   - bloqueo/desbloqueo de nota
   - correo
   - transición Entregado
   - inventario de variante y unidad física
4. Verificar variables Netlify y permisos de Storage.

LÍMITE
No se probaron Supabase de producción, Resend real, Storage real ni un deploy real desde ChatGPT.
