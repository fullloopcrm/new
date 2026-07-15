# W4 — finance FK-injection drift sweep: 6 unmerged sibling-branch fixes ported

## Context

Following the cpa-tokens entity_id port (previous session), the report flagged
that fixes can land on a sibling branch/lane and never reach p1-w4. Checked
whether other finance FK-ownership fixes referenced in git history (`--all`)
were actually merged into this branch's HEAD. They were not — 8 of 9 checked
commits are not ancestors of p1-w4. This is the same drift class, at scale.

## Finding

`git log --all` shows commits fixing cross-tenant FK-injection on finance
write routes (caller-supplied `entity_id`/`coa_id`/`parent_id`/`client_id`
inserted or updated verbatim with no tenant-ownership check — CWE-639/OWASP
BOLA). `git merge-base --is-ancestor <c> HEAD` confirmed these are NOT on
p1-w4:

- `722cba64` bank-accounts POST (entity_id + coa_id)
- `71f84bb0` expenses POST (entity_id)
- `6dc23815` periods POST (entity_id)
- `44a2e8af` chart-of-accounts POST (parent_id)
- `598a0752` invoices POST (entity_id) — the invoices PATCH client_id half of
  this commit and the expenses/[id] PUT entity_id check (`20c0793e`) were
  **already present** on p1-w4 via some other path; only the POST-side
  entity_id gaps were still open.
- `35b0350f` bank-accounts/[id] PATCH (coa_id)
- `7176ba7c` expenses/[id] PUT — superseded on this branch by an equivalent
  fix already present (allow-list + entity_id check via `pick()`), no action
  needed.
- `20c0793e` — a later, partially-overlapping consolidation commit on a
  sibling branch; useful as reference for the shared-helper pattern but not
  itself mergeable (diverged file state).

Each of these routes joins the foreign table back on GET
(`entities(name)`, `chart_of_accounts(code, name, type)`), so a foreign id
would surface another tenant's business-entity/GL-account name on the next
read — a real, if narrow, cross-tenant identity leak, plus a dangling FK
reference into another tenant's row either way.

## Fix applied (ported + reconciled, file-only)

- `src/lib/entity.ts` — added shared `isEntityOwnedByTenant(tenantId, entityId)`.
- `src/app/api/finance/bank-accounts/route.ts` POST — verify `entity_id` (via
  the new helper) **and** `coa_id` before insert; 404 on either miss. (Union
  of `722cba64`'s coa_id check and the entity_id pattern — neither existed here.)
- `src/app/api/finance/bank-accounts/[id]/route.ts` PATCH — verify `coa_id`
  before update; 404 on miss.
- `src/app/api/finance/expenses/route.ts` POST — verify `entity_id` before
  insert; 404 on miss.
- `src/app/api/finance/periods/route.ts` POST — verify `entity_id` before
  upsert; 404 on miss.
- `src/app/api/finance/chart-of-accounts/route.ts` POST — verify `parent_id`
  (self-referencing FK) before insert; 400 on miss.
- `src/app/api/invoices/route.ts` POST — verify `entity_id` before insert;
  404 on miss. (`client_id` ownership on this route and on `invoices/[id]`
  PATCH were already guarded — confirmed by reading current file content,
  no change needed there.)

## Tests added

Witness tests (LOCK + CONTROL, following the cpa-tokens pattern with the
`@/test/fake-supabase` harness) for all 6 changed routes:
- `finance/bank-accounts/route.witness.test.ts` (4 cases: entity_id + coa_id)
- `finance/bank-accounts/[id]/route.witness.test.ts` (2 cases: coa_id)
- `finance/expenses/route.witness.test.ts` (3 cases)
- `finance/periods/route.witness.test.ts` (3 cases)
- `finance/chart-of-accounts/route.witness.test.ts` (3 cases: parent_id)
- `invoices/route.entity-scope.test.ts` (3 cases)

## Verification

- `npx vitest run src/app/api/finance src/app/api/invoices` — 14 files / 40
  tests pass.
- Full suite: `npx vitest run` — 267/268 files pass; the 1 failure
  (`cron/tenant-health/status-coverage-divergence.test.ts`) is a pre-existing,
  explicitly-labeled "RED until fixed" tracked issue in an unrelated
  subsystem (Fortress cron coverage vs middleware serve set) — not touched
  by or related to this change.
- `npx tsc --noEmit` — clean, no errors.

## Not done (out of scope / file-only)

- No DB migration — app-layer validation only, no schema change.
- Did not touch referrers, referral-commissions, or team-PIN routes per
  leader instruction.
- Did not do a full audit of every other sibling-branch commit for further
  unmerged drift beyond the finance-entity-FK class checked here — flagging
  again for the leader that this pattern (fix committed on one lane's
  worktree, never reaching others) is easy to miss and may recur elsewhere
  (non-finance modules weren't checked this pass).
- Team-portal and the public-token routes (cpa/[token]/year-end-zip,
  invoices/public/quotes/public/documents/public [token]) were reviewed this
  session and found already well-hardened (strong 192-bit tokens, tenant-
  active checks, atomic status transitions, rate-limited PIN/OTP auth) — no
  action needed there.
