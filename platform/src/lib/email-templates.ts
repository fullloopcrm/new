// Branded HTML email templates for notifications
import { escapeHtml, safeUrl } from './escape-html'
import { clientArrivalWindow } from './time-window'
import { applyDiscount } from './discount'

type TemplateData = {
  tenantName: string
  primaryColor?: string
  logoUrl?: string
  /** CAN-SPAM: sender's valid physical postal address, shown in the footer. */
  businessAddress?: string
  /** CAN-SPAM: per-recipient unsubscribe URL for commercial/marketing email. */
  unsubscribeUrl?: string
  /**
   * Per-tenant policy/contact config, resolved from tenant settings at the
   * call site. Every field is optional and each template degrades gracefully
   * when a tenant hasn't configured it (no hardcoded business policy lives
   * in this file — that's tenant data, never global copy).
   */
  supportPhone?: string
  reviewUrl?: string
  bookingUrl?: string
  cancellationPolicyOneTime?: string
  cancellationPolicyRecurring?: string
  loyaltyDiscountPercent?: number
  selfBookDiscountCents?: number
  referralCommissionPercent?: number
}

function infoRow(label: string, value: string): string {
  return `<tr><td style="padding:8px 16px;">
    <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">${escapeHtml(label)}</p>
    <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${value}</p>
  </td></tr>`
}

function infoTable(rows: string): string {
  return `<table width="100%" style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">${rows}</table>`
}

type NoteType = 'info' | 'warning' | 'success' | 'danger'
function noteBox(content: string, type: NoteType = 'info'): string {
  const colors: Record<NoteType, { bg: string; border: string; text: string }> = {
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    success: { bg: '#f0fdf4', border: '#10b981', text: '#166534' },
    danger: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
  }
  const c = colors[type]
  return `<div style="background:${c.bg};border-left:3px solid ${c.border};padding:16px;margin:16px 0;border-radius:0 8px 8px 0;">
    <p style="margin:0;color:${c.text};font-size:14px;line-height:1.6;">${content}</p>
  </div>`
}

function ctaButton(text: string, href: string, color?: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="left">
    <a href="${safeUrl(href)}" style="display:inline-block;background:${escapeHtml(color || '#111827')};color:#ffffff;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(text)}</a>
  </td></tr></table>`
}

function contactLine(data: TemplateData): string {
  if (!data.supportPhone) return ''
  const digits = data.supportPhone.replace(/\D/g, '')
  return `<p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">Questions? Text <a href="sms:${digits}" style="color:${escapeHtml(data.primaryColor || '#111827')};font-weight:600;">${escapeHtml(data.supportPhone)}</a></p>`
}

function baseTemplate(content: string, data: TemplateData): string {
  // Full Loop light-editorial shell (mirror of lib/messaging/shell.ts) so every
  // template — all 14 that call this — matches the proposal + dashboard look,
  // brand-injected per tenant. color-scheme:light resists dark-mode inversion.
  const year = new Date().getFullYear()
  const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif"
  const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
  const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace"
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><style>:root{color-scheme:light only}</style></head>
<body style="margin:0;background:#E7E1D3;color-scheme:light only">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E7E1D3;padding:36px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#F5F1E8;border:1px solid #D8D2C4;border-radius:16px;overflow:hidden">
<tr><td style="padding:22px 28px;border-bottom:1px solid #1C1C1C">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
${data.logoUrl ? `<td width="40" style="padding-right:12px"><img src="${safeUrl(data.logoUrl)}" width="40" height="40" style="border-radius:8px;display:block" alt="${escapeHtml(data.tenantName)}"></td>` : ''}
<td style="font-family:${DISPLAY};font-size:20px;font-weight:600;color:#1C1C1C;letter-spacing:-0.01em">${escapeHtml(data.tenantName)}</td>
</tr></table></td></tr>
<tr><td style="padding:28px;font-family:${SANS};font-size:15px;line-height:1.6;color:#1C1C1C">
${content}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #D8D2C4;background:#E7E1D3;font-family:${SANS};font-size:11px;color:#807B70;line-height:1.55">
© ${year} ${escapeHtml(data.tenantName)} · powered by <a href="https://homeservicesbusinesscrm.com/" style="text-decoration:none"><span style="font-family:${DISPLAY};font-weight:600;color:#1C1C1C">Full&nbsp;Loop</span><span style="font-family:${MONO};font-size:8px;letter-spacing:0.18em;color:#807B70">&nbsp;CRM</span></a><br>Autonomous Home Service Business CRM Systems${data.businessAddress ? `<br>${escapeHtml(data.businessAddress)}` : ''}${data.unsubscribeUrl ? `<br><a href="${safeUrl(data.unsubscribeUrl)}" style="color:#807B70;text-decoration:underline">Unsubscribe from these emails</a>` : ''}
</td></tr>
</table></td></tr></table></body></html>`
}

export function bookingReminderEmail(data: TemplateData & {
  clientName: string
  serviceName: string
  dateTime: string
  address?: string
  timeUntil: string
  teamMemberName?: string
  teamMemberPhotoUrl?: string
  isRecurring?: boolean
}): string {
  const policyText = data.isRecurring ? data.cancellationPolicyRecurring : data.cancellationPolicyOneTime
  const teamMemberBlock = data.teamMemberName
    ? (data.teamMemberPhotoUrl
        ? `<div style="margin:0 0 24px;">
            <img src="${safeUrl(data.teamMemberPhotoUrl)}" alt="${escapeHtml(data.teamMemberName)}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;display:block;margin:0 0 8px;">
            <p style="color:#6b7280;font-size:14px;margin:0;">Your team member: <strong style="color:#111827;">${escapeHtml(data.teamMemberName)}</strong></p>
          </div>`
        : `<p style="color:#6b7280;font-size:14px;margin:0 0 24px;">Your team member: <strong style="color:#111827;">${escapeHtml(data.teamMemberName)}</strong></p>`)
    : ''
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Appointment Reminder</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${escapeHtml(data.clientName)}, this is a reminder that your appointment is <strong>${escapeHtml(data.timeUntil)}</strong>.
    </p>
    ${teamMemberBlock}
    ${infoTable(`
      ${infoRow('Service', escapeHtml(data.serviceName))}
      ${infoRow('Date & Time', escapeHtml(data.dateTime))}
      ${data.address ? infoRow('Location', escapeHtml(data.address)) : ''}
    `)}
    ${data.bookingUrl ? ctaButton('View Details', data.bookingUrl, data.primaryColor) : ''}
    ${policyText ? noteBox(policyText, 'warning') : ''}
    ${contactLine(data)}
  `, data)
}

