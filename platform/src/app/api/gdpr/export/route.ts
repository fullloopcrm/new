/**
 * GDPR / CCPA customer data export.
 *
 *   GET /api/gdpr/export?format=zip|json[&clientId=<uuid>]
 *
 * - format=zip (default): a ZIP with one CSV per domain + export.json + manifest.
 * - format=json: the raw bundle as a single JSON document.
 * - clientId (optional): scope to a single client (a Data Subject Access
 *   Request). Omitted → the tenant's full customer dataset.
 *
 * Gated on settings.edit (owner/admin) since this emits raw customer PII.
 * Every query is tenant-scoped; a supplied clientId is verified to belong to
 * the tenant before anything is read.
 */
import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import {
  collectGdprExport,
  rowsToCsv,
  buildManifestText,
  type GdprSection,
} from '@/lib/gdpr-export'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SECTIONS: GdprSection[] = ['bookings', 'invoices', 'communications', 'notes']

export async function GET(request: Request) {
  const { tenant, error } = await requirePermission('settings.edit')
  if (error) return error

  try {
    const url = new URL(request.url)
    const format = (url.searchParams.get('format') || 'zip').toLowerCase()
    if (format !== 'zip' && format !== 'json') {
      return NextResponse.json({ error: 'format must be "zip" or "json"' }, { status: 400 })
    }

    const clientId = url.searchParams.get('clientId')
    if (clientId !== null) {
      if (!UUID_RE.test(clientId)) {
        return NextResponse.json({ error: 'clientId must be a UUID' }, { status: 400 })
      }
      // Confirm the client belongs to this tenant — defense in depth against
      // exporting another tenant's client by id guess.
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .eq('tenant_id', tenant.tenantId)
        .maybeSingle()
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
    }

    const bundle = await collectGdprExport(tenant.tenantId, clientId, new Date().toISOString())

    if (format === 'json') {
      return NextResponse.json(bundle)
    }

    const zip = new JSZip()
    zip.file('manifest.txt', buildManifestText(bundle))
    zip.file('export.json', JSON.stringify(bundle, null, 2))
    for (const section of SECTIONS) {
      zip.file(`${section}.csv`, rowsToCsv(bundle.sections[section]))
    }

    const buf = await zip.generateAsync({ type: 'arraybuffer' })
    const stamp = bundle.generated_at.slice(0, 10)
    const suffix = clientId ? `client-${clientId}` : 'tenant'
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="gdpr-export-${suffix}-${stamp}.zip"`,
      },
    })
  } catch (err) {
    console.error('GET /api/gdpr/export', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
