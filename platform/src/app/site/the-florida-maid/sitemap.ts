/**
 * The Florida Maid sitemap — thin wrapper over the shared multi-tenant sitemap
 * engine. Enumerates statics + 11 area pages + neighborhood service pages +
 * neighborhood job pages (the 567 individual /available-florida-maid-jobs/[slug]
 * postings). Descriptor lives at src/lib/seo/tenants/the-florida-maid.ts,
 * registered via the side-effect import in src/lib/seo/tenant-seo.ts.
 */
import type { MetadataRoute } from 'next'
import { TENANT_SEO, buildTenantSitemap } from '@/lib/seo/tenant-seo'

export default function sitemap(): MetadataRoute.Sitemap {
  return buildTenantSitemap(TENANT_SEO['the-florida-maid'])
}
