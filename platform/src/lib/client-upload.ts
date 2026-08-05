'use client'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
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

/**
 * Same signed-URL pattern as uploadViaSignedUrl, but for the generic
 * /apply/[slug] team-application photo, which isn't tenant-host-scoped
 * (tenant comes from a URL slug, not the request host) and writes to the
 * separate flat 'team-photos' bucket instead of the tenant-namespaced
 * 'uploads' bucket.
 */
export async function uploadTeamApplicationPhoto(file: File): Promise<string> {
  const signedRes = await fetch('/api/team-applications/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
  })
  if (!signedRes.ok) {
    const errData = await signedRes.json().catch(() => ({}))
    throw new Error(errData.error || 'Failed to prepare upload.')
  }
  const { path, token, publicUrl } = await signedRes.json()

  const { error } = await supabase.storage.from('team-photos').uploadToSignedUrl(path, token, file, {
    contentType: file.type,
  })
  if (error) throw new Error('Upload failed. Please try again.')

  return publicUrl
}
