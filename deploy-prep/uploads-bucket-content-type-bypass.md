# `uploads` bucket: client-declared MIME/size checks are non-binding — real gap, NOT fixed this round

**Author:** W1 (broad-hunt, 2026-07-15 ~20:50)
**Status:** documented, script prepared, NOT applied — needs Jeff's approval + leader to run
against the live Supabase project (storage bucket config is a prod-infra write, out of my
"file-only, no DB" mandate this session).

## What's wrong

4 routes mint a Supabase `createSignedUploadUrl()` after validating the caller's
**declared** `contentType`/`filename` against a per-route allow-list:

- `src/app/api/apply/signed-url/route.ts` — public, no auth (job applications)
- `src/app/api/management-applications/signed-url/route.ts` — public, no auth
- `src/app/api/lead-media/signed-url/route.ts` — public, no auth (booking-form photo/video)
- `src/app/api/team-portal/video-upload/route.ts` (GET/signed-URL branch) — requires a team
  member Bearer token

That validation is **cosmetic**. Read `@supabase/storage-js`'s `StorageFileApi.ts`
(`uploadToSignedUrl`) directly (not assumed from docs): the token from
`createSignedUploadUrl()` only binds the storage **path**; the actual `contentType` header
and body bytes on the real PUT are whatever the uploader sends. Nothing server-side ties the
real upload back to what was declared when the signed URL was minted.

Concretely: any anonymous caller can hit `POST /api/apply/signed-url` with a `contentType` of
`application/pdf` (passes validation), get back `{signedUrl, path, publicUrl}`, then PUT
arbitrary bytes with `Content-Type: text/html` (a phishing page) or `image/svg+xml` (an SVG
with an inline `<script>`) straight to that signed URL. `scripts/migrate-storage.ts` created
the `uploads` bucket with only `{ public: true }` — no `allowedMimeTypes`/`fileSizeLimit` was
ever set at the bucket level, so Supabase Storage itself has nothing to reject the mismatch
with. The route's response already handed back a live, public,
`<project>.supabase.co/storage/.../uploads/...` URL for that object — hosting is live the
moment the PUT lands, independent of whether any application ever gets submitted or any
dashboard ever renders the URL.

## Why this is real but I didn't just patch it inline

- **Not fixable as an app-layer check**: the whole point of these 4 routes is a
  direct-to-storage PUT (bypassing Vercel's 4.5MB serverless body cap for big video/PDF
  uploads) — any fix has to be enforced by Supabase Storage itself on the actual PUT, not by
  another declared-value check in the Next.js route (which is exactly the check that's
  already being bypassed).
- **The correct fix is a bucket-level Storage config change**
  (`supabase.storage.updateBucket('uploads', { allowedMimeTypes, fileSizeLimit })`) —
  Supabase enforces this at the Storage API layer for every upload path (proxied `.upload()`
  and direct `uploadToSignedUrl()` alike), which is why it actually closes the gap where an
  app-layer re-check wouldn't. That's a live infra mutation against the prod Supabase
  project, which is explicitly out of scope for an unattended file-only pass.

## Severity / exploitability today

- **Confirmed live and reachable**: 3 of the 4 routes need zero authentication and zero
  precondition — this isn't a "if some env var is missing" gap, it's reachable right now by
  any visitor.
- **What's NOT (yet) independently confirmed exploitable**: today's own renders of
  photo/video/resume URLs from this bucket are all via `<img src>` / `<video src>` (dashboard
  `team/page.tsx`, `SalesAppsTab.tsx`'s photo, `bookings/[id]/page.tsx`), which do not execute
  HTML/SVG script even with a spoofed `Content-Type` — so this is not (today) a proven
  same-origin stored-XSS chain into the dashboard. What IS live regardless: arbitrary file
  type/size hosting on the platform's own trusted storage domain by an unauthenticated
  caller — usable for phishing links, malware hosting, or storage-cost abuse (no size cap is
  enforced either, same root cause), attributable to Full Loop's own infrastructure. Any
  future feature that links out to a stored resume/portfolio URL directly (`<a href>`,
  `window.open`) would inherit an immediate, un-audited stored-XSS sink the moment it ships.

## What I prepared instead

`scripts/harden-uploads-bucket-mime-allowlist.mjs` (NOT run) — dry-run by default, prints the
current vs. proposed bucket config; `--apply` calls `updateBucket()`. Allow-list is the union
of every legitimate mime every current `uploads`-bucket consumer declares (grepped all
`.storage.from('uploads')` call sites: cleaners/upload, uploads/route, booking-notes/upload,
team-applications/upload, public-upload, apply/signed-url, management-applications
upload+signed-url, lead-media/signed-url, team-portal/video-upload). `fileSizeLimit` set to
150MB (team-portal/video-upload's own cap, the largest legitimate case — Storage only
supports one bucket-wide limit, not per-route, so routes' own tighter app-layer maxSize
checks stay as the inner UX-facing limit).

Scoped to the `uploads` bucket only — did not touch `finance` or `team-photos` (different
consumers, not part of this finding; a separate pass should review those if warranted).

## Not done (flagging, not fixing)

- Did not sweep existing objects already in the `uploads` bucket for a real
  `metadata.mimetype` outside the allow-list (would need a read-only `.list()` walk +ID which
  planted objects predate this fix) — worth a follow-up once the bucket config lands.
- Did not change the 4 routes' app-layer `contentType` checks — they're harmless as declared
  metadata / rate-limit-adjacent noise, but leaving them in place costs nothing and they still
  give a clean 400 for honest callers with a bad type.

## Recommendation

Leader: after Jeff approves, run
`node scripts/harden-uploads-bucket-mime-allowlist.mjs --apply` against the live project (or
review + adjust the allow-list first if a legitimate mime was missed). Low blast radius —
purely additive restriction of a bucket that today accepts anything; no legitimate current
upload path uses a type outside the proposed allow-list.
