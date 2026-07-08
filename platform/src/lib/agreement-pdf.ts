/**
 * Renders the Full Loop CRM Master Services Agreement to a professional PDF
 * (pdf-lib — no HTML→PDF renderer here). Parties block + fees table + full
 * contract terms + signature block. Returns bytes plus the field positions
 * (as % of page, matching the e-sign module's *_pct fields) for the client +
 * Full Loop signature/date lines.
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

const INCLUDED = [
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
  const half = Math.round(PRICING.setupFee / 2)
  const state = o.governingState || '[State]'

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

  // ---- Header ----
  page.drawText('FULL LOOP CRM', { x: MARGIN, y, size: 10, font: bold, color: teal }); y -= 20
  write('Master Services Agreement', 20, bold); gap(3)
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

  write(`This Master Services Agreement (the "Agreement") is entered into as of ${o.effectiveDate} between ${FULL_LOOP_CONTACT.name} ("Full Loop," "we," or "us") and ${o.businessName} ("Client," "you"). By signing below, the parties agree to the following terms.`, 9.5, font, gray)

  // ---- Clauses ----
  clause(1, 'Services',
    `Full Loop will provide the Client an all-inclusive platform and done-for-you setup${o.territoryName ? ` for the ${o.territoryName} territory` : ''} (the "Services"), which includes: ${INCLUDED.map(s => s).join('; ')}.`,
    'The Services include Selena, Full Loop\'s AI assistant, which handles SMS and email communication with the Client\'s leads (capturing, replying, quoting, booking, and following up) and provides owner/admin updates and approvals through a Telegram chat. Selena operates using the Client\'s own third-party AI account as described in Section 6.')

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
  feeRow('One-time setup fee', fmt(PRICING.setupFee))
  feeRow(`Admin seats — ${o.admins} x ${fmt(PRICING.adminMonthly)}/mo`, fmt(o.admins * PRICING.adminMonthly) + '/mo')
  feeRow(`Portal team members — ${o.teamMembers} x ${fmt(PRICING.teamMemberMonthly)}/mo`, fmt(o.teamMembers * PRICING.teamMemberMonthly) + '/mo')
  gap(2); rule()
  feeRow('Monthly total', fmt(o.monthly) + '/mo', true)
  feeRow('First-year total (setup + 12 months)', fmt(PRICING.setupFee + o.monthly * 12), true)
  gap(3)
  write('Seat counts may be adjusted by written agreement; monthly fees adjust accordingly on the next billing cycle. All amounts are in U.S. dollars.', 9.5, font, gray)

  clause(4, 'Payment Terms',
    `The setup fee is paid in two installments: fifty percent (${fmt(half)}) is due in advance by wire transfer before work begins, and the remaining fifty percent (${fmt(half)}) is due upon ninety percent (90%) completion, defined as the build being complete and pending only edits requested by the Client. Monthly fees begin at launch and are billed each month in advance.`,
    'All fees paid are non-refundable. Fees not paid when due are past due; Full Loop may suspend the Services after reasonable notice until amounts owed are paid in full. Client is responsible for any taxes other than taxes on Full Loop\'s net income.')

  clause(5, 'Third-Party Services',
    'The platform relies on third-party services that are billed directly to the Client\'s own accounts, at cost and not marked up by Full Loop: Anthropic (AI / Selena), Telnyx (SMS, and voice if applicable), Resend (email), and Stripe (payment processing). The Client is responsible for maintaining these accounts and paying their charges. Full Loop is not responsible for the availability, pricing, changes, or acts or omissions of any third-party service.')

  clause(6, 'Onboarding and Timeline',
    'Onboarding will take up to thirty (30) days from the date Full Loop receives the Client\'s fully completed onboarding questionnaire. Timelines are estimates and depend on the Client providing accurate information, materials, and approvals promptly. Delays caused by the Client extend Full Loop\'s timelines accordingly.')

  clause(7, 'Client Responsibilities',
    'The Client will: provide accurate and complete information and materials; respond and approve in a timely manner; maintain the third-party accounts in Section 6; and use the Services lawfully. The Client is solely responsible for the content of its communications and for compliance with all applicable laws governing them, including telemarketing, SMS, and email laws (e.g., TCPA and CAN-SPAM) and obtaining any required consents from its own customers.')

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
    'This Agreement, together with any written order or proposal it references, is the entire agreement between the parties and supersedes prior discussions. Amendments must be in writing and signed by both parties. If any provision is unenforceable, the rest remains in effect. Neither party may assign this Agreement without the other\'s consent, except to a successor in a merger or sale of substantially all assets. Notices may be given by email to the addresses above. Sections that by their nature should survive termination will survive. This Agreement may be signed electronically and in counterparts, each of which is an original.')

  // ---- Signature block ----
  ensure(160); gap(16)
  write('By signing below, the Client agrees to this Agreement, and Full Loop countersigns to accept.', 9.5, font, gray)
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
