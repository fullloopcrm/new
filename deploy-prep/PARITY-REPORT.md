# NYC Maid → FullLoop Parity Report

Source of truth (READ-ONLY, never modified): `~/Desktop/nycmaid` (repo thenycmaid/nycmaid @ `15837e3`).
Target: this FL platform, nycmaid tenant = `00000000-0000-0000-0000-000000000001` (`isNycMaid()` gate).
References: `~/Desktop/nycmaid-cutover-CHECKLIST.md` (2026-07-07), `~/Desktop/nycmaid-cutover-plan-2026-07-07.md`.

---

## W4 — LANE: FUNNEL + PORTAL + PAYMENT e2e

Scope: self-book create→confirm→pay, collect/payment-link page, referral +
referrer portal, push notifications, waitlist/$10 path, money-engine
($35-floor edge at `admin/payments/finalize-match`, naive-date `check_in_time`
bug parity with nycmaid `64cba3c`). Closes CHECKLIST §K (client/crew
touchpoints) items still `⬜` as of 2026-07-07, and the plan doc's §5
"money engine" open edge.

### ✅ MATCH

- **`api/client/confirm/[token]`** — faithful, tenant-scoped (already converted
  to `tenantDb()`; trade-neutral copy is an intentional, not a drift). nycmaid:
  `src/app/api/client/confirm/[token]/route.ts` ↔ FL: same path.
- **`api/client/collect`** — faithful, tenant-scoped via `tenantDb()`. The
  legacy rule-based SMS-chatbot completion branch (nycmaid lines ~180-300,
  placeholder-booking creation from a completed Yinez conversation) is
  intentionally NOT ported 1:1 — FL hands that off to the Selena agent instead
  of a hardcoded state machine. Architectural evolution, not a gap.
- **`api/push/subscribe`** (`lib/nycmaid/push.ts`) — line-for-line port of
  `~/Desktop/nycmaid/src/lib/push.ts`, plus real auth (`getCurrentTenant()`)
  nycmaid's version lacked. `api/push/subscribe/route.ts` (FL) vs
  `api/push/subscribe/route.ts` (nycmaid): tenant-scoped insert/update, same
  role/endpoint upsert logic.
- **`api/waitlist`** (GET admin panel + POST public lead capture) — 1:1
  tenant-scoped port of `~/Desktop/nycmaid/src/app/api/waitlist/route.ts`,
  including the dual-source union (dedicated `waitlist` table + legacy
  `sms_conversations` outcome='waitlisted') and the graceful-degrade-to-SMS
  fallback if the table isn't migrated.
- **`api/team-portal/15min-alert`** (nycmaid: `api/team/30min-alert`) —
  faithful port of the actual-hours math, `$10` self-booking discount, and
  Stripe-pay-link SMS (nycmaid's hardcoded `buy.stripe.com` link → FL's
  `tenant.payment_link`), PLUS real authz nycmaid's route lacked
  (unauthenticated → `requirePortalPermission` + cross-tenant/ownership checks).
  Was previously **untested** for the discount/pay-link substitution
  specifically (CHECKLIST §K: "Client `collect`/payment-link page works" +
  "Waitlist/self-book $10 path", both `⬜`) — closed with
  `payment-link-and-discount.test.ts` (4 tests, green).
