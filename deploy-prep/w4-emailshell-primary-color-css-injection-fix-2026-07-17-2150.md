# emailShell / primary_color HTML+CSS injection fix — W4, 2026-07-17 21:50

Per the 21:37 order item 1 (new fresh-ground surface). File-only, no push/deploy/DB.

## Fresh ground picked up

The 21:13 checkpoint's carried-over candidate: `src/app/admin/**` page-level
components for direct client-side Supabase calls bypassing the API layer.
Swept `src/app`/`src/components` for `'use client'` files importing a
Supabase client directly — zero hits under `admin/`, as expected given the
architecture. Two real hits turned up outside `admin/`: `nyc-mobile-salon`'s
`ApplicationForm.tsx` / `FoundingCEOApplicationForm.tsx`, which create a
browser-side Supabase client and call `.storage.uploadToSignedUrl()`
directly. That's the *intended* Supabase signed-upload pattern (URL/token
minted server-side by `/api/apply/signed-url` with mime/size/rate-limit
checks) — not a bypass. Confirmed clean; both forms' backing routes
(`/api/apply`, `/api/apply-ceo`) already validate `videoUrl`/`resumeUrl`
against the tenant's own upload prefix (a prior-session fix).

## Real bug found (order item 2, same surface continued)

While confirming `apply-ceo/route.ts` was clean, its applicant-confirmation
email builds ad-hoc HTML and splices `tenant.primary_color` **raw** into
`style="color:${color}"` — no escaping, no validation. Traced `primary_color`
to `/api/dashboard/onboarding/profile`: self-serve tenant field, `str()`
coercion only, **zero format enforcement** server-side (matches the existing
comment in `site/template/_config/theme.ts` about this exact field being
"attacker-settable via the settings + onboarding APIs").

Escaping alone (even quote-aware) isn't sufficient here: `style="..."` is a
**CSS-declaration context**, not just an HTML-attribute context — a payload
like `red;position:fixed;top:0;left:0;width:100%;height:100%;background:
url(evil)` needs no quote at all to smuggle extra CSS declarations into the
attribute. The codebase's own `theme.ts` had already solved this correctly
for the public-site `<style>` block (a `SAFE_COLOR` regex + fallback) — that
fix just never made it to the email layer.

Swept every other raw `${color}`-in-`style=` pattern for the same shape
across the codebase and found **3 more real instances**, all reaching a
third party's inbox (not just the tenant's own):

1. **`src/lib/messaging/shell.ts`** (`emailShell()`) — the platform's ONE
   shared email wrapper. Used by quote sends, comhub sends (admin→lead/
   client), `/api/lead`, and the `comhub-email` cron. `accent` (from
   `brand.primaryColor`) was interpolated raw into two `style="..."`
   attributes (kicker text color, CTA button background) with **zero**
   escaping — not even the file's own (weaker) local `esc()`. Also found:
   that local `esc()` was missing quote-escaping entirely (unlike the
   canonical `escapeHtml` used elsewhere in this codebase), so `brand.name`
   in `alt="${esc(brand.name)}"` and `cta.url` in `href="${esc(cta.url)}"`
   were still attribute-breakout-able via a bare `"` even though they looked
   escaped.
2. **`src/app/api/bookings/broadcast/route.ts`** — urgent-job broadcast
   email to team members, same raw `${color}` pattern.
3. **`src/app/api/referrers/auth/request/route.ts`** — referrer login-OTP
   email, same raw `${color}` pattern, PLUS `tenant.name` interpolated as
   raw text content (not run through `escapeHtml`) in the body copy.

Every one of these is a real tenant-owner → third-party-inbox attack: any
tenant can set `primary_color` (and `name`) to a malicious value via
self-serve onboarding, then trigger any of these four send paths against a
real client/lead/team-member/referrer's email client.

## Fix

- New `src/lib/safe-color.ts` — extracted the `theme.ts` `SAFE_COLOR`
  regex/fallback logic into a shared util (`theme.ts` now imports it instead
  of duplicating; behavior unchanged there).
