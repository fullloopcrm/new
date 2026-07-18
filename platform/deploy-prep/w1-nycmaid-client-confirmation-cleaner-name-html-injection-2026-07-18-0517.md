# W1 gap/fluidity: nycmaid client-confirmation email's cleaner name was unescaped HTML

**Date:** 2026-07-18 05:17
**Surface:** `clientConfirmationEmail()` in `src/lib/nycmaid/email-templates.ts` —
the live booking-confirmation email sent to a real customer of the `nycmaid`
tenant (thenycmaid.com).

## The bug

`cleaner?.name` (the assigned team member's name, `booking.team_members.name`
/ `booking.cleaners.name`) traces back to `team_applications.name` via
`provisionApprovedApplicant()` in `src/lib/team-provisioning.ts:58`
(`name: app.name || 'Team Member'`) — copied **verbatim, unsanitized, no
length cap** from an approved job applicant's self-submitted `name`. That
`name` is fully attacker-controlled: anyone can submit it through the public,
unauthenticated job-application form (`POST /api/contact`'s job-application
branch, `POST /api/lead`, `POST /api/ingest/application`), all of which
already correctly `escapeHtml()` it in their own admin-notification emails
(this session's earlier fixes, see
`w1-lead-prospects-admin-alert-html-injection-*.md`).

`clientConfirmationEmail(booking)` builds the booking-confirmation HTML email
sent to the **customer** (a different, uninvolved party from the cleaner) once
a booking is confirmed. Inside it, `cleanerName` (the full name) is
`escapeHtml()`'d at each of its own usage sites (the "Cleaner:" info row) —
but the sibling `cleanerFirst` (`cleaner.name.split(' ')[0]`, same source
field) was interpolated **raw**, in three places:

- `cleanerPhotoHtml`'s `<img alt="${cleanerFirst}">` — an HTML **attribute**
  context; a `"` in the name breaks out of the attribute and injects
  arbitrary markup/attributes into the `<img>` tag.
- The "What to expect" prose paragraph — HTML **content** context, used 3x:
  `${cleanerFirst} will arrive...`, `Once ${cleanerFirst} arrives...`,
  `let ${cleanerFirst} know...`.
- The supplies `noteBox`: `'All supplies included! ' + cleanerFirst + ' will
  bring everything needed...'`.

Confirmed this is the live path, not dead code:
`src/lib/messaging/client-email.ts`'s `confirmationEmail()` /
`confirmationEmailFor()` dispatch to `nycmaidEmail.clientConfirmationEmail`
for the `nycmaid` tenant slug specifically, and are called from real booking
endpoints `POST /api/client/book` and `POST /api/client/recurring`.

Confirms this is a real miss, not an intentional convention: the **parallel
"new" shared template** used for every non-nycmaid tenant
(`bookingConfirmationEmail` in `src/lib/email-templates.ts`) already wraps its
equivalent field correctly — `escapeHtml(data.teamMemberName)` — so the
nycmaid legacy template is the one outlier that never got the same treatment
its own sibling function (and its own `cleanerName`) already has.

## The fix

`src/lib/nycmaid/email-templates.ts` — escape once at the `cleanerFirst`
definition (`escapeHtml((cleaner?.name || 'Your cleaner').split(' ')[0])`),
which covers every downstream usage in this function (verified no usage of
`cleanerFirst` in this function is a plain-text context like an email
`subject`, where escaping would be wrong).

## Continuation checked (same file, same session — not fixed, evidence below)

Read the entire 1145-line file (`src/lib/nycmaid/email-templates.ts`) end to
end and catalogued every function for the same cross-party unescaped-field
pattern:

- **Confirmed dead code, left untouched:** `clientPaymentDueEmail`,
  `adminDailyNotificationDigestEmail`, `adminPendingRemindersEmail`,
  `adminDailyOpsRecapEmail` — each has the identical bug shape (unescaped
  `cleanerName`/`client_name`/`e.client`/`j.clientName` reaching a
  cross-party inbox) but a repo-wide grep for actual call sites (not just the
  `export function` definitions, which exist here and duplicated across 4
  per-tenant `src/app/site/*/​_lib/email-templates.ts` clones) found **zero**
  callers anywhere in the codebase. Not fixed — fixing unreachable code isn't
  a real security fix and would misrepresent this as closing a live gap when
  no user is ever affected. Flagged here in case these get wired up later.
- **Self-only interpolations, left untouched (consistent, low severity):**
  every client-facing function's own unescaped `clientName`/`firstName`
  (`clientReminderEmail`, `clientCancellationEmail`, `clientThankYouEmail`,
  `verificationCodeEmail`, etc.) and every cleaner-facing function's own
  unescaped `firstName` (`cleanerAssignmentEmail`, `cleanerCancellationEmail`,
  `cleanerDailySummaryEmail`, `cleanerRescheduleEmail`, `cleanerWelcomeEmail`)
  and every referrer-facing function's own unescaped `firstName`
  (`referralWelcomeEmail`, `referralCommissionEmail`,
  `referralSignupNotifyEmail`) — each of these emails a party their OWN name
  back to themselves. Self-XSS against your own inbox is not a real privilege
  boundary crossing (no other party is affected), and this pattern is
  consistent across every function in the file, not an isolated miss. Left
  alone.
