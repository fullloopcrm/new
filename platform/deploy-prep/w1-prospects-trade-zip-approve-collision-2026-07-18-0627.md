# W1 fresh-ground: prospect approval's trade+zip exclusivity collision was a bare uncaught throw

**Date:** 2026-07-18 06:27
**Surface:** `idx_prospects_trade_zip_active` (037_leads_qualification.sql) — a
partial unique index on `prospects(trade, primary_zip)` scoped to `WHERE status
IN ('approved','paid') AND primary_zip IS NOT NULL`. This is a real
territory-exclusivity guarantee: only one prospect per trade+zip can ever be
`approved`/`paid` at a time.

## The bug

`PATCH /api/admin/prospects/[id]` (super-admin "approve this lead" action) is
the only write path that can push a row's status into `approved`. Two
qualifying prospects for the same trade in the same zip code applying around
the same time is a completely normal real-world occurrence, not an edge case —
and approving the second one after the first already holds the slot hits
`idx_prospects_trade_zip_active` head-on.

The handler had **no `try`/`catch` anywhere in the file** (confirmed: 0
occurrences of `try {` across both `GET` and `PATCH`). The final write was:

```ts
const { data, error } = await supabaseAdmin.from('prospects').update(updates).eq('id', id).select('*').single()
if (error) throw error
```

A `throw` with nothing above it to catch propagates fully uncaught out of the
route handler — not a JSON `500` with a message, an unhandled exception. Worse,
by the time this update runs, the handler has **already made a real Stripe API
call** (`stripe.checkout.sessions.create(...)`, a live subscription checkout
session) earlier in the same action branch. On a collision, that session's
`url` is computed, assigned onto `updates`, and then silently discarded when
the write throws — the admin sees an opaque crash with zero indication that
the real cause was "another prospect already holds this exact trade+zip slot,"
not "the system is broken."

This is the same class already fixed this session on `idx_coa_tenant_code`
(chart_of_accounts) and `idx_invoices_tenant_number`/`idx_quotes_tenant_number`
— a caller/action-triggered collision on a business-meaningful unique
constraint is a **real conflict**, not a bug to silently paper over, and must
surface as a clean, explainable response instead of falling through to a raw
error.

## The fix

```ts
if (error) {
  if (error.code === '23505' && body.action === 'approve') {
    return NextResponse.json(
      { error: 'Another prospect already holds the exclusive slot for this trade + zip code' },
      { status: 409 },
    )
  }
  return NextResponse.json({ error: error.message }, { status: 500 })
}
```

Gated specifically to `action === 'approve'` since that's the only action that
writes a status this index actually constrains (`reject`/`review` write
`rejected`/`reviewing`, both outside the partial index's `WHERE` clause and
therefore never a source of this particular 23505). Unrelated DB errors
(anything not `23505`) still return the underlying `error.message` at `500`,
matching this file's existing `GET` handler convention instead of a generic
opaque string.

Did not attempt to void/expire the already-created Stripe checkout session on
this failure path — Stripe checkout sessions expire on their own (default
24h) and no charge occurs until the prospect actually completes checkout, so
the wasted session is inert, not a real vulnerability; fixing it would be
scope creep beyond turning the crash into a clear conflict message.

## Verification sweep (item 2: does this same "uncaught raw throw" pattern exist elsewhere?)

Grepped every `if (error) throw error` / bare `throw error` across
`src/app/api` (both admin and tenant-scoped routes) and, for each hit,
mechanically checked whether the enclosing `export async function` actually
has a `try {` above that line in the same function body. **Zero other
instances** — every other occurrence in the codebase throws into a real
enclosing `try`/`catch` that returns a proper JSON error response.
`admin/prospects/[id]/route.ts`'s `PATCH` was the sole outlier; this closes
that specific "no enclosing try/catch at all" pattern.

Also spot-checked the rest of the unique-index inventory
(`idx_bank_import_batches_sha`, `idx_domain_notes_tenant_domain_unique`,
`tenant_domains_one_primary_per_tenant`, `idx_entities_tenant_default`, the
`idx_*_idempotency`/`*_dedup_once` family) for the same "caller-facing action
hits a raw uncaught error" shape — none reproduce it; the idempotency/dedup
ones are all system-generated writes (cron/webhooks) already gated by
claim-first patterns from earlier passes this session, and
`idx_entities_tenant_default`/the domain-primary constraint are both handled
with an unset-existing-default-first write, not a blind insert/update into the
constrained slot.

## Verification

- New test file: `route.approve-slot-collision.test.ts` (3 tests) — asserts
  (a) a `23505` on the update returns a clean `409` with the exclusivity
  message and the Stripe session was still created (can't be un-created after
  the fact, but the DB never lands a duplicate `approved` row), (b) approval
  still succeeds end-to-end with no conflict, (c) an unrelated DB error code
  still surfaces as a plain `500` with the real `error.message`, not the 409
  copy.
- `npx eslint` on both touched/added files: 0 errors.
- `tsc --noEmit --pretty false`: same 4 pre-existing baseline errors only
  (admin-auth route type gen, cron/outreach + cron/payment-reminder tests,
  sunnyside-clean-nyc site-nav), 0 new.
- Full `npx vitest run`: 663/663 files, 3453 passed + 1 pre-existing
  expected-fail (3454 total), 0 regressions (was 662/662, 3450+1 before this
  pass — +1 file/+3 tests, exactly the new coverage added).

File-only, no push/deploy/DB. `idx_prospects_trade_zip_active` already exists
from a prior migration (037_leads_qualification.sql) — this is an
application-layer fix only, no new SQL.

## Noticed (not fixed, flagging per scope discipline)

- The Stripe checkout session created before the failed write is not voided/
  expired early on a collision — left to Stripe's own default 24h expiry
  rather than added cleanup, since no charge can occur on an unfinished
  session and adding cancellation logic here is unrelated to the actual bug
  (the crash), not required to fix it.
- Did not add a pre-check (`SELECT ... WHERE trade=X AND primary_zip=Y AND
  status IN ('approved','paid')`) before calling Stripe, which would avoid the
  wasted API call entirely on the common case. The atomic DB constraint is the
  real source of truth for correctness (a pre-check alone would still have a
  TOCTOU gap against a concurrent second approval); adding the pre-check as a
  best-effort short-circuit is a reasonable follow-up but a separate,
  smaller improvement, not the crash fix itself.
