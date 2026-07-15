# W4 — CPA-tokens entity_id FK-injection: fix existed elsewhere, missing on p1-w4

## Finding

`POST /api/finance/cpa-tokens` inserted caller-supplied `body.entity_id`
verbatim into `cpa_access_tokens` with no tenant-ownership check. A caller
could pass another tenant's `entity_id`, minting a CPA-access token bound to
a foreign accounting entity. `GET /api/finance/cpa-tokens` embeds
`entities(name)` unscoped, so the foreign entity's name would surface back
to the attacker's tenant on the next list call. Same vulnerability class as
the already-fixed bank-accounts/expenses/periods `entity_id` leaks.

## Root cause of the gap

This exact fix already exists in the repo's history as commit `26aeb5dd`
("fix(finance): reject foreign entity_id FK injection in cpa-tokens create"),
but that commit is **not an ancestor of `p1-w4`'s HEAD** — it landed on a
sibling branch/lane and was never merged/ported into this worktree. The
route file on `p1-w4` was still the pre-fix version. Worth the leader
checking whether other lanes have unmerged fixes that p1-w4 (and possibly
other lanes) are still missing — this class of drift (fix committed on one
branch, absent on others) is easy to miss with parallel workers on separate
worktrees.

## Fix applied (ported, file-only)

`src/app/api/finance/cpa-tokens/route.ts` — before inserting, verify
`entity_id` (if supplied) belongs to the caller's tenant via
`entities.eq('id', entityId).eq('tenant_id', tenantId).maybeSingle()`;
404 `Invalid entity_id` on miss. Matches the pattern used on
bank-accounts/expenses/periods.

## Test added

`src/app/api/finance/cpa-tokens/route.witness.test.ts` — LOCK (foreign
entity_id → 404, no row inserted) + 2 CONTROL cases (omitted entity_id →
null; own-tenant entity_id → passes). Uses this branch's `@/test/fake-supabase`
harness (the sibling branch's fix used a different, not-present-here
`tenant-isolation-harness` — test was rewritten to match p1-w4 conventions,
not copy-pasted).

## Verification

- `npx vitest run src/app/api/finance/cpa-tokens/route.witness.test.ts` — 3/3 pass.
- `npx tsc --noEmit` — clean, no errors.

## Not done (out of scope / file-only)

- No DB migration needed — this is app-layer validation only, no schema change.
- Did not touch referrers, referral-commissions, or team-PIN routes per leader instruction.
- Did not audit whether other lanes have similar unmerged-fix drift beyond this one instance; flagging the pattern for the leader.
