# `POST /api/finance/upload` — Missing MIME-type Whitelist

Found during LEADER 18:23 order ("pivot to narrow broad-hunt, lower-risk
surface"). File-only fix per standing rules.

## Issue

`finance/upload/route.ts` (receipt/bank-statement upload, gated on
`finance.expenses` permission) accepted any `file.type` — it only checked
file size (50MB cap) and sanitized the stored file extension, with no
whitelist on the uploaded content type before writing to the shared
`uploads` storage bucket and returning a public URL.

Every sibling upload route in the codebase enforces a MIME whitelist:
`admin/notes/upload` (`OK_TYPES`: png/jpeg/webp/gif/pdf), `uploads/route.ts`
(`ALLOWED_TYPES`: jpeg/png/webp/pdf), `cleaners/upload`, `team-applications/upload`,
`team-portal/video-upload`, and `management-applications/upload` (fixed in
a prior pass, `w4-management-applications-upload-mime-whitelist-fix.md`).
`finance/upload` was the one remaining upload route without this check.

Lower severity than the earlier `management-applications/upload` finding
because this route requires an authenticated caller with the
`finance.expenses` permission (not a public/anonymous endpoint) — an
authenticated user could still have uploaded arbitrary content (e.g.
`text/html`, `image/svg+xml` with embedded script) served back with the
attacker-supplied content-type from the public bucket URL.

## Fix

Added `ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']`
(matching the closest sibling, `admin/notes/upload`, which serves the same
kind of use case — photographed receipts + PDF statements) and reject any
`file.type` not in that list before the size check and storage write.

Verified: `npx tsc --noEmit` — clean. No route test existed prior to this
fix (same as its siblings `uploads/route.ts`, `public-upload/route.ts`);
none added, per file-only/no-scope-creep.

## Reviewed this pass, no issue found

- `admin/notes/upload`, `team-portal/video-upload` (both `GET` signed-URL
  and `POST` legacy-direct flows) — both already enforce a MIME whitelist
  correctly; `team-portal/video-upload` also re-validates booking
  ownership (`team_member_id === auth.id`) and tenant scope before either
  upload path.
- Cross-checked the remaining untouched upload routes flagged in the prior
  `w4-management-applications-upload-mime-whitelist-fix.md` pass
  (`reviews/upload`, `cleaners/upload`, `booking-notes/upload`,
  `team-applications/upload`, `apply/signed-url`, `lead-media/signed-url`,
  `public-upload`, `uploads`) — all still correctly whitelist MIME types,
  no regression.

## No push/deploy/DB

File-only change, this worktree only. Commit only, no push.
