# Broad-hunt sweep — 22:44 order — W4, 2026-07-15

File-only. No push/deploy/DB. Lower-risk surface per leader order: continued
the "unescaped user-controlled field in outbound HTML email" class flagged
but not fixed in the 22:23 pass (`deploy-prep/w4-broad-hunt-2026-07-15-2323.md`,
`apply-ceo/route.ts` finding) rather than opening a new bug class.

## Method

Grepped every `route.ts` under `src/app/api` that calls `sendEmail(` or
builds an `html:` payload, then filtered out the ones that already import
`escapeHtml` from `@/lib/escape-html`. Manually read each remaining hit to
tell "interpolates a real user-supplied string" apart from "interpolates a
server-generated value (OTP code, formatted date, tenant-config name)" —
only the former is a real gap.

## Fixed this pass

All three are stored-HTML-injection into an email body (severity: opens in
the *recipient's* mail client, not the live app — no session/cookie theft,
no cross-tenant reach — hence "lower-risk" per the leader order, but still
a real gap matching the exact class already fixed repeatedly elsewhere in
this codebase: `contact`, `inquiry`, `booking-broadcast`). Fixed by wiring
in the existing shared `escapeHtml()` from `lib/escape-html.ts` (same util
`inquiry/route.ts` and 4 other routes already use) — no new utility code.

- **`apply-ceo/route.ts:111`** (carried over from the 22:23 report, not
  fixed there): applicant-confirmation email interpolated
  `name.split(' ')[0]` and `tenant.name` unescaped into the `<h2>`/footer,
  while the sibling `contact`/`inquiry` routes already escape every field.
  Confirmed self-XSS-only (email sent only to the address the same
  submitter supplied) but fixed for the defense-in-depth consistency the
  prior report flagged.
- **`prospects/route.ts:143-152`** (`/api/prospects`, public "qualify"
  form, no auth): the admin-alert email's `summary` block interpolated
  `body.business_name`, `body.trade`, `body.owner_name`, `body.owner_email`,
  `body.owner_phone`, `body.primary_city/state/zip`, `body.tier_interest`,
  `body.launch_timeline` — all raw public POST input — directly into a
  `<pre>` block with zero escaping. Unlike `apply-ceo`, this one goes to
  the **platform admin's** inbox, not the submitter's own — a genuine (if
  mail-client-scoped) HTML injection an anonymous caller could use against
  admin tooling. Escaped all eight fields.
- **`team-portal/checkout/route.ts:168`** (NYC Maid referral-commission
  email): interpolated `ref.name` (referrer's own profile name) and
  `clientName` (`booking.clients.name`, settable via the public client
  booking flow) unescaped into the referrer's "you earned a commission"
  email. Escaped both.

## Checked this pass, clean — no fix needed

- **`admin/requests/[id]/proposal-email/route.ts`** → `lib/proposal-email.ts`:
  already escapes `businessName`/`contactName`/`territoryName` with an
  inline comment explicitly citing this exact stored-XSS class (values
  originate from the public partner-request form and are rendered via
  `document.write` in the admin preview) — already hardened, not a gap.
- **`feedback/route.ts`**: inline `.replace(/</g,...).replace(/>/g,...)` on
  the anonymous feedback `message` before interpolation — functionally
  equivalent escaping already in place (not using the shared util, but
  correct for the text-node context it's used in).
- **`client/reschedule/[id]/route.ts`**: only interpolates `tenant.name`
  (admin-set, not attacker-reachable from this route) and
  `fmtDate`/`fmtTime` output (server-formatted `Date` strings, not raw
  text) — no injectable field.
- **`cron/phone-fixup/route.ts`**: interpolates `c.name` (team member's own
  name, set by tenant admin at onboarding, not public-input-reachable) into
  an email sent to that same team member — self-target, and the field
  isn't attacker-controlled from any public surface either.
- **`referrers/auth/request/route.ts`**: interpolates a generated numeric
  OTP `code` and `t.name` (tenant config, not per-request user input) —
  no gap.
- **`portal/auth/route.ts`, `pin-reset/route.ts`**: interpolate only a
  generated OTP code — no gap (these were in the original candidate list
  purely because they don't import `escapeHtml`, not because they have
  unescaped user text).
- **`client/book/route.ts`, `campaigns/[id]/send/route.ts`,
  `dashboard/comms-preview/route.ts`, `test-emails/route.ts`**: HTML comes
  from pre-built template functions / admin-authored campaign content, not
  raw request-body interpolation at the call site — no gap found at this
  layer (did not re-audit the template functions themselves this pass).

## Verification

`npx tsc --noEmit` clean (only the same pre-existing unrelated
`bookings/broadcast/route.xss.test.ts` mock-typing failure noted in every
prior report, unaffected by anything touched here). No tests exist for any
of the three edited routes, so none needed updating.

File-only, no push/deploy/DB.
