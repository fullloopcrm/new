# Broad-hunt sweep — 22:51 order — W4, 2026-07-15

File-only. No push/deploy/DB. Lower-risk surface per leader order: continued
the "unescaped user-controlled field in outbound HTML email" class from the
22:44 pass (`deploy-prep/w4-broad-hunt-2026-07-15-2244-email-html-injection-sweep.md`),
which fixed the three call-site interpolation gaps found in route files but
explicitly did not re-audit `lib/email-templates.ts`'s own template
functions ("HTML comes from pre-built template functions ... did not
re-audit the template functions themselves this pass").

## Method

Read all 14 exported template functions in `src/lib/email-templates.ts`
end-to-end. The file already escapes the overwhelming majority of
user-supplied fields via the shared `escapeHtml()` (13 of ~16 distinct
user-text fields across the file) — used that as the baseline convention
and looked for the fields that broke it.

## Fixed this pass

Three gaps, same class as the 22:44 fixes (stored HTML injection into an
email body — opens in the recipient's mail client only, no session/cookie
theft, no cross-tenant reach):

- **`dailyOpsRecapEmail`** (`todayRows`/`tomorrowRows` table builders):
  `j.clientName` and `j.teamMemberName` were interpolated unescaped into
  `<td>` cells, while every sibling booking-related template in this same
  file (`bookingConfirmationEmail`, `bookingReminderEmail`, etc.) escapes
  the equivalent fields. `j.time`/`j.revenue`/`j.paymentStatus` are
  server-formatted values, left as-is. Currently dead-reachable in
  production — grepped all callers of this export and it's only invoked by
  `test-emails/route.ts` with hardcoded test data (`todayJobs: []`); `notify.ts`
  imports it but never calls it. Fixed anyway for defense-in-depth
  consistency, since `clientName` is exactly the kind of field
  (client-supplied via the public booking flow) that becomes attacker-reachable
  the moment this template gets wired to a real caller — cheaper to fix now
  than to rediscover later.
- **`notificationDigestEmail`** (`rows` table builder): same situation —
  `e.type`, `e.recipient`, `e.channel` unescaped; `e.time` left alone
  (formatted timestamp). Same dead-reachable-today status (only
  `test-emails/route.ts`, hardcoded data).
- **`teamApplicationApprovedEmail`**: `firstName` (derived from
  `data.applicantName.split(/\s+/)[0]`) was interpolated unescaped into
  both the English and Spanish greeting lines. Traced the real caller
  (`lib/team-provisioning.ts:107`, called from `team-applications/route.ts`
  and `team-applications/bulk-approve/route.ts`) — `applicantName` is the
  public applicant's own self-submitted name, and the email is sent only to
  `app.email` (the same applicant's own address) — self-XSS-only, same risk
  tier as the `apply-ceo` finding fixed last pass. `portalUrl` in this same
  template is server-built from `tenantSiteUrl()` (not user input), left
  as-is — not a gap.

Applied `escapeHtml()` (already imported at the top of the file) to each;
no new utility code.

## Checked this pass, clean — no fix needed

- **`adminNewClientEmail`, `adminNewBookingRequestEmail`,
  `referralSignupNotifyEmail`**: all route every user-text field through a
  local `row()`/inline helper that already wraps the value in
  `escapeHtml()` — confirmed by reading the helper definitions, not just
  the call sites.
- **`data.tenantName`** used unescaped throughout every template — comes
  from `tenants.name`, admin/onboarding-set, not reachable from any
  public-input form; same trust boundary already established in prior
  sweeps for tenant config fields.
- **`data.dateTime`** in `bookingReminderEmail`/`bookingConfirmationEmail`:
  inline comment already documents this is intentionally unescaped
  (pre-built HTML fragment from `bookings/broadcast/route.ts`, which
  escapes its own inputs before building the fragment) — pre-existing,
  documented, not a new gap.
- **`data.supportPhone`/`ten` digits** in `teamApplicationApprovedEmail`:
  tenant-config phone number, regex-stripped to digits before use in
  `href="sms:..."` — not user input.

## Verification

- `npx tsc --noEmit`: clean (same pre-existing unrelated
  `bookings/broadcast/route.xss.test.ts` mock-typing failure noted in every
  prior report, unaffected by anything touched here).
- No dedicated test file exists for `email-templates.ts` or
  `team-provisioning.ts`. `notify.happy-path.test.ts` mocks
  `dailyOpsRecapEmail`/`notificationDigestEmail` directly
  (`() => '<p>x</p>'`), so the edit doesn't affect it — ran it anyway:
  `npx vitest run src/lib/notify.happy-path.test.ts` → 3 passed.

File-only, no push/deploy/DB.
