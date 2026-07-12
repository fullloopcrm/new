# Mass-Assignment Guard Spec — 4 remaining `.update(body)` sites [NOT APPLIED]

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Status:** SPEC ONLY. No route files edited. Ranked next item from W6's guard-spec queue
(after `webhook-auth-throttle-guard-spec.md`, `telnyx-sms-verify-killswitch-guard-spec.md`,
`telegram-tenant-webhook-auth-guard-spec.md`). Flagging per standing rule (no route edits without
flag) — this is that flag.

**Finding origin:** `deploy-prep/input-validation-coverage-audit.md` GAP 3, tracked open in
`deploy-prep/security-test-inventory.md` row G5. `reviews/[id]` (the 5th site) is already
witnessed (`src/app/api/reviews/input-validation.witness.test.ts`) and NOT re-specced here.

---

## 1. The vulnerability class

All 4 sites authenticate and permission-check correctly, and scope the `WHERE` clause to the
caller's tenant — **this is not a cross-tenant read/write hole.** The bug is narrower but still
real: the `SET` clause is the **raw, unfiltered request body**, so any key the caller sends is
written to the row, including columns the API was never meant to expose:

```ts
const body = await request.json()          // ⚠️ raw, attacker-controlled
await supabaseAdmin.from(TABLE)
  .update(body)                             // ❌ unbounded SET — every key in body lands in Postgres
  .eq('id', id).eq('tenant_id', tenantId)   // ✅ WHERE is correctly tenant-scoped
```

A caller who can reach the PUT (i.e. already has valid tenant/admin credentials for *some*
purpose on that endpoint) can additionally set:
- **`tenant_id`** on the row → reassigns that row to a different tenant (the row disappears from
  the caller's own tenant view and appears under the attacker-chosen tenant — an integrity/
  data-corruption primitive, not a read-disclosure one).
- **`id`** → row-id collision/overwrite behavior is DB-dependent, not verified here.
- Any internal/system column on the table (timestamps, internal flags, computed fields) that the
  UI never intended to let the client set.

## 2. Ranked sites (severity = blast radius of an unbounded `SET`, not likelihood — all require
valid auth to reach)

| # | Route | Table | Auth | Severity | Why |
|---|---|---|---|---|---|
| 1 | `api/finance/expenses/[id]/route.ts:22` PUT | `expenses` | `requirePermission('finance.expenses')` | **MEDIUM-HIGH** | Money table. Body already has ad-hoc special-casing (`body.amount` cents conversion at line 18) proving the route author touches `body` directly — one more field (`tenant_id`, `approved`, `paid_at`) rides along un-whitelisted. |
| 2 | `api/schedules/[id]/route.ts:53` PUT | `recurring_schedules` | `getTenantForRequest()` | MEDIUM | Drives real bookings (GET on this route joins `bookings`); a reassigned/corrupted schedule row has downstream scheduling impact. |
| 3 | `api/referrals/[id]/route.ts:19` PUT | `referrals` | `requirePermission('referrals.payout')` | MEDIUM | Payout-adjacent (permission name says so) — reassignment or field tampering on a referral record is a financial-adjacent integrity risk, though the route itself doesn't move money directly. |
| 4 | `api/admin/announcements/[id]/route.ts:17` PUT | `platform_announcements` | `requireAdmin()` (global super-admin only) | LOW | Already gated to super-admin (not tenant-scoped at all — no `tenant_id` column touched in this query), so the mass-assignment surface is same-privilege-tier self-harm, not a privilege escalation. Fix for consistency, not urgency. |

## 3. Fix (not applied) — same shape as the existing `pick()` helper, no new dependency

`src/lib/validate.ts` already exports `pick<T>(body, fields)` — used nowhere yet for these 4.
Minimal diff per site: replace `.update(body)` with `.update(pick(body, [...allowed]))`.

```ts
// expenses/[id] PUT — proposed
import { pick } from '@/lib/validate'
const body = await request.json()
if (body.amount) body.amount = Math.round(Number(body.amount) * 100)
const patch = pick(body, ['description', 'amount', 'category', 'expense_date', 'receipt_url', 'notes'])
// ^ exact field list needs confirming against the expenses table schema — placeholder names above
await supabaseAdmin.from('expenses').update(patch).eq('id', id).eq('tenant_id', tenantId)...
```

Same pattern for `referrals` (whitelist payout-adjustable fields, exclude `tenant_id`/`id`/
`created_at`), `recurring_schedules` (exclude `tenant_id`/`id`, keep schedule-editable fields),
`platform_announcements` (exclude `id`; `tenant_id` N/A — table is global).

**Why not applied now:** the exact allowed-field list per table needs a schema read + a decision
on which fields the client is *supposed* to be able to edit (I have not enumerated each table's
full column set here — that is the one remaining step before a safe patch, not a blocker to
specifying the mechanism). This is also a **route edit**, gated per this queue's standing rule
("no route edits without flagging me first") — hence spec, not patch.

## 4. Verification plan once applied

1. Add a witness test per site (pattern below, already added for the #1-ranked site as a starting
   point — see §5) asserting the *current* raw-forward behavior, expected to flip red when the
   whitelist lands.
2. `tsc --noEmit` + `vitest` green.
3. Manual/staging check: existing legitimate edit flows for expenses, schedules, referrals,
   announcements still succeed with the new whitelist (i.e. the allowed-field list wasn't drawn
   too narrow and doesn't silently drop a field the real UI sends).

## 5. What WAS added this pass (test-only, no route touched)

`src/app/api/finance/expenses/finance-expenses-mass-assignment.witness.test.ts` — witnesses the
**highest-ranked** (#1, money-table) site today: drives the real `PUT` handler against a
recording Supabase stub and asserts `tenant_id`/an internal flag forwarded in the body reach the
`.update()` payload verbatim. Green today = gap present (armed); flips red the moment the route
whitelists the body. Mirrors the existing `reviews/input-validation.witness.test.ts` shape.
Referrals/schedules/announcements witnesses are not yet added — same recipe, flagged here as the
next incremental step rather than added speculatively for tables not yet schema-confirmed.

---

**Nothing in this spec was applied. No route files (`expenses`, `referrals`, `schedules`,
`announcements` `route.ts`) were modified — only a new test file was added.**
