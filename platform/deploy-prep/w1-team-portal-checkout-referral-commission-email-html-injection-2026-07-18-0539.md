# W1 gap/fluidity: NYC Maid referral-commission-earned email leaked the client's name as raw HTML

**Date:** 2026-07-18 05:39
**Surface:** `POST /api/team-portal/checkout` — the live check-out endpoint every
NYC Maid cleaner hits from the team portal app at the end of a job
(`src/app/api/team-portal/checkout/route.ts`), specifically its NYC-Maid-only
"notify the referrer by email" side effect.

## The bug

When a completed booking has a `referrer_id`, checkout inserts a
`referral_commissions` row and (nycmaid tenant only) emails the referrer that
they earned a credit. That email is built as an **ad-hoc inline HTML
template literal** right in the route, instead of going through the
already-existing, already-escaped `referralCommissionEmail()` template in
`src/lib/nycmaid/email-templates.ts` (same file whose sibling
`cleanerFirst` bug this session's earlier fix closed). The inline version
interpolates `clientName` — `booking.clients.name`, self-submitted verbatim
on the public booking form (`client/book/route.ts:137`,
`name: body.name as string`, no sanitization at write) — **raw** into the
HTML body sent to the referrer:

```ts
await sendEmail(
  ref.email,
  'You earned a referral commission',
  `<p>Hi ${ref.name || 'there'}, you just earned $${...} from ${clientName || 'a'} booking. ...</p>`,
)
```

The referrer is a **different party** from the client — exactly the
cross-party shape already fixed this session for nycmaid's
`clientConfirmationEmail` (`cleanerFirst`) and its own `admin-alert`
functions: an attacker submits a booking with `name` set to
`<img src=x onerror=alert(document.cookie)>` (or any markup), then refers a
friend/uses their own referral code so the booking carries a `referrer_id`.
On checkout, that markup lands unescaped in a real email the referrer's mail
client renders as HTML — arbitrary script/markup injection into a
real person's inbox, not a self-inflicted no-op.

Confirmed the *proper* template doesn't have this bug at all:
`referralCommissionEmail()` in `email-templates.ts` never references the
client's name in the first place (only commission amount, booking total, and
the referrer's own first name) — so the inline duplicate in the checkout
route isn't just unescaped, it's a divergent reimplementation that added a
field (and a bug) the real template deliberately doesn't have.

`sendEmail()` (`src/lib/nycmaid/email.ts`) takes `html` as a raw string and
passes it straight to Resend — no escaping happens inside it; the caller is
fully responsible, same as every other call site audited this session.

## The fix

`src/app/api/team-portal/checkout/route.ts` — wrap `clientName` in
`escapeHtml()` (imported from `@/lib/escape-html`, the same helper used
throughout `nycmaid/email-templates.ts`) at the point it's interpolated into
the email HTML. `escapeHtml(null)` returns `''`, so the existing
`|| 'a'` fallback (for a referral commission with no resolvable client name)
is preserved exactly.

Deliberately **left `ref.name` unescaped** — the referrer's own name in
their own commission email is the same self-only shape this session's
earlier nycmaid doc catalogued as an accepted, consistent convention across
every function in this file family (self-XSS against your own inbox is not
a privilege-boundary crossing). Only the cross-party field was in scope.

## Continuation checked (same bug class, closes the search)

Grepped every direct importer of `sendEmail` from `@/lib/nycmaid/email`
(the raw, unescaped-by-default sender — as opposed to the pre-escaped
template functions in `email-templates.ts`) for the same ad-hoc-inline-HTML
shape:

- **`src/app/api/cron/phone-fixup/route.ts`** — inlines `c.name` (the
  team member's own name) into their own phone-confirmation email. Self-only,
  same accepted convention. Clean.
- **`src/app/api/cron/comhub-email/route.ts`** (`sendReply()`) — already
  wraps its dynamic content in `escapeHtml()` at both of its HTML-building
  sites (`escapeHtml(p)` for the tenant-Resend path, `escapeHtml(text)` for
  the nycmaid-env-fallback path). Clean, no fix needed.

No other live call site constructs an inline HTML email outside
`email-templates.ts`'s own (already-escaped) template functions.

Also swept the broader `clientName` variable across every `src/app/api`
call site (69 matches) for the same shape: every other usage either (a)
feeds `nmSmsAdmins`/`sendSMS` (plain-text SMS, not HTML-rendered, not this
bug class), or (b) feeds `notify({..., message: ...})`, which inserts into
the `notifications` table — confirmed rendered in the dashboard via React
JSX text children (`{n.message}` in
`src/app/dashboard/notifications/page.tsx:105`), which auto-escapes; not
`dangerouslySetInnerHTML` anywhere in that render path. Neither shape is
exploitable the way a raw HTML **email** body is. No other live instance of
this specific bug (unescaped cross-party field in an ad-hoc HTML email
string) found.

## Verification

- New test file:
  `src/app/api/team-portal/checkout/route.referral-commission-email-escape.test.ts`
  (2 tests) — mocks `@/lib/supabase` (bookings/referrers/referral_commissions/
  notifications), `@/lib/nycmaid/email`'s `sendEmail` as a spy, and every
  other side-effect import (`processPayment`, `sendPushToClient`, `smsAdmins`,
  `bumpReferrerTotal`) so the test exercises only the email-escaping path.
  One test asserts a `<script>` payload in `clientName` reaches the email
  HTML in its escaped form and never in raw form; the other asserts the
  referrer's own (self-only) name is deliberately left as-is, locking the
  fix's scope so a future pass doesn't "improve" it into over-escaping.
- RED-confirmed: reverted the fix via
  `git diff src/app/api/team-portal/checkout/route.ts > /tmp/w1-checkout-fix.patch &&
  git apply -R /tmp/w1-checkout-fix.patch` (file-scoped patch revert, not
  `git stash` — stash is disabled in worker worktrees since all 4 share one
  `.git` dir), reran: the escaping test failed for the exact predicted reason
  (raw `<script>alert(1)</script>` present in the captured email HTML,
  escaped form absent); the self-name test correctly passed under old code
  too (that field was never touched). Restored via `git apply` (forward),
  reran: both pass, plus the two pre-existing sibling test files in the same
  directory (`route.double-checkout.test.ts`,
  `route.recurring-discount.test.ts`) — 8/8 total, 0 regressions.
- `tsc --noEmit --pretty false`: same pre-existing baseline errors only
  (admin-auth route type gen, cron/outreach + cron/payment-reminder tests,
  sunnyside-clean-nyc site-nav) — none touching this round's files. (First
  pass surfaced 4 *new* errors from the test's `sendEmail` spy losing its
  parameter types under `vi.fn()`'s inference; fixed by typing the spy's
  implementation signature explicitly rather than casting the assertion
  site.)
- `eslint` on touched files: 0 errors (3 pre-existing-pattern warnings —
  intentionally-unused, underscore-prefixed mock parameters in the new test
  file, same convention already used elsewhere in this codebase, e.g.
  `deposit-checkout/route.ts`'s `_request`).
- Full suite: 652/652 files, 3428 passed + 1 pre-existing expected-fail
  (3429 total), 0 regressions.

File-only. No push/deploy/DB. `tenant_domains` schema lane (this worker's
nominal owned lane) untouched this round, no drift.
