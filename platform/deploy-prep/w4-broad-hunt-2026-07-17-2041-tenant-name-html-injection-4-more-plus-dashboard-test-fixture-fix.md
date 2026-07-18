# W4 — 2026-07-17 20:41 — tenant.name HTML-injection: 4 more instances found+fixed, plus dashboard test-fixture bug

## Context

The 20:40 checkpoint declared the tenant.name/client.name unescaped-HTML-
injection bug class "fully closed" after several passes across
`src/lib/` builders, `src/app/api/**` inline HTML routes, campaign sends,
and the shared `email-templates.ts` builders. This pass re-swept every
`app/api` file that interpolates `tenant.name` near an HTML tag and found
4 files that were missed — none previously touched this session.

## (1) Fresh ground — 4 more real instances of the same bug class

All four splice tenant-owner-controlled `tenant.name` into raw HTML with
no `escapeHtml()` at all (not a partial-escape miss — these files had zero
`escapeHtml` import). `tenants.name` is self-service settable by any
tenant via dashboard onboarding (`/api/dashboard/onboarding/profile`), so
each is a live vector for a malicious tenant to inject
`<img src=x onerror=...>`-style HTML into a real recipient's mail client:

1. **`src/app/api/client/reschedule/[id]/route.ts`** — the client-facing
   reschedule-confirmation email (`<p><strong>${tenant.name}</strong>
   moved your appointment.</p>`), sent to real customers on every
   self-service reschedule. Also escaped the interpolated date/time
   strings for consistency (not attacker-controlled, but same template).
2. **`src/app/api/cron/phone-fixup/route.ts`** — the daily "confirm your
   phone number" email to cleaners with invalid phones
   (`emailWrapper(...)`), unescaped `tenant.name` AND the cleaner's own
   first name. Sent to real team members every day the cron runs.
3. **`src/app/api/webhooks/stripe/route.ts`** — `invoice.payment_failed`
   handler emails Full Loop's own internal `ADMIN_NOTIFICATION_EMAIL`
   with `tenant.name`/`owner_email` unescaped. A subscription payment
   failure is trivially self-triggerable (e.g. a declined test card), so
   this is a vector for a malicious tenant to inject HTML into the
   *platform operator's own inbox*, not just another tenant's.
4. **`src/app/api/client/send-code/route.ts`** — `codeEmailHtml()`
   spliced `tenant.name` raw into the `<h2>` of the client verification-
   code email, reachable pre-auth.

All four fixed by wrapping with the existing `escapeHtml()` from
`@/lib/escape-html` (already used consistently elsewhere). SMS-only
occurrences of `tenant.name` (portal/auth, pin-reset, client/send-code's
SMS fallback, stripe's client thank-you SMS) were left alone — SMS is
plain text, no HTML render context, so the class doesn't transfer (same
ruling made for `nycmaid/sms-templates.ts` earlier tonight). Subject
lines were also left alone (mail headers, not rendered as HTML body).

Swept every remaining `app/api` file with `tenant.name`/`tenant?.name`
near HTML tags (18 files total) — the other 14 were already correctly
using `escapeHtml()` or passing through already-escaped shared template
functions (`email-templates.ts`'s builders, `businessName` params, etc).
This closes the class again, this time with a full grep-verified sweep
rather than a per-surface pass.

RED/GREEN-verified via `git stash` mutation testing (each fix's test
fails against the pre-fix code, confirmed raw payload present; passes
post-fix). 4 new test files:
- `route.html-injection.test.ts` (client/reschedule, cron/phone-fixup,
  client/send-code)
- `route.payment-failed-html-injection.test.ts` (webhooks/stripe)

## (2) Continued surface — dashboard test-fixture bug surfaced by running the full suite

Running the full suite after the fixes above turned up 2 genuine
failures unrelated to this diff:
`src/app/api/dashboard/route.status-paid-blind-spot.test.ts` and
`route.partial-payment-double-count.test.ts`. Root-caused (confirmed via
`git stash` that both fail identically on the unmodified base commit —
pre-existing, not caused by this pass's changes):

`GET /api/dashboard`'s own "today" boundary logic is already correct —
it was fixed earlier this session to bucket `bookings.start_time` as a
naive-ET string (no `Z` suffix), specifically because a UTC-based
boundary produces a 4-5h-per-evening window where "today" in ET reads as
"yesterday" server-side. But both test files seeded their `start_time`
fixtures with `now.toISOString()` — a real UTC, `Z`-suffixed timestamp —
which is exactly the format the route's fix was written to reject. Any
test run between ~8pm and midnight ET spuriously fails, which is exactly
what happened here (this session is running at 8:35pm ET, just past the
UTC midnight rollover). This is the same naive-ET-vs-UTC bug class
hunted extensively this session, just manifesting in test fixtures
instead of app code — a broken test that silently masks real regressions
during that exact window, since a dev seeing it fail might assume "known
flaky test" rather than checking a real change.

Fixed both by importing the existing `toNaiveET()` helper from
`@/lib/dates` (the same helper `dashboard/route.ts` itself imports) and
using it for the fixture timestamps instead of `.toISOString()`. Both
files now pass regardless of time of day. Grepped for the same pattern
elsewhere (`now.toISOString()` in `app/api/**/*.test.ts`, 9 hits) — the
other 7 are all explicitly-named UTC-vs-ET boundary tests
(`*.naive-et-boundary.test.ts`, `*.today-boundary-utc-vs-et.test.ts`)
that use `.toISOString()` deliberately as the UTC edge case under test,
and all currently pass — left untouched, no evidence of the same bug.

## (3) Gap/fluidity

See `w4-gap-fluidity-checkpoint-2026-07-17-2041.md`.

## Verification

- tsc: clean, same 3 pre-existing baseline errors (unrelated files), 0 new.
- Full suite: 613 files, 2168 tests → after these fixes: 612/613 files,
  2166/2168 tests (1 expected-fail + 1 skip); the sole remaining failure
  is `cron/tenant-health/status-coverage-divergence.test.ts`, explicitly
  named `INVARIANT (RED until fixed)` — a self-documented, pre-existing
  known gap, not touched by this diff. The `generate-recurring`
  duplicate-occurrence-race flake (previously documented as
  order-dependent) did not reappear in this run.
- 6 files touched, 4 new test files. File-only, no push/deploy/DB.
