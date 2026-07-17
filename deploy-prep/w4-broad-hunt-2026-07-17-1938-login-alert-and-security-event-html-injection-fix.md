# W4 broad hunt — 19:38 2026-07-17 — login-alert + logSecurityEvent HTML injection fix

Per the 19:28 LEADER->W4 queue: (1) new fresh-ground surface, (2) continue
whichever surface (1) opens up, (3) keep gap/fluidity current.

## (1) Fresh ground: closing out the residual `src/lib/` file list flagged
in the 19:23 report

Read the 5 files left unread from that report's "worthwhile residual list":
`agreement.ts`, `agreement-pdf.ts` (e-signature), `csv-parse.ts`,
`login-alert.ts`, `deal-delete-guard.ts`, `unsubscribe-token.ts`.

- `agreement.ts`'s HTML `buildAgreement()` interpolates `businessName`/
  `contactName` unescaped into HTML — looked like the same XSS class fixed
  repeatedly today, but traced every caller: zero callers anywhere in the
  app. The real e-sign flow (`/api/admin/requests/[id]/agreement`) uses
  `agreement-pdf.ts`'s `buildAgreementPdf` instead, which draws plain text
  via `pdf-lib` (`page.drawText`, no HTML parsing at all — not injectable),
  and that route already `escapeHtml()`s the two fields it does put into an
  HTML email. Dead code, not a live bug — not touched.
- `csv-parse.ts`, `deal-delete-guard.ts`, `unsubscribe-token.ts` — read in
  full, traced their callers, confirmed clean (delete-guard is correctly
  wired into `DELETE /api/deals/[id]`; unsubscribe-token has proper HMAC +
  `timingSafeEqual` verification, already correctly used).

## Bug found: `sendLoginAlert`'s `alertHtml()` — full write-up

**File:** `src/lib/login-alert.ts`

The admin login-alert email (fires on **every successful** admin/tenant-
admin PIN login, both branches of `POST /api/admin-auth`) built its HTML
with zero escaping on `ip`, `ua` (the raw `user-agent` request header),
`who`, and `brand` (tenant name).

`ua` in particular is fully attacker-controlled — any HTTP client can set
an arbitrary `User-Agent` header. Because the alert only fires *after* a
successful login, the attacker needs a valid PIN already (leaked/stolen
credential, or an insider) — but that's exactly the scenario this alert
exists to catch: it's the "if this wasn't you" notification sent to the
real admin. An attacker with a stolen PIN could craft their `User-Agent`
to inject HTML into that exact email — e.g. spoof the message to read as
routine/expected, or inject a fake "click here to secure your account"
link pointing at an attacker domain — undermining the one control meant to
tip the real admin off at the moment they'd otherwise catch the breach.

