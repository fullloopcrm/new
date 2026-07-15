import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMetadata, breadcrumbSchema, SITE_NAME, SITE_URL } from '@/app/site/nyc-classifieds/_lib/seo'

export const metadata: Metadata = buildMetadata({
  title: `Terms of Service — ${SITE_NAME}`,
  description: 'Terms of service for NYC Classifieds. Rules for using the platform, account requirements, content policies, and user responsibilities.',
  path: '/terms',
})

export default function TermsPage() {
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Terms of Service — ${SITE_NAME}`,
      description: 'Terms of service for NYC Classifieds.',
      url: `${SITE_URL}/terms`,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    },
    breadcrumbSchema([{ name: 'Terms of Service', url: '/terms' }]),
  ]

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s).replace(/</g, '\\u003c') }} />
      ))}
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px 64px', fontFamily: "'DM Sans', sans-serif" }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          NYC Classifieds — Terms of Service
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '32px' }}>
          Last updated: February 11, 2026
        </p>

        <p style={{ color: '#374151', lineHeight: 1.7, marginBottom: '24px' }}>
          By using {SITE_NAME}, you agree to these terms. If you don&apos;t agree, please don&apos;t use the platform.
          We&apos;ve written these to be clear, not to bury things in legalese.
        </p>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>1. Eligibility</h2>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>You must be at least 18 years old to use {SITE_NAME}.</li>
            <li>You must be physically located in New York City to create an account (verified via geo-verification).</li>
            <li>You may only create one account. Multiple accounts are prohibited.</li>
            <li>You are responsible for keeping your account credentials secure.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>2. Verification</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            All users must complete our geo-verification process (selfie + GPS check) before posting.
            By completing verification, you confirm that you are a real person and that you are physically
            located in New York City. Attempting to spoof, bypass, or fraudulently complete verification
            will result in an immediate permanent ban.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>3. Your Content</h2>
          <p style={{ color: '#374151', lineHeight: 1.7, marginBottom: '12px' }}>
            You own the content you post on {SITE_NAME}. By posting, you grant us a non-exclusive, royalty-free
            license to display, distribute, and promote your content on and in connection with the platform.
          </p>
          <p style={{ color: '#374151', lineHeight: 1.7, marginBottom: '12px' }}>
            You are solely responsible for your content. You agree that your posts will:
          </p>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>Be truthful and not misleading</li>
            <li>Not violate any laws or regulations</li>
            <li>Not infringe on anyone&apos;s intellectual property</li>
            <li>Not contain illegal items, services, or offers</li>
            <li>Not include spam, duplicate listings, or manipulative content</li>
            <li>Comply with our <Link href="/guidelines" style={{ color: '#2563eb' }}>Community Guidelines</Link></li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>4. Prohibited Uses</h2>
          <p style={{ color: '#374151', lineHeight: 1.7, marginBottom: '12px' }}>
            You may not use {SITE_NAME} to:
          </p>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>Post fraudulent, deceptive, or scam listings</li>
            <li>Sell illegal items or services</li>
            <li>Harass, threaten, or abuse other users</li>
            <li>Scrape, crawl, or collect user data without permission</li>
            <li>Interfere with the platform&apos;s operation or security</li>
            <li>Create multiple accounts or impersonate another person</li>
            <li>Use automated tools to post content or send messages</li>
            <li>Circumvent any moderation, verification, or security measures</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>5. Transactions</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            {SITE_NAME} is a platform that connects users. We are not a party to any transaction between users.
            We do not verify the quality, safety, or legality of items listed, the truth of listings, or the
            ability of users to complete transactions. You assume all risk when transacting with other users.
            We strongly recommend meeting in public places and using secure payment methods.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>6. Moderation and Enforcement</h2>
          <p style={{ color: '#374151', lineHeight: 1.7, marginBottom: '12px' }}>
            We reserve the right to remove any content and suspend or terminate any account at our discretion,
            including but not limited to violations of these terms or our Community Guidelines.
          </p>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            Enforcement actions may include content removal, warnings, temporary suspensions, or permanent bans.
            See our <Link href="/guidelines" style={{ color: '#2563eb' }}>Community Guidelines</Link> for details
            on our enforcement approach.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>7. The Platform</h2>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>{SITE_NAME} is provided &quot;as is&quot; without warranties of any kind.</li>
            <li>We may modify, suspend, or discontinue any part of the platform at any time.</li>
            <li>We are not responsible for any loss of data, revenue, or damages arising from your use of the platform.</li>
            <li>Posting on {SITE_NAME} is free. We reserve the right to introduce optional paid features in the future, but core posting and browsing will remain free.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>8. Limitation of Liability</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            To the maximum extent permitted by law, {SITE_NAME} and its operators shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenue,
            whether incurred directly or indirectly, arising from your use of the platform or any transaction
            with another user.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>9. Indemnification</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            You agree to indemnify and hold harmless {SITE_NAME} and its operators from any claims, damages,
            or expenses arising from your use of the platform, your content, or your violation of these terms.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>10. Governing Law</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            These terms are governed by the laws of the State of New York. Any disputes shall be resolved
            in the courts of New York County, New York.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>11. Changes to These Terms</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            We may update these terms from time to time. If we make material changes, we will notify users
            through the platform. Continued use after changes are posted constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Contact</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            Questions about these terms? Use the Feedback button on any page. See also
            our <Link href="/privacy" style={{ color: '#2563eb' }}>Privacy Policy</Link> and <Link href="/legal" style={{ color: '#2563eb' }}>Legal</Link> page.
          </p>
        </section>
      </main>
    </>
  )
}
