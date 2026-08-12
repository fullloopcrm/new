/**
 * Pre-signed upload URL for Task Board attachments (session-authenticated,
 * boards.edit). Mirrors /api/upload/signed-url's pattern -- lets the browser
 * PUT directly to Supabase Storage instead of routing the file body through
 * this Vercel serverless function, which has a hard ~4.5MB request-body
 * ceiling underneath /api/uploads' own 15MB app-level check. A multi-MB
 * image/screenshot export died there as a generic browser-level "Failed to
 * fetch" before that check (or this route's own code) ever ran -- found
 * 2026-08-12 from a real board-attachment failure report.
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

const MAX_SIZE = 15 * 1024 * 1024 // 15MB -- matches /api/uploads' prior ceiling
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf', 'video/mp4', 'video/quicktime',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
  'application/zip',
]

export async function POST(request: NextRequest) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant

    const { filename, contentType, size } = await request.json().catch(() => ({}))
    if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }
    if (typeof size === 'number' && size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 15MB)' }, { status: 400 })
    }

    const rawExt = (String(filename || '').split('.').pop() || 'bin').toLowerCase()
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
    const path = `${tenantId}/board-updates/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`

    const { data, error } = await supabaseAdmin.storage.from('uploads').createSignedUploadUrl(path)
    if (error || !data) {
      console.error('[boards upload-url] error:', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)
    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl: urlData.publicUrl })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[boards upload-url] error:', err)
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}
