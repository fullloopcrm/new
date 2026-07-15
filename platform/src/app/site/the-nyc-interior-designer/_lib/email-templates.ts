// ============================================
// EMAIL TEMPLATES - THE NYC INTERIOR DESIGNER
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
                <span style="font-size: 20px; font-weight: 700; color: #1e293b;">The NYC Interior Designer</span>
              </div>
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 0 0 0; text-align: left;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                The NYC Interior Designer &middot; <a href="tel:9174732013" style="color: #999;">(917) 473-2013</a>
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

export const primaryButton = (text: string, href: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
  <tr>
    <td align="left">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:52px;v-text-anchor:middle;width:240px;" arcsize="15%" fillcolor="#92400e" stroke="f">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">${text}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${href}" style="display: inline-block; background-color: #92400e; color: #ffffff !important; -webkit-text-fill-color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; mso-hide: all;">${text}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>
`

export const infoRow = (label: string, value: string) => `
<tr>
  <td style="padding: 8px 0; color: #666; font-size: 14px; width: 120px; text-align: left;">${label}</td>
  <td style="padding: 8px 0; color: #000; font-size: 14px; font-weight: 500; text-align: left;">${value}</td>
</tr>
`

export const infoTable = (rows: string) => `
<table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
  ${rows}
</table>
`

export const divider = () => `<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />`

export const noteBox = (content: string, type: 'info' | 'warning' | 'success' = 'info') => {
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ============================================
// CLIENT EMAILS
// ============================================

export function leadConfirmationEmail(name: string, service?: string) {
  const firstName = name?.split(' ')[0] || 'there'
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">We received your inquiry!</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${escapeHtml(firstName)}, thank you for reaching out to The NYC Interior Designer. We're reviewing your request and will be in touch within 24 hours.</p>

    ${service ? `
    ${infoTable(infoRow('Service', escapeHtml(service)))}
    ` : ''}

    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 24px 0 0 0;">
      During your free consultation, we'll discuss your vision, assess your space, and provide a detailed proposal with timeline and pricing.
    </p>

    ${noteBox('Have photos of your space? Reply to this email with any images or inspiration boards — it helps us prepare for your consultation.', 'info')}

    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 16px 0 0 0;">
      Questions? Call or text us at <a href="tel:9174732013" style="color: #92400e; font-weight: 500;">(917) 473-2013</a>
    </p>
  `

  return { subject: 'We Received Your Design Inquiry', html: emailWrapper(content) }
}

export function consultationConfirmationEmail(name: string, service?: string) {
  const firstName = name?.split(' ')[0] || 'there'
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Your free consultation is on the way!</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${escapeHtml(firstName)}, thank you for requesting a free consultation with The NYC Interior Designer.</p>

    ${service ? infoTable(infoRow('Design Interest', escapeHtml(service))) : ''}

    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 24px 0 0 0;">
      A member of our design team will reach out to you within 24 hours to schedule your consultation. We'll walk through your space, discuss your goals, and outline next steps.
    </p>

    ${noteBox('Our consultations are completely free with no obligation. We want to make sure we are the right fit for your project.', 'success')}

    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 16px 0 0 0;">
      In the meantime, browse our <a href="https://www.thenycinteriordesigner.com/services" style="color: #92400e; font-weight: 500;">services</a> or check out our <a href="https://www.thenycinteriordesigner.com/pricing" style="color: #92400e; font-weight: 500;">pricing guide</a>.
    </p>
  `

  return { subject: 'Free Consultation Request Received', html: emailWrapper(content) }
}

export function applicantConfirmationEmail(name: string, position: string) {
  const firstName = name?.split(' ')[0] || 'there'
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Application received!</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${escapeHtml(firstName)}, thank you for applying to The NYC Interior Designer.</p>

    ${infoTable(infoRow('Position', escapeHtml(position)))}

    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 24px 0 0 0;">
      Our team reviews every application personally. You'll hear from us within 48 hours regarding next steps.
    </p>

    ${noteBox('While you wait, feel free to explore our <a href="https://www.thenycinteriordesigner.com/services" style="color: #1e40af;">services</a> and <a href="https://www.thenycinteriordesigner.com/blog" style="color: #1e40af;">blog</a> to learn more about our work.', 'info')}
  `

  return { subject: `Application Received — ${escapeHtml(position)}`, html: emailWrapper(content) }
}

