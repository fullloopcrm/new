import type { Metadata } from 'next'
import Link from 'next/link'
import LoopVisual from '@/components/marketing/loop-visual'
import StatsBar from '@/components/marketing/stats-bar'
import CtaSection from '@/components/marketing/cta-section'

export const metadata: Metadata = {
  title: 'Full Loop CRM — Complete Home Service Business Platform',
  description: 'Full Loop CRM is the first full-cycle CRM for home service businesses. Replace 9+ tools with one platform — organic lead gen, AI sales, scheduling, GPS operations, payments, reviews, retargeting. $25K/yr. One partner per trade per city.',
  keywords: ['home service CRM', 'cleaning business CRM', 'full cycle CRM', 'lead generation CRM', 'AI sales chatbot', 'field service management', 'home service business platform', 'organic lead generation'],
  openGraph: {
    title: 'Full Loop CRM — Complete Home Service Business Platform',
    description: 'Full Loop CRM is the first full-cycle CRM for home service businesses. Replace 9+ tools with one platform — organic lead gen, AI sales, scheduling, GPS operations, payments, reviews, retargeting. $25K/yr. One partner per trade per city.',
    url: 'https://fullloopcrm.com',
    siteName: 'Full Loop CRM',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Full Loop CRM — Complete Home Service Business Platform',
    description: 'Full Loop CRM is the first full-cycle CRM for home service businesses. Replace 9+ tools with one platform — organic lead gen, AI sales, scheduling, GPS operations, payments, reviews, retargeting. $25K/yr. One partner per trade per city.',
  },
  alternates: {
    canonical: 'https://fullloopcrm.com',
  },
}

