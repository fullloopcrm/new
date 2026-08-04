-- Bank reconciliation for Full Loop's own ledger. Deliberately CSV-import
-- based, not live Stripe Financial Connections sync — audited the tenant
-- bank-connect feature first and found it only starts the FC link session;
-- nothing anywhere actually syncs transactions from it. Building on that
-- unproven path for a first pass would be building on sand. CSV import
-- (detectAndParse/transactionFingerprint from lib/bank-import + lib/ledger)
-- is the proven, working mechanism — reused directly, no tenant coupling.
create table if not exists platform_bank_transactions (
  id uuid primary key default gen_random_uuid(),
  txn_date date not null,
  posted_date date,
  description text not null,
  counterparty text,
  amount_cents bigint not null,
  check_number text,
  external_id text,
  fingerprint text not null,
  import_batch_id uuid,
  matched_transaction_id uuid references platform_finance_transactions(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'matched', 'ignored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists platform_bank_transactions_fingerprint_idx on platform_bank_transactions (fingerprint);
create index if not exists platform_bank_transactions_status_idx on platform_bank_transactions (status);

alter table platform_bank_transactions enable row level security;

-- Payroll: a real Stripe Connect transfer to a platform_team_members row is
-- POST /api/admin/company/team/[id]/pay — logs directly into
-- platform_finance_transactions (category contractor_payroll) on success,
-- no new table needed for that side. This migration only adds the bank side.