**Fix:** wrapped `brand`, `ip`, `timeET`, `ua` (post-truncation), and `who`
in the existing `escapeHtml()` helper (already used elsewhere in the repo
for this exact class of bug, e.g. today's `contact_name` fixes).

**Verification:** new `login-alert.test.ts`, 3 cases (malicious `ua` on the
super-admin path, malicious `who`, malicious tenant `name`/brand on the
tenant-admin path via `emailAdmins`). RED first — all 3 failed against
pre-fix code with the raw payload present verbatim in the generated HTML.
GREEN after the fix — payload absent, escaped form present.

## (2) Continuation: same bug shape elsewhere

Grepped for other HTML-email builders interpolating `ip`/`ua`/user-
controlled labels. Found and fixed one more live instance:

**File:** `src/lib/security.ts` — `logSecurityEvent()`

Same pattern: the critical-security-alert email (`<h2>Security Alert for
${tenant.name}</h2>`, `<p>${event.description}</p>`,
`` `<p><small>IP: ${event.ip}</small></p>` ``) had zero escaping on any of
the three interpolated values.

- `tenant.name` is tenant-owner-controlled (their business name) and is
  live-reachable today: the `critical` event-type gate
  (`['password_change','api_key_change','member_removed',
  'suspicious_login']`) includes `api_key_change`, which
  `PUT /api/settings` fires for real on every sensitive-integration-field
  save — so every tenant whose owner has ever set a hostile business name
  gets that name rendered raw into their own security-alert emails going
  forward. Traced every current caller of `event.description` reaching the
  critical branch (`api_key_change` in `settings/route.ts`): its `field`
  value comes from a fixed allowlist (`sensitiveFields`), not user input —
  so `description` isn't exploitable via any *current* caller. `event.ip`
  is never populated by any current caller either (always `undefined`
  today, so that branch is dead in practice). Fixed all three anyway —
  same defense-in-depth reasoning as choosing to fix `login-alert.ts`'s
  `who`/`ip`/`brand` even where only `ua` was clearly demonstrable: this is
  a shared function any future caller can reach with untrusted content, and
  `tenant.name` is a live, real path today regardless of the other two.

**Verification:** new `security.test.ts`, 3 cases (hostile tenant name via
`api_key_change`, hostile `description` via `suspicious_login`, hostile
`ip` via `password_change` — the latter two exercise currently-dead-in-
practice call shapes deliberately, to prove the function itself is safe
for any future caller, not just today's live one). RED first against
pre-fix code (payload verbatim in all 3), GREEN after.

Grepped further for the same interpolation shape across every other
`ip`/`user-agent`-touching route (52 files) — the only other hit was
`src/app/api/auth/login/route.ts`, which already correctly wraps `ip`/`ua`
in `escapeHtml()` (confirmed clean, not touched). `client/book/route.ts`'s
`bkNotes` embeds raw `ip`/`ua` into a booking's plain-text `notes` column —
traced every render path, confirmed it's only ever shown via React JSX
text interpolation (auto-escaping), never `dangerouslySetInnerHTML` —
correctly a text-storage concern, not an HTML-injection vector. Not
touched.

Widened the search to every other HTML-email-builder file under
`src/lib/` (`selena-legacy-email.ts`, `proposal-email.ts`,
`jefe/actions.ts`, `messaging/shell.ts`) and found one more real instance:

**File:** `src/lib/selena-legacy-email.ts` — `formatHtmlReply()`

Same shape again: `tenant.name` interpolated raw into the signature
footer of every automated AI reply Selena sends to an external
lead/prospect who emails a tenant's monitored inbox (the reply body
itself, `text`, was already correctly manually-escaped — only the
footer's `tenant.name` was missed). A malicious or compromised tenant
owner could set their own business name to inject HTML/phishing content
into every outbound reply their tenant sends to real prospects — a
narrower, self-inflicted-on-your-own-customers threat model than the
other two finds, but the same unescaped-interpolation defect. Fixed with
`escapeHtml()`, exported the previously-file-local `formatHtmlReply` for
a direct unit test (RED confirmed against pre-fix code, GREEN after).

Checked the remaining two (`proposal-email.ts` already correctly uses
`escapeHtml()` throughout; `jefe/actions.ts`'s manual
`message.replace(/</g,'&lt;')` only escapes `<`, not the full character
set, but that alone is sufficient to block any tag from forming — no live
injection possible, so not a bug, just non-canonical style — left as-is).
`messaging/shell.ts` doesn't build attacker-reachable interpolated HTML.

## Verification (all three fixes together)

- `login-alert.test.ts` (3 new tests) + `security.test.ts` (3 new tests) +
  `selena-legacy-email.formatHtmlReply.test.ts` (1 new test): all
  RED-confirmed against pre-fix code, GREEN after.
- Full repo suite: 605/607 files, 2155/2159 tests (1 pre-existing
  unrelated failure — `cron/tenant-health/status-coverage-
  divergence.test.ts`, same baseline every prior report today; 1 expected
  fail, 1 skipped — both pre-existing). A second failure
  (`cron/generate-recurring/route.duplicate-occurrence-race.test.ts`)
  appeared once in the full-suite run — confirmed flaky, not a
  regression: unrelated module (never touched by this diff), and passes
  clean 2/2 in isolation.
- `tsc --noEmit`: same 3 pre-existing unrelated errors
  (`bookings/broadcast/route.xss.test.ts`,
  `sunnyside-clean-nyc/_lib/site-nav.ts` ×2), zero new errors.
- 3 commits (`2c8d8852`, `767328bc`, `5518e45e`), file-only, no
  push/deploy/DB.

## (3) Gap/fluidity

- The `src/lib/` file-by-file walk opened in the 19:23 report is now
  closed out — all 6 residual files read, 3 real bugs fixed
  (`login-alert.ts`, `security.ts`, `selena-legacy-email.ts`, all the same
  unescaped-HTML-interpolation class), 1 confirmed-dead-code non-issue
  (`agreement.ts`), 3 confirmed clean.
- Every `src/lib/` file building an HTML email (`login-alert.ts`,
  `security.ts`, `selena-legacy-email.ts`, `proposal-email.ts`,
  `jefe/actions.ts`, `agreement.ts`, `messaging/shell.ts`) has now been
  read and checked for this specific bug shape this pass — sweep is
  closed, no further leads open in this bug class for this directory.
- No change to the aging-items list from the 18:51 checkpoint (atomic-bump
  migrations, clone dead-code, etc.) — all still pending Jeff/DDL, not
  re-litigated here.
- Next-target candidates for a future fresh-ground pass: this pass covered
  `src/lib/`'s email builders specifically; the equivalent sweep hasn't
  been done for HTML builders under `src/app/api/**` route files directly
  (routes that build their own inline email HTML rather than calling a
  `lib/` helper) — a worthwhile fresh-ground target next.

3 commits this pass (`2c8d8852`, `767328bc`, `5518e45e`). File-only, no
push/deploy/DB.
