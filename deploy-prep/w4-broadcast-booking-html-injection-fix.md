# W4 broad-hunt — booking-broadcast HTML injection fix

**Date:** 2026-07-15, ~21:53
**Branch:** p1-w4
**Commit:** 7ec95e79

## Finding

`POST /api/bookings/broadcast` (staff-triggered, gated on `bookings.create`,
used to urgently ping all active team members about an open job) built its
own ad-hoc HTML email inline — **not** via the escapeHtml-wrapped helpers in
`lib/email-templates.ts` — interpolating `client.address`, `booking.service_type`,
and `booking.notes` directly into a raw HTML template literal with zero
escaping, then passed that HTML through `notify()` to every active team
member's inbox (`recipientType: 'team_member'`).

All three fields trace back to `POST /api/client/book`, a fully public,
unauthenticated booking form (`body.address`, `body.notes`, service
selection). A client submitting `<img src=x onerror=...>` (or any HTML) in
their name/address/notes at booking time gets it stored verbatim; the next
time a dispatcher/admin (an authenticated but unwitting staff member) hits
"broadcast this job," the unescaped payload renders live in a **different,
legitimate team member's** email client. This is stored HTML injection into
a third party's inbox, not self-XSS — the attacker (public booking
submitter) never sees their own payload; a team member does.

Confirmed via full trace: `client/book/route.ts` → `bookings` insert →
`bookings/broadcast/route.ts` reads `booking.notes`/`booking.service_type`/
`clients(address)` → builds `broadcastHtml` → `notify({ type:
'booking_reminder', message: broadcastHtml, recipientType: 'team_member' })`
→ `notify.ts`'s switch maps `message` straight into `bookingReminderEmail`'s
`dateTime` field (itself unescaped) → sent via Resend.

## Fix

- `bookings/broadcast/route.ts`: wrapped `client?.address`, `booking.service_type`,
  `booking.notes` in `escapeHtml()` (existing `lib/escape-html.ts` helper,
  same one used throughout `nycmaid/email-templates.ts`) at the point they're
  interpolated into `broadcastHtml`.
- `lib/email-templates.ts`: also escaped `clientName`/`serviceName`/`address`/
  `timeUntil`/`teamMemberName`/`discountCode`/`feedbackUrl`/`portalUrl` across
  `bookingReminderEmail`, `bookingConfirmationEmail`, `bookingReceivedEmail`,
  `followUpEmail`, `reviewRequestEmail`, `paymentReceiptEmail` — these fields
  were unescaped in every function in this file except `adminNewClientEmail`/
  `adminNewBookingRequestEmail` (which already used a shared `escapeHtml(v)`
  row helper). Every currently-live caller of these six functions only
  reaches the submitting client's own inbox (recipientType `'client'`,
  sourced from that same client's own row), so on its own this half is
  defense-in-depth/consistency, not a live third-party leak — flagging that
  distinction explicitly rather than overstating severity.
- Left `dateTime` unescaped in `bookingReminderEmail`/`bookingConfirmationEmail`,
  with an inline comment: `bookings/broadcast` deliberately reuses that field
  to smuggle its own pre-built (now-escaped) HTML fragment through the
  template, and blanket-escaping it would double-escape and visually break
  that one caller's rich-HTML broadcast email without adding any security
  benefit (the actual data inside it is now escaped at the source).

## Verification

- New `bookings/broadcast/route.xss.test.ts`: seeds a booking with
  `client.address`/`service_type`/`notes` all set to `<img src=x
  onerror=alert(1)>`, asserts the HTML string passed to `notify()` contains
  the HTML-entity-escaped form and not the raw payload.
- Mutation-verified: `git stash`-reverted `bookings/broadcast/route.ts` only,
  reran the test — RED (raw `<img src=x onerror=alert(1)>` present in the
  outgoing HTML, 3 unescaped hits visible in the diff). Restored the fix,
  reran — GREEN. `git stash pop` confirmed clean restore.
- `npx tsc --noEmit`: clean.
- Full suite: 358/359 files, 1492 passed + 1 expected-fail + 1 skipped. The
  1 failing file (`cron/tenant-health/status-coverage-divergence.test.ts`)
  is the same pre-existing, unrelated baseline failure noted in every prior
  W1-W4 report this session (confirmed present on a clean stash of my own
  changes too — not caused by this fix). 0 regressions, +1 new passing test.

File-only, no push/deploy/DB. Continuing broad-hunt.
