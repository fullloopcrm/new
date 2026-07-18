# lead/prospects public-form admin-alert HTML injection — 04:04 order item (1)+(2)

**From:** W1, 04:04 order item (1) new fresh-ground surface + (2) continuation.

## Context

Prior W1 rounds this session closed durable-state (in-memory Map) races and
LIKE-wildcard-injection across `.ilike()` call sites. This round looked for a
sibling class in the same "public unauthenticated form → data reaches a
privileged internal surface" family this session keeps finding: HTML
injection into admin-notification emails.

The codebase has an established, actively-used hardened helper for exactly
this — `escapeHtml()` (`src/lib/escape-html.ts`) — already correctly applied
in `contact/route.ts`, `inquiry/route.ts`, `feedback/route.ts`,
`referrers/auth/request/route.ts`, `messaging/shell.ts`'s `emailShell()`, and
several finance/proposal templates. Before looking for a fresh bug I first
verified this pattern was NOT already exhaustively covered: swept every CSV
export/import site in the repo (5 independent formula-injection-safe
implementations found: `lib/csv.ts` — unused dead code, `lib/finance-export.ts`,
a local copy in `finance/tax-export/route.ts`, and two dashboard client-side
exports in `BookingsAdmin.tsx`/`ContactsPanel.tsx`) — all correctly
neutralize leading `=+-@\t\r`. Fully clean, no live bug, not itself worth a
fix (the `lib/csv.ts` triplication is a minor dead-code note, not fixed).
Also checked redirect handling (google/admin-google OAuth callbacks — same
baseUrl and fixed paths, not exploitable as open redirect), the CPA-token
financial export route (192-bit `randomBytes` token, `requirePermission`-gated
minting, cross-tenant `entity_id` verified — clean), and `admin/websites`
domain handling (already hardened by a prior W2 round). Grepped every file
that calls `sendEmail`/`emailShell`/`sendTenantEmail` for one that builds an
HTML body from public-form input WITHOUT importing `escapeHtml` — that
surfaced two live, unescaped instances.

## Fixed (1): `src/app/api/lead/route.ts` — job-application branch

`POST /api/lead` is a public, unauthenticated, tenant-resolved-by-Host form
(rate-limited only, 5/10min per IP — no content validation). Its
`job-application` branch hand-rolled its own "New Job Application"
admin-notification email:

```
const html = `<h2>New Job Application</h2>
  <p><strong>Name:</strong> ${name}</p>
  <p><strong>Email:</strong> ${email || '—'}</p>
  <p><strong>Phone:</strong> ${phoneRaw || '—'}</p>
  ${notes ? `<pre ...>${notes}</pre>` : ''}
  ...`
```

`name`/`email`/`phoneRaw` are raw form input; `notes` is built by
`buildLeadNotes()`, which folds **any extra field** the caller sends
(`Object.entries(body)`, everything not in a fixed allowlist) into free-form
text — fully attacker-controlled, no length cap on individual field values
before this point. None of the four were escaped. The identical "New
Team/Job Application" email exists in two sibling routes — `contact/route.ts`
(lines 188-193) and `inquiry/route.ts` (lines 113-124) — both of which wrap
every interpolated field in `escapeHtml()`. `lead/route.ts`'s own file header
literally says it's "the standalone /api/lead route... same destination as
/api/contact," but this one branch never got the same treatment. The
sales-lead branch 15 lines below it in the SAME file already uses the
hardened `adminNewClientEmail()` template (`lib/email-templates.ts`, itself
`escapeHtml`-sourced) — so this file has both the safe and unsafe version of
the same pattern side by side.

Impact: a crafted job-application submission (e.g. `name` or any extra body
field containing `<img src=x onerror=...>` or a phishing `<a href>`) lands
unescaped in an HTML email opened by the tenant's admin/owner.

Fixed: imported `escapeHtml` from `@/lib/escape-html`, wrapped all four
interpolated fields. New `route.job-application-html-escape.test.ts` (4
tests: `name` injection, `notes`/extra-field injection via
`buildLeadNotes()`, `email`/`phone` injection, benign-content CONTROL).

