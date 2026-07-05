import type { Metadata } from 'next'
import { buildMetadata, breadcrumbSchema, SITE_NAME, SITE_URL } from '@/app/site/nyc-classifieds/_lib/seo'

export const metadata: Metadata = buildMetadata({
  title: `Community Guidelines — ${SITE_NAME}`,
  description: 'Posting rules, verification requirements, moderation policies, and safety tips for NYC Classifieds. Keep our community real, safe, and respectful.',
  path: '/guidelines',
})

function webPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Community Guidelines — ${SITE_NAME}`,
    description: 'Posting rules, verification requirements, and moderation policies for NYC Classifieds.',
    url: `${SITE_URL}/guidelines`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  }
}

export default function GuidelinesPage() {
  const schemas = [
    webPageSchema(),
    breadcrumbSchema([{ name: 'Community Guidelines', url: '/guidelines' }]),
  ]

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px 64px', fontFamily: "'DM Sans', sans-serif" }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          Community Guidelines
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#4b5563', marginBottom: '32px', lineHeight: 1.6 }}>
          NYC Classifieds is built on trust. These guidelines keep our community safe, real, and respectful for all New Yorkers.
        </p>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>Posting Rules</h2>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li><strong>Be real.</strong> All posts must be truthful and accurate. Don&apos;t misrepresent items, services, or yourself.</li>
            <li><strong>No spam.</strong> Don&apos;t post duplicate listings, flood categories, or use the platform for mass advertising.</li>
            <li><strong>No illegal items or services.</strong> This includes drugs, weapons, stolen goods, counterfeit items, and any services that violate NYC, state, or federal law.</li>
            <li><strong>No scams.</strong> Advance-fee schemes, phishing, fake listings, and bait-and-switch tactics result in immediate bans.</li>
            <li><strong>Keep it local.</strong> NYC Classifieds is for New York City. Posts must be relevant to the five boroughs.</li>
            <li><strong>One account per person.</strong> Creating multiple accounts to circumvent limits or bans is prohibited.</li>
            <li><strong>Price accurately.</strong> If you list a price, honor it. Don&apos;t use $0 or $1 prices to game search results.</li>
            <li><strong>Use the right category.</strong> Post in the category that fits your listing. Miscategorized posts may be removed.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>Verification Requirements</h2>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>All users must complete geo-verification (selfie + GPS) before posting.</li>
            <li>Verification confirms you are a real person physically located in New York City.</li>
            <li>Your selfie is used for verification only and is not stored long-term.</li>
            <li>Your exact location is never shared — only your borough and neighborhood are visible to others.</li>
            <li>Attempting to spoof or bypass verification results in a permanent ban.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>Respectful Communication</h2>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li><strong>No harassment.</strong> Don&apos;t threaten, bully, stalk, or intimidate other users.</li>
            <li><strong>No hate speech.</strong> Discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, or any protected class is prohibited.</li>
            <li><strong>No personal attacks.</strong> Disagree respectfully. Attacking someone personally in Porch discussions or replies is not allowed.</li>
            <li><strong>No doxxing.</strong> Never share another person&apos;s private information (address, phone number, etc.) without their consent.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>Flagging &amp; Moderation</h2>
          <p style={{ color: '#374151', lineHeight: 1.7, marginBottom: '12px' }}>
            Every post and listing has a flag button. If you see something that violates these guidelines, flag it. Our moderation team reviews flagged content promptly.
          </p>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>Automated filters catch prohibited content and spam patterns before posts go live.</li>
            <li>Community flags are reviewed by our team, typically within hours.</li>
            <li>Content that violates guidelines is removed. Repeat offenders face account consequences.</li>
            <li>False flagging (repeatedly flagging legitimate posts) may result in warnings.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>Account Consequences</h2>
          <p style={{ color: '#374151', lineHeight: 1.7, marginBottom: '12px' }}>
            Violations are handled based on severity:
          </p>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li><strong>Warning</strong> — First-time minor violations receive a warning and the offending content is removed.</li>
            <li><strong>Temporary suspension</strong> — Repeated violations or moderate offenses result in a temporary account suspension (7-30 days).</li>
            <li><strong>Permanent ban</strong> — Serious violations (scams, harassment, illegal activity, verification fraud) result in an immediate permanent ban.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>Safety Tips</h2>
          <ul style={{ color: '#374151', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>Meet in public, well-lit places for in-person transactions.</li>
            <li>Use secure payment methods (cash, Venmo, Zelle). Never wire money or send gift cards.</li>
            <li>Don&apos;t share personal information (home address, financial details) until you&apos;re comfortable.</li>
            <li>Trust your instincts. If a deal seems too good to be true, it probably is.</li>
            <li>Check for the verification badge before engaging with a user.</li>
            <li>Keep conversations on-platform so there&apos;s a record if something goes wrong.</li>
          </ul>
        </section>
      </main>
    </>
  )
}
