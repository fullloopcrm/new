import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Pre-signed upload URL for the generic /apply/[slug] team-application photo
 * (not tenant-scoped — this route serves any tenant via a URL slug, not a
 * tenant host, so it mirrors team-applications/upload's flat 'team-photos'
 * bucket instead of resolving a tenant from headers). Bypasses Vercel's
 * ~4.5MB serverless body limit that made the direct-upload route silently
 * truncate below its own advertised size.
 */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 20 * 1024 * 1024

const rateLimits = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 })
    return false
  }
  entry.count++
  return entry.count > 10
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many uploads. Try again later.' }, { status: 429 })
  }

  try {
    const { filename, contentType, size } = await request.json()

    if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json({ error: 'File type not allowed. Use JPEG, PNG, or WebP.' }, { status: 400 })
    }
    if (typeof size === 'number' && size > MAX_SIZE) {
      return NextResponse.json({ error: 'Photo too large (max 20MB).' }, { status: 400 })
    }

    const rawExt = (String(filename || '').split('.').pop() || 'jpg').toLowerCase()
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'jpg'
    const randomId = crypto.randomBytes(4).toString('hex')
    const path = `applications/${Date.now()}-${randomId}.${ext}`

    const { data, error } = await supabaseAdmin.storage
      .from('team-photos')
      .createSignedUploadUrl(path)

    if (error || !data) {
      console.error('[team-applications signed-url] error:', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('team-photos').getPublicUrl(path)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl: urlData.publicUrl,
    })
  } catch (err) {
    console.error('[team-applications signed-url] error:', err)
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}
