# W2 gap/fluidity refresh — 2026-07-17 22:44

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-fresh-ground-clean-sweep-plus-resolver-twin-reaudit-2026-07-17-2235.md`.

Leader's instruction this round (22:39 LEADER->W2): the tenant-domain-resolver-precedence lane is genuinely exhausted after ~15 real rounds (confirmed clean two rounds running). Pivot to a **different surface entirely** rather than re-auditing the same area — leader named invoicing/quotes, team-portal scheduling, or the referral/commission engine as candidates.

**Flagging up front:** two of the three suggested surfaces were not actually fresh — `deploy-prep/*.md` already has dedicated rounds on team-portal scheduling (`w2-team-portal-availability-field-wiring-*`, `w2-schedule-monitor-terminated-employee-gap-*`, several terminated-crew-guard rounds) and invoice/quote (`w2-invoice-quote-document-sendlink-domain-fallback-gap-*`, `w2-gdpr-purge-client-contacts-quotes-gap-*`). The referral/commission **engine's actual payout math** (as opposed to its domain-resolution surface, which `w2-tenant-public-loginlink-*` and the referrers/[code] primary-domain fix already covered) had not been looked at, so that's where this round went.

## (1) — new fresh-ground surface: tenant's "Set commission rate" setting never affected referrer payouts

Read `/api/referral-commissions` POST (creates a commission ledger row per booking) and traced where `commission_rate` actually comes from. Found **two unrelated fields sharing a confusing name**:

- `referrers.commission_rate` (numeric fraction, e.g. `0.10`) — the value `/api/referral-commissions` POST and `/api/team-portal/checkout` POST both read when calculating a payout (`Math.round(gross * rate)`).
- `tenants.commission_rate` (whole percent, e.g. `10`) — a per-tenant setting exposed in `dashboard/settings/page.tsx` and `dashboard/referrals/page.tsx`. The referrals-tab UI's own copy literally says **"Set commission rates in Settings > Referrals & Policies"** (line 169) right next to an editable field for it (line 182-183).

Grepped every write path to `referrers.commission_rate` (`from('referrers').insert(` / `.update(`) across `platform/src` — there is exactly one: `POST /api/referrers` (referrer signup), which hardcoded `commission_rate: 0.10` unconditionally. There is no PUT/PATCH on `/api/referrers` or `/api/referrers/[code]` at all, so an individual referrer's rate can never be edited post-signup either.

**Concrete impact:** the tenant-level setting the UI tells the admin to use is pure decoration. An admin who raises (or lowers, or zeroes out) their configured commission rate in Settings sees the new number reflected back in that same settings panel, but every referrer who ever signs up — before or after the change — earns a flat hardcoded 10%, forever. Since this is real money paid out via Zelle/Venmo/ACH (`referrers.preferred_payout`), a tenant who believes they've set e.g. 5% is actually paying double on every commission, with no error, no log, and no way to discover it short of reading this code.

**Fixed:** `POST /api/referrers` now derives `commission_rate` from `tenant.commission_rate` (already available on the `getTenantFromHeaders()` result via `select('*')`, no new query) — percent-to-fraction, clamped at 0. `null`/`undefined` (tenant never configured one) falls back to the same 10% default `settings.ts`/`dashboard/referrals` already use (`?? 10`) so behavior for tenants who never touched the setting is unchanged. An explicit `0` is honored rather than falsy-coalesced back to 10% — matching the `?? ` pattern already established in this codebase for exactly this hazard, not the `||` pattern the old commission-calc code still uses (`ref.commission_rate || 0.10` in `/api/referral-commissions` and `/api/team-portal/checkout` — left alone; both correctly read the now-correctly-populated per-referrer row, and "existing referrer explicitly set to 0%" isn't reachable yet since there's still no per-referrer edit path).

Scoped narrowly to the signup insert (not the payout calc) because `referrers.commission_rate` is a per-referrer locked-in-at-signup rate by design (a real affiliate agreement doesn't retroactively change if the tenant's default later moves) — existing referrers keep whatever they were signed up with; only new signups after this fix pick up the tenant's currently-configured rate. A backfill of already-signed-up referrers' hardcoded 10% rows would be a business decision (which existing agreements does the tenant actually want changed?), not a code-correctness fix, and is out of scope here — flagging it as a NOTICED item below rather than acting on it.

Tests: 4 new cases in `route.commission-rate.test.ts` — tenant-configured rate (15% -> 0.15), explicit 0% honored (not coalesced to 10%, the wrong-tenant-probe-equivalent for this bug class), null falls back to 10%, undefined falls back to 10%. All follow the file's existing `vi.mock` builder-chain convention (`route.rate-limit.test.ts`, `route.auth.test.ts`).

## (2) — continuation

Nothing further opened up from this fix — the payout-calc call sites (`/api/referral-commissions`, `/api/team-portal/checkout`) were confirmed correct as-is (see above), and there's no other `referrers.commission_rate` write path to chase.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.

NEW this round:
6. Existing referrers' `commission_rate` rows are stuck at whatever was hardcoded/configured at their own signup time — there's still no PUT/PATCH on `/api/referrers` or `/api/referrers/[code]` to edit an individual referrer's rate after the fact, and no backfill of the pre-fix hardcoded-10% rows. Both are product/business decisions (per-referrer rate edit UI; whether to retroactively change existing agreements), not something to act on unilaterally.

## MISSING-FEATURE GAPS / UX-FRICTION

7. `dashboard/referrals/page.tsx`'s referrals-tab copy ("Set commission rates in Settings > Referrals & Policies") is misleading in a second way even after this fix: it reads as "you can set per-referrer rates here," but the setting is actually a single tenant-wide default applied only at each new referrer's signup moment. Worth a copy tweak (e.g., "sets the default rate for new referrer signups") so the UI doesn't overpromise per-referrer control that doesn't exist. Not changed — copy-only UX call, flagging rather than acting.

Verification: `npx vitest run src/app/api/referrers/` (29/29 pass, incl. the 4 new), `npx vitest run src/app/api/referral-commissions/ src/app/api/team-portal/checkout/route.referrer-race.test.ts` (14/14 pass, confirms payout-calc call sites unaffected), `npx tsc --noEmit` clean, `npx eslint` on both touched files (0 new warnings — pre-existing 2 unused-var warnings on unrelated destructured fields, confirmed via diff not introduced by this change). **Not re-run:** the full repo test suite (targeted suites only, per cost-aware scope — no changes outside `src/app/api/referrers/`). File-only, no push/deploy/DB.
