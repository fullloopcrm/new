/**
 * Renders the Commission Sales Partner Agreement to a PDF (pdf-lib, same
 * renderer as agreement-pdf.ts — no HTML→PDF step). Independent-contractor
 * referral/recruiting agreement: commission structure, payout terms, W-9/tax
 * reporting notice, term. Single signer (the partner only — no countersign).
 * Field spots are returned as % of page, matching the e-sign module's
 * *_pct convention (see documents.ts / /api/documents/public/[token]/sign).
 *
 * NOTE: plain-English contract, not legal advice — have counsel review.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export interface SalesPartnerAgreementPdfOpts {
  tenantName: string
  tenantEmail?: string | null
  partnerName: string
  partnerEmail: string
  referralCode: string
  tier: string
  commissionRate: number
  effectiveDate: string
  governingState?: string | null
}

export interface FieldSpot { page: number; xPct: number; yPct: number; wPct: number; hPct: number }
export interface SalesPartnerAgreementPdfResult {
  bytes: Uint8Array
  pageCount: number
  partnerFullName: FieldSpot
  partnerSignature: FieldSpot
  partnerDate: FieldSpot
}

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 56
const LINE = 13.5

const TIER_LABEL: Record<string, string> = { standard: 'Standard', tier2: 'Tier 2', tier3: 'Tier 3' }

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

export async function buildSalesPartnerAgreementPdf(o: SalesPartnerAgreementPdfOpts): Promise<SalesPartnerAgreementPdfResult> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const teal = rgb(0.05, 0.58, 0.53)
  const ink = rgb(0.06, 0.09, 0.16)
  const gray = rgb(0.32, 0.37, 0.44)
  const hair = rgb(0.85, 0.87, 0.9)
  const maxW = PAGE_W - MARGIN * 2
  const state = o.governingState || '[State]'
  const ratePct = `${(o.commissionRate * 100).toFixed(0)}%`
  const tierLabel = TIER_LABEL[o.tier] || o.tier

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN

  const footer = (p: PDFPage) => {
    p.drawText(`${o.tenantName}${o.tenantEmail ? `  ·  ${o.tenantEmail}` : ''}`, { x: MARGIN, y: 34, size: 7.5, font, color: gray })
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
  page.drawText(o.tenantName.toUpperCase(), { x: MARGIN, y, size: 10, font: bold, color: teal }); y -= 20
  write('Commission Sales Partner Agreement', 18, bold); gap(3)
  write(`Effective ${o.effectiveDate}`, 9.5, font, gray)
  gap(6); rule(rgb(0.75, 0.78, 0.82)); gap(4)

  write(`This Commission Sales Partner Agreement (the "Agreement") is entered into as of ${o.effectiveDate} between ${o.tenantName} ("Company") and ${o.partnerName} ("Partner"). Partner's assigned referral code is ${o.referralCode}, currently at the ${tierLabel} commission tier. By signing below, Partner agrees to the following terms.`, 9.5, font, gray)

  clause(1, 'Appointment',
    `Company appoints Partner as an independent Commission Sales Partner to refer prospective customers to Company using Partner's unique referral code (${o.referralCode}) and to recruit individual referrers who will carry their own referral codes tied back to Partner. This appointment is non-exclusive and does not restrict Partner from engaging in other business activities.`)

  clause(2, 'Commission Structure',
    `Partner earns a commission of ${ratePct} of gross booking revenue on (a) clients who book directly using Partner's referral code ("direct" commissions), and (b) bookings made by referrers Partner has personally recruited, where Partner's commission is paid on top of and does not reduce the recruited referrer's own commission ("override" commissions). Commission rate and tier may be adjusted by Company from time to time on written or in-app notice; adjustments apply prospectively to bookings occurring after the change.`,
    'Commissions are calculated on completed, paid bookings only. Company reserves the right to reverse or withhold commission on a booking that is refunded, charged back, or found to be fraudulent.')

  clause(3, 'Payout',
    'Commissions are paid out manually by Company via Zelle or Apple Cash to the payout details Partner provides in the Sales Partner portal, on a schedule set by Company. Company does not currently offer automated (e.g. Stripe Connect) payouts.',
    'Partner is responsible for providing a completed IRS Form W-9 (or equivalent) before Company can release any payout, and for all taxes on commissions earned. Company will issue an IRS Form 1099 (or equivalent) for any calendar year in which Partner\'s total commissions meet or exceed the applicable reporting threshold.')

  clause(4, 'Independent Contractor Status',
    'Partner is an independent contractor, not an employee, agent, or partner of Company. Nothing in this Agreement creates an employment, joint venture, or partnership relationship. Partner is solely responsible for their own taxes, benefits, and expenses, and has no authority to bind Company to any obligation.')

  clause(5, 'Partner Conduct',
    'Partner will represent Company and its services accurately and will not make claims, promises, or guarantees on Company\'s behalf beyond what Company has authorized in its own marketing materials. Partner will comply with applicable law in all referral and recruiting activity, including any applicable telemarketing, SMS, and email consent requirements when contacting prospective customers or referrers.')

  clause(6, 'Term and Termination',
    'This Agreement is at-will. Either party may terminate it at any time, with or without cause, on notice to the other. Upon termination, Partner\'s referral code and portal access are deactivated. Commission already earned on bookings completed before the termination date remains payable per Section 3; no new commissions accrue on activity after termination.')

  clause(7, 'Confidentiality',
    'Partner will keep confidential any non-public business, pricing, or customer information Partner learns through this relationship, and will use it only to perform under this Agreement.')

  clause(8, 'Governing Law',
    `This Agreement is governed by the laws of the State of ${state}, without regard to conflict-of-laws rules.`)

  clause(9, 'Entire Agreement',
    'This Agreement is the entire agreement between the parties regarding the Commission Sales Partner relationship and supersedes prior discussions on the subject. Company may update the standard terms of this Agreement prospectively by posting updated terms in the Sales Partner portal; continued participation after notice constitutes acceptance. This Agreement may be signed electronically.')

  // ---- Signature block ----
  ensure(120); gap(16)
  write('By typing your name and signing below, you agree to this Agreement.', 9.5, font, gray)
  gap(20)
  const pageIndex = pdf.getPageCount()

  const nameY = y
  page.drawLine({ start: { x: MARGIN, y: nameY }, end: { x: PAGE_W - MARGIN, y: nameY }, thickness: 0.75, color: gray })
  page.drawText('Full legal name', { x: MARGIN, y: nameY - 12, size: 8, font, color: gray })
  gap(46)

  const col2X = PAGE_W / 2 + 8
  const sigY = y
  page.drawLine({ start: { x: MARGIN, y: sigY }, end: { x: PAGE_W / 2 - 16, y: sigY }, thickness: 0.75, color: gray })
  page.drawLine({ start: { x: col2X, y: sigY }, end: { x: PAGE_W - MARGIN, y: sigY }, thickness: 0.75, color: gray })
  page.drawText(`Partner — ${o.partnerName}`, { x: MARGIN, y: sigY - 12, size: 8, font, color: gray })
  page.drawText('Date', { x: col2X, y: sigY - 12, size: 8, font, color: gray })

  const bytes = await pdf.save()
  // wPct here is a direct percentage-of-page-width, not a pixel width (matches
  // agreement-pdf.ts's buildAgreementPdf spot() convention).
  const spot = (lineY: number, x: number, wPct: number): FieldSpot => ({
    page: pageIndex, xPct: (x / PAGE_W) * 100, yPct: ((PAGE_H - (lineY + 22)) / PAGE_H) * 100, wPct, hPct: (24 / PAGE_H) * 100,
  })
  return {
    bytes, pageCount: pdf.getPageCount(),
    partnerFullName: spot(nameY, MARGIN, ((PAGE_W - MARGIN * 2) / PAGE_W) * 100),
    partnerSignature: spot(sigY, MARGIN, 30),
    partnerDate: spot(sigY, col2X, 20),
  }
}
