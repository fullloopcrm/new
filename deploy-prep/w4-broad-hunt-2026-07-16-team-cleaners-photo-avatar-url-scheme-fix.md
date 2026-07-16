# Broad-hunt sweep — 00:30 order — W4, 2026-07-16

File-only, no push/deploy/DB. Continued this session's unauthenticated/authenticated
URL-injection bug class into a lower-risk, authenticated surface: `team_members.photo_url`
/ `avatar_url`, accepted with zero scheme validation across four routes.

## Surveyed first, ruled out as non-issues

Before landing on this fix, checked several other candidates and found them
already safe — noting so this ground isn't re-covered:

- Public unauthenticated endpoints (`contact`, `lead`, `client/book`, `portal/*`,
  `invoices|quotes|documents/public/[token]`) only reflect `tenant.logo_url` from
  the tenant's own DB row into email templates — not attacker-controlled input.
- `admin/google/callback`, `social/connect/facebook|instagram/callback` — all use
  `verifyOAuthState` (signed, tenant-bound) correctly; the Google callback does
  reflect an unencoded `error` query param into a redirect Location before state
  validation, but `/admin/google-profile` doesn't render that param in the page,
  so it's not reachable as reflected XSS. Not fixed — no live sink.
- `admin/selena/monitor`, `admin/payments/finalize-match` — both properly gated
  behind header-based bearer keys with `safeEqual` (timing-safe compare).
- A grep for API routes missing common auth-check identifiers surfaced ~130
  hits, but nearly all are legitimately public (client-portal token auth,
  team-portal session auth, webhook signature verification) using auth helper
  names my pattern didn't match — spot-checked several, no gaps found.

## Fixed: `photo_url`/`avatar_url` accepted photo/avatar fields with no scheme check

`src/app/api/cleaners/route.ts` (POST), `src/app/api/cleaners/[id]/route.ts`
(PUT) — legacy nycmaid shim routes gated by `team.create`/`team.edit` — stored
`body.photo_url` verbatim with zero validation.

`src/app/api/team/route.ts` (POST) validated `avatar_url` as `type: 'string',
max: 1000` (no scheme check — any string up to 1000 chars passed). `src/app/api/team/[id]/route.ts`
(PUT) used `pick()`, which whitelists field names but does zero content
validation, so `avatar_url` also passed through with any value.

All four values are rendered as `<img src={...}>` in `dashboard/team/page.tsx`
and `dashboard/team/[id]/page.tsx` — `<img src>` doesn't execute `javascript:`
URIs in modern browsers, so this is not a direct XSS vector (same conclusion
reached for the `team_applications.photo_url` fix earlier this session). It's
also gated behind `team.create`/`team.edit` permission, so the caller already
has meaningful access — lower risk than the public unauthenticated routes
fixed earlier tonight. Fixed anyway for consistency/defense-in-depth and
because it's cheap: an admin with team-edit access could otherwise force
other admins' browsers to load an arbitrary attacker-hosted image when
viewing a team member's profile (IP/referrer beaconing risk).

**Important wrinkle caught before fixing**: `dashboard/team/[id]/page.tsx`'s
photo upload flow does client-side canvas resizing and calls
`canvas.toDataURL('image/jpeg', 0.8)`, PUTing a `data:image/jpeg;base64,...`
URI directly as `avatar_url` — there is no storage-bucket upload for this
field (unlike the `team-applications`/`sales-applications` patterns). A
naive "must be http(s)" check would have broken the legitimate avatar-upload
feature. Confirmed this by reading the upload handler before writing the fix.

**Fix**: added `isSafeImageUrl()` to `src/lib/validate.ts` — accepts either an
`http(s)://` URL or a `data:image/(jpeg|jpg|png|webp|gif);base64,` URI, rejects
everything else (`javascript:`, `vbscript:`, `file:`, etc.). Applied it at all
four call sites. Also raised `team/route.ts`'s `avatar_url` schema `max` from
1000 to 200000 chars, since a resized-but-base64-encoded JPEG easily exceeds
1000 chars and the old limit would have silently broken avatar-set-on-create
(not currently exercised by the UI, but the schema should match what the field
actually needs to hold).

## Verification

- `npx tsc --noEmit`: one pre-existing failure in
  `src/app/api/bookings/broadcast/route.xss.test.ts` (confirmed via `git
  stash` that it exists on `HEAD` before this change — unrelated mock-typing
  issue, not touched by this diff). No new type errors from these edits.
- Not run: no test suite exists for these specific routes; did not start the
  dev server to exercise the avatar-upload UI flow live. Recommend a manual
  check of `dashboard/team/[id]` photo upload + `dashboard/team` (create flow)
  before next deploy to confirm `data:` URIs still save correctly end-to-end.

Files changed: `src/lib/validate.ts`, `src/app/api/cleaners/route.ts`,
`src/app/api/cleaners/[id]/route.ts`, `src/app/api/team/route.ts`,
`src/app/api/team/[id]/route.ts`.
