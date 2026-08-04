-- Stripe Connect Express account for paying Full Loop's own team, under the
-- platform's own Stripe account (STRIPE_SECRET_KEY) — not any tenant's key.
alter table platform_team_members add column if not exists stripe_account_id text;
