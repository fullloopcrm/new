# `stripe-platform` webhook — `createTenantFromLead` idempotency is check-then-act, not atomic (FOR-JEFF-REVIEW, docs only)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-13
**Status:** read-only code review. No DB commands run, no code changed.

**Follows up on:** `webhook-idempotency-audit.md` finding 🟢 #5, which flagged that
`stripe-platform/route.ts` has no local idempotency guard and "relies entirely on `createTenantFromLead(lead_id)`
being idempotent... worth confirming (not verified in this pass — out of scope for a webhook-route
audit)." This doc closes that specific "worth confirming" — and finds the answer is **"idempotent against
a sequential retry, not against a concurrent/overlapping one."**

---

## Confirmed: `createTenantFromLead` does dedupe (the part #5 asked about)

`platform/src/lib/create-tenant-from-lead.ts:56-64` checks `lead.converted_tenant_id` at the top and
returns the existing tenant (`alreadyConverted: true`) instead of creating a second one. For a *sequential*
Stripe retry — first delivery completes fully (including the final `partner_requests` update at line
213-221), then a second delivery of the same event arrives later — this works correctly. That much of #5's
"worth confirming" note is resolved: yes, it dedupes.

## Not confirmed by #5, and the real gap: no protection against two *overlapping* deliveries

The dedupe check is classic **check-then-act**, not an atomic claim:

```ts
// create-tenant-from-lead.ts:56
if (lead.converted_tenant_id) {         // ← READ
  ...
  return { ok: true, tenant: existing, alreadyConverted: true }
}
// ... 150+ lines of work: territory claim, tenant insert, provisionTenant(),
// seedOnboardingTasks(), crm_notes copy, owner PIN creation ...
await supabaseAdmin.from('partner_requests').update({ converted_tenant_id: tenant.id, ... })  // ← WRITE, line 213-221
```

Between the READ at line 57 and the WRITE at line 213, the function does real I/O-bound work
(`provisionTenant`, `seedOnboardingTasks`, several sequential Supabase round-trips) — a multi-second
window. **`partner_requests.converted_tenant_id` has only a non-unique partial index**
(`platform/migrations/2026_06_30_partner_requests_converted_tenant.sql:7-9`,
`CREATE INDEX ... WHERE converted_tenant_id IS NOT NULL` — no `UNIQUE`), so nothing at the database layer
stops two concurrent calls for the same `leadId` from both reading `converted_tenant_id IS NULL` and both
proceeding to create a tenant.

**How two overlapping calls actually happen here, concretely** — not a generic "webhooks can duplicate"
disclaimer:
1. Stripe's own delivery model is at-least-once and explicitly documents that near-simultaneous or
   out-of-order redelivery is possible, not just "on error." `stripe-platform/route.ts` does nothing to
   serialize deliveries for the same `lead_id`.
2. The handler is unusually slow for a webhook (provisioning + onboarding-seed side effects), which widens
   the race window far beyond a typical DB-only handler.
3. Unlike the other 5 webhook branches this codebase already hardened with `claimWebhookEvent`/
   `processed_webhook_events` (per `webhook-hardening-plan.md` §3 — telnyx, resend, telegram×3),
   `stripe-platform/route.ts` was never wired into that ledger (confirmed by grep: no
   `claimWebhookEvent` import or call anywhere in `stripe-platform/route.ts`). It has zero event-level
   dedupe — its *only* safety net is `createTenantFromLead`'s lead-level check, which is exactly the part
   shown above to be non-atomic.

## What actually happens if two calls race

- **If the lead has a `territory_id`/`category_id`:** the second call's `territory_claims` insert hits the
  real unique constraint (`territory_id, category_id`) and returns Postgres error `23505`. The existing
  handling (`create-tenant-from-lead.ts:109-120`) checks whether the reservation's `tenant_id IS NULL` to
  decide whether to reclaim it — but by the time the second call reaches this check, the *first* call may
  have already attached its own tenant to that same claim row (line 175-179 runs later in the first call's
  own execution, so there is a **further, narrower race** between "claim exists but not yet attached" and
  "claim attached"). Best case here: the second call's claim insert 23505s, finds `tenant_id` already set
  (not null), and correctly returns `{ ok: false, error: 'Territory already claimed...' }` → the webhook
  handler 500s → Stripe retries → the retry now sees `converted_tenant_id` set and returns the correct
  existing tenant. Self-healing, but only because the territory constraint happens to catch it — not
  because the lead-level dedupe caught it.
