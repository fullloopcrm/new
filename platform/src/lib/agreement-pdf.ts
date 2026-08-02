/**
 * Renders the Full Loop CRM Master Services Agreement to a professional PDF
 * (pdf-lib — no HTML→PDF renderer here). One combined document: legal terms
 * + full scope of work + price, in that order, one signature block. There is
 * no separate "Scope of Work" or "Investment Sheet" document (2026-08-02
 * decision) — the client hits one button and agrees to everything at once.
 * Returns bytes plus the field positions (as % of page, matching the e-sign
 * module's *_pct fields) for the client + Full Loop signature/date lines.
 *
 * NOTE: plain-English contract, not legal advice — have counsel review.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { PRICING } from './billing-pricing'

// Full Loop's own contact info shown on every agreement. Confirm the phone.
export const FULL_LOOP_CONTACT = {
  name: 'Full Loop CRM',
  email: 'hello@fullloopcrm.com',
  phone: '(212) 202-9220',
}

export interface AgreementPdfOpts {
  businessName: string
  contactName?: string | null
  clientEmail?: string | null
  clientPhone?: string | null
  admins: number
  teamMembers: number
  monthly: number
  territoryName?: string | null
  effectiveDate: string
  governingState?: string | null
  /** e.g. "Landscaping", "Cleaning" — falls back to a generic phrase when unset. */
  trade?: string | null
}

export interface FieldSpot { page: number; xPct: number; yPct: number; wPct: number; hPct: number }
export interface AgreementPdfResult {
  bytes: Uint8Array
  pageCount: number
  clientSignature: FieldSpot
  clientDate: FieldSpot
  loopSignature: FieldSpot
  loopDate: FieldSpot
}

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 56
const LINE = 13.5
const fmt = (n: number) => `$${n.toLocaleString()}`

// ---- Scope-of-work content (2026-08-02) -----------------------------------
// Generalized across trades — [Trade]/[Territory]/[Business Name] come from
// AgreementPdfOpts at render time, everything else is fixed copy.

const WHAT_INCLUDED = [
  'A custom marketing website, fully built and launched',
  'Local SEO — on-page, technical, and ongoing optimization',
  'Online booking, scheduling, and job dispatch',
  'Customer portal and crew/team portal',
  'Invoicing and payment collection (card and ACH)',
  'Automated customer communication by SMS and email',
  'Reviews and reputation management',
  'Exclusive territory — one business per market on the platform',
  'A reporting and operations dashboard',
]

const WEBSITE_PAGE_TYPES: [string, string, string][] = [
  ['Core & menu pages', '~15-25 (fixed set)', 'Home, about, pricing, service overview, how it works, FAQ, reviews, contact, free quote, guides'],
  ['Service pages', 'One per service offered', 'One dedicated page per service/product line in your catalog'],
  ['Geo / neighborhood pages', 'One per community in your territory', 'One optimized page for every city/neighborhood you serve'],
  ['Service x Geo pages', 'Services x communities', 'Every service in every community you serve — the core lead engine'],
  ['Partnership + Geo pages', 'One per community (if applicable)', 'Contractor & broker/referral programs mapped to every community'],
  ['Blog / authority content', 'Ongoing', 'Long-tail capture & topical authority, added continuously post-launch'],
]

const SEO_FOUNDATION = [
  'Structured data / schema on every page (LocalBusiness, Service, FAQ, Breadcrumb, Article)',
  'Google Search Console setup, verification & ongoing monitoring',
  'Auto-generated XML sitemaps + robots + IndexNow instant indexing',
  'Programmatic meta titles, descriptions & OpenGraph per page',
  'Internal linking — nearby communities & related services',
  'Core Web Vitals & mobile performance optimization',
  'Free-quote / booking flow with lead capture',
  'AI chat assistant embedded site-wide',
  'Every lead & partnership inquiry routed into the CRM',
]

