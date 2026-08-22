import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'
import { notify } from '@/lib/notify'
import { escapeHtml } from '@/lib/escape-html'

// Fair Chance / "ban-the-box" compliant criminal history disclosure —
// asked once in the team portal (post-offer), never on the public
// /apply form. See supabase/migrations/20260821213000_*.sql for why.
//
// A "yes" answer does NOT auto-admit the hire to the portal: it flips
// status to 'pending_review' (findRowByPin only matches status='active',
// so this blocks their next login) and notifies the tenant admin, who does
// the individualized assessment Fair Chance law requires (nature of the
// offense, time passed, job relevance) before clicking Activate on the
// member's dashboard page — same button that already exists for
// active/inactive toggling.

export const OPTIONS = corsPreflight

export const GET = withMobileCors(async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data: member, error } = await tenantDb(auth.tid)
    .from('team_members')
    .select('criminal_history_disclosed_at')
    .eq('id', auth.id)
    .single()

  if (error || !member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ disclosed: !!(member as { criminal_history_disclosed_at: string | null }).criminal_history_disclosed_at })
})

export const POST = withMobileCors(async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const hasRecord = body.has_record
  if (hasRecord !== 'yes' && hasRecord !== 'no') {
    return NextResponse.json({ error: 'A response is required' }, { status: 400 })
  }
  const explanation = typeof body.explanation === 'string' ? body.explanation.trim().slice(0, 2000) : ''

  const response = hasRecord === 'yes' && explanation ? `yes: ${explanation}` : hasRecord

  const updates: Record<string, unknown> = {
    criminal_history_response: response,
    criminal_history_disclosed_at: new Date().toISOString(),
  }
  if (hasRecord === 'yes') updates.status = 'pending_review'

  const { data: updated, error } = await tenantDb(auth.tid)
    .from('team_members')
    .update(updates)
    .eq('id', auth.id)
    .select('name')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

  if (hasRecord === 'yes') {
    const name = (updated as { name: string } | null)?.name || 'A new hire'
    notify({
      tenantId: auth.tid,
      type: 'cleaner_application',
      title: 'Review needed: criminal history disclosure',
      message: `${escapeHtml(name)} disclosed a criminal conviction after their offer. Their portal access is on hold until you review and reactivate them.`,
      channel: 'email',
      recipientType: 'admin',
      metadata: { teamMemberId: auth.id, teamMemberName: name },
    }).catch((err) => console.error('Disclosure review notify failed:', err))
  }

  return NextResponse.json({ success: true, pendingReview: hasRecord === 'yes' })
})
