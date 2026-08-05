/**
 * Global Payouts recipient onboarding — the automated-link counterpart to
 * the manual "Add recipient" Stripe dashboard flow Jeff was doing by hand
 * (08-04). Creates the v2 core account if the team member doesn't have one
 * yet, generates a Stripe-hosted onboarding link, and texts it to them —
 * mirrors stripe-onboard/route.ts (Connect), but for the newer product and
 * with the SMS send built in, since that's what was actually asked for.
 */
import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptSecret } from '@/lib/secret-crypto'
import { sendSMS } from '@/lib/sms'
import { createRecipientAccount, createRecipientOnboardingLink } from '@/lib/finance/global-payouts'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    const { data: tm } = await supabaseAdmin
      .from('team_members')
      .select('id, name, email, phone, sms_consent, preferred_language, global_payouts_recipient_id')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (!tm) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })

    const { data: tenantRow } = await supabaseAdmin
      .from('tenants')
      .select('stripe_api_key, telnyx_api_key, telnyx_phone, sms_from_number')
      .eq('id', tenantId)
      .single()
    const apiKey = tenantRow?.stripe_api_key ? decryptSecret(tenantRow.stripe_api_key as string) : (process.env.STRIPE_SECRET_KEY || null)
    if (!apiKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })

    let recipientId = tm.global_payouts_recipient_id as string | null
    if (!recipientId) {
      const account = await createRecipientAccount(apiKey, {
        email: tm.email as string | null, displayName: tm.name as string, teamMemberId: id, tenantId,
      })
      recipientId = account.id
      await supabaseAdmin.from('team_members').update({ global_payouts_recipient_id: recipientId }).eq('id', id).eq('tenant_id', tenantId)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'http://localhost:3000'
    const link = await createRecipientOnboardingLink(apiKey, {
      accountId: recipientId,
      returnUrl: `${baseUrl}/dashboard/team/${id}?global_payouts=connected`,
      refreshUrl: `${baseUrl}/dashboard/team/${id}?global_payouts=refresh`,
    })

    let smsSent = false
    if (tm.phone && tm.sms_consent !== false && tenantRow?.telnyx_api_key && tenantRow?.telnyx_phone) {
      const isEs = tm.preferred_language === 'es'
      const body = isEs
        ? `Configura tu forma de pago (expira en 10 min, un solo uso): ${link.url}`
        : `Set up how you get paid (expires in 10 min, one-time use): ${link.url}`
      await sendSMS({
        to: tm.phone as string,
        body,
        telnyxApiKey: tenantRow.telnyx_api_key as string,
        telnyxPhone: (tenantRow.sms_from_number as string | null) || (tenantRow.telnyx_phone as string),
      }).then(() => { smsSent = true }).catch(err => console.error('[global-payouts-onboard] SMS failed:', err))
    }

    return NextResponse.json({ url: link.url, expiresAt: link.expiresAt, recipientId, smsSent })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[global-payouts-onboard]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
