import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMetadata, breadcrumbSchema, SITE_NAME, SITE_URL } from '@/app/site/nyc-classifieds/_lib/seo'

export const metadata: Metadata = buildMetadata({
  title: `Legal — ${SITE_NAME}`,
  description: 'Legal information for NYC Classifieds including terms of service, disclaimers, liability limitations, and intellectual property notices.',
  path: '/legal',
})

export default function LegalPage() {
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Legal — ${SITE_NAME}`,
      description: 'Legal information for NYC Classifieds.',
      url: `${SITE_URL}/legal`,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    },
    breadcrumbSchema([{ name: 'Legal', url: '/legal' }]),
  ]

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(s) }} />
      ))}
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px 64px', fontFamily: "'DM Sans', sans-serif" }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          NYC Classifieds — Legal Information
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '32px' }}>
          Last updated: February 11, 2026
        </p>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Operator</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            {SITE_NAME} is operated as an independent platform serving New York City. For legal inquiries,
            contact us through the Feedback button on any page or email legal at thenycclassifieds dot com.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Disclaimers</h2>
          <p style={{ color: '#374151', lineHeight: 1.7, marginBottom: '12px' }}>
            {SITE_NAME} is a platform that connects users. We do not participate in, endorse, or guarantee any
            transactions between users. All listings, posts, and content are created by users and do not represent
            the views or endorsement of {SITE_NAME}.
          </p>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            While we require geo-verification for all users, we cannot guarantee the identity, intentions, or
            reliability of any user. Always exercise caution when conducting transactions. Meet in public places,
            use secure payment methods, and trust your judgment.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Limitation of Liability</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            {SITE_NAME} is provided &quot;as is&quot; without warranties of any kind, either express or implied. To the
            fullest extent permitted by law, {SITE_NAME} shall not be liable for any direct, indirect, incidental,
            consequential, or special damages arising from your use of the platform, including but not limited to
            damages from transactions, loss of data, or service interruptions.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Intellectual Property</h2>
          <p style={{ color: '#374151', lineHeight: 1.7, marginBottom: '12px' }}>
            The {SITE_NAME} name, logo, and platform design are the property of {SITE_NAME}. You may not
            use our branding without written permission.
          </p>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            Users retain ownership of content they post. By posting on {SITE_NAME}, you grant us a
            non-exclusive, royalty-free license to display your content on the platform and in connection
            with operating the service (such as search results and notifications).
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>DMCA &amp; Copyright</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            If you believe content on {SITE_NAME} infringes your copyright, please contact us with: (1) a
            description of the copyrighted work, (2) the URL of the infringing content, (3) your contact
            information, and (4) a statement that you have a good faith belief the use is unauthorized. We
            will respond to valid notices promptly.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Governing Law</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            These terms are governed by the laws of the State of New York. Any disputes arising from your
            use of {SITE_NAME} shall be resolved in the courts of New York County, New York.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Related Policies</h2>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li><Link href="/terms" style={{ color: '#2563eb' }}>Terms of Service</Link></li>
            <li><Link href="/privacy" style={{ color: '#2563eb' }}>Privacy Policy</Link></li>
            <li><Link href="/guidelines" style={{ color: '#2563eb' }}>Community Guidelines</Link></li>
          </ul>
        </section>
      </main>
    </>
  )
}
