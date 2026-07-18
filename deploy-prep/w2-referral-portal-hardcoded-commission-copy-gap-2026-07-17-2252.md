# W2 gap/fluidity refresh — 2026-07-17 22:52

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-referrer-commission-rate-settings-dead-bug-2026-07-17-2244.md`.

Leader's instruction this round (22:48 LEADER->W2): fresh 3-deep queue -- (1) new fresh-ground surface, (2) continue whichever surface (1) opens up, (3) keep gap/fluidity current.

## (1) — new fresh-ground surface, opened directly by the last round's fix: referrer-facing portal copy hardcoded "10%" regardless of the tenant's actual configured rate

Last round (`80e32882`) fixed `POST /api/referrers` so new referrer signups pick up the tenant's actually-configured `commission_rate` instead of a hardcoded 10% -- meaning referrers now genuinely earn different rates per tenant. That fix immediately exposes a dormant bug in the customer-facing referrer portal: **6 files** (the shared `/site/template/referral/page.tsx` plus its 5 tenant clones -- `site/referral/page.tsx`, `site/nycmaid/referral/page.tsx`, `site/wash-and-fold-hoboken/(app)/referral/page.tsx`, `site/wash-and-fold-nyc/(app)/referral/page.tsx`, `site/the-florida-maid/referral/page.tsx`) all fetch `data.referrer.commission_rate` from `GET /api/referrers/[code]` (which correctly returns the fraction-to-percent-converted real rate) into component state, but the "Share this link" caption **never reads that state** -- it hardcodes the literal string `You earn 10% of every cleaning!` in all 6 files identically (byte-identical clones).

**Concrete impact:** before last round's fix this was accidentally true (every referrer really was hardcoded to 10%). After the fix, any tenant who configures a non-default rate (5%, 15%, 20%, whatever) now has real referrers earning that rate per the ledger, while the portal they log into tells them "You earn 10%" -- a customer-facing, revenue-adjacent inaccuracy that can generate support disputes ("the app said 10%, why did I only get paid for 6%?" or the reverse). Not a resolver-precedence bug (no tenant_domains/tenants.domain involved) -- a real display-correctness bug in the same commission-rate feature, directly downstream of the previous fix.

Confirmed genuinely fresh: grepped `deploy-prep/*.md` for "You earn 10%" / "site/template/referral" / "site/referral/page" before starting -- the only hit was `cross-tenant-leak-register.md`'s unrelated note about a since-closed unauthenticated-endpoint vulnerability on the same file, not this copy bug. The top-level `/referral/[code]/page.tsx` portal (a 7th, non-cloned surface) was already checked and confirmed correct in the prior fresh-ground round -- it renders `{referrer.commission_rate}%` from real state, not a hardcoded string, so it was excluded from this fix.

**Fixed:** all 6 files, one-line copy swap each: `You earn 10% of every cleaning!` -> `You earn {referrer?.commission_rate ?? 10}% of every cleaning!`. The `?? 10` fallback matches the same tenant-never-configured-a-rate default `settings.ts`/`dashboard/referrals` already use, and covers the brief render window before `referrer` state populates.

Tests: added 1 new case per existing test file (`site/referral/page.test.tsx`, `site/template/referral/page.test.tsx` -- the only 2 of the 6 clones with test coverage; the other 4 rely on the same shared-clone test-coverage precedent documented in `page.test.tsx`'s own file-header comment). Each new test mocks a non-default rate (15% and 20% respectively, deliberately not the 10% default) and asserts the real rate renders while the literal "10%" string does not -- this is the wrong-tenant-probe-equivalent for this bug class: it would have failed against the pre-fix hardcoded string for any tenant not on the default rate.

## (2) — continuation

Nothing further opened up: the top-level `/referral/[code]/page.tsx` portal was already correct (checked, not touched), and there's no other consumer of `commission_rate` display left unaudited -- `dashboard/settings/page.tsx` and `dashboard/referrals/page.tsx` (the tenant-admin-facing config UI, not referrer-facing) were already covered in the prior round's investigation.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.
6. Existing referrers' `commission_rate` rows are stuck at whatever was hardcoded/configured at their own signup time — still no PUT/PATCH on `/api/referrers`/`/api/referrers/[code]` to edit an individual referrer's rate after the fact, and no backfill of pre-fix hardcoded-10% rows. Product/business decision, not acted on.

NEW this round: none — nothing found to defer; the fix in (1) was small enough to close outright.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
7. `dashboard/referrals/page.tsx`'s referrals-tab copy ("Set commission rates in Settings > Referrals & Policies") still overpromises per-referrer control that doesn't exist (single tenant-wide default applied only at signup moment). Not changed — copy-only UX call, flagging rather than acting.

Verification: `npx vitest run src/app/site/referral/page.test.tsx src/app/site/template/referral/page.test.tsx` (8/8 pass, incl. 2 new), `npx tsc --noEmit` clean, `npx eslint` on all 8 touched files (0 new warnings — pre-existing unused-eslint-disable/unused-import warnings on unrelated lines, confirmed via `git diff --stat` showing only the 1-line copy change per page file). **Not re-run:** full repo test suite (targeted suites only, per cost-aware scope). File-only, no push/deploy/DB.
