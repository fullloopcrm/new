import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET() {
  let tenant
  try {
    ({ tenant } = await getTenantForRequest())
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

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
  const { data: reads } = await tenantDb(tenant.id)
    .from('platform_announcement_reads')
    .select('announcement_id')

  const readIds = new Set(((reads as { announcement_id: string }[] | null) || []).map((r) => r.announcement_id))
  const unread = (announcements || []).filter((a) => !readIds.has(a.id))

  return NextResponse.json({ unread })
}

export async function POST(request: Request) {
  let tenant
  try {
    ({ tenant } = await getTenantForRequest())
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
  const { announcement_id } = await request.json()

  await tenantDb(tenant.id)
    .from('platform_announcement_reads')
    .upsert({
      announcement_id,
    }, { onConflict: 'announcement_id,tenant_id' })

  return NextResponse.json({ ok: true })
}
