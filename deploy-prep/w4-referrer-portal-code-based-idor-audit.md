# Referrer Portal — Unauthenticated PII/Financial Disclosure via Public Referral Code

Found during LEADER 20:30 broad-hunt order ("referral-portal auth edge cases").
File-only, no fixes applied — findings only, per standing rules; this is a
design-level tradeoff that needs a leader/Jeff call, not a unilateral patch.

## Summary

`GET /api/referrers?code=<referral_code>` and `GET /api/referral-commissions
?referrer_id=<id>` are **fully unauthenticated** and, chained together,
disclose a referrer's name, email, lifetime earnings, payout preference, and
full commission history (client names + per-booking dollar amounts) to
**anyone who knows their referral code** — and the referral code is not a
secret. It's the exact value embedded in the referrer's own public
marketing link (`https://<tenant>/book/new?ref=<code>`), which the program
explicitly asks referrers to share widely (social media, texts, flyers).

This is distinct from — and was missed by — the existing IDOR audits
(`idor-scan-note.md`, `idor-remediation-status.md`), which only looked at
`/api/referrers/[code]` (the dynamic-segment route). That route **is**
properly gated (`getReferrerAuth` + HMAC session token from the OTP flow —
`src/lib/referrer-portal-auth.ts`, `src/app/api/referrers/auth/{request,verify}`).
The vulnerable route is the sibling collection route `/api/referrers`
(`src/app/api/referrers/route.ts`), which is a **separate, legacy,
unauthenticated lookup path** still wired to six live tenant frontend pages.
`route-auth-matrix.md` line "`/api/referrers` | tenant-scoped(RBAC)" is
**incorrect** — that only describes the POST (signup) path; the GET handler
has no RBAC/session check at all.

## Reproduction

1. Obtain any referrer's public code (trivial — it's the `?ref=` value on
   their share link, which is designed to be distributed).
2. `GET https://www.thenycmaid.com/api/referrers?code=<CODE>` (or any tenant
   custom domain — middleware rewrites straight to the tenant site with zero
   Clerk/session gate, confirmed via `src/middleware.ts` custom-domain
   branch, lines ~248-269).
   → Returns `{ id, name, email, referral_code, ref_code, total_earned,
     total_paid, preferred_payout, created_at }` — no token required.
3. `GET https://www.thenycmaid.com/api/referral-commissions?referrer_id=<id
   from step 2>`
   → Returns the referrer's full commission ledger: `client_name`,
   `commission_amount`/`commission_cents`, `status`, `paid_via`,
   `created_at` for every referred booking — again, no token required.

Both endpoints are called exactly this way, client-side, by the live
frontend (`src/app/site/referral/page.tsx:32,38` and identical code in
`nycmaid/referral`, `wash-and-fold-nyc/(app)/referral`,
`wash-and-fold-hoboken/(app)/referral`, `the-florida-maid/referral`,
`template/referral` — all six confirmed via grep).

## Why this is real (not theoretical)

- The `code` param takes `referral_code`, the **same string** returned as
  the referrer's own share link (`/api/referrers/[code]/route.ts:52`:
  `shareUrl = ${base}/book/new?ref=${code}`). It is designed to leave the
  referrer's control.
- No rate limit prevents scripted enumeration of short referral codes
  (`generateRefCode()` in `route.ts:21-25` produces a 4-letter name-prefix +
  3-digit suffix — e.g. `REXA123` — well within brute-force range at the
  existing 10-req/10-min-per-IP cap, and codes aren't the bottleneck anyway
  since a legitimate holder's own code is often just handed out).
- `email`-based lookup (`GET /api/referrers?email=`) has the same shape but
  is a smaller practical risk since it requires already knowing the
  referrer's private email address.

## Why this wasn't already caught

`idor-scan-note.md` and `idor-remediation-status.md` both list `referrers/
[code]` under "Public / auth-establishment flows... classified by auth type
and key provenance, **not exhaustively line-audited**" and stop there. That
entry is actually correct for the `[code]` dynamic route (it IS a legitimate
public/token-issuing flow), but the audits never separately looked at the
`/api/referrers` collection route or `/api/referral-commissions`'s
`referrer_id`-query unauthenticated branch — both are different files with
no token check at all, not just "public by design."

## Remediation options (not applying any — needs a product/security call)

This is a genuine legacy-vs-new-auth-flow conflict, not a one-line fix:

1. **Migrate the 6 legacy referral pages to the OTP flow** (`/api/referrers/
   auth/request` + `/verify` + `/api/referrers/[code]`, which is already
   built and secure). Correct long-term fix; breaking UX change for anyone
   with the page bookmarked without an OTP step — needs frontend work across
   6 files plus copy/UX for the OTP prompt.
2. **Strip sensitive fields from the code/email-based `GET /api/referrers`
   response** (drop `email`, `total_earned`, `total_paid`,
   `preferred_payout`; keep `name`, `referral_code` for display) and require
   the OTP token for `/api/referral-commissions?referrer_id=`. Smaller diff,
   but breaks the existing dashboard (no dollar amounts) unless paired with
   #1.
3. **Accept as known risk for now**, document prominently, revisit at the
   next referrer-portal touch. Not recommended given this exposes real PII
   (email) and financial data (client names + commission amounts) for real,
   currently-active tenants (nycmaid, wash-and-fold-nyc/hoboken,
   the-florida-maid).

Recommend leader/Jeff pick between #1 and #3 given blast radius (6 live
tenant frontends, real user-facing behavior change) is outside a single
worker's unilateral-fix scope.

## Sales-routing module

No module literally named "sales-routing" exists in this worktree (checked
via `find`/`grep`). Closest concepts — `/api/territories/options` (public,
read-only, no PII), `/api/admin/territories` (properly gated by
`requireAdmin()`, claim/release with conflict-safe upsert), `/api/prospects`
(public intake, rate-limited, input-capped, no sensitive read path) — were
checked and found clean. No findings there.
