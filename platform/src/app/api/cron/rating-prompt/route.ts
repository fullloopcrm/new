import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendClientSMS } from '@/lib/nycmaid/client-contacts'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { protectCronAPI } from '@/lib/nycmaid/auth'
import { isCommEnabled } from '@/lib/comms-prefs'

// Runs every 5 min. Sends ONE SMS — Q1 only — 30+ min after the cleaner
// checked out: "How was your service today?" Reply triggers Q2 in the
// telnyx webhook. No reply = no further texts.
//
// Multi-tenant: iterates active tenants and runs per-tenant. The CAP is
// enforced PER TENANT to keep the 4/29 SMS-blast lesson honored even after
// fan-out.
export async function GET(request: Request) {
  const authError = protectCronAPI(request)
  if (authError) return authError

  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const CAP = 10

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('status', 'active')
    .limit(1000)

  let totalSent = 0
  let totalScanned = 0
  let cappedAny = false

  for (const tenant of tenants || []) {
    const tenantId = tenant.id
    if (!(await isCommEnabled(tenantId, 'rating_prompt', 'sms'))) continue
    const clientSms = await clientSmsTemplatesFor(tenantId)

    const { data: due, error } = await supabaseAdmin
      .from('bookings')
      .select('id, client_id, cleaner_id, start_time, clients(name), cleaners(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .not('check_out_time', 'is', null)
      .gte('check_out_time', oneDayAgo)
      .lte('check_out_time', thirtyMinAgo)
      .is('rating_prompt_sent_at', null)

    if (error) continue

    const dueList = due || []
    totalScanned += dueList.length

    if (dueList.length > CAP) {
      cappedAny = true
      const { emailAdmins, smsAdmins } = await import('@/lib/nycmaid/admin-contacts')
      const subject = `⚠️ BULK rating-prompt attempted — tenant ${tenant.name}, ${dueList.length} eligible, cap=${CAP}`
      const html = `<p>The rating-prompt cron tried to send to <strong>${dueList.length}</strong> clients in one run for tenant <strong>${tenant.name}</strong>. Cap is ${CAP}. Sent only the first ${CAP}; the rest are paused and need a human to review.</p>`
      await emailAdmins(subject, html).catch(() => {})
      await smsAdmins(`⚠️ Rating-prompt cron blocked at ${CAP}/${dueList.length} for ${tenant.name}.`).catch(() => {})
      await supabaseAdmin.from('notifications').insert({
        tenant_id: tenantId,
        type: 'cron_bulk_block',
        title: 'Rating-prompt bulk send blocked',
        message: `${dueList.length} clients eligible for ${tenant.name}. Cap=${CAP}. Sent ${CAP}, ${dueList.length - CAP} held for review.`,
      })
    }

    for (const booking of dueList.slice(0, CAP)) {
      if (!booking.client_id) continue
      await sendClientSMS(booking.client_id, clientSms.ratingQ1(), {
        smsType: 'rating_prompt',
        bookingId: booking.id,
      })
      await supabaseAdmin
        .from('bookings')
        .update({ rating_prompt_sent_at: new Date().toISOString() })
        .eq('id', booking.id)
        .eq('tenant_id', tenantId)
      totalSent++
    }
  }

  return NextResponse.json({
    ok: true,
    sent: totalSent,
    scanned: totalScanned,
    capped: cappedAny,
  })
}
