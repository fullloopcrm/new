import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant: ctx, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  const { id } = await params
  const db = tenantDb(ctx.tenantId)
  const { data: note } = (await db.from('booking_notes').select('images').eq('id', id).single()) as {
    data: { images: string[] | null } | null
  }
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  for (const url of (note.images as string[]) || []) {
    const match = url.match(/uploads\/(.+)$/)
    if (match) await supabaseAdmin.storage.from('uploads').remove([match[1]])
  }

  const { error } = await db.from('booking_notes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
