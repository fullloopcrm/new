import type { Metadata } from 'next'
import FaqAccordion from '@/components/marketing/faq-accordion'
import { faqs } from '@/lib/marketing/faqs'
import CtaSection from '@/components/marketing/cta-section'

export const metadata: Metadata = {
  title: 'FAQ — Full Loop CRM | 25 Questions Answered',
  description: 'Get answers to 25 common questions about Full Loop CRM — pricing, features, AI sales chatbot, exclusive territories, organic lead generation, GPS operations, and more for home service businesses.',
  keywords: ['Full Loop CRM FAQ', 'home service CRM questions', 'CRM pricing FAQ', 'AI sales chatbot FAQ', 'exclusive territory CRM', 'home service business FAQ'],
  openGraph: {
    title: 'FAQ — Full Loop CRM | 25 Questions Answered',
    description: 'Everything home service business owners want to know about Full Loop CRM — 25 answers about pricing, features, territories, and more.',
    url: 'https://fullloopcrm.com/faq',
    siteName: 'Full Loop CRM',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ — Full Loop CRM | 25 Questions Answered',
    description: 'Everything home service business owners want to know about Full Loop CRM.',
  },
  alternates: {
    canonical: 'https://fullloopcrm.com/faq',
  },
}

export default function FaqPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://fullloopcrm.com' },
      { '@type': 'ListItem', position: 2, name: 'FAQ', item: 'https://fullloopcrm.com/faq' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section style={{padding: '8rem 2rem 4rem', textAlign: 'center', background: 'var(--gray-50)'}} aria-label="FAQ introduction">
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <h1 style={{fontSize: 'clamp(2.4rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '1rem'}}>Everything Home Service Business Owners Want to Know</h1>
          <p style={{color: 'var(--gray-500)', fontSize: '1.15rem', lineHeight: 1.7}}>25 answers to the most common questions about Full Loop CRM — organic lead generation, AI sales chatbots, exclusive territories, pricing, and running your entire business on autopilot.</p>
        </div>
      </section>

      <section className="alt-bg" style={{padding: '6rem 2rem'}} aria-label="Frequently asked questions">
        <div className="section-container">
          <FaqAccordion />
        </div>
      </section>

      <CtaSection heading="Still have questions?" description="Text us, call us, or apply for partnership — we'll answer anything you want to know." />
    </>
  )
}
