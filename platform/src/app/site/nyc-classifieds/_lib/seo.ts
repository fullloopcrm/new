// @ts-nocheck
// Stub: scaffold-only in nycmaid source. Minimal exports to unblock render.
// Replace with real schema builders when nyc-classifieds becomes a live tenant.

import type { Metadata } from 'next'

export const SITE_NAME = 'NYC Classifieds'
export const SITE_URL = 'https://nyc-classifieds.com'

export const websiteSchema = (..._args: unknown[]) => ({ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: SITE_URL })
export const organizationSchema = (..._args: unknown[]) => ({ '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: SITE_URL })
export const faqSchema = (faqs: Array<{ q?: string; a?: string }> = []) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })
export const collectionPageSchema = (..._args: unknown[]) => ({ '@context': 'https://schema.org', '@type': 'CollectionPage' })
export const speakableSchema = (..._args: unknown[]) => ({ '@context': 'https://schema.org', '@type': 'WebPage' })
export const howToSchema = (..._args: unknown[]) => ({ '@context': 'https://schema.org', '@type': 'HowTo' })
export const itemListSchema = (..._args: unknown[]) => ({ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: [] })
export const offerCatalogSchema = (..._args: unknown[]) => ({ '@context': 'https://schema.org', '@type': 'OfferCatalog' })
export const siteNavigationSchema = (..._args: unknown[]) => ({ '@context': 'https://schema.org', '@type': 'SiteNavigationElement' })
export const breadcrumbSchema = (crumbs: Array<{ name: string; url: string }> = []) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })) })

export function buildMetadata(opts?: { title?: string; description?: string; path?: string; canonical?: string }): Metadata {
  return {
    title: opts?.title || SITE_NAME,
    description: opts?.description || SITE_NAME,
  }
}

export const articleSchema = (..._args: unknown[]) => ({ '@context': 'https://schema.org', '@type': 'Article' })
export const placeSchema = (..._args: unknown[]) => ({ '@context': 'https://schema.org', '@type': 'Place' })

export function getCategorySeo(_args?: Record<string, unknown>): { title: string; description: string; h1?: string } {
  return { title: SITE_NAME, description: SITE_NAME }
}

export function getLongTailH1(_args?: Record<string, unknown>): string {
  return SITE_NAME
}

export function getSecondarySchemas(..._args: unknown[]): unknown[] {
  return []
}
