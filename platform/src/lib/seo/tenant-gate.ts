// Shared status gate for the seo-* lib layer. Every pipeline stage below
// ingest (technical/competitor scans, proposal/enrichment drafting, autopilot
// apply) enumerates properties or issues keyed by a nullable seo tenant_id and
// previously never checked whether that tenant was still serving — a
// suspended/cancelled/deleted tenant kept burning paid GSC/SERP/Anthropic
// spend indefinitely, and autopilot kept writing live title/meta overrides to
// a dead tenant's site. Same gate as tenant-status.ts's tenantServesSite(),
// just pre-resolved into a Set so call sites can filter an array in one pass.
//
// A property/issue with tenant_id: null (FL-owned or not yet linked) is never
// excluded here — only a RESOLVED tenant whose status is non-serving is.
import { supabaseAdmin } from '@/lib/supabase'
import { tenantServesSite } from '@/lib/tenant-status'

export async function nonServingTenantIds(): Promise<Set<string>> {
  const { data } = await supabaseAdmin.from('tenants').select('id,status')
  return new Set(
    (data ?? [])
      .filter((t) => !tenantServesSite(t.status as string | null))
      .map((t) => t.id as string),
  )
}