- `shell.ts`: `accent` now validated via `safeColor()` instead of raw
  `brand.primaryColor || INK`; local `esc()` now delegates to the canonical
  `escapeHtml` (fixes the quote-escaping gap for `brand.name`/`logoUrl`/
  `cta.url`/`cta.label` across every caller of `emailShell()` in one place).
- `apply-ceo/route.ts`, `bookings/broadcast/route.ts`,
  `referrers/auth/request/route.ts`: `color` now validated via `safeColor()`;
  `referrers/auth/request` additionally escapes `brand` (tenant.name) via
  `escapeHtml` in the body copy.
- `selena-legacy-handlers.ts`: `client.name`, `booking.service_type`, team
  member name, `tenant.name`, and `payment.method` now escaped via
  `escapeHtml` in both `handleResendConfirmation` and `handleGetInvoice`.
- `cron/rating-prompt/route.ts`: `tenant.name` now escaped via `escapeHtml`
  in the bulk-cap admin alert's HTML body (subject line and SMS text left
  as-is — plain text, no HTML/markup context, so no injection vector there).

`admin/campaigns/preview/route.ts`'s `wrapEmail()` has the identical raw-
`tenant.primary_color`-in-`style=` pattern, but it's a **preview** endpoint
gated by `campaigns.create` on the tenant's own account, rendering the
tenant's own data back to themselves — self-XSS only, not a cross-user
vector. Left unfixed; flagging for whoever's doing a "cheap hardening" pass
rather than fixing on this pass (not a live attacker→victim path).

`agreement.ts`'s `buildAgreement()` has the same unescaped
`businessName`/`territoryName` pattern, but has **zero live importers** —
fully superseded by `agreement-pdf.ts` (pdf-lib, draws text directly, no
HTML/JS rendering pipeline at all, so not exploitable even if it were used).
Confirmed dead code; not fixed, flagged as a cleanup candidate alongside the
already-tracked dead clone-template files.

### Continued sweep (order item 2): same class, two more live files

Kept pulling the thread — grepped every ad-hoc (`html = \`...\``, i.e. NOT
`emailShell`/`lib/email-templates.ts`) HTML-email builder across
`src/app/api` and `src/lib`, and diffed against which already import
`escapeHtml` (26 files build ad-hoc HTML; 7 had zero `escapeHtml` usage).
Two more real, live, previously-unfixed instances:

4. **`src/lib/selena-legacy-handlers.ts`** — the legacy Selena SMS-agent tool
   handlers (still wired in via `webhooks/telnyx` + `chat/route.ts`, NOT dead
   despite the filename). `handleResendConfirmation`'s booking-confirmation
   email interpolated `client.name`, `booking.service_type`, the assigned
   team member's name, and `tenant.name` all raw as text content.
   `handleGetInvoice`'s payment-receipt email did the same for `tenant.name`
   and `payment.method`. Both send to a real client's inbox. Not covered by
   the prior `selena-legacy-email.ts` fix (5518e45e) — a different file in
   the same `selena-legacy-*` family.
5. **`src/app/api/cron/rating-prompt/route.ts`** — the bulk-send-cap admin
   alert interpolates `tenant.name` raw as text content into an email sent
   via `emailAdmins()`. Traced `emailAdmins()`/`getAdminContacts()`
   (`lib/nycmaid/admin-contacts.ts`) and confirmed it queries `admin_users`
   with **no `tenant_id` filter** — it's the platform's own admin inbox, not
   a per-tenant one. So this is a tenant-owner → **platform-admin** HTML
   injection (same severity class as the already-fixed admin login-alert/
   security-event escaping), not self-XSS.

Both are plain HTML-escaping fixes (`escapeHtml`, not `safeColor` — no raw
`style=` interpolation in either).

## Verification

