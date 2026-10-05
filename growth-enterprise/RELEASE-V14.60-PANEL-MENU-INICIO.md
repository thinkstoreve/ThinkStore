# ThinkStore Main V14.60 — Menú + Inicio Premium

Base: V14.59 recuperada y estable.

## Problema
Una sesión local podía conservar el rol como:
- `Super Admin`
- `super_admin`
- `super-administrator`

El encabezado mostraba "SUPER ADMIN", pero internamente el Panel todavía lo
trataba como un rol no reconocido hasta que Supabase terminara de refrescarlo.

Esto provocaba:
- sidebar vacío,
- permisos de cliente,
- Inicio equivocado,
- mensaje Multi-Rol,
- Dashboard premium sin renderizar.

## Corrección
- `role()` normaliza siempre el rol.
- `setUser()` guarda siempre el rol normalizado.
- Super Admin tiene `*` inmediatamente, sin esperar APIs remotas.
- Sesiones antiguas se reparan automáticamente al abrir V14.60.
- Admin y Super Admin abren siempre `dashboard` como Inicio.
- Si un Admin llega por error a `views.generic`, vuelve a Dashboard.
- Sidebar premium tiene un fallback explícito para Inicio.

## Se conserva
- Arranque estable V14.59.
- Logo de carga anterior.
- Diseño premium.
- Dashboard de referencia:
  - bienvenida,
  - imagen ThinkStore,
  - KPIs,
  - resumen semanal,
  - pedidos,
  - servicio técnico,
  - stock,
  - Enterprise.
- No se reactiva el service worker problemático del Panel.

No requiere SQL.
