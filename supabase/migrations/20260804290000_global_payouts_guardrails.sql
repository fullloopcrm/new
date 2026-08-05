-- Guardrails for the Global Payouts auto-pay run: a per-run audit log (also
-- used to enforce the cooldown between runs) and a holds table for anything
-- that exceeds a threshold and needs admin SMS approval before it fires.
create table if not exists global_payouts_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  created_at timestamptz not null default now(),
  total_cents integer not null default 0,
  paid_count integer not null default 0,
  held_count integer not null default 0
);
create index if not exists idx_global_payouts_runs_tenant_time on global_payouts_runs(tenant_id, created_at desc);

create table if not exists payout_holds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  code text not null,
  kind text not null,               -- 'run_cap' | 'individual'
  summary text not null,
  total_cents integer not null,
  payload jsonb not null,           -- the specific items (booking/team-member/amount) to execute on GO
  admin_phone text,
  status text not null default 'pending',  -- pending | approved | executed | expired | rejected
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  executed_at timestamptz
);
-- Only one active (pending/approved) hold per code per tenant — codes are
-- short and reused across runs, so this can't collide with a still-open one.
create unique index if not exists uq_payout_holds_tenant_code_active
  on payout_holds(tenant_id, code)
  where status in ('pending', 'approved');
create index if not exists idx_payout_holds_tenant_status on payout_holds(tenant_id, status);

comment on table global_payouts_runs is 'One row per Global Payouts run attempt — audit trail + cooldown enforcement.';
comment on table payout_holds is 'Payout run items over the per-person/per-run guardrail thresholds, pending admin SMS approval (YES then GO) before they execute.';