// ============================================
// ADMIN NOTIFICATION EMAILS
// ============================================

export function adminNewLeadEmail(lead: any, sourceLabel: string) {
  const rows = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Address', lead.address],
    ['Borough/Area', lead.borough || lead.location],
    ['Service', lead.service || lead.designType],
    ['Property Type', lead.propertyType || lead.project_size],
    ['Budget', lead.budget],
    ['Timeline', lead.timeline],
    ['Message', lead.description || lead.message],
    ['Source', sourceLabel],
  ]
    .filter(([, val]) => val)
    .map(([label, val]) => infoRow(label as string, escapeHtml(String(val))))
    .join('')

  const content = `
    <div style="background: #92400e; margin: -40px -40px 32px -40px; padding: 24px 40px; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">${sourceLabel}</h1>
      <p style="margin: 4px 0 0; color: #fde68a; font-size: 14px;">TheNYCInteriorDesigner.com</p>
    </div>

    ${infoTable(rows)}

    <p style="margin: 20px 0 0; font-size: 13px; color: #94a3b8;">Reply directly to this email to respond to <strong>${escapeHtml(lead.email)}</strong></p>
  `

  return {
    subject: `New Interior Design Lead: ${sourceLabel} — ${lead.name}`,
    html: emailWrapper(content),
  }
}

export function adminNewApplicationEmail(app: any) {
  const rows = [
    ['Name', app.name ? escapeHtml(app.name) : app.name],
    ['Email', app.email ? escapeHtml(app.email) : app.email],
    ['Phone', app.phone ? escapeHtml(app.phone) : app.phone],
    ['Position', app.position ? escapeHtml(app.position) : app.position],
    ['Borough', app.borough ? escapeHtml(app.borough) : app.borough],
    ['Experience', app.experience ? escapeHtml(app.experience) : app.experience],
    ['Portfolio URL', app.portfolioUrl ? escapeHtml(app.portfolioUrl) : app.portfolioUrl],
    ['Portfolio File', app.portfolioFileUrl ? `<a href="${escapeHtml(app.portfolioFileUrl)}" style="color:#92400e;">View Portfolio</a>` : null],
    ['Resume', app.resumeUrl ? `<a href="${escapeHtml(app.resumeUrl)}" style="color:#92400e;">Download Resume</a>` : 'Not uploaded'],
    ['Message', app.message ? escapeHtml(app.message) : app.message],
  ]
    .filter(([, val]) => val)
    .map(([label, val]) => `
      <tr>
        <td style="padding:8px 12px;font-weight:600;color:#334155;vertical-align:top;white-space:nowrap;">${label}</td>
        <td style="padding:8px 12px;color:#475569;">${val}</td>
      </tr>
    `)
    .join('')

  const content = `
    <div style="background: #92400e; margin: -40px -40px 32px -40px; padding: 24px 40px; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">New Job Application: ${escapeHtml(app.position)}</h1>
      <p style="margin: 4px 0 0; color: #fde68a; font-size: 14px;">TheNYCInteriorDesigner.com</p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;">
      ${rows}
    </table>

    <p style="margin: 20px 0 0; font-size: 13px; color: #94a3b8;">Reply to this email to contact <strong>${escapeHtml(app.email)}</strong></p>
  `

  return {
    subject: `New Application: ${app.position} — ${app.name}`,
    html: emailWrapper(content),
  }
}

export function adminNewClientEmail(client: any) {
  const content = `
    <h1 style="font-size: 20px; font-weight: 600; color: #000; margin: 0 0 16px 0;">New Client Added</h1>
    ${infoTable(`
      ${infoRow('Name', escapeHtml(client.name || ''))}
      ${client.email ? infoRow('Email', escapeHtml(client.email)) : ''}
      ${client.phone ? infoRow('Phone', escapeHtml(client.phone)) : ''}
      ${client.address ? infoRow('Address', escapeHtml(client.address)) : ''}
      ${client.source ? infoRow('Source', escapeHtml(client.source)) : ''}
    `)}
  `
  return { subject: `New Client: ${client.name}`, html: emailWrapper(content) }
}

