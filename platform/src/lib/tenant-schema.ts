// Schema.org structured data generators for tenant sites

interface TenantBase {
  name: string
  phone?: string
  email?: string
  address?: string
  website_url?: string
  slug?: string
  industry?: string
  tagline?: string
  logo_url?: string
}

interface ServiceType {
  name: string
  description?: string
  default_hourly_rate?: number
  default_duration_hours?: number
}

/**
 * LocalBusiness schema — primary schema for the home page
 */
export function tenantLocalBusinessSchema(
  tenant: TenantBase,
  services: ServiceType[],
  areas: string[]
) {
  const url = tenant.website_url || `https://${tenant.slug}.fullloopcrm.com`

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: tenant.name,
    url,
    ...(tenant.phone && { telephone: tenant.phone }),
    ...(tenant.email && { email: tenant.email }),
    ...(tenant.tagline && { description: tenant.tagline }),
    ...(tenant.logo_url && { logo: tenant.logo_url }),
  }

  if (tenant.address) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: tenant.address,
    }
  }

  if (areas.length > 0) {
    schema.areaServed = areas.map((a) => ({
      '@type': 'City',
      name: a,
    }))
  }

  if (services.length > 0) {
    schema.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: services.map((s) => {
        const offer: Record<string, unknown> = {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: s.name,
            ...(s.description && { description: s.description }),
          },
        }
        if (s.default_hourly_rate != null) {
          offer.priceSpecification = {
            '@type': 'UnitPriceSpecification',
            price: s.default_hourly_rate,
            priceCurrency: 'USD',
            unitText: 'HOUR',
          }
        }
        return offer
      }),
    }
  }

  return schema
}

/**
 * Single Service schema — for /services/[slug] pages
 */
export function tenantServiceSchema(tenant: TenantBase, service: ServiceType) {
  const url = tenant.website_url || `https://${tenant.slug}.fullloopcrm.com`

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    ...(service.description && { description: service.description }),
    provider: {
      '@type': 'LocalBusiness',
      name: tenant.name,
      url,
    },
    ...(service.default_hourly_rate != null && {
      offers: {
        '@type': 'Offer',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: service.default_hourly_rate,
          priceCurrency: 'USD',
          unitText: 'HOUR',
        },
      },
    }),
    areaServed: {
      '@type': 'Country',
      name: 'US',
    },
  }
}

/**
 * JobPosting schema — for /careers/[slug] pages
 */
export function tenantJobPostingSchema(
  tenant: TenantBase,
  area: string,
  payRange?: { min?: number; max?: number }
) {
  const url = tenant.website_url || `https://${tenant.slug}.fullloopcrm.com`
  const industry = tenant.industry || 'Professional Services'

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: `${industry} Professional — ${area}`,
    description: `Join ${tenant.name} as a ${industry.toLowerCase()} professional serving ${area}. Flexible hours, competitive pay, and a supportive team.`,
    datePosted: new Date().toISOString().split('T')[0],
    validThrough: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    employmentType: ['FULL_TIME', 'PART_TIME'],
    hiringOrganization: {
      '@type': 'Organization',
      name: tenant.name,
      sameAs: url,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: area,
        addressCountry: 'US',
      },
    },
  }

  if (payRange?.min || payRange?.max) {
    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: {
        '@type': 'QuantitativeValue',
        ...(payRange.min != null && { minValue: payRange.min }),
        ...(payRange.max != null && { maxValue: payRange.max }),
        unitText: 'HOUR',
      },
    }
  }

  return schema
}

/**
 * FAQ schema — for pages with FAQ sections
 */
export function tenantFAQSchema(questions: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  }
}

/**
 * BreadcrumbList schema — for navigation context
 */
export function tenantBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * WebPage schema — generic page wrapper
 */
export function tenantWebPageSchema(
  title: string,
  description: string,
  url: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
  }
}

/**
 * AggregateRating schema — for review summary
 */
export function tenantAggregateRatingSchema(
  tenant: TenantBase,
  ratingValue: number,
  reviewCount: number
) {
  return {
    '@type': 'AggregateRating',
    ratingValue: ratingValue.toFixed(1),
    bestRating: '5',
    worstRating: '1',
    reviewCount,
  }
}

/**
 * Helper: generate dynamic FAQ questions based on industry and services
 */
export function generateTenantFAQs(
  tenant: TenantBase,
  services: ServiceType[],
  areas: string[]
): Array<{ q: string; a: string }> {
  const name = tenant.name
  const industry = tenant.industry || 'professional services'
  const serviceNames = services.map((s) => s.name)
  const serviceList = serviceNames.length > 0 ? serviceNames.join(', ') : industry
  const areaList = areas.length > 0 ? areas.slice(0, 5).join(', ') : 'your area'
  const minRate = services
    .map((s) => s.default_hourly_rate)
    .filter((r): r is number => r != null && r > 0)
    .sort((a, b) => a - b)[0]

  const faqs: Array<{ q: string; a: string }> = [
    {
      q: `What services does ${name} offer?`,
      a: `We offer ${serviceList}. All of our services come with a satisfaction guarantee.`,
    },
    {
      q: `What areas does ${name} serve?`,
      a: `We proudly serve ${areaList}${areas.length > 5 ? ' and more' : ''}. Contact us to confirm availability in your area.`,
    },
    {
      q: 'How do I book an appointment?',
      a: `You can book online through our website 24/7, call or text us${tenant.phone ? ` at ${tenant.phone}` : ''}, or use our AI chat assistant for instant booking.`,
    },
    {
      q: `How much does ${industry} cost?`,
      a: minRate
        ? `Our rates start at $${minRate}/hour. Final pricing depends on the specific service and scope of work. Contact us for a free estimate.`
        : `Pricing varies based on the service and scope of work. Contact us for a free, no-obligation estimate.`,
    },
    {
      q: 'Are you licensed and insured?',
      a: `Yes, ${name} is fully licensed and insured. We carry comprehensive liability insurance for your peace of mind.`,
    },
    {
      q: 'Do you offer a satisfaction guarantee?',
      a: 'Absolutely. We stand behind our work with a 100% satisfaction guarantee. If you are not happy with the results, we will make it right.',
    },
    {
      q: 'What is your cancellation policy?',
      a: 'We understand plans change. We ask for at least 24 hours notice for cancellations. Please contact us as soon as possible if you need to reschedule.',
    },
    {
      q: 'Are your team members background-checked?',
      a: `Yes, every team member at ${name} undergoes a thorough background check before they are approved to work. Your safety is our priority.`,
    },
    {
      q: 'Can I request the same team member each time?',
      a: 'Yes! We encourage recurring clients to request their preferred team member. We will do our best to accommodate your preference.',
    },
    {
      q: 'Do I need to provide any supplies or equipment?',
      a: 'No. Our team arrives fully equipped with all professional-grade supplies and equipment needed to complete the job.',
    },
  ]

  return faqs
}