## Fixed (2): continuation — `src/app/api/prospects/route.ts`

Same class, second file: `POST /api/prospects` (the public, unauthenticated
`/qualify` self-serve-signup form — the same intake W2 traced earlier this
session as a real functioning tenant-creation path) built a "New lead from
/qualify" admin-alert email by joining `business_name`, `trade`, `owner_name`,
`owner_email`, `owner_phone`, `primary_city/state/zip`, `tier_interest`, and
`launch_timeline` — all raw request-body fields — into a `summary` string
dropped unescaped into a `<pre>` block.

Fixed: `escapeHtml()` on every field folded into `summary`. Left the email
`subject` line unescaped (matches the sibling routes' own pattern — header
injection is a different vulnerability class than HTML-body rendering and out
of scope for this fix). New `route.admin-alert-html-escape.test.ts` (3 tests:
`business_name`/`owner_name` injection, `owner_phone`/`tier_interest`/
`launch_timeline` injection incl. a `</pre>`-breakout + `javascript:` href
attempt, benign-content CONTROL).

## Checked, clean — not fixed (no live bug, or different trust boundary)

- **CSV formula injection**: every export/import site in the repo (finance
  exports, GDPR export, tax export, CPA-token export, dashboard bookings/
  contacts exports) independently and correctly neutralizes leading
  `=+-@\t\r`. `src/lib/csv.ts`'s `toCSV`/`downloadCSV`/`neutralizeFormula` are
  dead code (zero importers, exhaustive grep) — noted, not fixed (candidate
  for a future dead-code pass, same family as this session's other flagged
  dead clusters).
- **OAuth callback redirects** (`google/callback`, `admin/google/callback`):
  `error` query param reflected unescaped into the redirect Location, but
  destination host is always the fixed `baseUrl` — not an open redirect.
- **CPA year-end-zip token** (`cpa/[token]/year-end-zip/route.ts`): 192-bit
  `randomBytes(24)` token, minting gated by `requirePermission('finance.expenses')`,
  cross-tenant `entity_id` verified on mint. `.eq('token', token)` is a DB
  index lookup, not a process-local secret compare — not the same timing-
  attack shape as this codebase's `safeEqual`/`timingSafeEqual` HMAC/CSRF
  usages, not flagged.
- **`admin/websites` domain handling**: already hardened (normalizeDomain,
  primary-uniqueness, legacy-collision check) by a prior W2 round this
  session — re-confirmed clean, not re-touched.
- **`referrers/auth/request`, `client/send-code`, `portal/auth`**: OTP codes
  are server-generated (`crypto.randomInt`), not attacker-controlled; brand/
  color come from admin-set tenant fields. Clean.
- **`campaigns/[id]/send`, `dashboard/comms-preview`**: admin-authenticated
  surfaces (dashboard-only), different trust boundary than public forms — not
  in scope for this pass.
- **`emailShell()`'s `heading` param**: already escaped internally via its
  own local `esc()`; only `bodyHtml` is documented+trusted as pre-escaped, and
  every caller checked this round passes it a static string.

## Verification

- Both new test files RED-confirmed via `git diff` capture + `git apply -R`
  on the source fix alone, reran against pre-fix code (lead: 4/4 failed for
  the predicted unescaped-payload reason; prospects: 3/3 failed), restored
  GREEN via `git apply` of the saved patch.
- tsc clean (same 5 pre-existing baseline errors: admin-auth's
  `verifyAdminToken` route-export shape, outreach + payment-reminder test
  spread-argument errors, 2 uncommitted `site-nav.ts` errors in this
  worktree from unrelated in-progress SEO work — none touch these files).
- eslint 0 errors/0 warnings on all 4 touched files.
- Full suite: 644/644 files, 3403 passed + 1 expected fail (pre-existing,
  unrelated), 0 regressions.
- Commits: fix+tests, then this doc.

File-only. No push/deploy/DB. `tenant_domains` schema lane unchanged this
round.
