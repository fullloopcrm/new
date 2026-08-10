-- Weekly staff payroll (Jeff, 08-10): salaried team members (comp_type='salary',
-- pay_period='weekly' on hr_employee_profiles) get paid automatically via a new
-- cron, using the same team_member_payouts ledger + Stripe Connect transfer rail
-- cleaner payouts already use -- new rail value 'payroll', no schema change needed
-- for that (rail is free text, no CHECK constraint).
--
-- booking_id is already nullable on team_member_payouts (payroll rows have none).
-- pay_period_start is new: the Monday of the week being paid for. The partial
-- unique index is the idempotency guard -- a cron retry or double-fire can insert
-- a payroll row for the same person/week at most once, so a stuck transfer can be
-- retried safely without ever double-paying.
ALTER TABLE team_member_payouts ADD COLUMN IF NOT EXISTS pay_period_start DATE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payouts_payroll_period
  ON team_member_payouts (tenant_id, team_member_id, pay_period_start)
  WHERE rail = 'payroll';