export function followUpEmail(data: TemplateData & {
  clientName: string
  serviceName: string
  discountCode: string
}): string {
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Thank You!</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Hi ${escapeHtml(data.clientName)}, thank you for choosing ${escapeHtml(data.tenantName)}! We hope you enjoyed your ${escapeHtml(data.serviceName)}.
    </p>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      We'd love to hear your feedback. Your opinion helps us improve!
    </p>
    <table width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
    <tr><td>
      <p style="color:#166534;font-size:12px;margin:0;text-transform:uppercase;letter-spacing:1px;">Your Discount Code</p>
      <p style="color:#166534;font-size:24px;font-weight:700;margin:8px 0;letter-spacing:2px;">${escapeHtml(data.discountCode)}</p>
      <p style="color:#4ade80;font-size:13px;margin:0;">10% off your next appointment</p>
    </td></tr>
    </table>
  `, data)
}

export function dailySummaryEmail(data: TemplateData & {
  todaysJobs: number
  yesterdayRevenue: string
  upcomingSchedules: number
}): string {
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Good Morning!</h2>
    <p style="color:#4b5563;font-size:14px;margin:0 0 24px;">Here's your daily summary for ${escapeHtml(data.tenantName)}.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr>
      <td style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center;width:33%;">
        <p style="color:#3b82f6;font-size:24px;font-weight:700;margin:0;">${data.todaysJobs}</p>
        <p style="color:#6b7280;font-size:11px;margin:4px 0 0;text-transform:uppercase;">Today's Jobs</p>
      </td>
      <td width="12"></td>
      <td style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;width:33%;">
        <p style="color:#10b981;font-size:24px;font-weight:700;margin:0;">${escapeHtml(data.yesterdayRevenue)}</p>
        <p style="color:#6b7280;font-size:11px;margin:4px 0 0;text-transform:uppercase;">Yesterday's Revenue</p>
      </td>
      <td width="12"></td>
      <td style="background:#faf5ff;border-radius:8px;padding:16px;text-align:center;width:33%;">
        <p style="color:#8b5cf6;font-size:24px;font-weight:700;margin:0;">${data.upcomingSchedules}</p>
        <p style="color:#6b7280;font-size:11px;margin:4px 0 0;text-transform:uppercase;">This Week</p>
      </td>
    </tr>
    </table>
  `, data)
}

