import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('leads.view')
    if (authError) return authError
    const { tenantId } = tenant

    const { data: domains } = await supabaseAdmin
      .from('domains')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    // Get visit stats per domain
    const domainStats = await Promise.all(
      (domains || []).map(async (domain) => {
        const { count: visits } = await supabaseAdmin
          .from('website_visits')
          .select('id', { count: 'exact', head: true })
          .eq('domain_id', domain.id)

        const { count: ctas } = await supabaseAdmin
          .from('website_visits')
          .select('id', { count: 'exact', head: true })
          .eq('domain_id', domain.id)
          .not('cta_type', 'is', null)

        return {
          ...domain,
          visits: visits || 0,
          ctas: ctas || 0,
        }
      })
    )

    return NextResponse.json({ domains: domainStats })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
