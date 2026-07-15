import { supabaseAdmin } from './supabase'
import { sendEmail } from './email'
import { escapeHtml } from './escape-html'

type SecurityEvent = {
  tenantId: string
  type: 'login' | 'password_change' | 'api_key_change' | 'member_added' | 'member_removed' | 'plan_change' | 'status_change' | 'suspicious_login'
  description: string
  ip?: string
  userAgent?: string
}

export function securityAlertHtml(tenantName: string, title: string, description: string, ip?: string): string {
  return `
          <h2>Security Alert for ${escapeHtml(tenantName)}</h2>
          <p><strong>${escapeHtml(title)}</strong></p>
          <p>${escapeHtml(description)}</p>
          ${ip ? `<p><small>IP: ${escapeHtml(ip)}</small></p>` : ''}
          <p><small>If this wasn't you, please contact support immediately.</small></p>
        `
}

export async function logSecurityEvent(event: SecurityEvent) {
  // Log to security_events table
  await supabaseAdmin.from('security_events').insert({
    tenant_id: event.tenantId,
    type: event.type,
    description: event.description,
    ip_address: event.ip || null,
    user_agent: event.userAgent || null,
  })

  // Create in-app notification
  await supabaseAdmin.from('notifications').insert({
    tenant_id: event.tenantId,
    type: 'security',
    title: getSecurityTitle(event.type),
    message: event.description,
    channel: 'in_app',
  })

  // For critical events, also send email
  const critical = ['password_change', 'api_key_change', 'member_removed', 'suspicious_login']
  if (critical.includes(event.type)) {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('email, name, resend_api_key')
      .eq('id', event.tenantId)
      .single()

    if (tenant?.email) {
      await sendEmail({
        to: tenant.email,
        subject: `Security Alert: ${getSecurityTitle(event.type)}`,
        resendApiKey: tenant.resend_api_key,
        html: securityAlertHtml(tenant.name, getSecurityTitle(event.type), event.description, event.ip),
      })
    }
  }
}

function getSecurityTitle(type: string): string {
  const titles: Record<string, string> = {
    login: 'New Login',
    password_change: 'Password Changed',
    api_key_change: 'API Key Updated',
    member_added: 'Team Member Added',
    member_removed: 'Team Member Removed',
    plan_change: 'Plan Changed',
    status_change: 'Account Status Changed',
    suspicious_login: 'Suspicious Login Attempt',
  }
  return titles[type] || 'Security Event'
}
