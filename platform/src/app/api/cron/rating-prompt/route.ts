import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendClientSMS } from '@/lib/nycmaid/client-contacts'
import { smsRatingQ1 } from '@/lib/nycmaid/sms-templates'
import { protectCronAPI } from '@/lib/nycmaid/auth'

// Runs every 5 min. Sends ONE SMS — Q1 only — 30+ min after the cleaner
// checked out: "How was your service today?" Reply triggers Q2 in the
// telnyx webhook. No reply = no further texts. Q2 + Q3 only fire when
// the previous step gets a reply, so we never bombard.
//
// 5/5 follow-up review-request still goes via email (clientReviewRequestEmail
// in /api/webhook/telnyx), gated on the final feedback step.
export async function GET(request: Request) {
  const authError = protectCronAPI(request)
  if (authError) return authError

  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  // Floor at 24 hours — only ask for ratings on jobs completed in the last
  // day. Without a floor we'd back-blast every historic completed booking
  // that doesn't already have rating_prompt_sent_at set.
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: due, error } = await supabaseAdmin
    .from('bookings')
    .select('id, client_id, cleaner_id, start_time, clients(name), cleaners(name)')
    .eq('status', 'completed')
    .not('check_out_time', 'is', null)
    .gte('check_out_time', oneDayAgo)
    .lte('check_out_time', thirtyMinAgo)
    .is('rating_prompt_sent_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Per-run safety cap. A normal day, fewer than 5 jobs complete in any
  // 35-min window. If we ever see more than CAP eligible at once, something
  // upstream regressed (e.g. trigger column changed without a recency
  // floor — the bug that produced the 157-SMS blast). Send up to CAP and
  // alert admin so a human reviews before more go out.
  const CAP = 10
  const dueList = due || []
  if (dueList.length > CAP) {
    const { emailAdmins, smsAdmins } = await import('@/lib/nycmaid/admin-contacts')
    const subject = `⚠️ BULK rating-prompt attempted — ${dueList.length} eligible, cap=${CAP}`
    const html = `<p>The rating-prompt cron tried to send to <strong>${dueList.length}</strong> clients in one run. Cap is ${CAP}. Sent only the first ${CAP}; the rest are paused and need a human to review whether the trigger criteria is correct.</p><p>To resume, manually call the cron after confirming nothing's wrong.</p>`
    await emailAdmins(subject, html).catch(() => {})
    await smsAdmins(`⚠️ Rating-prompt cron blocked at ${CAP}/${dueList.length}. Check admin.`).catch(() => {})
    await supabaseAdmin.from('notifications').insert({
      type: 'cron_bulk_block',
      title: 'Rating-prompt bulk send blocked',
      message: `${dueList.length} clients eligible. Cap=${CAP}. Sent ${CAP}, ${dueList.length - CAP} held for review.`,
    })
  }

  let sent = 0
  for (const booking of dueList.slice(0, CAP)) {
    if (!booking.client_id) continue
    await sendClientSMS(booking.client_id, smsRatingQ1(), {
      smsType: 'rating_prompt',
      bookingId: booking.id,
    })
    await supabaseAdmin
      .from('bookings')
      .update({ rating_prompt_sent_at: new Date().toISOString() })
      .eq('id', booking.id)
    sent++
  }

  return NextResponse.json({
    ok: true,
    sent,
    scanned: dueList.length,
    capped: dueList.length > CAP,
  })
}
