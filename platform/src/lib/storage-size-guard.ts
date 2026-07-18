import { supabaseAdmin } from '@/lib/supabase'

/**
 * `createSignedUploadUrl` (used by every direct-to-Supabase upload flow —
 * apply/signed-url, management-applications/signed-url, lead-media/signed-url,
 * team-portal/video-upload, team-portal/photo-upload) has no size parameter:
 * the client PUTs bytes straight to Supabase Storage and this app never sees
 * them. Every `maxSize` declared next to those routes' ALLOWED_TYPES maps is
 * therefore documentation only — nothing enforces it. This checks the object
 * that actually landed in storage after the fact (at the point some other
 * route is about to trust/persist its URL) and deletes it if it's over cap,
 * so an oversized upload can't sit in the shared bucket accruing storage
 * cost indefinitely just because the caller lied about the file it was
 * signing for.
 */
export async function verifyUploadedObjectSize(
  bucket: string,
  objectPath: string,
  maxSize: number,
): Promise<boolean> {
  const slashIdx = objectPath.lastIndexOf('/')
  const dir = slashIdx === -1 ? '' : objectPath.slice(0, slashIdx)
  const filename = slashIdx === -1 ? objectPath : objectPath.slice(slashIdx + 1)
  if (!filename) return false

  const { data, error } = await supabaseAdmin.storage.from(bucket).list(dir, { search: filename, limit: 1 })
  if (error || !data || data.length === 0) return false

  const size = data[0]?.metadata?.size
  if (typeof size !== 'number' || size > maxSize) {
    await supabaseAdmin.storage.from(bucket).remove([objectPath]).catch(() => {})
    return false
  }
  return true
}
