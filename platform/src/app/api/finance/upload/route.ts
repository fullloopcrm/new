/**
 * Finance receipt/statement upload. Writes to tenant-namespaced path in the
 * `uploads` storage bucket. Tenant-scoped.
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string | null) || 'receipt'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 50MB' }, { status: 400 })
    }

    const rawExt = (file.name.split('.').pop() || '').toLowerCase()
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
    const timestamp = Date.now()
    const randomId = crypto.randomBytes(4).toString('hex')
    const folder = type === 'statement' ? 'statements' : 'receipts'
    const path = `${tenantId}/finance/${folder}/${timestamp}-${randomId}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { data, error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: false })

    if (error) {
      console.error('[finance/upload] error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

    return NextResponse.json({ success: true, url: urlData.publicUrl, path: data.path })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('finance/upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
