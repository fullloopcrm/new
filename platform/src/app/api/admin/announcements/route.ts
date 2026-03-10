import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data: announcements } = await supabaseAdmin
    .from('platform_announcements')
    .select('*')
    .order('created_at', { ascending: false })

  return NextResponse.json({ announcements })
}

export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { title, body, type, target, target_value, priority, published } = await request.json()

  if (!title || !body) {
    return NextResponse.json({ error: 'Title and body required' }, { status: 400 })
  }

  const { data: announcement, error } = await supabaseAdmin
    .from('platform_announcements')
    .insert({
      title,
      body,
      type: type || 'announcement',
      target: target || 'all',
      target_value: target_value || null,
      priority: priority || 'normal',
      published: published ?? false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If published and targeting specific tenant, create a notification
  if (published && target === 'tenant' && target_value) {
    await supabaseAdmin.from('notifications').insert({
      tenant_id: target_value,
      type: 'platform',
      title,
      message: body,
      channel: 'in_app',
    })
  }

  // If published and targeting all, create notifications for all active tenants
  if (published && target === 'all') {
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('status', 'active')

    if (tenants && tenants.length > 0) {
      const notifications = tenants.map((t) => ({
        tenant_id: t.id,
        type: 'platform',
        title,
        message: body,
        channel: 'in_app',
      }))
      await supabaseAdmin.from('notifications').insert(notifications)
    }
  }

  // If published and targeting by industry, create notifications for matching tenants
  if (published && target === 'industry' && target_value) {
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('status', 'active')
      .eq('industry', target_value)

    if (tenants && tenants.length > 0) {
      const notifications = tenants.map((t) => ({
        tenant_id: t.id,
        type: 'platform',
        title,
        message: body,
        channel: 'in_app',
      }))
      await supabaseAdmin.from('notifications').insert(notifications)
    }
  }

  return NextResponse.json({ announcement })
}
