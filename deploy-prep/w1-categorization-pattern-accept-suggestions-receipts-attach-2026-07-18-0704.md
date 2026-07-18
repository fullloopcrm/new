# accept-suggestions + receipts/attach categorization_patterns collision fix (2026-07-18 07:04)

## Fresh-ground discovery (continuation of a previously-closed surface)

`idx_categ_patterns_tenant_pattern` uniquely constrains `categorization_patterns`
on `(tenant_id, pattern)` only — two columns. One row per pattern per tenant;
`coa_id` is meant to be mutable on that single row (`categorize-ai.ts`'s
cascading lookup keys on `pattern` alone and trusts whichever `coa_id` sits
on that one row as the current best category).

Earlier this session (662853c5) that exact bug shape was fixed in
`PATCH /api/finance/bank-transactions/[id]`: the existence check filtered on
`coa_id` in addition to `(tenant_id, pattern)`, so re-categorizing an
already-learned pattern to a *different* category never matched the existing
row, fell into the insert branch, and hit the 2-column unique index — an
error that call never even captured.

Sweeping every other write site against that same table (`grep -rl
categorization_patterns platform/src`) surfaced two more sites with the
identical shape that hadn't been touched:

- `POST /api/finance/bank-transactions/accept-suggestions` — bulk-accepting
  AI-suggested categorizations.
- `POST /api/finance/receipts/attach` — attaching a receipt to a
  transaction, optionally setting/correcting its category in the same call.

Both had the same three-part defect:

```ts
const { data: existing } = await supabaseAdmin
  .from('categorization_patterns')
  .select('id, hit_count')
  .eq('tenant_id', tenantId)
  .eq('pattern', pattern)
  .eq('coa_id', suggestedOrChosenCoaId)   // <- narrows the existence check
  .maybeSingle()
if (existing) {
  await supabaseAdmin.from('categorization_patterns').update({ ... }).eq('id', existing.id)
} else {
  await supabaseAdmin.from('categorization_patterns').insert({ ... })   // <- 23505 on a real collision
}
```

**Concrete failure**: a tenant has a learned pattern `"starbucks store #"` ->
Meals (`coa-meals`, `hit_count: 7`). A bookkeeper accepts an AI suggestion
that instead categorizes a Starbucks transaction as Office Supplies
(`coa-office`) — a legitimate, deliberate correction. The `.eq('coa_id',
'coa-office')` filter means the existing Meals row is invisible to this
lookup, so the route tries to `insert` a second `(tenant-A, "starbucks
store #")` row. In production that insert hits the 2-column unique index
and fails with `23505`; neither route captured the write's error, so the
correction is silently dropped and the AI keeps re-suggesting Meals on
every future Starbucks transaction from that tenant, forever. (In the local
fake-store test harness, which doesn't enforce the unique constraint, the
identical defect shows up as a genuine duplicate row rather than a thrown
error — same underlying bug, different visible symptom, confirmed via the
RED run below.)

## Fix (file-only, no push/deploy/DB)

Both `route.ts` files: drop the `coa_id` filter from the existence check
(look up by `(tenant_id, pattern)` only), then branch on whether the
existing row's `coa_id` matches:

```ts
const { data: existing } = await supabaseAdmin
  .from('categorization_patterns')
  .select('id, coa_id, hit_count')
  .eq('tenant_id', tenantId)
  .eq('pattern', pattern)
  .maybeSingle()
const { error: patternErr } = existing
  ? await supabaseAdmin.from('categorization_patterns').update(
      existing.coa_id === newCoaId
        ? { hit_count: (existing.hit_count || 0) + 1, last_used_at: new Date().toISOString() }
        : { coa_id: newCoaId, hit_count: 1, last_used_at: new Date().toISOString() },
    ).eq('id', existing.id)
  : await supabaseAdmin.from('categorization_patterns').insert({ tenant_id: tenantId, pattern, coa_id: newCoaId, hit_count: 1 })
if (patternErr) console.error('[<route>] failed to update categorization_patterns', patternErr)
```

Same-category reaffirms (increment `hit_count` — it measures confidence in
the *current* mapping). Different-category overwrites (`hit_count` resets
to 1 — the old count was confidence in a mapping this write just corrected).
Also stopped discarding the write's result entirely in both routes; now
logged on failure so a real DB-level collision (e.g. a genuinely
unanticipated shape) is at least visible in logs instead of vanishing.

## Verification sweep (item 2 — is the surface actually closed now)

`grep -rl categorization_patterns platform/src --include="*.ts" | grep -v test`
returns exactly four non-test files:

- `.../bank-transactions/[id]/route.ts` — already fixed (662853c5).
- `.../bank-transactions/accept-suggestions/route.ts` — fixed here.
- `.../receipts/attach/route.ts` — fixed here.
- `src/lib/categorize-ai.ts` — read-only lookup (`.select(...)`, no write),
  not in scope for this bug class.

No remaining write sites. This surface is closed.

## Verification

- New tests: 7 (`accept-suggestions` x3 — overwrite-on-disagreement,
  increment-on-reaffirm, insert-when-none; `receipts/attach` x4 — same
  three plus a no-op case when the call carries no `coa_id` at all).
- RED-confirmed: `git diff` of the fix saved to a patch, `git apply -R` to
  revert (not `git stash` — shared `.git` dir across workers, this
  session's established convention), re-ran both new test files — the
  disagreement case failed in both files with the predicted duplicate-row
  symptom (`expected length 1, got 2` — the fake store doesn't enforce the
  unique index, so the failure mode is a literal duplicate rather than a
  thrown `23505`, but it's the same defect: the correction didn't overwrite,
  it duplicated/vanished). The other 5 cases in each file passed either way,
  as expected — they don't exercise the missing filter. `git apply` to
  restore, re-ran — all 7 green.
- `tsc --noEmit --pretty false`: 0 new errors (same 5 pre-existing baseline
  errors — admin-auth route typing, two cron test files' spread-argument
  typing, sunnyside-clean-nyc's site-nav.ts import names — unchanged).
- `eslint` on all 4 touched files: 0 errors (2 pre-existing
  unused-import warnings on `getTenantForRequest` in both route.ts files,
  present before this change, unrelated to it).
- Full `vitest run`: 667/667 files, 3466 passed + 1 expected-fail (3467),
  0 regressions (was 665/665, 3459+1/3460 — net +2 files/+7 tests).

tenant_domains schema lane reconfirmed intact, no drift. No new SQL — no
schema change needed, this was an application-layer query-scoping fix only,
same as the earlier categorization_patterns/chart_of_accounts pass.

File-only. No push/deploy/DB.
