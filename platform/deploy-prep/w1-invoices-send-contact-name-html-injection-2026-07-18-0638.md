# W1 fresh-ground: invoice-send email's greeting line skipped escapeHtml on contact_name — the one field out of seven that got missed

**Date:** 2026-07-18 06:38
**Surface:** `POST /api/invoices/[id]/send` (`src/app/api/invoices/[id]/send/route.ts`) — the
customer-facing "send this invoice" action every finance-permitted dashboard
user hits, and the endpoint `cron/generate-monthly-invoices`-style automation
would call too.

## The bug

`renderInvoiceEmail()` builds the outbound invoice HTML email and interpolates
seven fields into the template: `invoiceNumber`, `title`, `businessName`
(×2), `amountDue`, `total`, and `dueDate`. Every one of those goes through
this file's own local `escapeHtml()` helper. The eighth field, `contactName`,
did not:

```ts
const greeting = opts.contactName ? `Hi ${opts.contactName},` : 'Hi there,'
...
<p ...>${greeting}</p>
```

`invoice.contact_name` is not staff-typed free text most of the time — when
an invoice is created `from_booking_id` (the normal flow), `POST
/api/invoices` prefills it straight from `booking.clients.name`
(`src/app/api/invoices/route.ts:98`), i.e. the exact same self-submitted,
unsanitized public-booking-form field (`client/book/route.ts`, `name:
body.name as string`) already established this session as the untrusted
source behind the referral-commission-email and nycmaid-cleaner-name HTML
injection fixes. `from_quote_id` prefill (`quote.contact_name`) traces to the
same lineage.

This is the exact same class already found and fixed on the sibling `POST
/api/quotes/[id]/send` this session (`src/app/api/quotes/[id]/send/route.ts`,
see its own inline comment: *"contact_name/title are caller-writable on POST
/api/quotes... escape before HTML interpolation so a malicious name/title
can't inject markup into the real outbound email"*) — but that fix was never
propagated to the parallel invoice-send route, which has the identical
`contact_name` → greeting → raw-HTML shape and was missed.

Exploitation: an attacker submits a public booking with `name` set to
`<img src=x onerror=alert(document.cookie)>`. Staff (or automation) later
generates an invoice `from_booking_id` without overriding `contact_name` —
the default UI path — and sends it. `to_email` defaults to
`invoice.contact_email` (normally the same client, i.e. self-XSS by
default), but this same endpoint lets the caller redirect delivery via
`body.to_email` to any address (re-sends to a shared AR/billing inbox, a
bookkeeper, a forwarded copy) — at that point the injected markup lands
unescaped in a genuinely different party's inbox, the same cross-party shape
the quotes fix targeted.

## The fix

One-line change, no behavior change for legitimate names:

```ts
const greeting = opts.contactName ? `Hi ${escapeHtml(opts.contactName)},` : 'Hi there,'
```

## Verification sweep (item 2: does the same "some fields escaped, one forgotten" shape exist elsewhere?)

Grepped every local `function escapeHtml` definition across `src/app/api`
(6 files: `inquiry`, `invoices/[id]/send`, `admin/comhub/send`, `requests`,
`documents/[id]/send`, `cron/comhub-email`) and manually confirmed every
interpolated field in each file's HTML-building function is wrapped —
`invoices/[id]/send` was the sole outlier. Also spot-checked every file
importing the shared `@/lib/escape-html` helper that builds a caller-facing
HTML email (`admin/requests/[id]/agreement`, `prospects`, `leads`,
`bookings/batch`, `admin/invites`, `quotes/[id]/send`) — all consistently
escape every interpolated field. `client/reschedule/[id]/route.ts` and
`portal/bookings/[id]/route.ts` interpolate `tenant.name` unescaped into
email bodies, but that's business-owner-set data reflected to their own
customers (self-inflicted, not the cross-party shape this session treats as
in-scope), not a new instance of this pattern.

Also swept `.eq('phone'|'email', ...).single()` sites (the "no unique
constraint, duplicate row throws" class already fixed on `portal/auth` and
`webhooks/telnyx`) across `pin-reset`, `client/book`, `clients`,
`admin-chat`, `webhooks/telnyx-voice`, `webhooks/telegram(-tenant)` — all
already use `maybeSingle()`/`limit(n)` correctly; no new instance found.

Verification: new test `route.xss.test.ts` (2 tests — payload gets escaped
in the greeting; absent-name path still renders "Hi there,"). Full vitest
664/664 files, 3455 passed + 1 pre-existing expected fail (3456) — was
663/663, 3453+1 (3454) before this pass — net +1 file/+2 tests, 0
regressions. `tsc --noEmit`: same 4 pre-existing baseline errors only
(`admin-auth` route typing, two unrelated cron test spread-argument errors,
`sunnyside-clean-nyc` site-nav import), 0 new.

File-only, no push/deploy/DB.