export function reviewRequestEmail(data: TemplateData & {
  clientName: string
  feedbackUrl: string
}): string {
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">How'd We Do?</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${escapeHtml(data.clientName)}, we'd love to hear your feedback about your recent experience with ${escapeHtml(data.tenantName)}.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${safeUrl(data.feedbackUrl)}" style="display:inline-block;background:${escapeHtml(data.primaryColor || '#111827')};color:#ffffff;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
        Leave a Review
      </a>
    </td></tr></table>
    <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;text-align:center;">
      It only takes a minute and helps us improve.
    </p>
  `, data)
}

export function bookingConfirmationEmail(data: TemplateData & {
  clientName: string
  serviceName: string
  dateTime: string
  teamMemberName: string
  address?: string
  price?: string
  portalUrl?: string
  /** Optional richer detail — a tenant can supply as much or as little as fits their business. */
  discountCents?: number
  discountLabel?: string
  isRecurring?: boolean
  suppliesIncluded?: boolean
  teamMemberPhotoUrl?: string
  teamMemberRatingAvg?: number
  teamMemberRatingCount?: number
  /** Portal login block — the confirmation email is the main driver of portal adoption. */
  portalEmail?: string
  portalPin?: string
  whatToExpect?: string
  prepTips?: string[]
}): string {
  const discountRow = data.discountCents && data.discountCents > 0
    ? infoRow('Discount', `<span style="color:#15803d;font-weight:600;">−$${(data.discountCents / 100).toFixed(0)}${data.discountLabel ? ` (${escapeHtml(data.discountLabel)})` : ''}</span>`)
    : ''
  const policyText = data.isRecurring ? data.cancellationPolicyRecurring : data.cancellationPolicyOneTime

  const ratingHtml = data.teamMemberRatingAvg && data.teamMemberRatingCount
    ? `<span style="color:#d97706;font-weight:600;">★ ${data.teamMemberRatingAvg.toFixed(1)}</span> <span style="color:#9ca3af;font-size:12px;">(${data.teamMemberRatingCount} ${data.teamMemberRatingCount === 1 ? 'rating' : 'ratings'})</span>`
    : ''
  const teamMemberBlock = data.teamMemberPhotoUrl
    ? `<div style="margin:0 0 24px;">
        <img src="${safeUrl(data.teamMemberPhotoUrl)}" alt="${escapeHtml(data.teamMemberName)}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;display:block;margin:0 0 8px;">
        <p style="color:#6b7280;font-size:14px;margin:0;">Your team member: <strong style="color:#111827;">${escapeHtml(data.teamMemberName)}</strong> ${ratingHtml}</p>
      </div>`
    : (ratingHtml ? `<p style="color:#6b7280;font-size:14px;margin:0 0 24px;">Your team member: <strong style="color:#111827;">${escapeHtml(data.teamMemberName)}</strong> ${ratingHtml}</p>` : '')

  const portalBox = (data.portalEmail && data.portalPin)
    ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0 24px;">
        <p style="margin:0 0 8px;color:#111827;font-size:14px;font-weight:600;">Your Client Portal</p>
        ${data.portalUrl ? `<p style="margin:4px 0;color:#4b5563;font-size:13px;"><strong>Login:</strong> <a href="${safeUrl(data.portalUrl)}" style="color:#111827;">${escapeHtml(data.portalUrl.replace(/^https?:\/\//, ''))}</a></p>` : ''}
        <p style="margin:4px 0;color:#4b5563;font-size:13px;"><strong>Email:</strong> ${escapeHtml(data.portalEmail)}</p>
        <p style="margin:4px 0;color:#4b5563;font-size:13px;"><strong>PIN:</strong> <span style="font-family:monospace;background:#e5e7eb;padding:2px 8px;border-radius:4px;letter-spacing:2px;">${escapeHtml(data.portalPin)}</span></p>
      </div>`
    : ''

  const prepBlock = data.prepTips && data.prepTips.length > 0
    ? `<h3 style="color:#111827;font-size:15px;margin:24px 0 8px;">Tips for preparing</h3>
       <p style="color:#4b5563;font-size:13px;line-height:1.8;margin:0;">${data.prepTips.map(t => `• ${escapeHtml(t)}`).join('<br>')}</p>`
    : ''

  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Booking Confirmed!</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${escapeHtml(data.clientName)}, your appointment with ${escapeHtml(data.tenantName)} is confirmed.
    </p>
    ${teamMemberBlock}
    ${infoTable(`
      ${infoRow('Service', escapeHtml(data.serviceName))}
      ${infoRow('Date & Time', escapeHtml(data.dateTime))}
      ${data.address ? infoRow('Location', escapeHtml(data.address)) : ''}
      ${data.price ? infoRow('Price', escapeHtml(data.price)) : ''}
      ${discountRow}
    `)}
    ${data.whatToExpect ? `<h3 style="color:#111827;font-size:15px;margin:0 0 8px;">What to expect</h3><p style="color:#4b5563;font-size:13px;line-height:1.7;margin:0 0 16px;">${escapeHtml(data.whatToExpect)}</p>` : ''}
    ${data.suppliesIncluded !== undefined
      ? noteBox(data.suppliesIncluded ? 'All supplies included — nothing to prepare.' : 'Please have your own supplies ready for this appointment.', data.suppliesIncluded ? 'success' : 'warning')
      : ''}
    ${noteBox('Tips are always appreciated but never required. 100% of tips go directly to your team member.', 'info')}
    ${policyText ? noteBox(policyText, 'danger') : ''}
    ${prepBlock}
    ${portalBox}
    ${data.portalUrl ? ctaButton('View Your Portal', data.portalUrl, data.primaryColor) : ''}
    ${contactLine(data)}
  `, data)
}

export function bookingRescheduledEmail(data: TemplateData & {
  clientName: string
  oldDateTime: string
  newDateTime: string
}): string {
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Your booking has been rescheduled</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${escapeHtml(data.clientName)}, ${escapeHtml(data.tenantName)} moved your appointment.
    </p>
    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
    <tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">From</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${escapeHtml(data.oldDateTime)}</p>
    </td></tr>
    <tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">To</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${escapeHtml(data.newDateTime)}</p>
    </td></tr>
    </table>
  `, data)
}

export function bookingReceivedEmail(data: TemplateData & {
  clientName: string
  serviceName: string
  dateTime: string
}): string {
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">We Received Your Booking Request!</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${escapeHtml(data.clientName)}, thank you for choosing ${escapeHtml(data.tenantName)}. We're reviewing your request and will confirm shortly.
    </p>
    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
    <tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Service</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${escapeHtml(data.serviceName)}</p>
    </td></tr>
    <tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Date & Time</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${escapeHtml(data.dateTime)}</p>
    </td></tr>
    <tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Status</p>
      <p style="color:#f59e0b;font-size:14px;font-weight:600;margin:4px 0 0;">Pending Confirmation</p>
    </td></tr>
    </table>
    <p style="color:#9ca3af;font-size:12px;margin:0;">
      We'll assign a team member and send you a confirmation with all the details.
    </p>
  `, data)
}

export function dailyOpsRecapEmail(data: TemplateData & {
  todayDate: string
  tomorrowDate: string
  todayJobs: { clientName: string; teamMemberName: string; time: string; revenue: string; paymentStatus: string }[]
  tomorrowJobs: { clientName: string; teamMemberName: string; time: string; revenue: string }[]
  todayRevenue: string
  todayJobCount: number
  tomorrowJobCount: number
  todayPaid: number
  todayUnpaid: number
}): string {
  const todayRows = data.todayJobs.length > 0
    ? data.todayJobs.map(j => `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-size:13px;color:#111827;font-weight:500;">${escapeHtml(j.clientName)}</td>
        <td style="padding:8px;font-size:13px;color:#6b7280;">${escapeHtml(j.teamMemberName)}</td>
        <td style="padding:8px;font-size:13px;color:#6b7280;">${escapeHtml(j.time)}</td>
        <td style="padding:8px;font-size:13px;color:#111827;text-align:right;">${escapeHtml(j.revenue)}</td>
        <td style="padding:8px;font-size:13px;color:${j.paymentStatus === 'paid' ? '#16a34a' : '#dc2626'};text-align:center;">${j.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="padding:16px;color:#9ca3af;text-align:center;font-size:13px;">No jobs today</td></tr>'

  const tomorrowRows = data.tomorrowJobs.length > 0
    ? data.tomorrowJobs.map(j => `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-size:13px;color:#111827;font-weight:500;">${escapeHtml(j.clientName)}</td>
        <td style="padding:8px;font-size:13px;color:#6b7280;">${escapeHtml(j.teamMemberName)}</td>
        <td style="padding:8px;font-size:13px;color:#6b7280;">${escapeHtml(j.time)}</td>
        <td style="padding:8px;font-size:13px;color:#111827;text-align:right;">${escapeHtml(j.revenue)}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="padding:16px;color:#9ca3af;text-align:center;font-size:13px;">No jobs scheduled for tomorrow</td></tr>'

  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">Daily Ops Recap</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">${escapeHtml(data.todayDate)}</p>

    <h3 style="color:#111827;font-size:16px;margin:0 0 12px;">Today — ${data.todayJobCount} Job${data.todayJobCount !== 1 ? 's' : ''}</h3>
    <table width="100%" style="border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr style="border-bottom:2px solid #111827;">
          <th style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:left;text-transform:uppercase;">Client</th>
          <th style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:left;text-transform:uppercase;">Team</th>
          <th style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:left;text-transform:uppercase;">Time</th>
          <th style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:right;text-transform:uppercase;">Revenue</th>
          <th style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:center;text-transform:uppercase;">Payment</th>
        </tr>
      </thead>
      <tbody>${todayRows}</tbody>
    </table>
    <p style="font-size:13px;color:#6b7280;margin:0 0 24px;">
      Revenue: <strong style="color:#111827;">${escapeHtml(data.todayRevenue)}</strong> &middot;
      ${data.todayPaid} paid &middot; ${data.todayUnpaid} unpaid
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

    <h3 style="color:#111827;font-size:16px;margin:0 0 12px;">Tomorrow — ${data.tomorrowJobCount} Job${data.tomorrowJobCount !== 1 ? 's' : ''}</h3>
    <table width="100%" style="border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr style="border-bottom:2px solid #111827;">
          <th style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:left;text-transform:uppercase;">Client</th>
          <th style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:left;text-transform:uppercase;">Team</th>
          <th style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:left;text-transform:uppercase;">Time</th>
          <th style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:right;text-transform:uppercase;">Revenue</th>
        </tr>
      </thead>
      <tbody>${tomorrowRows}</tbody>
    </table>
  `, data)
}

export function notificationDigestEmail(data: TemplateData & {
  date: string
  emailCount: number
  smsCount: number
  entries: { type: string; recipient: string; time: string; channel: string }[]
}): string {
  const rows = data.entries.length > 0
    ? data.entries.map(e => `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:6px 8px;font-size:13px;color:#111827;">${escapeHtml(e.type)}</td>
        <td style="padding:6px 8px;font-size:13px;color:#6b7280;">${escapeHtml(e.recipient)}</td>
        <td style="padding:6px 8px;font-size:13px;color:#6b7280;">${escapeHtml(e.time)}</td>
        <td style="padding:6px 8px;font-size:13px;color:#6b7280;">${escapeHtml(e.channel)}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="padding:16px;color:#9ca3af;text-align:center;font-size:13px;">No notifications sent today</td></tr>'

  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">Daily Notification Digest</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
      ${escapeHtml(data.date)} — ${data.emailCount} email${data.emailCount !== 1 ? 's' : ''}, ${data.smsCount} text${data.smsCount !== 1 ? 's' : ''} sent today.
    </p>
    <table width="100%" style="border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:2px solid #111827;">
          <th style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:left;text-transform:uppercase;">Type</th>
          <th style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:left;text-transform:uppercase;">Recipient</th>
          <th style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:left;text-transform:uppercase;">Time</th>
          <th style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:left;text-transform:uppercase;">Channel</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `, data)
}

export function paymentReceiptEmail(data: TemplateData & {
  clientName: string
  serviceName: string
  amount: string
  date: string
  paymentMethod: string
}): string {
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Payment Receipt</h2>
    <p style="color:#4b5563;font-size:14px;margin:0 0 24px;">
      Hi ${escapeHtml(data.clientName)}, here's your receipt from ${escapeHtml(data.tenantName)}.
    </p>
    <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
    <tr style="background:#f9fafb;">
      <td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;">Service</td>
      <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:600;text-align:right;">${escapeHtml(data.serviceName)}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;border-top:1px solid #e5e7eb;">Amount</td>
      <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e5e7eb;">${escapeHtml(data.amount)}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;border-top:1px solid #e5e7eb;">Date</td>
      <td style="padding:12px 16px;color:#111827;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${escapeHtml(data.date)}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;border-top:1px solid #e5e7eb;">Method</td>
      <td style="padding:12px 16px;color:#111827;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${escapeHtml(data.paymentMethod)}</td>
    </tr>
    </table>
  `, data)
}

export function adminNewClientEmail(
  client: {
    name: string
    phone?: string
    email?: string
    address?: string
    notes?: string
    referralInfo?: string
    referrerMatched?: boolean
    selfBookDiscountCents?: number
  },
  data: TemplateData & { adminUrl?: string }
): { subject: string; html: string } {
  const rows: string[] = []
  const row = (label: string, value: string) =>
    `<tr><td style="padding:10px 12px;color:#6b7280;font-size:12px;text-transform:uppercase;border-top:1px solid #e5e7eb;">${escapeHtml(label)}</td><td style="padding:10px 12px;color:#111827;font-size:14px;font-weight:500;text-align:right;border-top:1px solid #e5e7eb;">${escapeHtml(value)}</td></tr>`
  rows.push(row('Name', client.name))
  if (client.phone) rows.push(row('Phone', client.phone))
  if (client.email) rows.push(row('Email', client.email))
  if (client.address) rows.push(row('Address', client.address))
  if (client.referralInfo)
    rows.push(row('Referred by', client.referralInfo + (client.referrerMatched ? ' (matched)' : ' (unmatched)')))
  if (client.notes) rows.push(row('Notes', client.notes))

  // Self-book online leads earn a discount that must be honored on the quote.
  const discountBanner = client.selfBookDiscountCents
    ? `<div style="background:#ecfdf5;border:1px solid #34d399;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#065f46;font-size:14px;font-weight:600;">
         💲 Booked online — apply a $${(client.selfBookDiscountCents / 100).toFixed(0)} self-book discount to this lead's quote.
       </div>`
    : ''

  const cta = data.adminUrl
    ? `<a href="${safeUrl(data.adminUrl)}" style="display:inline-block;background:${escapeHtml(data.primaryColor || '#111827')};color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">View Clients</a>`
    : ''

  const html = baseTemplate(
    `
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">New client added</h2>
    ${discountBanner}
    <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      ${rows.join('\n')}
    </table>
    ${cta}
  `,
    data,
  )
  return { subject: `New Client: ${client.name}`, html }
}

export function clientBookingReceivedEmail(data: TemplateData & {
  clientName: string
  serviceName?: string
  dateTime?: string
  price?: string
  isRecurring?: boolean
  confirmUrl?: string
  portalEmail?: string
  portalPin?: string
}): string {
  const policyText = data.isRecurring ? data.cancellationPolicyRecurring : data.cancellationPolicyOneTime
  const portalBox = (data.portalEmail && data.portalPin)
    ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0 24px;">
        <p style="margin:0 0 8px;color:#111827;font-size:14px;font-weight:600;">Your Client Portal</p>
        ${data.bookingUrl ? `<p style="margin:4px 0;color:#4b5563;font-size:13px;"><strong>Login:</strong> <a href="${safeUrl(data.bookingUrl)}" style="color:#111827;">${escapeHtml(data.bookingUrl.replace(/^https?:\/\//, ''))}</a></p>` : ''}
        <p style="margin:4px 0;color:#4b5563;font-size:13px;"><strong>Email:</strong> ${escapeHtml(data.portalEmail)}</p>
        <p style="margin:4px 0;color:#4b5563;font-size:13px;"><strong>PIN:</strong> <span style="font-family:monospace;background:#e5e7eb;padding:2px 8px;border-radius:4px;letter-spacing:2px;">${escapeHtml(data.portalPin)}</span></p>
      </div>`
    : ''
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Booking Request Received — Pending Review</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${escapeHtml(data.clientName)}, this is <strong>not finalized yet</strong>. We'll review and confirm shortly — until you get a second email/text locking in the details, please don't plan around this slot.
    </p>
    ${infoTable(`
      ${infoRow('Service', escapeHtml(data.serviceName || 'Appointment'))}
      ${infoRow('Date & Time', escapeHtml(data.dateTime || 'To be confirmed'))}
      ${data.price ? infoRow('Price', escapeHtml(data.price)) : ''}
      ${infoRow('Status', '<strong style="color:#f59e0b;">PENDING — awaiting confirmation</strong>')}
    `)}
    ${data.confirmUrl ? ctaButton('Confirm Now', data.confirmUrl, data.primaryColor) : ''}
    ${policyText ? noteBox(policyText, 'warning') : ''}
    ${portalBox}
    ${contactLine(data)}
  `, data)
}

export function adminNewBookingRequestEmail(
  booking: {
    clientName: string
    clientPhone?: string
    clientEmail?: string
    address?: string
    date?: string
    time?: string
    notes?: string
  },
  data: TemplateData & { adminUrl?: string },
): { subject: string; html: string } {
  const row = (l: string, v: string) =>
    `<tr><td style="padding:8px 12px;background:#f9fafb;border-bottom:1px solid #e5e7eb;"><span style="color:#6b7280;font-size:12px;text-transform:uppercase;">${escapeHtml(l)}</span></td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;">${escapeHtml(v)}</td></tr>`
  const rows = [
    row('Client', booking.clientName),
    booking.clientPhone ? row('Phone', booking.clientPhone) : '',
    booking.clientEmail ? row('Email', booking.clientEmail) : '',
    booking.address ? row('Address', booking.address) : '',
    booking.date ? row('Date', booking.date) : '',
    booking.time ? row('Time', booking.time) : '',
    booking.notes ? row('Notes', booking.notes) : '',
  ].filter(Boolean)
  const html = baseTemplate(
    `<h2 style="color:#111827;font-size:20px;margin:0 0 16px;">New booking request</h2>
     <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
       ${rows.join('\n')}
     </table>`,
    data,
  )
  return { subject: `New Booking: ${booking.clientName}`, html }
}

export function referralSignupNotifyEmail(
  referrer: { name: string; email?: string; phone?: string; refCode?: string },
  data: TemplateData,
): { subject: string; html: string } {
  const html = baseTemplate(
    `<h2 style="color:#111827;font-size:20px;margin:0 0 16px;">New referral signup</h2>
     <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px;">
       ${escapeHtml(referrer.name)} signed up as a referrer${referrer.refCode ? ` (code: ${escapeHtml(referrer.refCode)})` : ''}.
     </p>`,
    data,
  )
  return { subject: `New Referrer: ${referrer.name}`, html }
}

export function smsNewApplication(name: string): string {
  return `New team application: ${name}. Review in admin.`
}

/**
 * Generic branded fallback for any notify() type without a bespoke template
 * (15min_warning, new_client, late_check_in, error, etc.) — every admin email
 * gets the tenant-branded shell instead of a bare unstyled <p> tag.
 */
export function genericNotificationEmail(data: TemplateData & { title: string; message: string }): string {
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">${escapeHtml(data.title)}</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
  `, data)
}

export function clientCancellationEmail(data: TemplateData & {
  clientName: string
  serviceName: string
  dateTime: string
}): string {
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Appointment Cancelled</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${escapeHtml(data.clientName)}, your appointment with ${escapeHtml(data.tenantName)} has been cancelled.
    </p>
    ${infoTable(`
      ${infoRow('Date & Time', escapeHtml(data.dateTime))}
      ${infoRow('Service', escapeHtml(data.serviceName))}
    `)}
    ${data.bookingUrl ? ctaButton('Book Again', data.bookingUrl, data.primaryColor) : ''}
    ${contactLine(data)}
  `, data)
}

export function clientThankYouEmail(data: TemplateData & {
  clientName: string
  referralLink?: string
}): string {
  const loyaltyBlock = data.loyaltyDiscountPercent
    ? `<div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#166534;">${data.loyaltyDiscountPercent}% off all future services!</p>
        <p style="margin:0;font-size:14px;color:#166534;line-height:1.5;">As a valued client, you automatically get <strong>${data.loyaltyDiscountPercent}% off</strong> every future booking. No code needed.</p>
      </div>`
    : ''
  const referralBlock = data.referralLink
    ? `<div style="background:#eff6ff;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1e40af;">Earn free services & cash!</p>
        <p style="margin:0 0 12px;font-size:14px;color:#1e40af;line-height:1.5;">Our referral program is one of our most popular features — many clients earn free services just by referring someone once.</p>
        ${ctaButton('Learn About Referral Rewards', data.referralLink, '#1e40af')}
      </div>`
    : ''
  const reviewBlock = data.reviewUrl
    ? `<div style="background:#fffbeb;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#92400e;">How was your service?</p>
        <p style="margin:0 0 12px;font-size:14px;color:#92400e;line-height:1.5;">Your honest review helps other clients find a business they can trust.</p>
        ${ctaButton('Leave a Review', data.reviewUrl, '#92400e')}
      </div>`
    : ''
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Thank You!</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${escapeHtml(data.clientName)}, thank you for choosing ${escapeHtml(data.tenantName)}. We hope you loved the experience and look forward to seeing you again!
    </p>
    ${loyaltyBlock}
    ${referralBlock}
    ${reviewBlock}
    ${data.bookingUrl ? ctaButton('Book Again', data.bookingUrl, data.primaryColor) : ''}
    ${contactLine(data)}
  `, data)
}

export function clientPaymentDueEmail(data: TemplateData & {
  clientName: string
  teamMemberName?: string
  amount: string
  paymentUrl?: string
}): string {
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Payment Due</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${escapeHtml(data.clientName)}, ${data.teamMemberName ? escapeHtml(data.teamMemberName) + ' is' : 'we are'} wrapping up your service.
    </p>
    <div style="background:#eff6ff;border-radius:8px;padding:24px;margin:0 0 24px;text-align:center;">
      <p style="margin:0 0 8px;color:#1e40af;font-size:14px;">Amount due</p>
      <p style="margin:0;font-size:36px;font-weight:700;color:#1e40af;">$${escapeHtml(data.amount)}</p>
    </div>
    ${data.paymentUrl ? ctaButton(`Pay $${data.amount} now`, data.paymentUrl, data.primaryColor) : ''}
    ${noteBox("Our team can't leave until payment has been processed. Thank you for your prompt payment!", 'warning')}
    ${noteBox('Tips are always appreciated but never required. 100% of tips go directly to your team member.', 'info')}
    ${contactLine(data)}
  `, data)
}

export function clientRatingPromptEmail(data: TemplateData & {
  clientName: string
  teamMemberName?: string
}): string {
  const proFirst = (data.teamMemberName || 'your pro').split(' ')[0]
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">How did we do, ${escapeHtml(data.clientName)}?</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Thanks for choosing ${escapeHtml(data.tenantName)} today. We'd love to hear how it went — your feedback shapes our team.
    </p>
    ${noteBox(`Just hit reply with a quick rating (1-5) and any thoughts on ${escapeHtml(proFirst)}'s work.`, 'info')}
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:16px 0 0;">Anything that wasn't perfect, tell us — we'll make it right.</p>
  `, data)
}

export function clientReviewIncentiveEmail(data: TemplateData & {
  clientName: string
  teamMemberName?: string
  incentiveAmount?: string
  referralLink?: string
}): string {
  const proFirst = (data.teamMemberName || 'our team').split(' ')[0]
  const incentiveBlock = data.incentiveAmount
    ? noteBox(`<strong>Our thank-you to you:</strong> $${escapeHtml(data.incentiveAmount)} for a written review.`, 'success')
    : ''
  const referralPs = data.referralLink
    ? `<p style="color:#9ca3af;font-size:12px;margin:16px 0 0;">P.S. Love us? Refer friends and earn ${data.referralCommissionPercent ?? 10}% of every booking they make: <a href="${safeUrl(data.referralLink)}" style="color:${escapeHtml(data.primaryColor || '#111827')};">${escapeHtml(data.referralLink.replace(/^https?:\/\//, ''))}</a></p>`
    : ''
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">5 stars from you means everything</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Hi ${escapeHtml(data.clientName)} — thank you for the perfect rating for ${escapeHtml(proFirst)}. If you have a minute, would you share that with the world?
    </p>
    ${incentiveBlock}
    ${data.reviewUrl ? ctaButton('Leave a Review', data.reviewUrl, data.primaryColor) : ''}
    ${referralPs}
    ${contactLine(data)}
  `, data)
}

export function clientRescheduleEmail(data: TemplateData & {
  clientName: string
  serviceName: string
  newDateTime: string
  oldDateTime: string
  teamMemberName?: string
}): string {
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Your Appointment Has Been Rescheduled</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">Hi ${escapeHtml(data.clientName)}, your appointment has been updated.</p>
    ${infoTable(`
      ${infoRow('New Date & Time', escapeHtml(data.newDateTime))}
      ${infoRow('Previous', escapeHtml(data.oldDateTime))}
      ${data.teamMemberName ? infoRow('Team Member', escapeHtml(data.teamMemberName)) : ''}
      ${infoRow('Service', escapeHtml(data.serviceName))}
    `)}
    ${data.bookingUrl ? ctaButton('View in Portal', data.bookingUrl, data.primaryColor) : ''}
    ${contactLine(data)}
  `, data)
}

// ── Team-facing (the person doing the job) ──

export function teamJobAssignmentEmail(data: TemplateData & {
  teamMemberName: string
  clientName: string
  serviceName: string
  dateTime: string
  address?: string
  notes?: string
  portalUrl?: string
  suppliesIncluded?: boolean
}): string {
  const firstName = data.teamMemberName.split(' ')[0]
  const mapsBlock = data.address
    ? `<div style="background:#f9fafb;border-radius:8px;padding:16px;margin:24px 0;">
        <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Address</p>
        <p style="margin:0 0 12px;font-size:15px;color:#111827;">${escapeHtml(data.address)}</p>
        <a href="${safeUrl(`https://maps.google.com/?q=${encodeURIComponent(data.address)}`)}" style="color:${escapeHtml(data.primaryColor || '#111827')};font-size:14px;">Open in Maps →</a>
      </div>`
    : ''
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">New job assigned</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">Hi ${escapeHtml(firstName)}</p>
    ${infoTable(`
      ${infoRow('Date & Time', escapeHtml(data.dateTime))}
      ${infoRow('Client', escapeHtml(data.clientName))}
      ${infoRow('Service', escapeHtml(data.serviceName))}
    `)}
    ${mapsBlock}
    ${data.suppliesIncluded !== undefined
      ? noteBox(data.suppliesIncluded ? 'Bring all supplies.' : "Client provides supplies — don't bring your own.", data.suppliesIncluded ? 'success' : 'warning')
      : ''}
    ${data.notes ? noteBox(`<strong>Notes:</strong> ${escapeHtml(data.notes)}`, 'warning') : ''}
    ${data.portalUrl ? ctaButton('Open Team Portal', data.portalUrl, data.primaryColor) : ''}
    ${contactLine(data)}
  `, data)
}

export function teamDailyJobsEmail(data: TemplateData & {
  teamMemberName: string
  jobs: { clientName: string; dateTime: string; address?: string; suppliesIncluded?: boolean; notes?: string }[]
  portalUrl?: string
}): string {
  const firstName = data.teamMemberName.split(' ')[0]
  const rows = data.jobs.length > 0
    ? data.jobs.map(j => `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:8px 0;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#111827;">${escapeHtml(j.dateTime)} — ${escapeHtml(j.clientName)}</p>
        ${j.address ? `<p style="margin:0 0 8px;font-size:13px;"><a href="${safeUrl(`https://maps.google.com/?q=${encodeURIComponent(j.address)}`)}" style="color:#6b7280;">${escapeHtml(j.address)}</a></p>` : ''}
        ${j.suppliesIncluded !== undefined ? `<span style="display:inline-block;background:${j.suppliesIncluded ? '#f0fdf4' : '#fffbeb'};color:${j.suppliesIncluded ? '#166534' : '#92400e'};padding:4px 8px;border-radius:4px;font-size:12px;">${j.suppliesIncluded ? 'Bring supplies' : 'Client provides supplies'}</span>` : ''}
        ${j.notes ? `<p style="margin:12px 0 0;padding:10px;background:#fffbeb;border-radius:4px;color:#92400e;font-size:13px;">${escapeHtml(j.notes)}</p>` : ''}
      </div>`).join('')
    : '<p style="color:#9ca3af;font-size:13px;">No upcoming jobs.</p>'
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">Your upcoming jobs</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">Hi ${escapeHtml(firstName)} — ${data.jobs.length} job${data.jobs.length !== 1 ? 's' : ''} coming up.</p>
    ${rows}
    ${data.portalUrl ? ctaButton('Open Team Portal', data.portalUrl, data.primaryColor) : ''}
    ${contactLine(data)}
  `, data)
}

export function teamCancellationEmail(data: TemplateData & {
  teamMemberName: string
  clientName: string
  dateTime: string
  portalUrl?: string
}): string {
  const firstName = data.teamMemberName.split(' ')[0]
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">Job cancelled</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">Hi ${escapeHtml(firstName)}</p>
    ${infoTable(`
      ${infoRow('Date & Time', escapeHtml(data.dateTime))}
      ${infoRow('Client', escapeHtml(data.clientName))}
    `)}
    ${data.portalUrl ? ctaButton('View Schedule', data.portalUrl, data.primaryColor) : ''}
    ${contactLine(data)}
  `, data)
}

export function teamRescheduleEmail(data: TemplateData & {
  teamMemberName: string
  clientName: string
  newDateTime: string
  oldDateTime: string
  address?: string
  portalUrl?: string
}): string {
  const firstName = data.teamMemberName.split(' ')[0]
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">Job rescheduled</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">Hi ${escapeHtml(firstName)} — this job has been moved.</p>
    ${infoTable(`
      ${infoRow('New Date & Time', escapeHtml(data.newDateTime))}
      ${infoRow('Previous', escapeHtml(data.oldDateTime))}
      ${infoRow('Client', escapeHtml(data.clientName))}
      ${data.address ? infoRow('Address', escapeHtml(data.address)) : ''}
    `)}
    ${data.portalUrl ? ctaButton('Open Team Portal', data.portalUrl, data.primaryColor) : ''}
    ${contactLine(data)}
  `, data)
}

// ── Referral program ──

export function referralWelcomeEmail(data: TemplateData & {
  referrerName: string
  refCode: string
  referralLink: string
  payoutMethod?: string
  dashboardUrl?: string
}): string {
  const firstName = data.referrerName.split(' ')[0]
  const commission = data.referralCommissionPercent ?? 10
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Welcome to the team, ${escapeHtml(firstName)}!</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">You're now part of ${escapeHtml(data.tenantName)}'s referral program.</p>
    <div style="background:#f9fafb;border-radius:8px;padding:24px;margin:0 0 24px;text-align:center;">
      <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Your referral code</p>
      <p style="margin:0;font-size:32px;font-weight:700;color:#111827;letter-spacing:2px;">${escapeHtml(data.refCode)}</p>
    </div>
    ${noteBox(`<strong>${commission}% commission</strong> on every booking from your referrals${data.payoutMethod ? `, paid via ${escapeHtml(data.payoutMethod)}` : ''}.`, 'success')}
    <p style="color:#4b5563;font-size:14px;margin:24px 0 8px;">Your personal link:</p>
    <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin:0 0 24px;">
      <a href="${safeUrl(data.referralLink)}" style="color:${escapeHtml(data.primaryColor || '#111827')};font-size:14px;word-break:break-all;">${escapeHtml(data.referralLink)}</a>
    </div>
    ${data.dashboardUrl ? ctaButton('View Your Dashboard', data.dashboardUrl, data.primaryColor) : ''}
  `, data)
}

export function referralCommissionEmail(data: TemplateData & {
  referrerName: string
  commissionAmount: string
  serviceTotal: string
  pendingBalance: string
  refCode: string
  dashboardUrl?: string
}): string {
  const firstName = data.referrerName.split(' ')[0]
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">You earned $${escapeHtml(data.commissionAmount)}!</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">Nice work, ${escapeHtml(firstName)}. Your referral just completed a service.</p>
    ${infoTable(`
      ${infoRow('Service total', `$${escapeHtml(data.serviceTotal)}`)}
      ${infoRow('Your commission', `<span style="color:#166534;font-weight:600">$${escapeHtml(data.commissionAmount)}</span>`)}
      ${infoRow('Pending balance', `$${escapeHtml(data.pendingBalance)}`)}
    `)}
    ${data.dashboardUrl ? ctaButton('View Dashboard', data.dashboardUrl, data.primaryColor) : ''}
  `, data)
}

export function newReferrerAdminEmail(
  referrer: { name: string; email: string; phone?: string; refCode: string; payoutMethod?: string },
  data: TemplateData & { adminUrl?: string },
): { subject: string; html: string } {
  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">New referrer signed up</h2>
    ${infoTable(`
      ${infoRow('Name', escapeHtml(referrer.name))}
      ${infoRow('Email', escapeHtml(referrer.email))}
      ${referrer.phone ? infoRow('Phone', escapeHtml(referrer.phone)) : ''}
      ${infoRow('Code', escapeHtml(referrer.refCode))}
      ${referrer.payoutMethod ? infoRow('Payout', escapeHtml(referrer.payoutMethod)) : ''}
    `)}
    ${data.adminUrl ? ctaButton('View Referrals', data.adminUrl, data.primaryColor) : ''}
  `, data)
  return { subject: `New Referrer: ${referrer.name}`, html }
}

