# ThinkStore Enterprise V10.21 · Caja Chica por cuentas

Base: Enterprise V10.20.

## Conservación de datos
- No borra ni reinicia los valores existentes de Caja Chica.
- Los saldos previos continúan siendo el total oficial de Caja Chica.
- Al activar V10.21, cualquier importe que todavía no esté asociado a una cuenta aparece como **Saldo sin asignar**.
- Distribuir ese saldo entre cuentas no crea ingresos ni gastos y no modifica el total.

## Cuentas USD
- Bank of America
- Chase
- Banco Pichincha
- Binance
- Zelle

## Cuentas Bs.
- Banesco
- Banco Nacional de Crédito (BNC)
- Banco de Venezuela
- Bancamiga
- Banco Venezolano de Crédito

## Funciones
- Tarjetas Disponible USD / Disponible Bs. clickeables.
- Saldo individual por cuenta o billetera.
- Asignación de saldos históricos sin alterar el total.
- Gasto, reposición, reintegro y ajuste por cuenta.
- Transferencias internas entre cuentas de la misma moneda.
- Historial individual por cuenta.
- Alias y últimos 4 dígitos opcionales.
- Conciliación accesible desde la vista de cuentas.
- Logos/íconos de marca obtenidos a partir de los dominios oficiales con fallback local.
- Responsive para laptop, tablet y teléfono.

## Despliegue
1. Ejecutar una sola vez en el Supabase PRINCIPAL:
   `MIGRACION-ENTERPRISE-V10.21-CAJA-CHICA-CUENTAS.sql`
2. Desplegar el ZIP V10.21 en Enterprise.
3. Abrir Caja Chica y pulsar Disponible USD / Disponible Bs.
4. Distribuir el saldo anterior desde "Saldo sin asignar" hacia las cuentas reales cuando corresponda.

La migración es aditiva y no modifica los movimientos anteriores de Caja Chica.
