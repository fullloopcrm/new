-- P2: GDPR/CCPA right-to-be-forgotten workflow.
--
-- Model: a deletion request soft-marks the client immediately (deletion_requested_at
-- + deletion_purge_at set), giving a 30-day grace window to cancel. A daily cron
-- (cron/gdpr-purge) hard-purges any request whose grace window has elapsed:
-- it ANONYMIZES the client row's PII in place rather than deleting the row, so
-- FK-linked bookings/invoices/reviews keep referential integrity and aggregate
-- reporting (revenue totals, job counts, etc.) is preserved. The row's id never
-- changes; only PII columns are nulled/redacted and deleted_at is stamped.
--
-- data_deletion_requests is the audit trail: one row per request, tracking who
-- asked, when, the scheduled purge date, and how it resolved (completed/cancelled).
-- Idempotent — safe to re-run.

alter table clients
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_purge_at timestamptz,
  add column if not exists deleted_at timestamptz;

comment on column clients.deletion_requested_at is
  'Set when a right-to-be-forgotten request is opened. Cleared if the request is cancelled within the grace period.';
comment on column clients.deletion_purge_at is
  'Scheduled hard-purge date (requested_at + 30 days). Cleared if the request is cancelled.';
comment on column clients.deleted_at is
  'Set once the row has been anonymized by the purge job. Permanent — PII is gone; the row itself is kept for FK/aggregate integrity.';

create table if not exists data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  requested_by text not null,        -- 'client' | 'admin' | 'owner'
  requested_by_id text,              -- portal client id, tenant member/user id, or 'admin'
  status text not null default 'pending',  -- 'pending' | 'cancelled' | 'completed'
  requested_at timestamptz not null default now(),
  purge_at timestamptz not null,
  cancelled_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_deletion_requests_tenant_idx
  on data_deletion_requests(tenant_id);

-- Purge-cron scan: only ever looks at pending requests whose window elapsed.
create index if not exists data_deletion_requests_pending_purge_idx
  on data_deletion_requests(purge_at)
  where status = 'pending';

-- At most one open request per client at a time.
create unique index if not exists data_deletion_requests_one_pending_per_client
  on data_deletion_requests(client_id)
  where status = 'pending';

-- Deny-by-default (matches 046_rls_deny_on_new_tables.sql convention): service
-- role bypasses RLS, so this only matters as a backstop if a route ever moves
-- to a user-scoped JWT.
alter table data_deletion_requests enable row level security;
drop policy if exists "deny_all_data_deletion_requests" on data_deletion_requests;
create policy "deny_all_data_deletion_requests" on data_deletion_requests
  for all to public using (false) with check (false);
