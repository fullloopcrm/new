#!/usr/bin/env node
/**
 * ONE-TIME hardening script — NOT run by this pass. Sets `allowedMimeTypes` +
 * `fileSizeLimit` on the shared `uploads` Supabase Storage bucket.
 *
 * WHY THIS EXISTS
 * ---------------
 * 4 routes (apply/signed-url, management-applications/signed-url,
 * lead-media/signed-url, team-portal/video-upload) mint a Supabase
 * `createSignedUploadUrl()` after checking the caller's DECLARED `contentType`
 * against a per-route allow-list. That check is cosmetic: `uploadToSignedUrl()`
 * lets the actual uploader set whatever `contentType` header (and body bytes)
 * it wants on the real PUT — the signing step does not bind content-type or
 * size (confirmed by reading @supabase/storage-js's StorageFileApi source,
 * not assumed). 3 of the 4 routes (apply/signed-url, management-applications/
 * signed-url, lead-media/signed-url) require zero auth — any anonymous caller
 * can mint a signed URL, then PUT an arbitrary file with e.g.
 * `Content-Type: text/html` (a self-contained phishing page, or a
 * `image/svg+xml` payload with an inline <script>) to the `uploads` bucket,
 * which is public. The route's own response hands back a live, public,
 * fullloopcrm-hosted `publicUrl` for that object immediately — no application
 * form submission or dashboard render is needed for the hosting itself to be
 * live; today's routes don't independently execute it (photo/video renders
 * are all via <img>/<video> src, which don't execute HTML/SVG script), but
 * arbitrary-content hosting on the platform's own trusted storage domain is a
 * real abuse vector (phishing, malware) on its own, and any future direct-link
 * ("View resume") UI would inherit an immediate stored-XSS sink.
 *
 * `scripts/migrate-storage.ts` created this bucket with only `{ public: true }`
 * — no allow-list was ever set, which is the root cause.
 *
 * Supabase Storage enforces `allowedMimeTypes` / `fileSizeLimit` itself, at
 * the bucket level, on every upload path (proxied `.upload()` AND direct
 * `uploadToSignedUrl()` alike) — this is the actual fix, not another
 * app-layer check that a client can just not send.
 *
 * THE ALLOW-LIST BELOW is the union of every legitimate mime this bucket's
 * callers use today (grepped every `.storage.from('uploads')` call site):
 *   cleaners/upload, uploads/route, booking-notes/upload,
 *   team-applications/upload, public-upload, apply/signed-url,
 *   management-applications/upload+signed-url, lead-media/signed-url,
 *   team-portal/video-upload.
 * `fileSizeLimit` is set to the largest legitimate cap across those routes
 * (team-portal/video-upload's 150MB) since Storage only supports one
 * bucket-wide limit, not a per-route one — routes keep their own tighter
 * app-layer maxSize checks for UX, this is just the outer backstop.
 *
 * This does NOT touch the `finance` or `team-photos` buckets (different
 * consumers/mime needs, not part of this finding) — scope this run to
 * `uploads` only; a separate pass should review those if warranted.
 *
 * DOES NOT delete/quarantine anything already uploaded — this only changes
 * what Storage accepts going forward. A follow-up read-only sweep of existing
 * `uploads` objects' real `metadata.mimetype` (via `.list()`) would be needed
 * to check for anything already planted before this lands; not done here.
 *
 * Run manually after Jeff approves (leader lane — this file only prepares the
 * change, per standing instructions not to make prod writes unattended):
 *
 *   node scripts/harden-uploads-bucket-mime-allowlist.mjs           # dry-run, prints the diff
 *   node scripts/harden-uploads-bucket-mime-allowlist.mjs --apply   # actually calls updateBucket
 */
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')

// Match this repo's other scripts: fall back to ~/.env.local when the shell
// env doesn't have these set (see scripts/reconcile-tenant-config.mjs).
function loadEnvFallback() {
  const envPath = process.env.HOME ? `${process.env.HOME}/.env.local` : null
  if (!envPath || !existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnvFallback()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (checked shell env + ~/.env.local)')
  process.exit(1)
}

const BUCKET = 'uploads'

// Union of every mime type a real 'uploads' consumer declares today.
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/3gpp',
]

// Largest legitimate per-route cap (team-portal/video-upload). Storage only
// supports one bucket-wide limit; routes keep their own tighter app-layer
// checks for UX on top of this outer backstop.
const FILE_SIZE_LIMIT = '150MB'

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: bucket, error: getErr } = await supabase.storage.getBucket(BUCKET)
  if (getErr || !bucket) {
    console.error(`Could not read bucket '${BUCKET}':`, getErr?.message || 'not found')
    process.exit(1)
  }

  console.log(`Current '${BUCKET}' bucket config:`)
  console.log(`  public: ${bucket.public}`)
  console.log(`  allowedMimeTypes: ${JSON.stringify(bucket.allowed_mime_types ?? null)}`)
  console.log(`  fileSizeLimit: ${bucket.file_size_limit ?? null}`)
  console.log()
  console.log('Proposed:')
  console.log(`  public: ${bucket.public}  (unchanged)`)
  console.log(`  allowedMimeTypes: ${JSON.stringify(ALLOWED_MIME_TYPES)}`)
  console.log(`  fileSizeLimit: ${FILE_SIZE_LIMIT}`)

  if (!APPLY) {
    console.log('\nDry run only — pass --apply to actually call updateBucket().')
    return
  }

  const { error: updateErr } = await supabase.storage.updateBucket(BUCKET, {
    public: bucket.public,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    fileSizeLimit: FILE_SIZE_LIMIT,
  })
  if (updateErr) {
    console.error('updateBucket failed:', updateErr.message)
    process.exit(1)
  }
  console.log(`\n✓ '${BUCKET}' bucket hardened — Storage now rejects any upload (proxied or signed-URL) outside the allow-list/size cap, regardless of client-declared metadata.`)
}

main()
