# `POST /api/management-applications/upload` — Missing MIME-type Whitelist

Found during LEADER 00:11 broad-hunt order ("continuing broad-hunt, fresh
area"). File-only fix per standing rules.

## Issue

`management-applications/upload/route.ts` is a public (tenant-from-host,
no admin auth) direct-upload endpoint accepting photo/video/resume
attachments for management job applications. Unlike every other upload
route in the codebase, it had **no whitelist check on `file.type`** — it
only sanitized the stored file extension (`[^a-z0-9]` strip) but never
validated the MIME type against an allowed set before writing to the
public `uploads` storage bucket.

Every sibling upload route already enforces a MIME whitelist:
- `management-applications/signed-url/route.ts` (the pre-signed-URL twin of
  this exact route) — `ALLOWED_TYPES` map keyed by `photo`/`video`/`resume`.
- `apply/signed-url/route.ts`, `lead-media/signed-url/route.ts`,
  `public-upload/route.ts`, `uploads/route.ts`, `team-applications/upload/route.ts`,
  `reviews/upload/route.ts`, `cleaners/upload/route.ts`,
  `booking-notes/upload/route.ts` — all gate on `file.type`/`contentType`
  before accepting the upload.

Without the check, an anonymous caller could upload arbitrary content
(e.g. `text/html`, `image/svg+xml` with an embedded `<script>`) and get
back a public URL serving it with the attacker-supplied content-type —
stored content of arbitrary type on the shared bucket, inconsistent with
every other upload surface in this codebase.

## Fix

Added the same `ALLOWED_TYPES: Record<type, { mimes, maxSize }>` structure
used by the sibling `signed-url` route (`photo`: jpeg/png/webp,
`video`: mp4/quicktime/webm/x-m4v, `resume`: pdf/doc/docx), validated
`type` against it, and rejected any `file.type` not in that type's
`mimes` list before the size check and storage write. Per-type max size
now comes from the whitelist config (previously the route only special-
cased `'video'` for a 100MB cap and defaulted everything else to 10MB —
same effective limits, now data-driven and can't silently drift from the
`signed-url` twin).

Verified: `npx tsc --noEmit` — clean. No test file existed for this route
prior to the fix (matching the sibling `signed-url`/`public-upload`/`uploads`
routes, which also ship without dedicated route tests); none added, per
the file-only/no-scope-creep instruction and matching the prior commit's
own precedent (`24d11865` also shipped without new tests).

## Reviewed, no issue found (same pass)

- `reviews/upload`, `team-applications/upload`, `cleaners/upload`,
  `booking-notes/upload`, `apply/signed-url`, `lead-media/signed-url`,
  `public-upload`, `uploads` — all already enforce a MIME whitelist.
- Public token-authenticated flows re-checked this session (already fixed
  in a prior pass, confirmed still correct): `invoices/public/[token]/*`,
  `quotes/public/[token]/*`, `documents/public/[token]/*`,
  `cpa/[token]/year-end-zip` — token exact-match lookups, server-derived
  charge amounts, atomic CAS status transitions, no new issue.
- `admin/impersonate`, `admin/invites` + `/join/[token]` accept flow —
  signed/timing-safe cookie compare already in place; invite-accept
  already gates on signed-in email matching the invited email.
- `lib/site-export.ts` (tenant site ZIP export) — uses `safeFetch`
  (`lib/ssrf.ts`) which blocks private/internal address targets and
  re-validates every redirect hop; zip entry paths are built from
  `new URL(...).pathname` (dot-segments already normalized by the URL
  parser) and only ever written into the in-memory `JSZip` archive being
  built, not extracted to disk — not a zip-slip vector.
- `lib/selena/tools.ts` unescaped `ilike('name', ...)` / `ilike('message', ...)`
  calls (`lookup_client`, `lookup_cleaner`, `search_messages`) — all gated
  behind `isOwnerOfTenant()` before dispatch; not reachable by an
  unauthenticated/non-owner caller, so wildcard over-matching is a UX
  quirk within the owner's own tenant data, not a security boundary
  bypass.
- Re-confirmed `.or()`/`sanitizePostgrestValue()` PostgREST-filter-injection
  sites flagged as "RAW" on this branch by the earlier
  `postgrest-filter-injection-branch-audit.md` recon (`clients`,
  `admin/clients`, `admin/ai-chat`, `ai/assistant`, `admin/activity`,
  `admin/comhub/search-recipients`) — all now route user-controlled values
  through `sanitizePostgrestValue()` on this branch; that recon doc is
  stale relative to current branch state.

## Not touched (per LEADER order)

Did not open referrers, referral-commissions, or team-PIN/team-portal
auth routes.
