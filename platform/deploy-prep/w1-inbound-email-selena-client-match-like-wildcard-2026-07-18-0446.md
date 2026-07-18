# Inbound-email → Selena client-match LIKE-wildcard injection — 04:38 order item (1)+(2)+(3)

**From:** W1, 04:38 order item (1) new fresh-ground surface, (2) continuation, (3) gap/fluidity doc.

## Context

Prior round closed two sibling instances of the unescaped-exact-match-ilike
class (`lead`/`ingest/application` team_applications dedup). Before hunting a
new bug class I re-checked candidate categories already fully swept this
session: `.or()` PostgREST injection (`postgrest-injection-routes.test.ts`
covers all 10 known routes, confirmed current), and IDOR via missing
`tenant_id` scoping on `[id]` dynamic routes (checked `booking-notes/[id]`,
`bookings/[id]/team`, `admin/recurring-schedules/[id]` — all either already
tenant-scoped directly or scoped implicitly via `tenantDb()`'s auto-`.eq(
'tenant_id', …)` wrapper; no fresh IDOR found). Webhook signature
verification (Telnyx/Resend/Clerk/deploy-hook) all already use
`timingSafeEqual` + are already dedup'd against redelivery from prior
rounds — clean.

Pivoted back to the LIKE-wildcard-injection class itself
(`src/lib/like-wildcard-routes.test.ts`, `escapeLikeValue()` in
`postgrest-safe.ts`) and grepped every `.ilike(` call site across `src/app`
and `src/lib` again (50+ hits), this time specifically checking files NOT
already on the enforced list and NOT already digit-stripped
(`.replace(/\D/g, '')`) phone lookups (those strip `%`/`_` incidentally and
are already covered/confirmed-safe by prior rounds' length-floor fixes).
Found three real misses.

## Fixed (1) — new fresh-ground surface: `src/lib/selena-legacy-email.ts`

`handleInboundEmail()` — the inbound-email → Selena AI pipeline dispatched
per-tenant by `cron/email-monitor` → `POST /api/email/monitor` — matched an
existing client by:

```
.eq('tenant_id', tenant.id)
.ilike('email', from)
```

where `from = (email.from || '').toLowerCase().trim()` is the raw
sender address parsed (via `mailparser`) from an inbound email's From
header. This is genuinely public-reachable: anyone who emails the
tenant's real business inbox controls their own From address, and `%` is
a **legal literal** in an email local-part (the historic sendmail
"percent-hack" routing convention — `user%domain@relay.com` — not a
parser-leniency edge case). A crafted From address containing `%`/`_`
wildcard-matched an UNRELATED existing client instead of falling through
to "create a new lead" for the literal address. Impact chain once matched:
the attacker's inbound message gets appended to that client's real
`sms_conversations` thread, `askSelena()` is called with that client's real
`phone` (feeding real booking/profile context into the AI), and the
AI-generated reply is emailed straight back to the attacker's (spoofed)
address — leaking that client's data through an automated reply.

This is the CLIENT-matching sibling of `src/lib/inbound-email-tenant.ts`
(which resolves the TENANT for this same inbound path and was already
fixed/enforced in an earlier round) — same file family, same inbound
trigger, but a different lookup that never got the same treatment.

Fixed with `escapeLikeValue(from)`. Added
`src/lib/selena-legacy-email.email-wildcard.test.ts` — RED/GREEN-verified
(reverted the fix, confirmed the wildcard test fails with the exact
"matched the victim" assertion error, restored the fix, confirmed green).
Added the file to `like-wildcard-routes.test.ts`'s enforced list (verified:
only one `.ilike()` call site in the file, exact-match, safe to enforce
file-wide).

## Fixed (2) — continuation, same sweep: two more misses

Reading the fix in context (clients.email can legitimately end up
`%`-containing in the DB via the very insert path adjacent to the bug just
fixed — `handleInboundEmail`'s own lazy-create stores `email: from`
verbatim, no format validation) surfaced two more real, previously-missed
instances of the same class:

- **`src/app/api/client/bookings/route.ts`** — re-matched a client's OWN
  stored `email` against `clients` to collect legacy-import "duplicate"
  rows: `.ilike('email', clientRecord.email.trim())`, unescaped. If the
  requesting client's own email is `%`-containing (plausible given the
  finding above, or any other unvalidated insert path), this wildcard-matches
  **every other client in the tenant**, merging an unrelated client's
  booking history into this client's own portal view (`GET
  /api/client/bookings`, authenticated but tenant-wide blast radius).
  Fixed with `escapeLikeValue()`. Added
  `route.email-wildcard.test.ts` (RED/GREEN-verified), added to the
  enforced list.

- **`src/app/api/deals/manual/route.ts`** — the operator-side manual-lead
  client dedupe: `.ilike('email', email)` on operator/integration-submitted
  `email`, unescaped. An operator (or an automation relaying this endpoint)
  submitting `email: '%'` attaches the new deal to an ARBITRARY existing
  client in the tenant instead of creating one — same class already fixed on
  this route's own sibling dedupe paths (`/api/contact`, `/api/lead`), missed
  here. Fixed with `escapeLikeValue()`. Added
  `route.email-wildcard.test.ts` (RED/GREEN-verified), added to the enforced
  list.

All three RED-verified: with the fix reverted, each new test fails with the
exact "matched the unrelated victim" assertion; restored, all green. A
CONTROL case in each proves the real, non-wildcard exact-match path still
resolves correctly (no functional regression).

## (3) Gap/fluidity — swept clean, nothing else found this round

Full re-grep of every remaining `.ilike(`/`.or(` call site in `src/app` and
`src/lib` after these three fixes:

- Every phone-based `.ilike('phone', ...)` call site left in the codebase
  (`selena-legacy.ts`, `selena-legacy-core.ts`, `selena.ts` × 4 tenant
  sites, `client/collect`, `portal/collect`) already has the
  digit-stripped + `>= 10`-digit length-floor fix from earlier rounds —
  `%`/`_` cannot survive `.replace(/\D/g, '')`, confirmed not exploitable.
- Every `.or()` PostgREST-filter-string call site is on the enforced
  `postgrest-injection-routes.test.ts` list (10/10, source-invariant swept,
  still clean).
- `webhooks/telnyx-voice/route.ts`'s own `.ilike(` usage (via
  `sanitizePostgrestValue`, not `escapeLikeValue` — it's a `%term%`
  substring search, correct category) — already sanitizer-sourced.
- No further un-enforced exact-match `.ilike()` call sites found. The
  enforced list is now 14 files (was 11).

## Files changed (file-only, no push/deploy/DB)

- `src/lib/selena-legacy-email.ts` — `escapeLikeValue(from)` fix
- `src/lib/selena-legacy-email.email-wildcard.test.ts` — new, RED/GREEN-verified
- `src/app/api/client/bookings/route.ts` — `escapeLikeValue(...)` fix
- `src/app/api/client/bookings/route.email-wildcard.test.ts` — new, RED/GREEN-verified
- `src/app/api/deals/manual/route.ts` — `escapeLikeValue(email)` fix
- `src/app/api/deals/manual/route.email-wildcard.test.ts` — new, RED/GREEN-verified
- `src/lib/like-wildcard-routes.test.ts` — added 3 files to enforced list + docstring exploit-shape entries

Verified: `npx tsc --noEmit` clean on all touched files (pre-existing
unrelated errors in `admin-auth/route.ts`, `cron/outreach`,
`cron/payment-reminder`, `sunnyside-clean-nyc` are untouched/pre-existing,
not from this change). All new + enforced-list tests pass (32/32).
