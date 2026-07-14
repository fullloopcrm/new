# SSRF Hardening — Confirmation + Remaining Fetch-Sink Audit (W1)

**Date:** 2026-07-12
**Auditor:** W1 (autonomous)
**Trigger:** Queue item (c) — confirm 871b38c SSRF hardening landed as described, then sweep
the rest of the codebase for fetch sinks that take tenant/user-controlled URLs and aren't
covered.

## Part 1 — 871b38c confirmed on branch

Commit `871b38c` (SSRF guard on tenant/user-supplied URL fetches, `src/lib/ssrf.ts`) is on
`p1-w1`. `assertPublicUrl()` / `safeFetch()` block loopback, RFC1918, CGNAT, link-local, ULA,
and the cloud metadata address (169.254.169.254) for both IPv4 and IPv6 (including
IPv4-mapped IPv6), resolving DNS before connecting. `safeFetch()` re-validates on every
redirect hop so a public URL can't 3xx into the private network. 10/10 unit tests in
`src/lib/ssrf.test.ts` pass.

All 6 call sites the commit message lists are verified wired up on this branch:

| File | Guard used | Verified |
|---|---|---|
| `src/lib/tenant-health.ts` | `assertPublicUrl` (per-hop, manual redirect loop at `fetchHead`/`followFinal`) | ✅ |
| `src/lib/site-readiness.ts` | `safeFetch` | ✅ |
| `src/lib/site-export.ts` | `safeFetch` | ✅ |
| `src/lib/seo/remediate.ts` | `safeFetch` | ✅ |
| `src/lib/seo/enrich.ts` | `safeFetch` | ✅ |
| `src/lib/seo/technical.ts` | `safeFetch` | ✅ |

`tenant-health.ts` doesn't call `safeFetch()` directly — it re-implements the same
loop-and-revalidate pattern by hand (`fetchHead()` calls `assertPublicUrl()` on every
iteration of `followFinal()`'s redirect-following loop), so a tenant's domain can't redirect
the health-check fetch into the private network either. Confirmed equivalent to `safeFetch`.

**Documented residual limitation (from `ssrf.ts` header comment, not new):** DNS is resolved
at check time; `fetch()` resolves again internally. A DNS-rebind attacker who can flip a
domain's A record between the two lookups could still slip a private IP through on the
*first* hop. `safeFetch`'s per-hop re-validation closes the far more common
redirect-to-internal vector but not a same-hop rebind race. Full protection needs pinning the
connection to the already-validated IP (not done here). Noting for awareness, not fixing —
out of scope for this queue item.

## Part 2 — Repo-wide fetch-sink sweep

Method: `grep -rln "fetch(" src` repo-wide, then discarded all client-side `page.tsx` /
`*.tsx` browser fetches (same-origin/relative paths to our own API, or run in the user's own
browser — no server-side SSRF blast radius), and reviewed every server-side `lib/` and
`app/api/` hit for whether the **destination host** (not just a path segment or body field)
is derived from tenant/user data.

### Gap found — NOT covered by 871b38c

**`src/lib/onboarding-verify.ts:68`, `verifySsl(domain)`:**

```ts
const res = await fetch(`https://${domain}/`, { method: 'HEAD', signal: controller.signal })
```

`domain` is `tenant.domain` — the tenant's custom domain column, read straight out of the
`tenants` row with no SSRF check — called via
`runAllChecks()` → `POST /api/admin/businesses/[id]/verify-checklist` (`src/app/api/admin/businesses/[id]/verify-checklist/route.ts:39`).

This is the exact same threat model 871b38c's commit message describes ("Cron + admin jobs
fetch URLs derived from tenant-controlled data... could point those at 127.0.0.1,
169.254.169.254... to make the server request internal resources") — it's just a fetcher
871b38c's sweep didn't catch. The route is `requireAdmin()`-gated, so exploitation requires
an admin (or a compromised admin session) triggering verify-checklist against a tenant row
whose `domain` field has been set to an internal address — lower severity than an
unauthenticated cron target, but the same class of bug, and `tenants.domain` is written
during onboarding from data that isn't itself validated as a real public domain anywhere in
this codebase.

The other three `onboarding-verify.ts` fetchers (`verifyResendDomain`, `verifyTelnyxNumber`,
lines 85 and 112) are safe — fixed vendor hosts (`api.resend.com`, `api.telnyx.com`), only
path/query params derive from tenant data.

**Recommended fix (not applied — queue item (c) is confirm + document, not remediate):**
wrap the `verifySsl` fetch with `assertPublicUrl(url)` before calling `fetch`, same pattern as
`tenant-health.ts:fetchHead`. One-line change, no behavior change for legitimate domains.

### Reviewed and classified SAFE (destination host is hardcoded, not attacker-controlled)

| File | Sink | Why safe |
|---|---|---|
| `src/lib/social.ts` | `graph.facebook.com/...` (post/photo/IG container/publish) | Host fixed; only `page_id`/`account_id`/access token vary. Image URLs (`photoUrl`/`imageUrl`) are sent as JSON body fields Facebook's servers fetch, not fetched by us. |
| `src/lib/seo/gsc.ts` | `www.googleapis.com` (token exchange, `apiFetch`, URL inspection) | Host fixed; tenant domain only appears in request body/query, never as fetch target. |
| `src/lib/seo/gsc-write.ts` | `www.googleapis.com/siteVerification`, `/webmasters` | Same — fixed Google API hosts. |
| `src/lib/seo/serp.ts` | `SERPER_ENDPOINT` | Fixed constant (Serper.dev). |
| `src/lib/telegram.ts` | `api.telegram.org/bot<token>/...` | Fixed host; only the bot token (server-owned secret) varies. |
| `src/lib/onboarding-verify.ts` (Resend/Telnyx/Stripe checks) | `api.resend.com`, `api.telnyx.com`, Stripe SDK | Fixed vendor hosts. |
| `src/app/api/indexnow/route.ts` | `api.indexnow.org/indexnow` | Fixed host; tenant URLs are submitted in the JSON body for IndexNow's own crawler to fetch later, not fetched by us. |
| `src/app/api/admin/travel-time/route.ts` | `nominatim.openstreetmap.org/search` | Fixed host; `address` is a query param, not the target host. |
| `src/lib/jefe/actions.ts` `rerunCron()` | `${PROD_BASE}/api/cron/${n}` | `n` is checked against a `RERUNNABLE_CRONS` allowlist before interpolation; `PROD_BASE` is a fixed env var, not tenant data. |
| `src/lib/selena/tools.ts` `handleTriggerCron()` | `${NEXT_PUBLIC_SITE_URL}/api/cron/${input.name}` | `input.name` checked against a hardcoded allowlist before interpolation; base URL is a fixed env var. This is the one AI-tool-callable fetch reviewed — confirmed the LLM cannot supply an arbitrary target, only pick from the allowlisted cron names. |
| `src/lib/caseStudyStats.ts` | `ENDPOINT` | Fixed constant. |

No other server-side fetch sink in `src/lib/` or `src/app/api/` builds its **request host**
from tenant/user input outside the list above and the 6 already covered by 871b38c.

## Summary

- 871b38c: **confirmed**, all 6 stated sites wired correctly, `tenant-health.ts`'s hand-rolled
  equivalent also confirmed correct, 10/10 tests pass.
- 1 gap found and documented (not fixed, per scope of this item): `onboarding-verify.ts:68`
  `verifySsl()` — admin-triggered fetch to unguarded tenant-controlled domain.
- All other fetch sinks in the codebase resolve to hardcoded vendor/first-party hosts and are
  not SSRF vectors.
