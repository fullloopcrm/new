import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requireAdmin } from '@/lib/require-admin'
import { exportSiteToZip } from '@/lib/site-export'

// Crawling + zipping a live site can take a while for larger sites.
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * GET /api/admin/businesses/[id]/site-export
 * Produces a downloadable static ZIP of the tenant's live public site so the
 * customer can keep it (ownership promise). See lib/site-export.ts for limits.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  // Resolve the tenant's primary public domain. Prefer the primary flag, else
  // the first active domain. (tenant_domains uses is_primary in prod.)
  const { data: domains } = await tenantDb(id)
    .from('tenant_domains')
    .select('domain, is_primary')
    .eq('active', true)

  const primary =
    (domains || []).find((d) => (d as { is_primary?: boolean }).is_primary)?.domain ||
    (domains || [])[0]?.domain

  if (!primary) {
    return NextResponse.json(
      { error: 'No active domain found for this tenant — set a domain before exporting.' },
      { status: 400 }
    )
  }

  const baseUrl = `https://${primary.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`

  let result
  try {
    result = await exportSiteToZip(baseUrl)
  } catch (err) {
    return NextResponse.json(
      { error: `Export failed: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 502 }
    )
  }

  const safeName = primary.replace(/[^a-z0-9.-]/gi, '_')
  const filename = `${safeName}-site-export.zip`

  return new NextResponse(new Uint8Array(result.zip), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Export-Pages': String(result.pages),
      'X-Export-Assets': String(result.assets),
      'X-Export-Capped': String(result.capped),
      'Cache-Control': 'no-store',
    },
  })
}
