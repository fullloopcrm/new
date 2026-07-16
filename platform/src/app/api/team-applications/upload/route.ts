import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`team-app-upload:${ip}`, 3, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many uploads. Try again later.' }, { status: 429 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed. Use JPEG, PNG, or WebP.' }, { status: 400 })
  }

  const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'jpg'
  const randomId = randomBytes(8).toString('hex')
  const path = `applications/${Date.now()}-${randomId}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('team-photos')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    console.error('Photo upload error:', error)
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from('team-photos').getPublicUrl(path)

  return NextResponse.json({ url: urlData.publicUrl })
}
