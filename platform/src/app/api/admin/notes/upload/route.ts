/**
 * POST /api/admin/notes/upload  (multipart: file)
 * Admin image upload for CRM notes → shared `uploads` bucket under notes/.
 * Returns the public URL to attach to a note.
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const OK_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  if (!OK_TYPES.includes(file.type)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const rand = randomBytes(8).toString('hex')
  const path = `notes/${rand}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('uploads')
    .upload(path, buffer, { contentType: file.type, upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
