/**
 * Public quote acceptance. Captures signature + name + IP + UA, transitions to 'accepted'.
 * Idempotent — safe to replay.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logQuoteEvent } from '@/lib/quote'
import { rateLimitDb } from '@/lib/rate-limit-db'

type Params = { params: Promise<{ token: string }> }

function ipFromRequest(req: Request): string | null {
  const h = req.headers
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    null
  )
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params

    // Public, unauthenticated action endpoint (mutates the quote, fires deal
    // sync + owner email/SMS). Cap per-IP so a scripted retry loop can't spam
    // the tenant's notification pipeline. Mirrors /api/leads/visits guard.
    const rlIp = ipFromRequest(request) || 'unknown'
    const rl = await rateLimitDb(`quote-public-accept:${rlIp}`, 10, 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const signature_png = String(body.signature_png || '')
    const signature_name = String(body.signature_name || '').trim()
    const accepted_tier = body.accepted_tier ? String(body.accepted_tier) : null

    if (!signature_png.startsWith('data:image/') || signature_png.length < 100) {
      return NextResponse.json({ error: 'Signature required' }, { status: 400 })
    }
    // Cap the signature payload — public endpoint, unauth, TEXT column on DB.
    if (signature_png.length > 500_000) {
      return NextResponse.json({ error: 'Signature image too large' }, { status: 400 })
    }
    if (!signature_name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      // select('*') so a pre-migration DB (no recurring_type column yet) doesn't
      // error the accept — recurring_type just reads undefined → one-off path.
      .select('*')
      .eq('public_token', token)
      .maybeSingle()
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (quote.status === 'accepted' || quote.status === 'converted') {
      return NextResponse.json({ ok: true, already_accepted: true })
    }
    if (quote.status === 'declined' || quote.status === 'expired') {
      return NextResponse.json({ error: `Quote is ${quote.status}` }, { status: 400 })
    }

    const ip = ipFromRequest(request)
    const ua = request.headers.get('user-agent')
    const acceptedAt = new Date().toISOString()

    await supabaseAdmin
      .from('quotes')
      .update({
        status: 'accepted',
        accepted_at: acceptedAt,
        accepted_tier,
        signature_png,
        signature_name,
        signature_ip: ip,
        signature_user_agent: ua,
      })
      .eq('id', quote.id)

    await logQuoteEvent({
      quote_id: quote.id,
      tenant_id: quote.tenant_id,
      event_type: 'accepted',
      detail: { signature_name, accepted_tier, total_cents: quote.total_cents },
      ip_address: ip,
      user_agent: ua,
    })

    // Carry through the close rule (self-configured by the proposal's deposit):
    //   deposit required → deal → PENDING, wait for the deposit payment to close.
    //   no deposit       → deal → SOLD now + auto-create the Job (→ Schedule).
    // Only advance an OPEN deal so a re-fired accept never overrides sold/lost.
    const hasDeposit = (quote.deposit_cents || 0) > 0
    const isRecurring = !!quote.recurring_type
    // Fulfillment routing: 'booking' → Bookings, else → Job board (default).
    const isBooking = quote.fulfillment_type === 'booking'
    if (quote.deal_id) {
      try {
        const { data: dealRow } = await supabaseAdmin
          .from('deals')
          .select('stage')
          .eq('id', quote.deal_id)
          .eq('tenant_id', quote.tenant_id)
          .maybeSingle()
        if (dealRow && ['new', 'qualifying', 'quoted'].includes(dealRow.stage)) {
          const toStage = hasDeposit ? 'pending' : 'sold'
          await supabaseAdmin
            .from('deals')
            .update({
              stage: toStage,
              probability: hasDeposit ? 80 : 100,
              value_cents: quote.total_cents,
              last_activity_at: acceptedAt,
              ...(hasDeposit ? {} : { closed_at: acceptedAt }),
            })
            .eq('id', quote.deal_id)
            .eq('tenant_id', quote.tenant_id)
          await supabaseAdmin.from('deal_activities').insert([
            {
              tenant_id: quote.tenant_id,
              deal_id: quote.deal_id,
              type: 'stage_change',
              description: `Moved from ${dealRow.stage} to ${toStage}`,
              metadata: { from: dealRow.stage, to: toStage, quote_id: quote.id },
            },
            {
              tenant_id: quote.tenant_id,
              deal_id: quote.deal_id,
              type: 'note',
              description: hasDeposit
                ? `Proposal ${quote.quote_number} signed by ${signature_name} — awaiting deposit`
                : `Proposal ${quote.quote_number} accepted & signed by ${signature_name}`,
              metadata: { quote_id: quote.id, signature_name },
            },
          ])
        }
      } catch (dealErr) {
        console.warn('deal sync on accept failed', dealErr)
      }
    }

    // No deposit → the sale is closed on signature: spin up fulfillment now.
    //   recurring service → recurring_schedules series (the engine rolls it).
    //   otherwise         → a Job (project/one-off). Idempotent per helper.
    // Best-effort — never fail the customer's accept on a conversion error.
    if (!hasDeposit) {
      try {
        if (isRecurring) {
          const { createRecurringSeriesFromQuote } = await import('@/lib/sale-to-recurring')
          await createRecurringSeriesFromQuote(quote.tenant_id, quote.id)
        } else if (isBooking) {
          const { createBookingFromQuote } = await import('@/lib/sale-to-booking')
          await createBookingFromQuote(quote.tenant_id, quote.id)
        } else {
          const { convertSaleToJob } = await import('@/lib/jobs')
          await convertSaleToJob(quote.tenant_id, { type: 'quote', quoteId: quote.id }, {})
        }
      } catch (convErr) {
        console.warn('sale conversion on accept failed', convErr)
      }
    }

    // Notify business owner — best-effort, don't fail the accept on notify errors
    try {
      const { notify } = await import('@/lib/notify')
      await notify({
        tenantId: quote.tenant_id,
        type: 'quote_accepted',
        title: `Quote ${quote.quote_number} accepted`,
        message: `Signed by ${signature_name} — total $${(quote.total_cents / 100).toFixed(2)}`,
        channel: 'email',
        recipientType: 'admin',
        metadata: { quote_id: quote.id, href: `/admin/sales-hub/quotes/${quote.id}` },
      })
    } catch (e) {
      console.warn('notify quote_accepted failed', e)
    }

    const { ownerAlert } = await import('@/lib/messaging/owner-alerts')
    await ownerAlert({
      tenantId: quote.tenant_id,
      subject: hasDeposit ? `Signed — awaiting deposit (${quote.quote_number})` : `SOLD — ${quote.quote_number}`,
      kicker: hasDeposit ? 'Signed — awaiting deposit' : 'Sold',
      heading: hasDeposit ? `${signature_name} signed — deposit next` : `${signature_name} accepted — it's a sale`,
      bodyHtml: `<p style="margin:0 0 12px">Proposal <strong>${quote.quote_number}</strong> was accepted & signed.</p><p style="margin:0"><strong>${(quote.total_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong>${hasDeposit ? ` · deposit ${(quote.deposit_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} due` : (isRecurring ? ' · closed to Sold, recurring series created' : isBooking ? ' · closed to Sold, booking created' : ' · closed to Sold, job created')}</p>`,
      sms: hasDeposit
        ? `${signature_name} signed ${quote.quote_number}. Awaiting deposit.`
        : `SOLD: ${signature_name} accepted ${quote.quote_number}. ${isRecurring ? 'Recurring series created — first visits scheduled.' : isBooking ? 'Booking created — schedule it.' : 'Job created — schedule it.'}`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/quotes/public/[token]/accept', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
