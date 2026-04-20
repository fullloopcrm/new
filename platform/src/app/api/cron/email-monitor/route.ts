/**
 * Email-monitor cron — every minute, calls /api/email/monitor.
 * Bails instantly if no tenants have email_monitor_enabled to keep cost low.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Cheap precheck — count enabled tenants. If none, bail.
  const { count } = await supabaseAdmin
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .eq('email_monitor_enabled', true)
    .not('imap_host', 'is', null)

  if (!count || count === 0) {
    return NextResponse.json({ ok: true, skipped: 'no enabled tenants' })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}`
  if (!baseUrl) {
    return NextResponse.json({ error: 'No base URL configured' }, { status: 500 })
  }

  const res = await fetch(`${baseUrl}/api/email/monitor`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
  })
  const body = await res.json().catch(() => ({}))

  return NextResponse.json({ ok: true, downstream: body })
}
