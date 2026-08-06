import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

// GET /api/mobile/comhub/contacts — the Contacts tab's full address book,
// broader than the subset embedded in thread rows. comhub_contacts has no
// company/organization column (migrations/2026_05_19_comhub.sql) — `company`
// is always null here rather than guess-mapping some other field onto it.
export const OPTIONS = corsPreflight

export const GET = withMobileCors(async function GET(req: NextRequest) {
  let tenantId: string
  try {
    const ctx = await getTenantForRequest()
    tenantId = ctx.tenantId
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401
    return NextResponse.json({ error: 'Unauthorized' }, { status })
  }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()

  let query = tenantDb(tenantId)
    .from('comhub_contacts')
    .select('id, name, phone, email')
    .order('name', { ascending: true })
    .limit(500)

  if (q) {
    const ql = q.replace(/[%,]/g, '')
    query = query.or(`name.ilike.%${ql}%,phone.ilike.%${ql}%,email.ilike.%${ql}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const contacts = (data || []).map(c => ({ ...c, company: null }))
  return NextResponse.json({ contacts })
})
