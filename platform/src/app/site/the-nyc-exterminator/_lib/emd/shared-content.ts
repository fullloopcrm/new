import type { LocalFAQ } from './types'

export const PARENT_TAG = 'An NYC Exterminator Company'
export const PARENT_BRAND_NAME = 'The NYC Exterminator'
export const SITE_URL = 'https://www.thenycexterminator.com'
export const PHONE_DISPLAY = '(212) 202-8545'
export const PHONE_SMS = 'sms:2122028545'
export const EMAIL = 'hello@thenycexterminator.com'
export const BOOK_URL = `${SITE_URL}/book/new`
export const QUOTE_URL = `${SITE_URL}/quote-request`
export const REVIEWS_URL = `${SITE_URL}/reviews`
export const PRIVACY_URL = `${SITE_URL}/privacy-policy`

// Verbatim from thenycexterminator.com's own published pricing page + homepage FAQ —
// reused here rather than invented, so every claim on the microsite traces back to
// something the parent site already states publicly.
export const GENERAL_FAQS: LocalFAQ[] = [
  {
    question: 'How much does pest control cost in NYC?',
    answer:
      'We charge one flat rate: $199/hr, 1-hour minimum, no matter the pest type, severity, property size, or treatment method — residential or commercial. Every pest control engagement at The NYC Exterminator begins with an inspection and a written estimate, so you always know exactly what you will pay before any work begins.',
  },
  {
    question: 'Do you charge for pest inspections?',
    answer:
      'No. Every pest control engagement starts with a no-obligation inspection. Our licensed exterminator will visit your property, identify the pest species present, assess the severity of the infestation, locate entry points and breeding sites, and provide you with a detailed written quote. There is never a charge for this initial inspection, whether you are a residential homeowner, a renter, a commercial property owner, or a restaurant operator.',
  },
  {
    question: 'Are there hidden fees or extra charges after the initial quote?',
    answer:
      'Absolutely not. The NYC Exterminator operates on a fully transparent pricing model. The written quote you receive after your inspection is the exact price you will pay. We do not add fuel surcharges, equipment rental fees, product upcharges, or surprise add-ons after the fact.',
  },
  {
    question: 'Is a monthly pest control maintenance plan worth the cost?',
    answer:
      'For most NYC properties, a monthly or quarterly pest control maintenance plan is significantly more cost-effective than calling an exterminator reactively each time a pest problem arises. A monthly maintenance plan at $50 to $125 per month provides year-round comprehensive pest coverage and prevents infestations before they start.',
  },
  {
    question: 'How much does emergency pest control cost in NYC?',
    answer:
      'Emergency pest control services range from $200 to $500 depending on the pest type, urgency, and timing. Same-day service during business hours adds approximately $50 to the standard treatment rate. Customers on monthly or quarterly maintenance plans receive emergency callbacks at no additional surcharge.',
  },
  {
    question: 'Do you offer discounts for multi-unit buildings?',
    answer:
      'Yes. We offer significant volume discounts for multi-unit residential buildings, co-ops, condominiums, and commercial properties with multiple locations. Our building-wide treatment programs are priced per unit at rates substantially below individual apartment treatment costs.',
  },
  {
    question: 'What payment methods do you accept for pest control services?',
    answer:
      'We accept all major credit cards, debit cards, personal and business checks, and bank transfers. For commercial pest control accounts and maintenance plan customers, we offer monthly invoicing with net-30 payment terms.',
  },
  {
    question: "Does homeowner's insurance cover pest control costs?",
    answer:
      "In most cases, standard homeowner's insurance does not cover pest control, since infestations are generally classified as a maintenance issue. In NYC rental apartments, landlords are legally required to provide and pay for pest control under the NYC Housing Maintenance Code — if you're a renter, your landlord is typically responsible for the cost.",
  },
  {
    question: 'What is included in the price of a pest control treatment?',
    answer:
      'Every treatment includes a comprehensive property inspection, a customized treatment plan using EPA-approved products, the complete treatment application by a licensed exterminator, at least one follow-up inspection within two to four weeks, re-treatment at no additional charge if needed, and our satisfaction guarantee.',
  },
  {
    question: 'How does commercial pest control pricing differ from residential?',
    answer:
      'Commercial pricing is based on square footage, industry type, service frequency, and documentation needs. A small retail space under 2,000 sq ft might pay $150-300/month; restaurants and food service run $200-600/month with DOH-compliant documentation; large commercial spaces can range from $400-2,000/month.',
  },
  {
    question: 'How fast can you get someone out?',
    answer:
      'For standard appointments, we typically schedule within 24-48 hours. For emergency pest control situations — active wasp nests, large rodent infestations, or bed bug discoveries — we offer same-day service and can often have a licensed exterminator at your door within a few hours.',
  },
  {
    question: 'Do you offer pest control maintenance plans?',
    answer:
      'Yes. We offer monthly, bi-monthly, and quarterly pest control maintenance plans for both residential and commercial properties. Plans include scheduled inspections, preventive treatments, and unlimited callbacks between visits if any pests return.',
  },
  {
    question: 'What should I do to prepare for a pest control treatment?',
    answer:
      'Preparation varies by treatment type. For general pest control, clear areas under sinks, clean kitchen surfaces, and remove pet food and water dishes. For bed bug treatment, launder bedding on high heat and declutter around bed frames. Our team provides detailed instructions specific to your treatment when you book.',
  },
  {
    question: 'Do you guarantee your pest control work?',
    answer:
      'Yes. If pests return between scheduled treatments or within our guarantee period, we come back and re-treat at no additional charge. General pest control carries a 30-day guarantee, while specialized treatments like bed bug heat treatment include a 90-day guarantee.',
  },
]
