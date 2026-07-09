import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import {
  industries,
  metros,
  getAllCombos,
  generateIndustrySlug,
  generateLocationSlug,
} from '@/lib/marketing/combos'
import { STATES as JUNK_STATES } from '@/app/site/we-pay-you-junk/_data/cities'
import { SERVICES as JUNK_SERVICES } from '@/app/site/we-pay-you-junk/_data/services'
import { CUSTOMER_TYPES as JUNK_CUSTOMER_TYPES } from '@/app/site/we-pay-you-junk/_data/customer-types'
import { BLOG_POSTS as JUNK_BLOG_POSTS } from '@/app/site/we-pay-you-junk/_data/blog-posts'

// We Pay You Junk Removal — its own domain serves its own bespoke site, so
// /sitemap.xml on that host must emit ITS urls, not the platform's. Covers all
// static pages, 34 services, 50 states, 902 cities, city×service combos,
// customer-type pages, and careers. The who-we-serve × city tier is omitted to
// stay well under the 50k-URL sitemap limit; those pages remain link-crawlable
// from the customer-type + city pages.
function junkSitemap(now: Date): MetadataRoute.Sitemap {
  const base = 'https://www.wepayyoujunkremoval.com'
  const staticPaths = [
    { p: '', cf: 'daily' as const, pr: 1.0 },
    { p: '/pricing', cf: 'weekly' as const, pr: 0.9 },
    { p: '/services', cf: 'weekly' as const, pr: 0.9 },
    { p: '/book-junk-removal-service-today', cf: 'weekly' as const, pr: 0.9 },
    { p: '/who-we-serve', cf: 'weekly' as const, pr: 0.8 },
    { p: '/locations', cf: 'weekly' as const, pr: 0.8 },
    { p: '/about', cf: 'monthly' as const, pr: 0.7 },
    { p: '/faq', cf: 'monthly' as const, pr: 0.7 },
    { p: '/commercial', cf: 'monthly' as const, pr: 0.7 },
    { p: '/careers', cf: 'weekly' as const, pr: 0.7 },
    { p: '/apply-for-junk-removal-job', cf: 'weekly' as const, pr: 0.7 },
    { p: '/franchise', cf: 'monthly' as const, pr: 0.6 },
    { p: '/blog', cf: 'weekly' as const, pr: 0.6 },
    { p: '/contact-we-pay-you-junk-removal-today', cf: 'monthly' as const, pr: 0.6 },
  ]
  const urls: MetadataRoute.Sitemap = staticPaths.map((s) => ({
    url: `${base}${s.p}`,
    lastModified: now,
    changeFrequency: s.cf,
    priority: s.pr,
  }))

  for (const svc of JUNK_SERVICES) {
    urls.push({ url: `${base}/services/${svc.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 })
  }
  for (const post of JUNK_BLOG_POSTS) {
    urls.push({ url: `${base}/blog/${post.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 })
  }
  for (const ct of JUNK_CUSTOMER_TYPES) {
    urls.push({ url: `${base}/who-we-serve/${ct.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 })
  }
  for (const st of JUNK_STATES) {
    urls.push({ url: `${base}/locations/${st.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 })
    urls.push({ url: `${base}/careers/${st.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 })
    for (const ct of JUNK_CUSTOMER_TYPES) {
      urls.push({ url: `${base}/who-we-serve/${ct.slug}/${st.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 })
    }
    for (const city of st.cities) {
      urls.push({ url: `${base}/locations/${st.slug}/${city.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 })
      urls.push({ url: `${base}/careers/${st.slug}/${city.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 })
      for (const svc of JUNK_SERVICES) {
        urls.push({ url: `${base}/locations/${st.slug}/${city.slug}/${svc.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 })
      }
    }
  }

  return urls
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Tenant sites on their own domain get their own sitemap.
  const h = await headers()
  const host = (h.get('host') || '').split(':')[0].toLowerCase()
  if (host.includes('wepayyoujunkremoval')) {
    return junkSitemap(now)
  }

  const baseUrl = 'https://homeservicesbusinesscrm.com'

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/full-loop-crm-service-features`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/full-loop-crm-service-business-industries`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/home-service-crm-locations`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/full-loop-crm-pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/why-you-should-choose-full-loop-crm-for-your-business`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/partner-with-full-loop-crm`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/about-full-loop-crm`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/full-loop-crm-frequently-asked-questions`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/full-loop-crm-101-educational-tips`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/home-service-business-blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/home-service-business-blog/autonomous-home-service-business-2026`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/home-service-business-blog/home-service-business-without-the-overhead`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/home-service-business-blog/how-to-get-more-leads-home-service-2026`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/home-service-business-blog/hiring-retention-home-service-2026`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/home-service-business-blog/pricing-home-service-2026`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/agreement`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/privacy-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/accessibility`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const industryPages: MetadataRoute.Sitemap = industries.map((i) => ({
    url: `${baseUrl}/industry/${generateIndustrySlug(i)}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const locationPages: MetadataRoute.Sitemap = metros.map((m) => ({
    url: `${baseUrl}/location/${generateLocationSlug(m)}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const combos = getAllCombos()
  const comboPages: MetadataRoute.Sitemap = combos.map((c) => ({
    url: `${baseUrl}/${c.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  return [...staticPages, ...industryPages, ...locationPages, ...comboPages]
}
