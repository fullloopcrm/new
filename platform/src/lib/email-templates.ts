// Branded HTML email templates for notifications

type TemplateData = {
  tenantName: string
  primaryColor?: string
  logoUrl?: string
}

function baseTemplate(content: string, data: TemplateData): string {
  const color = data.primaryColor || '#111827'
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<tr><td style="background:${color};padding:24px 32px;">
<table width="100%"><tr>
${data.logoUrl ? `<td width="40"><img src="${data.logoUrl}" width="36" height="36" style="border-radius:6px;" /></td>` : ''}
<td><span style="color:#ffffff;font-size:16px;font-weight:700;">${data.tenantName}</span></td>
</tr></table>
</td></tr>
<tr><td style="padding:32px;">
${content}
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
<p style="color:#9ca3af;font-size:11px;margin:0;text-align:center;">
Sent by ${data.tenantName} via Full Loop CRM
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
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
      Hi ${data.clientName}, this is a reminder that your appointment is <strong>${data.timeUntil}</strong>.
    </p>
    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
    <tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Service</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${data.serviceName}</p>
    </td></tr>
    <tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Date & Time</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${data.dateTime}</p>
    </td></tr>
    ${data.address ? `<tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Location</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${data.address}</p>
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
      Hi ${data.clientName}, thank you for choosing ${data.tenantName}! We hope you enjoyed your ${data.serviceName}.
    </p>
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px;">
      We'd love to hear your feedback. Your opinion helps us improve!
    </p>
    <table width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
    <tr><td>
      <p style="color:#166534;font-size:12px;margin:0;text-transform:uppercase;letter-spacing:1px;">Your Discount Code</p>
      <p style="color:#166534;font-size:24px;font-weight:700;margin:8px 0;letter-spacing:2px;">${data.discountCode}</p>
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
    <p style="color:#4b5563;font-size:14px;margin:0 0 24px;">Here's your daily summary for ${data.tenantName}.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr>
      <td style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center;width:33%;">
        <p style="color:#3b82f6;font-size:24px;font-weight:700;margin:0;">${data.todaysJobs}</p>
        <p style="color:#6b7280;font-size:11px;margin:4px 0 0;text-transform:uppercase;">Today's Jobs</p>
      </td>
      <td width="12"></td>
      <td style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;width:33%;">
        <p style="color:#10b981;font-size:24px;font-weight:700;margin:0;">${data.yesterdayRevenue}</p>
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
      Hi ${data.clientName}, we'd love to hear your feedback about your recent experience with ${data.tenantName}.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${data.feedbackUrl}" style="display:inline-block;background:${data.primaryColor || '#111827'};color:#ffffff;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
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
      Hi ${data.clientName}, your appointment with ${data.tenantName} is confirmed.
    </p>
    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
    <tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Service</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${data.serviceName}</p>
    </td></tr>
    <tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Date & Time</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${data.dateTime}</p>
    </td></tr>
    <tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Team Member</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${data.teamMemberName}</p>
    </td></tr>
    ${data.address ? `<tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Location</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${data.address}</p>
    </td></tr>` : ''}
    ${data.price ? `<tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Price</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${data.price}</p>
    </td></tr>` : ''}
    </table>
    ${data.portalUrl ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${data.portalUrl}" style="display:inline-block;background:${data.primaryColor || '#111827'};color:#ffffff;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
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
      Hi ${data.clientName}, thank you for choosing ${data.tenantName}. We're reviewing your request and will confirm shortly.
    </p>
    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
    <tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Service</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${data.serviceName}</p>
    </td></tr>
    <tr><td style="padding:8px 16px;">
      <p style="color:#6b7280;font-size:12px;margin:0;text-transform:uppercase;">Date & Time</p>
      <p style="color:#111827;font-size:14px;font-weight:600;margin:4px 0 0;">${data.dateTime}</p>
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
        <td style="padding:8px;font-size:13px;color:#111827;font-weight:500;">${j.clientName}</td>
        <td style="padding:8px;font-size:13px;color:#6b7280;">${j.teamMemberName}</td>
        <td style="padding:8px;font-size:13px;color:#6b7280;">${j.time}</td>
        <td style="padding:8px;font-size:13px;color:#111827;text-align:right;">${j.revenue}</td>
        <td style="padding:8px;font-size:13px;color:${j.paymentStatus === 'paid' ? '#16a34a' : '#dc2626'};text-align:center;">${j.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="padding:16px;color:#9ca3af;text-align:center;font-size:13px;">No jobs today</td></tr>'

  const tomorrowRows = data.tomorrowJobs.length > 0
    ? data.tomorrowJobs.map(j => `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-size:13px;color:#111827;font-weight:500;">${j.clientName}</td>
        <td style="padding:8px;font-size:13px;color:#6b7280;">${j.teamMemberName}</td>
        <td style="padding:8px;font-size:13px;color:#6b7280;">${j.time}</td>
        <td style="padding:8px;font-size:13px;color:#111827;text-align:right;">${j.revenue}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="padding:16px;color:#9ca3af;text-align:center;font-size:13px;">No jobs scheduled for tomorrow</td></tr>'

  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">Daily Ops Recap</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">${data.todayDate}</p>

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
      Revenue: <strong style="color:#111827;">${data.todayRevenue}</strong> &middot;
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
        <td style="padding:6px 8px;font-size:13px;color:#111827;">${e.type}</td>
        <td style="padding:6px 8px;font-size:13px;color:#6b7280;">${e.recipient}</td>
        <td style="padding:6px 8px;font-size:13px;color:#6b7280;">${e.time}</td>
        <td style="padding:6px 8px;font-size:13px;color:#6b7280;">${e.channel}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="padding:16px;color:#9ca3af;text-align:center;font-size:13px;">No notifications sent today</td></tr>'

  return baseTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">Daily Notification Digest</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
      ${data.date} — ${data.emailCount} email${data.emailCount !== 1 ? 's' : ''}, ${data.smsCount} text${data.smsCount !== 1 ? 's' : ''} sent today.
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
      Hi ${data.clientName}, here's your receipt from ${data.tenantName}.
    </p>
    <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
    <tr style="background:#f9fafb;">
      <td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;">Service</td>
      <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:600;text-align:right;">${data.serviceName}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;border-top:1px solid #e5e7eb;">Amount</td>
      <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e5e7eb;">${data.amount}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;border-top:1px solid #e5e7eb;">Date</td>
      <td style="padding:12px 16px;color:#111827;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${data.date}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;color:#6b7280;font-size:12px;text-transform:uppercase;border-top:1px solid #e5e7eb;">Method</td>
      <td style="padding:12px 16px;color:#111827;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${data.paymentMethod}</td>
    </tr>
    </table>
  `, data)
}
