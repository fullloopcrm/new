/**
 * Admin-triggered "Send Connect invite" for a sales partner — the surfaced
 * action Jeff asked for (mid-session, binding): once a partner is approved,
 * an admin (or the auto-send hook in sales-partner-agreement.ts, fired the
 * moment a partner's agreement is signed) can push a Stripe onboarding link
 * to the partner directly via SMS/email, instead of the partner having to
 * find "Connect with Stripe" themselves inside their own portal
 * (stripe-onboard/route.ts, self-service, unchanged).
 *
 * Reuses the same account-creation idempotency key as the self-service route
 * (`connect-account-sp-${tenantId}-${id}`) so an admin-sent invite and the
 * partner's own self-service click can never create two Connect accounts for
 * the same partner.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { getStripe } from '@/lib/stripe'
import { tenantSiteUrl } from '@/lib/tenant-site'
import { sendSMS } from '@/lib/sms'
import { sendEmail, tenantSender } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'

interface InviteTenant {
  id: string
  name: string
  slug: string | null
  domain: string | null
  stripe_api_key?: string | null
  telnyx_api_key?: string | null
  telnyx_phone?: string | null
  resend_api_key?: string | null
  email_from?: string | null
}

export async function sendSalesPartnerStripeInvite(
  partnerId: string,
  tenantId: string,
): Promise<{ ok: true; url: string; sentSms: boolean; sentEmail: boolean } | { ok: false; error: string }> {
  const { data: partner } = await supabaseAdmin
    .from('sales_partners')
    .select('id, name, email, phone, active, stripe_connect_account_id')
    .eq('id', partnerId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!partner) return { ok: false, error: 'Sales partner not found' }
  if (!partner.active) return { ok: false, error: 'Partner has not been approved yet' }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, domain, stripe_api_key, telnyx_api_key, telnyx_phone, resend_api_key, email_from')
    .eq('id', tenantId)
    .maybeSingle<InviteTenant>()
  if (!tenant) return { ok: false, error: 'Tenant not found' }

  try {
    const stripe = getStripe(tenant.stripe_api_key || undefined)
    let accountId = partner.stripe_connect_account_id as string | null

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: partner.email || undefined,
        // card_payments requested alongside transfers -- see CHANNEL.md 16:20
        // LEADER->W1: a transfers-only capability request is rejected live on this
        // platform ("needs approval for transfers without card_payments"). Matches
        // the same fix in stripe-onboard/route.ts.
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        business_type: 'individual',
        metadata: { sales_partner_id: partnerId, tenant_id: tenantId },
      }, { idempotencyKey: `connect-account-sp-${tenantId}-${partnerId}` })
      accountId = account.id
      await supabaseAdmin
        .from('sales_partners')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', partnerId)
        .eq('tenant_id', tenantId)
    }

    const baseUrl = tenantSiteUrl(tenant) || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/sales-partners/${partnerId}/stripe-onboard?refresh=1`,
      return_url: `${baseUrl}/sales?stripe=connected`,
      type: 'account_onboarding',
    })

    let sentSms = false
    if (partner.phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
      try {
        await sendSMS({
          to: partner.phone as string,
          body: `${tenant.name}: set up instant payouts for your commissions — connect Stripe here: ${link.url}`,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        })
        sentSms = true
      } catch (e) {
        console.error('[sales-partner stripe-invite] SMS send failed:', e)
      }
    }

    let sentEmail = false
    if (partner.email) {
      try {
        await sendEmail({
          to: partner.email as string,
          subject: `${tenant.name}: set up instant payouts`,
          from: tenantSender(tenant),
          resendApiKey: tenant.resend_api_key,
          html: `
            <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">
              <h1 style="font-size:20px;margin:0 0 12px;">Get paid instantly, ${escapeHtml((partner.name as string || '').split(' ')[0] || 'there')}</h1>
              <p style="color:#475569;font-size:14px;line-height:1.65;margin:0 0 14px;">Connect Stripe to get your commission payouts sent straight to your bank account — no more waiting on Zelle or Apple Cash.</p>
              <div style="margin:0 0 22px;">
                <a href="${link.url}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:14px 30px;border-radius:8px;font-weight:600;font-size:15px;">Connect with Stripe →</a>
              </div>
            </div>`,
        })
        sentEmail = true
      } catch (e) {
        console.error('[sales-partner stripe-invite] email send failed:', e)
      }
    }

    return { ok: true, url: link.url, sentSms, sentEmail }
  } catch (e) {
    console.error('[sales-partner stripe-invite]', e)
    return { ok: false, error: e instanceof Error ? e.message : 'Stripe error' }
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('sales_partners.manage')
  if (authError) return authError

  try {
    const { id } = await params
    const result = await sendSalesPartnerStripeInvite(id, tenant.tenantId)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[sales-partner stripe-invite] POST error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
