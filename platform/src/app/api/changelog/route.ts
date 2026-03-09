import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest } from '@/lib/tenant-query'

export async function GET() {
  await getTenantForRequest() // auth check

  const { data: entries } = await supabaseAdmin
    .from('platform_announcements')
    .select('id, title, body, created_at')
    .eq('type', 'changelog')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ entries: entries || [] })
}
