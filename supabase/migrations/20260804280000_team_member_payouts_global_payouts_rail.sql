-- Global Payouts (v2 outbound_payments) shares the team_member_payouts ledger
-- with Stripe Connect (v1 transfers) so the existing per-booking idempotency
-- guard (UNIQUE(tenant_id, booking_id)) protects both rails identically — a
-- booking can only ever be paid once, regardless of which rail did it.
alter table team_member_payouts
  add column if not exists rail text not null default 'connect',
  add column if not exists stripe_outbound_payment_id text;

comment on column team_member_payouts.rail is
  'Which Stripe product moved the money: connect (v1 transfers, existing) or global_payouts (v2 outbound_payments, new).';
comment on column team_member_payouts.stripe_outbound_payment_id is
  'Stripe v2 OutboundPayment id, set only when rail = global_payouts.';
