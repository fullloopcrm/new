# Broad-hunt — W4, 2026-07-16 04:37 order

File-only, no push/deploy/DB. Continuing broad-hunt on a lower-risk surface
per LEADER instruction (seomgr watchdog build-verified green; the recipes.ts
gap is a separate pre-existing p1-w4 build issue, flagged to Jeff, not mine
to fix).

## Fixed: `POST /api/track` trusted a fully client-supplied `tenant_id`

`src/app/api/track/route.ts` is a public, unauthenticated analytics beacon
(no secret, no session — it's a `sendBeacon`/`fetch` call embedded in public
marketing pages). It accepted a `tenant_id` field straight from the request
body and used it verbatim for two things:

1. `tenant_id` on the inserted `lead_clicks` row (read back, unfiltered by
   any ownership check, by the tenant's own `/dashboard` visits/leads feed
   at `src/app/api/leads/visits/route.ts`, scoped only by
   `.eq('tenant_id', tenantId)`).
2. The `tenantId` passed to `notifyLeadEmailIfNeeded()`, which looks up
   `settings.lead_notification_email` for that tenant and sends a "New
   lead" email via the **shared platform Resend key** (this path never
   passes a tenant-specific `resendApiKey`).

Since `tenant_id` was never checked against anything, any anonymous caller
could POST directly to `/api/track` (no browser needed) with an arbitrary
`tenant_id` and:
- Plant fake visit/lead rows in another tenant's analytics dashboard
  (data-integrity pollution, tenant sees bogus traffic/conversion numbers).
- Force a "New lead" notification email to any tenant's configured
  `lead_notification_email`, with attacker-controlled `page`/`referrer`/
  `utm_source` (already HTML-escaped via `escapeHtml`, so not XSS — but
  still an unwanted-email / social-engineering vector, and it burns the
  shared platform Resend sending reputation rather than the tenant's own).

There's an existing per-tenant rate limit (`track-lead-email:{tenantId}`,
20/hr) that caps *volume* per spoofed tenant, but did nothing to stop the
tenant_id itself from being forged — an attacker could still hit up to 20
different real tenants' inboxes per hour each, or 20 fake-lead sends
against one target.

**Fix**: stopped trusting the client's `tenant_id` entirely. The route now
derives the tenant server-side from the `domain` field via the same
`getTenantByDomain()` resolver already used by `middleware.ts` and the
`/api/ingest/*` routes (checks `tenants.domain` then `tenant_domains`,
handles the `www.` prefix, 5-min cache). If `domain` doesn't resolve to a
known tenant, the row is stored with `tenant_id: null` (existing
"unattributed hit" behavior — unchanged), and the lead-notification email
path never fires. `handlePatch` (the `sendBeacon` follow-up PATCH that
updates scroll/time-on-page) was already scoped by `session_id` + `domain`
without touching `tenant_id`, so it didn't need this fix.

## Verification

- `npx tsc --noEmit` — clean (only the same pre-existing unrelated failure
  in `bookings/broadcast/route.xss.test.ts` flagged in prior W4 reports).
- Existing test `src/app/api/track/route.email-bomb.test.ts` covers the
  per-tenant email rate-limit; updated it to mock `getTenantByDomain` (the
  route now calls it) and added a new case asserting a spoofed `tenant_id`
  that doesn't match `domain` is ignored — notification calls only ever key
  off the domain-resolved tenant. `npx vitest run
  src/app/api/track/route.email-bomb.test.ts` — 2/2 passed.

## Noticed, not fixed (out of scope)

- `handlePatch`'s lookup (`lead_clicks` by `session_id` + `domain`, no
  tenant check) could theoretically let a caller who guesses/observes
  another visitor's `session_id` overwrite that row's `final_scroll`/
  `final_time`/`cta_clicked` fields. `session_id` is client-generated and
  not exposed anywhere server-side, so this needs an existing valid session
  id to exploit — low value target, left alone this pass. Flagging in case
  it's worth a follow-up.
