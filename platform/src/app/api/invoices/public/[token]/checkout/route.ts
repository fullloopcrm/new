/**
 * Create a Stripe Checkout Session for the balance due on a public invoice.
 * Uses the tenant's own Stripe API key + connected account.
 * On success, Stripe webhook inserts a payment row (invoice_id set via metadata),
 * DB trigger marks the invoice paid.
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { logInvoiceEvent } from '@/lib/invoice'
import { decryptSecret } from '@/lib/secret-crypto'

type Params = { params: Promise<{ token: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params

    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('*, tenants(name, domain, stripe_api_key, stripe_account_id)')
      .eq('public_token', token)
      .maybeSingle()
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (['void', 'refunded', 'paid'].includes(invoice.status)) {
      return NextResponse.json({ error: `Cannot pay ${invoice.status} invoice` }, { status: 400 })
    }

    const tenant = invoice.tenants as {
      name: string
      domain: string | null
      stripe_api_key: string | null
      stripe_account_id: string | null
    } | null
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 500 })

    const balance = invoice.total_cents - (invoice.amount_paid_cents || 0)
    if (balance <= 0) return NextResponse.json({ error: 'Nothing due' }, { status: 400 })

    const apiKey = tenant.stripe_api_key ? decryptSecret(tenant.stripe_api_key) : null
    if (!apiKey) return NextResponse.json({ error: 'Tenant Stripe not configured' }, { status: 500 })

    const stripe = new Stripe(apiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const baseUrl = tenant.domain ? `https://${tenant.domain}` : appUrl
    const returnUrl = `${baseUrl}/invoice/${invoice.public_token}`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: invoice.title || `Invoice ${invoice.invoice_number}`,
              description: `${tenant.name} — ${invoice.invoice_number}`,
            },
            unit_amount: balance,
          },
          quantity: 1,
        },
      ],
      customer_email: invoice.contact_email || undefined,
      success_url: `${returnUrl}?paid=1`,
      cancel_url: `${returnUrl}?cancelled=1`,
      metadata: {
        invoice_id: invoice.id,
        tenant_id: invoice.tenant_id,
        invoice_number: invoice.invoice_number,
      },
      payment_intent_data: {
        metadata: {
          invoice_id: invoice.id,
          tenant_id: invoice.tenant_id,
        },
      },
    })

    await logInvoiceEvent({
      invoice_id: invoice.id,
      tenant_id: invoice.tenant_id,
      event_type: 'edited',
      detail: { action: 'stripe_checkout_created', stripe_session_id: session.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('POST /api/invoices/public/[token]/checkout', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
