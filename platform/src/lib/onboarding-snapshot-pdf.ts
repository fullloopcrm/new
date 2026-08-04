/**
 * Renders a tenant's completed onboarding submission to a plain, read-only
 * PDF — the human-readable copy of the immutable snapshot stored in
 * tenant_onboarding_submissions.data. Not interactive, not styled to match
 * the marketing PDFs (agreement-pdf.ts) — just every submitted answer,
 * grouped and labeled, so it's usable even if PROFILE_FIELDS changes shape
 * later (unknown keys still print, just without a friendly label/section).
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { PROFILE_FIELD_BY_KEY, PROFILE_SECTION_ORDER, PROFILE_SECTION_META, type FieldDef } from './tenant-profile'

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 56
const LINE = 14

function formatValue(field: FieldDef | undefined, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.length ? value.map(String).join(', ') : '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  if (field?.options) {
    const match = field.options.find((o) => (typeof o === 'string' ? o : String(o.value)) === String(value))
    if (match && typeof match !== 'string') return match.label
  }
  return String(value)
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = []
  const words = text.split(/\s+/)
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (font.widthOfTextAtSize(test, size) > maxW && cur) { out.push(cur); cur = w }
    else cur = test
  }
  if (cur) out.push(cur)
  return out.length ? out : ['']
}

export async function buildOnboardingSnapshotPdf(opts: {
  tenantName: string
  submittedAt: string
  data: Record<string, unknown>
}): Promise<Uint8Array> {
  const { tenantName, submittedAt, data } = opts
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const teal = rgb(0.05, 0.58, 0.53)
  const ink = rgb(0.06, 0.09, 0.16)
  const gray = rgb(0.32, 0.37, 0.44)
  const maxW = PAGE_W - MARGIN * 2

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN
  const addPage = () => { page = pdf.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN }
  const ensure = (need: number) => { if (y - need < MARGIN) addPage() }

  page.drawText('FULL LOOP CRM', { x: MARGIN, y, size: 9, font: bold, color: teal }); y -= 18
  page.drawText(`${tenantName} — Onboarding Completed Form`, { x: MARGIN, y, size: 15, font: bold, color: ink }); y -= 16
  page.drawText(`Submitted ${new Date(submittedAt).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })} ET`, { x: MARGIN, y, size: 9.5, font, color: gray })
  y -= 12
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.75, color: rgb(0.75, 0.78, 0.82) })
  y -= 18

  const grouped = new Map<string, [string, unknown][]>()
  const otherKey = '__other__'
  for (const [key, value] of Object.entries(data)) {
    const field = PROFILE_FIELD_BY_KEY[key]
    const section = field?.section || otherKey
    if (!grouped.has(section)) grouped.set(section, [])
    grouped.get(section)!.push([key, value])
  }

  const orderedSections = [...PROFILE_SECTION_ORDER.filter((s) => grouped.has(s)), ...(grouped.has(otherKey) ? [otherKey] : [])]

  for (const section of orderedSections) {
    const entries = grouped.get(section)!
    const title = section === otherKey ? 'Other' : PROFILE_SECTION_META[section as keyof typeof PROFILE_SECTION_META]?.title || section
    ensure(LINE * 3)
    page.drawText(title.toUpperCase(), { x: MARGIN, y, size: 11.5, font: bold, color: teal }); y -= 6
    y -= 6
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.85, 0.87, 0.9) })
    y -= 12

    for (const [key, value] of entries) {
      const field = PROFILE_FIELD_BY_KEY[key]
      const label = field?.label || key
      const text = formatValue(field, value)
      ensure(LINE * 2)
      page.drawText(label, { x: MARGIN, y, size: 9.5, font: bold, color: ink }); y -= LINE
      const lines = wrap(text, font, 9.5, maxW - 12)
      for (const ln of lines) {
        ensure(LINE)
        page.drawText(ln, { x: MARGIN + 12, y, size: 9.5, font, color: gray }); y -= LINE * 0.9
      }
      y -= 4
    }
    y -= 6
  }

  return pdf.save()
}
