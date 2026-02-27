import type { Metadata } from 'next'
import Link from 'next/link'
import CtaSection from '@/components/marketing/cta-section'

export const metadata: Metadata = {
  title: 'Pricing — Full Loop CRM | $25K/yr Platform License',
  description: 'Full Loop CRM pricing: $25,000/yr platform license with exclusive territory lock. Setup from $5K. Optional support retainers from $750/mo. Hourly support $199/hr. Not a SaaS subscription — infrastructure + consulting.',
  keywords: ['Full Loop CRM pricing', 'home service CRM cost', 'CRM platform license', 'exclusive territory CRM', 'home service business software pricing'],
  openGraph: {
    type: 'website',
    url: 'https://fullloopcrm.com/pricing',
    title: 'Pricing — Full Loop CRM | $25K/yr Platform License',
    description: 'Full Loop CRM pricing: $25,000/yr platform license with exclusive territory lock. Setup from $5K. Optional support retainers from $750/mo. Hourly support $199/hr. Not a SaaS subscription — infrastructure + consulting.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — Full Loop CRM | $25K/yr Platform License',
    description: 'Full Loop CRM pricing: $25,000/yr platform license with exclusive territory lock. Setup from $5K. Optional support retainers from $750/mo. Hourly support $199/hr. Not a SaaS subscription — infrastructure + consulting.',
  },
  alternates: {
    canonical: 'https://fullloopcrm.com/pricing',
  },
}

