# Legacy site-specific referral pages still call the un-gated PII-oracle endpoints

**Status:** found, NOT fixed (blast radius too large for an unattended broad-hunt pass — needs a dedicated frontend migration + browser verification, flagging for Jeff/leader triage).

## What's live on this branch (p1-w3)

This codebase already contains a **correct, secure** referrer-portal implementation:

- `src/app/referral/page.tsx` — email → 6-digit OTP (`POST /api/referrers/auth/request` → `POST /api/referrers/auth/verify`) → session token.
- `src/app/referral/[code]/page.tsx` + `GET /api/referrers/[code]` (`src/app/api/referrers/[code]/route.ts`) — reads the dashboard (name/email/earnings + **commission history with customer names**) only after validating the Bearer token via `getReferrerAuth()` and confirming the token's referrer owns the requested code.
- The `[code]/route.ts` file's own comment states the intent explicitly: *"Gated: requires a referrer session token ... whose referrer owns this code."* And `referral/page.tsx`'s comment: *"The earnings dashboard (with client names) is gated behind this so the referral code alone can no longer reveal a partner's earnings."*

That migration was never finished. **6 legacy, per-tenant-cloned pages still call the old un-gated endpoints directly, with zero auth:**

- `src/app/site/referral/page.tsx` (generic template)
- `src/app/site/nycmaid/referral/page.tsx`
- `src/app/site/template/referral/page.tsx`
- `src/app/site/wash-and-fold-hoboken/(app)/referral/page.tsx`
- `src/app/site/wash-and-fold-nyc/(app)/referral/page.tsx`
- `src/app/site/the-florida-maid/referral/page.tsx`

Each calls, with **no Authorization header at all**:
- `GET /api/referrers?code=<code>&stats=true` and `GET /api/referrers?email=<email>` (`src/app/api/referrers/route.ts` GET) — returns `name, email, referral_code, total_earned, total_paid, preferred_payout` for **any** referrer in the tenant, tenant-scoped but not owner-scoped. Rate-limited (10/10min per IP, in-memory) but not auth-gated.
- `GET /api/referral-commissions?referrer_id=<id returned above>` (`src/app/api/referral-commissions/route.ts` GET) — explicitly documented as "public: the referrer portal calls this with their own ID" — returns the referrer's **full commission ledger including real customer names** (`client_name`) and dollar amounts, keyed by nothing but the UUID.

## Why this is a live, low-effort exploit (not theoretical)

The referral **code** is not a secret — it's the exact string every referrer is instructed to share in their booking link (`?ref=CODE`). So this isn't "guess a code": **every person who has ever received a referral link from a given referrer already has everything needed** to open `/referral?code=<that code>` on the legacy pages and see that referrer's name, email, and total earnings — then follow through to `/api/referral-commissions?referrer_id=<id>` and see the **names of every other customer that referrer has referred**, plus per-referral dollar amounts. `?email=` lookup additionally lets anyone who knows/guesses a referrer's email pull the same data with zero prior link.

This is the same "PII oracle" shape W2 logged as P45/P47/P48/P49 this session — the difference is those were dead API routes nobody called; **these are live, in-use, customer-facing pages on 5 real tenant sites today.**

## Why I did not fix it this pass

The correct fix is mechanical in principle (point the 6 legacy pages at the existing `/referral` + `/referral/[code]` flow, or redirect them there) but touches **live, revenue-adjacent, customer-facing production pages across 5 different tenant sites**, each potentially reached via a different Host-header routing path through this app's tenant middleware. Per this repo's web-testing rules that requires visual-regression + real browser verification per breakpoint per tenant before calling it done, which is more than a single unattended broad-hunt pass should ship blind. Preparing this as a reviewable diff (not applying) felt riskier than flagging it precisely, given 5 live customer flows are at stake and I can't visually verify all 5 tenant domains in this pass.

## Recommended fix

Replace the body of each of the 6 legacy `referral/page.tsx` files with a redirect (or thin wrapper) to the shared `/referral` OTP-gated flow, then delete `src/app/site/*/referral/page.tsx` duplication once each tenant's routing is confirmed to still land the visitor on a working dashboard. Should be scoped as its own dedicated task with dev-server verification against each tenant hostname (or at least the primary `thenycmaid.com` path), not folded into a broad-hunt sweep.

No code changed. File-only, no push/deploy/DB.
