# W4 broad-hunt — Host-header-derived origin fix (admin webhook/checkout URLs)

**Session:** 2026-07-16, 00:44 LEADER order ("Continue broad-hunt, lower-risk surface")
**Branch:** p1-w4 (file-only, no push/deploy/DB)

## What was checked this pass

Fresh angles not covered by ~90 prior broad-hunt passes on this branch:
- Zip Slip / archive path traversal (`year-end-zip` routes, `site-export.ts`) — clean; entry paths come from `new URL().pathname`, which normalizes/clamps `..` segments at the origin root, and zip filenames are otherwise hardcoded.
- Prototype pollution patterns (`Object.assign`/merge with raw request bodies, `__proto__`) — none found.
- New/untracked SEO files (`lib/seo/health.ts`, `lib/seo/recipes.ts`, migration SQL) — `health.ts` and `recipes.ts`'s `fetchTitleMeta` both already route through `safeFetch` (SSRF-guarded); the new materialized views are only read via `supabaseAdmin` behind `requireAdmin()`, no RLS-bypass exposure.
- CSP header — confirmed genuinely absent (only `X-Content-Type-Options`/`X-Frame-Options`/HSTS/`Referrer-Policy`/`Permissions-Policy` are set in `next.config.ts`). Flagging, not fixing: a real nonce-based CSP rollout on an app this size risks breaking third-party embeds/inline scripts and needs a dedicated tuning pass, not a blind lower-risk sweep.
- `safe-channel-append.py` / `append-atomicity-*.sh` — confirmed still non-wired proposals, no live exploitability (matches prior session's note).

## What was found and fixed

Grepped every site reading `x-forwarded-host`/`host` request headers to build an outbound URL. Found 3 admin routes doing this; 1 (`agreement/route.ts`) already followed this codebase's established safe convention (`process.env.NEXT_PUBLIC_APP_URL` first, header only as a local-dev fallback — confirmed `NEXT_PUBLIC_APP_URL=https://app.fullloopcrm.com` is a real configured prod env var, and ~30 other routes already use it this way). The other 2 deviated from that convention and built the origin directly from client-controllable headers with no env-var preference at all:

1. **`src/app/api/admin/businesses/[id]/route.ts`** (PUT, admin-gated) — when an admin saves a Telegram bot token, the route auto-registers the bot's webhook URL with Telegram's API as `${origin}/api/webhooks/telegram/${slug}`, where `origin` was built straight from `x-forwarded-host`/`host`. If that header were spoofed on the request, the platform would register a business's Telegram webhook against an attacker-chosen domain — future customer messages for that business would be silently forwarded to the attacker instead of the real platform.

2. **`src/app/api/admin/requests/[id]/proposal-checkout/route.ts`** (POST, admin-gated) — builds the Stripe Checkout `success_url`/`cancel_url` (`platform-billing.ts:127-128`) the same way. A spoofed header here would redirect the customer — right after they complete a real, large ($25k setup + seats) payment — to an attacker-controlled domain instead of `/proposal/thank-you`, a phishing vector immediately following a high-trust transaction.

Both are gated behind `requireAdmin()`, and `Host`/`X-Forwarded-Host` can't be set by ordinary browser JS (forbidden/custom header + CORS preflight), so the practical exploit path requires an additional primitive (stolen admin session used directly via a non-browser HTTP client, or a proxy/CDN layer that forwards a client-supplied `X-Forwarded-Host` verbatim) — this is a defense-in-depth / convention-deviation fix, not a standalone anonymous-attacker exploit. Still a real, cheap, in-scope fix: both routes had it, one sibling route already didn't.

## Fix

Changed both to prefer `process.env.NEXT_PUBLIC_APP_URL`, falling back to the header only when the env var is unset (matches `agreement/route.ts` exactly):

```ts
const origin = process.env.NEXT_PUBLIC_APP_URL || (host ? `https://${host}` : new URL(request.url).origin)
```

No test file existed for either route (none added — same no-test precedent as prior convention-fix passes on this branch, e.g. `admin/announcements` mass-assignment).

## Verification

- `npx tsc --noEmit`: clean except the same pre-existing unrelated failure every prior report on this branch has flagged (`bookings/broadcast/route.xss.test.ts` mock-typing issue, confirmed unrelated to this diff).
- Confirmed via grep this is the complete set: only 4 files in `src/` read `x-forwarded-host` — `middleware.ts` (tenant-domain routing, already independently audited/sound in the 00:12 pass) and these 2 routes + the already-correct `agreement/route.ts`.

File-only, no push/deploy/DB.
