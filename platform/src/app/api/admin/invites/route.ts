import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { logSecurityEvent } from '@/lib/security'
import { requireAdmin } from '@/lib/require-admin'
import { getSettings } from '@/lib/settings'
import crypto from 'crypto'

// Create and send an invite
export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { tenant_id, email, role } = await request.json()

  if (!tenant_id || !email) {
    return NextResponse.json({ error: 'tenant_id and email required' }, { status: 400 })
  }

  // Verify tenant exists
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('id', tenant_id)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // Check for existing pending invite
  const { data: existing } = await supabaseAdmin
    .from('tenant_invites')
    .select('id')
    .eq('tenant_id', tenant_id)
    .eq('email', email.toLowerCase())
    .eq('accepted', false)
    .gte('expires_at', new Date().toISOString())
    .single()

  if (existing) {
    return NextResponse.json({ error: 'An active invite already exists for this email' }, { status: 400 })
  }

  // Generate token
  const token = crypto.randomBytes(32).toString('hex')
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

  // Tenant default for invite role — falls back to 'owner' when neither
  // the caller nor settings specify (matches prior behavior).
  let resolvedRole = role
  if (!resolvedRole) {
    try {
      const settings = await getSettings(tenant_id)
      resolvedRole = settings.default_invite_role || 'owner'
    } catch {
      resolvedRole = 'owner'
    }
  }

  const { data: invite, error } = await supabaseAdmin
    .from('tenant_invites')
    .insert({
      tenant_id,
      email: email.toLowerCase(),
      role: resolvedRole,
      token,
      expires_at,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send invite email
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.homeservicesbusinesscrm.com'
  const joinUrl = `${baseUrl}/join/${token}`

  try {
    await sendEmail({
      to: email.toLowerCase(),
      subject: `You're invited to manage ${tenant.name} on Full Loop CRM`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
          <div style="background: #1e40af; padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Full Loop CRM</h1>
          </div>
          <div style="background: #f9fafb; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 16px 0; color: #111827;">You're invited!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              You've been invited to manage <strong>${tenant.name}</strong> on Full Loop CRM — the all-in-one platform for running your service business.
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              Your account has been pre-configured with services, settings, and everything you need to get started.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${joinUrl}" style="display: inline-block; background: #1e40af; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Accept Invite &amp; Create Account
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 13px; text-align: center;">
              This invite expires in 7 days. If you didn't expect this, you can ignore this email.
            </p>
          </div>
        </div>
      `,
    })
  } catch (emailError) {
    console.error('Failed to send invite email:', emailError)
    // Don't fail the invite creation if email fails — admin can resend
  }

  await logSecurityEvent({
    tenantId: tenant_id,
    type: 'member_added',
    description: `Invite sent to ${email} as ${resolvedRole}`,
  })

  return NextResponse.json({ invite })
}
