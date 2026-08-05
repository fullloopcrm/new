import { SERVICES } from '../seo/services'
import type { EmdMicrositeConfig } from './types'

const PARENT_TAG = 'A Florida Maid Services Company'
const PHONE_DISPLAY = '(954) 710-3636'
const BOOK_URL = 'https://www.thefloridamaid.com/book-now'

/** Same content shown on the page, in the llms.txt convention — plain text, no markup beyond markdown headers, nothing not already stated on the page itself. */
export function generateEmdLlmsTxt(config: EmdMicrositeConfig): string {
  const url = `https://www.${config.domain}`
  const neighborhoods = config.neighborhoods.map(n => `- ${n.name}`).join('\n')
  const services = SERVICES.map(s => `- ${s.name} — ${s.description}`).join('\n')
  const faqs = config.faqs.map(f => `**${f.question}**\n${f.answer}`).join('\n\n')

  return `# ${config.brandName} (${PARENT_TAG})

> ${config.metaDescription}

## About
${config.introParagraphs[0] || ''}

## Contact
- Phone: ${PHONE_DISPLAY}
- Email: hi@thefloridamaid.com
- Hours: Monday-Saturday, 7am-7pm
- Book Online: ${BOOK_URL}

## Services
${services}

## Pricing
- Client Supplies & Equipment: $49/hr — You provide the cleaning supplies and equipment, we bring the expertise.
- We Bring Everything: $59/hr — We bring all supplies and professional-grade equipment.
- Same-Day / Emergency: $89/hr — Dispatched to your door within hours.
- 2-hour minimum on all bookings.

## Service Area
${config.city}, FL and surrounding neighborhoods:
${neighborhoods}

## Key Facts
- Rating: 5.0 stars on Google
- Licensed, bonded, and insured (up to $1,000,000)
- Background-checked cleaners
- Parent company: The Florida Maid — over 25,000 homes served statewide since 2018

## FAQ
${faqs}

## Links
- Homepage: ${url}
- Book Now: ${BOOK_URL}
- Parent company: https://www.thefloridamaid.com
`
}
