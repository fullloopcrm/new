/**
 * Confirms a client-submitted upload URL both (a) lives under the exact
 * tenant-scoped storage prefix a signed-upload endpoint issued and (b) was
 * actually uploaded with the declared content-type/size.
 *
 * Supabase's createSignedUploadUrl() only authorizes a PUT to a specific
 * object path -- it does not constrain the Content-Type or body size the
 * client sends with that PUT. Every public signed-upload consumer in this
 * codebase (management-applications, apply-ceo, sales-applications,
 * team-portal/video-upload) validated only that the submitted URL's prefix
 * matched the tenant's own folder, which stops cross-tenant URL swapping
 * but not an attacker uploading a wildly oversized file or a different
 * actual MIME type than what the ALLOWED_TYPES check on the signed-URL
 * request approved -- e.g. requesting a 'photo' signed URL (validated as
 * image/jpeg there) and then PUTting an arbitrary large file or a
 * different content-type straight to Supabase, bypassing the app entirely.
 * The resulting object is still served back publicly at a URL admins/staff
 * are shown as "view resume" / "watch video" links.
 */
import { supabaseAdmin } from './supabase'

export interface UploadTypeConfig {
  mimes: string[]
  maxSize: number
}

export type VerifyUploadResult =
  | { ok: true; path: string }
  | { ok: false; error: string }

export async function verifySignedUpload(
  bucket: string,
  prefix: string,
  url: unknown,
  config: UploadTypeConfig,
): Promise<VerifyUploadResult> {
  if (typeof url !== 'string' || !url) return { ok: false, error: 'Invalid upload URL' }

  const store = supabaseAdmin.storage.from(bucket)
  const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`
  const { data: prefixUrl } = store.getPublicUrl(normalizedPrefix)
  if (!url.startsWith(prefixUrl.publicUrl)) return { ok: false, error: 'Invalid upload URL' }

  const suffix = decodeURIComponent(url.slice(prefixUrl.publicUrl.length))
  if (!suffix || suffix.includes('/')) return { ok: false, error: 'Invalid upload URL' }
  const path = `${normalizedPrefix}${suffix}`

  const { data: info, error } = await store.info(path)
  if (error || !info) return { ok: false, error: 'Upload not found' }

  if (typeof info.size === 'number' && info.size > config.maxSize) {
    await store.remove([path]).catch(() => {})
    return { ok: false, error: 'Uploaded file exceeds the allowed size' }
  }
  if (info.contentType && !config.mimes.includes(info.contentType)) {
    await store.remove([path]).catch(() => {})
    return { ok: false, error: 'Uploaded file type not allowed' }
  }

  return { ok: true, path }
}