export function adminNewProjectEmail(project: any) {
  const content = `
    <h1 style="font-size: 20px; font-weight: 600; color: #000; margin: 0 0 16px 0;">New Project Created</h1>
    ${infoTable(`
      ${infoRow('Client', escapeHtml(project.client_name || ''))}
      ${project.service_type ? infoRow('Service', escapeHtml(project.service_type)) : ''}
      ${project.designer_name ? infoRow('Designer', escapeHtml(project.designer_name)) : ''}
      ${project.address ? infoRow('Address', escapeHtml(project.address)) : ''}
      ${project.budget ? infoRow('Budget', '$' + Number(project.budget).toLocaleString()) : ''}
      ${infoRow('Status', project.status || 'consultation')}
    `)}
  `
  return { subject: `New Project: ${project.client_name} — ${project.service_type || 'Interior Design'}`, html: emailWrapper(content) }
}

// ============================================
// PROJECT STATUS EMAILS
// ============================================

export function clientProjectConfirmedEmail(project: any) {
  const clientName = project.clients?.name?.split(' ')[0] || 'there'
  const designerName = project.designers?.name || 'your designer'

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Your project is confirmed!</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${escapeHtml(clientName)}, great news — your interior design project has been confirmed.</p>

    ${infoTable(`
      ${project.service_type ? infoRow('Service', escapeHtml(project.service_type)) : ''}
      ${infoRow('Designer', escapeHtml(designerName))}
      ${project.start_date ? infoRow('Start Date', project.start_date) : ''}
      ${project.address ? infoRow('Location', escapeHtml(project.address)) : ''}
      ${infoRow('Status', '<strong style="color: #22c55e;">Confirmed</strong>')}
    `)}

    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 24px 0 0 0;">
      ${escapeHtml(designerName)} will be reaching out to schedule your initial design consultation and walk-through.
    </p>

    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 16px 0 0 0;">
      Questions? Call or text us at <a href="tel:9174732013" style="color: #92400e; font-weight: 500;">(917) 473-2013</a>
    </p>
  `

  return { subject: 'Your Interior Design Project is Confirmed', html: emailWrapper(content) }
}

export function clientThankYouEmail(name: string) {
  const firstName = name?.split(' ')[0] || 'there'
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Thank you for choosing us!</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${escapeHtml(firstName)}, it's been a pleasure working with you.</p>

    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
      We hope you love your newly designed space. If there's anything you'd like to adjust, or if you're thinking about your next project, we're just a call away.
    </p>

    ${noteBox('Loved your experience? A <a href="https://g.page/r/thenycinteriordesigner/review" style="color: #1e40af;">Google review</a> helps other New Yorkers find great design services. We truly appreciate it!', 'success')}

    ${primaryButton('Refer a Friend', 'https://www.thenycinteriordesigner.com/contact')}

    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 16px 0 0 0;">
      Thank you again, ${escapeHtml(firstName)}. We look forward to your next project!
    </p>
  `

  return { subject: 'Thank You for Choosing The NYC Interior Designer', html: emailWrapper(content) }
}

// ============================================
// DESIGNER EMAILS
// ============================================

export function designerAssignmentEmail(project: any) {
  const designerName = project.designers?.name?.split(' ')[0] || 'there'
  const clientName = project.clients?.name || 'Client'

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">New Project Assignment</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${escapeHtml(designerName)}, you've been assigned a new project.</p>

    ${infoTable(`
      ${infoRow('Client', escapeHtml(clientName))}
      ${project.service_type ? infoRow('Service', escapeHtml(project.service_type)) : ''}
      ${project.address ? infoRow('Location', escapeHtml(project.address)) : ''}
      ${project.budget ? infoRow('Budget', '$' + Number(project.budget).toLocaleString()) : ''}
      ${project.start_date ? infoRow('Start Date', project.start_date) : ''}
      ${project.description ? infoRow('Notes', escapeHtml(project.description)) : ''}
    `)}

    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 24px 0 0 0;">
      Please reach out to the client to schedule an initial consultation and walk-through.
    </p>
  `

  return { subject: `New Project: ${clientName} — ${project.service_type || 'Interior Design'}`, html: emailWrapper(content) }
}

export function designerWelcomeEmail(name: string) {
  const firstName = name?.split(' ')[0] || 'there'
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Welcome to the team!</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${escapeHtml(firstName)}, welcome to The NYC Interior Designer.</p>

    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
      We're excited to have you on our team. You'll be working with clients across New York City on residential and commercial interior design projects.
    </p>

    ${noteBox('If you have any questions about getting started, please reach out to our team at <a href="tel:9174732013" style="color: #1e40af;">(917) 473-2013</a>.', 'info')}
  `

  return { subject: 'Welcome to The NYC Interior Designer', html: emailWrapper(content) }
}

