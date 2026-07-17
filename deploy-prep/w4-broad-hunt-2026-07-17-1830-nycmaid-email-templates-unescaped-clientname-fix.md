# W4 broad hunt — 18:30 pass: unescaped client/cleaner name in nycmaid's own email-templates.ts (live, unauthenticated-reachable)

Per 18:16 LEADER order item 1 (new fresh-ground surface). File-only, no
push/deploy/DB.

## Surface selection

The 18:15 checkpoint's `seo/*` gap led nowhere new (SIGNAL is FL's own
internal, `requireAdmin()`-gated SEO engine — not multi-tenant client-facing,
so the usual authz/injection bug classes don't apply there). Pivoted to a
class this session has fixed twice already in the top-level
`src/lib/email-templates.ts` (2026-07-15 22:44 and 22:51 passes:
"unescaped user-controlled field in outbound HTML email") — but neither pass
touched **`src/lib/nycmaid/email-templates.ts`**, a same-named, separately-
maintained 1139-line sibling file for the `nycmaid` tenant's own richer email
templates. Same filename pattern, easy to miss; confirmed via grep this file
had zero prior mentions across any `deploy-prep/*.md` in this session.

## Bug (fixed): attacker-controlled `clients.name` rendered unescaped in the client's own confirmation emails

Traced the live path: `POST /api/client/book` (`src/app/api/client/book/
route.ts`) is a public, unauthenticated, rate-limited (3/10min/IP) endpoint.
On a new lead it inserts `name: body.name as string` into `clients.name`
verbatim (line 123) — **zero sanitization**, fully attacker-controlled. That
booking then goes through `bookingReceivedEmail()`/`confirmationEmail()`
(`src/lib/messaging/client-email.ts`), which for the `nycmaid` tenant
(`isNycmaid()` check) delegates to `nycmaidEmail.clientBookingReceivedEmail()`
and `nycmaidEmail.clientConfirmationEmail()` — both in the file this pass
found unaudited.

Both functions derived `clientName` from `booking.clients?.name?.split(' ')
[0]` and interpolated it **unescaped** into the email HTML (`Hi ${clientName}
...`), even though the same file already imports and uses `escapeHtml()`
elsewhere in these exact functions (e.g. `booking.clients.email` is escaped
two lines away) — the identical inconsistent-escaping shape already fixed in
the sibling file's `dailyOpsRecapEmail`/`notificationDigestEmail`/
`teamApplicationApprovedEmail`. `clientConfirmationEmail` additionally left
`cleanerFirst` (derived from `booking.cleaners?.name`) unescaped in six
places while escaping the full `cleanerName` in one (the `infoRow('Cleaner',
...)` call) — same partial-escaping pattern.

Unlike the prior two passes' findings (which were confirmed dead-reachable
today, fixed only for defense-in-depth), **this one is live**: the HTML
lands in an email sent via `sendEmail()` to `data.clients.email` — the same
address the attacker just supplied — so it renders in that recipient's own
mail client. Self-reaching (not cross-tenant, not session/cookie theft), the
same risk tier this session has repeatedly still fixed rather than leaving
open (matches the `apply-ceo`/`teamApplicationApprovedEmail` precedent from
the 22:51 pass).

**Fix:** wrapped `clientName` (both functions) and `cleanerFirst`
(`clientConfirmationEmail`) in the file's own `escapeHtml()` at their
declaration sites, so every downstream interpolation is covered in one edit
each — no template-body changes needed.

## Scope check — why only these two functions

The file defines 27 exported template functions but only 3 files import from
it at all: `messaging/client-email.ts` (calls `clientBookingReceivedEmail`
and `clientConfirmationEmail` only), `selena/core.ts` and `cron/phone-fixup/
route.ts` (both import only the `emailWrapper` helper, not any of the
25 other content-generating functions). Confirmed via grep that none of the
other 25 functions (`clientRatingPromptEmail`, `clientReminderEmail`,
`adminDailyOpsRecapEmail`, etc.) have any caller anywhere in the app,
including `test-emails/route.ts` (which, unlike the top-level sibling file,
doesn't reference this file at all) — genuinely dead code, not
dead-reachable-via-test like the prior passes' findings. Left unfixed,
matching this session's bar against padding busywork into unreachable code.

## Related dead code found, not fixed (flagging only)

While tracing reachability, found **four more full-file forks** of this same
template set, one per legacy per-tenant site clone: `src/app/site/
nyc-mobile-salon/_lib/email-templates.ts`, `.../wash-and-fold-hoboken/_lib/
email-templates.ts`, `.../wash-and-fold-nyc/_lib/email-templates.ts` (all
~1000 lines, near-identical copies — diffed a sample function against the
nycmaid original to confirm), and `.../the-nyc-interior-designer/_lib/
email-templates.ts` (498 lines, smaller/adapted). All four export the same
`clientBookingReceivedEmail`/`clientConfirmationEmail`/etc. shape and (spot-
checked wash-and-fold-nyc's copy) have the *same or worse* escaping gaps —
that clone even dropped the `escapeHtml()` wrap on `clients.email` that the
nycmaid original still has. **Confirmed via grep: zero importers anywhere in
the app for any of the four files** — none of these tenants' booking flows
route through them (the shared `/api/client/book` + `messaging/client-
email.ts` only special-cases `nycmaid`; every other tenant, including these
four, falls through to the already-audited shared `../email-templates.ts`).
Genuinely dead, not a live gap — consistent with `platform/CLAUDE.md`'s
"Known debt" section already calling out `wash-and-fold-nyc`/`wash-and-fold-
hoboken` as pre-GLOBAL-rule clones slated for deletion after an auth/routing
cutover Jeff hasn't run yet. Not fixed (would be busywork on dead code); not
deleted (out of scope for this pass, and the CLAUDE.md doc is explicit that
the clones can't be removed before that cutover happens — deleting files
that also serve those tenants' `(app)/admin` and `(app)/dashboard` routes
would need the same care). Flagging as a cleanup candidate for whoever
executes that migration, since it's ~3500 lines of dead, security-stale
duplicate code riding along.

## Verification

- RED-confirmed: wrote `src/lib/nycmaid/email-templates.xss.test.ts` (2
  tests, one per fixed function, payload `<img/src=x/onerror=alert(1)>` —
  no spaces, since these templates derive first name via `.split(' ')[0]`
  and a spaced payload would get truncated before the vulnerable
  interpolation, masking the bug). `git apply -R` on the source-only diff
  reproduced both failures (raw payload present in output); `git apply`
  (re-applying the fix) turned both green.
- `npx tsc --noEmit`: clean (same two pre-existing, unrelated baseline
  errors this session has repeatedly noted: `bookings/broadcast/
  route.xss.test.ts` mock-callable issue, `sunnyside-clean-nyc/_lib/
  site-nav.ts` import mismatch).
- `npx vitest run src/lib/nycmaid/ src/app/api/client/book/
  src/lib/messaging/`: 70/70 passed, no regressions.

No push/deploy/DB this pass.
