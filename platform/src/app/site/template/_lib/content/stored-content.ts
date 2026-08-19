/**
 * Read-through for AI-drafted area content (Phase 4, generate-tenant-site.ts).
 * Pages call this with the procedural longform.ts builder's output already
 * computed as `fallback` — if generateTenantSite() has written a row for this
 * tenant/page_type/slug, that AI-personalized draft wins; otherwise the free
 * procedural content renders, so a page is never blank or broken before the
 * first Completion/Update-Website run. Never calls the AI model itself —
 * that only happens in generate-tenant-site.ts, once, offline from any request.
 */
import { supabaseAdmin } from '@/lib/supabase'
import type { LongformPage } from '@/app/site/template/_lib/content/longform'

export async function getStoredOrFallbackContent(
  tenantId: string,
  pageType: 'location' | 'job' | 'location-service',
  slug: string,
  fallback: LongformPage,
): Promise<LongformPage> {
  const { data } = await supabaseAdmin
    .from('tenant_site_content')
    .select('content')
    .eq('tenant_id', tenantId)
    .eq('page_type', pageType)
    .eq('slug', slug)
    .maybeSingle()

  return (data?.content as LongformPage | undefined) || fallback
}
