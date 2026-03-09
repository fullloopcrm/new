import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const markRead = request.nextUrl.searchParams.get('mark_read')

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('recipient_type', 'admin')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Count unread
    const { count: unread } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('recipient_type', 'admin')
      .is('metadata->read', null)

    if (markRead === 'true') {
      // Mark all as read by updating metadata
      const ids = (data || []).map((n) => n.id)
      if (ids.length > 0) {
        await supabaseAdmin
          .from('notifications')
          .update({ metadata: { read: true } })
          .in('id', ids)
      }
    }

    return NextResponse.json({ notifications: data, unread: unread || 0 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
