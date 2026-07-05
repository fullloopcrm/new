import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMetadata, breadcrumbSchema, SITE_NAME, SITE_URL } from '@/app/site/nyc-classifieds/_lib/seo'

export const metadata: Metadata = buildMetadata({
  title: `Privacy Policy — ${SITE_NAME}`,
  description: 'How NYC Classifieds collects, uses, and protects your personal information. Our commitment to privacy and data security.',
  path: '/privacy',
})

export default function PrivacyPage() {
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Privacy Policy — ${SITE_NAME}`,
      description: 'Privacy policy for NYC Classifieds.',
      url: `${SITE_URL}/privacy`,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    },
    breadcrumbSchema([{ name: 'Privacy Policy', url: '/privacy' }]),
  ]

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px 64px', fontFamily: "'DM Sans', sans-serif" }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          NYC Classifieds — Privacy Policy
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '32px' }}>
          Last updated: February 11, 2026
        </p>

        <p style={{ color: '#374151', lineHeight: 1.7, marginBottom: '24px' }}>
          Your privacy matters. This policy explains what information {SITE_NAME} collects, how we use it,
          and what choices you have. We keep it straightforward because you deserve to understand exactly
          what happens with your data.
        </p>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Information We Collect</h2>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginTop: '16px', marginBottom: '6px' }}>Account Information</h3>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            When you sign up, we collect your name, email address, and phone number. This is the minimum
            needed to create your account and enable messaging.
          </p>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginTop: '16px', marginBottom: '6px' }}>Geo-Verification Data</h3>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            During verification, we temporarily access your device camera (for a selfie) and GPS location.
            The selfie is used solely to confirm you are a real person and is not stored long-term. Your GPS
            coordinates are used only to determine your borough and neighborhood — your exact location is
            never shared with other users or stored beyond what is needed for verification.
          </p>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginTop: '16px', marginBottom: '6px' }}>Content You Create</h3>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            Listings, Porch posts, replies, and messages you create are stored to operate the platform.
            Your listings and Porch posts are publicly visible. Messages are private between sender and
            recipient.
          </p>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginTop: '16px', marginBottom: '6px' }}>Usage Data</h3>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            We collect basic usage data such as pages visited, device type, and browser type. This helps
            us improve the platform. We do not use third-party tracking pixels or behavioral advertising
            networks.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>How We Use Your Information</h2>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li><strong>Operating the platform</strong> — displaying your listings and posts, delivering messages, sending notifications you&apos;ve opted into.</li>
            <li><strong>Verification</strong> — confirming you are a real person located in NYC.</li>
            <li><strong>Safety and moderation</strong> — detecting spam, fraud, and policy violations.</li>
            <li><strong>Improving the service</strong> — understanding how the platform is used so we can make it better.</li>
            <li><strong>Communication</strong> — sending essential account emails (password resets, security alerts). We do not send marketing emails without your consent.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>What We Do NOT Do</h2>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>We do <strong>not</strong> sell your personal information to anyone.</li>
            <li>We do <strong>not</strong> share your data with third-party advertisers.</li>
            <li>We do <strong>not</strong> use behavioral tracking or retargeting ad networks.</li>
            <li>We do <strong>not</strong> store your selfie after verification is complete.</li>
            <li>We do <strong>not</strong> share your exact GPS coordinates with other users.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Data Sharing</h2>
          <p style={{ color: '#374151', lineHeight: 1.7, marginBottom: '12px' }}>
            We share data only in limited circumstances:
          </p>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li><strong>Service providers</strong> — we use Supabase (database), Vercel (hosting), and Resend (email delivery) to operate the platform. These providers process data on our behalf under strict agreements.</li>
            <li><strong>Legal requirements</strong> — we may disclose information if required by law, court order, or to protect the safety of our users.</li>
            <li><strong>With your consent</strong> — we will not share your information for any other purpose without asking you first.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Data Security</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            We use industry-standard security measures to protect your data, including HTTPS encryption,
            secure authentication, and access controls. Passwords are hashed and never stored in plain text.
            While no system is 100% secure, we take reasonable measures to protect your information.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Your Choices</h2>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li><strong>Access and update</strong> — you can view and edit your account information from your account settings.</li>
            <li><strong>Delete your account</strong> — you can request account deletion by contacting us through the Feedback button. We will delete your account and associated data within 30 days.</li>
            <li><strong>Notifications</strong> — you can manage push notification and email preferences in your account settings.</li>
            <li><strong>Cookies</strong> — we use essential cookies for authentication and session management only. No tracking cookies.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Data Retention</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            Active listings expire after 30 days. Porch posts expire based on their type (48 hours for alerts,
            up to 30 days for other posts). Messages are retained while your account is active. If you delete
            your account, your data is removed within 30 days, except where we are legally required to retain it.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Children&apos;s Privacy</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            {SITE_NAME} is not intended for users under 18 years of age. We do not knowingly collect information
            from children. If you believe a child has provided us with personal information, please contact us
            and we will remove it.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Changes to This Policy</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            If we make material changes to this policy, we will notify users through the platform. Continued
            use of {SITE_NAME} after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Contact</h2>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>
            Questions about this policy? Use the Feedback button on any page or email privacy at thenycclassifieds
            dot com. See also our <Link href="/terms" style={{ color: '#2563eb' }}>Terms of Service</Link> and <Link href="/legal" style={{ color: '#2563eb' }}>Legal</Link> page.
          </p>
        </section>
      </main>
    </>
  )
}
