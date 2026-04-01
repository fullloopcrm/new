import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest } from '@/lib/tenant-query'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantForRequest()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: note } = await supabaseAdmin.from('booking_notes').select('images').eq('id', id).eq('tenant_id', ctx.tenantId).single()
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  for (const url of (note.images as string[]) || []) {
    const match = url.match(/uploads\/(.+)$/)
    if (match) await supabaseAdmin.storage.from('uploads').remove([match[1]])
  }

  const { error } = await supabaseAdmin.from('booking_notes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