// ── Auth / access ──

export function verificationCodeEmail(data: TemplateData & {
  code: string
  clientName?: string
}): string {
  const firstName = data.clientName?.split(' ')[0] || 'there'
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Your Verification Code</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">Hi ${escapeHtml(firstName)}, use this code to access your account.</p>
    <div style="background:#f9fafb;border-radius:8px;padding:24px;margin:0 0 24px;text-align:center;">
      <p style="margin:0;font-size:36px;font-weight:700;color:#111827;letter-spacing:8px;">${escapeHtml(data.code)}</p>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin:0;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
  `, data)
}

export function pinResetEmail(data: TemplateData & {
  personName: string
  pin: string
  portalUrl: string
}): string {
  const firstName = data.personName.split(' ')[0]
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Your PIN Has Been Reset</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">Hi ${escapeHtml(firstName)}, here's your new PIN.</p>
    <div style="background:#f9fafb;border-radius:8px;padding:24px;margin:0 0 24px;text-align:center;">
      <p style="margin:0;font-size:36px;font-weight:700;color:#111827;letter-spacing:6px;">${escapeHtml(data.pin)}</p>
    </div>
    ${ctaButton('Open Portal', data.portalUrl, data.primaryColor)}
  `, data)
}

export function adminPendingRemindersEmail(
  pendingBookings: { clientName: string; date: string; serviceName: string }[],
  data: TemplateData & { adminUrl?: string },
): { subject: string; html: string } {
  const rows = pendingBookings.length > 0
    ? pendingBookings.map(b => infoRow(escapeHtml(b.clientName), `${escapeHtml(b.date)} · ${escapeHtml(b.serviceName)}`)).join('')
    : '<tr><td style="padding:8px 16px;color:#9ca3af;font-size:13px;">Nothing pending.</td></tr>'
  const html = baseTemplate(`
    <h2 style="color:#dc2626;font-size:20px;margin:0 0 8px;">Pending Bookings Need Attention</h2>
    <p style="color:#4b5563;font-size:14px;margin:0 0 24px;">${pendingBookings.length} booking${pendingBookings.length !== 1 ? 's are' : ' is'} still pending and not yet scheduled or assigned.</p>
    ${infoTable(rows)}
    ${data.adminUrl ? ctaButton('Review Pending Bookings', data.adminUrl, data.primaryColor) : ''}
  `, data)
  return { subject: `${pendingBookings.length} Pending Booking${pendingBookings.length !== 1 ? 's' : ''} Need Attention`, html }
}

