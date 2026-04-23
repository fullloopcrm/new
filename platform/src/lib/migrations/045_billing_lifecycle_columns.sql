-- 045_billing_lifecycle_columns.sql
-- Tenant billing lifecycle columns touched by new Stripe webhook handlers:
--   invoice.paid            → last_payment_at timestamp
--   customer.subscription.deleted → subscription_cancelled_at timestamp
-- Allows dashboard to gate features when billing_status='past_due' or
-- 'cancelled' without losing the timeline of what happened.

alter table tenants
  add column if not exists last_payment_at timestamptz,
  add column if not exists subscription_cancelled_at timestamptz;

comment on column tenants.last_payment_at is
  'Most recent successful Stripe invoice paid for this tenant. Set by invoice.paid webhook.';
comment on column tenants.subscription_cancelled_at is
  'When the Stripe subscription was cancelled (either by owner or after failed retries). Set by customer.subscription.deleted webhook.';
