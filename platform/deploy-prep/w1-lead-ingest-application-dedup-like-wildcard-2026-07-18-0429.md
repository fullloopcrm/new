# lead/ingest-application team_applications dedup LIKE-wildcard injection — 04:20 order item (1)+(2)

**From:** W1, 04:20 order item (1) new fresh-ground surface + (2) continuation.

## Context

Prior W1 rounds this session closed HTML-injection-into-admin-email gaps
(job-application/qualify, then comhub-email/comhub-contacts). Before hunting
a new bug class I re-swept the admin-notification-email surface for anything
the last round missed: checked every file calling
`emailAdmins`/`sendEmail`/`sendTenantEmail`/`emailShell` that wasn't already
in the `escapeHtml` import list (`feedback/route.ts`, `pin-reset/route.ts`,
`client/book|collect|reschedule/route.ts`, `portal/collect/route.ts`,
`campaigns/[id]/send/route.ts`, `dashboard/comms-preview/route.ts`,
`documents/public/[token]/sign/route.ts`, `reviews/request/route.ts`,
`settings/request-automation/route.ts`) — every one is either already
`escapeHtml`-sourced, interpolates only server-generated/admin-set values
(OTP codes, formatted dates, tenant name), or is gated behind
`requireAdmin`/`requirePermission`/`protectCronAPI`/`protectClientAPI` (same
trust boundary the prior round already ruled out of scope). Fully clean, no
fresh HTML-injection bug this round.

Pivoted to the sibling class this session's OTHER active thread already
established and enforced: LIKE-wildcard-injection
(`src/lib/like-wildcard-routes.test.ts`, `escapeLikeValue()` in
`postgrest-safe.ts`). That file's own docstring lists the exploit shape —
"an anonymous request with `email: '%'` matching an arbitrary existing row"
— and enforces 9 specific files as sanitizer-sourced. I grepped every
`.ilike(` call site across `src/app/api` and `src/lib` (40+ hits) and
diffed against that enforced list, filtering for the same signature as the
known-exploitable pattern: an **exact-match** `.ilike('col', value)` (no
`%term%` wrapper of its own) fed a raw, unescaped, request-derived value on
a route reachable without full tenant-session auth. Most hits were either
intentional `%term%` substring search (admin dashboards, Selena AI tool
calls — different, lower-severity class) or already digit-stripped before
reaching `.ilike()` (phone lookups via `.replace(/\D/g, '')`, which
incidentally strips `%`/`_` too). Two exact hits: `src/app/api/lead/route.ts`
(job-application branch — the same file/branch the last round's HTML-escape
fix touched) and its cross-site sibling `src/app/api/ingest/application/route.ts`.

## Fixed (1): `src/app/api/lead/route.ts` — job-application dedup

`POST /api/lead` (public, unauthenticated, tenant-resolved-by-Host,
rate-limited only) ran its `team_applications` dedup check as:

```
.eq('tenant_id', tenant.id)
.eq('phone', appPhone)
.ilike('name', name)          // name = raw, unescaped body.name
.limit(1)
.maybeSingle()
```

`name` is attacker-controlled with no escaping. A caller who already knows
or guesses a phone number with an application on file (a 10-digit space —
not infeasible for a targeted attack, and trivially true for the attacker's
own past submission) can submit `name: '%'` to match that row regardless of
its actual name. The route then responds
`{ success: true, application_id: <the unrelated applicant's id>, deduped: true }`
instead of inserting the new submission — leaking an unrelated applicant's
row id to an anonymous caller AND silently dropping the attacker's own new
application data (never written to `team_applications`). `_` (single-char
wildcard) has the same effect on any name that's a one-character edit from
an existing one.

Fixed: imported `escapeLikeValue` from `@/lib/postgrest-safe`, wrapped the
`.ilike()` argument. Added `route.job-application-name-wildcard.test.ts` (3
tests, using the same real LIKE-pattern-to-regex mock harness
`route.email-wildcard.test.ts` established: bare `%` no longer cross-matches,
a `_`-substituted name variant no longer cross-matches, CONTROL — an actual
case-insensitive exact match still dedups correctly).

## Fixed (2): continuation — `src/app/api/ingest/application/route.ts`

Same shape, sibling file. This route is the shared cross-site sink (its own
docstring: "the single public sink that funnels [standalone tenant sites']
job applications into FullLoop's `team_applications` table") gated by a
shared `INGEST_SECRET`, not a full tenant session — the same "leaked/
compromised standalone site" trust boundary its neighboring
`route.rate-limit.test.ts` already documents as in-scope. Its dedup check
had the identical raw `.ilike('name', name)` gated by
`.eq('phone', cleanPhone)`. Fixed identically: `escapeLikeValue()`, plus
`route.name-wildcard.test.ts` (2 tests: bare-`%` no-cross-match, CONTROL
exact-match still dedups).

## Enforced

Added both files to `like-wildcard-routes.test.ts`'s `FILES` invariant list
(verified by inspection: each has exactly one `.ilike()` call site, both
exact-match, no `%term%` substring search anywhere in either file) — a
future revert to the raw variable now fails that suite, same protection the
prior 9 files already had.

## Checked, clean — not fixed (different shape or already covered)

- Every other exact-match `.ilike()` hit found in the sweep either resolves
  a value that's already digit-stripped before the call (phone lookups —
  `%`/`_` can't survive `.replace(/\D/g, '')`), or sits behind
  `requirePermission`/`requireAdmin` (`deals/manual/route.ts`'s email
  find-or-create — operator-authenticated, self-tenant-scoped only,
  same-trust-boundary carve-out established by the prior round).
- `client/bookings/route.ts`'s `.ilike('email', clientRecord.email.trim())`
  reads an already-stored DB value (not this request's raw input) and sits
  behind `protectClientAPI` — a second-order concern (would require a prior
  unescaped write path to have stored a wildcard into a client's own email
  column) not chased this round; flagged here as a candidate if a future
  pass finds such a write path.
- `test/email-selena/route.ts`'s `.ilike('email', email)` is behind a
  `SELENA_TEST_TOKEN` `safeEqual` gate and disabled unless that env var is
  explicitly set — internal test harness, not a public attack surface.
- Full re-check of the admin-notification-email (`escapeHtml`) surface per
  the Context section above: clean, nothing fresh.

## Verification

- Both new test files RED-confirmed: captured the fix as a patch, `git apply
  -R`'d it back to pre-fix source, reran (lead: 2/3 failed for the predicted
  wildcard-cross-match reason, CONTROL still passed; ingest/application: 1/2
  failed identically), restored GREEN via re-applying the saved patch.
- `like-wildcard-routes.test.ts` (the enforced invariant suite) passes with
  both new files added — 11/11.
- tsc clean (same 5 pre-existing baseline errors: admin-auth's
  `verifyAdminToken` route-export shape, outreach + payment-reminder test
  spread-argument errors, 2 uncommitted `site-nav.ts` errors in this
  worktree from unrelated in-progress SEO work — none touch these files).
- eslint 0 errors/0 warnings on all 5 touched/added files.
- Full suite: 646/646 files, 3410 passed + 1 expected fail (pre-existing,
  unrelated), 0 regressions.
- Commits: fix+tests, then this doc.

File-only. No push/deploy/DB. `tenant_domains` schema lane unchanged this
round.