- **Money engine — `$35` NJ/Long Island/Westchester floor + naive-date
  `check_in_time` bug** (plan doc §5, "one edge path exposed": `processPayment()`
  didn't self-apply the floor, exposing `admin/payments/finalize-match`) —
  **already fixed** in commit `10546d92` (`fix(nycmaid): bill actual hours +
  $35 floor in processPayment`), landed to `main` pre-cutover per the
  CHECKLIST's "CUTOVER LIVE STATE" note. `finalize-match/route.ts` calls
  `processPayment()` directly so it inherits both fixes for free. This was
  the one item in the CHECKLIST/plan-doc that had **zero test coverage** —
  closed with `payment-processor.money-engine.test.ts` (3 tests: floor applies
  for NYC Maid + NJ address, does NOT apply for a non-NYC-Maid tenant, and the
  finalize-match "no team_member_pay preset" edge case specifically).

### ⚠️ DRIFT (real bug, fixed this pass)

- **`api/client/book` time-slot parsing** — `client/book/route.ts:158-166`
  (before this pass) parsed `time` via a fixed lookup map covering only
  9am–4pm. nycmaid's own standalone build hit and fixed this exact bug
  (`src/app/api/client/book/route.ts`, comment: "the old fixed lookup map only
  covered 9am–4pm... silently fell back to 9am") with a permissive `H:MM
  AM/PM` regex parser — but FL never picked up that fix. The NYC Maid booking
  form (`site/nycmaid/book/new/page.tsx TIME_SLOTS`) offers `8:00 AM`, which
  isn't in the map, so any client picking 8:00 AM was **silently booked for
  9:00 AM** with no error surfaced. Not tenant-gated (shared code) — the fix
  benefits every tenant's booking form. **Fixed**: ported nycmaid's regex
  parser verbatim. Test: `route.time-slot-parsing.test.ts` (6 cases incl.
  8am/5pm/6pm + the still-correct 9am fallback for genuinely unparseable
  input).
- **`api/referrers` (shared) — `ref_code` never written or selected** —
  Every tenant's own `/referral` portal page (`site/nycmaid/referral`,
  `site/template/referral`, `site/the-florida-maid/referral` — reachable on
  custom tenant domains via the middleware's `/referral(.*)` → `rewriteToSite`
  rule) reads `referrer.ref_code` for the displayed code, the copy-link URL,
  and the `/api/referrers?code=` re-fetch. But `POST /api/referrers` only
  wrote `referral_code` (the newer OTP-portal column), and `GET` never
  selected `ref_code` back out — so **every referrer's own portal page shows
  `undefined` as their code and generates a `?ref=undefined` link**,
  regardless of whether they're one of the 14 migrated nycmaid referrers
  (whose DB `ref_code` the sync script *does* populate correctly — the bug is
  the API never returns it) or a brand-new signup (whose `ref_code` column is
  never written at all, so `client/book`'s attribution lookup — which matches
  on `ref_code` — can never find them either). Also: `zelle_email` /
  `apple_cash_phone`, collected by the signup form and destructured in the
  route, were silently dropped from the insert (nycmaid's original route
  stores them — `~/Desktop/nycmaid/src/app/api/referrers/route.ts`), so a
  referrer's payout destination was never actually saved. **Fixed**: `GET`
  selects now include `ref_code`; `POST` insert now sets `ref_code` (kept
  equal to `referral_code`), `zelle_email`, `apple_cash_phone`, and fires an
  admin `notify()` on signup (nycmaid notifies+SMS's admin; FL had neither).
  Test: `route.ref-code-sync.test.ts` (4 tests).

### 🚩 FLAG — intentional drifts (per LEADER order, NOT auto-reverted; Jeff decides)

- **Review-flow $25 selfie-video offer** — nycmaid's live rating flow re-bills
  after a 1-5 reply (4-5 → review-offer incl. $25 video option; 1-3 → $25
  apology → feedback → bill). FL's `lib/nycmaid/review-engine.ts` captures the
  rating but does not re-bill, and offers a flat $10 written credit only (no
  video option, different Google review link). Cutover plan §R2. Not touched.
- **`rateOf` fallback `79 → 69`** in `sms-cleaning.ts` / equivalent — CHECKLIST
  §C. Not touched.
- **Email copy drift** (`nycmaid/email-templates.ts` via client-email.ts):
  "Time" vs "arrival window" wording, rate 79 vs 69, different review link,
  `buy.stripe.com` direct pay-button removed → "link by text", $10 promo +
  recurring-discount rows removed. CHECKLIST §D. Not touched.

### Tally

| | Count |
|---|---|
| ✅ MATCH | 6 |
| ⚠️ DRIFT (fixed this pass) | 2 |
| ❌ MISSING | 0 |
| 🚩 FLAG (intentional, untouched) | 3 |

### Commits (this pass, p1-w4, all file-only — no push/deploy/DB)

1. `fix(client/book): port nycmaid's H:MM AM/PM regex time parser — fixed 9am-4pm map silently defaulted 8am/5pm/6pm slots to 9am` + `route.time-slot-parsing.test.ts`
2. `fix(referrers): sync ref_code with referral_code + persist payout destination (zelle_email/apple_cash_phone) + notify admin on signup` + `route.ref-code-sync.test.ts`
3. `test(payment-processor): lock in $35 NJ/LI/Westchester floor + naive-date check_in_time parsing in processPayment (finalize-match money-engine edge, already fixed in 10546d92, previously untested)`
4. `test(15min-alert): lock in payment_link substitution + $10 self-booking discount (checklist §K items, previously unexercised)`

`tsc --noEmit`: clean. Full `vitest run`: 710 passed / 3 expected-fail (pre-existing
RED, `edb7f600`, unrelated to this lane) / 4 skipped — no regressions.
