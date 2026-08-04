-- Full Loop's OWN finance ledger — what Full Loop (the company) collects from
-- tenants and spends running the platform. Deliberately NOT tenant-scoped:
-- no tenant_id-not-null FK to `tenants`, no requirement that Full Loop exist
-- as a tenant row. tenant_id here is an OPTIONAL attribution column (which
-- tenant a revenue line came from), same pattern as security_events/notifications
-- already use for platform-wide rows.
create table if not exists platform_finance_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('revenue', 'expense')),
  category text not null check (category in (
    'tenant_subscription', 'tenant_setup_fee', 'other_revenue',
    'ai_hosting_anthropic', 'infra_hosting', 'saas_tools', 'contractor_payroll', 'other_expense'
  )),
  amount_cents integer not null check (amount_cents > 0),
  occurred_on date not null,
  description text,
  tenant_id uuid references tenants(id) on delete set null,
  source text not null default 'manual',
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists platform_finance_transactions_occurred_on_idx on platform_finance_transactions (occurred_on desc);
create index if not exists platform_finance_transactions_type_idx on platform_finance_transactions (type);
create index if not exists platform_finance_transactions_tenant_id_idx on platform_finance_transactions (tenant_id);

-- Service-role-only access (admin routes use supabaseAdmin, same as every
-- other platform-admin table). RLS on with no policies = deny-all for the
-- anon/authenticated roles, matching this codebase's explicit-deny-all pattern.
alter table platform_finance_transactions enable row level security;
