/**
 * Stripe webhook — ported from nycmaid (2026-04-19), tenant-aware.
 * Handles: checkout completion, payments table insert, tip detection,
 * cleaner auto-payout via Stripe Connect (when team_member has stripe_account_id),
 * client/cleaner/admin notifications.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { escapeHtml } from '@/lib/escape-html'
import { sendSMS } from '@/lib/sms'
import { smsAdmins } from '@/lib/admin-contacts'
import { cleanerPaidHours } from '@/lib/billing-hours'
import { effectiveCleanerRate } from '@/lib/cleaner-pay'
import { isNycMaid, NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'
import { smsAdmins as nmSmsAdmins } from '@/lib/nycmaid/admin-contacts'
import { signupPricing } from '@/lib/tier-prices'
import { postPaymentRevenue } from '@/lib/finance/post-revenue'
import { postPayoutToLedger } from '@/lib/finance/post-labor'
import { postDepositToLedger, postRefundToLedger, postChargebackToLedger, tenantFromPaymentIntent, syncBookingRefundStatus } from '@/lib/finance/post-adjustments'
import Stripe from 'stripe'

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

// Escape LIKE/ILIKE wildcards so the payer-email lookup below only ever
// matches the literal address. Unescaped, a Stripe Checkout customer who
// enters '%' (or any string containing '%'/'_') as their email at checkout
// would match an arbitrary NYC Maid client on this tenant-scoped lookup —
// letting a bogus/low-amount payment get attributed to (and mark paid) an
// unrelated client's booking, triggering the auto cleaner-payout path below.
// Same pattern already fixed on /api/referrers, /api/pin-reset, etc.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  let stripe: Stripe
  try {
    stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      let bookingId = session.metadata?.booking_id
      let tenantId = session.metadata?.tenant_id
      const invoiceId = session.metadata?.invoice_id

      // Static pay-link path (NYC Maid parity): the link appends
      // ?client_reference_id=<bookingId> with no metadata. If it matches a real
      // booking, resolve booking + tenant here so it routes to the booking-payment
      // path below, not the Full Loop signup path. Strictly additive — a prospect's
      // client_reference_id won't match a booking id, so signups are unaffected.
      if (!bookingId && session.client_reference_id) {
        const { data: refBooking } = await supabaseAdmin
          .from('bookings')
          .select('id, tenant_id')
          .eq('id', session.client_reference_id)
          .maybeSingle()
        if (refBooking) {
          bookingId = refBooking.id
          tenantId = tenantId || refBooking.tenant_id
        }
      }

      // Prospect identifier comes from:
      //   (a) metadata.prospect_id — when session was created via our admin
      //       approve flow (checkout session includes metadata we set).
      //   (b) client_reference_id — when session originated from a Stripe
      //       Payment Link with ?client_reference_id=<prospect_id> appended.
      //       Payment Links don't support metadata per-customer, so this is
      //       the only per-prospect signal available.
      const prospectId = session.metadata?.prospect_id || session.client_reference_id || undefined
      const isFullLoopSignup =
        session.metadata?.full_loop_signup === 'true' ||
        (!!session.client_reference_id && !bookingId && !invoiceId)

      // ── Full Loop signup: prospect paid → create tenant ──
      if (prospectId && isFullLoopSignup) {
        // Compare-and-swap claim. Stripe retries webhooks; two deliveries can
        // race and both see prospect.tenant_id = null before either writes.
        // Flip status approved|reviewing → paid in a single UPDATE so only one
        // delivery wins; losers return idempotent without inserting a tenant.
        const { data: claim } = await supabaseAdmin
          .from('prospects')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_checkout_session_id: session.id,
          })
          .eq('id', prospectId)
          .in('status', ['approved', 'reviewing', 'new'])
          .select('id')
          .maybeSingle()

        if (!claim) {
          return NextResponse.json({ received: true, already_processed: true })
        }

        const { data: prospect } = await supabaseAdmin.from('prospects').select('*').eq('id', prospectId).single()
        if (prospect && !prospect.tenant_id) {
          // Seat-based signup pricing, recomputed server-side from checkout
          // metadata (never from $ stored on the prospect row) so a corrupted
          // row can't mint a $0 tenant. Defaults to 1 admin ($2,500/mo) when a
          // legacy Payment Link supplies no seat metadata.
          const pricing = signupPricing({
            admins: Number(session.metadata?.admins) || 1,
            teamMembers: Number(session.metadata?.team_members) || 0,
          })

          const slug = prospect.business_name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 48) + '-' + prospectId.slice(0, 6)
          // Normalize via mapIndustry (same as create-tenant-from-lead.ts) so the
          // stored value is always a real IndustryKey, not whatever free-text
          // landed in prospect.trade — a raw value here would silently fail to
          // match TRADE_HR_DOC_REQUIREMENTS/PER_UNIT_BY_INDUSTRY lookups below.
          const { mapIndustry } = await import('@/lib/provision-tenant')
          const industry = mapIndustry(prospect.trade)
          const { data: tenant } = await supabaseAdmin
            .from('tenants')
            .insert({
              name: prospect.business_name,
              slug,
              industry,
              phone: prospect.owner_phone,
              email: prospect.owner_email,
              owner_name: prospect.owner_name,
              owner_email: prospect.owner_email,
              owner_phone: prospect.owner_phone,
              status: 'active',
              // 'plan' is a non-pricing segment label; billing is seat-based (monthly_rate).
              plan: prospect.paid_tier || session.metadata?.tier || 'pro',
              monthly_rate: Math.round(pricing.monthly_cents / 100),
              setup_fee: Math.round(pricing.setup_cents / 100),
              // Setup is paid by bank wire out of band — mark it paid via the admin
              // "Mark setup fee as paid" action when the wire lands, not at card checkout.
              setup_fee_paid_at: null,
              // Store the subscription id so seat changes can re-sync per-seat quantities.
              stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
              // Persist the seat counts so the tenant board / rate stay seat-driven.
              admin_seats: pricing.admins,
              team_seats: pricing.teamMembers,
              billing_status: 'active',
              address: prospect.primary_city && prospect.primary_state
                ? `${prospect.primary_city}, ${prospect.primary_state} ${prospect.primary_zip || ''}`.trim()
                : null,
            })
            .select('id')
            .single()
          if (tenant) {
            // Seed default entity + chart of accounts + Selena config. This is
            // the same finance_hr step activateTenant runs (activate-tenant.ts
            // step 3b) — this webhook is a second, separate tenant-creation
            // door (prospects/admin-approve flow, distinct from stripe-platform's
            // createTenantFromLead+activateTenant flow) that never called it, so
            // a tenant born here had no chart of accounts (P&L/ledger totally
            // broken) and no HR doc-requirement template.
            const { ensureDefaultEntity } = await import('@/lib/entity-provision')
            const { seedChartOfAccounts } = await import('@/lib/ledger')
            const { seedHrDefaults } = await import('@/lib/hr')
            await ensureDefaultEntity(tenant.id, prospect.business_name)
            await seedChartOfAccounts(tenant.id)
            await seedHrDefaults(tenant.id, industry)
            const { provisionTenant } = await import('@/lib/provision-tenant')
            await provisionTenant({
              tenantId: tenant.id,
              industry,
            })
            await supabaseAdmin.from('prospects').update({
              tenant_id: tenant.id,
            }).eq('id', prospectId)

            // Send tenant owner an invite so they can log in and run setup.
            // Without this, a paid tenant has no way into their dashboard
            // and would be stuck until a super-admin manually invited them.
            try {
              const { randomBytes } = await import('node:crypto')
              const token = randomBytes(32).toString('hex')
              const expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
              await supabaseAdmin.from('tenant_invites').insert({
                tenant_id: tenant.id,
                email: prospect.owner_email.toLowerCase(),
                role: 'owner',
                token,
                expires_at,
              })
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://homeservicesbusinesscrm.com'
              const joinUrl = `${appUrl}/join/${token}`
              const { sendEmail } = await import('@/lib/email')
              await sendEmail({
                to: prospect.owner_email,
                subject: `Welcome to Full Loop CRM — set up ${prospect.business_name}`,
                html: `
                  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;">
                    <div style="background:#1e40af;padding:28px;text-align:center;border-radius:12px 12px 0 0;">
                      <h1 style="color:white;margin:0;font-size:22px;">Welcome to Full Loop CRM</h1>
                    </div>
                    <div style="background:#f9fafb;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                      <p style="color:#111827;font-size:15px;line-height:1.6;margin:0 0 16px;">Hi ${escapeHtml(prospect.owner_name || 'there')},</p>
                      <p style="color:#4b5563;line-height:1.6;margin:0 0 16px;">
                        Your ${escapeHtml(prospect.business_name)} account is set up and ready. Click below to sign in, finish onboarding, and connect your phone number, email, and payment integrations.
                      </p>
                      <div style="text-align:center;margin:24px 0;">
                        <a href="${joinUrl}" style="display:inline-block;background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Get Started</a>
                      </div>
                      <p style="color:#6b7280;font-size:13px;line-height:1.6;">This link expires in 14 days. If you weren't expecting this, you can safely ignore it.</p>
                    </div>
                  </div>
                `,
              })
            } catch (inviteErr) {
              console.error(`[stripe] tenant ${tenant.id} created but invite failed:`, inviteErr)
              // Don't fail the whole webhook — tenant is created. Super-admin
              // can manually resend via /api/admin/invites.
            }
          }
        }
        return NextResponse.json({ received: true, signup_paid: true })
      }

      // ── Invoice path — paid directly via invoice public link ──
      if (invoiceId && tenantId && !bookingId) {
        const { data: existing } = await supabaseAdmin
          .from('payments')
          .select('id')
          .eq('stripe_session_id', session.id)
          .limit(1)
        if (existing && existing.length > 0) {
          return NextResponse.json({ received: true, idempotent: true })
        }
        const { data: invPayment, error: invPaymentErr } = await supabaseAdmin.from('payments').insert({
          tenant_id: tenantId,
          invoice_id: invoiceId,
          amount_cents: session.amount_total || 0,
          method: 'stripe',
          status: 'succeeded',
          stripe_session_id: session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
        }).select('id').single()
        // Same race as the booking path above: the unique constraint on
        // stripe_session_id is the real claim, not the SELECT above.
        if (invPaymentErr?.code === '23505') {
          return NextResponse.json({ received: true, idempotent: true })
        }
        // DB trigger recomputes invoice.amount_paid_cents and status.
        if (invPayment?.id) {
          postPaymentRevenue({ tenantId, paymentId: invPayment.id })
            .catch(err => console.error('[stripe] invoice revenue post failed:', err))
        }
        return NextResponse.json({ received: true, invoice_paid: true })
      }

      // ── Proposal deposit path — customer paid the deposit on a public quote ──
      if (session.metadata?.quote_deposit === 'true' && session.metadata?.quote_id && tenantId) {
        const quoteId = session.metadata.quote_id
        const { data: q } = await supabaseAdmin
          .from('quotes')
          .select('id, deal_id, deposit_paid_at, deposit_cents, quote_number')
          .eq('id', quoteId).eq('tenant_id', tenantId).maybeSingle()
        if (!q) return NextResponse.json({ received: true, quote_not_found: true })
        if (q.deposit_paid_at) return NextResponse.json({ received: true, idempotent: true })

        const amt = session.amount_total || q.deposit_cents || 0
        const nowIso = new Date().toISOString()
        // Atomic claim: two concurrent webhook deliveries can both pass the
        // deposit_paid_at check above before either UPDATE commits. Guard the
        // WRITE itself with the same IS NULL condition (same pattern as the
        // prospect claim above) so only one delivery's UPDATE actually lands;
        // the loser gets no row back and must stop before double-posting the
        // deposit to the ledger, double-closing the deal, and double-creating
        // the job below.
        const { data: depositClaim } = await supabaseAdmin.from('quotes')
          .update({ deposit_paid_cents: amt, deposit_paid_at: nowIso, deposit_session_id: session.id })
          .eq('id', quoteId).eq('tenant_id', tenantId).is('deposit_paid_at', null)
          .select('id').maybeSingle()
        if (!depositClaim) return NextResponse.json({ received: true, idempotent: true })

        // Deposit is unearned until the job runs → post as a liability, not revenue.
        postDepositToLedger({ tenantId, sourceId: quoteId, amountCents: amt, memo: `Deposit ${q.quote_number}` })
          .catch(err => console.error('[stripe] deposit ledger post failed:', err))

        // Deposit closes the sale: advance the deal to sold + create the Job.
        if (q.deal_id) {
          const { data: deal } = await supabaseAdmin
            .from('deals').select('stage').eq('id', q.deal_id).eq('tenant_id', tenantId).maybeSingle()
          if (deal && ['new', 'qualifying', 'quoted', 'pending'].includes(deal.stage)) {
            await supabaseAdmin.from('deals')
              .update({ stage: 'sold', probability: 100, closed_at: nowIso, last_activity_at: nowIso })
              .eq('id', q.deal_id).eq('tenant_id', tenantId)
            await supabaseAdmin.from('deal_activities').insert([
              { tenant_id: tenantId, deal_id: q.deal_id, type: 'stage_change', description: `Moved from ${deal.stage} to sold`, metadata: { from: deal.stage, to: 'sold', quote_id: quoteId } },
              { tenant_id: tenantId, deal_id: q.deal_id, type: 'note', description: `Deposit $${(amt / 100).toFixed(2)} paid — closed to Sold`, metadata: { quote_id: quoteId } },
            ])
          }
        }
        try { const { convertSaleToJob } = await import('@/lib/jobs'); await convertSaleToJob(tenantId, { type: 'quote', quoteId }, {}) } catch (e) { console.warn('[stripe] deposit convert-to-job failed', e) }
        try {
          const { ownerAlert } = await import('@/lib/messaging/owner-alerts')
          await ownerAlert({
            tenantId, subject: `Deposit paid — ${q.quote_number}`, kicker: 'Deposit paid',
            heading: `${q.quote_number} — deposit in, it's sold`,
            bodyHtml: `<p style="margin:0">Deposit <strong>$${(amt / 100).toFixed(2)}</strong> received. Closed to Sold — job created, ready to schedule.</p>`,
            sms: `Deposit $${(amt / 100).toFixed(0)} paid on ${q.quote_number}. SOLD — schedule the job.`,
          })
        } catch (e) { console.warn('[stripe] deposit owner alert failed', e) }
        return NextResponse.json({ received: true, quote_deposit_paid: true })
      }

      // NYC Maid parity: a Stripe pay-link payment that arrived with NO booking
      // reference — recover by matching the payer email to the NYC Maid client's
      // most recent unpaid job; if we can't, alert admin so money never sits
      // invisible (FL previously dropped these silently).
      if (!bookingId) {
        const payerEmail = session.customer_details?.email?.toLowerCase()
        const amountC = session.amount_total || 0
        if (payerEmail) {
          const { data: mc } = await supabaseAdmin
            .from('clients')
            .select('id, name')
            .eq('tenant_id', NYCMAID_TENANT_ID)
            .ilike('email', escapeLike(payerEmail))
            .limit(1)
            .maybeSingle()
          if (mc) {
            const { data: cands } = await supabaseAdmin
              .from('bookings')
              .select('id, status')
              .eq('tenant_id', NYCMAID_TENANT_ID)
              .eq('client_id', mc.id)
              .neq('payment_status', 'paid')
              .in('status', ['completed', 'in_progress', 'scheduled'])
              .order('start_time', { ascending: false })
              .limit(5)
            const pick = (cands || []).find((b) => b.status === 'completed') || (cands || [])[0]
            if (pick) {
              bookingId = pick.id
              tenantId = NYCMAID_TENANT_ID
            }
          }
        }
        if (!bookingId) {
          await nmSmsAdmins(`Stripe $${(amountC / 100).toFixed(2)} from ${payerEmail || 'unknown'} — no booking ref, couldn't auto-match. Apply manually.`).catch(() => {})
          break
        }
      }
      if (!tenantId) break

      // Idempotency — skip if we already processed this session
      const { data: existing } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('stripe_session_id', session.id)
        .limit(1)
      if (existing && existing.length > 0) {
        return NextResponse.json({ received: true, idempotent: true })
      }

      // Look up booking + cleaner + tenant for tip math
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id, team_member_id, hourly_rate, pay_rate, team_member_pay, team_member_paid, actual_hours, price, team_members!bookings_team_member_id_fkey(name, phone, pay_rate, stripe_account_id, preferred_language), clients(name, phone, address), tenants(name, telnyx_api_key, telnyx_phone)')
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)
        .single()

      if (!booking) {
        console.error(`[stripe] booking ${bookingId} not found for tenant ${tenantId}`)
        break
      }

      const tm = booking.team_members as unknown as { name?: string; phone?: string; stripe_account_id?: string; preferred_language?: string } | null
      const client = booking.clients as unknown as { name?: string; phone?: string; address?: string | null } | null
      const tenant = booking.tenants as unknown as { name?: string; telnyx_api_key?: string; telnyx_phone?: string } | null

      const amountCents = session.amount_total || 0
      const hours = booking.actual_hours || (booking.price && booking.hourly_rate ? booking.price / 100 / booking.hourly_rate : null)
      const expectedCents = booking.price || (hours && booking.hourly_rate ? Math.round(hours * booking.hourly_rate * 100) : 0)

      // Tip = anything paid above expected (with 95% partial threshold)
      let tipCents = 0
      let isPartial = false
      if (expectedCents > 0) {
        if (amountCents >= expectedCents) {
          tipCents = amountCents - expectedCents
        } else if (amountCents < expectedCents * 0.95) {
          isPartial = true
        }
      }

      // 1. Insert payment row (capture id → post revenue to ledger immediately).
      // The unique constraint on stripe_session_id is the real idempotency
      // claim here -- the SELECT above only catches the common case cheaply.
      // Two concurrent webhook deliveries for the same session can both pass
      // that SELECT before either INSERT commits; the loser's INSERT hits the
      // unique constraint and MUST stop here, before the cleaner Stripe
      // transfer below, or the same charge pays the cleaner out twice.
      const { data: bookingPayment, error: bookingPaymentErr } = await supabaseAdmin.from('payments').insert({
        tenant_id: tenantId,
        booking_id: bookingId,
        client_id: booking.client_id,
        amount_cents: amountCents,
        tip_cents: tipCents,
        method: 'stripe',
        status: isPartial ? 'partial' : 'completed',
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      }).select('id').single()
      if (bookingPaymentErr) {
        if (bookingPaymentErr.code === '23505') {
          return NextResponse.json({ received: true, idempotent: true })
        }
        console.error('[stripe] booking payment insert failed:', bookingPaymentErr)
      }
      if (bookingPayment?.id) {
        postPaymentRevenue({ tenantId, paymentId: bookingPayment.id })
          .catch(err => console.error('[stripe] booking revenue post failed:', err))
      }

      // 2. Update booking
      await supabaseAdmin
        .from('bookings')
        .update({
          payment_status: isPartial ? 'partial' : 'paid',
          payment_method: 'stripe',
          payment_date: new Date().toISOString(),
          tip_amount: tipCents,
          partial_payment_cents: isPartial ? amountCents : null,
        })
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)

      // 3. If partial, open admin task instead of payout
      if (isPartial) {
        await supabaseAdmin.from('admin_tasks').insert({
          tenant_id: tenantId,
          type: 'partial_payment',
          priority: 'high',
          title: `Partial payment — ${client?.name || 'Client'}`,
          description: `Received $${(amountCents / 100).toFixed(2)} of expected $${(expectedCents / 100).toFixed(2)}. Reconcile manually.`,
          related_type: 'booking',
          related_id: bookingId,
        })
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'payment_partial',
          title: 'Partial Payment Received',
          message: `$${(amountCents / 100).toFixed(2)} (expected $${(expectedCents / 100).toFixed(2)}) for booking #${bookingId.slice(0, 8)}`,
          channel: 'in_app',
        })
        return NextResponse.json({ received: true, partial: true })
      }

      // 4. Auto-pay cleaner if connected to Stripe Connect
      let payoutSent = false
      // team_member_paid guard: this booking may already have been paid out by
      // a prior checkout.session.completed delivery for a DIFFERENT session_id
      // (e.g. client double-paid a reusable static Payment Link, or a fresh
      // session was created for an already-paid booking). The insert-guard
      // above only dedupes the SAME session.id — it does not stop a second,
      // genuinely distinct session from re-triggering a real Stripe transfer
      // to the cleaner for a job already paid out.
      if (tm?.stripe_account_id && booking.team_member_id && !(booking as { team_member_paid?: boolean | null }).team_member_paid) {
        // Atomic claim: `booking` above is a snapshot fetched before the
        // payments insert-guard, so `!booking.team_member_paid` is stale by
        // the time we get here. Two concurrent checkout.session.completed
        // deliveries for the same booking under DIFFERENT session ids (a
        // reused static Payment Link paid twice, or a fresh session created
        // for an already-paid booking) both pass that stale read. This
        // conditional UPDATE is the real gate — Postgres row locking means
        // only one concurrent caller's UPDATE can match
        // `team_member_paid = false`; the loser gets 0 rows and must not
        // transfer. Claim BEFORE calling Stripe, not after.
        const { data: claimRows } = await supabaseAdmin
          .from('bookings')
          .update({ team_member_paid: true, team_member_paid_at: new Date().toISOString() })
          .eq('id', bookingId)
          .eq('tenant_id', tenantId)
          .or('team_member_paid.is.null,team_member_paid.eq.false')
          .select('id')

        if (!claimRows || claimRows.length === 0) {
          console.warn(`[stripe] concurrent payout claim lost for booking ${bookingId} — skipping duplicate transfer`)
        } else {
        try {
          // Cleaner is paid THEIR rate × hours (NYC Maid parity) — NOT the
          // client's total. Prefer the breakdown stored at closeout/recap
          // (booking.team_member_pay, cents); else compute cleaner-grace hours ×
          // pay_rate. Tip passes through 100% on top.
          const storedPay = (booking as { team_member_pay?: number | null }).team_member_pay
          const baseCleanerRate = (tm as { pay_rate?: number | null })?.pay_rate || (booking as { pay_rate?: number | null }).pay_rate || 25
          // $35 NJ / Long Island / Westchester floor by JOB location — NYC Maid tenant ONLY.
          const cleanerRate = isNycMaid(tenantId)
            ? effectiveCleanerRate(baseCleanerRate, client?.address ?? null)
            : baseCleanerRate
          const cleanerHours = Math.max(0.5, cleanerPaidHours((hours || 0) * 60))
          const cleanerBaseCents = storedPay && storedPay > 0 ? storedPay : Math.round(cleanerHours * cleanerRate * 100)
          const cleanerCents = cleanerBaseCents + tipCents
          // Idempotency key scoped to (bookingId, session.id): an ambiguous
          // network failure (Stripe processes the transfer but the response
          // never reaches us) would otherwise release the claim above and let
          // a later retry for this SAME session fire a genuine second
          // transfer. A distinct session.id (reused Payment Link, fresh
          // checkout for the same booking) still gets its own key — that's
          // the atomic claim's job to gate, not this key's.
          const transfer = await stripe.transfers.create({
            amount: cleanerCents,
            currency: 'usd',
            destination: tm.stripe_account_id,
            transfer_group: bookingId,
            metadata: { booking_id: bookingId, tenant_id: tenantId },
          }, {
            idempotencyKey: `cleaner-payout:${bookingId}:${session.id}`,
          })
          // NYC Maid parity: push an INSTANT payout to the cleaner's bank so
          // funds land immediately, not on the standard Connect schedule. The
          // transfer already landed; a failed instant payout is non-fatal.
          if (isNycMaid(tenantId)) {
            await stripe.payouts.create(
              { amount: cleanerCents, currency: 'usd', method: 'instant' },
              { stripeAccount: tm.stripe_account_id, idempotencyKey: `cleaner-instant-payout:${bookingId}:${session.id}` },
            ).catch((err) => console.error('[stripe] NYC Maid instant payout failed (transfer landed):', err))
          }
          const { data: payoutRow } = await supabaseAdmin.from('team_member_payouts').insert({
            tenant_id: tenantId,
            team_member_id: booking.team_member_id,
            booking_id: bookingId,
            amount_cents: cleanerCents - tipCents,
            tip_cents: tipCents,
            stripe_transfer_id: transfer.id,
            status: 'transferred',
            paid_at: new Date().toISOString(),
          }).select('id').single()
          if (payoutRow?.id) {
            postPayoutToLedger({ tenantId, payoutId: payoutRow.id })
              .catch(err => console.error('[stripe] payout ledger post failed:', err))
          }
          // Claim already set team_member_paid=true; just record the amount.
          await supabaseAdmin
            .from('bookings')
            .update({ team_member_pay: cleanerCents })
            .eq('id', bookingId)
            .eq('tenant_id', tenantId)
          payoutSent = true
        } catch (payoutErr) {
          console.error('[stripe] cleaner payout failed:', payoutErr)
          // The transfer itself never landed — release the claim so a
          // legitimate retry (or manual payout) can still pay the team
          // member instead of permanently looking paid-out with no transfer.
          await supabaseAdmin
            .from('bookings')
            .update({ team_member_paid: false, team_member_paid_at: null })
            .eq('id', bookingId)
            .eq('tenant_id', tenantId)
            .then(() => {}, () => {})
          await supabaseAdmin.from('admin_tasks').insert({
            tenant_id: tenantId,
            type: 'payout_failed',
            priority: 'high',
            title: `Payout failed — ${tm.name}`,
            description: `Stripe Connect transfer failed: ${payoutErr instanceof Error ? payoutErr.message : 'unknown'}`,
            related_type: 'booking',
            related_id: bookingId,
          })
        }
        }
      }

      // 5. SMS the cleaner with payment + tip (bilingual)
      if (tm?.phone && tenant?.telnyx_api_key && tenant?.telnyx_phone) {
        const isEs = tm.preferred_language === 'es'
        const tipNote = tipCents > 0
          ? (isEs ? `\n\n¡Propina de $${(tipCents / 100).toFixed(0)}! 💰` : `\n\nClient tipped $${(tipCents / 100).toFixed(0)}! 💰`)
          : ''
        // NYC Maid rule: the cleaner is NOT shown the client's total/details —
        // only that payment landed (+ their own tip). No client charge amount.
        const body = isEs
          ? `Pago recibido del trabajo de ${client?.name || 'cliente'}.${payoutSent ? ' Enviado a tu cuenta.' : ''}${tipNote}`
          : `Payment received for ${client?.name || 'client'}'s job.${payoutSent ? ' Sent to your account.' : ''}${tipNote}`
        sendSMS({
          to: tm.phone,
          body,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        }).catch(err => console.error('[stripe] cleaner SMS failed:', err))
      }

      // 6. SMS client a thank-you
      if (client?.phone && tenant?.telnyx_api_key && tenant?.telnyx_phone) {
        const tipLine = tipCents > 0 ? ` and the ${(tipCents / 100).toFixed(0)} tip` : ''
        const body = `Thanks for the payment of $${(amountCents / 100).toFixed(0)}${tipLine}! 😊 — ${tenant.name || ''}`
        sendSMS({
          to: client.phone,
          body,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        }).catch(err => console.error('[stripe] client SMS failed:', err))
      }

      // 6b. Admin "payment CONFIRMED" SMS (NYC Maid parity — was missing; only
      // the in-app notification fired, so the owner never got a text). Admin DOES
      // see the total (unlike the cleaner).
      {
        const tipNote = tipCents > 0 ? ` (tip $${(tipCents / 100).toFixed(0)})` : ''
        const payoutNote = payoutSent ? ' Cleaner paid out.' : ''
        const adminMsg = `Stripe payment CONFIRMED — ${client?.name || 'Client'} paid $${(amountCents / 100).toFixed(2)}.${tipNote}${payoutNote} Client + cleaner notified.`
        await smsAdmins(tenantId, adminMsg).catch(err => console.error('[stripe] admin payment SMS failed:', err))
      }

      // 7. In-app notification
      await supabaseAdmin.from('notifications').insert({
        tenant_id: tenantId,
        type: 'payment_received',
        title: `Payment Received — $${(amountCents / 100).toFixed(2)}`,
        message: `${client?.name || 'Client'} paid for booking #${bookingId.slice(0, 8)}${tipCents > 0 ? ` (tip: $${(tipCents / 100).toFixed(2)})` : ''}${payoutSent ? ' — cleaner paid out' : ''}`,
        channel: 'in_app',
      })

      break
    }

    case 'charge.refunded': {
      // Refund issued in Stripe → reverse the sale in the ledger.
      const charge = event.data.object as Stripe.Charge
      const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
      const resolved = piId ? await tenantFromPaymentIntent(piId) : null
      if (resolved) {
        const memo = resolved.bookingId ? `Refund · booking ${resolved.bookingId.slice(0, 8)}` : 'Refund'
        const refunds = charge.refunds?.data || []
        if (refunds.length > 0) {
          for (const r of refunds) {
            await postRefundToLedger({ tenantId: resolved.tenantId, sourceId: r.id, amountCents: r.amount, memo })
              .catch(err => console.error('[stripe] refund post failed:', err))
          }
        } else if (charge.amount_refunded > 0) {
          // Fallback when the refunds list isn't expanded on the event.
          await postRefundToLedger({ tenantId: resolved.tenantId, sourceId: charge.id, amountCents: charge.amount_refunded, memo })
            .catch(err => console.error('[stripe] refund post failed:', err))
        }
        // Full refund (cumulative amount_refunded covers the whole charge) →
        // flip the booking so revenue reports stop counting it as collected.
        // Partial refunds intentionally left alone (see syncBookingRefundStatus).
        if (resolved.bookingId && typeof charge.amount === 'number' && charge.amount_refunded >= charge.amount) {
          await syncBookingRefundStatus({ tenantId: resolved.tenantId, bookingId: resolved.bookingId })
            .catch(err => console.error('[stripe] booking refund-status sync failed:', err))
        }
      }
      break
    }

    case 'charge.dispute.created': {
      // Chargeback opened → record the loss + flag the owner to respond in Stripe.
      const dispute = event.data.object as Stripe.Dispute
      const piId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id
      const resolved = piId ? await tenantFromPaymentIntent(piId) : null
      if (resolved) {
        await postChargebackToLedger({ tenantId: resolved.tenantId, sourceId: dispute.id, amountCents: dispute.amount, memo: 'Chargeback / dispute' })
          .catch(err => console.error('[stripe] chargeback post failed:', err))
        await supabaseAdmin.from('admin_tasks').insert({
          tenant_id: resolved.tenantId,
          type: 'chargeback',
          priority: 'high',
          title: `Chargeback $${(dispute.amount / 100).toFixed(2)}`,
          description: `Dispute ${dispute.id} opened — respond in Stripe before the deadline.`,
          related_type: 'booking',
          related_id: resolved.bookingId,
        }).then(() => {}, () => {})
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent
      const bookingId = intent.metadata?.booking_id
      const tenantId = intent.metadata?.tenant_id

      if (bookingId && tenantId) {
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: `Payment failed for booking #${bookingId.slice(0, 8)}: ${intent.last_payment_error?.message || 'Unknown error'}`,
          channel: 'in_app',
        })
        await supabaseAdmin.from('admin_tasks').insert({
          tenant_id: tenantId,
          type: 'payment_failed',
          priority: 'high',
          title: 'Stripe payment failed',
          description: intent.last_payment_error?.message || 'Unknown error',
          related_type: 'booking',
          related_id: bookingId,
        })
      }
      break
    }

    case 'account.updated': {
      // Stripe Connect account updates — track team_member onboarding state
      const account = event.data.object as Stripe.Account
      const teamMemberId = (account.metadata as Record<string, string> | null)?.team_member_id
      const tenantId = (account.metadata as Record<string, string> | null)?.tenant_id
      if (teamMemberId && tenantId && account.charges_enabled) {
        await supabaseAdmin
          .from('team_members')
          .update({ stripe_account_id: account.id })
          .eq('id', teamMemberId)
          .eq('tenant_id', tenantId)
      }
      break
    }

    case 'invoice.paid': {
      // Monthly subscription renewal succeeded for a Full Loop tenant.
      // Look up the tenant by the Stripe customer email (subscription was
      // created from the prospect's checkout session).
      const invoice = event.data.object as Stripe.Invoice
      const customerEmail = invoice.customer_email
      if (!customerEmail) break
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('owner_email', customerEmail)
        .maybeSingle()
      if (!tenant) break
      await supabaseAdmin
        .from('tenants')
        .update({ billing_status: 'active', last_payment_at: new Date().toISOString() })
        .eq('id', tenant.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerEmail = invoice.customer_email
      if (!customerEmail) break
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('id, name, owner_email')
        .eq('owner_email', customerEmail)
        .maybeSingle()
      if (!tenant) break
      await supabaseAdmin
        .from('tenants')
        .update({ billing_status: 'past_due' })
        .eq('id', tenant.id)
      // Alert platform admin + the tenant owner. Don't auto-suspend yet —
      // let Stripe's dunning retry logic run first.
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
      if (adminEmail) {
        try {
          const { sendEmail } = await import('@/lib/email')
          await sendEmail({
            to: adminEmail,
            subject: `Full Loop: ${tenant.name} subscription payment failed`,
            html: `<p>Invoice for <strong>${tenant.name}</strong> (${tenant.owner_email}) failed. Billing status flipped to past_due. Stripe will retry per dunning schedule.</p>`,
          })
        } catch { /* non-fatal */ }
      }
      break
    }

    case 'customer.subscription.deleted': {
      // Tenant cancelled subscription (or Stripe cancelled after all retries
      // failed). Flip billing_status so dashboard can gate features, but do
      // not delete the tenant — data retention window is separate.
      const sub = event.data.object as Stripe.Subscription
      // Fetch customer to get email for tenant lookup
      try {
        const stripeClient = stripe ?? getStripe()
        const customer = await stripeClient.customers.retrieve(sub.customer as string)
        if (customer && !customer.deleted) {
          const email = (customer as Stripe.Customer).email
          if (email) {
            await supabaseAdmin
              .from('tenants')
              .update({ billing_status: 'cancelled', subscription_cancelled_at: new Date().toISOString() })
              .eq('owner_email', email)
          }
        }
      } catch (e) {
        console.error('[stripe] subscription.deleted lookup failed:', e)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
