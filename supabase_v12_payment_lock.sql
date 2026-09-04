-- ThinkStore V12.1 · Bloqueo seguro de decisiones de pago
-- Ejecutar una sola vez en Supabase > SQL Editor.

alter table public.pedidos
  add column if not exists payment_decision text,
  add column if not exists payment_decision_locked boolean not null default false,
  add column if not exists payment_decision_at timestamptz,
  add column if not exists payment_decision_by text,
  add column if not exists payment_unlocked_at timestamptz,
  add column if not exists payment_unlocked_by text,
  add column if not exists payment_unlock_reason text;

-- Protege también las decisiones históricas ya existentes.
update public.pedidos
set
  payment_decision = case
    when lower(coalesce(estado,'')) like '%rechaz%' then 'rejected'
    else 'approved'
  end,
  payment_decision_locked = true,
  payment_decision_at = coalesce(payment_decision_at, created_at, now()),
  payment_decision_by = coalesce(payment_decision_by, 'migracion_v12_1')
where payment_decision is null
  and (
    lower(coalesce(estado,'')) like '%pago verificado%'
    or lower(coalesce(estado,'')) like '%rechaz%'
    or lower(coalesce(estado,'')) like '%preparando%'
    or lower(coalesce(estado,'')) like '%tránsito%'
    or lower(coalesce(estado,'')) like '%transito%'
    or lower(coalesce(estado,'')) like '%enviado%'
    or lower(coalesce(estado,'')) like '%entregado%'
    or lower(coalesce(estado,'')) like '%disponible%'
  );

comment on column public.pedidos.payment_decision is 'approved/rejected. Decisión financiera vigente del pedido.';
comment on column public.pedidos.payment_decision_locked is 'Bloquea cambios accidentales después de aprobar o rechazar un pago.';
comment on column public.pedidos.payment_unlock_reason is 'Motivo obligatorio del último desbloqueo autorizado por Gerencia.';
