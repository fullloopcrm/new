-- PROPOSED — not yet applied to prod. File-only per worker rules; leader runs
-- prod DDL after Jeff approves.
--
-- Closes the real half of the gap documented in
-- deploy-prep/w4-broad-hunt-2026-07-18-0847-signed-upload-size-cap-gap.md
-- (and re-flagged in deploy-prep/w4-broad-hunt-2026-07-15-1951.md): every
-- route that uses Supabase's createSignedUploadUrl() pattern (apply,
-- management-applications, lead-media/signed-url, team-portal/video-upload,
-- team-portal/photo-upload) declares a per-type maxSize next to its
-- ALLOWED_TYPES map, but createSignedUploadUrl()'s only option is `upsert`
-- — it has no size parameter. The client PUTs bytes straight to Storage on
-- Supabase's side; this app never sees them in flight, so every declared
-- maxSize was app-level documentation only, not an enforced limit. App code
-- already added a post-hoc verifyUploadedObjectSize() check at the 3 routes
-- with a live submission/confirm consumer (commit c920c806), but that can
-- only delete an oversized object after it has already landed — it can't
-- stop the PUT itself or the storage-cost hit of it landing. The actual
-- backstop is a bucket-level file_size_limit, which IS enforced by Supabase
-- Storage at PUT time (rejects before the bytes are accepted), independent
-- of any app code.
--
-- 200MB is chosen because it's above the largest per-type app cap found in
-- the repo (team-portal/video-upload's 150MB), so no legitimate upload gets
-- rejected — this is a hard ceiling behind the existing app-level caps, not
-- a replacement for them.
--
-- allowed_mime_types is left untouched here deliberately: the `uploads`
-- bucket is shared across resume/photo/video/document upload flows with
-- different ALLOWED_TYPES maps per route (already enforced client-side by
-- the signed-URL request itself, which Supabase Storage validates against
-- the file's actual content-type at PUT time when set) — collapsing them to
-- one bucket-wide allowlist here risks silently breaking a route this pass
-- didn't audit. Scope this migration to size only.

UPDATE storage.buckets
SET file_size_limit = 209715200  -- 200MB, in bytes (200 * 1024 * 1024)
WHERE id = 'uploads';

-- Verification query (run after apply, not part of the change itself):
-- SELECT id, file_size_limit FROM storage.buckets WHERE id = 'uploads';
-- Expect file_size_limit = 209715200.