- Every other cross-party field in every other function in the file
  (`newBookingAdminEmail`, `adminNewBookingRequestEmail`,
  `adminRescheduleEmail`, `cleanerAssignmentEmail`'s `Client / Cliente` row,
  `cleanerRescheduleEmail`'s `Client / Cliente` row,
  `cleanerCancellationEmail`'s `Client / Cliente` row,
  `cleanerDailySummaryEmail`'s per-job client name + notes,
  `newReferrerAdminEmail`, `adminNewClientEmail`) was already correctly
  `escapeHtml()`'d. No other live instance of this bug found in this file.

Not swept this round: the ilike-wildcard-injection bug class was checked as a
candidate fresh surface first (grepped every `.ilike()` call site in the repo)
— all exact-match call sites are already covered by the enforced
`like-wildcard-routes.test.ts` invariant, and the remaining unescaped-looking
call sites (`selena/tools.ts`'s `handleLookupClient`/`handleLookupCleaner`,
`admin/ai-chat`, `ai/assistant`, `jefe/actions.ts`, `cron/health-monitor`) are
all intentional `%term%` substring searches per `postgrest-safe.ts`'s own
documented distinction — a caller-controlled `%`/`_` there just broadens an
already-open substring search within the tenant scope, not a matching-
semantics bypass, so not the same bug class. Also checked: no admin API route
missing an auth pattern (4 initial greep hits — `system-check`,
`payments/finalize-match`, `selena/monitor`, `google/callback` — all
independently gated via admin-cookie verification, internal-key
`safeEqual()`, or signed OAuth state). Also checked: no narrow-space
random-generator-without-retry instance outside what's already fixed this
session (`document_signers.public_token` is `randomBytes(24)`, 192 bits, no
realistic collision risk; `bookings.client_confirm_token` is dead — no
insert site anywhere sets it).

## Verification

- New test file:
  `src/lib/nycmaid/email-templates.client-confirmation-html-escape.test.ts`
  (4 tests, direct unit tests on the template function — no route/mock
  scaffolding needed since this is a pure function).
- RED-confirmed: reverted the fix via
  `git diff src/lib/nycmaid/email-templates.ts > /tmp/w1-nycmaid-email-templates-fix.patch &&
  git apply -R ...` (file-scoped patch revert), reran the suite: 3/4 failed
  for the exact predicted reason (raw payload present, escaped form absent);
  the 4th (benign-name positive control) correctly passed under old code too.
  First revision of the test used multi-word payloads
  (`'Attacker" onerror="alert(1)'`) that silently passed under BOTH old and
  new code — caught before finalizing: `cleanerFirst` is
  `cleaner.name.split(' ')[0]`, so a payload containing a plain space gets
  truncated before it ever reaches the template, making the assertion
  vacuous. Rewrote with single-token payloads
  (`'x"onerror="alert(1)'`, `<script>alert(1)</script>`, both space-free) and
  reconfirmed the RED/GREEN discrimination actually holds. Restored via
  `git apply` (forward), reran: all 4 pass.
- `tsc --noEmit --pretty false`: same 5 pre-existing baseline errors only
  (admin-auth route type gen, cron/outreach + cron/payment-reminder tests,
  sunnyside-clean-nyc site-nav), none touching this round's files.
- `eslint` on touched files: 0 errors (18 pre-existing `any` warnings on
  untouched lines in the same file, all pre-dating this change).
- Full suite: 651/651 files, 3426 passed + 1 pre-existing expected-fail (3427
  total), 0 regressions.

## Continuation (surface (1) follow-through)

Checked the other live nycmaid-dispatch target on the exact same code path
(`src/lib/messaging/client-email.ts`'s `bookingReceivedEmail()` →
`nycmaidEmail.clientBookingReceivedEmail`) for the same shape — it never
references the cleaner (no cleaner is assigned yet at the "received/pending"
stage), so there's no equivalent field to leak. Also checked the "new" shared
`teamApplicationApprovedEmail` (`src/lib/email-templates.ts`, sent to the
applicant about themselves on approval) — already escapes every field,
including its own self-only `firstName`, unlike the nycmaid legacy
convention. Also checked whether the 4 per-tenant clone files
(`src/app/site/{wash-and-fold-hoboken,wash-and-fold-nyc,nyc-mobile-salon,the-nyc-interior-designer}/_lib/email-templates.ts`)
that duplicate this same dead-code function set are themselves imported
anywhere in their respective tenant site trees — repo-wide grep found zero
importers for all 4; confirmed dead, not a live continuation. No further live
instance of this bug found.

File-only. No push/deploy/DB. `tenant_domains` schema lane (this worker's
nominal owned lane) untouched this round, no drift.
