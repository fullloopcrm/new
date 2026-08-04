/**
 * POST /api/admin/prospects/:id/wire-received
 *
 * Admin confirms the $25,000 setup-fee wire landed for a self-serve prospect
 * (mirrors requests/[id]/wire-received for the sales-assisted lead flow).
 * This is the real trigger for tenant creation now — the Stripe checkout
 * webhook only records the subscription (see webhooks/stripe/route.ts).
 * Creates a tenant SHELL only — does NOT activate it. Go-live stays a
 * separate manual step via businesses/[id]/activate, same as every other
 * tenant.
 *
 * Idempotent: a prospect already converted returns its existing tenant.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { signupPricing } from '@/lib/tier-prices'
import { zipToTimezone } from '@/lib/timezone'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id: prospectId } = await params
  const body = await request.json().catch(() => ({}) as { admins?: number; team_members?: number })

  const { data: prospect } = await supabaseAdmin.from('prospects').select('*').eq('id', prospectId).single()
  if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
  if (prospect.status !== 'paid') {
    return NextResponse.json({ error: 'Prospect has not completed the Stripe checkout yet' }, { status: 400 })
  }

  if (prospect.tenant_id) {
    return NextResponse.json({ ok: true, alreadyConverted: true, tenantId: prospect.tenant_id })
  }

  const wireReceivedAt = new Date().toISOString()
  await supabaseAdmin
    .from('prospects')
    .update({ wire_received_at: wireReceivedAt })
    .eq('id', prospectId)
    .is('wire_received_at', null)

  // Flat pricing (2026-08-02): admins/team members are headcount only, no
  // longer per-seat billing — same as the sales-assisted flow.
  const pricing = signupPricing({
    admins: Number(body.admins) || 1,
    teamMembers: Number(body.team_members) || 0,
  })

  const slug = prospect.business_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) + '-' + prospectId.slice(0, 6)

  const { data: tenant, error: tErr } = await supabaseAdmin
    .from('tenants')
    .insert({
      name: prospect.business_name,
      slug,
      industry: prospect.trade,
      phone: prospect.owner_phone,
      email: prospect.owner_email,
      owner_name: prospect.owner_name,
      owner_email: prospect.owner_email,
      owner_phone: prospect.owner_phone,
      status: 'new',
      plan: prospect.paid_tier || 'pro',
      monthly_rate: Math.round(pricing.monthly_cents / 100),
      setup_fee: Math.round(pricing.setup_cents / 100),
      setup_fee_paid_at: wireReceivedAt,
      stripe_subscription_id: prospect.stripe_subscription_id,
      admin_seats: pricing.admins,
      team_seats: pricing.teamMembers,
      billing_status: 'active',
      timezone: zipToTimezone(prospect.billing_zip),
      address: prospect.billing_address
        || (prospect.primary_city && prospect.primary_state
          ? `${prospect.primary_city}, ${prospect.primary_state} ${prospect.primary_zip || ''}`.trim()
          : null),
    })
    .select('id')
    .single()
  if (tErr || !tenant) return NextResponse.json({ error: tErr?.message || 'Could not create tenant' }, { status: 500 })

  await supabaseAdmin.from('entities').insert({
    tenant_id: tenant.id, name: prospect.business_name, is_default: true, active: true,
  })
  const { provisionTenant } = await import('@/lib/provision-tenant')
  await provisionTenant({
    tenantId: tenant.id,
    industry: (prospect.trade || 'general') as 'cleaning' | 'landscaping' | 'hvac' | 'plumbing' | 'handyman' | 'electrical' | 'pest' | 'general',
  })
  await supabaseAdmin.from('prospects').update({ tenant_id: tenant.id }).eq('id', prospectId)

  // NOTE: this tenant is a shell, not live. Go-live is a separate, manual
  // admin "Activate" click (businesses/[id]/activate) — not triggered here.

  // Send tenant owner an invite so they can log in and run onboarding.
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
    const { escapeHtml } = await import('@/lib/escape-html')
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
    console.error(`[wire-received] tenant ${tenant.id} created but invite failed:`, inviteErr)
  }

  return NextResponse.json({ ok: true, tenantId: tenant.id })
}