const CRM_FEATURES: { group: string; items: string[] }[] = [
  { group: 'Customers & Leads', items: [
    'Lead capture, verification, blocking & manual override', 'Prospect tracking',
    'Customer profiles — contacts, service addresses, full activity & history',
    'Source attribution tracking',
    'Existing website inventory — your current websites tracked and managed within the CRM backend',
  ] },
  { group: 'Jobs, Scheduling & Dispatch', items: [
    'Order / job management', 'Calendar & smart scheduling', 'Job mapping — visual map of all active and scheduled jobs',
    'Crew & driver availability', 'Recurring schedules', 'Route optimization (auto-build & publish)',
    'Driver/crew dispatch & live map', 'Travel-time calculation',
  ] },
  { group: 'Crew / Team Management & Portal', items: [
    'Team profiles, onboarding & priority ranking', 'Team portal: assigned jobs & availability',
    'Employee location mapping — live map of crew locations and coverage zones',
    'GPS check-in / check-out', 'Running-late alerts & notifications', 'Ratings, job guidelines & photo/video upload',
  ] },
  { group: 'Customer Portal', items: [
    'Passwordless login — PIN-based access, generated automatically and sent to the client',
    'View & manage orders', 'Saved addresses / properties', 'Recurring service & rescheduling',
    'Preferred crew & online payment',
  ] },
  { group: 'Payments & Payouts', items: [
    'Stripe card payments & secure portal', 'Stripe Connect crew/driver payouts', 'Tips, invoices & billing',
    'Automated payment reminders & follow-ups',
  ] },
  { group: 'Communications Hub', items: [
    'Omnichannel inbox: SMS, email & voice', 'Built-in softphone — dial, presence, call logging',
    'Threads, templates, contacts & notes', 'Recipient search & channel routing',
  ] },
  { group: 'AI Agent', items: [
    'Conversational booking & customer support', 'Persistent memory & multi-turn handling',
    'Trainable guidelines & tone', 'Built-in translation',
  ] },
  { group: 'Sales', items: [
    'Personalized sales process — lead-to-sale workflow configured specifically for your business',
    'Deal pipeline & stages, at-risk flagging', 'Quotes with e-signature', 'Invoices & documents',
    'Sales forecast & follow-ups',
  ] },
  { group: 'Marketing, Reviews & Referrals', items: [
    'Campaigns (generate, preview, send) & broadcast', 'Referral program: referrers, commissions & analytics',
    'Review collection, submission portal & video reviews', 'Google reviews sync',
    'Social, announcements & website management',
  ] },
  { group: 'Analytics, Admin & Automation', items: [
    'Analytics + live activity feed & customer analytics', 'System monitoring, status & error tracking',
    'Users, roles, permissions & settings', 'Web push & notification center',
    '24+ automated jobs: reminders, confirmations, payment follow-ups, daily summaries, post-job follow-ups, rating prompts, recurring generation, retention, outreach, health & comms monitoring, backups',
  ] },
]

const INTEGRATIONS_LINE = 'SMS + voice - Email - Payments - Google (OAuth + Reviews) - inbound email monitoring - AI - web push - IndexNow'

const LEAD_TO_REVIEW: [string, string, string][] = [
  ['1', 'Lead capture', 'Web form, call, SMS, or AI chat — every lead created & source-attributed'],
  ['2', 'Verify & qualify', 'Validate, de-duplicate, block spam, confirm service area'],
  ['3', 'Instant response', 'AI agent / team engages by SMS & email within minutes, answers questions'],
  ['4', 'Quote / estimate', 'Pricing built & quote sent with e-signature'],
  ['5', 'Book & schedule', 'Job booked, slot assigned, confirmation sent'],
  ['6', 'Dispatch', 'Crew/driver assigned, routed, automated reminders'],
  ['7', 'Service delivery', 'GPS check-in/out, job completed, photos captured'],
  ['8', 'Payment & payout', 'Invoice, payment collected, crew payout, tips'],
  ['9', 'Follow-up', 'Automated post-job thank-you & satisfaction check'],
  ['10', 'Review request', 'Rating prompt -> Google review, synced back into the CRM'],
  ['11', 'Retain & refer', 'Recurring rebooking, retention outreach, referral capture'],
]

const ROADMAP = [
  'Finance & Bookkeeping — full accounting suite (chart of accounts, reconciliation, receipts, reports) — Beta feature, in active development',
  'HR module — hiring, onboarding, time tracking, PTO, payroll/1099 — Beta feature, in active development',
  'Mobile version — a light, mobile-ready version is available now; the full mobile version is in active development',
  'Expanded reporting & forecasting',
  'Additional custom features — available upon approval, scoped and added as requested',
  'Additional features that further benefit the business as the platform grows',
]

