import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

const TABLE = 'seo_backlink_opportunities'
const REVIEW_ACTIONS = ['approve', 'reject'] as const
type ReviewAction = (typeof REVIEW_ACTIONS)[number]
const ACTION_STATUS: Record<ReviewAction, string> = { approve: 'approved', reject: 'rejected' }

// SIGNAL backlinks review queue — FL-admin scope. Lists status='proposed'
// citation/editorial rows from backlinks.ts's generateBacklinkProposals(),
// joined with tenant name/domain for display. Approve/reject only updates
// status + reviewed_at here — nothing is submitted externally by this route;
// actual submission to a directory remains a manual, out-of-band step.
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data: opportunities, error } = await supabaseAdmin
    .from(TABLE) // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
    .select('id,tenant_id,property,kind,source_key,source_name,source_url,category,status,listing,rationale,safety,proposed_at')
    .eq('status', 'proposed')
    .order('proposed_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tenantIds = [...new Set((opportunities ?? []).map((o) => o.tenant_id as string).filter(Boolean))]
  const { data: tenants } = tenantIds.length
    ? await supabaseAdmin.from('tenants').select('id,name').in('id', tenantIds)
    : { data: [] }
  const nameByTenant = new Map((tenants ?? []).map((t) => [t.id as string, t.name as string]))

  const rows = (opportunities ?? []).map((o) => ({
    ...o,
    tenant_name: nameByTenant.get(o.tenant_id as string) ?? null,
  }))

  return NextResponse.json({ opportunities: rows })
}

export async function POST(req: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const body = (await req.json().catch(() => ({}))) as { id?: string; action?: string }
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!body.action || !REVIEW_ACTIONS.includes(body.action as ReviewAction)) {
    return NextResponse.json({ error: `action must be one of: ${REVIEW_ACTIONS.join(', ')}` }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from(TABLE) // tenant-scope-ok: seomgr FL-admin engine, keyed by property/domain not tenant
    .update({ status: ACTION_STATUS[body.action as ReviewAction], reviewed_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('status', 'proposed')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: body.id, status: ACTION_STATUS[body.action as ReviewAction] })
}
