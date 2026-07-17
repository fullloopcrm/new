/**
 * Login alert — one branded, security-consistent email for EVERY admin login.
 *
 * Same rich content everywhere (IP, time, device, "wasn't you?" warning), but
 * branded to whoever logged in: a tenant admin gets their business's brand and
 * it goes to that tenant's owner contacts; the platform super-admin gets the
 * Full Loop brand at the platform address. Best-effort — never blocks login.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { emailAdmins } from '@/lib/admin-contacts'
import { sendEmail } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'

interface LoginAlertInput {
  /** Omit for the Full Loop platform super-admin; set for a tenant admin login. */
  tenantId?: string | null
  ip: string
  ua: string
  /** Who logged in — role or name, shown on the alert. */
  who?: string
}

function alertHtml(brand: string, ip: string, ua: string, timeET: string, who?: string): string {
  return `
    <div style="font-family:sans-serif;max-width:520px">
      <h2 style="margin:0 0 2px 0;color:#111">${escapeHtml(brand)}</h2>
      <p style="color:#888;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 16px 0">Admin Login Alert</p>
      <p style="margin:6px 0"><strong>IP:</strong> ${escapeHtml(ip)}</p>
      <p style="margin:6px 0"><strong>Time:</strong> ${escapeHtml(timeET)}</p>
      <p style="margin:6px 0"><strong>Device:</strong> ${escapeHtml(ua.substring(0, 160))}</p>
      ${who ? `<p style="margin:6px 0"><strong>Account:</strong> ${escapeHtml(who)}</p>` : ''}
      <p style="color:#888;font-size:12px;margin-top:16px">If this wasn't you, change your PIN immediately and contact support.</p>
    </div>`
}

export async function sendLoginAlert(input: LoginAlertInput): Promise<void> {
  const timeET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  try {
    if (input.tenantId) {
      const { data: t } = await supabaseAdmin.from('tenants').select('name').eq('id', input.tenantId).single()
      const brand = (t?.name as string) || 'Your Account'
      await emailAdmins(
        input.tenantId,
        `${brand} — Admin Login Alert`,
        alertHtml(brand, input.ip, input.ua, timeET, input.who),
        ['owner'],
      )
    } else {
      const to = process.env.ADMIN_EMAIL || 'hi@fullloopcrm.com'
      await sendEmail({
        to,
        subject: 'Full Loop — Admin Login Alert',
        html: alertHtml('Full Loop CRM', input.ip, input.ua, timeET, input.who),
      })
    }
  } catch (e) {
    console.error('[login-alert] send failed:', e)
  }
}