const COST_COMPARISON: [string, string][] = [
  ['Custom multi-thousand-page SEO website', '$25,000+'],
  ['Full custom CRM / operations platform (bookings, dispatch, payments & payouts, customer + crew portals, AI agent, comms hub, sales)', '$100,000+'],
  ['Comparable total to build from scratch', '$125,000+'],
]

const TECH_STACK: [string, string][] = [
  ['Framework', 'Next.js + React + TypeScript'],
  ['Database & auth', 'Supabase (PostgreSQL) with row-level security'],
  ['Payments', 'Stripe + Stripe Connect (payouts)'],
  ['Voice & SMS', 'Telnyx'],
  ['Email', 'Resend'],
  ['AI', 'Anthropic Claude'],
  ['Hosting & CDN', 'Vercel (global edge network)'],
]

const CLIENT_PROVIDES = [
  'Google Business Profile (GMB) access',
  'Access to all current / existing websites — for tracking install & lead consolidation, and inventory in the CRM backend',
  'Brand assets (logo, colors, photos)',
  'Full catalog details — every item/service offered, including pricing, service options, initial service location, territory, and priority area to service first',
  'Trade-specific business details (sizes, fees, permit notes, etc. as applicable)',
  'Domain & DNS access for launch',
]

// Weekly call removed (2026-08-02) — not a contractual commitment.
const EARLY_TENANT_EXPECTATIONS = [
  'Open backend access — full access to the CRM backend, not a locked-down or view-only version.',
  'One shared messaging channel — a single place to send all notes, bug reports, suggestions, and feature requests.',
]

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/)
    let cur = ''
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w
      if (font.widthOfTextAtSize(test, size) > maxW && cur) { out.push(cur); cur = w }
      else cur = test
    }
    out.push(cur)
  }
  return out
}

