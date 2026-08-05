-- Global Payouts (Stripe's v2 Money Management / Recipients product) is a
-- separate rail from Stripe Connect. team_members.stripe_account_id already
-- means "Connect account id" and is read by the existing webhook auto-pay
-- path — do not overload it. This column holds the v2 core account id
-- (acct_... but a v2.core.account, not a v1 Connect account) for team
-- members onboarded as Global Payouts recipients.
alter table team_members
  add column if not exists global_payouts_recipient_id text;

comment on column team_members.global_payouts_recipient_id is
  'Stripe v2 core account id (Global Payouts recipient), distinct from stripe_account_id (Connect). Not yet read by any automated payout path.';
