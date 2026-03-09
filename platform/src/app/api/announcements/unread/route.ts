import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest } from '@/lib/tenant-query'

export async function GET() {
  const { tenant } = await getTenantForRequest()

  // Get published announcements targeting this tenant (all, their industry, their plan, or direct)
  const { data: announcements } = await supabaseAdmin
    .from('platform_announcements')
    .select('id, title, body, type, priority, created_at')
    .eq('published', true)
    .in('type', ['announcement', 'maintenance'])
    .or(`target.eq.all,and(target.eq.tenant,target_value.eq.${tenant.id}),and(target.eq.industry,target_value.eq.${tenant.industry}),and(target.eq.plan,target_value.eq.${tenant.plan || 'free'})`)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get read IDs for this tenant
  const { data: reads } = await supabaseAdmin
    .from('platform_announcement_reads')
    .select('announcement_id')
    .eq('tenant_id', tenant.id)

  const readIds = new Set((reads || []).map((r) => r.announcement_id))
  const unread = (announcements || []).filter((a) => !readIds.has(a.id))

  return NextResponse.json({ unread })
}

export async function POST(request: Request) {
  const { tenant } = await getTenantForRequest()
  const { announcement_id } = await request.json()

  await supabaseAdmin
    .from('platform_announcement_reads')
    .upsert({
      announcement_id,
      tenant_id: tenant.id,
    }, { onConflict: 'announcement_id,tenant_id' })

  return NextResponse.json({ ok: true })
}
