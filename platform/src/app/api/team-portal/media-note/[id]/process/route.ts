import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { processMediaNote, MediaNoteError } from '@/lib/job-media-notes'
import { verifyToken } from '../../../auth/token'

export const maxDuration = 120

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data: note } = (await tenantDb(auth.tid)
    .from('booking_notes')
    .select('id, team_member_id')
    .eq('id', id)
    .eq('note_type', 'video')
    .single()) as { data: { id: string; team_member_id: string | null } | null }
  if (!note || note.team_member_id !== auth.id) {
    return NextResponse.json({ error: 'Media note not found' }, { status: 404 })
  }

  try {
    await processMediaNote(auth.tid, id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown processing error'
    const status = err instanceof MediaNoteError ? err.status : 500
    console.error('[media-note/process] failed:', message)
    return NextResponse.json({ error: message }, { status })
  }
}
