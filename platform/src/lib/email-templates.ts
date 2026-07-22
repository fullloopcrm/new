// Branded HTML email templates for notifications
import { escapeHtml, safeUrl } from './escape-html'

type TemplateData = {
  tenantName: string
  primaryColor?: string
  logoUrl?: string
  /** CAN-SPAM: sender's valid physical postal address, shown in the footer. */
  businessAddress?: string
  /** CAN-SPAM: per-recipient unsubscribe URL for commercial/marketing email. */
  unsubscribeUrl?: string
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
}): string {
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Appointment Reminder</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${escapeHtml(data.clientName)}, this is a reminder that your appointment is <strong>${escapeHtml(data.timeUntil)}</strong>.
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
    ${data.address ? `<tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Location</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${escapeHtml(data.address)}</p>
    </td></tr>` : ''}
    </table>
    <p style="color:#9ca3af;font-size:12px;margin:0;">
      Need to reschedule? Reply to this email or call us.
    </p>
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
}): string {
  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Booking Confirmed!</h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hi ${escapeHtml(data.clientName)}, your appointment with ${escapeHtml(data.tenantName)} is confirmed.
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
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Team Member</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${escapeHtml(data.teamMemberName)}</p>
    </td></tr>
    ${data.address ? `<tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Location</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${escapeHtml(data.address)}</p>
    </td></tr>` : ''}
    ${data.price ? `<tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Price</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${escapeHtml(data.price)}</p>
    </td></tr>` : ''}
    </table>
    ${data.portalUrl ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${safeUrl(data.portalUrl)}" style="display:inline-block;background:${escapeHtml(data.primaryColor || '#111827')};color:#ffffff;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
        View Booking
      </a>
    </td></tr></table>` : ''}
    <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">
      Need to reschedule? Reply to this email or call us.
    </p>
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

// ── Nycmaid-compat aliases (for copied /api/client/book routes) ──
// Nycmaid's email-templates file had these distinct names; fullloop
// consolidates them under the same underlying renderers.
export function clientBookingReceivedEmail(data: TemplateData & {
  clientName: string
  serviceName?: string
  dateTime?: string
}): string {
  return bookingReceivedEmail({
    ...data,
    serviceName: data.serviceName || 'Appointment',
    dateTime: data.dateTime || 'To be confirmed',
  })
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
  return `New cleaner application: ${name}. Review in admin.`
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

