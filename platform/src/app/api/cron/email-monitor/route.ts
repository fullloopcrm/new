/**
 * Email-monitor cron — every minute, calls /api/email/monitor.
 * Bails instantly if no tenants have email_monitor_enabled to keep cost low.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyCronSecret } from '@/lib/cron-auth'

export const maxDuration = 60

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

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

  // Health-monitor marker — proves the every-minute cron ran.
  await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    type: 'email_monitor_tick',
    title: 'cron:email-monitor',
    message: 'tick',
    channel: 'system',
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return NextResponse.json({ ok: true, downstream: body })
}
