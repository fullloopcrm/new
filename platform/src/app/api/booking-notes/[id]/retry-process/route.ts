import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { processMediaNote, MediaNoteError } from '@/lib/job-media-notes'

export const maxDuration = 120

// Office-side retry for a video note stuck in 'failed' — same pipeline the
// crew's team-portal process route runs, just reached via dashboard session
// auth instead of a team-portal bearer token (office staff have no such
// token). See processMediaNote() for the shared implementation.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  let tenantCtx
  try {
    tenantCtx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  const { id } = await ctx.params
  const { data: note } = await tenantDb(tenantCtx.tenantId)
    .from('booking_notes')
    .select('id')
    .eq('id', id)
    .eq('note_type', 'video')
    .maybeSingle()
  if (!note) return NextResponse.json({ error: 'Media note not found' }, { status: 404 })

  try {
    await processMediaNote(tenantCtx.tenantId, id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown processing error'
    const status = err instanceof MediaNoteError ? err.status : 500
    return NextResponse.json({ error: message }, { status })
  }
}