export async function buildAgreementPdf(o: AgreementPdfOpts): Promise<AgreementPdfResult> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const teal = rgb(0.05, 0.58, 0.53)
  const ink = rgb(0.06, 0.09, 0.16)
  const gray = rgb(0.32, 0.37, 0.44)
  const hair = rgb(0.85, 0.87, 0.9)
  const maxW = PAGE_W - MARGIN * 2
  const state = o.governingState || '[State]'
  const trade = o.trade || 'home service'
  const territory = o.territoryName || '[Territory]'

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN

  const footer = (p: PDFPage) => {
    p.drawText(`${FULL_LOOP_CONTACT.name}  ·  ${FULL_LOOP_CONTACT.email}  ·  ${FULL_LOOP_CONTACT.phone}`, { x: MARGIN, y: 34, size: 7.5, font, color: gray })
  }
  footer(page)
  const addPage = () => { page = pdf.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; footer(page) }
  const ensure = (need: number) => { if (y - need < MARGIN + 24) addPage() }
  const write = (s: string, size: number, f: PDFFont, color = ink, x = MARGIN) => {
    for (const ln of wrap(s, f, size, maxW - (x - MARGIN))) {
      ensure(LINE); page.drawText(ln, { x, y, size, font: f, color }); y -= LINE
    }
  }
  const rule = (color = hair) => { ensure(8); page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: PAGE_W - MARGIN, y: y + 2 }, thickness: 0.75, color }); y -= 8 }
  const gap = (h: number) => { y -= h }
  const clause = (n: number, title: string, ...paras: string[]) => {
    ensure(LINE * 3); gap(7)
    write(`${n}. ${title}`, 10.5, bold)
    gap(2)
    paras.forEach((p, i) => { if (i) gap(4); write(p, 9.5, font, gray) })
  }
  const sectionHeader = (title: string) => {
    ensure(LINE * 6); gap(10)
    write(title.toUpperCase(), 12.5, bold, teal)
    gap(2); rule(rgb(0.75, 0.78, 0.82)); gap(4)
  }
  const subHeader = (title: string) => {
    ensure(LINE * 2); gap(6)
    write(title, 10, bold, ink)
    gap(2)
  }
  const bullets = (items: string[], size = 9.5) => {
    for (const item of items) {
      ensure(LINE)
      const lines = wrap(item, font, size, maxW - 14)
      page.drawText('•', { x: MARGIN, y, size, font, color: teal })
      lines.forEach((ln, i) => {
        if (i > 0) ensure(LINE)
        page.drawText(ln, { x: MARGIN + 12, y, size, font, color: gray })
        y -= LINE * 0.92
      })
    }
    gap(2)
  }
  /** Generic multi-column table: header row (optional, bold) + wrapped body rows. */
  const table = (headers: string[] | null, rows: string[][], widths: number[]) => {
    const colX: number[] = []
    let acc = MARGIN
    for (const wPortion of widths) { colX.push(acc); acc += maxW * wPortion }
    const colW = widths.map(w => maxW * w - 10)

    const drawRow = (cells: string[], f: PDFFont, size: number, color = gray) => {
      const wrapped = cells.map((c, i) => wrap(c, f, size, colW[i]))
      const lineCount = Math.max(...wrapped.map(w => w.length))
      ensure(lineCount * LINE * 0.85 + 6)
      const rowTop = y
      wrapped.forEach((lines, i) => {
        let yy = rowTop
        for (const ln of lines) { page.drawText(ln, { x: colX[i], y: yy, size, font: f, color }); yy -= LINE * 0.85 }
      })
      y = rowTop - lineCount * LINE * 0.85 - 6
      rule()
    }

    if (headers) { drawRow(headers, bold, 8.5, ink); }
    for (const r of rows) drawRow(r, font, 9)
    gap(2)
  }

  // ---- Header ----
  page.drawText('FULL LOOP CRM', { x: MARGIN, y, size: 10, font: bold, color: teal }); y -= 20
  write('Master Services Agreement & Scope of Work', 19, bold); gap(3)
  write(`Effective ${o.effectiveDate}`, 9.5, font, gray)
  gap(6); rule(rgb(0.75, 0.78, 0.82)); gap(4)

  // ---- Parties ----
  const colW = (maxW - 20) / 2
  const partyTop = y
  const drawParty = (x: number, roleLabel: string, name: string, rows: string[]) => {
    let yy = partyTop
    page.drawText(roleLabel, { x, y: yy, size: 8, font: bold, color: teal }); yy -= 14
    page.drawText(name, { x, y: yy, size: 11, font: bold, color: ink }); yy -= 14
    for (const r of rows) for (const ln of wrap(r, font, 9, colW)) { page.drawText(ln, { x, y: yy, size: 9, font, color: gray }); yy -= 12 }
    return yy
  }
  const clientRows = [
    o.contactName ? `Attn: ${o.contactName}` : '',
    o.clientEmail || '', o.clientPhone || '',
    o.territoryName ? `Territory: ${o.territoryName}` : '',
  ].filter(Boolean)
  const le = drawParty(MARGIN, 'PROVIDER', FULL_LOOP_CONTACT.name, [FULL_LOOP_CONTACT.email, FULL_LOOP_CONTACT.phone])
  const re = drawParty(MARGIN + colW + 20, 'CLIENT', o.businessName, clientRows)
  y = Math.min(le, re) - 6
  rule(); gap(2)

  write(`This Master Services Agreement and Scope of Work (the "Agreement") is entered into as of ${o.effectiveDate} between ${FULL_LOOP_CONTACT.name} ("Full Loop," "we," or "us") and ${o.businessName} ("Client," "you"). By signing below, the parties agree to the following terms in full — the legal terms, the scope of work, and the price.`, 9.5, font, gray)

  // ==========================================================================
  // PART ONE — THE OFFER (scope of work)
  // ==========================================================================
  sectionHeader('The Offer')
  write(`A custom, SEO-engineered website that puts ${o.businessName} in front of customers and partners throughout ${territory} — paired with a complete operations CRM, included at no additional fee for the life of the account, and ongoing management to keep the engine growing.`, 9.5, font, gray)
  gap(4)
  write('This is not a template brochure site. It is a programmatic local-SEO engine generating thousands of optimized pages, backed by the same full-featured platform that runs live, real operating businesses today.', 9.5, font, gray)
  gap(4)
  write('Proof the engine works: Full Loop runs this exact system on its own properties. thenycmaid.com has passed 418,000 search impressions on a steep upward curve, and sister properties are climbing the same way. You are buying a proven system, not an experiment.', 9.5, font, gray)

  subHeader('What the website includes')
  bullets(WHAT_INCLUDED)
  gap(4)
  write('Page counts scale to your actual territory and service list. The table below shows the methodology, not fixed numbers — an exact count is provided once your service area and service list are confirmed during onboarding.', 9, font, gray)
  gap(6)
  table(['Page type', 'How it’s counted', 'Purpose'], WEBSITE_PAGE_TYPES, [0.24, 0.28, 0.48])
  gap(2)
  write('Total indexable pages typically run from a few thousand to 12,000+ depending on territory size and number of services — deployed in production waves over the first 60-90 days post-launch as Google indexes the site.', 9, font, gray)

  subHeader('SEO & technical foundation')
  bullets(SEO_FOUNDATION)

  // ---- CRM feature groups ----
  ensure(LINE * 3); gap(8)
  write(`The CRM — full feature parity, included at no additional fee for the life of the account`, 11, bold); gap(2)
  write(`${o.businessName} receives every feature of the live platform — the complete operations suite, not a stripped-down version.`, 9.5, font, gray)
  gap(4)
  for (const g of CRM_FEATURES) {
    subHeader(g.group)
    bullets(g.items, 9)
  }
  subHeader('Integrations')
  write(INTEGRATIONS_LINE, 9, font, gray)

  // ---- Lead-to-review process ----
  sectionHeader('The Lead-to-Review Process')
  write('Every inquiry is captured, worked, and closed through one connected pipeline — the same proven loop regardless of trade:', 9.5, font, gray)
  gap(6)
  table(['#', 'Stage', 'What happens'], LEAD_TO_REVIEW, [0.06, 0.22, 0.72])

  // ---- Tracking, trade customizations, roadmap ----
  sectionHeader('Tracking & Attribution')
  write(`We install conversion & call tracking on the new site and on all of ${o.businessName}'s current websites, so every lead, call, and form — wherever it originates — is attributed and flows into one CRM. Full visibility into which sources, pages, and campaigns produce real jobs.`, 9.5, font, gray)

  sectionHeader('Trade-Specific Customizations')
  write(`The platform was built for ${trade.toLowerCase()} businesses broadly. Justified customizations for your specific trade model are scoped and included as part of onboarding — for example: rental-period tracking, size/inventory management, weight- or usage-based pricing, permit or compliance handling, or dispatch workflows specific to your service type. These are confirmed during the onboarding questionnaire, not assumed in advance.`, 9.5, font, gray)

  sectionHeader('Roadmap — Planned, Included as Released')
  bullets(ROADMAP)

  sectionHeader('What This Would Cost to Build Independently')
  write('Commissioned from a typical agency or development shop, a system at this depth runs well into six figures:', 9.5, font, gray)
  gap(6)
  table(['Component', 'Market build cost'], COST_COMPARISON, [0.72, 0.28])

  sectionHeader('Technology Stack')
  write('Production-grade, modern, and fully owned:', 9.5, font, gray)
  gap(6)
  table(['Layer', 'Technology'], TECH_STACK, [0.32, 0.68])

  sectionHeader('What the Client Provides')
  bullets(CLIENT_PROVIDES)

  sectionHeader('What to Expect as an Early Platform Tenant')
  write('Full Loop is an actively developed, evolving platform. There will be issues, rough edges, and things that get fixed as real usage surfaces them — that’s expected, not a sign something is wrong. To make that process work well for both sides:', 9.5, font, gray)
  gap(4)
  bullets(EARLY_TENANT_EXPECTATIONS)

  // ==========================================================================
  // PART TWO — LEGAL TERMS
  // ==========================================================================
  ensure(LINE * 3); gap(14)
  write('LEGAL TERMS', 13, bold, teal); gap(2); rule(rgb(0.75, 0.78, 0.82)); gap(6)

  clause(1, 'Services',
    `Full Loop will provide the Services described in "The Offer" and "The Lead-to-Review Process" above${o.territoryName ? ` for the ${o.territoryName} territory` : ''}, including Selena, Full Loop's AI assistant, which handles SMS and email communication with the Client's leads (capturing, replying, quoting, booking, and following up) and provides owner/admin updates and approvals through a Telegram chat. Selena operates using the Client's own third-party AI account as described in Section 5.`)

  clause(2, 'Beta Features',
    'The HR, Finance, and Bookkeeping modules are in active development ("Beta Features"). Beta Features are included at no additional cost when available, are provided strictly "as is," may change or be withdrawn, and are not guaranteed deliverables or part of the committed build scope. Full Loop makes no warranty regarding Beta Features.')

  // ---- Fees table (Section 3) ----
  ensure(LINE * 4); gap(7)
  write('3. Fees', 10.5, bold); gap(3)
  const feeRow = (label: string, amount: string, strong = false) => {
    ensure(LINE)
    page.drawText(label, { x: MARGIN + 8, y, size: 9.5, font: strong ? bold : font, color: strong ? ink : gray })
    const w = (strong ? bold : font).widthOfTextAtSize(amount, 9.5)
    page.drawText(amount, { x: PAGE_W - MARGIN - 8 - w, y, size: 9.5, font: strong ? bold : font, color: ink })
    y -= LINE
  }
  feeRow('One-time setup fee (100% upfront, bank wire)', fmt(PRICING.setupFee))
  gap(2); rule()
  feeRow('Monthly total (flat, unlimited admins & team members)', fmt(o.monthly) + '/mo', true)
  feeRow('First-year total (setup + 12 months)', fmt(PRICING.setupFee + o.monthly * 12), true)
  gap(3)
  write('All amounts are in U.S. dollars.', 9.5, font, gray)

  clause(4, 'Payment Terms',
    `The setup fee (${fmt(PRICING.setupFee)}) is due in full, in advance, by wire transfer before work begins. The first month's subscription charge begins at signing (an initial $1 charge to verify the payment method, then the full monthly rate from the second charge forward); monthly fees continue each month in advance.`,
    'All fees paid are non-refundable. Fees not paid when due are past due; Full Loop may suspend the Services after reasonable notice until amounts owed are paid in full. Client is responsible for any taxes other than taxes on Full Loop\'s net income.')

  clause(5, 'Third-Party Services',
    'The platform relies on third-party services that are billed directly to the Client\'s own accounts, at cost and not marked up by Full Loop: Anthropic (AI / Selena), Telnyx (SMS, and voice if applicable), Resend (email), and Stripe (payment processing). The Client is responsible for maintaining these accounts and paying their charges. Full Loop is not responsible for the availability, pricing, changes, or acts or omissions of any third-party service.')

  clause(6, 'Onboarding and Timeline',
    'Onboarding will take up to thirty (30) days from the date Full Loop receives the Client\'s fully completed onboarding questionnaire. Timelines are estimates and depend on the Client providing accurate information, materials, and approvals promptly. Delays caused by the Client extend Full Loop\'s timelines accordingly.')

  clause(7, 'Client Responsibilities',
    'The Client will: provide the items listed in "What the Client Provides" above; respond and approve in a timely manner; maintain the third-party accounts in Section 5; and use the Services lawfully. The Client is solely responsible for the content of its communications and for compliance with all applicable laws governing them, including telemarketing, SMS, and email laws (e.g., TCPA and CAN-SPAM) and obtaining any required consents from its own customers.')

  clause(8, 'Term and Termination',
    'This Agreement begins on the Effective Date and continues month-to-month. There is no long-term contract — either party may cancel at any time; monthly Services and access end at the close of the then-current paid period. Fees already paid (including the setup fee) are non-refundable.',
    'Either party may terminate immediately for the other party\'s material breach that remains uncured ten (10) days after written notice. Upon termination, the Client\'s access to the Services ends; upon request within thirty (30) days, Full Loop will make the Client\'s data available for export in a commercially reasonable format.')

  clause(9, 'Ownership and License',
    'As between the parties, the Client owns its business data, content, and customer relationships. Full Loop owns and retains all rights in the underlying platform, software, tooling, templates, and know-how, including any improvements. Full Loop grants the Client a non-exclusive, non-transferable right to use the Services during the term. The Client grants Full Loop the right to use the Client\'s content and data solely to provide the Services.')

  clause(10, 'Confidentiality',
    'Each party may receive confidential information of the other. The receiving party will use it only to perform under this Agreement and will protect it with at least reasonable care. This does not apply to information that is public, independently developed, or rightfully obtained without confidentiality obligations.')

  clause(11, 'Warranties and Disclaimers',
    'Full Loop will perform the Services in a professional and workmanlike manner. EXCEPT AS EXPRESSLY STATED, THE SERVICES ARE PROVIDED "AS IS" AND FULL LOOP DISCLAIMS ALL OTHER WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. Full Loop does not guarantee any specific search ranking, lead volume, revenue, or business result.')

  clause(12, 'Limitation of Liability',
    'NEITHER PARTY IS LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOST PROFITS OR REVENUE. EACH PARTY\'S TOTAL LIABILITY ARISING OUT OF THIS AGREEMENT WILL NOT EXCEED THE AMOUNTS PAID BY THE CLIENT TO FULL LOOP IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM.')

  clause(13, 'Indemnification',
    'The Client will defend, indemnify, and hold harmless Full Loop from any third-party claims arising out of the Client\'s content, its use of the Services, or its communications with its customers, including any claim that the Client failed to obtain required consents or comply with applicable communication laws.')

  clause(14, 'Independent Contractors',
    'The parties are independent contractors. Nothing in this Agreement creates a partnership, joint venture, agency, or employment relationship.')

  clause(15, 'Force Majeure',
    'Neither party is liable for delays or failures caused by events beyond its reasonable control, including acts of God, outages, third-party service failures, or government action.')

  clause(16, 'Governing Law and Disputes',
    `This Agreement is governed by the laws of the State of ${state}, without regard to conflict-of-laws rules. The parties will attempt to resolve disputes in good faith; any unresolved dispute will be brought exclusively in the state or federal courts located in ${state}.`)

  clause(17, 'General',
    'This Agreement is the entire agreement between the parties for the Services described above and supersedes prior discussions, including any prior scope-of-work or investment-sheet drafts. Amendments must be in writing and signed by both parties. If any provision is unenforceable, the rest remains in effect. Neither party may assign this Agreement without the other\'s consent, except to a successor in a merger or sale of substantially all assets. Notices may be given by email to the addresses above. Sections that by their nature should survive termination will survive. This Agreement may be signed electronically and in counterparts, each of which is an original.')

  sectionHeader('Next Steps')
  write('1. Review this agreement in full.  2. Approve and sign below.  3. Kickoff — brand assets, service list & pricing, coverage map, GMB & current-site access, business-model details.  4. Build & launch per the timeline in Section 6.', 9.5, font, gray)

  // ---- Signature block ----
  ensure(160); gap(16)
  write('By signing below, the Client agrees to this entire Agreement — legal terms, scope of work, and price — and Full Loop countersigns to accept.', 9.5, font, gray)
  gap(26)
  const pageIndex = pdf.getPageCount()
  const col2X = PAGE_W / 2 + 8
  const sigY = y
  page.drawLine({ start: { x: MARGIN, y: sigY }, end: { x: PAGE_W / 2 - 16, y: sigY }, thickness: 0.75, color: gray })
  page.drawLine({ start: { x: col2X, y: sigY }, end: { x: PAGE_W - MARGIN, y: sigY }, thickness: 0.75, color: gray })
  page.drawText(`Client — ${o.contactName || ''}${o.contactName ? ', ' : ''}${o.businessName}`, { x: MARGIN, y: sigY - 12, size: 8, font, color: gray })
  page.drawText('Date', { x: col2X, y: sigY - 12, size: 8, font, color: gray })
  const loopY = sigY - 58
  page.drawLine({ start: { x: MARGIN, y: loopY }, end: { x: PAGE_W / 2 - 16, y: loopY }, thickness: 0.75, color: gray })
  page.drawLine({ start: { x: col2X, y: loopY }, end: { x: PAGE_W - MARGIN, y: loopY }, thickness: 0.75, color: gray })
  page.drawText(`${FULL_LOOP_CONTACT.name} — ${FULL_LOOP_CONTACT.email}`, { x: MARGIN, y: loopY - 12, size: 8, font, color: gray })
  page.drawText('Date', { x: col2X, y: loopY - 12, size: 8, font, color: gray })

  const bytes = await pdf.save()
  const spot = (lineY: number, x: number, wPct: number): FieldSpot => ({
    page: pageIndex, xPct: (x / PAGE_W) * 100, yPct: ((PAGE_H - (lineY + 22)) / PAGE_H) * 100, wPct, hPct: (24 / PAGE_H) * 100,
  })
  return {
    bytes, pageCount: pdf.getPageCount(),
    clientSignature: spot(sigY, MARGIN, 30),
    clientDate: spot(sigY, col2X, 20),
    loopSignature: spot(loopY, MARGIN, 30),
    loopDate: spot(loopY, col2X, 20),
  }
}