export default function MarketingPage() {
  return (
    <>
      {/* JSON-LD: SoftwareApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Full Loop CRM",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "The first full-cycle CRM built for home service businesses. Covers lead generation, AI-powered sales, scheduling, field operations, payments, feedback, review generation, and retargeting — all in one platform.",
            "url": "https://fullloopcrm.com",
            "author": {
              "@type": "Organization",
              "name": "Full Loop CRM",
              "url": "https://fullloopcrm.com",
              "email": "hello@fullloopcrm.com",
              "telephone": "+12122029220",
              "founder": {
                "@type": "Person",
                "description": "20+ year veteran in home services, business development, web design, SEO, organic lead generation, and business growth strategy"
              }
            },
            "offers": [
              {"@type":"Offer","name":"Annual Platform License","price":"25000","priceCurrency":"USD","availability":"https://schema.org/LimitedAvailability","description":"Full Loop CRM annual platform license with exclusive territory lock — one service provider per trade per metropolitan area."},
              {"@type":"Offer","name":"Installation & Setup","price":"5000","priceCurrency":"USD","description":"Revenue-based onboarding: $5,000 (under $500K), $7,500 ($500K-$1M), $10,000 ($1M-$3M), $15,000+ ($3M+)."},
              {"@type":"Offer","name":"Ongoing Support Retainer","price":"750","priceCurrency":"USD","description":"Optional monthly support retainers: Light (0.5%, $750-$1,500/mo), Active (1%, $1,500-$3,000/mo), Growth (2%, $3,000-$6,000+/mo)."},
              {"@type":"Offer","name":"Hourly Support","price":"199","priceCurrency":"USD","description":"Ad-hoc support at $199/hour. Custom development at $299/hour."}
            ],
            "featureList": ["Organic lead generation via multi-domain SEO strategy","AI-powered SMS sales chatbot (Selenas)","Automated client booking and scheduling","Recurring booking management","Field team operations with GPS check-in/check-out","Bilingual team portal (English/Spanish)","Payment tracking and financial management","Automated review and feedback collection","Client retention and lifecycle analytics","Referral program with commission tracking","Multi-domain website attribution analytics","Email and SMS marketing automation","Client retargeting and re-engagement","Real-time push notifications","Full financial reporting with P&L and 1099s"],
            "aggregateRating": {"@type":"AggregateRating","ratingValue":"4.9","reviewCount":"25","bestRating":"5"},
            "review": [
              {"@type":"Review","author":{"@type":"Person","name":"Rachel M."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"I've been in the cleaning business for 12 years. When I saw Full Loop replace all of my tools in one screen — with lead generation built in — I literally said where has this been."},
              {"@type":"Review","author":{"@type":"Person","name":"Marcus T."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"Watching Selenas engage a lead, qualify them, answer their pricing question, and push them to book — all via text, all automatic — that alone is worth it."},
              {"@type":"Review","author":{"@type":"Person","name":"Diana L."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"Full Loop calculates payroll automatically from GPS check-in/out. I just open the payroll tab and hit Mark Paid. I got 3 hours of my week back."},
              {"@type":"Review","author":{"@type":"Person","name":"Carlos R."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"The exclusivity is what sold me. I'm the only pest control company in Houston with this platform. My competitors can't get it."},
              {"@type":"Review","author":{"@type":"Person","name":"Keisha W."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"I thought I needed to hire a receptionist. Turns out I needed Selenas. She handles 80% of what a front desk person would do. The ROI isn't even close."},
              {"@type":"Review","author":{"@type":"Person","name":"Sofia G."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"Full Loop's team portal is fully bilingual. My Spanish-speaking cleaners actually use it now."},
              {"@type":"Review","author":{"@type":"Person","name":"David H."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"I've been in business 8 years and never had this level of financial visibility. My accountant was thrilled when I showed her the 1099 export."},
              {"@type":"Review","author":{"@type":"Person","name":"Anthony S."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"I was burning $3,000/month on Google Ads. When they showed me 100+ neighborhood websites all ranking organically, I turned off my ads the next day."},
              {"@type":"Review","author":{"@type":"Person","name":"Linda P."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"This wasn't designed by developers who Googled cleaning business software — it was built by someone who lived it. You can feel it in every feature."},
              {"@type":"Review","author":{"@type":"Person","name":"Natasha K."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"Nobody else is doing one partner per city. I called within an hour because I knew if another cleaning company in my area saw this, I'd lose the territory."},
              {"@type":"Review","author":{"@type":"Person","name":"Crystal W."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"The consulting side is what you don't expect. The guidance that comes with the partnership is the real value. I don't get that from Jobber."},
              {"@type":"Review","author":{"@type":"Person","name":"Mariana S."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"I went on vacation for a week and the business ran itself. 200+ clients and Full Loop handles all of them without me touching anything most days."},
              {"@type":"Review","author":{"@type":"Person","name":"Gregory T."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"I stopped servicing two zip codes and my margin went from 38% to 49% in one month. Data-driven decisions. Finally."}
            ]
          })
        }}
      />

      {/* JSON-LD: Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Full Loop CRM",
            "url": "https://fullloopcrm.com",
            "email": "hello@fullloopcrm.com",
            "telephone": "+12122029220",
            "description": "Creator of the first full-cycle CRM for home service businesses. Founded by a 20+ year professional in home services, business development, web design, SEO, and organic lead generation.",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "150 W 47th St",
              "addressLocality": "New York",
              "addressRegion": "NY",
              "postalCode": "10036",
              "addressCountry": "US"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+12122029220",
              "email": "hello@fullloopcrm.com",
              "contactType": "sales",
              "availableLanguage": ["English", "Spanish"]
            },
            "sameAs": [],
            "founder": {
              "@type": "Person",
              "description": "20+ year veteran in home services, business development, web design, SEO, organic lead generation, and business growth strategy"
            }
          })
        }}
      />

      {/* JSON-LD: WebPage with BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Full Loop CRM — The First Full-Cycle CRM for Home Service Businesses",
            "description": "Complete CRM platform covering lead generation, AI sales, scheduling, operations, payments, reviews, and retargeting for home service businesses.",
            "url": "https://fullloopcrm.com",
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": "https://fullloopcrm.com"
                }
              ]
            }
          })
        }}
      />

      {/* JSON-LD: WebSite with SearchAction */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Full Loop CRM",
            "url": "https://fullloopcrm.com",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://fullloopcrm.com/?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          })
        }}
      />

      {/* HERO */}
      <header className="hero" aria-label="Hero">
        <div className="hero-badge">One Partner Per Trade Per City — First Come, First Serve</div>
        <h1>First click to<em>five-star review.</em>One platform.<span className="fullloop-word">Full Loop.</span></h1>

        <div className="hero-price-block">
          <span className="hero-price-old-wrap"><span className="hero-price-old">$178,800</span></span>
          <span className="hero-price-new-wrap"><span className="hero-price-new">$25,000</span><span className="hero-price-yr">/yr</span></span>
          <div><div className="hero-save-badge">SAVE 86%</div></div>
        </div>

        <p className="hero-desc">The first platform built to run your entire home service business — lead gen, AI sales, scheduling, GPS operations, payments, reviews, and retargeting. One partner per trade per metro. Exclusively yours.</p>
        <div className="hero-autonomy"><span className="hero-autonomy-dot"></span> Flip one switch — 100% autonomous. Your business runs itself.</div>
        <div className="hero-ctas">
          <Link href="/crm-partnership-request-form" className="btn-primary" style={{fontSize: '1.1rem', padding: '1rem 2.5rem'}}>Apply for Partnership</Link>
          <a href="sms:+12122029220" className="btn-primary">Text Us</a>
          <a href="tel:+12122029220" className="btn-primary">Call Us</a>
        </div>
        <p className="hero-footer-note">Currently accepting partnership requests for qualified home service business owners.</p>
      </header>
      <div className="hero-gradient-fade"></div>

      {/* COST BREAKDOWN */}
      <section className="cost-section" id="cost-breakdown" aria-label="Cost breakdown comparison">
        <div className="cost-container">
          <div className="cost-header">
            <span className="section-label">The Real Cost of Running a Home Service Business</span>
            <h2>They're Spending <span className="traditional-price">$178,800</span>. You'll Spend <span className="fullloop-price">$25,000</span>.</h2>
            <p>Every dollar they burn on staff, software, and ad spend — Full Loop replaces with one platform. Here's the line-by-line breakdown.</p>
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
                  <td>Review Management<span className="expense-desc">Software to request & monitor reviews</span></td>
                  <td>$1,800</td>
                  <td>Included</td>
                </tr>
                <tr>
                  <td>Retargeting / Email Marketing<span className="expense-desc">Win-back campaigns, re-engagement flows</span></td>
                  <td>$3,600</td>
                  <td>Included</td>
                </tr>
                <tr>
                  <td>Bookkeeping / Finance Tracking<span className="expense-desc">P&L, payroll tracking, expense management</span></td>
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
          <p className="cost-footnote">+ Website network built separately — $500–$1,000 per site, one-time. A 10-site network runs $5K–$10K total. You own them forever. No recurring fees.</p>
          <div className="savings-callout">
            <h3>Save $153,800/year</h3>
            <p>That's 86% less — reinvested directly into growth and profit.</p>
          </div>
        </div>
      </section>

      {/* SELENAS REPLACES YOUR FRONT OFFICE */}
      <section className="replaces-section" id="selenas-replaces" aria-label="Selenas replaces your front office">
        <div className="replaces-container">
          <div className="replaces-header">
            <h2><span>Selenas</span> Replaces Your Entire Front Office</h2>
            <p>Three full-time salaries. One AI. Available 24/7, bilingual, with full client context and memory on every conversation.</p>
          </div>
          <div className="replaces-grid">
            <div className="replace-card">
              <div className="replace-old">
                <h3>Receptionist</h3>
                <span className="old-cost">$38K/yr</span>
                <p>Answers calls 9–5, misses after-hours leads</p>
              </div>
              <div className="replace-arrow">&#8595;</div>
              <div className="replace-new">
                <h3>Selenas — Sales Agent</h3>
                <p>Engages every inbound lead via SMS within seconds. 24/7. Qualifies, quotes pricing, books appointments. Every conversation is logged to the client's SMS transcript file automatically. No scripts, no hold music, no missed leads.</p>
              </div>
            </div>
            <div className="replace-card">
              <div className="replace-old">
                <h3>Salesperson</h3>
                <span className="old-cost">$48K/yr</span>
                <p>Follows up manually, forgets leads, inconsistent</p>
              </div>
              <div className="replace-arrow">&#8595;</div>
              <div className="replace-new">
                <h3>Selenas — Lead Closer</h3>
                <p>Closes at 80%+ from day one. Handles objections, offers pricing tiers, creates urgency, books the job. Matches every number to the client file before responding — if they've texted before, she already knows them. Never takes a day off.</p>
              </div>
            </div>
            <div className="replace-card">
              <div className="replace-old">
                <h3>Customer Service</h3>
                <span className="old-cost">$35K/yr</span>
                <p>Handles complaints, rescheduling, churn</p>
              </div>
              <div className="replace-arrow">&#8595;</div>
              <div className="replace-new">
                <h3>Selenas — Client Manager</h3>
                <p>Every inbound text is matched to the client file instantly. Selenas reviews their full account — booking history, preferences, past conversations — before responding. Full SMS transcripts stored in each client profile. She doesn't just respond. She remembers.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* YOUR LEAD ENGINE */}
      <section className="lead-engine-section" id="lead-engine" aria-label="Your lead engine">
        <div className="lead-engine-container">
          <div className="lead-engine-header">
            <span className="section-label">Your Lead Engine</span>
            <h2>Your Website Network. Built to Dominate.</h2>
            <p>Websites are not included in the platform license — they're built separately, because each one is a custom asset designed for your market.</p>
          </div>
          <div className="lead-engine-price">
            <span className="price-tag">$500 – $1,000 per site</span>
            <p className="price-desc">Fully built, SEO-optimized, yours forever</p>
          </div>
          <div className="lead-features-grid">
            <div className="lead-feature">
              <h3>Organic Search Domination</h3>
              <p>Every site is built for Google, Yahoo, Bing, and DuckDuckGo — engineered to rank for hyper-local service keywords in your territory.</p>
            </div>
            <div className="lead-feature">
              <h3>AI Search Optimized</h3>
              <p>Every site is fully structured for AI search results — ChatGPT, Claude, Google AI Overviews, Perplexity. When AI recommends a service in your area, it recommends you.</p>
            </div>
            <div className="lead-feature">
              <h3>Multi-Domain Network</h3>
              <p>Not one generic website. A network of neighborhood-specific domains that each rank independently — blanketing your city from every angle.</p>
            </div>
            <div className="lead-feature">
              <h3>Zero Ad Spend Required</h3>
              <p>No Google Ads. No Thumbtack. No Yelp. Your domains generate organic traffic that flows directly into Selenas for automated booking. Free leads, forever.</p>
            </div>
          </div>
          <div className="lead-comparison">
            <div className="lead-compare-card traditional">
              <h4>Traditional</h4>
              <span className="compare-price">$18,000 – $42,000/yr</span>
              <p>1 website + SEO agency + Google Ads — Recurring forever. Leads stop the moment you stop paying.</p>
            </div>
            <div className="lead-compare-card fullloop">
              <h4>Full Loop</h4>
              <span className="compare-price">$5,000 – $10,000 one-time</span>
              <p>10-site network, fully built — You own them. Traffic compounds. Leads never stop.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM LINE */}
      <section className="bottom-line-section" aria-label="Bottom line savings">
        <div className="bottom-line-container">
          <h2><span>$153,800</span> saved on operations. Zero staff to manage. Your business runs on autopilot.</h2>
          <p>Full Loop replaces your entire operational stack — sales, scheduling, customer service, payments, reviews, retargeting — for $25K/year. Add your website network once, and organic leads flow in forever. No ad spend. No staffing headaches. No gaps.</p>
        </div>
      </section>

      {/* THE LOOP */}
      <LoopVisual />

      {/* STATS */}
      <StatsBar />

      {/* COMPARE */}
      <section id="compare" aria-label="Full Loop CRM comparison table">
        <div className="section-container">
          <div className="section-header">
            <h2>Full Loop CRM vs. Duct-Taping 9 Tools Together</h2>
            <p>Most home service businesses use a different tool for each stage. Full Loop CRM replaces them all.</p>
          </div>
          <div className="table-scroll"><table className="compare-table">
            <thead>
              <tr>
                <th>Capability</th>
                <th>Full Loop CRM</th>
                <th>Others</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Organic lead generation (multi-domain SEO)</td>
                <td><span className="check">&#10003;</span></td>
                <td><span className="cross">&#10007;</span></td>
              </tr>
              <tr>
                <td>AI-powered SMS sales chatbot</td>
                <td><span className="check">&#10003;</span></td>
                <td><span className="cross">&#10007;</span></td>
              </tr>
              <tr>
                <td>Revenue attribution to specific domains/keywords</td>
                <td><span className="check">&#10003;</span></td>
                <td><span className="cross">&#10007;</span></td>
              </tr>
              <tr>
                <td>Client booking portal with real-time availability</td>
                <td><span className="check">&#10003;</span></td>
                <td><span className="check">&#10003;</span></td>
              </tr>
              <tr>
                <td>Recurring booking management (7 types)</td>
                <td><span className="check">&#10003;</span></td>
                <td>Partial</td>
              </tr>
              <tr>
                <td>GPS-verified field team check-in/out</td>
                <td><span className="check">&#10003;</span></td>
                <td><span className="cross">&#10007;</span></td>
              </tr>
              <tr>
                <td>Bilingual team portal (EN/ES)</td>
                <td><span className="check">&#10003;</span></td>
                <td><span className="cross">&#10007;</span></td>
              </tr>
              <tr>
                <td>Full P&amp;L, payroll, 1099 reports</td>
                <td><span className="check">&#10003;</span></td>
                <td><span className="cross">&#10007;</span></td>
              </tr>
              <tr>
                <td>Built-in referral program with commission tracking</td>
                <td><span className="check">&#10003;</span></td>
                <td><span className="cross">&#10007;</span></td>
              </tr>
              <tr>
                <td>Client lifecycle analytics (LTV, churn, at-risk)</td>
                <td><span className="check">&#10003;</span></td>
                <td><span className="cross">&#10007;</span></td>
              </tr>
              <tr>
                <td>SMS + Email + Push notifications (all 3)</td>
                <td><span className="check">&#10003;</span></td>
                <td>Partial</td>
              </tr>
              <tr>
                <td>Automated post-service follow-up + review gen</td>
                <td><span className="check">&#10003;</span></td>
                <td><span className="cross">&#10007;</span></td>
              </tr>
            </tbody>
          </table></div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" style={{padding: '6rem 2rem', background: 'var(--white)'}} aria-label="Business owner reviews">
        <div className="section-container">
          <div className="section-header">
            <span className="section-label" style={{background: 'var(--yellow-light)', color: 'var(--yellow)'}}>What Business Owners Are Saying</span>
            <h2>Real Reactions From Real Home Service Owners</h2>
            <p>These business owners saw Full Loop CRM live. Here's what they said.</p>
          </div>
          <div className="review-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1.25rem'}}>

            <article className="feature-card" style={{borderLeft: '3px solid var(--green)'}}>
              <blockquote>
                <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"I've been in the cleaning business for 12 years. I use Jobber for scheduling, Mailchimp for emails, SimpleTexting for SMS, QuickBooks for invoicing, and a spreadsheet to track leads. When I saw Full Loop replace all of that in one screen — with lead generation built in — I literally said 'where has this been?' The fact that it tracks which of my websites actually generate revenue? Game changer."</p>
              </blockquote>
              <strong style={{fontSize: '0.85rem'}}>— Rachel M.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, residential cleaning service · Dallas, TX</span>
            </article>

            <article className="feature-card" style={{borderLeft: '3px solid var(--blue)'}}>
              <blockquote>
                <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"The AI chatbot blew my mind. I get leads at 11pm, 2am, weekends — and they used to just sit there until Monday. Watching Selenas engage a lead, qualify them, answer their pricing question, and push them to book — all via text, all automatic — that alone is worth it. My team doesn't even know Selenas exists and our bookings went up."</p>
              </blockquote>
              <strong style={{fontSize: '0.85rem'}}>— Marcus T.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, maid service · Atlanta, GA</span>
            </article>

            <article className="feature-card" style={{borderLeft: '3px solid var(--purple)'}}>
              <blockquote>
                <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"I have 14 team members and payroll was a nightmare every week. Figuring out who worked where, how many hours, what they're owed. Full Loop calculates it all automatically from their GPS check-in/out. I just open the payroll tab and hit 'Mark Paid.' I got 3 hours of my week back."</p>
              </blockquote>
              <strong style={{fontSize: '0.85rem'}}>— Diana L.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, house cleaning company · Phoenix, AZ</span>
            </article>

            <article className="feature-card" style={{borderLeft: '3px solid var(--teal)'}}>
              <blockquote>
                <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"The exclusivity is what sold me. I'm the only pest control company in Houston with this platform. My competitors can't get it. The organic leads from those neighborhood websites are mine — nobody else's. That's not something any other CRM offers."</p>
              </blockquote>
              <strong style={{fontSize: '0.85rem'}}>— Carlos R.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, pest control service · Houston, TX</span>
            </article>

            <article className="feature-card" style={{borderLeft: '3px solid var(--red)'}}>
              <blockquote>
                <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"I thought I needed to hire a receptionist. Turns out I needed Selenas. She handles 80% of what a front desk person would do — answering questions, scheduling, even handling complaints by escalating to me. And she works at 3am on a Saturday. The ROI isn't even close."</p>
              </blockquote>
              <strong style={{fontSize: '0.85rem'}}>— Keisha W.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, deep cleaning service · Chicago, IL</span>
            </article>

            <article className="feature-card" style={{borderLeft: '3px solid var(--green)'}}>
              <blockquote>
                <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"My cleaners are all Spanish-speaking. Every other app I've tried, they can't use it. Full Loop's team portal is fully bilingual — the login, the job list, check-in, earnings, everything. They actually use it now. Before, I was texting them job details every morning manually."</p>
              </blockquote>
              <strong style={{fontSize: '0.85rem'}}>— Sofia G.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, residential cleaning · Miami, FL</span>
            </article>

            <article className="feature-card" style={{borderLeft: '3px solid var(--orange)'}}>
              <blockquote>
                <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"I was skeptical about the organic lead gen. I've been burning $3,000/month on Google Ads for two years. When they showed me the domain portfolio — 100+ neighborhood websites all ranking organically — and then showed me which ones were driving actual paying clients, I turned off my ads the next day. Haven't looked back."</p>
              </blockquote>
              <strong style={{fontSize: '0.85rem'}}>— Anthony S.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, pressure washing service · Tampa, FL</span>
            </article>

            <article className="feature-card" style={{borderLeft: '3px solid var(--blue)'}}>
              <blockquote>
                <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"Nobody else is doing one partner per city. That's what made me act fast. I called within an hour of seeing the platform because I knew if another cleaning company in my area saw this, I'd lose the territory. Best business decision I've made in five years."</p>
              </blockquote>
              <strong style={{fontSize: '0.85rem'}}>— Natasha K.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, residential cleaning · Columbus, OH</span>
            </article>

          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <CtaSection />
    </>
  )
}
