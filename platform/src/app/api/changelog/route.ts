import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET() {
  try {
    await getTenantForRequest() // auth check
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  const { data: entries } = await supabaseAdmin
    .from('platform_announcements')
    .select('id, title, body, created_at')
    .eq('type', 'changelog')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ entries: entries || [] })
}
