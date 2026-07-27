-- Legal Overlook: passive, attorney-approved compliance tips surfaced on the
-- dashboard. Static content only — no live AI interpretation, no chat, no
-- answers to questions. See src/app/dashboard/legal/page.tsx.

-- Attorney-approved tip library. Content is written/edited by hand (or via
-- admin tooling later) — never generated live. trade_key/state_code null
-- means "applies to every trade/state".
create table if not exists legal_tips (
  id uuid primary key default gen_random_uuid(),
  trade_key text,
  state_code text,
  title text not null,
  body text not null,
  source_citation text,
  version integer not null default 1,
  effective_date date not null default current_date,
  review_due_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_tips_trade_state_idx on legal_tips (trade_key, state_code) where is_active;

-- Structured condition each tip fires on. Deliberately narrow to fields the
-- platform already tracks (tenants.compliance jsonb) — never free-text
-- comms, so this stays a data check, not interpretation.
create table if not exists legal_tip_triggers (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references legal_tips(id) on delete cascade,
  trigger_type text not null check (trigger_type in (
    'license_expiring', 'license_missing',
    'insurance_expiring', 'insurance_missing',
    'always'
  )),
  days_before integer,
  created_at timestamptz not null default now()
);

create index if not exists legal_tip_triggers_tip_idx on legal_tip_triggers (tip_id);

-- Per-tenant surfaced state. One row per (tenant, tip) — inserted once when a
-- trigger matches, dismissible, never re-generated or edited by the tenant.
create table if not exists legal_tip_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  tip_id uuid not null references legal_tips(id) on delete cascade,
  trigger_type text not null,
  surfaced_at timestamptz not null default now(),
  dismissed_at timestamptz,
  unique (tenant_id, tip_id)
);

create index if not exists legal_tip_notifications_tenant_idx on legal_tip_notifications (tenant_id, dismissed_at);

-- No RLS: tenant isolation for this table is enforced app-side via
-- getTenantForRequest()/tenantId scoping, matching every other tenant table
-- in this schema (all access goes through supabaseAdmin, the service role).
