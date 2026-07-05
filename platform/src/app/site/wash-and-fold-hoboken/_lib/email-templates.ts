// ============================================
// CLEAN EMAIL TEMPLATES - GOOGLE/APPLE STYLE
// ============================================

export const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-text-size-adjust: 100%;">
  <!--[if mso]>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5"><tr><td align="center">
  <![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <tr>
            <td bgcolor="#ffffff" style="background-color: #ffffff; border-radius: 12px; padding: 40px;">
              <div style="margin: 0 0 24px 0;">
                <a href="https://www.thenycmaid.com"><img src="https://www.thenycmaid.com/logo.png" alt="The NYC Maid" width="160" height="48" style="width: 160px; height: auto; display: block;" /></a>
              </div>
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 0 0 0; text-align: left;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                The NYC Maid · <a href="tel:6464900130" style="color: #999;">(646) 490-0130</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <!--[if mso]>
  </td></tr></table>
  <![endif]-->
</body>
</html>
`

const primaryButton = (text: string, href: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
  <tr>
    <td align="left">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:52px;v-text-anchor:middle;width:240px;" arcsize="15%" fillcolor="#2563eb" stroke="f">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">${text}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${href}" style="display: inline-block; background-color: #2563eb; color: #ffffff !important; -webkit-text-fill-color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; mso-hide: all;">${text}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>
`

const infoRow = (label: string, value: string) => `
<tr>
  <td style="padding: 8px 0; color: #666; font-size: 14px; width: 100px; text-align: left;">${label}</td>
  <td style="padding: 8px 0; color: #000; font-size: 14px; font-weight: 500; text-align: left;">${value}</td>
</tr>
`

const infoTable = (rows: string) => `
<table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
  ${rows}
</table>
`

const divider = () => `<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />`

const noteBox = (content: string, type: 'info' | 'warning' | 'success' = 'info') => {
  const colors = {
    info: { bg: '#f0f7ff', border: '#3b82f6', text: '#1e40af' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' }
  }
  const c = colors[type]
  return `
<div style="background: ${c.bg}; border-left: 3px solid ${c.border}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; text-align: left;">
  <p style="margin: 0; color: ${c.text}; font-size: 14px; line-height: 1.6; text-align: left;">${content}</p>
</div>
`
}

// ============================================
// CLIENT EMAILS
// ============================================

export function clientBookingReceivedEmail(booking: any) {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const startTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const clientName = booking.clients?.name?.split(' ')[0] || 'there'

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">We received your booking request!</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${clientName}, thank you for choosing NYC Maid. We're reviewing your request and will confirm shortly.</p>

    ${infoTable(`
      ${infoRow('Date', date)}
      ${infoRow('Time', startTime)}
      ${infoRow('Service', booking.service_type || 'Standard Cleaning')}
      ${infoRow('Status', '<strong style="color: #f59e0b;">Pending Confirmation</strong>')}
    `)}

    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 24px 0 0 0;">
      We'll assign a cleaner and send you a confirmation with all the details — including your cleaner's name, preparation tips, and payment info.
    </p>

    ${booking.clients?.pin ? `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 24px 0 0 0;">
      <p style="margin: 0 0 4px 0; color: #333; font-size: 14px; font-weight: 600;">Your Client Portal</p>
      <p style="margin: 4px 0; color: #333; font-size: 13px;"><strong>Login:</strong> <a href="https://www.thenycmaid.com/book" style="color: #000;">thenycmaid.com/book</a></p>
      <p style="margin: 4px 0; color: #333; font-size: 13px;"><strong>Email:</strong> ${booking.clients.email}</p>
      <p style="margin: 4px 0; color: #333; font-size: 13px;"><strong>PIN:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; letter-spacing: 2px;">${booking.clients.pin}</span></p>
    </div>
    ` : ''}

    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 16px 0 0 0;">
      Questions? Call or text us at <a href="tel:6464900130" style="color: #000; font-weight: 500;">(646) 490-0130</a>
    </p>
  `

  return { subject: `Booking Request Received — ${date}`, html: emailWrapper(content) }
}

export function clientConfirmationEmail(booking: any) {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const startTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const cleanerName = booking.cleaners?.name || 'Your cleaner'
  const cleanerFirst = (booking.cleaners?.name || 'Your cleaner').split(' ')[0]
  const clientName = booking.clients?.name?.split(' ')[0] || 'there'
  const hourlyRate = booking.hourly_rate || 75
  const isRecurring = booking.recurring_type ? true : false

  const durationMs = new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()
  const estimatedHours = Math.round(durationMs / (1000 * 60 * 60))
  const estimatedRange = estimatedHours <= 2 ? '2-3' : `${estimatedHours}-${estimatedHours + 1}`

  const cleanerPhotoUrl = booking.cleaners?.photo_url
  const cleanerPhotoHtml = cleanerPhotoUrl ? `
    <div style="text-align: left; margin: 0 0 24px 0;">
      <img src="${cleanerPhotoUrl}" alt="${cleanerFirst}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #eee;" />
      <p style="color: #666; font-size: 14px; margin: 8px 0 0 0;">Your cleaner: <strong>${cleanerFirst}</strong></p>
    </div>
  ` : ''

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Your cleaning is confirmed!</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${clientName}, thank you for giving us the opportunity to be your cleaning service provider. Here's everything you need to know.</p>

    ${cleanerPhotoHtml}

    ${infoTable(`
      ${infoRow('Date', date)}
      ${infoRow('Time', startTime)}
      ${infoRow('Address', booking.clients?.address || 'On file')}
      ${infoRow('Service', booking.service_type)}
      ${infoRow('Cleaner', cleanerName)}
      ${isRecurring ? infoRow('Schedule', booking.recurring_type) : ''}
      ${infoRow('Estimate', `${estimatedRange} hrs × $${hourlyRate}/hr`)}
    `)}

    ${divider()}

    <h2 style="font-size: 18px; font-weight: 600; color: #000; margin: 0 0 16px 0;">What to expect</h2>
    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
      ${cleanerFirst} is usually right on time, but we allow up to 30 minutes for traffic and delays. Once ${cleanerFirst} arrives, they'll provide a thorough, quality service. If you forgot to mention something, just let ${cleanerFirst} know — that's the best part about our hourly pricing model.
    </p>

    ${divider()}

    <h2 style="font-size: 18px; font-weight: 600; color: #000; margin: 0 0 16px 0;">Payment</h2>
    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 0 0 8px 0;">
      About 15 minutes before wrapping up, we'll reach out to collect payment via <strong>Zelle (hi@thenycmaid.com) or Apple Pay</strong>. Our team is not allowed to leave until payment has been processed. Please note that time is billed until the cleaner leaves/payment is confirmed.
    </p>

    ${divider()}

    <h2 style="font-size: 18px; font-weight: 600; color: #000; margin: 0 0 16px 0;">Tips for preparing your home</h2>
    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 0;">
      • Clear countertops and surfaces so your cleaner can get to them<br>
      • Pick up clothes and personal items from floors<br>
      • If you have pets, please let us know — secure them if they're anxious around strangers<br>
      • Make sure building/door access is arranged (doorman notified, keys ready, codes shared in your notes)
    </p>

    ${divider()}

    ${hourlyRate === 49 ? noteBox('<strong>Supplies needed:</strong> Please have cleaning supplies ready — all-purpose cleaner, vacuum, mop, cloths, and trash bags.', 'warning') : noteBox('<strong>All supplies included!</strong> ' + cleanerFirst + ' will bring everything needed — no need to prepare anything.', 'success')}

    ${noteBox(`<strong>Tipping:</strong> Tips are always appreciated but never required. 100% of all tips included with Apple Pay and Zelle (hi@thenycmaid.com) go directly to your cleaner.`, 'info')}

    ${noteBox(`<strong>Cancellation &amp; Reschedule Policy:</strong> ${isRecurring
      ? 'Recurring (weekly, bi-weekly, monthly) services require <strong>7 days notice</strong> to reschedule. Cancellations are not permitted on recurring services unless the service is being discontinued entirely with 7 days notice.'
      : 'First-time and one-time services <strong>cannot be cancelled or rescheduled</strong>.'
    } We do not collect payment upfront — we hold your spot on our busy schedule, turning away other clients. Late cancellations and no-shows directly affect our team members who depend on this income.`, 'warning')}

    ${booking.clients?.pin ? `
    ${divider()}
    <h2 style="font-size: 18px; font-weight: 600; color: #000; margin: 0 0 16px 0;">Your Client Portal</h2>
    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 0 0 8px 0;">
      View your bookings, update notes, and manage your account anytime:
    </p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 12px 0;">
      <p style="margin: 4px 0; color: #333; font-size: 14px;"><strong>Login:</strong> <a href="https://www.thenycmaid.com/book" style="color: #000;">thenycmaid.com/book</a></p>
      <p style="margin: 4px 0; color: #333; font-size: 14px;"><strong>Email:</strong> ${booking.clients.email}</p>
      <p style="margin: 4px 0; color: #333; font-size: 14px;"><strong>PIN:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; letter-spacing: 2px;">${booking.clients.pin}</span></p>
    </div>
    ` : ''}

    ${primaryButton('View Your Portal', 'https://www.thenycmaid.com/book')}

    <p style="color: #666; font-size: 14px; margin: 16px 0 0 0;">
      You can update your notes and view upcoming bookings anytime at <a href="https://www.thenycmaid.com/book" style="color: #000; font-weight: 500;">thenycmaid.com/book</a>
    </p>

    <p style="color: #666; font-size: 14px; margin: 16px 0 0 0;">
      Day-of questions? Text or call <a href="tel:6464900130" style="color: #000;">(646) 490-0130</a>
    </p>
  `

  return { subject: `Cleaning Confirmed – ${date}`, html: emailWrapper(content) }
}

export function clientReminderEmail(booking: any, daysOut: string) {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const startTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const cleanerName = booking.cleaners?.name || 'Your cleaner'
  const clientName = booking.clients?.name?.split(' ')[0] || 'there'
  const isRecurring = booking.recurring_type ? true : false

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Reminder: Cleaning ${daysOut}</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${clientName}, just a friendly reminder.</p>

    ${infoTable(`
      ${infoRow('Date', date)}
      ${infoRow('Time', startTime)}
      ${infoRow('Cleaner', cleanerName)}
    `)}

    ${primaryButton('View Details', 'https://www.thenycmaid.com/book')}

    ${noteBox(`<strong>Reminder:</strong> ${isRecurring
      ? 'Recurring services require <strong>7 days notice</strong> to reschedule. Cancellations are not permitted unless discontinuing the service entirely with 7 days notice.'
      : 'First-time and one-time services <strong>cannot be cancelled or rescheduled</strong>.'
    } We hold your spot without taking payment upfront, turning away other clients. Late changes directly affect our team members who depend on this income.`, 'warning')}

    <p style="color: #666; font-size: 14px; margin: 24px 0 0 0;">
      Questions? <a href="tel:6464900130" style="color: #000;">(646) 490-0130</a>
    </p>
  `

  return { subject: `Reminder: Cleaning ${daysOut}`, html: emailWrapper(content) }
}

export function clientCancellationEmail(booking: any) {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const clientName = booking.clients?.name?.split(' ')[0] || 'there'

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Appointment cancelled</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${clientName}, your cleaning has been cancelled.</p>

    ${infoTable(`
      ${infoRow('Date', date)}
      ${infoRow('Service', booking.service_type)}
    `)}

    ${primaryButton('Book Again', 'https://www.thenycmaid.com/book')}

    <p style="color: #666; font-size: 14px; margin: 24px 0 0 0;">
      Questions? <a href="tel:6464900130" style="color: #000;">(646) 490-0130</a>
    </p>
  `

  return { subject: `Cancelled – ${date}`, html: emailWrapper(content) }
}

export function clientThankYouEmail(clientName: string) {
  const firstName = clientName?.split(' ')[0] || 'there'

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Thank you — we truly appreciate you!</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${firstName},</p>

    <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
      Thank you for giving us the opportunity to be your cleaning service provider. We hope you loved your experience and we look forward to keeping your space spotless!
    </p>

    <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #166534;">🎉 10% off all future services!</p>
      <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.5;">
        As a valued client, you automatically get <strong>10% off</strong> every future booking (excludes $59/hr self-supply option). No code needed — it's applied automatically.
      </p>
    </div>

    <div style="background: #f0f7ff; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e40af;">💰 Earn free cleanings & cash!</p>
      <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.5;">
        Our referral rewards program is one of our most popular features. Many clients get <strong>free cleanings and cash in their pockets</strong> just by referring someone one time!
      </p>
    </div>

    ${primaryButton('Learn About Referral Rewards', 'https://www.thenycmaid.com/get-paid-for-cleaning-referrals-every-time-they-are-serviced')}

    ${divider()}

    <p style="color: #333; font-size: 15px; margin: 0 0 16px 0; font-weight: 600;">Ready to book again?</p>

    ${primaryButton('Visit Your Portal', 'https://www.thenycmaid.com/book')}

    <p style="color: #666; font-size: 14px; margin: 24px 0 0 0;">
      Questions? <a href="tel:6464900130" style="color: #000;">(646) 490-0130</a>
    </p>
  `

  return { subject: `Thank you — we appreciate you!`, html: emailWrapper(content) }
}

export function clientPaymentDueEmail(booking: any, amount: string) {
  const clientName = booking.clients?.name?.split(' ')[0] || 'there'
  const cleanerName = booking.cleaners?.name?.split(' ')[0] || 'Your cleaner'

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Time to wrap up — payment due</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${clientName}, ${cleanerName} is finishing up your cleaning.</p>

    <div style="background: #f0f7ff; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: left;">
      <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">Amount due</p>
      <p style="margin: 0; font-size: 36px; font-weight: 700; color: #1e40af;">$${amount}</p>
    </div>

    <h2 style="font-size: 18px; font-weight: 600; color: #000; margin: 0 0 16px 0;">Payment methods</h2>

    ${infoTable(`
      ${infoRow('Zelle', '<a href="mailto:hi@thenycmaid.com" style="color: #0066cc;">hi@thenycmaid.com</a>')}
      ${infoRow('Apple Pay', '<a href="tel:2120292200" style="color: #0066cc;">(212) 029-2200</a>')}
    `)}

    ${noteBox('<strong>Important:</strong> Our team cannot leave until payment has been processed. Thank you for your prompt payment!', 'warning')}

    ${noteBox('<strong>Tipping:</strong> Tips are always appreciated but never required. 100% of all tips go directly to your cleaner.', 'info')}

    <p style="color: #666; font-size: 14px; margin: 24px 0 0 0;">
      Questions? <a href="tel:6464900130" style="color: #000;">(646) 490-0130</a>
    </p>
  `

  return { subject: `Payment Due — $${amount}`, html: emailWrapper(content) }
}

// ============================================
// CLEANER EMAILS (BILINGUAL)
// ============================================

export function cleanerAssignmentEmail(booking: any) {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const dateES = new Date(booking.start_time).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const startTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const address = booking.clients?.address || 'TBD'
  const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(address)}`
  const hourlyRate = booking.hourly_rate || 75
  const firstName = booking.cleaners?.name?.split(' ')[0] || ''
  
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0;">New job assigned</h1>
    <p style="color: #666; font-size: 14px; margin: 4px 0 24px 0;">Nueva limpieza asignada</p>
    
    <p style="color: #444; font-size: 15px; margin: 0 0 24px 0;">Hi ${firstName} / Hola ${firstName}</p>

    ${infoTable(`
      ${infoRow('Date / Fecha', `${date}<br><span style="color:#666;font-size:12px">${dateES}</span>`)}
      ${infoRow('Time / Hora', startTime)}
      ${infoRow('Client / Cliente', booking.clients?.name || 'TBD')}
      ${infoRow('Service / Servicio', booking.service_type)}
    `)}

    <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Address / Dirección</p>
      <p style="margin: 0 0 12px 0; font-size: 15px; color: #000;">${address}</p>
      <a href="${mapsLink}" style="color: #0066cc; font-size: 14px;">Open in Maps / Abrir en Mapas →</a>
    </div>

    ${hourlyRate === 49 
      ? noteBox('<strong>⚠️ Client supplies</strong> – Do NOT bring your own.<br><span style="font-size:12px">El cliente proporciona suministros – NO traigas los tuyos.</span>', 'warning')
      : noteBox('<strong>✓ Bring all supplies</strong><br><span style="font-size:12px">Trae todos los suministros y equipos.</span>', 'success')
    }

    ${booking.notes ? noteBox(`<strong>Notes / Notas:</strong> ${booking.notes}`, 'warning') : ''}

    ${primaryButton('Open Team Portal / Abrir Portal', 'https://www.thenycmaid.com/team')}

    <p style="color: #666; font-size: 14px; text-align: left; margin: 24px 0 0 0;">
      Office / Oficina: <a href="tel:6464900130" style="color: #000;">(646) 490-0130</a>
    </p>
  `

  return { subject: `New Job / Nuevo Trabajo – ${date}`, html: emailWrapper(content) }
}

export function cleanerDailySummaryEmail(cleanerName: string, bookings: any[]) {
  const firstName = cleanerName.split(' ')[0]

  // Group bookings by date
  const byDate = new Map<string, any[]>()
  for (const b of bookings) {
    const dateKey = new Date(b.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    if (!byDate.has(dateKey)) byDate.set(dateKey, [])
    byDate.get(dateKey)!.push(b)
  }

  let jobsList = ''
  for (const [dateEN, dayBookings] of byDate) {
    const dateES = new Date(dayBookings[0].start_time).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    jobsList += `<p style="color: #000; font-size: 16px; margin: 24px 0 4px 0;"><strong>${dateEN}</strong></p>`
    jobsList += `<p style="color: #666; font-size: 13px; margin: 0 0 8px 0;">${dateES}</p>`
    for (const b of dayBookings) {
      const startTime = new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      const address = b.clients?.address || 'TBD'
      const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(address)}`
      const hourlyRate = b.hourly_rate || 75
      jobsList += `
        <div style="border: 1px solid #eee; border-radius: 8px; padding: 16px; margin: 8px 0;">
          <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #000;">${startTime} – ${b.clients?.name || 'Client'}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px;"><a href="${mapsLink}" style="color: #0066cc;">${address}</a></p>
          <span style="display: inline-block; background: ${hourlyRate === 49 ? '#fffbeb' : '#f0fdf4'}; color: ${hourlyRate === 49 ? '#92400e' : '#166534'}; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
            ${hourlyRate === 49 ? '📦 Client supplies / Suministros del cliente' : '🧴 Bring supplies / Trae suministros'}
          </span>
          ${b.notes ? `<p style="margin: 12px 0 0 0; padding: 10px; background: #fffbeb; border-radius: 4px; color: #92400e; font-size: 13px;">${b.notes}</p>` : ''}
        </div>
      `
    }
  }

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0;">Your next 3 days</h1>
    <p style="color: #666; font-size: 14px; margin: 4px 0 0 0;">Tus pr&#243;ximos 3 d&#237;as</p>

    <p style="color: #444; font-size: 15px; margin: 16px 0 0 0;">Hi ${firstName} — ${bookings.length} job${bookings.length === 1 ? '' : 's'} coming up / Hola ${firstName} — ${bookings.length} trabajo${bookings.length === 1 ? '' : 's'}</p>

    ${jobsList}

    ${primaryButton('Open Team Portal / Abrir Portal', 'https://www.thenycmaid.com/team')}

    <p style="color: #666; font-size: 14px; text-align: left; margin: 24px 0 0 0;">
      Office / Oficina: <a href="tel:6464900130" style="color: #000;">(646) 490-0130</a>
    </p>
  `

  return { subject: `Next 3 Days / Próximos 3 Días – ${bookings.length} job${bookings.length === 1 ? '' : 's'}`, html: emailWrapper(content) }
}

export function cleanerCancellationEmail(booking: any) {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const dateES = new Date(booking.start_time).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const firstName = booking.cleaners?.name?.split(' ')[0] || ''
  
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0;">Job cancelled</h1>
    <p style="color: #666; font-size: 14px; margin: 4px 0 24px 0;">Trabajo cancelado</p>
    
    <p style="color: #444; font-size: 15px; margin: 0 0 24px 0;">Hi ${firstName} / Hola ${firstName}</p>

    ${infoTable(`
      ${infoRow('Date / Fecha', `${date}<br><span style="color:#666;font-size:12px">${dateES}</span>`)}
      ${infoRow('Time / Hora', time)}
      ${infoRow('Client / Cliente', booking.clients?.name || 'N/A')}
    `)}

    ${primaryButton('View Schedule / Ver Horario', 'https://www.thenycmaid.com/team')}

    <p style="color: #666; font-size: 14px; text-align: left; margin: 24px 0 0 0;">
      Office / Oficina: <a href="tel:6464900130" style="color: #000;">(646) 490-0130</a>
    </p>
  `

  return { subject: `Cancelled / Cancelado – ${date}`, html: emailWrapper(content) }
}

// ============================================
// REFERRAL EMAILS
// ============================================

export function referralWelcomeEmail(referrer: { name: string; ref_code: string; preferred_payout: string }) {
  const firstName = referrer.name.split(' ')[0]
  const referralLink = `https://www.thenycmaid.com/book?ref=${referrer.ref_code}`
  
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Welcome to the team, ${firstName}!</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">You're now part of The NYC Maid referral program.</p>

    <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: left;">
      <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Your referral code</p>
      <p style="margin: 0; font-size: 32px; font-weight: 700; color: #000; letter-spacing: 2px;">${referrer.ref_code}</p>
    </div>

    <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #166534; font-weight: 600;">How you earn</p>
      <p style="margin: 0; color: #166534; font-size: 14px;">
        <strong>10% commission</strong> on every booking from your referrals.<br>
        Paid weekly via ${referrer.preferred_payout === 'apple_cash' ? 'Apple Cash' : 'Zelle'}.
      </p>
    </div>

    <p style="color: #444; font-size: 14px; margin: 24px 0;">Your personal link:</p>
    <div style="background: #f5f5f5; border-radius: 8px; padding: 12px 16px; margin: 0 0 24px 0;">
      <a href="${referralLink}" style="color: #0066cc; font-size: 14px; word-break: break-all;">${referralLink}</a>
    </div>

    ${primaryButton('View Your Dashboard', `https://www.thenycmaid.com/referral-dashboard?code=${referrer.ref_code}`)}

    <p style="color: #666; font-size: 14px; margin: 24px 0 0 0;">
      Questions? Just reply to this email.
    </p>
  `

  return { subject: `Welcome to The NYC Maid, ${firstName}!`, html: emailWrapper(content) }
}

export function referralCommissionEmail(referrer: any, booking: any, commission: number) {
  const commissionDollars = (commission / 100).toFixed(2)
  const bookingTotal = ((booking.price || 0) / 100).toFixed(2)
  const pendingBalance = ((referrer.total_earned - referrer.total_paid + commission) / 100).toFixed(2)
  const firstName = referrer.name?.split(' ')[0] || 'there'
  
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">You earned $${commissionDollars}!</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Nice work, ${firstName}. Your referral just completed a cleaning.</p>

    ${infoTable(`
      ${infoRow('Service total', `$${bookingTotal}`)}
      ${infoRow('Your commission', `<span style="color:#166534;font-weight:600">$${commissionDollars}</span>`)}
      ${infoRow('Pending balance', `$${pendingBalance}`)}
    `)}

    ${primaryButton('View Dashboard', `https://www.thenycmaid.com/referral-dashboard?code=${referrer.ref_code}`)}

    <p style="color: #666; font-size: 14px; text-align: left; margin: 24px 0 0 0;">
      Keep sharing: <strong>thenycmaid.com/book?ref=${referrer.ref_code}</strong>
    </p>
  `

  return { subject: `You earned $${commissionDollars}!`, html: emailWrapper(content) }
}

// ============================================
// ADMIN EMAILS
// ============================================

export function newReferrerAdminEmail(referrer: { name: string; email: string; phone?: string; ref_code: string; preferred_payout: string; zelle_email?: string }) {
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 24px 0;">New referrer signed up</h1>

    ${infoTable(`
      ${infoRow('Name', referrer.name)}
      ${infoRow('Email', referrer.email)}
      ${infoRow('Phone', referrer.phone || 'Not provided')}
      ${infoRow('Code', `<code style="background:#f5f5f5;padding:4px 8px;border-radius:4px;">${referrer.ref_code}</code>`)}
      ${infoRow('Payout', `${referrer.preferred_payout === 'apple_cash' ? 'Apple Cash' : 'Zelle'} – ${referrer.zelle_email || referrer.email}`)}
    `)}

    ${primaryButton('View Referrals', 'https://www.thenycmaid.com/admin/referrals')}
  `

  return { subject: `New Referrer: ${referrer.name}`, html: emailWrapper(content) }
}

export function newBookingAdminEmail(booking: any) {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 24px 0;">New booking</h1>

    ${infoTable(`
      ${infoRow('Client', booking.clients?.name || 'Unknown')}
      ${infoRow('Date', `${date} at ${time}`)}
      ${infoRow('Service', booking.service_type)}
      ${infoRow('Address', booking.clients?.address || 'On file')}
      ${infoRow('Cleaner', booking.cleaners?.name || 'Unassigned')}
      ${booking.ref_code ? infoRow('Referral', booking.ref_code) : ''}
    `)}

    ${primaryButton('View Booking', 'https://www.thenycmaid.com/admin/bookings')}
  `

  return { subject: `New Booking: ${booking.clients?.name || 'Unknown'}`, html: emailWrapper(content) }
}

export function backupEmail(clientCount: number, bookingCount: number) {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 24px 0;">Daily backup complete</h1>

    ${infoTable(`
      ${infoRow('Date', date)}
      ${infoRow('Clients', clientCount.toString())}
      ${infoRow('Bookings', bookingCount.toString())}
    `)}

    <p style="color: #666; font-size: 14px; margin: 24px 0 0 0;">Files attached: clients.csv, bookings.csv</p>
  `

  return { subject: `Backup – ${date}`, html: emailWrapper(content) }
}

export function cleanerWelcomeEmail(cleaner: { name: string; pin: string; phone: string }) {
  const firstName = cleaner.name.split(' ')[0]

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0;">Welcome to The NYC Maid!</h1>
    <p style="color: #666; font-size: 14px; margin: 4px 0 24px 0;">¡Bienvenido/a a The NYC Maid!</p>

    <p style="color: #444; font-size: 15px; margin: 0 0 24px 0;">Hi ${firstName} / Hola ${firstName}</p>

    <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: left;">
      <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Your PIN / Tu PIN</p>
      <p style="margin: 0; font-size: 36px; font-weight: 700; color: #000; letter-spacing: 6px;">${cleaner.pin}</p>
      <p style="margin: 12px 0 0 0; color: #999; font-size: 12px;">Last 4 digits of your phone / Últimos 4 dígitos de tu teléfono</p>
    </div>

    ${primaryButton('Open Team Portal / Abrir Portal', 'https://www.thenycmaid.com/team')}

    <!-- SPANISH GUIDE -->
    <div style="background: #fff8e6; border: 1px solid #f0e6cc; border-radius: 8px; padding: 20px; margin: 32px 0; text-align: left;">
      <h2 style="font-size: 18px; color: #000; margin: 0 0 16px 0;">📱 Guía del Portal de Equipo</h2>

      <h3 style="font-size: 14px; color: #333; margin: 16px 0 8px 0;">🔗 TU PORTAL</h3>
      <p style="font-size: 13px; color: #555; margin: 0;">Ve a: <strong>thenycmaid.com/team</strong><br>Ingresa tu número de teléfono para ver tus trabajos.</p>

      <h3 style="font-size: 14px; color: #333; margin: 16px 0 8px 0;">📲 GUARDAR EN TU TELÉFONO</h3>
      <p style="font-size: 13px; color: #555; margin: 0 0 8px 0;"><strong>iPhone:</strong> Abre thenycmaid.com/team en Safari → Toca compartir (↑) → "Añadir a pantalla de inicio"</p>
      <p style="font-size: 13px; color: #555; margin: 0;"><strong>Android:</strong> Abre en Chrome → Toca ⋮ → "Añadir a pantalla de inicio"</p>

      <h3 style="font-size: 14px; color: #333; margin: 16px 0 8px 0;">📧 CORREOS QUE RECIBIRÁS</h3>
      <p style="font-size: 13px; color: #555; margin: 0;">• <strong>Nuevo trabajo</strong> - cuando te asignamos un cliente<br>• <strong>Recordatorio</strong> - el día antes del trabajo<br>• <strong>Cambios</strong> - si el horario cambia</p>

      <h3 style="font-size: 14px; color: #d32f2f; margin: 16px 0 8px 0;">⏰ CHECK-IN Y CHECK-OUT - MUY IMPORTANTE</h3>
      <p style="font-size: 13px; color: #555; margin: 0 0 8px 0;">Cuando <strong>llegas</strong> al trabajo → Abre tu portal → Toca <strong>"Check In"</strong><br>Cuando <strong>terminas</strong> → Toca <strong>"Check Out"</strong></p>
      <p style="font-size: 13px; color: #555; margin: 0;"><strong>¿Por qué es importante?</strong><br>✅ Calcula tus horas automáticamente<br>✅ Calcula tu pago correctamente<br>✅ El cliente sabe que llegaste<br>✅ <strong>Sin check-in/out no podemos calcular tu pago</strong></p>

      <h3 style="font-size: 14px; color: #333; margin: 16px 0 8px 0;">💰 TU PAGO</h3>
      <p style="font-size: 13px; color: #555; margin: 0;">Pagamos por hora (redondeado a media hora).<br>Ejemplo: 2h 15min = pago por 2.5 horas<br>Puedes ver tus ganancias en el portal.</p>

      <h3 style="font-size: 14px; color: #333; margin: 16px 0 8px 0;">❓ PREGUNTAS</h3>
      <p style="font-size: 13px; color: #555; margin: 0;">Llama o escribe: <strong>(646) 490-0130</strong></p>
    </div>

    <p style="color: #666; font-size: 14px; text-align: left; margin: 24px 0 0 0;">
      Office / Oficina: <a href="tel:6464900130" style="color: #000;">(646) 490-0130</a>
    </p>
  `

  return { subject: `Welcome / Bienvenido! Your PIN / Tu PIN: ${cleaner.pin}`, html: emailWrapper(content) }
}

// ============================================
// VERIFICATION CODE EMAIL
// ============================================

export function verificationCodeEmail(code: string, clientName?: string) {
  const firstName = clientName?.split(' ')[0] || 'there'

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Your verification code</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${firstName}, use this code to access your account.</p>

    <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: left;">
      <p style="margin: 0; font-size: 36px; font-weight: 700; color: #000; letter-spacing: 8px;">${code}</p>
    </div>

    <p style="color: #666; font-size: 14px; text-align: left;">This code expires in 10 minutes.</p>

    <p style="color: #999; font-size: 13px; margin: 24px 0 0 0;">
      If you didn't request this code, you can safely ignore this email.
    </p>
  `

  return { subject: `Your verification code: ${code}`, html: emailWrapper(content) }
}

// ============================================
// ADMIN NOTIFICATION EMAILS
// ============================================

export function adminNewClientEmail(client: { name: string; phone?: string; email?: string; address?: string; notes?: string; referral_info?: string; referrer_matched?: boolean }) {
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 24px 0;">New client added</h1>

    ${infoTable(`
      ${infoRow('Name', client.name)}
      ${client.phone ? infoRow('Phone', client.phone) : ''}
      ${client.email ? infoRow('Email', client.email) : ''}
      ${client.address ? infoRow('Address', client.address) : ''}
      ${client.referral_info ? infoRow('Referred by', client.referral_info + (client.referrer_matched ? ' (matched)' : ' (unmatched)')) : ''}
      ${client.notes ? infoRow('Notes', client.notes) : ''}
    `)}

    ${primaryButton('View Clients', 'https://www.thenycmaid.com/admin/clients')}
  `

  return { subject: `New Client: ${client.name}`, html: emailWrapper(content) }
}

export function adminNewBookingRequestEmail(booking: any, details: { time?: string; ref_code?: string; referred_by?: string }) {
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 24px 0;">New booking request</h1>

    ${infoTable(`
      ${infoRow('Client', booking.clients?.name || 'Unknown')}
      ${infoRow('Email', booking.clients?.email || '-')}
      ${infoRow('Phone', booking.clients?.phone || '-')}
      ${infoRow('Address', booking.clients?.address || '-')}
      ${infoRow('Date', date)}
      ${details.time ? infoRow('Time', details.time) : ''}
      ${infoRow('Service', booking.service_type)}
      ${infoRow('Rate', '$' + booking.hourly_rate + '/hr')}
      ${details.ref_code ? infoRow('Referral Code', details.ref_code) : ''}
      ${details.referred_by ? infoRow('Referred By', details.referred_by) : ''}
    `)}

    ${primaryButton('Review & Assign Cleaner', 'https://www.thenycmaid.com/admin/bookings')}
  `

  return { subject: `New Booking Request: ${booking.clients?.name || 'Unknown'}`, html: emailWrapper(content) }
}

export function adminDailyNotificationDigestEmail(data: {
  date: string
  emails: { client: string; type: string; time: string }[]
  texts: { client: string; type: string; time: string }[]
}) {
  const emailRows = data.emails.length > 0
    ? data.emails.map(e => infoRow(e.type, `${e.client} · ${e.time}`)).join('')
    : '<tr><td style="padding: 8px 0; color: #999; font-size: 14px;" colspan="2">No emails sent today</td></tr>'

  const smsRows = data.texts.length > 0
    ? data.texts.map(t => infoRow(t.type, `${t.client} · ${t.time}`)).join('')
    : '<tr><td style="padding: 8px 0; color: #999; font-size: 14px;" colspan="2">No texts sent today</td></tr>'

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Daily Notification Digest</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">${data.date} — ${data.emails.length} email${data.emails.length !== 1 ? 's' : ''}, ${data.texts.length} text${data.texts.length !== 1 ? 's' : ''} sent to clients today.</p>

    <h2 style="font-size: 18px; font-weight: 600; color: #000; margin: 24px 0 8px 0;">Emails (${data.emails.length})</h2>
    ${infoTable(emailRows)}

    ${divider()}

    <h2 style="font-size: 18px; font-weight: 600; color: #000; margin: 24px 0 8px 0;">Texts (${data.texts.length})</h2>
    ${infoTable(smsRows)}

    ${primaryButton('View Dashboard', 'https://www.thenycmaid.com/admin/bookings')}
  `

  return {
    subject: `Daily Digest: ${data.emails.length} emails, ${data.texts.length} texts sent — ${data.date}`,
    html: emailWrapper(content)
  }
}

export function adminPendingRemindersEmail(pendingBookings: { client_name: string; date: string; service_type: string }[]) {
  const rows = pendingBookings.map(b => infoRow(b.client_name, `${b.date} · ${b.service_type}`)).join('')

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #dc2626; margin: 0 0 8px 0;">Pending Bookings Need Attention</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">${pendingBookings.length} booking${pendingBookings.length !== 1 ? 's are' : ' is'} still pending and not yet scheduled or assigned.</p>

    ${infoTable(rows)}

    ${primaryButton('Review Pending Bookings', 'https://www.thenycmaid.com/admin/bookings')}
  `

  return { subject: `⚠️ ${pendingBookings.length} Pending Booking${pendingBookings.length !== 1 ? 's' : ''} Need Attention`, html: emailWrapper(content) }
}

export interface DailyOpsJob {
  clientName: string
  cleanerName: string
  time: string
  serviceType: string
  revenue: number       // price in cents
  laborCost: number     // cleaner_pay in cents
  paymentStatus: string
  paymentMethod: string | null
  remindersEmailed: boolean
  remindersSmsed: boolean
  recurring: string | null
}

export function adminDailyOpsRecapEmail(data: {
  todayDate: string
  tomorrowDate: string
  todayJobs: DailyOpsJob[]
  tomorrowJobs: DailyOpsJob[]
  todayRevenue: number
  todayLabor: number
  todayProfit: number
  tomorrowRevenue: number
  tomorrowLabor: number
  tomorrowProfit: number
  todayPaid: number
  todayUnpaid: number
}) {
  const fmt = (cents: number) => '$' + (cents / 100).toFixed(0)
  const pctColor = (n: number) => n > 0 ? '#16a34a' : '#dc2626'

  const jobRow = (j: DailyOpsJob, showReminders: boolean) => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px 8px; font-size: 14px; color: #000; font-weight: 500;">${j.clientName}</td>
      <td style="padding: 10px 8px; font-size: 14px; color: #666;">${j.cleanerName}</td>
      <td style="padding: 10px 8px; font-size: 14px; color: #666;">${j.time}</td>
      <td style="padding: 10px 8px; font-size: 14px; color: #000; text-align: right;">${fmt(j.revenue)}</td>
      <td style="padding: 10px 8px; font-size: 14px; color: #666; text-align: right;">${fmt(j.laborCost)}</td>
      <td style="padding: 10px 8px; font-size: 14px; color: ${j.paymentStatus === 'paid' ? '#16a34a' : '#dc2626'}; text-align: center;">${j.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}${j.paymentMethod ? ' (' + j.paymentMethod + ')' : ''}</td>
      ${showReminders ? `<td style="padding: 10px 8px; font-size: 14px; text-align: center;">${j.remindersEmailed ? '\u2709\uFE0F' : '\u2717'} ${j.remindersSmsed ? '\uD83D\uDCF1' : '\u2717'}</td>` : ''}
    </tr>`

  const tableHeader = (showReminders: boolean) => `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="border-bottom: 2px solid #000;">
          <th style="padding: 8px; font-size: 13px; color: #666; text-align: left; font-weight: 600;">Client</th>
          <th style="padding: 8px; font-size: 13px; color: #666; text-align: left; font-weight: 600;">Cleaner</th>
          <th style="padding: 8px; font-size: 13px; color: #666; text-align: left; font-weight: 600;">Time</th>
          <th style="padding: 8px; font-size: 13px; color: #666; text-align: right; font-weight: 600;">Revenue</th>
          <th style="padding: 8px; font-size: 13px; color: #666; text-align: right; font-weight: 600;">Labor</th>
          <th style="padding: 8px; font-size: 13px; color: #666; text-align: center; font-weight: 600;">Payment</th>
          ${showReminders ? '<th style="padding: 8px; font-size: 13px; color: #666; text-align: center; font-weight: 600;">Reminders</th>' : ''}
        </tr>
      </thead>
      <tbody>`

  const tableFooter = () => `</tbody></table>`

  const summaryBlock = (label: string, revenue: number, labor: number, profit: number) => `
    <table style="width: 100%; margin: 8px 0 24px 0;">
      <tr>
        <td style="padding: 6px 12px; background: #f9fafb; border-radius: 6px; font-size: 14px;">
          <strong>${label}:</strong>
          Revenue <strong>${fmt(revenue)}</strong> &nbsp;·&nbsp;
          Labor <strong>${fmt(labor)}</strong> &nbsp;·&nbsp;
          Profit <strong style="color: ${pctColor(profit)}">${fmt(profit)}</strong>
          ${revenue > 0 ? ` (${Math.round((profit / revenue) * 100)}% margin)` : ''}
        </td>
      </tr>
    </table>`

  const todaySection = data.todayJobs.length > 0
    ? `${tableHeader(false)}${data.todayJobs.map(j => jobRow(j, false)).join('')}${tableFooter()}
       ${summaryBlock('Today', data.todayRevenue, data.todayLabor, data.todayProfit)}
       <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">${data.todayPaid} paid · ${data.todayUnpaid} unpaid</p>`
    : '<p style="color: #999; font-size: 14px;">No jobs today</p>'

  const tomorrowSection = data.tomorrowJobs.length > 0
    ? `${tableHeader(true)}${data.tomorrowJobs.map(j => jobRow(j, true)).join('')}${tableFooter()}
       ${summaryBlock('Tomorrow', data.tomorrowRevenue, data.tomorrowLabor, data.tomorrowProfit)}`
    : '<p style="color: #999; font-size: 14px;">No jobs scheduled for tomorrow</p>'

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Daily Ops Recap</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">${data.todayDate}</p>

    <h2 style="font-size: 18px; font-weight: 600; color: #000; margin: 24px 0 8px 0;">Today — ${data.todayJobs.length} Job${data.todayJobs.length !== 1 ? 's' : ''}</h2>
    ${todaySection}

    ${divider()}

    <h2 style="font-size: 18px; font-weight: 600; color: #000; margin: 24px 0 8px 0;">Tomorrow — ${data.tomorrowJobs.length} Job${data.tomorrowJobs.length !== 1 ? 's' : ''}</h2>
    ${tomorrowSection}

    ${primaryButton('Open Dashboard', 'https://www.thenycmaid.com/admin/bookings')}
  `

  return {
    subject: `Daily Recap: ${data.todayJobs.length} today ($${(data.todayRevenue / 100).toFixed(0)}), ${data.tomorrowJobs.length} tomorrow — ${data.todayDate}`,
    html: emailWrapper(content)
  }
}

export function clientRescheduleEmail(booking: any, oldDate: string, oldTime: string) {
  const newDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const newTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const clientName = booking.clients?.name?.split(' ')[0] || 'there'
  const cleanerName = booking.cleaners?.name || 'Your cleaner'

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Your cleaning has been rescheduled</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${clientName}, your appointment has been updated.</p>

    ${infoTable(`
      ${infoRow('New Date', newDate)}
      ${infoRow('New Time', newTime)}
      ${infoRow('Previous', `${oldDate} at ${oldTime}`)}
      ${infoRow('Cleaner', cleanerName)}
      ${infoRow('Service', booking.service_type)}
    `)}

    ${primaryButton('View in Portal', 'https://www.thenycmaid.com/book')}

    <p style="color: #666; font-size: 14px; margin: 24px 0 0 0;">
      Questions? <a href="tel:6464900130" style="color: #000;">(646) 490-0130</a>
    </p>
  `

  return { subject: `Rescheduled: Cleaning on ${newDate}`, html: emailWrapper(content) }
}

export function adminRescheduleEmail(booking: any, oldDate: string, oldTime: string) {
  const newDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const newTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Booking rescheduled by client</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">${booking.clients?.name || 'A client'} has rescheduled their cleaning.</p>

    ${infoTable(`
      ${infoRow('Client', booking.clients?.name || 'Unknown')}
      ${infoRow('New Date', newDate)}
      ${infoRow('New Time', newTime)}
      ${infoRow('Previous', `${oldDate} at ${oldTime}`)}
      ${infoRow('Service', booking.service_type)}
      ${infoRow('Cleaner', booking.cleaners?.name || 'Unassigned')}
    `)}

    ${primaryButton('View Booking', 'https://www.thenycmaid.com/admin/bookings')}
  `

  return { subject: `Rescheduled: ${booking.clients?.name || 'Client'} → ${newDate}`, html: emailWrapper(content) }
}

export function cleanerRescheduleEmail(booking: any, oldDate: string, oldTime: string) {
  const newDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const newDateES = new Date(booking.start_time).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const newTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const firstName = booking.cleaners?.name?.split(' ')[0] || ''
  const address = booking.clients?.address || 'TBD'
  const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(address)}`

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #f59e0b; margin: 0;">Job rescheduled</h1>
    <p style="color: #666; font-size: 14px; margin: 4px 0 24px 0;">Trabajo reprogramado</p>

    <p style="color: #444; font-size: 15px; margin: 0 0 24px 0;">Hi ${firstName} / Hola ${firstName}</p>

    ${noteBox(`<strong>This job has been moved.</strong> Please note the new date and time.<br><span style="font-size:12px">Este trabajo ha sido reprogramado. Por favor, tome nota de la nueva fecha y hora.</span>`, 'warning')}

    ${infoTable(`
      ${infoRow('New Date / Nueva Fecha', `${newDate}<br><span style="color:#666;font-size:12px">${newDateES}</span>`)}
      ${infoRow('New Time / Nueva Hora', newTime)}
      ${infoRow('Previous / Anterior', `${oldDate} at ${oldTime}`)}
      ${infoRow('Client / Cliente', booking.clients?.name || 'TBD')}
      ${infoRow('Service / Servicio', booking.service_type)}
    `)}

    <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Address / Dirección</p>
      <p style="margin: 0 0 12px 0; font-size: 15px; color: #000;">${address}</p>
      <a href="${mapsLink}" style="color: #0066cc; font-size: 14px;">Open in Maps / Abrir en Mapas →</a>
    </div>

    ${primaryButton('Open Team Portal / Abrir Portal', 'https://www.thenycmaid.com/team')}

    <p style="color: #666; font-size: 14px; text-align: left; margin: 24px 0 0 0;">
      Office / Oficina: <a href="tel:6464900130" style="color: #000;">(646) 490-0130</a>
    </p>
  `

  return { subject: `Rescheduled / Reprogramado – ${newDate}`, html: emailWrapper(content) }
}

export function referralSignupNotifyEmail(referrerName: string, bookingDate: string) {
  const firstName = referrerName.split(' ')[0]

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">New referral signup!</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Great news, ${firstName}! Someone signed up using your referral link.</p>

    ${infoTable(`
      ${infoRow('Service Date', bookingDate)}
    `)}

    ${noteBox("We'll notify you when they're serviced and your 10% commission is ready!", 'success')}

    <p style="color: #666; font-size: 14px; margin: 24px 0 0 0;">
      Questions? <a href="tel:6464900130" style="color: #000;">(646) 490-0130</a>
    </p>
  `

  return { subject: `New Signup from Your Referral!`, html: emailWrapper(content) }
}
