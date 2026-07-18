import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { exportSiteToZip } from '@/lib/site-export'
import { getPrimaryTenantDomain } from '@/lib/domains'

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

  // Resolve the tenant's primary public domain via the canonical resolver
  // (domains.ts's getPrimaryTenantDomain — deterministic created_at ordering
  // when 2+ rows are flagged is_primary; see its own doc comment). This route
  // used to hand-roll an unordered `.find(d => d.is_primary)` over an
  // unordered select, reintroducing the exact non-deterministic-primary bug
  // getPrimaryTenantDomain was hardened against.
  let primary = (await getPrimaryTenantDomain(id)) || undefined

  // Fallback: tenants.domain (legacy source of truth, retained per P1 spec —
  // see getTenantByDomain in tenant.ts / tenant-lookup.ts, same precedence).
  // Without this, a tenant live only via tenants.domain (not yet migrated to
  // tenant_domains) always 400'd "no active domain" here even though their
  // site is reachable and the ownership-export promise applies to them too.
  if (!primary) {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('domain')
      .eq('id', id)
      .maybeSingle()
    primary = tenant?.domain || undefined
  }

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
