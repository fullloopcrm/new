'use client'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Uploads a file direct-to-storage via a signed URL (bypasses Vercel's
 * 4.5MB serverless function body limit) instead of posting the file itself
 * to an API route. Mirrors the pattern already proven in the salon's
 * ApplicationForm video upload.
 */
export async function uploadViaSignedUrl(file: File, type: 'photo' | 'media'): Promise<string> {
  const signedRes = await fetch('/api/upload/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, filename: file.name, contentType: file.type }),
  })
  if (!signedRes.ok) {
    const errData = await signedRes.json().catch(() => ({}))
    throw new Error(errData.error || 'Failed to prepare upload.')
  }
  const { path, token, publicUrl } = await signedRes.json()

  const { error } = await supabase.storage.from('uploads').uploadToSignedUrl(path, token, file, {
    contentType: file.type,
  })
  if (error) throw new Error('Upload failed. Please try again.')

  return publicUrl
}
