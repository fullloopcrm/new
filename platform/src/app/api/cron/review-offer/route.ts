/**
 * Sends the delayed "$20 off, leave a review" text once a 4-5 rating's
 * 10-minute window has passed. Separate from billing entirely — the pay
 * link already went out unconditionally in the 30-min-alert text, and
 * nothing about payment is gated on this. Runs every 5 min (Jeff, 2026-08-07).
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendClientSMS, type CommsTenant } from '@/lib/client-contacts'
import { getSettings } from '@/lib/settings'

export const maxDuration = 60

const REVIEW_CREDIT_DOLLARS = 20

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const now = new Date().toISOString()
  let sent = 0
  let skipped = 0
  const errors: string[] = []

  const { data: due } = await supabaseAdmin
    .from('ratings')
    .select('id, tenant_id, client_id, booking_id, service_rating')
    .lte('review_offer_due_at', now)
    .is('review_offer_sent_at', null)
    .gte('service_rating', 4)
    .limit(200)

  for (const rating of due || []) {
    try {
      // Claim first (idempotent, avoids double-send if two cron runs overlap).
      const { data: claimed } = await supabaseAdmin
        .from('ratings')
        .update({ review_offer_sent_at: new Date().toISOString() })
        .eq('id', rating.id)
        .is('review_offer_sent_at', null)
        .select('id')
        .maybeSingle()
      if (!claimed) { skipped++; continue }

      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('id, name, telnyx_api_key, telnyx_phone, domain, slug')
        .eq('id', rating.tenant_id)
        .single()
      if (!tenant?.telnyx_api_key || !tenant?.telnyx_phone || !rating.client_id) { skipped++; continue }

      const settings = await getSettings(rating.tenant_id)
      const reviewUrl = settings.google_review_link
        || (tenant.domain
          ? `https://${tenant.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/reviews/submit`
          : `https://${tenant.slug}.homeservicesbusinesscrm.com/reviews/submit`)

      const body = `If you'd like $${REVIEW_CREDIT_DOLLARS} off your next cleaning, please leave a review on our Google listing within the next 10 minutes: ${reviewUrl}`

      const result = await sendClientSMS(tenant as CommsTenant, rating.client_id, body)
      if (result.sent > 0) sent++
      else skipped++
    } catch (err) {
      errors.push(`rating ${rating.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ success: true, sent, skipped, errors: errors.slice(0, 20) })
}
