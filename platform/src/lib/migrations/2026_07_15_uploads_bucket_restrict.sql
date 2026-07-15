-- Security hardening: the 'uploads' storage bucket (public, used by 3 UNAUTHENTICATED
-- signed-URL routes -- apply/signed-url, lead-media/signed-url,
-- management-applications/signed-url -- plus the direct-proxy public-upload route) has
-- no server-side mime-type or size restriction today. The 'uploads' bucket itself was
-- created out-of-band (dashboard/CLI, no migration in this repo defines it), so its
-- default config is unrestricted.
--
-- The 3 signed-URL routes validate `contentType`/`type`/size ONLY on the JSON request
-- that asks for a signed upload URL. That check is disconnected from the actual upload:
-- @supabase/storage-js's createSignedUploadUrl(path) takes no mime/size options, and the
-- real upload (uploadToSignedUrl, called directly by the browser against Supabase, never
-- touching this app's server) lets the caller send ANY Content-Type and ANY body size.
-- So today, anyone who can reach one of those 3 public endpoints can mint a signed URL
-- for e.g. `type: 'resume', contentType: 'application/pdf'` (passing the app-level
-- check), then perform the real upload with an arbitrarily large file of ANY type/bytes
-- -- including text/html or image/svg+xml -- which Supabase then serves publicly
-- (getPublicUrl) with the attacker-chosen Content-Type. That's unrestricted file hosting
-- under this platform's storage domain (abuse/phishing risk) plus unlimited storage-cost
-- exposure, unrestricted by the request-level rate limits those routes rely on.
--
-- This sets a bucket-level allowlist/size-cap as defense in depth. It is the UNION of
-- every mime type currently issued by the 3 signed-url routes + public-upload.ts, with
-- the max size ceiling from the largest single declared type (video, 100MB) across those
-- routes -- it does NOT reproduce each route's finer-grained per-type cap (e.g.
-- resume=10MB vs video=100MB), since storage.buckets only supports one size ceiling per
-- bucket. That finer granularity still requires app-level enforcement (out of scope for
-- a DB-only fix); this closes the "totally unbounded" gap, not the "wrong-type-under-cap"
-- gap.
--
-- NOT applied automatically -- run manually via the Supabase SQL editor or CLI
-- (`supabase db execute` / dashboard) after review. This worker does not have
-- prod DB write access and does not run this.
UPDATE storage.buckets
SET
  file_size_limit = 104857600, -- 100 MiB, matches the largest declared per-type cap (video)
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'uploads';
