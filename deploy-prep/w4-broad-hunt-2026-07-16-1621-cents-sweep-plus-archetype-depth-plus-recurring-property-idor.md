# W4 — 3-deep queue: cents-bug sweep (clean) + archetype depth (7th scenario) + fresh find (recurring-booking property IDOR, fixed)

## 1. Sweep for other price/cents-vs-dollars divide-by-100 anti-pattern instances — none found

Per leader's request to sweep beyond the 3 already-fixed instances (`sale-to-booking.ts`,
`sale-to-recurring.ts`, `quotes/[id]/convert/route.ts`) and the 3 previously-checked-clean
candidates (`tenants.monthly_rate`/`setup_fee`, and the settings/pipeline/HR dollar-string
form-default spots).

Method: grepped the whole `platform/src` tree for `/ *100` and `_cents` near
price/cents/total/amount fields, then manually classified every hit as either (a) legitimate
display formatting (`.toFixed()`, `.toLocaleString()`, form-default dollar strings — all have a
matching `* 100` on their corresponding save handler), or (b) a write path, which I traced to its
destination column.

Checked in detail (all confirmed clean — correct units, no bug):
- `client/recurring/route.ts:209` `price_per_visit: price / 100` — response-JSON display value only;
  the actual `bookings.price` insert two lines earlier correctly uses the un-divided cents `price`.
- `team-portal/checkout/route.ts:245-246` `client_total`/`earnings` — response-JSON only; the DB
  `.update({ team_member_pay, price })` at line 117-124 uses the cents values directly.
- `selena-legacy.ts:876` `last_rate` — JSON returned to the AI assistant tool call, not a DB write.
- Every other `_cents` field write across `api/deals`, `api/invoices`, `api/finance/*`,
  `api/team-portal/*`, `lib/jobs.ts`, `lib/payment-processor.ts`, `lib/bank-import.ts` etc. either
  passes an already-cents value straight through, or multiplies dollars by 100 (`priceCents()`
  helpers in `dashboard/schedules/import` and `import-staging.ts`, `finance/backfill/route.ts`,
  `client/book/route.ts`) — several of these now carry explicit `// price is already cents`
  comments (`finance/ar-aging`, `finance/reconcile-candidates`, `finance/pnl`), which reads as
  defensive documentation against exactly this bug class, likely added post-fix.
- Confirmed `sale-to-booking.ts` / `sale-to-recurring.ts` have no other `/100` occurrences left —
  the earlier fix was complete and consistent within each file.

No further instances of the real defect found. No code changed for this item.

## 2. Archetype depth — 7th scenario added to the shared sim harness

Continued `~/flwork-sim/platform/scripts/sim-archetype-scenarios.ts` (shared harness, per prior
redirect — separate repo, not this worktree). Added:

