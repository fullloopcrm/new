# W2 gap/fluidity refresh — 2026-07-18 01:14

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-slug-resolver-twins-case-and-masked-error-gap-2026-07-18-0058.md`.

Leader's instruction this round (01:04 LEADER->W2): fresh 3-deep queue -- (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: Telnyx inbound-SMS tenant-by-phone resolver discarded its DB error

**Bug found:** `src/app/api/webhooks/telnyx/route.ts`'s inbound-SMS handler resolves which tenant owns the number Telnyx just delivered to via
`.from('tenants').select(...).or('telnyx_phone.eq.<to>,sms_number.eq.<to>').order('id').limit(2)` — and only destructured `data`, never `error`. This is the exact masked-error class fixed across `tenant.ts`/`tenant-lookup.ts`/`tenant-query.ts`/`domains.ts`/`tenant-site.ts` and the 6 slug-resolver-twins earlier this session, just never applied to this phone-number resolver (which predates all of that hardening and was only ever touched once since, for the `sms_number` fallback fix, without adding the error check).

Consequence: a genuine DB failure on this query looked identical to "no tenant owns this number" and fell straight into `if (!tenant) return { received: true }` — every inbound text for the length of the outage (STOP/START TCPA compliance replies, booking confirmations, the Selena AI conversation, owner replies) silently vanished with **zero error logged and a 200 response**, so Telnyx's own delivery-retry policy never got a chance to redeliver once the DB recovered. The STOP/START angle is the sharpest edge — a masked failure on a STOP reply means the platform keeps texting someone who legally opted out, with no record anything went wrong.

**Fixed:** check `error` explicitly and `throw` (uncaught → Next.js 500 → Stripe/Telnyx's own retry semantics apply) instead of discarding it. Same pattern as every other resolver fix this session.

## (2) — continued: same masked-error class in the Stripe billing webhook

Swept for siblings of the same "resolve tenant from an external identifier, discard the error" shape. Found two in `src/app/api/webhooks/stripe/route.ts`, both resolving the tenant via `.eq('owner_email', customerEmail).maybeSingle()` with `error` discarded:

1. `invoice.paid` — monthly subscription renewal succeeded. A masked DB failure here silently skips flipping `billing_status` back to `active` on a real successful payment.
2. `invoice.payment_failed` — subscription payment failed. A masked DB failure here silently skips flipping `billing_status` to `past_due` AND skips the admin dunning-alert email on a real failed payment.

Both fixed with the same explicit-error-check-then-throw pattern.

**Considered, not touched:**
- `src/lib/nycmaid/sms.ts`'s own `telnyx_phone`/`sms_number` lookup (auto-opt-out-on-STOP-block, no `recipientId` branch) has the identical shape but is already wrapped in its own try/catch and is explicitly documented as best-effort ("if we can't resolve the sending tenant, do nothing rather than write across tenants") — it silences our own retry-noise suppression, not a customer-facing delivery. Different risk profile from the primary telnyx resolver (which silently drops the customer's actual message); left as-is rather than escalating a deliberately-best-effort path to a hard failure.
- `customer.subscription.deleted` in the same Stripe webhook does a direct `.update(...).eq('owner_email', email)` with no separate find-tenant step — different code shape (no `tenant` lookup to add an error check to; the update's own discarded error is a broader "no webhook write is error-checked" pattern across the file, out of scope for a tenant-*resolution* pass). Flagging, not acting.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.
6. Existing referrers' `commission_rate` rows stuck at signup-time value; no PUT/PATCH to edit post-signup. Product/business decision, not acted on.
7. `tenant_domains_single_primary` DB migration (partial unique index) — prepared as a file, not yet run. Gated on Jeff's approval.
8. `src/lib/lead-filters.ts` — ~90% dead code; 3 bespoke tenant clones each hardcode their own `OWNED_HOSTS`. Open product/architecture question, not acted on.
9. `tenants.domain` still has no DB-level unique constraint. Flagged as a DB migration candidate, not acting — gated on Jeff's approval.
10. `cron/tenant-health/route.ts`'s tie-break among 2+ non-primary active `tenant_domains` rows (none flagged `is_primary`) is non-deterministic — low value, flagged not acted on.

NEW this round:
11. `src/lib/nycmaid/sms.ts`'s best-effort auto-opt-out tenant-by-phone lookup (see above) — same masked-error shape as the primary telnyx resolver but deliberately best-effort/non-critical. Not escalating without a product call on whether silent-skip is actually the intended failure mode there. Flagging, not acting.
12. Stripe webhook's `customer.subscription.deleted` branch (and generally, `.update()` calls throughout `webhooks/stripe/route.ts`) don't check the write's own returned `error` — broader than tenant *resolution*, would be its own pass over write-error-checking across the whole webhook file. Flagging, not acting this round.
13. Also noticed while in `webhooks/stripe/route.ts`: `invoice.paid`/`invoice.payment_failed` resolve by `owner_email` with `.maybeSingle()`, which will throw (now loud, previously silent) if two tenants ever share an `owner_email` — there's no DB-level unique constraint on that column either. Same class as `tenants.domain`'s missing constraint (#9). Not acting — a genuine duplicate-email collision is an existing data-integrity question, not something this round's error-surfacing fix should paper over with a silent pick-first.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
14. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- Fixed 3 tenant-resolution call sites across 2 files: `webhooks/telnyx/route.ts` (inbound-SMS tenant-by-phone lookup), `webhooks/stripe/route.ts` (`invoice.paid` + `invoice.payment_failed` tenant-by-owner_email lookups).
- 2 new test files: `webhooks/telnyx/route.tenant-lookup-error.test.ts`, `webhooks/stripe/route.invoice-tenant-lookup-error.test.ts` — each proves a genuine DB failure on the tenant-resolution query now throws (surfaces loud) instead of the old silent `{received: true}` / no-op `break`.
- Full repo suite: 691 files, 2966 passed, 37 skipped, 0 failed. (One `finance-export.test.ts` timeout on an earlier run under full parallel load was confirmed flaky/unrelated — passed in isolation and on rerun; not caused by this round's changes, not in a file this round touched.)

File-only, no push/deploy/DB write from this worker. 2 code commits this round (2 route fixes + 2 new test files, split across 2 commits matching the 2 files touched) + 1 docs commit (this file).
