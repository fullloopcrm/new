/**
 * Job photo report — PDF export for customers/subs/insurance. Reuses pdf-lib
 * (already a dependency, used by /api/documents) instead of adding a new
 * PDF library.
 *
 * POST { photo_ids?: string[] }  — omit to include every photo
 *   → PDF binary (Content-Type: application/pdf)
 *
 * Constraint: pdf-lib only embeds JPEG/PNG. HEIC/WEBP photos (allowed at
 * capture time) are listed by caption + link instead of inlined — there is
 * no image-conversion step here, so those formats never render inline.
 */
import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { getTenantTimezone } from '@/lib/tenant-time'

type Params = { params: Promise<{ id: string }> }

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 48

function extOf(url: string): string {
  return (url.split('.').pop() || '').toLowerCase().split('?')[0]
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.view')
    if (authError) return authError
    const { tenantId } = tenant
    const timezone = getTenantTimezone(tenant.tenant)
    const { id: jobId } = await params
    const db = tenantDb(tenantId)

    const { data: job } = await db.from('jobs').select('id, title, service_address, status').eq('id', jobId).eq('tenant_id', tenantId).single()
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const { photo_ids } = await request.json().catch(() => ({ photo_ids: undefined }))

    let photoQuery = db.from('job_photos').select('*').eq('job_id', jobId).order('taken_at', { ascending: true })
    if (Array.isArray(photo_ids) && photo_ids.length > 0) photoQuery = photoQuery.in('id', photo_ids)
    const { data: photos } = await photoQuery

    const { data: checklist } = await db.from('job_checklist_items').select('label, done').eq('job_id', jobId).order('sort_order')

    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const bold = await doc.embedFont(StandardFonts.HelveticaBold)

    // Cover page: job info + checklist summary.
    const cover = doc.addPage([PAGE_W, PAGE_H])
    let y = PAGE_H - MARGIN
    cover.drawText(job.title || 'Job Report', { x: MARGIN, y, size: 20, font: bold })
    y -= 26
    if (job.service_address) { cover.drawText(job.service_address, { x: MARGIN, y, size: 11, font, color: rgb(0.4, 0.4, 0.4) }); y -= 18 }
    cover.drawText(`Status: ${job.status}`, { x: MARGIN, y, size: 11, font, color: rgb(0.4, 0.4, 0.4) })
    y -= 30

    if (checklist && checklist.length > 0) {
      cover.drawText('Checklist', { x: MARGIN, y, size: 13, font: bold })
      y -= 20
      for (const item of checklist) {
        if (y < MARGIN) break
        cover.drawText(`${item.done ? '[x]' : '[ ]'} ${item.label}`, { x: MARGIN, y, size: 10, font })
        y -= 16
      }
    }

    // One page per photo (or per unembeddable-photo caption line).
    for (const p of photos ?? []) {
      const ext = extOf(p.url)
      const page = doc.addPage([PAGE_W, PAGE_H])
      let py = PAGE_H - MARGIN
      page.drawText(`${p.photo_type.toUpperCase()} — ${new Date(p.taken_at).toLocaleDateString('en-US', { timeZone: timezone })}`, { x: MARGIN, y: py, size: 11, font: bold })
      py -= 20

      if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
        try {
          const res = await fetch(p.url)
          const bytes = new Uint8Array(await res.arrayBuffer())
          const img = ext === 'png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
          const maxW = PAGE_W - MARGIN * 2
          const maxH = PAGE_H - MARGIN * 2 - 40
          const scale = Math.min(maxW / img.width, maxH / img.height, 1)
          const w = img.width * scale
          const h = img.height * scale
          page.drawImage(img, { x: MARGIN, y: py - h, width: w, height: h })
          py -= h + 16
        } catch {
          page.drawText('(image failed to load)', { x: MARGIN, y: py, size: 10, font, color: rgb(0.6, 0.2, 0.2) })
          py -= 16
        }
      } else {
        page.drawText(`(${ext.toUpperCase()} photo — view online)`, { x: MARGIN, y: py, size: 10, font, color: rgb(0.4, 0.4, 0.4) })
        page.drawText(p.url, { x: MARGIN, y: py - 14, size: 8, font, color: rgb(0.3, 0.3, 0.7) })
        py -= 32
      }

      if (p.caption) page.drawText(p.caption, { x: MARGIN, y: py, size: 10, font })
    }

    const pdfBytes = await doc.save()
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(job.title || 'job-report').replace(/[^a-z0-9-]/gi, '_')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('POST /api/jobs/[id]/report', err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
