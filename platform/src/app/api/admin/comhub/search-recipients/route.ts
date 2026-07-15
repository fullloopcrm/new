import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { buildIlikeOrFilter } from '@/lib/postgrest-or-filter'

// GET /api/admin/comhub/search-recipients?q=<query>&limit=10
// Tenant-scoped search across clients + team_members for the compose modal.
export async function GET(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10) || 10, 25)
  if (q.length < 2) return NextResponse.json({ results: [] })

  const orFilter = buildIlikeOrFilter(['name', 'phone', 'email'], q)

  const [{ data: clients }, { data: members }] = await Promise.all([
    supabaseAdmin
      .from('clients')
      .select('id, name, phone, email, do_not_service')
      .eq('tenant_id', tenantId)
      .or(orFilter)
      .limit(limit),
    supabaseAdmin
      .from('team_members')
      .select('id, name, phone, email')
      .eq('tenant_id', tenantId)
      .or(orFilter)
      .limit(limit),
  ])

  type Result = {
    role: 'client' | 'cleaner'
    id: string
    name: string | null
    phone: string | null
    email: string | null
    dns?: boolean
  }

  const results: Result[] = []
  for (const c of clients || []) {
    results.push({
      role: 'client', id: c.id, name: c.name, phone: c.phone, email: c.email,
      dns: c.do_not_service || false,
    })
  }
  for (const m of members || []) {
    results.push({ role: 'cleaner', id: m.id, name: m.name, phone: m.phone, email: m.email })
  }

  return NextResponse.json({ results: results.slice(0, limit) })
}
