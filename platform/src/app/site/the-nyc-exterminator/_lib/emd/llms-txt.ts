import { getAllServices, getAllNeighborhoods } from '../data'
import { getAllTips } from '../../_data/tips'
import { PARENT_TAG, PARENT_BRAND_NAME, SITE_URL, PHONE_DISPLAY, EMAIL, BOOK_URL, QUOTE_URL, GENERAL_FAQS } from './shared-content'
import type { NeighborhoodMicrositeConfig } from './types'

/** Same content shown on the page, in the llms.txt convention — plain text, no markup beyond markdown headers. */
export function generateNeighborhoodLlmsTxt(config: NeighborhoodMicrositeConfig): string {
  const url = `https://www.${config.domain}`
  const services = getAllServices()
    .map(s => `- ${s.name} (${s.category}) — ${s.description} Starting at ${s.priceRange}.`)
    .join('\n')
  const neighborhoods = getAllNeighborhoods()
    .map(n => `- ${n.name}, ${n.region}`)
    .join('\n')
  const tips = getAllTips()
    .map(t => `- ${t.title} (${t.category})`)
    .join('\n')
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
- Available: 24/7
- Request a Quote: ${QUOTE_URL}
- Book Online: ${BOOK_URL}

## Pricing
- Flat rate: $199/hr, 1-hour minimum, every pest type, residential or commercial.
- Free inspection and written estimate before any work begins.
- No hidden fees, no fuel surcharges, no upcharges.
- Monthly/quarterly maintenance plans: $50-$125/month.

## Services (${services.split('\n').length})
${services}

## Service Area (${neighborhoods.split('\n').length} neighborhoods across NYC, NJ, Long Island & Westchester)
${neighborhoods}

## Pest Control Tips
${tips}

## Key Facts
- Licensed: NYS DEC Commercial Pesticide Applicator licenses.
- Fully insured pest control.
- Parent company: ${PARENT_BRAND_NAME} — ${SITE_URL}

## FAQ
${faqs}

## Links
- Homepage: ${url}
- Parent company: ${SITE_URL}
- Request a Quote: ${QUOTE_URL}
- Book Now: ${BOOK_URL}
- All Services: ${SITE_URL}/services
- All Neighborhoods: ${SITE_URL}/areas
- Pest Control Tips: ${SITE_URL}/pest-control-tips
- Reviews: ${SITE_URL}/reviews
`
}
