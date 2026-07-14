# RLS Pass-8 Tenant Policy Migration — Proposal (file-only, NOT run)

_Author: worker W4, branch `p1-w4`, 2026-07-13, per LEADER order 12:36: "continue
backlog 3-deep (FILE-ONLY, migrations authored-not-run). Next 3 RLS-gap +
client tenantDb + verify green."_

## What this is

Pass 7 declared the file-only RLS-gap track exhausted: all 8 remaining tables
"blocked on the same thing — a live prod schema read, not another in-repo
audit." That's still true for 6 of the 8. It was **not actually true** for
the other 2 — `document_fields` and `document_activity` have had a fully
tracked schema (`platform/src/lib/migrations/031_documents.sql:108,144`,
`tenant_id UUID NOT NULL REFERENCES tenants(id)`) since pass 2/3 first
surfaced them. Every pass since (2, 3, 6, 7) named the same single blocker —
"missing covering index on `tenant_id`, out of scope for this pass" — and
punted it forward without ever landing the index. This pass lands it.

**File:** `platform/src/lib/migrations/2026_07_13_rls_pass8_tenant_policies_PROPOSED.sql`
**Status:** authored only. Not run against any database, sandbox or prod.

## Why these two were never actually blocked

No live prod read is needed here — the schema is fully committed in-repo:

```sql
-- 031_documents.sql:108-113
CREATE TABLE IF NOT EXISTS document_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ...
```

Same shape for `document_activity` (`031_documents.sql:144-149`). Both
satisfy the Stage-0 prerequisite (`tenant_id UUID NOT NULL`) that every prior
pass has used as its policy-authoring gate — the only thing missing is a
`CREATE INDEX ... (tenant_id)`, which pass 3 explicitly scoped out
("`document_activity` ... needs a small `CREATE INDEX` migration first, out
of scope for this pass") and no subsequent pass revisited.

Both tables are live and actively written today (not dead tables like pass
7's `client_referral_stats`) — grepped `platform/src/app/api/documents/**`
excluding tests:

- `document_fields`: inserted in `api/documents/[id]/duplicate/route.ts`,
  `api/documents/[id]/fields/route.ts`, `api/admin/requests/[id]/agreement/route.ts`;
  read in `api/documents/[id]/route.ts`, `api/documents/public/[token]/route.ts`,
  `api/documents/public/[token]/sign/route.ts`, `api/documents/[id]/send/route.ts`.
- `document_activity`: read in `api/documents/[id]/route.ts` (signing/e-sign
  audit trail).

## What the migration does

For each table: `CREATE INDEX IF NOT EXISTS idx_<table>_tenant ON
<table>(tenant_id)`, then the standard `tenant_isolation` equality policy,
same shape as passes 1-7.

Same critical caveat as every prior pass: **service_role bypasses RLS
unconditionally** — every route in the two lists above reads/writes via
`supabaseAdmin`, so this migration is provably inert on today's request
paths. Defense-in-depth only, prerequisite groundwork for a future
scoped-JWT client.

## What Jeff needs to do to run this (nothing has been executed)

1. Run on sandbox first.
2. Verify document upload / field-placement / e-sign / activity-log routes
   still 200 (trivially true — service_role bypasses RLS, so behavior is
   unchanged either way).
3. Promote to prod.

Rollback: drop the `tenant_isolation` policy, `DISABLE ROW LEVEL SECURITY`,
drop the new index — for both tables. No data risk either direction.

**I did not run any of this. No DDL was executed in any environment.**

## Remaining scope not covered

50/58 (passes 1-7) + 2 (this pass) = 52/58. 6 remain, and these genuinely
have no file-only angle left:

- **`projects`** — no `CREATE TABLE` found anywhere in the repo.
- **`settings`** — pass 2 finding, no tracked `CREATE TABLE`.
- **`booking_cleaners`, `cleaners`, `cleaner_payouts`,
  `member_pin_reset_codes`** — still no tracked schema ("exists in prod via
  ad-hoc SQL").

Pass-9's actionable step is a `\d` against the real DB for these 6 (someone
with prod access) — there is no more mechanical or semantic-review work
available against what's committed to the repo for this remainder.

Full list in `flwork-p1-w5/deploy-prep/rls-coverage-audit.md`.
