import type { Metadata } from 'next'
import CtaSection from '@/components/marketing/cta-section'

export const metadata: Metadata = {
  title: 'About Full Loop CRM — Built by a 20-Year Industry Veteran',
  description: 'Full Loop CRM was built by a 20+ year veteran of home services, business development, web design, SEO, and organic lead generation. Not a Silicon Valley startup — a real operator who lived it.',
  keywords: ['about Full Loop CRM', 'home service CRM founder', 'CRM built by industry veteran', 'home service business consulting', 'organic lead generation expert'],
  openGraph: {
    title: 'About Full Loop CRM — Built by a 20-Year Industry Veteran',
    description: 'Built by someone who actually ran cleaning crews, ranked domains, and scaled operations for 20+ years.',
    url: 'https://fullloopcrm.com/about',
    siteName: 'Full Loop CRM',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Full Loop CRM — Built by a 20-Year Industry Veteran',
    description: 'Built by someone who actually ran cleaning crews, ranked domains, and scaled operations for 20+ years.',
  },
  alternates: {
    canonical: 'https://fullloopcrm.com/about',
  },
}

export default function AboutPage() {
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    jobTitle: 'Founder',
    description: '20+ year veteran in home services, business development, web design, SEO, organic lead generation, and business growth strategy',
    knowsAbout: [
      'Home service business operations',
      'Organic SEO and lead generation',
      'Web design and development',
      'Business development and growth strategy',
      'AI-powered sales automation',
      'Field service management',
      'Multi-market scaling',
    ],
    worksFor: {
      '@type': 'Organization',
      name: 'Full Loop CRM',
      url: 'https://fullloopcrm.com',
    },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://fullloopcrm.com' },
      { '@type': 'ListItem', position: 2, name: 'About', item: 'https://fullloopcrm.com/about' },
    ],
  }

  const aboutPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Full Loop CRM',
    description: 'The story behind Full Loop CRM — built by a 20+ year veteran of home services.',
    url: 'https://fullloopcrm.com/about',
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }} />

      <section style={{padding: '8rem 2rem 4rem', textAlign: 'center', background: 'var(--gray-50)'}} aria-label="About introduction">
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <h1 style={{fontSize: 'clamp(2.4rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '1rem'}}>Built by Someone Who&apos;s Actually Done the Work</h1>
          <p style={{color: 'var(--gray-500)', fontSize: '1.15rem', lineHeight: 1.7}}>Full Loop CRM wasn&apos;t built in a Silicon Valley boardroom. It was built by someone who ran the crews, answered the phones, ranked the domains, and scaled the operations.</p>
        </div>
      </section>

      <section className="founder-section" aria-label="Founder story">
        <div className="founder-container">
          <h2>20+ Years of Real Experience</h2>
          <p>Full Loop CRM was built by a 20+ year veteran of home services, business development, web design, SEO, and organic lead generation — someone who&apos;s personally run cleaning crews, answered the phones, built the websites, ranked the domains, and scaled the operations. Someone who&apos;s failed, learned, pivoted, and built again.</p>
          <p>After years of duct-taping together scheduling apps, CRM tools, payment platforms, lead trackers, email services, SMS tools, and spreadsheets — the frustration boiled over. None of these tools talked to each other. None of them understood the full picture. None of them generated a single lead. So we built the platform we always needed — and we made it exclusive.</p>
          <p>When you partner with Full Loop CRM, you don&apos;t just get software. You get the consulting guidance and operational experience of someone who has been exactly where you are — building a home service business from the ground up. The wins, the losses, the hard lessons. That&apos;s what makes this different. We&apos;re not selling you a subscription. We&apos;re investing in your market alongside you.</p>
          <p>Full Loop CRM is only available to one service provider per trade per metro area. First come, first serve. If you&apos;re the kind of business owner who values organic growth over shortcuts, long-term partnerships over quick fixes, and real guidance over generic support tickets — we want to hear from you.</p>
          <div className="founder-credentials">
            <span className="credential">20+ Years in Home Services</span>
            <span className="credential">Business Development</span>
            <span className="credential">Web Design &amp; Development</span>
            <span className="credential">SEO &amp; Organic Lead Gen</span>
            <span className="credential">Business Growth Consulting</span>
            <span className="credential">Operations Management</span>
            <span className="credential">Multi-Market Scaling</span>
            <span className="credential">Real Failures &amp; Real Wins</span>
          </div>
        </div>
      </section>

      <section style={{padding: '6rem 2rem'}} aria-label="Our mission">
        <div className="section-container" style={{maxWidth: '800px', textAlign: 'center'}}>
          <h2 style={{fontSize: 'clamp(2rem, 3.5vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '1.5rem'}}>Why We Built This</h2>
          <p style={{color: 'var(--gray-600)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '1.25rem'}}>Every home service business owner we&apos;ve met is juggling 5-10 different tools that don&apos;t talk to each other. They&apos;re spending $3,000/month on Google Ads that disappear the moment they stop paying. They have no idea which of their websites actually drives revenue. Their team portal doesn&apos;t support Spanish. Their payroll takes 3 hours a week.</p>
          <p style={{color: 'var(--gray-600)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '1.25rem'}}>We built Full Loop CRM to solve all of that — in one platform, with one login, and zero integrations. And we made it exclusive because the organic lead generation strategy only works when one partner owns their market.</p>
          <p style={{color: 'var(--gray-700)', fontSize: '1.1rem', lineHeight: 1.8, fontWeight: 600}}>This is not a SaaS subscription. This is infrastructure, consulting, and a long-term partnership. Built by someone who&apos;s lived every stage of running a home service business.</p>
        </div>
      </section>

      <CtaSection heading="Want to hear the full story?" description="Apply for partnership and we'll walk you through the platform live — and tell you everything we learned building it." />
    </>
  )
}
