import { escapeHtml } from '@/lib/escape-html'

/**
 * Fields carried into the admin "new lead" notification. All originate from a
 * public, unauthenticated request body, so every one is escaped before it lands
 * in the HTML email.
 */
export interface LeadNotificationFields {
  name: unknown
  email: unknown
  phone?: unknown
  business_name: unknown
  industry?: unknown
  message?: unknown
}

/**
 * Build the admin-notification HTML for a captured lead. Pure and exported so it
 * can be unit-tested against injection payloads. `adminUrl` is env-derived
 * (trusted) and used only as a link base.
 */
export function buildLeadNotificationHtml(fields: LeadNotificationFields, adminUrl: string): string {
  const { name, email, phone, business_name, industry, message } = fields
  return `
        <h2>New Lead Request</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${phone ? escapeHtml(phone) : 'Not provided'}</p>
        <p><strong>Business:</strong> ${escapeHtml(business_name)}</p>
        <p><strong>Industry:</strong> ${industry ? escapeHtml(industry) : 'Not specified'}</p>
        ${message ? `<p><strong>Message:</strong> ${escapeHtml(message)}</p>` : ''}
        <br>
        <p><a href="${adminUrl}/admin">View in Admin</a></p>
      `
}