export default function PricingPage() {
  return (
    <>
      {/* JSON-LD: WebPage + BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Pricing — Full Loop CRM",
            "description": "Full Loop CRM pricing: $25,000/yr platform license with exclusive territory lock. Setup from $5K. Optional support retainers from $750/mo. Hourly support $199/hr.",
            "url": "https://fullloopcrm.com/pricing",
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": "https://fullloopcrm.com"
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Pricing",
                  "item": "https://fullloopcrm.com/pricing"
                }
              ]
            }
          })
        }}
      />

      {/* JSON-LD: Product with Offers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Full Loop CRM",
            "description": "The first full-cycle CRM built for home service businesses. Platform license with exclusive territory lock — one service provider per trade per metropolitan area.",
            "url": "https://fullloopcrm.com/pricing",
            "brand": {
              "@type": "Brand",
              "name": "Full Loop CRM"
            },
            "offers": [
              {
                "@type": "Offer",
                "name": "Annual Platform License",
                "price": "25000",
                "priceCurrency": "USD",
                "availability": "https://schema.org/LimitedAvailability",
                "description": "Full Loop CRM annual platform license with exclusive territory lock — one service provider per trade per metropolitan area. Includes all 7 stages, AI sales assistant, all portals, lead tracking, financial tools, and core updates."
              },
              {
                "@type": "Offer",
                "name": "Installation & Setup",
                "price": "5000",
                "priceCurrency": "USD",
                "description": "Revenue-based onboarding: $5,000 (under $500K), $7,500 ($500K-$1M), $10,000 ($1M-$3M), $15,000+ ($3M+). Includes system configuration, data import, AI grounding, workflow setup, and go-live readiness."
              },
              {
                "@type": "Offer",
                "name": "Ongoing Support Retainer",
                "price": "750",
                "priceCurrency": "USD",
                "description": "Optional monthly support retainers based on annual revenue: Light (0.5%, $750-$1,500/mo), Active (1%, $1,500-$3,000/mo), Growth (2%, $3,000-$6,000+/mo). Cancel anytime."
              },
              {
                "@type": "Offer",
                "name": "Hourly Support",
                "price": "199",
                "priceCurrency": "USD",
                "description": "Ad-hoc support at $199/hour billed in 30-minute increments. No SLA, no priority."
              },
              {
                "@type": "Offer",
                "name": "Custom Development",
                "price": "299",
                "priceCurrency": "USD",
                "description": "Custom integrations, feature development, third-party connections, and builds beyond the core platform. $299/hour or fixed-scope project quotes."
              }
            ]
          })
        }}
      />

      {/* PAGE HERO */}
      <section style={{padding: '8rem 2rem 4rem', textAlign: 'center', background: 'var(--gray-50)'}} aria-label="Pricing hero">
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <h1>Transparent Pricing. No Surprises. No Hidden Fees.</h1>
          <p>Full Loop CRM is not a monthly SaaS subscription. It is a platform license, a consulting partnership, and an exclusive territory lock — built for serious home service business owners.</p>
        </div>
      </section>

      {/* COST BREAKDOWN */}
      <section className="cost-section" id="cost-breakdown" aria-label="Cost comparison breakdown">
        <div className="cost-container">
          <div className="cost-header">
            <span className="section-label">The Real Cost of Running a Home Service Business</span>
            <h2>They&apos;re Spending <span className="traditional-price">$178,800</span>. You&apos;ll Spend <span className="fullloop-price">$25,000</span>.</h2>
            <p>Every dollar they burn on staff, software, and ad spend — Full Loop replaces with one platform. Here&apos;s the line-by-line breakdown.</p>
          </div>
          <div className="table-scroll">
            <table className="cost-table">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Traditional</th>
                  <th>Full Loop</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Receptionist / Office Manager<span className="expense-desc">Answering calls, scheduling, confirmations</span></td>
                  <td>$38,000</td>
                  <td>Included</td>
                </tr>
                <tr>
                  <td>Salesperson / Lead Closer<span className="expense-desc">Following up on leads, quoting, converting</span></td>
                  <td>$48,000</td>
                  <td>Included</td>
                </tr>
                <tr>
                  <td>Customer Service Rep<span className="expense-desc">Rescheduling, complaints, retention</span></td>
                  <td>$35,000</td>
                  <td>Included</td>
                </tr>
                <tr>
                  <td>Website + SEO Agency<span className="expense-desc">One generic website, monthly retainer, slow results</span></td>
                  <td>$18,000</td>
                  <td>See below</td>
                </tr>
                <tr>
                  <td>Google Ads / Paid Lead Gen<span className="expense-desc">Pay-per-click, Thumbtack, Yelp Ads, Angi — leads stop when you stop paying</span></td>
                  <td>$24,000</td>
                  <td>$0 — Organic</td>
                </tr>
                <tr>
                  <td>CRM / Scheduling Software<span className="expense-desc">Jobber, Housecall Pro, ServiceTitan, etc.</span></td>
                  <td>$3,600</td>
                  <td>Included</td>
                </tr>
                <tr>
                  <td>SMS / Phone System<span className="expense-desc">Business line, texting platform, auto-responders</span></td>
                  <td>$2,400</td>
                  <td>Included</td>
                </tr>
                <tr>
                  <td>Review Management<span className="expense-desc">Software to request &amp; monitor reviews</span></td>
                  <td>$1,800</td>
                  <td>Included</td>
                </tr>
                <tr>
                  <td>Retargeting / Email Marketing<span className="expense-desc">Win-back campaigns, re-engagement flows</span></td>
                  <td>$3,600</td>
                  <td>Included</td>
                </tr>
                <tr>
                  <td>Bookkeeping / Finance Tracking<span className="expense-desc">P&amp;L, payroll tracking, expense management</span></td>
                  <td>$4,400</td>
                  <td>Included</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>Total Annual Operating Cost</td>
                  <td>$178,800</td>
                  <td>$25,000</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="cost-footnote">+ Website network built separately — $500&ndash;$1,000 per site, one-time. A 10-site network runs $5K&ndash;$10K total. You own them forever. No recurring fees.</p>
          <div className="savings-callout">
            <h3>Save $153,800/year</h3>
            <p>That&apos;s 86% less — reinvested directly into growth and profit.</p>
          </div>
        </div>
      </section>

      {/* PARTNERSHIP PRICING */}
      <section id="pricing" style={{padding: '6rem 2rem', background: 'var(--white)'}} aria-label="Partnership pricing details">
        <div className="section-container">
          <div className="section-header">
            <span className="section-label" style={{background: 'var(--black)', color: 'var(--white)'}}>Partnership Pricing</span>
            <h2>This Is Infrastructure, Not a Subscription</h2>
            <p>High price, low drama. Revenue-based fairness. No unlimited anything. One partner per trade per city. If that filters you out, it&apos;s working.</p>
          </div>

          {/* CORE: LICENSE + SETUP */}
          <div className="pricing-grid">
            <div className="price-card featured">
              <div className="price-tag" style={{color: 'var(--blue)'}}>PLATFORM LICENSE</div>
              <h3>Annual Platform License</h3>
              <div className="price-amount">$25,000</div>
              <div className="price-period">per year</div>
              <p className="price-desc">Your exclusive territory lock — one service provider per trade per metropolitan area. Includes all 7 stages of the Full Loop CRM platform, AI sales assistant (Selenas), all portals (client, team, referral), lead tracking across your domain portfolio, full financial tools, and every core platform update.</p>
              <ul>
                <li>Territory exclusivity (1 per trade per metro)</li>
                <li>All 7 business stages</li>
                <li>AI sales assistant (Selenas)</li>
                <li>Client + Team + Referral portals</li>
                <li>Full analytics &amp; attribution engine</li>
                <li>Financial suite (P&amp;L, payroll, 1099s)</li>
                <li>20+ notification types</li>
                <li>All core platform updates</li>
              </ul>
            </div>

            <div className="price-card">
              <div className="price-tag" style={{color: 'var(--orange)'}}>ONE-TIME</div>
              <h3>Installation &amp; Setup</h3>
              <div className="price-amount">$5,000 &ndash; $15,000</div>
              <div className="price-period">one-time, revenue-based</div>
              <p className="price-desc">System configuration, data import, AI training (Selenas grounding), workflow setup, team onboarding, and go-live readiness.</p>
              <table style={{width: '100%', fontSize: '0.9rem', marginTop: '1rem', borderCollapse: 'collapse'}}>
                <thead>
                  <tr>
                    <th style={{textAlign: 'left', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-200)', fontWeight: '600'}}>Annual Revenue</th>
                    <th style={{textAlign: 'right', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-200)', fontWeight: '600'}}>Setup Fee</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{padding: '0.4rem 0', borderBottom: '1px solid var(--gray-100)'}}>Under $500K</td>
                    <td style={{textAlign: 'right', padding: '0.4rem 0', borderBottom: '1px solid var(--gray-100)', fontWeight: '700'}}>$5,000</td>
                  </tr>
                  <tr>
                    <td style={{padding: '0.4rem 0', borderBottom: '1px solid var(--gray-100)'}}>$500K &ndash; $1M</td>
                    <td style={{textAlign: 'right', padding: '0.4rem 0', borderBottom: '1px solid var(--gray-100)', fontWeight: '700'}}>$7,500</td>
                  </tr>
                  <tr>
                    <td style={{padding: '0.4rem 0', borderBottom: '1px solid var(--gray-100)'}}>$1M &ndash; $3M</td>
                    <td style={{textAlign: 'right', padding: '0.4rem 0', borderBottom: '1px solid var(--gray-100)', fontWeight: '700'}}>$10,000</td>
                  </tr>
                  <tr>
                    <td style={{padding: '0.4rem 0'}}>$3M+</td>
                    <td style={{textAlign: 'right', padding: '0.4rem 0', fontWeight: '700'}}>$15,000+</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SUPPORT TIERS */}
          <div style={{marginBottom: '3rem'}} aria-label="Ongoing support retainers">
            <h3 style={{fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', textAlign: 'center'}}>Ongoing Support Retainers</h3>
            <p style={{color: 'var(--gray-500)', textAlign: 'center', marginBottom: '0.5rem'}}>Optional. Revenue-based. Cancel anytime. Choose your level.</p>
            <div className="support-tiers">
              <div className="support-tier">
                <h4>Light</h4>
                <div className="tier-pct" style={{color: 'var(--teal)'}}>0.5%</div>
                <div className="tier-range">of annual revenue<br />$750 &ndash; $1,500 / month</div>
                <ul>
                  <li>Small tweaks &amp; minor adjustments</li>
                  <li>Email &amp; async communication only</li>
                  <li>48-hour response window</li>
                  <li>Monthly check-in (optional)</li>
                </ul>
              </div>
              <div className="support-tier" style={{borderColor: 'var(--blue)'}}>
                <h4>Active</h4>
                <div className="tier-pct" style={{color: 'var(--blue)'}}>1%</div>
                <div className="tier-range">of annual revenue<br />$1,500 &ndash; $3,000 / month</div>
                <ul>
                  <li>Workflow tuning &amp; optimization</li>
                  <li>AI prompt updates &amp; training</li>
                  <li>Priority response (24hr)</li>
                  <li>Limited calls (2x/month)</li>
                  <li>Quarterly strategy review</li>
                </ul>
              </div>
              <div className="support-tier" style={{borderColor: 'var(--black)'}}>
                <h4>Growth</h4>
                <div className="tier-pct">2%</div>
                <div className="tier-range">of annual revenue<br />$3,000 &ndash; $6,000+ / month</div>
                <ul>
                  <li>Active iteration &amp; expansion</li>
                  <li>Custom logic &amp; feature work</li>
                  <li>Direct access to founder</li>
                  <li>Consulting &amp; growth strategy</li>
                  <li>New market expansion support</li>
                  <li>Weekly calls as needed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* HOURLY + CUSTOM DEV */}
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem'}} className="pricing-grid" aria-label="Hourly and custom development pricing">
            <div className="price-card">
              <div className="price-tag" style={{color: 'var(--gray-500)'}}>No Retainer? No Problem.</div>
              <h3>Hourly Support</h3>
              <div className="price-amount">$199<span style={{fontSize: '1rem', fontWeight: '500', color: 'var(--gray-500)'}}> / hour</span></div>
              <div className="price-period">billed in 30-minute increments</div>
              <p className="price-desc">For partners who don&apos;t want a retainer but need occasional help. No SLA. No priority. No urgency. This rate exists to protect our calendar and push you toward a retainer if you need consistent support.</p>
            </div>
            <div className="price-card">
              <div className="price-tag" style={{color: 'var(--purple)'}}>Custom Development</div>
              <h3>Scoped Projects</h3>
              <div className="price-amount">$299<span style={{fontSize: '1rem', fontWeight: '500', color: 'var(--gray-500)'}}> / hour</span></div>
              <div className="price-period">or fixed-scope project quotes</div>
              <p className="price-desc">Custom integrations, feature development, third-party connections, and builds that go beyond the core platform. Always scoped separately. Never bundled. Always quoted in advance.</p>
            </div>
          </div>

          {/* WHO THIS IS NOT FOR */}
          <div style={{maxWidth: '900px', margin: '0 auto', textAlign: 'center'}} aria-label="Who this is not for">
            <h3 style={{fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem'}}>Who This Is NOT For</h3>
            <p style={{color: 'var(--gray-500)', marginBottom: '1rem'}}>We put this in writing so there&apos;s no confusion.</p>
            <ul className="not-for-list">
              <li>Businesses looking for the cheapest option</li>
              <li>Anyone expecting unlimited support</li>
              <li>&ldquo;Can you just...&rdquo; requests without a retainer</li>
              <li>Emergency responses without a support tier</li>
              <li>Feature requests included in the license</li>
              <li>People who negotiate on principle, not value</li>
              <li>Businesses not ready for $25K annual commitment</li>
              <li>Anyone who sees this as a software subscription</li>
            </ul>
            <p style={{color: 'var(--gray-700)', fontSize: '1rem', fontWeight: '600', marginTop: '1.5rem'}}>This is infrastructure + judgment + 20 years of experience.<br />Not a monthly SaaS fee. Not a favor.</p>
          </div>

        </div>
      </section>

      {/* CTA */}
      <CtaSection
        heading="Ready to invest in your market?"
        description="Apply for exclusive partnership. One partner per trade per city."
      />
    </>
  )
}
