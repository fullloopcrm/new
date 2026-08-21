import { SERVICES } from '@/app/site/wash-and-fold-nyc/_lib/seo/services'
import { PARENT_TAG, PARENT_BRAND_NAME, SITE_URL, PHONE_DISPLAY, EMAIL, BOOK_URL, GENERAL_FAQS } from './shared-content'
import type { WashFoldMicrositeConfig } from './types'

/** Same content shown on the page, in the llms.txt convention — plain text, no markup beyond markdown headers. */
export function generateWashFoldLlmsTxt(config: WashFoldMicrositeConfig): string {
  const url = `https://www.${config.domain}`
  const services = SERVICES
    .map(s => `- ${s.name} — ${s.description} Starting at ${s.priceRange}.`)
    .join('\n')
  const neighborhoods = config.featuredNeighborhoods.map(n => `- ${n}, ${config.borough}`).join('\n')
  const faqs = [...config.localFaqs, ...GENERAL_FAQS]
    .map(f => `**${f.question}**\n${f.answer}`)
    .join('\n\n')

  return `# ${config.brandName} (${PARENT_TAG})

> ${config.metaDescription}

## About
${config.introParagraphs[0] || ''}

## Contact
- Phone: ${PHONE_DISPLAY}
- Email: ${EMAIL}
- Available: 7 days a week, 7am-9pm
- Book Online: ${BOOK_URL}

## Pricing
- Wash & fold: $3/lb, $39 minimum.
- Free pickup & delivery on every order.
- Same-day rush: +$20 flat fee.
- Weekly subscription: 10% off. Biweekly: 5% off.
- No hidden fees, no distance surcharges, no neighborhood zones.

## Services (${SERVICES.length})
${services}

## Service Area — ${config.areaName} (${config.featuredNeighborhoods.length} neighborhoods featured)
${neighborhoods}

## Key Facts
- Licensed, bonded & insured in New York State.
- Every order processed in its own separate batch, hand-folded.
- Parent company: ${PARENT_BRAND_NAME} — ${SITE_URL}

## FAQ
${faqs}

## Links
- Homepage: ${url}
- Parent company: ${SITE_URL}
- Book Now: ${BOOK_URL}
- All Services: ${SITE_URL}/services
- All Locations: ${SITE_URL}/locations
- Pricing: ${SITE_URL}/pricing
- Reviews: ${SITE_URL}/reviews
`
}
