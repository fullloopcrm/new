import { glossaryTerms } from '../_content/glossary'
import { glossaryTechnicalTerms } from '../_content/glossary-technical'
import { resources } from '../_content/resources'
import { faqItems } from '../_content/faq'

const SITE_URL = 'https://aeoisseo.com'
const TODAY = '2026-08-22'

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Full Loop CRM',
  url: 'https://fullloopcrm.com',
  logo: {
    '@type': 'ImageObject',
    url: 'https://fullloopcrm.com/logo.png',
  },
  email: 'hi@fullloopcrm.com',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+1-844-566-7276',
    contactType: 'customer service',
    email: 'hi@fullloopcrm.com',
    areaServed: 'US',
    availableLanguage: 'English',
  },
}

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: 'AEO Is SEO',
  description: 'A complete guide to the transition from SEO to Answer Engine Optimization.',
  inLanguage: 'en-US',
  publisher: { '@id': `${SITE_URL}/#organization` },
  isAccessibleForFree: true,
}

export const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  '@id': `${SITE_URL}/#breadcrumb`,
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'AEO Is SEO', item: SITE_URL },
  ],
}

export const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/#webpage`,
  url: SITE_URL,
  name: 'AEO Is SEO — The Complete Guide to Answer Engine Optimization',
  description:
    'The complete story of how search became AI, what Answer Engine Optimization actually means, how each AI platform really sources its answers, where organic lead generation is headed over the next five years — and every term involved, explained plainly.',
  isPartOf: { '@id': `${SITE_URL}/#website` },
  about: { '@id': `${SITE_URL}/#article` },
  mainEntity: { '@id': `${SITE_URL}/#article` },
  breadcrumb: { '@id': `${SITE_URL}/#breadcrumb` },
  inLanguage: 'en-US',
  datePublished: TODAY,
  dateModified: TODAY,
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.aeo-title', '.aeo-dek', '.aeo-faq-a'],
  },
}

// Entities this guide is genuinely about — real, stable, well-known reference
// points. Linking to them (sameAs) is exactly the "named-entity clarity"
// practice the guide itself teaches in Part Two.
const aboutEntities = [
  { name: 'Search engine optimization', sameAs: 'https://en.wikipedia.org/wiki/Search_engine_optimization' },
  { name: 'Artificial intelligence', sameAs: 'https://en.wikipedia.org/wiki/Artificial_intelligence' },
  { name: 'Large language model', sameAs: 'https://en.wikipedia.org/wiki/Large_language_model' },
  { name: 'Retrieval-augmented generation', sameAs: 'https://en.wikipedia.org/wiki/Retrieval-augmented_generation' },
  { name: 'PageRank', sameAs: 'https://en.wikipedia.org/wiki/PageRank' },
  { name: 'Knowledge graph', sameAs: 'https://en.wikipedia.org/wiki/Knowledge_graph' },
  { name: 'ChatGPT', sameAs: 'https://en.wikipedia.org/wiki/ChatGPT' },
  { name: 'Perplexity AI', sameAs: 'https://en.wikipedia.org/wiki/Perplexity_AI' },
].map((e) => ({ '@type': 'Thing', name: e.name, sameAs: e.sameAs }))