// ============================================
// REFERRAL EMAILS
// ============================================

export function referralWelcomeEmail(name: string, refCode: string) {
  const firstName = name?.split(' ')[0] || 'there'
  const referralLink = `https://www.thenycinteriordesigner.com?ref=${refCode}`

  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Welcome to our referral program!</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Hi ${escapeHtml(firstName)}, you're now a referral partner with The NYC Interior Designer.</p>

    ${infoTable(`
      ${infoRow('Your Code', `<strong style="font-family: monospace; background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">${escapeHtml(refCode)}</strong>`)}
      ${infoRow('Your Link', `<a href="${referralLink}" style="color: #92400e;">${referralLink}</a>`)}
      ${infoRow('Commission', '10% per completed project')}
    `)}

    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 24px 0 0 0;">
      Share your link with friends, family, and colleagues. When they complete an interior design project with us, you earn a commission.
    </p>

    ${primaryButton('Share Your Link', referralLink)}

    ${noteBox('Commissions are paid out monthly via your preferred method (Zelle or Apple Cash).', 'info')}
  `

  return { subject: 'Welcome to Our Referral Program', html: emailWrapper(content) }
}

export function referralSignupNotifyEmail(referrerName: string, clientName: string) {
  const content = `
    <h1 style="font-size: 20px; font-weight: 600; color: #000; margin: 0 0 16px 0;">New Referral Signup</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 16px 0;">A new client signed up through a referral link.</p>
    ${infoTable(`
      ${infoRow('Referrer', escapeHtml(referrerName))}
      ${infoRow('New Client', escapeHtml(clientName))}
    `)}
  `
  return { subject: `Referral: ${clientName} via ${referrerName}`, html: emailWrapper(content) }
}

// ============================================
// CAMPAIGN EMAILS
// ============================================

export function campaignEmailWrapper(body: string, unsubscribeUrl: string) {
  return emailWrapper(`
    ${body}
    ${divider()}
    <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
      <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a> from marketing emails
    </p>
  `)
}

// ============================================
// ADMIN DAILY OPS RECAP
// ============================================

export function adminDailyOpsRecapEmail(data: {
  newLeads: number
  activeProjects: number
  completedToday: number
  revenue: number
  pendingProposals: number
}) {
  const content = `
    <h1 style="font-size: 20px; font-weight: 600; color: #000; margin: 0 0 16px 0;">Daily Operations Recap</h1>
    <p style="color: #666; font-size: 14px; margin: 0 0 24px 0;">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>

    ${infoTable(`
      ${infoRow('New Leads Today', String(data.newLeads))}
      ${infoRow('Active Projects', String(data.activeProjects))}
      ${infoRow('Completed Today', String(data.completedToday))}
      ${infoRow('Pending Proposals', String(data.pendingProposals))}
      ${infoRow('Revenue (MTD)', '$' + data.revenue.toLocaleString())}
    `)}

    ${primaryButton('Open Dashboard', 'https://www.thenycinteriordesigner.com/admin/dashboard')}
  `

  return { subject: `Daily Recap — ${data.newLeads} new leads, ${data.activeProjects} active projects`, html: emailWrapper(content) }
}

// ============================================
// VERIFICATION CODE
// ============================================

export function verificationCodeEmail(code: string) {
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">Your verification code</h1>
    <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">Use this code to verify your identity:</p>

    <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e293b;">${escapeHtml(code)}</span>
    </div>

    <p style="color: #666; font-size: 13px; margin: 16px 0 0 0;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
  `

  return { subject: `Your verification code: ${code}`, html: emailWrapper(content) }
}

// ============================================
// FEEDBACK EMAIL
// ============================================

export function adminFeedbackEmail(message: string, source: string) {
  const content = `
    <h1 style="font-size: 20px; font-weight: 600; color: #000; margin: 0 0 16px 0;">New Feedback Received</h1>
    ${infoTable(`
      ${infoRow('Source', escapeHtml(source))}
    `)}
    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 0;">${escapeHtml(message)}</p>
    </div>
  `
  return { subject: `Feedback: ${message.slice(0, 60)}...`, html: emailWrapper(content) }
}