RED/GREEN mutation-verified in two passes (`git diff > patch && git apply -R
patch`, rerun, reapply, rerun) — one for the `safeColor`/`emailShell`/
`apply-ceo`/`broadcast`/`referrers` group, one for the
`selena-legacy-handlers`/`cron rating-prompt` group found on the continued
sweep. All RED runs showed the exploit payloads (`position:fixed`,
`evil.example`, raw `onmouseover="alert(1)"`, raw `<img src=x
onerror=alert(1)>`) actually present in the generated HTML in the failure
diffs; all GREEN after reapply.

New/extended tests:
- `src/lib/safe-color.test.ts` (new) — 8 cases.
- `src/lib/messaging/shell.test.ts` (new) — 4 cases covering the
  attribute-breakout and CSS-injection vectors in `emailShell()`.
- `src/app/api/bookings/broadcast/route.xss.test.ts` (extended) — added the
  `primary_color` CSS-injection case alongside the existing
  client.address/service_type/notes coverage.
- `src/app/api/apply-ceo/route.color-injection.test.ts` (new) — 2 cases.
- `src/app/api/referrers/auth/request/route.html-injection.test.ts` (new) —
  2 cases, reusing the existing `otp-rng.test.ts` mocking convention.
- `src/lib/selena-legacy-handlers.html-injection.test.ts` (new) — 2 cases
  (`handleResendConfirmation`, `handleGetInvoice`).
- `src/app/api/cron/rating-prompt/route.html-injection.test.ts` (new) — 1
  case, reusing the existing `route.duplicate-send.test.ts`'s
  `fake-supabase` mocking convention.

`npx tsc --noEmit`: clean except the same 2 pre-existing baseline errors in
`src/app/site/sunnyside-clean-nyc/_lib/site-nav.ts` (unrelated import-style
mismatch, not touched this pass — one fewer than the "3 baseline" noted in
the 21:13 checkpoint; not investigated further, may have been fixed since).

Full affected-surface run: `src/lib/messaging`, `src/app/api/apply-ceo`,
`src/app/api/bookings/broadcast`, `src/app/api/referrers`,
`src/app/site/template`, `src/lib/safe-color.test.ts`,
`src/lib/selena-legacy-handlers.*.test.ts`, `src/app/api/cron/rating-prompt`
— 18 files, 50/50 passing.

## Remaining candidates checked and ruled out this pass

Of the 7 ad-hoc-HTML files with zero `escapeHtml` usage: `portal/auth/route.ts`
and `pin-reset/route.ts` only interpolate a system-generated numeric OTP/code
(no user/tenant text) — safe. `feedback/route.ts` already inlines its own
`<`/`>` escaping for the one free-text field (anonymous feedback message) —
safe. `src/lib/jefe/actions.ts` is Jeff's own trusted cross-tenant tool (per
the 21:13 checkpoint's established ruling on Jefe) — not a cross-user attack
surface in the same sense.

## Next-target candidates if continuing fresh-ground hunting

- `admin/campaigns/preview/route.ts`'s `wrapEmail()` — self-XSS only, cheap
  hardening candidate (see above), not a live cross-user bug.
- `agreement.ts`'s `buildAgreement()` — confirmed-dead code, cleanup
  candidate alongside the already-tracked dead clone-template files.
- The nyc-mobile-salon client-side-Supabase-upload pattern is fine as
  implemented; if it's reused for other tenants' forms going forward, the
  signed-URL route is the thing to keep validating (type/mime/size/prefix),
  not the client-side call itself.
- This pass's grep was for ad-hoc **HTML-email** builders specifically
  (`html = \`...\``/`html: \`...\``). Not yet checked: whether any ad-hoc
  **SMS**-body builder (outside `lib/messaging/client-sms.ts` /
  `sms-templates.ts`, already presumably covered) does raw string
  concatenation of tenant/client fields in a way that could break a
  downstream SMS-reply parser (a different, non-HTML injection shape) —
  worth a look if continuing this class.

No push/deploy/DB this pass.