export const articleSchema = {
  '@context': 'https://schema.org',
  '@type': ['Article', 'LearningResource'],
  '@id': `${SITE_URL}/#article`,
  headline: 'AEO Is SEO',
  alternativeHeadline: 'The Complete Guide to Answer Engine Optimization',
  description:
    'Where SEO came from, what Answer Engine Optimization actually is, how each AI platform sources its answers, where organic lead generation is headed over the next five years, and every term involved — explained plainly.',
  url: SITE_URL,
  wordCount: 20000,
  inLanguage: 'en-US',
  datePublished: TODAY,
  dateModified: TODAY,
  author: { '@id': `${SITE_URL}/#organization` },
  publisher: { '@id': `${SITE_URL}/#organization` },
  mainEntityOfPage: { '@id': `${SITE_URL}/#webpage` },
  isAccessibleForFree: true,
  learningResourceType: 'Guide',
  educationalUse: 'Professional Development',
  about: aboutEntities,
  mentions: aboutEntities,
  keywords: [
    'AEO',
    'SEO',
    'answer engine optimization',
    'generative engine optimization',
    'GEO',
    'AI search',
    'AI Overviews',
    'what is answer engine optimization',
    'AEO vs SEO',
    'how to optimize for AI search',
    'how does ChatGPT search work',
    'retrieval augmented generation',
    'AI search optimization for lead generation',
    'agent experience optimization',
    'structured data for AI search',
    'AEO glossary',
    'SEO to AEO transition guide',
  ].join(', '),
}

export const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${SITE_URL}/#faq`,
  mainEntity: faqItems.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}

// The glossary IS a DefinedTermSet — schema.org's purpose-built type for
// exactly this content shape. Generated from the same data the visible
// glossary renders from, so schema and page can never drift apart.
export const glossaryDefinedTermSetSchema = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTermSet',
  '@id': `${SITE_URL}/#glossary`,
  name: 'AEO and AI Search Glossary',
  description: 'Every term used across this guide, explained in relation to AI and search.',
  hasDefinedTerm: [...glossaryTerms, ...glossaryTechnicalTerms].map((g) => ({
    '@type': 'DefinedTerm',
    name: g.term,
    description: g.definition,
    inDefinedTermSet: `${SITE_URL}/#glossary`,
  })),
}

// The 100 resources as a genuine ItemList, generated from the same data the
// visible resource list renders from.
export const resourcesItemListSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  '@id': `${SITE_URL}/#resources`,
  name: '100 Resources on AEO, Agentic AI, and the Future of Search',
  numberOfItems: resources.reduce((n, group) => n + group.items.length, 0),
  itemListElement: resources
    .flatMap((group) => group.items)
    .map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'WebSite',
        name: item.name,
        url: item.url,
        description: item.description,
      },
    })),
}

// The lead-gen playbook's six numbered priorities as a genuine HowTo.
export const leadgenHowToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  '@id': `${SITE_URL}/#howto`,
  name: 'How to Generate Organic Leads in the AI-Search Era',
  description: 'A six-step practical playbook for staying visible to both classic search and AI answer engines.',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Make sure you can still be found at all',
      text: 'Confirm your site is not blocking major AI crawlers (GPTBot, ClaudeBot, Google-Extended) in robots.txt, that core content renders without requiring JavaScript execution, and that the site loads fast without errors.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Answer the actual questions your leads are asking',
      text: 'Build content around the real, full-sentence questions your best customers ask, structured with the plain answer in the first sentence or two of each section.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Build genuine, verifiable trust signals on and off your site',
      text: 'Collect and respond to reviews on the platforms your customers actually use, and keep your business described consistently everywhere it appears.',
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Publish the original data you already have',
      text: 'Publish real pricing, real turnaround times, and real answers to edge-case questions — original, first-hand content is disproportionately valuable to AI retrieval.',
    },
    {
      '@type': 'HowToStep',
      position: 5,
      name: 'Track share of answer, not just rank and traffic',
      text: 'Periodically check how your business shows up when you ask ChatGPT, Perplexity, Google AI Overviews, and Claude the real questions a prospective customer would ask.',
    },
    {
      '@type': 'HowToStep',
      position: 6,
      name: 'Protect the direct relationship',
      text: 'Build and protect direct relationships — an email list, a referral program, a direct phone and text relationship — that no algorithm change can take away from you.',
    },
  ],
}

export const allSchemas = [
  organizationSchema,
  websiteSchema,
  breadcrumbSchema,
  webPageSchema,
  articleSchema,
  faqSchema,
  glossaryDefinedTermSetSchema,
  resourcesItemListSchema,
  leadgenHowToSchema,
]
