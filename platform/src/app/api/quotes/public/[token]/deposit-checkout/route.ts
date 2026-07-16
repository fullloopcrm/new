/**
 * Create a Stripe Checkout Session for the DEPOSIT on a public proposal.
 * Mirrors /api/invoices/public/[token]/checkout: uses the tenant's own Stripe
 * key, fixed amount = the remaining deposit due. On success the Stripe webhook
 * (metadata.quote_id + deposit flag) marks the deposit paid, closes the deal to
 * sold, and spins up the Job.
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptSecret } from '@/lib/secret-crypto'
import { logQuoteEvent } from '@/lib/quote'
import { rateLimitDb } from '@/lib/rate-limit-db'

type Params = { params: Promise<{ token: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const { token } = await params

    // Every call mints a brand-new Stripe Checkout Session with no
    // idempotency key -- unbounded, a looping caller can flood the tenant's
    // own Stripe account with live sessions (their API rate limit, their
    // dashboard clutter). Cap per public token.
    const rl = await rateLimitDb(`quote-deposit-checkout:${token}`, 10, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
    }

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('id, tenant_id, quote_number, title, status, contact_email, deposit_cents, deposit_paid_cents, tenants(name, domain, stripe_api_key, stripe_account_id)')
      .eq('public_token', token)
      .maybeSingle()
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (['declined', 'expired'].includes(quote.status)) {
      return NextResponse.json({ error: `Proposal is ${quote.status}` }, { status: 400 })
    }

    const depositDue = (quote.deposit_cents || 0) - (quote.deposit_paid_cents || 0)
    if (depositDue <= 0) return NextResponse.json({ error: 'No deposit due' }, { status: 400 })

    const tenant = quote.tenants as unknown as {
      name: string
      domain: string | null
      stripe_api_key: string | null
      stripe_account_id: string | null
    } | null
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 500 })

    const apiKey = tenant.stripe_api_key ? decryptSecret(tenant.stripe_api_key) : null
    if (!apiKey) return NextResponse.json({ error: 'Tenant Stripe not configured' }, { status: 500 })

    const stripe = new Stripe(apiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const baseUrl = tenant.domain ? `https://${tenant.domain}` : appUrl
    const returnUrl = `${baseUrl}/quote/${token}`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Deposit — ${quote.title || `Proposal ${quote.quote_number}`}`,
              description: `${tenant.name} — ${quote.quote_number}`,
            },
            unit_amount: depositDue,
          },
          quantity: 1,
        },
      ],
      customer_email: quote.contact_email || undefined,
      success_url: `${returnUrl}?deposit=paid`,
      cancel_url: `${returnUrl}?deposit=cancelled`,
      metadata: {
        quote_id: quote.id,
        tenant_id: quote.tenant_id,
        quote_deposit: 'true',
      },
      payment_intent_data: {
        metadata: {
          quote_id: quote.id,
          tenant_id: quote.tenant_id,
          quote_deposit: 'true',
        },
      },
    })

    await logQuoteEvent({
      quote_id: quote.id,
      tenant_id: quote.tenant_id,
      event_type: 'viewed',
      detail: { action: 'deposit_checkout_created', stripe_session_id: session.id, amount_cents: depositDue },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('POST /api/quotes/public/[token]/deposit-checkout', err)
    return NextResponse.json({ error: 'Checkout unavailable. Try again or contact the business.' }, { status: 500 })
  }
}
