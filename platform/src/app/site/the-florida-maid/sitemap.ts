/**
 * The Florida Maid rich sitemap — now a thin wrapper over the shared
 * multi-tenant sitemap engine. The actual URL set lives in the tenant
 * descriptor at src/lib/seo/tenants/the-florida-maid.ts so the logic is shared
 * across all tenants instead of forked per site.
 *
 * Served at /site/the-florida-maid/sitemap.xml; middleware rewrites the apex
 * /sitemap.xml here (the-florida-maid is in TENANTS_WITH_RICH_SITEMAP).
 */
import type { MetadataRoute } from 'next'
import { buildTenantSitemap, TENANT_SEO } from '@/lib/seo/tenant-seo'

export default function sitemap(): MetadataRoute.Sitemap {
  return buildTenantSitemap(TENANT_SEO['the-florida-maid'])
}
