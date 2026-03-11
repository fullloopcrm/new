import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const tenantId = request.nextUrl.searchParams.get('tenant_id')

  let query = supabaseAdmin
    .from('campaigns')
    .select('*, tenants(name)')
    .order('created_at', { ascending: false })

  if (tenantId) query = query.eq('tenant_id', tenantId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const campaigns = data || []
  const stats = {
    total: campaigns.length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    sent: campaigns.filter(c => c.status === 'sent').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
  }

  return NextResponse.json({ campaigns, stats })
}