- **If the lead has no `territory_id`/`category_id`** (`if (lead.territory_id && lead.category_id)` at
  line 89 — the block is skipped entirely when either is null): **there is no unique constraint anywhere
  in the remaining path.** Both calls sail through slug generation (each independently finds an unused
  slug, since the collision-check-then-insert at lines 130-136 is itself the same check-then-act pattern
  one level down), both insert a `tenants` row, both attempt `provisionTenant`/`seedOnboardingTasks`
  (best-effort, swallow errors — so no signal either way), and **both eventually run the
  `partner_requests` update** at line 213 — the second write simply overwrites the first's
  `converted_tenant_id` with its own tenant's id. **Result: two live tenants created from one paid lead,**
  one of them orphaned (not referenced by `partner_requests` after the last write wins), and — since
  `stripeSubscriptionId` is threaded into both — **two tenants both carrying billing_status:'active' and
  a `stripe_subscription_id`**, one of which is never linked back to the lead that paid for it.

## Why this wasn't caught by the existing per-route idempotency table

`webhook-idempotency-audit.md`'s table (`:13-14`) marks `stripe-platform` "✅ yes" on both dedup and
"per-branch" idempotency columns, based on `createTenantFromLead`'s doc-comment claim ("Idempotent: a lead
already converted returns its existing tenant") — a true statement about the *sequential* case, but the
audit's own #5 note already sensed the row might be too generous ("worth confirming... out of scope") and
was right to flag it. This doc is the confirmation that follow-up asked for, and the answer is narrower
than the table's "✅ yes" suggests.

## Proposed fix (not applied — file-only per lane rules)

Match the pattern already used for the territory-claim race in the same function (line 89-126): claim
atomically via a unique constraint + `23505` handling, instead of read-then-write.

```sql
-- Addendum, prepared as a file only — NOT run. Adds the same kind of atomic-claim
-- guard this function already uses for territory_claims, applied to conversion itself.
-- Safe/additive: does not change any existing column, only adds a constraint.
ALTER TABLE partner_requests
  ADD CONSTRAINT partner_requests_converted_tenant_unique UNIQUE (id, converted_tenant_id);
-- Note: this alone does NOT close the gap (two NULLs don't conflict under a standard
-- UNIQUE constraint — NULL is never equal to NULL in Postgres). The real fix needs an
-- atomic claim on `id` conditioned on "not yet converted", e.g. a conditional UPDATE:
--   UPDATE partner_requests SET converted_tenant_id = <placeholder-or-real-id>
--   WHERE id = <lead_id> AND converted_tenant_id IS NULL
--   RETURNING id;
-- run BEFORE any tenant-creation side effects, checking rowcount=1 as the atomic claim,
-- rather than the current SELECT-then-much-later-UPDATE shape. That is a control-flow
-- change inside createTenantFromLead, not a pure-SQL addendum — flagging the exact
-- change needed rather than pseudocoding a partial fix that looks safe but isn't:
```

**Recommended shape (code-level, not authored/applied here):** move a conditional claim UPDATE
(`WHERE converted_tenant_id IS NULL`, checking `rowCount === 1`) to the very top of
`createTenantFromLead`, before the territory-claim block, so the *first* thing that happens is an atomic
"is this lead unclaimed — and if so, mine now" — matching the same atomicity principle the function's own
comment already applies to territory reservation ("Lock the contended resource... BEFORE creating the
tenant"), just not yet applied to the lead itself. Left as a recommendation, not a diff, because it
requires restructuring the function's early-return/rollback flow (what happens if provisioning fails after
the claim succeeds needs the same "release on failure" handling the territory block already has) — a
real code change belongs with whoever owns `create-tenant-from-lead.ts`'s next revision, not spliced in
via this docs-only pass.

## Severity / likelihood framing (honest, not oversold)

- **Trigger requires:** two `checkout.session.completed` events for the *same* `lead_id` processed with
  overlapping in-flight windows — either a genuine Stripe near-duplicate delivery, or a customer
  double-submitting checkout for the same proposal in a way that produces two sessions with the same
  `metadata.lead_id` (not verified here whether the checkout-creation path can even produce that;
  out of scope for a webhook-route audit, same boundary #5 already drew).
- **Not a currently-observed incident** — this is a code-level race analysis, not a report of a real
  double-tenant sighting. Flagging as a real, concrete, but probability-dependent gap, consistent with how
  `webhook-idempotency-audit.md` already frames its other findings (e.g. its own #1 finding is the same
  "real but needs the right timing" class).
- **Blast radius if it fires:** a duplicated paid tenant with live billing — a Wave-2/Wave-4-adjacent
  financial-integrity issue, same family as the ledger TOCTOU concerns already named in the wave plan,
  not a security/access-control bug.

**Not applied. No route file, no migration, no function body touched by this doc.**
