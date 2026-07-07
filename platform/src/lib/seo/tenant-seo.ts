/**
 * Barrel for the shared tenant-SEO system. Import THIS (not tenant-sitemap.ts
 * directly) from consumers — it loads every tenant descriptor for its side
 * effect (registration into TENANT_SEO) before re-exporting the engine API.
 *
 * To onboard a tenant: add `src/lib/seo/tenants/<slug>.ts` (calls
 * registerTenantSeo with that tenant's data) and one import line below.
 */
import './tenants/the-florida-maid'
import './tenants/the-home-services-company'
import './tenants/we-pay-you-junk'

export { TENANT_SEO, buildTenantSitemap, registerTenantSeo } from './tenant-sitemap'
export type { TenantSeoDescriptor, UrlSpec, ChangeFreq } from './tenant-sitemap'
