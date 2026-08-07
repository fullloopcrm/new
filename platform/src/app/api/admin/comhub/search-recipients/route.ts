import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { sanitizePostgrestValue } from '@/lib/postgrest-safe'
import { requireComhubAccess } from '@/lib/comhub-access'

// GET /api/admin/comhub/search-recipients?q=<query>&limit=10
// Tenant-scoped search across clients + team_members for the compose modal.
export async function GET(req: NextRequest) {
  const access = await requireComhubAccess()
  if (access instanceof NextResponse) return access
  const tenantId = access.tenantId
  const db = tenantDb(tenantId)

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10) || 10, 25)
  if (q.length < 2) return NextResponse.json({ results: [] })

  const ql = `%${sanitizePostgrestValue(q)}%`

  const [{ data: clients }, { data: members }, { data: applicants }] = await Promise.all([
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
    db
      .from('team_applications')
      .select('id, name, phone, email')
      .or(`name.ilike.${ql},phone.ilike.${ql},email.ilike.${ql}`)
      .limit(limit),
  ])

  type Result = {
    role: 'client' | 'cleaner' | 'applicant'
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
  for (const a of applicants || []) {
    results.push({ role: 'applicant', id: a.id, name: a.name, phone: a.phone, email: a.email })
  }

  return NextResponse.json({ results: results.slice(0, limit) })
}
