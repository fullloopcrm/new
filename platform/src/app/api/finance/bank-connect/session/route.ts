/**
 * Stripe Financial Connections — start a bank link session.
 * POST → returns a client_secret; the frontend opens Stripe's secure bank-link
 * widget with it. Uses the TENANT's own Stripe key + customer from the tenant
 * profile (per-tenant), so each business links its own bank.
 *
 * Requires Financial Connections + the Transactions feature enabled on the
 * Stripe account. Linked accounts are synced into bank_transactions (next step).
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptSecret } from '@/lib/secret-crypto'

export async function POST() {
  const { tenant, error } = await requirePermission('finance.expenses')
  if (error) return error
  try {
    const t = tenant.tenant as unknown as {
      id: string
      name?: string | null
      owner_email?: string | null
      stripe_api_key?: string | null
      stripe_customer_id?: string | null
    }

    const key = t.stripe_api_key ? decryptSecret(t.stripe_api_key) : process.env.STRIPE_SECRET_KEY
    if (!key) return NextResponse.json({ error: 'Stripe is not configured for this business' }, { status: 400 })
    const stripe = new Stripe(key, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })

    // The FC account holder is a Stripe customer — reuse the tenant's, or create
    // and persist one on the tenant profile.
    let customerId = t.stripe_customer_id || null
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: t.name || undefined,
        email: t.owner_email || undefined,
        metadata: { tenant_id: t.id },
      }, { idempotencyKey: `stripe-customer-${t.id}` })
      customerId = customer.id
      await supabaseAdmin.from('tenants').update({ stripe_customer_id: customerId }).eq('id', t.id)
    }

    const session = await stripe.financialConnections.sessions.create({
      account_holder: { type: 'customer', customer: customerId },
      permissions: ['balances', 'transactions'],
    })

    return NextResponse.json({ client_secret: session.client_secret })
  } catch (e) {
    console.error('[bank-connect/session]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to start bank connection' }, { status: 500 })
  }
}