/**
 * Generic branded fallback for any notify() type without a bespoke template
 * (15min_warning, new_client, late_check_in, error, etc.) — every admin email
 * gets the tenant-branded shell instead of a bare unstyled <p> tag.
 */
export function portalPinResetEmail(data: TemplateData & {
  recipientName: string
  pin: string
  portalUrl?: string
  wasReset?: boolean
}): string {
  const color = escapeHtml(data.primaryColor || '#111827')
  const wasReset = data.wasReset !== false
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">${wasReset ? 'Your PIN was reset' : 'Your Portal PIN'}</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Hi ${escapeHtml(data.recipientName.split(' ')[0] || data.recipientName)}, ${wasReset ? 'your portal PIN was just reset. Use the new PIN below to log in.' : 'here is your portal PIN.'}
    </p>
    <div style="background:#f5f5f5;border-radius:8px;padding:24px;margin:0 0 24px;text-align:center;">
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Your PIN</p>
      <p style="margin:0;font-size:36px;font-weight:700;color:#111827;letter-spacing:6px;">${escapeHtml(data.pin)}</p>
    </div>
    ${data.portalUrl ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${safeUrl(data.portalUrl)}" style="display:inline-block;background:${color};color:#ffffff;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
        Open Portal
      </a>
    </td></tr></table>` : ''}
    <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">
      Didn't request this? Contact us right away.
    </p>
  `, data)
}

