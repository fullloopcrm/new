# Broad-hunt — W4, continuing 23:51 order (file-only, no push/deploy/DB)

## Fixed: unvalidated file/profile URLs in `management_applications` writers

Same bug class already fixed this session in `team-portal/video-upload` and
`/api/sales-applications`: two public, unauthenticated POST endpoints write
free-text URL fields verbatim into the shared `management_applications`
table with no check that they actually point at the caller's own upload.

- `src/app/api/apply-ceo/route.ts` (founding-CEO application) — `videoUrl`,
  `resumeUrl` (optional) and `linkedinUrl` (embedded in the free-text
  `notes` field via `buildNotes()`) were accepted as-is.
- `src/app/api/management-applications/route.ts` POST (ops-coordinator /
  management application) — `resume_url`, `photo_url`, `video_url` are
  *required* fields but were only checked for truthiness, not shape/origin.

Both routes share the `management_applications` table with
`/api/sales-applications`, which was already confirmed (prior report,
`w4-broad-hunt-2026-07-16-0146-sales-app-video-url-xss.md`) to have the
identical field pattern (`video_url`/`linkedin_url` free-text → raw
`<a href>` in an admin tab). I did **not** find an existing admin UI that
renders `management_applications` rows yet (`grep -rl "management_applications"
src/app --include="*.tsx"` returns nothing outside the public application
forms themselves) — so this isn't a currently-clickable stored-XSS the way
the sales-applications one was. It's a defensive/consistency fix: closing
the same gap before any admin view of these applications gets built, and
matching every legitimate signed-upload flow in this codebase, which
already scopes stored URLs to the caller's own tenant/type prefix.

## Fix

- `apply-ceo/route.ts`: `videoUrl`/`resumeUrl` (when present) must start
  with `getPublicUrl(`${tenant.id}/applications/`).publicUrl` — the prefix
  its own frontend's `/api/apply/signed-url` call scopes uploads to.
  `linkedinUrl` (when present) must match `/^https?:\/\//i`.
- `management-applications/route.ts`: `resume_url`/`photo_url`/`video_url`
  (all required) must start with
  `getPublicUrl(`${tenant.id}/management-applications/`).publicUrl` — the
  prefix its own `management-applications/signed-url` twin scopes uploads
  to.

Confirmed both legitimate frontends already only ever send `publicUrl`
values from their respective `signed-url` routes
(`FoundingCEOApplicationForm.tsx` → `/api/apply/signed-url`;
`site/apply/operations-coordinator/page.tsx` →
`/api/management-applications/signed-url`), so this doesn't change the real
flow, only closes the forged-request path — same verification approach as
the sales-applications fix.

## Noticed, not fixed (pre-existing, unrelated, out of scope)

`src/app/site/apply/operations-coordinator/page.tsx` never collects or
sends a `resume_url`/`resumeFile` at all, but
`management-applications/route.ts` POST requires `resume_url` to be
present (`!resume_url` → 400). This looks like every submission through
that specific form already 400s today, independent of my change — a
functional bug, not a security issue. Flagging for the leader/product
owner rather than fixing, since it's unrelated to this pass's scope.

## Verification

- `npx tsc --noEmit` — clean (only the pre-existing unrelated
  `bookings/broadcast/route.xss.test.ts` mock-typing failure, flagged in
  multiple prior reports).
- Read-traced both legitimate frontend forms to confirm the URL prefixes
  match what my checks require (see above) — no route test file existed
  for either route prior to this change, none added (matches this
  session's established precedent for untested upload-adjacent routes).

File-only. No push/deploy/DB migration.
