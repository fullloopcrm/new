import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { tenantDb } from '@/lib/tenant-db'

// GET /api/admin/comhub/search-recipients?q=<query>&limit=10
// Tenant-scoped search across clients + team_members for the compose modal.
export async function GET(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const db = tenantDb(tenantId)

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10) || 10, 25)
  if (q.length < 2) return NextResponse.json({ results: [] })

  const ql = `%${q}%`

  const [{ data: clientRows }, { data: memberRows }] = await Promise.all([
    db
      .from('clients')
      .select('id, name, phone, email, do_not_service')
      .or(`name.ilike.${ql},phone.ilike.${ql},email.ilike.${ql}`)
      .limit(limit),
    db
      .from('team_members')
      .select('id, name, phone, email')
      .or(`name.ilike.${ql},phone.ilike.${ql},email.ilike.${ql}`)
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

  // tenantDb's select() widens the columns literal to `string`, so postgrest-js
  // can't statically parse the result shape here — cast at this boundary.
  const clients = clientRows as unknown as Array<{
    id: string; name: string | null; phone: string | null; email: string | null; do_not_service: boolean | null
  }> | null
  const members = memberRows as unknown as Array<{
    id: string; name: string | null; phone: string | null; email: string | null
  }> | null

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