export function genericNotificationEmail(data: TemplateData & { title: string; message: string }): string {
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">${escapeHtml(data.title)}</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
  `, data)
}

// Sent to an applicant when their team application is approved.
// NYC-Maid-style: shows the team portal PIN + a portal button. Bilingual EN/ES.
export function teamApplicationApprovedEmail(data: TemplateData & {
  applicantName: string
  pin: string
  portalUrl: string
  supportPhone?: string
}): string {
  const parts = (data.applicantName || '').trim().split(/\s+/)
  const firstName = parts[0] && /^(the|a|an|el|la|los|las)$/i.test(parts[0])
    ? (parts[1] || 'there')
    : (parts[0] || 'there')
  const color = escapeHtml(data.primaryColor || '#111827')
  const rawDigits = (data.supportPhone || '').replace(/\D/g, '')
  const ten = rawDigits.length === 11 && rawDigits.startsWith('1') ? rawDigits.slice(1) : rawDigits
  const phoneDisplay = ten.length === 10 ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : data.supportPhone
  const phoneLine = data.supportPhone
    ? `<p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;">
         Questions? / ¿Preguntas? Text <a href="sms:${ten || rawDigits}" style="color:${color};font-weight:600;">${escapeHtml(phoneDisplay)}</a>
       </p>`
    : ''
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 4px;">Welcome to the team! / ¡Bienvenido/a al equipo!</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Hi ${escapeHtml(firstName)} — your application to join <strong>${escapeHtml(data.tenantName)}</strong> has been approved.<br>
      Hola ${escapeHtml(firstName)} — su solicitud para unirse a <strong>${escapeHtml(data.tenantName)}</strong> ha sido aprobada.
    </p>

    <div style="background:#f5f5f5;border-radius:8px;padding:24px;margin:0 0 24px;text-align:center;">
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Your PIN / Tu PIN</p>
      <p style="margin:0;font-size:36px;font-weight:700;color:#111827;letter-spacing:6px;">${escapeHtml(data.pin)}</p>
      <p style="margin:12px 0 0;color:#9ca3af;font-size:12px;">Use this to log in to your team portal / Úsalo para entrar a tu portal</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td align="center">
      <a href="${safeUrl(data.portalUrl)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;">Open Team Portal / Abrir Portal</a>
    </td></tr></table>

    <p style="color:#4b5563;font-size:13px;line-height:1.6;margin:0 0 8px;">
      <strong>How it works / Cómo funciona:</strong> Log in with your PIN to see your assigned jobs, check in when you arrive, and check out when you finish. Check-in/out is how your hours and pay are calculated.
    </p>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
      Entra con tu PIN para ver tus trabajos, marca tu llegada (check in) y tu salida (check out). El check-in/out calcula tus horas y tu pago.
    </p>
    ${phoneLine}
  `, data)
}