- **Junk Removal — full load that overflows the truck, return trip next day** (2-touch Job: initial
  pickup, then a return trip for the remainder). Every prior `multiTouch` scenario was dumpster or
  moving; junk removal had never been exercised as multi-touch. This is a realistic, common
  real-world case (estate cleanouts routinely overflow one truckload) and confirms the generalized
  `touches` primitive (from the last session's refactor) also holds for a 3rd archetype.

Verified via a throwaway standalone runner (same pattern as the prior session — not part of
`sim-all-trades.ts`, deleted after use): ran all 7 scenarios end-to-end against the live sim
Supabase project. **All 7 pass, 0 failures** (new scenario: 27/27 checks). `npx tsc --noEmit`
clean on the sim repo (no errors in `sim-archetype-scenarios.ts`).

One infra observation, not a product bug: after the run, one `sim-arch-%` tenant (from scenario 2,
an earlier scenario in the same run) was left behind despite the harness's own 4-attempt delete
retry in its `finally` block — each retry returned no error but didn't actually delete the row. A
manual delete of the same row, issued about a minute later, succeeded on the first try with no
code change. Read as transient (eventual-consistency/replica-lag on the delete path, not a
permanent defect — repeating the identical call shortly after worked). Cleaned up manually,
re-verified zero `sim-arch-%` rows remain. Not chasing further — this is sim-harness reliability,
not product code, and self-resolved.

### Investigated but NOT implemented: payroll `comp_type`/`pay_rate_cents` gap (item #2 of the
### earlier 12:55 feature-gap audit)

Re-verified this gap is still live: `hr_employee_profiles.comp_type`/`pay_rate_cents` (used for
per-job/flat comp — the natural pay model for dumpster/junk/moving labor) is read in exactly the
same 4 files as before (HR display/edit UI only) — confirmed via fresh grep, zero references in
`team-portal/checkout/route.ts` or `finance/payroll/route.ts`. `checkout/route.ts:100`
(`teamMemberPayCents = Math.round(billableCleaner * cleanerRate * 100)`) unconditionally pays by
elapsed-hours × the legacy `team_members.pay_rate`, regardless of what an operator configures in
HR. (Payroll's own GET route was already fixed for a *different*, narrower gap in an earlier
commit — `c6ed686d`, "payroll GET now honors flat per-job pay" — but that only fixed the *read*
side once `bookings.team_member_pay` is set; checkout, which *sets* that value, still never
consults comp_type.)

**Did not implement a fix.** Unlike the cents bug (an unambiguous, independently-verified
convention violated in 3 places), this one is genuinely ambiguous: migration
`053_hr_foundation.sql`'s own header comment states `team_members.pay_rate` "stay[s] as the
scheduling/job-costing rate" while HR's `pay_rate_cents` is explicitly framed as "the HR-of-record
rate + cadence" — read most naturally as *two deliberately separate systems* (compliance/reporting
vs. operational payroll), not one broken pipeline. The earlier audit itself classified this as a
feature gap for backlog triage ("Happy to pick any of 1-4 to actually implement on the next
order"), not an autonomous-fix bug, and this LEADER order didn't reference item #2 specifically.
Implementing a payroll-math change on a real-money code path on my own read of an ambiguous
design comment is exactly the kind of judgment call that needs sign-off, not a fresh-ground fix I
should make unilaterally. Flagging for an explicit next-order decision rather than guessing.

## 3. Fresh ground — recurring-booking `property_id` IDOR (fixed)

**Found and fixed**, same file family as the item-2 investigation. `api/client/recurring/route.ts`
(client-initiated recurring booking, session-authenticated via `protectClientAPI`) accepts a
caller-supplied `property_id` in the POST body and inserted it directly into both
`recurring_schedules.property_id` and every generated `bookings.property_id` **with zero
ownership validation** — no check that the property belongs to this client, or even to this
tenant.

This is the same file that *does* correctly validate `cleaner_id`/`extra_cleaner_ids` against
`tenantDb(tenantId).from('team_members')` a few lines above (with an explicit comment: "otherwise
a client could bind another tenant's cleaner to their schedule") — `property_id` got no equivalent
treatment. The sibling one-time-booking route (`client/book/route.ts`) avoids the class of bug
entirely by never accepting a client-supplied `property_id` at all — it resolves/creates the
property server-side from an address string via `resolveProperty(clientId, address, unit)`.

**Impact**: `lib/client-properties.ts`'s `bookingAddress()` / `applyPropertyToBookingClient()`
treat `client_properties` as the *authoritative* address source for a booking, taking priority
over `clients.address` — these are used across dispatch, admin, and team-portal check-in
navigation. An attacker-supplied `property_id` (any UUID, no ownership check) would:
- **Cross-tenant**: attach a *different tenant's* client's private address to this booking —
  breaks the platform's core tenant-isolation invariant and would send a dispatched crew to an
  unrelated address belonging to a completely different business's customer.
- **Cross-client (same tenant)**: attach *another client's* saved address to the attacker's own
  recurring schedule — staff dispatch/admin would show the wrong address for this job, and a crew
  would show up at a stranger's home expecting to perform a service that customer never requested.

**Fix**: added an ownership check mirroring the existing `cleaner_id` pattern in the same
function — when `property_id` is supplied, verify it resolves via
`tenantDb(tenantId).from('client_properties').eq('id', property_id).eq('client_id', client_id)`
(tenantDb's built-in tenant_id filter plus the explicit client_id match closes both the
cross-tenant and cross-client cases) before proceeding; reject with 400 if not found.

Verified: `npx tsc --noEmit` clean (same 3 pre-existing unrelated errors as before this session's
work, no new ones — confirmed by diffing the error list). Existing route tests
(`route.tenantdb.test.ts`, `route.booking-team-members-tenant-stamp.test.ts`, 4 tests) still pass.
Neither existing test exercises `property_id` directly (both omit it, the common case), so this
fix has no dedicated regression test yet — flagging as a gap rather than claiming full coverage.

## Files touched (this worktree)

- `platform/src/app/api/client/recurring/route.ts` — real fix, ownership check added (~15 lines).

## Files touched (shared sim harness, separate repo, not this worktree)

- `~/flwork-sim/platform/scripts/sim-archetype-scenarios.ts` — 7th scenario added.

## Scope note

Item 1: file-only, no code changed (nothing found to fix). Item 2: sim-harness-only change in the
separate `~/flwork-sim` repo, plus an investigation explicitly NOT acted on (flagged for leader
decision). Item 3: one real code fix in this worktree, no DB/migration involved — consistent with
"prepare DB scripts as files, no prod writes" since this is an application-code access-control fix,
not a schema change.
