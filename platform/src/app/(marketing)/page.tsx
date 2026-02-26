'use client'

import { useState } from 'react'
import Script from 'next/script'
import Link from 'next/link'

export default function MarketingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i)

  return (
    <>
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
              {
                "@type": "Offer",
                "name": "Annual Platform License",
                "price": "25000",
                "priceCurrency": "USD",
                "availability": "https://schema.org/LimitedAvailability",
                "description": "Full Loop CRM annual platform license with exclusive territory lock — one service provider per trade per metropolitan area. Includes all 7 stages, AI sales assistant, all portals, lead tracking, GPS operations, financial tools, and core updates."
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
                "description": "Ad-hoc support at $199/hour billed in 30-minute increments. No SLA, no priority. Custom development available at $299/hour."
              }
            ],
            "featureList": [
              "Organic lead generation via multi-domain SEO strategy",
              "AI-powered SMS sales chatbot (Selenas)",
              "Automated client booking and scheduling",
              "Recurring booking management",
              "Field team operations with GPS check-in/check-out",
              "Bilingual team portal (English/Spanish)",
              "Payment tracking and financial management",
              "Automated review and feedback collection",
              "Client retention and lifecycle analytics",
              "Referral program with commission tracking",
              "Multi-domain website attribution analytics",
              "Email and SMS marketing automation",
              "Client retargeting and re-engagement",
              "Real-time push notifications",
              "Full financial reporting with P&L and 1099s"
            ],
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "reviewCount": "25",
              "bestRating": "5"
            },
            "review": [
              {"@type":"Review","author":{"@type":"Person","name":"Rachel M."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"I've been in the cleaning business for 12 years. When I saw Full Loop replace all of my tools in one screen — with lead generation built in — I literally said where has this been."},
              {"@type":"Review","author":{"@type":"Person","name":"Marcus T."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"Watching Selenas engage a lead, qualify them, answer their pricing question, and push them to book — all via text, all automatic — that alone is worth it."},
              {"@type":"Review","author":{"@type":"Person","name":"Diana L."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"Full Loop calculates payroll automatically from GPS check-in/out. I just open the payroll tab and hit Mark Paid. I got 3 hours of my week back."},
              {"@type":"Review","author":{"@type":"Person","name":"Carlos R."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"The exclusivity is what sold me. I'm the only pest control company in Houston with this platform. My competitors can't get it."},
              {"@type":"Review","author":{"@type":"Person","name":"Keisha W."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"I thought I needed to hire a receptionist. Turns out I needed Selenas. She handles 80% of what a front desk person would do. The ROI isn't even close."},
              {"@type":"Review","author":{"@type":"Person","name":"Sofia G."},"reviewRating":{"@type":"Rating","ratingValue":"5"},"reviewBody":"Full Loop's team portal is fully bilingual. My Spanish-speaking cleaners actually use it now. Before I was texting them job details every morning manually."},
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
            "sameAs": []
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {"@type":"Question","name":"What is Full Loop CRM and how is it different from other home service CRMs?","acceptedAnswer":{"@type":"Answer","text":"Full Loop CRM is the first and only CRM that handles every stage of a home service business — from organic lead generation and AI-powered sales through scheduling, GPS-verified field operations, payment collection, automated review generation, referral tracking, and client retargeting. Unlike traditional CRMs that cover one or two stages, Full Loop CRM replaces 9+ separate tools with one unified platform. It is exclusively available to one service provider per trade per metro area."}},
              {"@type":"Question","name":"How does the AI sales chatbot Selenas convert leads into booked appointments?","acceptedAnswer":{"@type":"Answer","text":"Selenas is a bilingual AI SMS sales assistant that engages every inbound lead within seconds, 24 hours a day. She qualifies prospects by asking about their location, service needs, home size, and budget, then guides them to book online. She answers 12+ common questions about pricing, insurance, cancellation policy, eco-friendly products, and more. For existing clients, Selenas knows their booking history, next appointment, and assigned cleaner — handling rescheduling, inquiries, and complaint escalation automatically."}},
              {"@type":"Question","name":"What types of home service businesses can use Full Loop CRM for lead generation?","acceptedAnswer":{"@type":"Answer","text":"Full Loop CRM was built for cleaning services and is designed for any home service trade including maid services, carpet cleaning, window cleaning, pressure washing, landscaping, lawn care, handyman services, pest control, HVAC, plumbing, electrical, painting, junk removal, pool cleaning, and any field-service company that books recurring or one-time appointments in a defined geographic area."}},
              {"@type":"Question","name":"How does multi-domain organic SEO lead generation work for home service businesses?","acceptedAnswer":{"@type":"Answer","text":"Full Loop CRM deploys neighborhood-specific websites that rank organically in local search results. For example, a service company might have westsideservice.com, downtownpro.com, and northsideservice.com — each optimized for hyper-local long-tail keywords like 'your trade + your neighborhood.' The platform tracks every visitor across your entire domain portfolio, attributes leads to specific websites, and measures revenue per domain with confidence-weighted scoring."}},
              {"@type":"Question","name":"Can Full Loop CRM track which website domain generated a paying client?","acceptedAnswer":{"@type":"Answer","text":"Yes. Full Loop CRM's attribution engine maps a client's address to their neighborhood, then matches that neighborhood to the most relevant domain in your portfolio. It uses time-decay confidence scoring: 100% within 30 minutes of a website visit, 75% within 1 hour, 50% within 2 hours, and 25% within 4 hours. This lets you see exactly which domains drive real revenue — not just traffic — so you can invest in what works."}},
              {"@type":"Question","name":"What does the Full Loop CRM admin dashboard show business owners?","acceptedAnswer":{"@type":"Answer","text":"The admin dashboard includes 11 purpose-built pages: Executive Dashboard (revenue cards, job feed, forecast, map), Client Management (200+ profiles with lifecycle status), Bookings & Calendar (FullCalendar with drag-and-drop), Team Management (GPS tracking, pay rates, availability), Lead Tracking (107+ domain analytics), Finance & P&L (revenue, payroll, expenses, 1099s), Notification Center (20+ types), Selenas AI Dashboard (conversation transcripts), Referral Program (commission tracking), Settings, and Technical Documentation."}},
              {"@type":"Question","name":"How does GPS-verified check-in and check-out work for cleaning teams?","acceptedAnswer":{"@type":"Answer","text":"When a team member arrives at a client's home, they tap 'Check In' on their mobile portal. The system captures GPS coordinates and calculates the distance from the client's address using the Haversine formula. If the distance exceeds 528 feet, a mismatch flag is raised in the admin dashboard. On checkout, GPS is recaptured, actual hours are auto-calculated, and pay is computed from hours worked multiplied by the team member's hourly rate."}},
              {"@type":"Question","name":"Does Full Loop CRM have a bilingual team portal for Spanish-speaking cleaners?","acceptedAnswer":{"@type":"Answer","text":"Yes. The team portal is fully bilingual in English and Spanish. Team members toggle between languages on any screen. The portal includes PIN-based login (no email/password needed), today's job list with one-tap Google Maps navigation, GPS check-in/out, earnings dashboard (weekly, monthly, yearly), availability management, and emergency job claiming. Every label, button, and notification is translated."}},
              {"@type":"Question","name":"How does Full Loop CRM handle recurring booking management for cleaning services?","acceptedAnswer":{"@type":"Answer","text":"Full Loop CRM supports 7 recurring booking patterns: daily, weekly, biweekly, triweekly, monthly by date, monthly by weekday, and custom interval. Each series can end never, after a set number of occurrences, or on a specific date. You can edit a single instance or all future bookings in a series. The system auto-generates upcoming bookings, sends expiry alerts when a series is ending, and prevents scheduling conflicts with real-time team availability checks."}},
              {"@type":"Question","name":"What payment methods does Full Loop CRM support for collecting from clients?","acceptedAnswer":{"@type":"Answer","text":"Full Loop CRM tracks payments via Zelle, Apple Pay, Venmo, Cash, Check, and credit card. The finance dashboard shows real-time revenue (today, this week, this month, year-to-date), outstanding balances, per-cleaner payroll with one-click 'Mark Paid' buttons, expense tracking across 9 categories, bank statement uploads, margin analysis with gross and net percentages, and auto-generated 1099 contractor reports for tax season."}},
              {"@type":"Question","name":"How does the automated review and feedback system work after a cleaning service?","acceptedAnswer":{"@type":"Answer","text":"Three days after a first-time client's service, Full Loop CRM automatically sends a personalized thank-you email and SMS with a 10% discount offer for their next booking. A floating feedback widget appears on all client portal pages for anonymous input. When a client texts a complaint to Selenas, the AI immediately detects negative sentiment and escalates to a phone call rather than attempting resolution over text — catching issues before they become public reviews."}},
              {"@type":"Question","name":"Is Full Loop CRM available in my city or is there a waiting list?","acceptedAnswer":{"@type":"Answer","text":"Full Loop CRM operates on an exclusive territory model — only one service provider per trade per metropolitan area. A metro area is defined as a mid-to-large US city and its surrounding neighborhoods. This means if you are a cleaning service in Dallas, no other cleaning service in the Dallas metro can use Full Loop CRM. Availability is first-come-first-serve and we are currently accepting partnership requests from qualified business owners."}},
              {"@type":"Question","name":"Why does Full Loop CRM only work with one business per trade per city?","acceptedAnswer":{"@type":"Answer","text":"Exclusivity is the core of our value proposition. Our organic lead generation strategy builds neighborhood-specific domains that rank in local search. If we gave those same domains and leads to competing businesses in the same area, the value would be diluted. By locking one partner per trade per metro, your leads are your leads, your domains are your domains, and your organic growth has zero competition from within our own platform."}},
              {"@type":"Question","name":"What does Full Loop CRM look for in a home service business partner?","acceptedAnswer":{"@type":"Answer","text":"We look for business owners who are committed to organic, sustainable local growth — not just chasing paid ads. The right partner appreciates the consulting guidance and real-world experience we bring, including lessons from both failure and success in home services over 20+ years. We want partners who see this as a long-term relationship, not a software subscription. If you value quality over shortcuts and are ready to own your market, we want to talk."}},
              {"@type":"Question","name":"How much does Full Loop CRM cost for a home service business?","acceptedAnswer":{"@type":"Answer","text":"Full Loop CRM is $25,000 per year for the platform license, which includes your exclusive territory lock, all 7 stages, AI sales, all portals, and core updates. Installation is revenue-based: $5,000 (under $500K), $7,500 ($500K-$1M), $10,000 ($1M-$3M), $15,000+ ($3M+). Optional monthly support retainers are 0.5% to 2% of annual revenue ($750-$6,000+/month). Hourly support is $199/hr. Custom development is $299/hr. This is infrastructure and consulting, not a SaaS subscription."}},
              {"@type":"Question","name":"Can Full Loop CRM replace Jobber, Housecall Pro, or ServiceTitan for my cleaning business?","acceptedAnswer":{"@type":"Answer","text":"Yes. Full Loop CRM replaces Jobber (scheduling), Housecall Pro (field management), ServiceTitan (operations), Mailchimp (email marketing), SimpleTexting (SMS), Google Analytics (tracking), QuickBooks (finance), ReferralCandy (referrals), and more. The key difference is that those tools only handle one stage each and don't generate leads. Full Loop CRM starts with organic lead generation and carries through the entire business cycle to reviews and retargeting — one login, zero integrations needed."}},
              {"@type":"Question","name":"How does the client self-service booking portal work for scheduling cleaning services?","acceptedAnswer":{"@type":"Answer","text":"Clients access a mobile-friendly booking portal with phone + email two-factor authentication. The 3-step booking wizard walks them through: Step 1 — client info (pre-filled for returning clients), Step 2 — service type, bedrooms, bathrooms, and add-ons with real-time pricing, Step 3 — date and time selection from a live availability calendar that respects team schedules and 90-minute job buffers. Booking confirmation is sent instantly via email and SMS, and automated reminders follow at 7 days, 3 days, 1 day, and 2 hours before service."}},
              {"@type":"Question","name":"Does Full Loop CRM offer a referral program with commission tracking for cleaning businesses?","acceptedAnswer":{"@type":"Answer","text":"Yes. Full Loop CRM includes a complete referral program with self-service referrer signup, unique referral codes, trackable links, real-time click and conversion analytics, automatic 10% commission calculation on the first booking of every referred client, and one-click payout processing via Zelle or Apple Cash. Referrers get their own dashboard to track link performance, conversions, and earnings."}},
              {"@type":"Question","name":"What kind of analytics and reporting does Full Loop CRM provide for home service companies?","acceptedAnswer":{"@type":"Answer","text":"Full Loop CRM provides multi-layer analytics: website tracking across 100+ domains with visitor counts, CTA clicks, scroll depth, and time on page; traffic source breakdown (Google, Bing, ChatGPT, DuckDuckGo, social, direct); domain health classification (Revenue, Converting, Traffic Only, Dead); revenue attribution with confidence scoring; client lifecycle analytics (New, Active, At-Risk, Churned); retention and churn rates; average lifetime value; top 10 clients by revenue; 10-month revenue forecasting; and full P&L with margin analysis."}},
              {"@type":"Question","name":"How does Full Loop CRM track leads from Google, Bing, and AI search engines like ChatGPT?","acceptedAnswer":{"@type":"Answer","text":"Every website visit across your domain portfolio is tracked with the referring source. Full Loop CRM categorizes traffic from Google, Bing, Yahoo, DuckDuckGo, and AI search engines including ChatGPT, Claude, and Perplexity. Each visit captures the domain, referrer, device type (mobile or desktop), session ID, scroll depth, and time on page. CTA events (calls, texts, book clicks, directions) are tracked separately with the same detail, giving you a complete picture of which search engines drive real conversions."}},
              {"@type":"Question","name":"Can Full Loop CRM run my entire home service business without me being involved day-to-day?","acceptedAnswer":{"@type":"Answer","text":"Yes. Full Loop CRM is designed for fully autonomous operation. Website tracking, lead attribution, AI sales via Selenas, online booking, confirmation emails and SMS, 4-stage reminder cascades, recurring booking generation, GPS check-in/out, pay calculation, post-service follow-ups, lifecycle status updates, referral tracking, and daily team summaries all run without human intervention. Human decision points are optional: booking approval, team assignment, payroll marking, complaint callbacks, and pricing changes can all be automated or kept as manual checkpoints — your choice."}},
              {"@type":"Question","name":"What notifications does Full Loop CRM send to business owners and team members?","acceptedAnswer":{"@type":"Answer","text":"Full Loop CRM sends 20+ notification types via three channels: email, SMS, and web push. Notifications include hot leads, new bookings, booking confirmations, check-in/out events, GPS mismatches, payment received, cancellation alerts, team applications, referral signups, emergency job broadcasts, daily team summaries, recurring series expiry alerts, pending booking nudges, system health checks, and error alerts. Each notification type has a unique color-coded icon and can be toggled per channel in settings."}},
              {"@type":"Question","name":"How secure is Full Loop CRM for storing client data and processing payments?","acceptedAnswer":{"@type":"Answer","text":"Full Loop CRM uses enterprise-grade security: HMAC-SHA256 signed session cookies, rate limiting on all public API endpoints, Content Security Policy headers, HTTP Strict Transport Security (HSTS) enforcement, XSS and clickjacking protection, and Row Level Security (RLS) on every Supabase database table. Client portal login uses phone + email two-factor authentication. Team portal uses PIN-based authentication with persistent encrypted sessions. All data is encrypted in transit via TLS and at rest in PostgreSQL."}},
              {"@type":"Question","name":"Does Full Loop CRM work for home service businesses in any US city?","acceptedAnswer":{"@type":"Answer","text":"Absolutely. Full Loop CRM is designed for any mid-to-large US metropolitan area and its surrounding neighborhoods. The multi-domain SEO strategy, AI sales assistant, scheduling, GPS-verified operations, and financial tools work identically regardless of geography. Whether you serve a single metro or are expanding into neighboring markets, the platform scales with you."}},
              {"@type":"Question","name":"How do I apply to become a Full Loop CRM partner for my home service business?","acceptedAnswer":{"@type":"Answer","text":"Text us at (212) 202-9220, call us, or email hello@fullloopcrm.com. Tell us your trade, your city, and a little about your business. We will check territory availability for your trade in your metro area. If your market is open and you are the right fit — a business owner committed to organic growth who values long-term partnership and real operational guidance — we will walk you through the platform live, discuss the partnership structure, and lock your exclusive territory."}}
            ]
          })
        }}
      />
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


{/* NAVIGATION */}
<nav>
  <a href="#" className="nav-logo">Full<span>Loop</span> CRM</a>
  <div className="nav-links">
    <a href="#features">Features</a>
    <a href="#dashboards">Dashboards</a>
    <a href="#Selenas">AI Sales</a>
    <a href="#portals">Portals</a>
    <a href="#pricing">Pricing</a>
    <a href="#reviews">Reviews</a>
    <a href="#faq">FAQ</a>
    <Link href="/sign-in" className="nav-signin">Sign In</Link>
    <a href="#contact" className="nav-cta">Request Partnership</a>
  </div>
  <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Toggle menu">
    <span></span><span></span><span></span>
  </button>
</nav>

{/* MOBILE SLIDE-IN MENU */}
<div className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
<div className={`mobile-menu ${mobileMenuOpen ? 'active' : ''}`}>
  <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>&times;</button>
  <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
  <a href="#dashboards" onClick={() => setMobileMenuOpen(false)}>Dashboards</a>
  <a href="#Selenas" onClick={() => setMobileMenuOpen(false)}>AI Sales</a>
  <a href="#portals" onClick={() => setMobileMenuOpen(false)}>Portals</a>
  <a href="#analytics" onClick={() => setMobileMenuOpen(false)}>Analytics</a>
  <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
  <a href="#reviews" onClick={() => setMobileMenuOpen(false)}>Reviews</a>
  <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
  <a href="#compare" onClick={() => setMobileMenuOpen(false)}>Compare</a>
  <a href="#founder" onClick={() => setMobileMenuOpen(false)}>About</a>
  <a href="#contact" className="mobile-cta" onClick={() => setMobileMenuOpen(false)}>Request Partnership</a>
  <div className="mobile-contact">
    <a href="sms:+12122029220">Text Us: (212) 202-9220</a>
    <a href="tel:+12122029220">Call Us: (212) 202-9220</a>
    <a href="mailto:hello@fullloopcrm.com">hello@fullloopcrm.com</a>
  </div>
</div>



{/* HERO */}
<header className="hero">
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
    <a href="sms:+12122029220" className="btn-primary">Text Us</a>
    <a href="tel:+12122029220" className="btn-primary">Call Us</a>
  </div>
  <p className="hero-footer-note">Currently accepting partnership requests for qualified home service business owners.</p>
</header>
<div className="hero-gradient-fade"></div>

{/* COST BREAKDOWN */}
<section className="cost-section" id="cost-breakdown">
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
<section className="replaces-section" id="selenas-replaces">
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
<section className="lead-engine-section" id="lead-engine">
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
<section className="bottom-line-section">
  <div className="bottom-line-container">
    <h2><span>$153,800</span> saved on operations. Zero staff to manage. Your business runs on autopilot.</h2>
    <p>Full Loop replaces your entire operational stack — sales, scheduling, customer service, payments, reviews, retargeting — for $25K/year. Add your website network once, and organic leads flow in forever. No ad spend. No staffing headaches. No gaps.</p>
  </div>
</section>

{/* THE LOOP */}
<section className="loop-section" id="loop">
  <div className="loop-container">
    <div className="loop-header">
      <h2>The Full Loop</h2>
      <p>Seven stages. Zero gaps. Every stage of your business, connected.</p>
    </div>
    <div className="loop-steps">
      <div className="loop-step">
        <div className="loop-num">1</div>
        <h3>Lead Gen</h3>
        <p>Organic SEO across multi-domain network</p>
      </div>
      <div className="loop-step">
        <div className="loop-num">2</div>
        <h3>Sales</h3>
        <p>AI chatbot qualifies and converts leads</p>
      </div>
      <div className="loop-step">
        <div className="loop-num">3</div>
        <h3>Scheduling</h3>
        <p>Automated booking with smart availability</p>
      </div>
      <div className="loop-step">
        <div className="loop-num">4</div>
        <h3>Operations</h3>
        <p>GPS-tracked field team management</p>
      </div>
      <div className="loop-step">
        <div className="loop-num">5</div>
        <h3>Payment</h3>
        <p>Collection, payroll, and full P&amp;L</p>
      </div>
      <div className="loop-step">
        <div className="loop-num">6</div>
        <h3>Reviews</h3>
        <p>Automated feedback and review generation</p>
      </div>
      <div className="loop-step">
        <div className="loop-num">7</div>
        <h3>Retarget</h3>
        <p>Re-engage at-risk clients and referrals</p>
      </div>
    </div>
  </div>
</section>

{/* STATS */}
<div className="stats-bar">
  <div className="stats-grid">
    <div className="stat-item">
      <h3>7</h3>
      <p>Business stages covered</p>
    </div>
    <div className="stat-item">
      <h3>9+</h3>
      <p>Tools replaced</p>
    </div>
    <div className="stat-item">
      <h3>1</h3>
      <p>Partner per trade per city</p>
    </div>
    <div className="stat-item">
      <h3>24/7</h3>
      <p>AI sales assistant</p>
    </div>
  </div>
</div>

{/* STAGE 1: LEAD GENERATION */}
<section id="features">
  <div className="section-container">
    <div className="section-header">
      <span className="section-label" style={{background: 'var(--blue-light)', color: 'var(--blue)'}}>Stage 1 — Lead Generation</span>
      <h2>Organic Lead Generation That Actually Drives Revenue</h2>
      <p>Forget paying per click. Full Loop CRM's multi-domain SEO strategy puts you at the top of local search results across every neighborhood you serve.</p>
    </div>
    <div className="features-grid">
      <div className="feature-card">
        <div className="feature-icon blue-icon">&#127760;</div>
        <h3>Multi-Domain SEO Network</h3>
        <p>Deploy neighborhood-specific websites that rank organically in local search. Target hyper-local keywords like "your trade + your neighborhood" with dedicated domains that own those search results.</p>
        <ul className="blue-dot">
          <li>Support for 100+ domains across unlimited markets</li>
          <li>Each domain optimized for hyper-local long-tail keywords</li>
          <li>Cover every borough, neighborhood, and suburb you serve</li>
          <li>No monthly ad spend — pure organic traffic</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon blue-icon">&#128200;</div>
        <h3>Domain Performance Analytics</h3>
        <p>See exactly which domains drive revenue, not just traffic. Full Loop CRM tracks every visitor, every CTA click, and attributes actual bookings and dollars to specific domains.</p>
        <ul className="blue-dot">
          <li>Revenue attribution per domain with confidence scoring</li>
          <li>Conversion rate tracking (visits to calls, texts, bookings)</li>
          <li>Domain health status: Revenue / Converting / Traffic / Dead</li>
          <li>Engagement quality metrics (scroll depth, time on page)</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon blue-icon">&#128269;</div>
        <h3>Traffic Source Intelligence</h3>
        <p>Know where your leads actually come from. Track Google, Bing, ChatGPT, Claude, DuckDuckGo, social media, and direct — with device-level detail and session tracking.</p>
        <ul className="blue-dot">
          <li>Real-time live feed of all website visits and CTA events</li>
          <li>Referrer breakdown with percentage visualization</li>
          <li>AI search engine tracking (ChatGPT, Claude, Perplexity)</li>
          <li>Mobile vs. desktop traffic segmentation</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon blue-icon">&#127919;</div>
        <h3>Smart Lead Attribution</h3>
        <p>Our attribution engine connects the dots between a website visit and a booked appointment — even when the client books days later through a different channel.</p>
        <ul className="blue-dot">
          <li>Address-to-neighborhood-to-domain matching</li>
          <li>Confidence-weighted scoring (100% within 1hr, declining over 7 days)</li>
          <li>Cross-domain attribution for brand and neighborhood sites</li>
          <li>CTA-specific attribution for calls, texts, and book clicks</li>
        </ul>
      </div>
    </div>
  </div>
</section>

{/* STAGE 2: AI SALES (Selenas) */}
<section className="Selenas-section" id="Selenas">
  <div className="Selenas-container">
    <div className="Selenas-content">
      <span className="section-label" style={{background: 'rgba(37,99,235,0.15)', color: '#60a5fa'}}>Stage 2 — AI-Powered Sales</span>
      <h2>Meet <span>Selenas</span>, your 24/7 AI sales agent.</h2>
      <p>Selenas is a bilingual AI sales assistant that engages every inbound lead via SMS — instantly. She qualifies prospects, answers questions, quotes pricing, and guides them straight to booking. No scripts, no hold music, no missed leads.</p>
      <p>For existing clients, Selenas handles scheduling inquiries, rescheduling, cancellation policy, and even complaint escalation — all with full awareness of their booking history.</p>
      <ul className="Selenas-features">
        <li>Engages new leads within seconds — 24 hours a day, 7 days a week</li>
        <li>Qualifies leads: location, service type, home size, budget preference</li>
        <li>Bilingual (English and Spanish) with natural conversational tone</li>
        <li>Answers 12+ common questions (pricing, insurance, cancellation, eco, etc.)</li>
        <li>Existing client context: knows their next booking, cleaner name, last bill</li>
        <li>Handles rescheduling requests, cancellation inquiries, and complaints</li>
        <li>Full conversation transcripts logged and viewable in admin dashboard</li>
        <li>TCPA-compliant with opt-out (STOP) and opt-in (START) handling</li>
      </ul>
    </div>
    <div className="Selenas-chat">
      <div className="chat-header"><h4>SMS Conversation</h4></div>
      <div className="chat-label">New Lead</div>
      <div className="chat-bubble chat-in">Hi, do you service the Westside area?</div>
      <div className="chat-label chat-label-right">Selenas</div>
      <div className="chat-bubble chat-out">Hey! Thanks for reaching out. Westside, nice! We got a lot of clients over there. What kind of service are you looking for?</div>
      <div className="chat-bubble chat-out">1. Regular<br />2. Deep<br />3. Move In/Out<br />4. Emergency</div>
      <div className="chat-label">New Lead</div>
      <div className="chat-bubble chat-in">Deep clean please</div>
      <div className="chat-label chat-label-right">Selenas</div>
      <div className="chat-bubble chat-out">Love it — you're gonna see a big difference. Inside the oven, behind the fridge, all of it. How many bedrooms?</div>
    </div>
  </div>
</section>

{/* STAGE 3: SCHEDULING */}
<section className="alt-bg">
  <div className="section-container">
    <div className="section-header">
      <span className="section-label" style={{background: 'var(--teal-light)', color: 'var(--teal)'}}>Stage 3 — Scheduling</span>
      <h2>Intelligent Scheduling That Runs Itself</h2>
      <p>From one-time deep cleans to complex recurring schedules, Full Loop CRM handles every booking scenario with smart availability, automated reminders, and conflict prevention.</p>
    </div>
    <div className="features-grid">
      <div className="feature-card">
        <div className="feature-icon teal-icon">&#128197;</div>
        <h3>Smart Booking Engine</h3>
        <p>Clients book online through a 3-step wizard that checks real-time team availability, respects buffer times between jobs, and prevents scheduling conflicts automatically.</p>
        <ul className="teal-dot">
          <li>Real-time availability grid based on team schedules</li>
          <li>90-minute buffer between jobs for travel time</li>
          <li>Same-day booking controls (online vs. phone-only)</li>
          <li>Multi-step booking flow: info, service, date/confirm</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon teal-icon">&#128260;</div>
        <h3>Recurring Booking Management</h3>
        <p>Support every recurring pattern your clients need — weekly, biweekly, monthly, or custom intervals. Edit single instances or entire series with one click.</p>
        <ul className="teal-dot">
          <li>7 recurring types: daily, weekly, biweekly, triweekly, monthly by date, monthly by weekday, custom</li>
          <li>End conditions: never, after X occurrences, on specific date</li>
          <li>Edit single booking or all future bookings in series</li>
          <li>Visual preview of all generated recurring dates</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon teal-icon">&#128276;</div>
        <h3>Automated Reminder System</h3>
        <p>Never have a no-show again. Full Loop CRM sends multi-channel reminders at 7 days, 3 days, 1 day, and 2 hours before every appointment via email, SMS, and push notifications.</p>
        <ul className="teal-dot">
          <li>4-stage reminder cascade (7d, 3d, 1d, 2hr)</li>
          <li>Email + SMS + push notification delivery</li>
          <li>Automatic deduplication (never sends the same reminder twice)</li>
          <li>Configurable reminder timing in settings</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon teal-icon">&#128467;</div>
        <h3>Visual Calendar</h3>
        <p>Full calendar view with month, week, and day modes. Drag-and-drop to reschedule, color-coded by team member, with real-time status tracking.</p>
        <ul className="teal-dot">
          <li>Month, week, and day views with instant switching</li>
          <li>Drag-and-drop rescheduling with auto price recalculation</li>
          <li>Color-coded by cleaner for instant visual team overview</li>
          <li>Filter by team member, status, or date range</li>
        </ul>
      </div>
    </div>
  </div>
</section>

{/* STAGE 4: OPERATIONS */}
<section>
  <div className="section-container">
    <div className="section-header">
      <span className="section-label" style={{background: 'var(--orange-light)', color: 'var(--orange)'}}>Stage 4 — Field Operations</span>
      <h2>Complete Field Team Management with GPS Verification</h2>
      <p>Your team gets their own bilingual portal with daily schedules, GPS-verified check-in/out, earnings tracking, and job claiming — all from their phone.</p>
    </div>
    <div className="features-grid">
      <div className="feature-card">
        <div className="feature-icon orange-icon">&#128205;</div>
        <h3>GPS Check-In / Check-Out</h3>
        <p>Team members check in and out of every job with GPS verification. The system calculates distance from the client's address, flags mismatches, and auto-computes hours worked and pay earned.</p>
        <ul className="orange-dot">
          <li>GPS coordinates captured and stored for every check-in/out</li>
          <li>Address geocoding with distance verification (528-foot threshold)</li>
          <li>Automatic actual hours and pay calculation on checkout</li>
          <li>GPS mismatch flagging visible in admin dashboard</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon orange-icon">&#128241;</div>
        <h3>Bilingual Team Portal</h3>
        <p>Designed for cleaners, not office workers. PIN-based login, today's jobs at a glance, one-tap navigation to client's address, and full English/Spanish support throughout.</p>
        <ul className="orange-dot">
          <li>Simple PIN login (4-6 digits) — no passwords to forget</li>
          <li>Full English and Spanish bilingual interface</li>
          <li>One-tap Google Maps navigation to job address</li>
          <li>Click-to-call and click-to-text client contact</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon orange-icon">&#128176;</div>
        <h3>Earnings Dashboard</h3>
        <p>Every team member sees their earnings in real time — weekly, monthly, and yearly totals with full job breakdowns. Transparency builds trust and reduces payroll disputes.</p>
        <ul className="orange-dot">
          <li>Weekly, monthly, and yearly earnings with hours breakdown</li>
          <li>Per-job pay visibility on completed bookings</li>
          <li>Hourly rate display with payment method info</li>
          <li>Today's potential earnings for scheduled jobs</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon orange-icon">&#9889;</div>
        <h3>Emergency Job Broadcasting</h3>
        <p>Last-minute job? Broadcast it to your entire team via email, SMS, and push. First-come-first-served claiming ensures the fastest response.</p>
        <ul className="orange-dot">
          <li>One-click broadcast to all active team members</li>
          <li>Multi-channel delivery: email + SMS + push</li>
          <li>Team members claim jobs from their portal</li>
          <li>Shows pay rate, location, time, and service type</li>
        </ul>
      </div>
    </div>
  </div>
</section>

{/* STAGE 5: PAYMENTS */}
<section className="alt-bg">
  <div className="section-container">
    <div className="section-header">
      <span className="section-label" style={{background: 'var(--green-light)', color: 'var(--green)'}}>Stage 5 — Payments &amp; Finance</span>
      <h2>Full Financial Command Center</h2>
      <p>Track every dollar in and out of your business. Client payments, team payroll, expenses, bank statements, and tax-ready 1099 reports — all in one place.</p>
    </div>
    <div className="features-grid">
      <div className="feature-card">
        <div className="feature-icon green-icon">&#128178;</div>
        <h3>Revenue Tracking</h3>
        <p>Real-time revenue dashboard showing collected today, this week, this month, and full year-to-date with projected annual tracking. See what's been paid and what's outstanding.</p>
        <ul className="green-dot">
          <li>Today, weekly, monthly, and YTD revenue views</li>
          <li>10-month rolling revenue forecast</li>
          <li>Paid vs. outstanding payment breakdown</li>
          <li>Click any revenue card to see underlying jobs</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon green-icon">&#128179;</div>
        <h3>Payroll Management</h3>
        <p>Per-team-member payroll tracking with one-click "Mark Paid" buttons. See who's owed what, for which jobs, and track payment history over time.</p>
        <ul className="green-dot">
          <li>Per-cleaner pending pay summary</li>
          <li>One-click Zelle and Apple Cash payment marking</li>
          <li>Full payment history with job cross-reference</li>
          <li>Auto-calculated pay from actual hours worked</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon green-icon">&#128202;</div>
        <h3>P&amp;L and Margin Analysis</h3>
        <p>Real profit and loss reporting with expense tracking, margin analysis, and period comparisons. Know your gross margin, net margin, average job revenue, and average labor cost at a glance.</p>
        <ul className="green-dot">
          <li>Monthly and YTD P&amp;L with revenue, labor, expenses, commissions</li>
          <li>Gross and net margin percentage calculations</li>
          <li>9 expense categories with receipt uploads</li>
          <li>Bank statement management with PDF storage</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon green-icon">&#128196;</div>
        <h3>Tax-Ready 1099 Reports</h3>
        <p>Automatically generates contractor summary reports for tax season. See total paid per contractor, job counts, and 1099 filing requirement flags.</p>
        <ul className="green-dot">
          <li>Per-contractor total paid YTD</li>
          <li>Automatic $600 threshold flagging</li>
          <li>CSV export for accountant handoff</li>
          <li>IRS compliance guidance notes</li>
        </ul>
      </div>
    </div>
  </div>
</section>

{/* STAGE 6: FEEDBACK & REVIEWS */}
<section>
  <div className="section-container">
    <div className="section-header">
      <span className="section-label" style={{background: 'var(--yellow-light)', color: 'var(--yellow)'}}>Stage 6 — Feedback &amp; Reviews</span>
      <h2>Turn Every Job into a 5-Star Review</h2>
      <p>Automated post-service follow-ups collect feedback, resolve issues before they become public, and drive satisfied clients to leave reviews where it matters.</p>
    </div>
    <div className="features-grid">
      <div className="feature-card">
        <div className="feature-icon yellow-icon">&#11088;</div>
        <h3>Automated Thank-You Follow-Ups</h3>
        <p>Three days after a first-time client's service, they automatically receive a personalized thank-you email and SMS with a 10% discount offer for their next booking.</p>
        <ul className="yellow-dot">
          <li>Triggered 3 days after first completed service</li>
          <li>Email + SMS dual delivery</li>
          <li>10% discount code for next booking</li>
          <li>Once-per-year frequency cap to prevent fatigue</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon yellow-icon">&#128172;</div>
        <h3>Anonymous Feedback Collection</h3>
        <p>Floating feedback widget on every client-facing page plus standalone feedback form linked from emails. Anonymous submission encourages honest input.</p>
        <ul className="yellow-dot">
          <li>Embedded widget on all client portal pages</li>
          <li>Standalone feedback page linked from every email</li>
          <li>Source tracking (which page or email generated the feedback)</li>
          <li>Admin notification for every submission</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon yellow-icon">&#128170;</div>
        <h3>Complaint Escalation via AI</h3>
        <p>When a client texts a complaint, Selenas immediately recognizes negative sentiment and escalates to a phone call rather than attempting resolution over text. Damage is caught before it goes public.</p>
        <ul className="yellow-dot">
          <li>Intent detection for complaints, damage, and dissatisfaction</li>
          <li>Immediate escalation to direct phone contact</li>
          <li>Uses client's first name for personal touch</li>
          <li>Admin notification for every complaint detected</li>
        </ul>
      </div>
    </div>
  </div>
</section>

{/* STAGE 7: RETARGETING */}
<section className="alt-bg">
  <div className="section-container">
    <div className="section-header">
      <span className="section-label" style={{background: 'var(--red-light)', color: 'var(--red)'}}>Stage 7 — Marketing &amp; Retargeting</span>
      <h2>Re-Engage, Retain, and Grow Your Client Base</h2>
      <p>Full Loop CRM doesn't just find you clients — it keeps them. Client lifecycle analytics, at-risk detection, referral programs, and multi-channel retargeting close the loop and restart the cycle.</p>
    </div>
    <div className="features-grid">
      <div className="feature-card">
        <div className="feature-icon red-icon">&#128202;</div>
        <h3>Client Lifecycle Analytics</h3>
        <p>Every client is automatically categorized as New, Active, At-Risk, or Churned based on their booking recency. You always know who needs attention before they leave.</p>
        <ul className="red-dot">
          <li>New: No completed bookings yet</li>
          <li>Active: Service within last 45 days</li>
          <li>At-Risk: 45-90 days since last service</li>
          <li>Churned: 90+ days since last service</li>
          <li>Configurable thresholds in settings</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon red-icon">&#127873;</div>
        <h3>Referral Program Engine</h3>
        <p>Built-in referral program with self-service signup, unique referral codes, click tracking, automatic 10% commission calculation, and payout management via Zelle or Apple Cash.</p>
        <ul className="red-dot">
          <li>Self-service referrer signup portal</li>
          <li>Unique referral codes with trackable links</li>
          <li>Real-time click and conversion analytics</li>
          <li>Automatic 10% commission calculation on bookings</li>
          <li>One-click Zelle/Apple Cash payout marking</li>
          <li>Referrer dashboard with earnings and link stats</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon red-icon">&#128140;</div>
        <h3>Client Retention Intelligence</h3>
        <p>Track retention rate, churn rate, average LTV, revenue per client, and identify your top 10 highest-value clients. Know exactly who drives your business.</p>
        <ul className="red-dot">
          <li>Overall retention and churn rate calculations</li>
          <li>Average lifetime value (LTV) per client</li>
          <li>Top 10 clients by total revenue</li>
          <li>Revenue attribution by referral source</li>
          <li>Average days between bookings per client</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon red-icon">&#128232;</div>
        <h3>Multi-Channel Communication</h3>
        <p>Reach clients and team members through email, SMS, and push notifications — all from one platform with delivery tracking, consent management, and bilingual templates.</p>
        <ul className="red-dot">
          <li>15+ email templates (Outlook-compatible, responsive)</li>
          <li>SMS via Telnyx with retry logic and delivery tracking</li>
          <li>Web Push notifications for all user roles</li>
          <li>TCPA-compliant opt-out/opt-in management</li>
          <li>Bilingual templates for team communications</li>
        </ul>
      </div>
    </div>
  </div>
</section>

{/* CLIENT MANAGEMENT */}
<section>
  <div className="section-container">
    <div className="section-header">
      <span className="section-label" style={{background: 'var(--purple-light)', color: 'var(--purple)'}}>Core Platform</span>
      <h2>Enterprise-Grade Client Management</h2>
      <p>Every client interaction, booking, payment, and communication in one unified profile. Full Loop CRM gives you complete visibility into your client relationships.</p>
    </div>
    <div className="features-grid">
      <div className="feature-card">
        <div className="feature-icon purple-icon">&#128100;</div>
        <h3>Complete Client Profiles</h3>
        <p>Name, email, phone, address with autocomplete, referral source, booking history, total spent, lifecycle status, SMS transcript, and full activity timeline — all in one view.</p>
        <ul className="purple-dot">
          <li>Smart address autocomplete powered by Radar API</li>
          <li>Email validation with typo detection and suggestions</li>
          <li>Phone number formatting and deduplication</li>
          <li>Do Not Service flagging for policy violations</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon purple-icon">&#128221;</div>
        <h3>Full Activity Timeline</h3>
        <p>See everything that's happened with a client: account creation, bookings, check-ins/outs (with GPS coordinates and distance), cancellations, and payments — in chronological order.</p>
        <ul className="purple-dot">
          <li>GPS-verified check-in/out with distance display</li>
          <li>Booking creation and status change history</li>
          <li>Payment events with method tracking</li>
          <li>Notification cross-references</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon purple-icon">&#128172;</div>
        <h3>SMS Conversation Transcripts</h3>
        <p>Every SMS exchanged with a client — both inbound and outbound — is logged and viewable in a chat-bubble interface directly in the client profile. Full conversation history at your fingertips.</p>
        <ul className="purple-dot">
          <li>Chat-bubble UI with date grouping</li>
          <li>Last 200 messages per client</li>
          <li>Inbound and outbound direction tracking</li>
          <li>Expandable with "Show all" button</li>
        </ul>
      </div>
      <div className="feature-card">
        <div className="feature-icon purple-icon">&#128187;</div>
        <h3>Client Self-Service Portal</h3>
        <p>Clients get their own portal to view upcoming appointments, reschedule recurring services, add notes, and book again — reducing your phone calls and admin time.</p>
        <ul className="purple-dot">
          <li>Phone + email verification login (2FA)</li>
          <li>View upcoming and past bookings</li>
          <li>Reschedule recurring bookings (with policy enforcement)</li>
          <li>Inline re-booking with real-time availability</li>
          <li>Push notification enrollment</li>
        </ul>
      </div>
    </div>
  </div>
</section>

{/* ADMIN DASHBOARD */}
<section className="alt-bg">
  <div className="section-container">
    <div className="section-header">
      <span className="section-label" style={{background: 'var(--gray-100)', color: 'var(--gray-700)'}}>Command Center</span>
      <h2>One Dashboard to Run Your Entire Business</h2>
      <p>11 purpose-built admin pages covering every aspect of your operation. Real-time data, instant actions, zero switching between tools.</p>
    </div>
    <div className="features-grid">
      <div className="feature-card">
        <div className="feature-icon" style={{background: 'var(--gray-100)', color: 'var(--gray-700)'}}>&#128200;</div>
        <h3>Executive Dashboard</h3>
        <p>Revenue cards (today, week, month, YTD, owed), scheduled job forecasting for 10 months out, today's and upcoming job feeds, interactive job location map filterable by cleaner and status.</p>
      </div>
      <div className="feature-card">
        <div className="feature-icon" style={{background: 'var(--gray-100)', color: 'var(--gray-700)'}}>&#128276;</div>
        <h3>Real-Time Notifications</h3>
        <p>20+ notification types with color-coded icons: hot leads, new bookings, check-ins, payments, errors, team applications, referrals. Bell icon with unread count, auto-refresh every 60 seconds.</p>
      </div>
      <div className="feature-card">
        <div className="feature-icon" style={{background: 'var(--gray-100)', color: 'var(--gray-700)'}}>&#128736;</div>
        <h3>Automated Cron Jobs</h3>
        <p>Daily team summaries, multi-stage client reminders, recurring series expiry alerts, pending booking nudges, health checks, and automatic database backups — all running on autopilot.</p>
      </div>
      <div className="feature-card">
        <div className="feature-icon" style={{background: 'var(--gray-100)', color: 'var(--gray-700)'}}>&#128274;</div>
        <h3>Enterprise Security</h3>
        <p>HMAC-SHA256 session signing, rate limiting on all public endpoints, Content Security Policy headers, HSTS enforcement, XSS/clickjacking protection, and Row Level Security on every database table.</p>
      </div>
      <div className="feature-card">
        <div className="feature-icon" style={{background: 'var(--gray-100)', color: 'var(--gray-700)'}}>&#127968;</div>
        <h3>Domain Portfolio Map</h3>
        <p>Visual interactive map showing your entire website network across all markets — every neighborhood, suburb, and surrounding area in your metro — with region-based color coding and live links.</p>
      </div>
      <div className="feature-card">
        <div className="feature-icon" style={{background: 'var(--gray-100)', color: 'var(--gray-700)'}}>&#128218;</div>
        <h3>Built-In Documentation</h3>
        <p>25-section in-app technical documentation covering every page, API route, database table, component, library, and integration. Your entire platform, documented and searchable.</p>
      </div>
    </div>
  </div>
</section>

{/* ===== DEEP DIVE: ADMIN DASHBOARD PAGE BY PAGE ===== */}
<section className="mockup-section" id="dashboards">
  <div className="mockup-container">
    <div className="mockup-header">
      <span className="mockup-label" style={{background: 'var(--gray-100)', color: 'var(--gray-700)'}}>Admin Dashboard — Page by Page</span>
      <h2>11 Purpose-Built Pages. Every Detail of Your Business.</h2>
      <p>Here is every single page inside the Full Loop CRM admin dashboard — what it shows, what you can do, and sample data from a real operation.</p>
    </div>

    {/* PAGE 1: EXECUTIVE DASHBOARD */}
    <div className="page-walkthrough">
      <h3>Page 1: Executive Dashboard <span>/dashboard</span></h3>
      <p>Your command center. The first screen you see on login — a real-time snapshot of revenue, today's jobs, upcoming schedule, and an interactive map of all job locations. Every stat card is clickable, drilling down to the underlying data.</p>
      <div className="dashboard-frame">
        <div className="dashboard-titlebar">
          <div className="titlebar-dot red"></div><div className="titlebar-dot yellow"></div><div className="titlebar-dot green"></div>
          <span className="titlebar-title">Full Loop CRM — Executive Dashboard</span>
        </div>
        <div className="dashboard-body">
          <div className="stat-cards">
            <div className="stat-card green-card"><div className="stat-val">$1,840</div><div className="stat-label">Collected Today</div></div>
            <div className="stat-card highlight"><div className="stat-val">$8,290</div><div className="stat-label">This Week</div></div>
            <div className="stat-card"><div className="stat-val">$34,650</div><div className="stat-label">This Month</div></div>
            <div className="stat-card"><div className="stat-val">$287,400</div><div className="stat-label">Year-to-Date</div></div>
            <div className="stat-card orange-card"><div className="stat-val">$2,150</div><div className="stat-label">Outstanding</div></div>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
            <div>
              <h4 style={{fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.75rem'}}>Today's Jobs (6)</h4>
              <div className="live-feed">
                <div className="feed-item"><div className="feed-dot" style={{background: 'var(--green)'}}></div> <span>Team Member A — 412 Oak St</span> <span className="badge badge-green">Checked In</span> <span className="feed-time">9:02 AM</span></div>
                <div className="feed-item"><div className="feed-dot" style={{background: 'var(--blue)'}}></div> <span>Team Member B — 890 Elm Ave</span> <span className="badge badge-blue">En Route</span> <span className="feed-time">10:30 AM</span></div>
                <div className="feed-item"><div className="feed-dot" style={{background: 'var(--gray-400)'}}></div> <span>Team Member C — 155 Main St</span> <span className="badge badge-gray">Scheduled</span> <span className="feed-time">1:00 PM</span></div>
                <div className="feed-item"><div className="feed-dot" style={{background: 'var(--gray-400)'}}></div> <span>Team Member D — 720 Pine Blvd</span> <span className="badge badge-gray">Scheduled</span> <span className="feed-time">2:30 PM</span></div>
                <div className="feed-item"><div className="feed-dot" style={{background: 'var(--gray-400)'}}></div> <span>Team Member E — 88 Cedar Ln</span> <span className="badge badge-gray">Scheduled</span> <span className="feed-time">3:00 PM</span></div>
              </div>
            </div>
            <div>
              <h4 style={{fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.75rem'}}>10-Month Revenue Forecast</h4>
              <div className="bar-chart">
                <div className="bar-col"><div className="bar-val">$32K</div><div className="bar" style={{height: '75%', background: 'var(--blue)'}}></div><div className="bar-label">Mar</div></div>
                <div className="bar-col"><div className="bar-val">$35K</div><div className="bar" style={{height: '82%', background: 'var(--blue)'}}></div><div className="bar-label">Apr</div></div>
                <div className="bar-col"><div className="bar-val">$38K</div><div className="bar" style={{height: '88%', background: 'var(--blue)'}}></div><div className="bar-label">May</div></div>
                <div className="bar-col"><div className="bar-val">$41K</div><div className="bar" style={{height: '95%', background: 'var(--blue)'}}></div><div className="bar-label">Jun</div></div>
                <div className="bar-col"><div className="bar-val">$43K</div><div className="bar" style={{height: '100%', background: 'var(--blue)'}}></div><div className="bar-label">Jul</div></div>
                <div className="bar-col"><div className="bar-val">$40K</div><div className="bar" style={{height: '93%', background: 'var(--blue)'}}></div><div className="bar-label">Aug</div></div>
                <div className="bar-col"><div className="bar-val">$37K</div><div className="bar" style={{height: '86%', background: 'var(--blue)'}}></div><div className="bar-label">Sep</div></div>
                <div className="bar-col"><div className="bar-val">$39K</div><div className="bar" style={{height: '90%', background: 'var(--blue)'}}></div><div className="bar-label">Oct</div></div>
                <div className="bar-col"><div className="bar-val">$36K</div><div className="bar" style={{height: '84%', background: 'var(--blue)'}}></div><div className="bar-label">Nov</div></div>
                <div className="bar-col"><div className="bar-val">$42K</div><div className="bar" style={{height: '98%', background: 'var(--green)'}}></div><div className="bar-label">Dec</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="page-features">
        <div className="page-feature"><strong>Revenue Cards</strong><span>Today, Week, Month, YTD, Outstanding — click any card to drill down</span></div>
        <div className="page-feature"><strong>Interactive Map</strong><span>Leaflet.js map with job pins, filterable by cleaner and status</span></div>
        <div className="page-feature"><strong>Today's Feed</strong><span>Live feed of all jobs with check-in status, times, and locations</span></div>
        <div className="page-feature"><strong>10-Month Forecast</strong><span>Projected revenue based on recurring bookings and seasonal trends</span></div>
      </div>
    </div>

    {/* PAGE 2: CLIENTS */}
    <div className="page-walkthrough">
      <h3>Page 2: Client Management <span>/dashboard/clients</span></h3>
      <p>Your full client database with search, filtering, lifecycle status, and one-click access to every client's complete profile. Add clients manually or they auto-create when booking online. Each row shows name, phone, email, address, total spent, booking count, lifecycle status, and last service date.</p>
      <div className="dashboard-frame">
        <div className="dashboard-titlebar">
          <div className="titlebar-dot red"></div><div className="titlebar-dot yellow"></div><div className="titlebar-dot green"></div>
          <span className="titlebar-title">Clients — 200+ Total</span>
        </div>
        <div className="dashboard-body">
          <div className="stat-cards" style={{gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1rem'}}>
            <div className="stat-card green-card"><div className="stat-val">142</div><div className="stat-label">Active</div></div>
            <div className="stat-card highlight"><div className="stat-val">38</div><div className="stat-label">New</div></div>
            <div className="stat-card orange-card"><div className="stat-val">31</div><div className="stat-label">At-Risk</div></div>
            <div className="stat-card red-card"><div className="stat-val">15</div><div className="stat-label">Churned</div></div>
          </div>
          <div className="table-scroll"><table className="data-table">
            <thead><tr><th>Client</th><th>Phone</th><th>Address</th><th>Total Spent</th><th>Bookings</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td><strong>Client A</strong></td><td>(555) 000-0142</td><td>245 Oak St, Westside</td><td>$4,280</td><td>24</td><td><span className="badge badge-green">Active</span></td></tr>
              <tr><td><strong>Client B</strong></td><td>(555) 000-0387</td><td>890 Elm Ave, Northside</td><td>$3,650</td><td>18</td><td><span className="badge badge-green">Active</span></td></tr>
              <tr><td><strong>Client C</strong></td><td>(555) 000-0219</td><td>412 Pine St, Downtown</td><td>$1,200</td><td>6</td><td><span className="badge badge-orange">At-Risk</span></td></tr>
              <tr><td><strong>Client D</strong></td><td>(555) 000-0564</td><td>77 Maple Dr, Lakeside</td><td>$680</td><td>3</td><td><span className="badge badge-blue">New</span></td></tr>
            </tbody>
          </table></div>
        </div>
      </div>
      <div className="page-features">
        <div className="page-feature"><strong>Search &amp; Filter</strong><span>Instant search by name, phone, email, address. Filter by lifecycle status</span></div>
        <div className="page-feature"><strong>Client Profile Drill-Down</strong><span>Click any client for full profile: bookings, payments, SMS transcript, timeline</span></div>
        <div className="page-feature"><strong>Lifecycle Status</strong><span>Auto-categorized: New, Active, At-Risk, Churned based on booking recency</span></div>
        <div className="page-feature"><strong>Inline Actions</strong><span>Call, text, email, create booking, toggle Do Not Service — all one click</span></div>
      </div>
    </div>

    {/* PAGE 3: BOOKINGS */}
    <div className="page-walkthrough">
      <h3>Page 3: Bookings &amp; Calendar <span>/dashboard/bookings</span></h3>
      <p>Full calendar view with month, week, and day modes powered by FullCalendar. Create new bookings, manage recurring series, assign team members, and track booking statuses from scheduled through completed. Drag-and-drop rescheduling with automatic price recalculation.</p>
      <div className="page-features">
        <div className="page-feature"><strong>Calendar View</strong><span>Month/Week/Day with color-coded bookings per cleaner</span></div>
        <div className="page-feature"><strong>Booking Detail Panel</strong><span>Client info, service type, price, team member, check-in/out times, notes</span></div>
        <div className="page-feature"><strong>Recurring Series</strong><span>7 patterns: daily, weekly, biweekly, triweekly, monthly by date, monthly by weekday, custom interval</span></div>
        <div className="page-feature"><strong>Status Workflow</strong><span>Scheduled → Confirmed → Checked-In → Completed → Paid (or Cancelled/No-Show)</span></div>
        <div className="page-feature"><strong>Drag &amp; Drop</strong><span>Reschedule any booking by dragging on calendar — auto recalculates price</span></div>
        <div className="page-feature"><strong>Quick Create</strong><span>Slide-out panel to create booking: pick client, service, date, time, cleaner, price</span></div>
      </div>
    </div>

    {/* PAGE 4: TEAM */}
    <div className="page-walkthrough">
      <h3>Page 4: Team Management <span>/dashboard/team</span></h3>
      <p>Manage your entire field team. See who's active, their daily schedules, earnings, and performance metrics. Add new team members, set pay rates, manage availability, and broadcast emergency jobs. Each team member card shows their today's schedule, weekly earnings, and active status.</p>
      <div className="dashboard-frame">
        <div className="dashboard-titlebar">
          <div className="titlebar-dot red"></div><div className="titlebar-dot yellow"></div><div className="titlebar-dot green"></div>
          <span className="titlebar-title">Team — 8 Active Members</span>
        </div>
        <div className="dashboard-body">
          <div className="table-scroll"><table className="data-table">
            <thead><tr><th>Name</th><th>Status</th><th>Today's Jobs</th><th>This Week</th><th>Pay Rate</th><th>GPS</th></tr></thead>
            <tbody>
              <tr><td><strong>Team Member 1</strong></td><td><span className="badge badge-green">On Job</span></td><td>3 / 4</td><td>$780</td><td>$25/hr</td><td><span className="badge badge-green">Verified</span></td></tr>
              <tr><td><strong>Team Member 2</strong></td><td><span className="badge badge-blue">En Route</span></td><td>1 / 3</td><td>$640</td><td>$23/hr</td><td><span className="badge badge-green">Verified</span></td></tr>
              <tr><td><strong>Team Member 3</strong></td><td><span className="badge badge-gray">Scheduled</span></td><td>0 / 3</td><td>$580</td><td>$22/hr</td><td>—</td></tr>
              <tr><td><strong>Team Member 4</strong></td><td><span className="badge badge-orange">Off Today</span></td><td>—</td><td>$520</td><td>$22/hr</td><td>—</td></tr>
            </tbody>
          </table></div>
        </div>
      </div>
      <div className="page-features">
        <div className="page-feature"><strong>Team Cards</strong><span>Photo, name, status, today's schedule, weekly/monthly/YTD earnings</span></div>
        <div className="page-feature"><strong>Availability Manager</strong><span>Set recurring availability: which days each cleaner works, blocked dates</span></div>
        <div className="page-feature"><strong>Pay Rate Config</strong><span>Per-cleaner hourly rates with payment method preferences</span></div>
        <div className="page-feature"><strong>Emergency Broadcast</strong><span>One-click broadcast unassigned jobs to all active team members via SMS/email/push</span></div>
      </div>
    </div>

    {/* PAGE 5: LEADS */}
    <div className="page-walkthrough">
      <h3>Page 5: Lead Tracking &amp; Analytics <span>/dashboard/leads</span></h3>
      <p>The analytics powerhouse. Track every website visit, every CTA click, every conversion across your entire domain portfolio. See which domains drive revenue, which drive only traffic, and which are dead weight. Real-time live feed shows visitors as they land on your sites.</p>
      <div className="dashboard-frame">
        <div className="dashboard-titlebar">
          <div className="titlebar-dot red"></div><div className="titlebar-dot yellow"></div><div className="titlebar-dot green"></div>
          <span className="titlebar-title">Lead Tracking — 100+ Domains</span>
        </div>
        <div className="dashboard-body">
          <div className="stat-cards" style={{gridTemplateColumns: 'repeat(5,1fr)'}}>
            <div className="stat-card highlight"><div className="stat-val">3,842</div><div className="stat-label">Total Visits (30d)</div></div>
            <div className="stat-card green-card"><div className="stat-val">247</div><div className="stat-label">CTA Clicks</div></div>
            <div className="stat-card purple-card"><div className="stat-val">6.4%</div><div className="stat-label">Conversion Rate</div></div>
            <div className="stat-card"><div className="stat-val">68</div><div className="stat-label">Active Domains</div></div>
            <div className="stat-card orange-card"><div className="stat-val">39</div><div className="stat-label">Dead Domains</div></div>
          </div>
          <h4 style={{fontSize: '0.8rem', fontWeight: '700', margin: '1rem 0 0.5rem', color: 'var(--gray-600)'}}>TOP PERFORMING DOMAINS</h4>
          <div className="table-scroll"><table className="data-table">
            <thead><tr><th>Domain</th><th>Visits</th><th>CTAs</th><th>Conv %</th><th>Revenue</th><th>Health</th></tr></thead>
            <tbody>
              <tr><td>yourbrand.com</td><td>842</td><td>67</td><td>8.0%</td><td>$12,400</td><td><span className="badge badge-green">Revenue</span></td></tr>
              <tr><td>westsideservice.com</td><td>234</td><td>28</td><td>12.0%</td><td>$8,200</td><td><span className="badge badge-green">Revenue</span></td></tr>
              <tr><td>downtownpro.com</td><td>187</td><td>19</td><td>10.2%</td><td>$4,800</td><td><span className="badge badge-green">Revenue</span></td></tr>
              <tr><td>northsideservice.com</td><td>156</td><td>12</td><td>7.7%</td><td>$2,100</td><td><span className="badge badge-blue">Converting</span></td></tr>
              <tr><td>lakesidepro.com</td><td>98</td><td>4</td><td>4.1%</td><td>—</td><td><span className="badge badge-orange">Traffic Only</span></td></tr>
            </tbody>
          </table></div>
        </div>
      </div>
      <div className="page-features">
        <div className="page-feature"><strong>Domain Health Status</strong><span>Revenue (attributed $) / Converting (CTAs) / Traffic (visits only) / Dead (no traffic)</span></div>
        <div className="page-feature"><strong>Live Visitor Feed</strong><span>Real-time stream: domain, referrer, device, CTA events, scroll depth, time on page</span></div>
        <div className="page-feature"><strong>Referrer Breakdown</strong><span>Google, Bing, ChatGPT, Claude, DuckDuckGo, social, direct — with % bars</span></div>
        <div className="page-feature"><strong>CTA Tracking</strong><span>Every call, text, book, directions click tracked with domain + session + device</span></div>
        <div className="page-feature"><strong>Dirty Traffic Filtering</strong><span>Auto-filters direct, SiteGround, internal consortium traffic from visit counts</span></div>
        <div className="page-feature"><strong>Attribution Engine</strong><span>Maps client zip → neighborhood → domain with time-decay confidence scoring</span></div>
      </div>
    </div>

    {/* PAGE 6: FINANCE */}
    <div className="page-walkthrough">
      <h3>Page 6: Finance &amp; P&amp;L <span>/dashboard/finance</span></h3>
      <p>Complete financial command center. Revenue tracking, team payroll, expense management, bank statement uploads, margin analysis, and tax-ready 1099 reports. Every dollar in and out of your business, tracked and categorized.</p>
      <div className="dashboard-frame">
        <div className="dashboard-titlebar">
          <div className="titlebar-dot red"></div><div className="titlebar-dot yellow"></div><div className="titlebar-dot green"></div>
          <span className="titlebar-title">Finance — P&amp;L Summary</span>
        </div>
        <div className="dashboard-body">
          <div className="stat-cards" style={{gridTemplateColumns: 'repeat(4,1fr)'}}>
            <div className="stat-card green-card"><div className="stat-val">$34,650</div><div className="stat-label">Revenue (Feb)</div></div>
            <div className="stat-card red-card"><div className="stat-val">$14,280</div><div className="stat-label">Labor Cost</div></div>
            <div className="stat-card orange-card"><div className="stat-val">$3,450</div><div className="stat-label">Expenses</div></div>
            <div className="stat-card highlight"><div className="stat-val">48.8%</div><div className="stat-label">Net Margin</div></div>
          </div>
          <div className="table-scroll"><table className="data-table">
            <thead><tr><th>Category</th><th>Amount</th><th>% of Revenue</th></tr></thead>
            <tbody>
              <tr><td><strong>Revenue</strong></td><td style={{color: 'var(--green)', fontWeight: '700'}}>$34,650</td><td>100%</td></tr>
              <tr><td>Labor (team pay)</td><td>($14,280)</td><td>41.2%</td></tr>
              <tr><td>Supplies</td><td>($1,200)</td><td>3.5%</td></tr>
              <tr><td>Transportation</td><td>($890)</td><td>2.6%</td></tr>
              <tr><td>Insurance</td><td>($650)</td><td>1.9%</td></tr>
              <tr><td>Software &amp; Tools</td><td>($340)</td><td>1.0%</td></tr>
              <tr><td>Referral Commissions</td><td>($370)</td><td>1.1%</td></tr>
              <tr><td><strong>Net Profit</strong></td><td style={{color: 'var(--green)', fontWeight: '700'}}><strong>$16,920</strong></td><td><strong>48.8%</strong></td></tr>
            </tbody>
          </table></div>
        </div>
      </div>
      <div className="page-features">
        <div className="page-feature"><strong>Revenue Tabs</strong><span>Today / This Week / This Month / YTD with drill-down to individual jobs</span></div>
        <div className="page-feature"><strong>Payroll Manager</strong><span>Per-cleaner pending pay, one-click "Mark Paid" for Zelle/Apple Cash</span></div>
        <div className="page-feature"><strong>Expense Tracker</strong><span>9 categories: supplies, transport, insurance, software, marketing, meals, rent, utilities, other</span></div>
        <div className="page-feature"><strong>1099 Generator</strong><span>Per-contractor YTD totals, $600 threshold flagging, CSV export for accountants</span></div>
      </div>
    </div>

    {/* PAGE 7: NOTIFICATIONS */}
    <div className="page-walkthrough">
      <h3>Page 7: Notification Center <span>/dashboard/notifications</span></h3>
      <p>Every system event in one chronological feed — new bookings, check-ins, payments, hot leads, team applications, errors, and more. 20+ notification types, color-coded with icons. Bell icon in the header shows unread count, auto-refreshes every 60 seconds.</p>
      <div className="page-features">
        <div className="page-feature"><strong>20+ Notification Types</strong><span>Hot lead, new booking, check-in, checkout, payment, cancellation, team app, error, SMS, etc.</span></div>
        <div className="page-feature"><strong>Color-Coded Icons</strong><span>Each type has a unique color and icon for instant visual scanning</span></div>
        <div className="page-feature"><strong>Unread Count Badge</strong><span>Bell icon in header with real-time unread count</span></div>
        <div className="page-feature"><strong>Auto-Refresh</strong><span>Polls every 60 seconds for new notifications without page reload</span></div>
      </div>
    </div>

    {/* PAGE 8: Selenas / AI */}
    <div className="page-walkthrough">
      <h3>Page 8: Selenas AI Dashboard <span>/dashboard/Selenas</span></h3>
      <p>Monitor your AI sales chatbot in real time. See active conversations, conversion pipeline, and full SMS transcripts. Track how many leads Selenas engages, qualifies, and converts to bookings — with complete visibility into every conversation.</p>
      <div className="page-features">
        <div className="page-feature"><strong>Conversation Feed</strong><span>All active and recent SMS conversations with lead status and last message preview</span></div>
        <div className="page-feature"><strong>Conversion Pipeline</strong><span>New Lead → Engaged → Qualified → Booked — with counts at each stage</span></div>
        <div className="page-feature"><strong>Full Transcripts</strong><span>Click any conversation to see full SMS history in chat-bubble format</span></div>
        <div className="page-feature"><strong>Intent Analytics</strong><span>Breakdown of detected intents: pricing, booking, rescheduling, complaint, etc.</span></div>
      </div>
    </div>

    {/* PAGE 9: REFERRALS */}
    <div className="page-walkthrough">
      <h3>Page 9: Referral Program <span>/dashboard/referrals</span></h3>
      <p>Manage your entire referral network. See referrer signups, track click analytics per referral link, calculate commissions automatically, and process payouts. Each referrer gets their own dashboard (see Referral Portal below).</p>
      <div className="page-features">
        <div className="page-feature"><strong>Referrer Directory</strong><span>All referrers with code, click count, conversions, total commission earned</span></div>
        <div className="page-feature"><strong>Commission Calculator</strong><span>Auto 10% of first booking for referred clients, viewable per referrer</span></div>
        <div className="page-feature"><strong>Payout Manager</strong><span>Pending commission payouts with one-click Zelle/Apple Cash marking</span></div>
        <div className="page-feature"><strong>Link Analytics</strong><span>Per-referrer click tracking with device, referrer source, and conversion data</span></div>
      </div>
    </div>

    {/* PAGE 10: SETTINGS */}
    <div className="page-walkthrough">
      <h3>Page 10: Settings <span>/dashboard/settings</span></h3>
      <p>Configure every aspect of the platform. Business info, service pricing, team pay rates, notification preferences, domain management, email templates, SMS settings, and security controls — all in one organized settings panel.</p>
      <div className="page-features">
        <div className="page-feature"><strong>Business Profile</strong><span>Company name, phone, email, address, timezone, booking buffer times</span></div>
        <div className="page-feature"><strong>Service Pricing</strong><span>Base prices per service type and bedroom count, custom pricing rules</span></div>
        <div className="page-feature"><strong>Domain Manager</strong><span>Add/remove tracked domains, set neighborhood mappings, toggle active status</span></div>
        <div className="page-feature"><strong>Notification Prefs</strong><span>Toggle email, SMS, push for each notification type per role</span></div>
      </div>
    </div>

    {/* PAGE 11: DOCS */}
    <div className="page-walkthrough">
      <h3>Page 11: Technical Documentation <span>/dashboard/docs</span></h3>
      <p>25-section in-app documentation covering every page, API route, database table, component, library, and integration. Searchable, always up-to-date, and written for both technical and non-technical users.</p>
      <div className="page-features">
        <div className="page-feature"><strong>25 Sections</strong><span>Dashboard pages, API endpoints, database schema, components, libraries, integrations</span></div>
        <div className="page-feature"><strong>Searchable</strong><span>Full-text search across all documentation sections</span></div>
        <div className="page-feature"><strong>Code Examples</strong><span>API request/response examples for every endpoint</span></div>
        <div className="page-feature"><strong>Architecture Diagrams</strong><span>Data flow diagrams for attribution, Selenas, booking, and notification systems</span></div>
      </div>
    </div>

  </div>
</section>

{/* ===== ANALYTICS DEEP DIVE ===== */}
<section className="mockup-section alt-bg" id="analytics">
  <div className="mockup-container">
    <div className="mockup-header">
      <span className="mockup-label" style={{background: 'var(--blue-light)', color: 'var(--blue)'}}>Website Tracking &amp; Data</span>
      <h2>Analytics That Connect Traffic to Revenue</h2>
      <p>Most analytics tools tell you how many people visited. Full Loop CRM tells you which visit turned into $4,280 in recurring revenue. Track every click, every domain, every dollar.</p>
    </div>

    {/* REFERRER BREAKDOWN */}
    <div className="dashboard-frame">
      <div className="dashboard-titlebar">
        <div className="titlebar-dot red"></div><div className="titlebar-dot yellow"></div><div className="titlebar-dot green"></div>
        <span className="titlebar-title">Traffic Sources — Last 30 Days</span>
      </div>
      <div className="dashboard-body">
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
          <div>
            <h4 style={{fontSize: '0.85rem', fontWeight: '700', marginBottom: '1rem'}}>Referrer Breakdown</h4>
            <div style={{marginBottom: '0.5rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem'}}><span>Google</span><span style={{fontWeight: '700'}}>62.4%</span></div>
              <div style={{background: 'var(--gray-100)', height: '8px', borderRadius: '4px'}}><div style={{background: 'var(--blue)', height: '100%', width: '62.4%', borderRadius: '4px'}}></div></div>
            </div>
            <div style={{marginBottom: '0.5rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem'}}><span>Bing</span><span style={{fontWeight: '700'}}>14.2%</span></div>
              <div style={{background: 'var(--gray-100)', height: '8px', borderRadius: '4px'}}><div style={{background: 'var(--teal)', height: '100%', width: '14.2%', borderRadius: '4px'}}></div></div>
            </div>
            <div style={{marginBottom: '0.5rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem'}}><span>ChatGPT / AI</span><span style={{fontWeight: '700'}}>8.7%</span></div>
              <div style={{background: 'var(--gray-100)', height: '8px', borderRadius: '4px'}}><div style={{background: 'var(--purple)', height: '100%', width: '8.7%', borderRadius: '4px'}}></div></div>
            </div>
            <div style={{marginBottom: '0.5rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem'}}><span>DuckDuckGo</span><span style={{fontWeight: '700'}}>5.1%</span></div>
              <div style={{background: 'var(--gray-100)', height: '8px', borderRadius: '4px'}}><div style={{background: 'var(--orange)', height: '100%', width: '5.1%', borderRadius: '4px'}}></div></div>
            </div>
            <div style={{marginBottom: '0.5rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem'}}><span>Social Media</span><span style={{fontWeight: '700'}}>4.3%</span></div>
              <div style={{background: 'var(--gray-100)', height: '8px', borderRadius: '4px'}}><div style={{background: 'var(--red)', height: '100%', width: '4.3%', borderRadius: '4px'}}></div></div>
            </div>
            <div style={{marginBottom: '0.5rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem'}}><span>Direct</span><span style={{fontWeight: '700'}}>5.3%</span></div>
              <div style={{background: 'var(--gray-100)', height: '8px', borderRadius: '4px'}}><div style={{background: 'var(--gray-400)', height: '100%', width: '5.3%', borderRadius: '4px'}}></div></div>
            </div>
          </div>
          <div>
            <h4 style={{fontSize: '0.85rem', fontWeight: '700', marginBottom: '1rem'}}>Live Visitor Feed</h4>
            <div className="live-feed">
              <div className="feed-item"><div className="feed-dot" style={{background: 'var(--green)'}}></div><span><strong>yourbrand.com</strong> — Call CTA</span><span className="badge badge-green">CTA</span><span className="feed-time">Just now</span></div>
              <div className="feed-item"><div className="feed-dot" style={{background: 'var(--blue)'}}></div><span><strong>westsideservice.com</strong> — Visit</span><span className="badge badge-blue">Google</span><span className="feed-time">2m ago</span></div>
              <div className="feed-item"><div className="feed-dot" style={{background: 'var(--purple)'}}></div><span><strong>downtownpro.com</strong> — Book CTA</span><span className="badge badge-purple">ChatGPT</span><span className="feed-time">4m ago</span></div>
              <div className="feed-item"><div className="feed-dot" style={{background: 'var(--blue)'}}></div><span><strong>northsideservice.com</strong> — Visit</span><span className="badge badge-blue">Bing</span><span className="feed-time">7m ago</span></div>
              <div className="feed-item"><div className="feed-dot" style={{background: 'var(--green)'}}></div><span><strong>eastsidepro.com</strong> — Text CTA</span><span className="badge badge-green">CTA</span><span className="feed-time">12m ago</span></div>
              <div className="feed-item"><div className="feed-dot" style={{background: 'var(--blue)'}}></div><span><strong>lakesidepro.com</strong> — Visit</span><span className="badge badge-blue">Google</span><span className="feed-time">15m ago</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* DOMAIN HEALTH TABLE */}
    <div className="dashboard-frame">
      <div className="dashboard-titlebar">
        <div className="titlebar-dot red"></div><div className="titlebar-dot yellow"></div><div className="titlebar-dot green"></div>
        <span className="titlebar-title">Domain Portfolio Health — 100+ Domains</span>
      </div>
      <div className="dashboard-body">
        <div className="stat-cards" style={{gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1rem'}}>
          <div className="stat-card green-card"><div className="stat-val">23</div><div className="stat-label">Revenue Domains</div></div>
          <div className="stat-card highlight"><div className="stat-val">18</div><div className="stat-label">Converting</div></div>
          <div className="stat-card orange-card"><div className="stat-val">27</div><div className="stat-label">Traffic Only</div></div>
          <div className="stat-card red-card"><div className="stat-val">39</div><div className="stat-label">Dead</div></div>
        </div>
        <div className="table-scroll"><table className="data-table">
          <thead><tr><th>Domain</th><th>Region</th><th>Visits</th><th>Calls</th><th>Texts</th><th>Books</th><th>Revenue</th><th>Health</th></tr></thead>
          <tbody>
            <tr><td>yourbrand.com</td><td>Metro-Wide</td><td>842</td><td>34</td><td>21</td><td>12</td><td>$12,400</td><td><span className="badge badge-green">Revenue</span></td></tr>
            <tr><td>westsideservice.com</td><td>Westside</td><td>234</td><td>15</td><td>8</td><td>5</td><td>$8,200</td><td><span className="badge badge-green">Revenue</span></td></tr>
            <tr><td>downtownpro.com</td><td>Downtown</td><td>187</td><td>11</td><td>5</td><td>3</td><td>$4,800</td><td><span className="badge badge-green">Revenue</span></td></tr>
            <tr><td>eastsidepro.com</td><td>Eastside</td><td>98</td><td>6</td><td>3</td><td>0</td><td>—</td><td><span className="badge badge-blue">Converting</span></td></tr>
            <tr><td>northsideservice.com</td><td>Suburbs N</td><td>67</td><td>2</td><td>1</td><td>0</td><td>—</td><td><span className="badge badge-blue">Converting</span></td></tr>
            <tr><td>lakesidepro.com</td><td>Suburbs S</td><td>43</td><td>0</td><td>0</td><td>0</td><td>—</td><td><span className="badge badge-orange">Traffic</span></td></tr>
            <tr><td>midtownservice.com</td><td>Midtown</td><td>2</td><td>0</td><td>0</td><td>0</td><td>—</td><td><span className="badge badge-red">Dead</span></td></tr>
          </tbody>
        </table></div>
      </div>
    </div>

    {/* ATTRIBUTION ENGINE */}
    <div className="dashboard-frame">
      <div className="dashboard-titlebar">
        <div className="titlebar-dot red"></div><div className="titlebar-dot yellow"></div><div className="titlebar-dot green"></div>
        <span className="titlebar-title">Attribution Engine — How It Works</span>
      </div>
      <div className="dashboard-body">
        <div className="flow-steps">
          <div className="flow-step">Client books from 90210 zip</div>
          <div className="flow-arrow">&#8594;</div>
          <div className="flow-step">Maps to Westside neighborhood</div>
          <div className="flow-arrow">&#8594;</div>
          <div className="flow-step">Matches westsideservice.com</div>
          <div className="flow-arrow">&#8594;</div>
          <div className="flow-step auto">Confidence: 100%</div>
        </div>
        <div className="table-scroll"><table className="data-table" style={{marginTop: '1.5rem'}}>
          <thead><tr><th>Time Since Visit</th><th>Confidence</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>Within 30 minutes</td><td><span className="badge badge-green">100%</span></td><td>Client visits site, calls immediately</td></tr>
            <tr><td>30 min — 1 hour</td><td><span className="badge badge-green">75%</span></td><td>Client visits, thinks it over, books same hour</td></tr>
            <tr><td>1 — 2 hours</td><td><span className="badge badge-blue">50%</span></td><td>Client compares options, comes back</td></tr>
            <tr><td>2 — 4 hours</td><td><span className="badge badge-orange">25%</span></td><td>Client bookmarks, returns later that day</td></tr>
            <tr><td>Over 4 hours</td><td><span className="badge badge-red">Dropped</span></td><td>Too much time elapsed for reliable attribution</td></tr>
          </tbody>
        </table></div>
      </div>
    </div>

  </div>
</section>

{/* ===== PORTALS: CLIENT, TEAM, REFERRAL ===== */}
<section className="mockup-section" id="portals">
  <div className="mockup-container">
    <div className="mockup-header">
      <span className="mockup-label" style={{background: 'var(--purple-light)', color: 'var(--purple)'}}>Three Self-Service Portals</span>
      <h2>Client Portal. Team Portal. Referral Portal.</h2>
      <p>Every user gets their own experience — clients book and manage services, team members manage their jobs and earnings, referrers track their links and commissions. All mobile-first, all self-service.</p>
    </div>

    {/* CLIENT PORTAL */}
    <div style={{marginBottom: '4rem'}}>
      <h3 style={{fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.5rem'}}>Client Portal</h3>
      <p style={{color: 'var(--gray-500)', marginBottom: '2rem'}}>Your clients log in, book services, view upcoming appointments, reschedule, and leave feedback — all without calling you.</p>

      <div className="flow-steps" style={{marginBottom: '2rem'}}>
        <div className="flow-step">Login (Phone + Email 2FA)</div>
        <div className="flow-arrow">&#8594;</div>
        <div className="flow-step">Dashboard</div>
        <div className="flow-arrow">&#8594;</div>
        <div className="flow-step">Book / Reschedule</div>
        <div className="flow-arrow">&#8594;</div>
        <div className="flow-step">Confirmation</div>
        <div className="flow-arrow">&#8594;</div>
        <div className="flow-step">Feedback</div>
      </div>

      <div className="screen-grid">
        <div className="portal-screen">
          <h4>Screen 1: Login</h4>
          <p>Two-factor authentication: client enters phone number, receives a 6-digit code via SMS, then confirms email. No passwords to remember — just their phone number.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; Phone number input with auto-formatting</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; SMS code delivery via Telnyx</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Email confirmation step</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; HMAC-SHA256 signed session cookie</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Rate-limited: 5 attempts per 15 min</li>
          </ul>
        </div>
        <div className="portal-screen">
          <h4>Screen 2: Client Dashboard</h4>
          <p>After login, clients see their upcoming appointments, past service history, and quick-action buttons to book again, reschedule, or contact their cleaner.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; Next appointment card with date, time, cleaner name</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Quick "Book Again" button with pre-filled preferences</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Past bookings list with dates and amounts</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Push notification enrollment prompt</li>
          </ul>
        </div>
        <div className="portal-screen">
          <h4>Screen 3: Book a Service</h4>
          <p>Three-step booking wizard. Step 1: Client info (pre-filled for returning clients). Step 2: Service type, bedrooms, special requests. Step 3: Date/time picker with real-time team availability. Confirms instantly.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; Service types: Regular, Deep, Move In/Out, Post-Construction, Emergency</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Bedroom/bathroom selector with real-time pricing</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Add-ons: inside fridge, oven, windows, laundry, organizing</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Availability calendar respecting team schedules and buffers</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Recurring booking setup in same flow</li>
          </ul>
        </div>
        <div className="portal-screen">
          <h4>Screen 4: Reschedule</h4>
          <p>Clients can reschedule upcoming bookings with policy enforcement. Shows rescheduling window (e.g., 24hr minimum notice), new date picker, and instant confirmation.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; Policy display: minimum notice requirement</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Calendar with available slots highlighted</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; For recurring: edit single instance or all future</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Confirmation email + SMS sent automatically</li>
          </ul>
        </div>
        <div className="portal-screen">
          <h4>Screen 5: Feedback</h4>
          <p>Floating feedback widget appears on all portal pages. Clients can submit anonymous feedback at any time. After service, they receive a follow-up email linking directly to the feedback form.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; Text area for open-ended feedback</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Source tracking (which page triggered it)</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Admin notification on every submission</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Optional: satisfaction rating (1-5)</li>
          </ul>
        </div>
        <div className="portal-screen">
          <h4>Screen 6: Booking Confirmation</h4>
          <p>After booking, clients see a confirmation page with full details: date, time, service type, price estimate, and cleaner assignment (when available). Confirmation email + SMS sent immediately.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; Booking summary with all details</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; "Add to Calendar" link (iCal format)</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Email + SMS confirmation delivery</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Reminder schedule preview (7d, 3d, 1d, 2hr)</li>
          </ul>
        </div>
      </div>
    </div>

    {/* TEAM PORTAL */}
    <div style={{marginBottom: '4rem'}}>
      <h3 style={{fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.5rem'}}>Team Portal</h3>
      <p style={{color: 'var(--gray-500)', marginBottom: '2rem'}}>Your field team gets a dedicated mobile-first portal — PIN login, today's jobs, GPS check-in/out, earnings, availability, and job claiming. Fully bilingual English/Spanish.</p>

      <div className="flow-steps" style={{marginBottom: '2rem'}}>
        <div className="flow-step">PIN Login</div>
        <div className="flow-arrow">&#8594;</div>
        <div className="flow-step">Today's Jobs</div>
        <div className="flow-arrow">&#8594;</div>
        <div className="flow-step">GPS Check-In</div>
        <div className="flow-arrow">&#8594;</div>
        <div className="flow-step">Do the Work</div>
        <div className="flow-arrow">&#8594;</div>
        <div className="flow-step">GPS Check-Out</div>
        <div className="flow-arrow">&#8594;</div>
        <div className="flow-step">Earnings Updated</div>
      </div>

      <div className="screen-grid">
        <div className="portal-screen">
          <h4>Screen 1: PIN Login</h4>
          <p>Simple 4-6 digit PIN login designed for field workers. No email/password complexity. Language toggle between English and Spanish right on the login screen.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; 4-6 digit PIN pad (mobile-optimized)</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; EN/ES language toggle</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; "Forgot PIN" sends reset to phone</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Persistent session (stays logged in 30 days)</li>
          </ul>
        </div>
        <div className="portal-screen">
          <h4>Screen 2: Today's Jobs</h4>
          <p>Chronological list of today's assigned jobs with client name, address, service type, time, and status. One-tap navigation to client's address, one-tap call or text.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; Job cards: client name, address, time, service type</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; One-tap Google Maps navigation</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Click-to-call and click-to-text client</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Status indicators: Upcoming, In Progress, Completed</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Today's potential earnings total at top</li>
          </ul>
        </div>
        <div className="portal-screen">
          <h4>Screen 3: GPS Check-In</h4>
          <p>Team member taps "Check In" when arriving at client's home. GPS coordinates are captured, distance from client address is calculated using Haversine formula. If distance exceeds 528 feet, a mismatch flag is raised in admin dashboard.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; GPS capture with lat/lng storage</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Haversine distance calculation vs. client address</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; 528-foot threshold for GPS verification</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Distance displayed: "142 ft from address &#10003;"</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Mismatch alert sent to admin if over threshold</li>
          </ul>
        </div>
        <div className="portal-screen">
          <h4>Screen 4: GPS Check-Out</h4>
          <p>On checkout, GPS is recaptured, actual hours are auto-calculated (check-in to check-out), and pay is computed from hours x rate. Job status changes to "Completed" and earnings update instantly.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; Second GPS capture with distance verification</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Auto-calculate actual hours worked</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Auto-calculate pay: hours x hourly rate</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Admin notification on checkout event</li>
          </ul>
        </div>
        <div className="portal-screen">
          <h4>Screen 5: Earnings Dashboard</h4>
          <p>Real-time earnings view: this week, this month, year-to-date. Each period shows total earned, hours worked, and job count. Per-job breakdown available with dates and amounts.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; Weekly / Monthly / Yearly toggle</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Total earned, hours worked, jobs completed</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Per-job breakdown with date, client, amount</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Payment status: Paid vs. Pending per job</li>
          </ul>
        </div>
        <div className="portal-screen">
          <h4>Screen 6: Availability &amp; Job Claiming</h4>
          <p>Team members set their weekly availability (which days they work), block off specific dates, and claim broadcasted emergency jobs. First-come-first-served for emergency assignments.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; Weekly day toggles (Mon-Sun)</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Date blocker for vacations/days off</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Emergency job feed with claim button</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Push notification for new emergency broadcasts</li>
          </ul>
        </div>
      </div>
    </div>

    {/* REFERRAL PORTAL */}
    <div style={{marginBottom: '4rem'}}>
      <h3 style={{fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.5rem'}}>Referral Portal</h3>
      <p style={{color: 'var(--gray-500)', marginBottom: '2rem'}}>Referrers get their own self-service portal to sign up, get their unique referral code and link, track clicks and conversions, and see their commission earnings — all in real time.</p>

      <div className="flow-steps" style={{marginBottom: '2rem'}}>
        <div className="flow-step">Sign Up</div>
        <div className="flow-arrow">&#8594;</div>
        <div className="flow-step">Get Referral Link</div>
        <div className="flow-arrow">&#8594;</div>
        <div className="flow-step">Share Link</div>
        <div className="flow-arrow">&#8594;</div>
        <div className="flow-step">Track Clicks</div>
        <div className="flow-arrow">&#8594;</div>
        <div className="flow-step">Earn 10% Commission</div>
      </div>

      <div className="screen-grid">
        <div className="portal-screen">
          <h4>Screen 1: Referrer Signup</h4>
          <p>Self-service registration. Enter name, email, phone, and optional company name. Unique referral code is generated automatically. Referrer gets a trackable link they can share anywhere.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; Name, email, phone, company fields</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Auto-generated unique referral code</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Copy-to-clipboard referral link</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Admin notification on new signup</li>
          </ul>
        </div>
        <div className="portal-screen">
          <h4>Screen 2: Referrer Dashboard</h4>
          <p>Real-time analytics: total clicks, total conversions (bookings from referred clients), total commission earned, and pending payouts. Breakdown per referred client with amounts and dates.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; Stat cards: Clicks, Conversions, Commission Earned, Pending</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Per-client breakdown: name, booking date, amount, commission</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Click history: date, device, referrer source</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Payout history: amounts, dates, payment method</li>
          </ul>
        </div>
        <div className="portal-screen">
          <h4>Screen 3: Link Analytics</h4>
          <p>See exactly how your referral link is performing. Total clicks, unique visitors, device breakdown (mobile vs desktop), and which platforms people click from (Instagram, Facebook, email, etc.).</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; Click count with unique vs. repeat</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Device breakdown: mobile, desktop, tablet</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Referrer sources: Instagram, Facebook, email, text, other</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Click-to-conversion rate</li>
          </ul>
        </div>
        <div className="portal-screen">
          <h4>Screen 4: Commission Earnings</h4>
          <p>10% commission on the first booking of every referred client. Earnings tracked in real time with payment status. Payouts via Zelle or Apple Cash, marked by admin with one click.</p>
          <ul style={{listStyle: 'none', fontSize: '0.85rem', color: 'var(--gray-600)'}}>
            <li style={{padding: '0.3rem 0'}}>&#8226; 10% of first booking amount per referred client</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Total earned: all-time, this month, pending</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Payout methods: Zelle, Apple Cash</li>
            <li style={{padding: '0.3rem 0'}}>&#8226; Full payout history with receipts</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</section>

{/* ===== AUTONOMOUS vs HUMAN BOTTLENECK ===== */}
<section className="mockup-section alt-bg" id="autonomy">
  <div className="mockup-container">
    <div className="mockup-header">
      <span className="mockup-label" style={{background: 'var(--green-light)', color: 'var(--green)'}}>Fully Autonomous or Human Bottleneck</span>
      <h2>Run It Hands-Free — Or Stay in the Loop</h2>
      <p>Full Loop CRM is designed to run your entire operation autonomously. But you decide where humans stay in control. Here's exactly what runs on autopilot and what requires a human touch.</p>
    </div>

    <div className="autonomy-grid">
      <div className="autonomy-col">
        <h3 style={{color: 'var(--green)'}}>&#9889; Fully Autonomous (No Human Needed)</h3>
        <ul className="autonomy-list">
          <li>&#10003; Website visitor tracking across all domains</li>
          <li>&#10003; CTA click tracking (call, text, book, directions)</li>
          <li>&#10003; Lead-to-domain attribution with confidence scoring</li>
          <li>&#10003; Selenas AI engages new leads via SMS — 24/7</li>
          <li>&#10003; Selenas qualifies leads: location, service, budget</li>
          <li>&#10003; Selenas answers FAQs (pricing, insurance, eco, etc.)</li>
          <li>&#10003; Online booking with real-time availability</li>
          <li>&#10003; Booking confirmation emails &amp; SMS</li>
          <li>&#10003; 4-stage reminder cascade (7d, 3d, 1d, 2hr)</li>
          <li>&#10003; Recurring booking auto-generation</li>
          <li>&#10003; GPS check-in / check-out by team</li>
          <li>&#10003; Actual hours &amp; pay auto-calculation</li>
          <li>&#10003; Post-service thank-you follow-up (3 days after)</li>
          <li>&#10003; Client lifecycle status auto-categorization</li>
          <li>&#10003; Referral link click tracking &amp; commission calculation</li>
          <li>&#10003; Push notifications for all events</li>
          <li>&#10003; Daily team summary emails</li>
          <li>&#10003; Recurring series expiry alerts</li>
          <li>&#10003; Dirty traffic filtering (direct, SiteGround, internal)</li>
          <li>&#10003; Database health checks &amp; backups</li>
        </ul>
      </div>
      <div className="autonomy-col">
        <h3 style={{color: 'var(--orange)'}}>&#9995; Human Decision Points (Optional Bottleneck)</h3>
        <ul className="autonomy-list">
          <li>&#9888; New booking approval (can auto-approve or require review)</li>
          <li>&#9888; Team member assignment to bookings</li>
          <li>&#9888; Custom pricing for non-standard jobs</li>
          <li>&#9888; Complaint escalation — Selenas flags, human calls back</li>
          <li>&#9888; Do Not Service flagging decision</li>
          <li>&#9888; Payroll — Mark Paid (one click per team member)</li>
          <li>&#9888; Referral commission payout processing</li>
          <li>&#9888; Expense entry and receipt uploads</li>
          <li>&#9888; Bank statement uploads and reconciliation</li>
          <li>&#9888; Emergency job creation and broadcasting</li>
          <li>&#9888; New team member onboarding (set PIN, pay rate)</li>
          <li>&#9888; Domain portfolio management (add/remove domains)</li>
          <li>&#9888; Service pricing changes</li>
          <li>&#9888; Cancellation and refund decisions</li>
          <li>&#9888; Review response on third-party platforms</li>
        </ul>
      </div>
    </div>

    <div className="dashboard-frame" style={{marginTop: '2rem'}}>
      <div className="dashboard-titlebar">
        <div className="titlebar-dot red"></div><div className="titlebar-dot yellow"></div><div className="titlebar-dot green"></div>
        <span className="titlebar-title">The Full Autonomous Loop — End to End</span>
      </div>
      <div className="dashboard-body" style={{textAlign: 'center'}}>
        <div className="flow-steps" style={{margin: '1rem 0'}}>
          <div className="flow-step auto">Prospect finds your domain on Google</div>
          <div className="flow-arrow">&#8594;</div>
          <div className="flow-step auto">Visits tracked, CTA recorded</div>
          <div className="flow-arrow">&#8594;</div>
          <div className="flow-step auto">Selenas engages via SMS</div>
        </div>
        <div className="flow-steps" style={{margin: '1rem 0'}}>
          <div className="flow-step auto">Selenas qualifies &amp; quotes</div>
          <div className="flow-arrow">&#8594;</div>
          <div className="flow-step auto">Client books online</div>
          <div className="flow-arrow">&#8594;</div>
          <div className="flow-step auto">Reminders sent (7d, 3d, 1d, 2hr)</div>
        </div>
        <div className="flow-steps" style={{margin: '1rem 0'}}>
          <div className="flow-step auto">Team checks in with GPS</div>
          <div className="flow-arrow">&#8594;</div>
          <div className="flow-step auto">Service completed, GPS checkout</div>
          <div className="flow-arrow">&#8594;</div>
          <div className="flow-step auto">Hours &amp; pay auto-calculated</div>
        </div>
        <div className="flow-steps" style={{margin: '1rem 0'}}>
          <div className="flow-step auto">Thank-you email sent (day 3)</div>
          <div className="flow-arrow">&#8594;</div>
          <div className="flow-step auto">Feedback collected</div>
          <div className="flow-arrow">&#8594;</div>
          <div className="flow-step auto">Lifecycle status updated</div>
        </div>
        <p style={{fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '1.5rem'}}>From first Google search to post-service follow-up — <strong>zero human intervention required.</strong></p>
      </div>
    </div>

  </div>
</section>

{/* COMPARE */}
<section id="compare">
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
        <tr>
          <td>One login, one dashboard, zero integrations</td>
          <td><span className="check">&#10003;</span></td>
          <td><span className="cross">&#10007;</span></td>
        </tr>
      </tbody>
    </table></div>
  </div>
</section>

{/* TECH STACK */}
<section className="alt-bg">
  <div className="section-container">
    <div className="section-header">
      <h2>Built on Modern, Battle-Tested Infrastructure</h2>
      <p>Full Loop CRM is engineered for reliability, speed, and scale.</p>
    </div>
    <div className="features-grid" style={{gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))'}}>
      <div className="feature-card" style={{textAlign: 'center'}}>
        <h3 style={{fontSize: '1rem'}}>Next.js &amp; React</h3>
        <p style={{fontSize: '0.85rem'}}>Latest framework with server-side rendering and edge middleware</p>
      </div>
      <div className="feature-card" style={{textAlign: 'center'}}>
        <h3 style={{fontSize: '1rem'}}>Supabase (PostgreSQL)</h3>
        <p style={{fontSize: '0.85rem'}}>Enterprise-grade database with Row Level Security on every table</p>
      </div>
      <div className="feature-card" style={{textAlign: 'center'}}>
        <h3 style={{fontSize: '1rem'}}>Vercel Edge Network</h3>
        <p style={{fontSize: '0.85rem'}}>Global CDN deployment with auto-scaling and zero-downtime deploys</p>
      </div>
      <div className="feature-card" style={{textAlign: 'center'}}>
        <h3 style={{fontSize: '1rem'}}>Telnyx SMS</h3>
        <p style={{fontSize: '0.85rem'}}>Carrier-grade SMS delivery with retry logic and delivery tracking</p>
      </div>
      <div className="feature-card" style={{textAlign: 'center'}}>
        <h3 style={{fontSize: '1rem'}}>Resend Email</h3>
        <p style={{fontSize: '0.85rem'}}>Transactional email with Outlook-compatible templates</p>
      </div>
      <div className="feature-card" style={{textAlign: 'center'}}>
        <h3 style={{fontSize: '1rem'}}>Web Push (VAPID)</h3>
        <p style={{fontSize: '0.85rem'}}>Real-time push notifications across all platforms including iOS</p>
      </div>
    </div>
  </div>
</section>

{/* ===== PRICING ===== */}
<section id="pricing" style={{padding: '6rem 2rem', background: 'var(--white)'}}>
  <div className="section-container">
    <div className="section-header">
      <span className="section-label" style={{background: 'var(--black)', color: 'var(--white)'}}>Partnership Pricing</span>
      <h2>This Is Infrastructure, Not a Subscription</h2>
      <p>High price, low drama. Revenue-based fairness. No unlimited anything. One partner per trade per city. If that filters you out, it's working.</p>
    </div>

    {/* CORE: LICENSE + SETUP */}
    <div className="pricing-grid">
      <div className="price-card featured">
        <div className="price-tag" style={{color: 'var(--blue)'}}>Annual Platform License</div>
        <h3>Full Loop CRM Platform</h3>
        <div className="price-amount">$25,000</div>
        <div className="price-period">per year — non-negotiable</div>
        <p className="price-desc">The complete platform. Your exclusive territory. All seven stages of the loop. This is what you're buying — the infrastructure that runs your entire business.</p>
        <ul>
          <li>Full-loop CRM platform — all 7 stages</li>
          <li>AI sales assistant (Selenas) — 24/7 SMS</li>
          <li>All portals: admin, team, client, referral</li>
          <li>Multi-domain lead tracking &amp; attribution</li>
          <li>GPS-verified field operations</li>
          <li>Financial command center with P&amp;L</li>
          <li>Core platform updates included</li>
          <li>Secure hosting &amp; infrastructure</li>
          <li>In-app documentation (25 sections)</li>
          <li>Exclusive territory lock — your trade, your city</li>
        </ul>
        <p style={{fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '1rem', fontStyle: 'italic'}}>No support included. No customization included. This is the product.</p>
      </div>

      <div className="price-card">
        <div className="price-tag" style={{color: 'var(--orange)'}}>Installation &amp; Setup</div>
        <h3>Revenue-Based Onboarding</h3>
        <div className="price-amount">$5,000 – $15,000+</div>
        <div className="price-period">one-time — based on your annual revenue</div>
        <p className="price-desc">We configure your platform, import your data, ground the AI to your business, build your workflows, and get you live. 30-day delivery window. No rush promises.</p>
        <ul>
          <li>Under $500K revenue: <strong>$5,000</strong></li>
          <li>$500K – $1M revenue: <strong>$7,500</strong></li>
          <li>$1M – $3M revenue: <strong>$10,000</strong></li>
          <li>$3M+ revenue: <strong>$15,000+</strong></li>
        </ul>
        <div style={{marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-100)'}}>
          <p style={{fontSize: '0.85rem', color: 'var(--gray-600)'}}><strong>Includes:</strong> System configuration, data import, AI grounding, workflow setup, domain portfolio mapping, team onboarding, go-live readiness</p>
        </div>
      </div>
    </div>

    {/* SUPPORT TIERS */}
    <div style={{marginBottom: '3rem'}}>
      <h3 style={{fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', textAlign: 'center'}}>Ongoing Support Retainers</h3>
      <p style={{color: 'var(--gray-500)', textAlign: 'center', marginBottom: '0.5rem'}}>Optional. Revenue-based. Cancel anytime. Choose your level.</p>
      <div className="support-tiers">
        <div className="support-tier">
          <h4>Light</h4>
          <div className="tier-pct" style={{color: 'var(--teal)'}}>0.5%</div>
          <div className="tier-range">of annual revenue<br />$750 – $1,500 / month</div>
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
          <div className="tier-range">of annual revenue<br />$1,500 – $3,000 / month</div>
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
          <div className="tier-range">of annual revenue<br />$3,000 – $6,000+ / month</div>
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
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem'}} className="pricing-grid">
      <div className="price-card">
        <div className="price-tag" style={{color: 'var(--gray-500)'}}>No Retainer? No Problem.</div>
        <h3>Hourly Support</h3>
        <div className="price-amount">$199<span style={{fontSize: '1rem', fontWeight: '500', color: 'var(--gray-500)'}}> / hour</span></div>
        <div className="price-period">billed in 30-minute increments</div>
        <p className="price-desc">For partners who don't want a retainer but need occasional help. No SLA. No priority. No urgency. This rate exists to protect our calendar and push you toward a retainer if you need consistent support.</p>
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
    <div style={{maxWidth: '900px', margin: '0 auto', textAlign: 'center'}}>
      <h3 style={{fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem'}}>Who This Is NOT For</h3>
      <p style={{color: 'var(--gray-500)', marginBottom: '1rem'}}>We put this in writing so there's no confusion.</p>
      <ul className="not-for-list">
        <li>Businesses looking for the cheapest option</li>
        <li>Anyone expecting unlimited support</li>
        <li>"Can you just..." requests without a retainer</li>
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

{/* ===== 25 FAQS — LONG TAIL SEO ===== */}
<section className="alt-bg" id="faq" style={{padding: '6rem 2rem'}}>
  <div className="section-container">
    <div className="section-header">
      <span className="section-label" style={{background: 'var(--blue-light)', color: 'var(--blue)'}}>Frequently Asked Questions</span>
      <h2>Everything Home Service Business Owners Want to Know</h2>
      <p>25 answers to the most common questions about Full Loop CRM, organic lead generation, AI sales chatbots, exclusive territories, and running a home service business on autopilot.</p>
    </div>
    <div className="faq-list">
      <div className={`faq-item ${openFaq === 0 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(0)}>What is Full Loop CRM and how is it different from other home service CRMs?</button><div className="faq-a">Full Loop CRM is the first and only CRM that handles every stage of a home service business — from organic lead generation and AI-powered sales through scheduling, GPS-verified field operations, payment collection, automated review generation, referral tracking, and client retargeting. Unlike traditional CRMs that cover one or two stages, Full Loop CRM replaces 9+ separate tools with one unified platform. It is exclusively available to one service provider per trade per metro area.</div></div>
      <div className={`faq-item ${openFaq === 1 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(1)}>How does the AI sales chatbot Selenas convert leads into booked appointments?</button><div className="faq-a">Selenas is a bilingual AI SMS sales assistant that engages every inbound lead within seconds, 24 hours a day. She qualifies prospects by asking about their location, service needs, home size, and budget, then guides them to book online. She answers 12+ common questions about pricing, insurance, cancellation policy, eco-friendly products, and more. For existing clients, Selenas knows their booking history, next appointment, and assigned cleaner — handling rescheduling, inquiries, and complaint escalation automatically.</div></div>
      <div className={`faq-item ${openFaq === 2 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(2)}>What types of home service businesses can use Full Loop CRM for lead generation?</button><div className="faq-a">Full Loop CRM was built for cleaning services and is designed for any home service trade including maid services, carpet cleaning, window cleaning, pressure washing, landscaping, lawn care, handyman services, pest control, HVAC, plumbing, electrical, painting, junk removal, pool cleaning, and any field-service company that books recurring or one-time appointments in a defined geographic area.</div></div>
      <div className={`faq-item ${openFaq === 3 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(3)}>How does multi-domain organic SEO lead generation work for home service businesses?</button><div className="faq-a">Full Loop CRM deploys neighborhood-specific websites that rank organically in local search results. For example, a service company might have westsideservice.com, downtownpro.com, and northsideservice.com — each optimized for hyper-local long-tail keywords targeting your trade and your neighborhoods. The platform tracks every visitor across your entire domain portfolio, attributes leads to specific websites, and measures revenue per domain with confidence-weighted scoring.</div></div>
      <div className={`faq-item ${openFaq === 4 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(4)}>Can Full Loop CRM track which website domain generated a paying client?</button><div className="faq-a">Yes. Full Loop CRM's attribution engine maps a client's address to their neighborhood, then matches that neighborhood to the most relevant domain in your portfolio. It uses time-decay confidence scoring: 100% within 30 minutes of a website visit, 75% within 1 hour, 50% within 2 hours, and 25% within 4 hours. This lets you see exactly which domains drive real revenue — not just traffic.</div></div>
      <div className={`faq-item ${openFaq === 5 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(5)}>What does the Full Loop CRM admin dashboard show business owners?</button><div className="faq-a">The admin dashboard includes 11 purpose-built pages: Executive Dashboard (revenue cards, job feed, forecast, map), Client Management (profiles with lifecycle status), Bookings &amp; Calendar (drag-and-drop scheduling), Team Management (GPS tracking, pay rates), Lead Tracking (100+ domain analytics), Finance &amp; P&amp;L (revenue, payroll, expenses, 1099s), Notification Center (20+ types), Selenas AI Dashboard (conversation transcripts), Referral Program (commission tracking), Settings, and Technical Documentation.</div></div>
      <div className={`faq-item ${openFaq === 6 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(6)}>How does GPS-verified check-in and check-out work for field teams?</button><div className="faq-a">When a team member arrives at a client's home, they tap "Check In" on their mobile portal. GPS coordinates are captured and distance from the client's address is calculated using the Haversine formula. If the distance exceeds 528 feet, a mismatch flag is raised in the admin dashboard. On checkout, GPS is recaptured, actual hours are auto-calculated, and pay is computed from hours worked multiplied by the hourly rate.</div></div>
      <div className={`faq-item ${openFaq === 7 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(7)}>Does Full Loop CRM have a bilingual team portal for Spanish-speaking workers?</button><div className="faq-a">Yes. The team portal is fully bilingual in English and Spanish. Team members toggle between languages on any screen. The portal includes PIN-based login, today's job list with one-tap Google Maps navigation, GPS check-in/out, earnings dashboard, availability management, and emergency job claiming. Every label, button, and notification is translated.</div></div>
      <div className={`faq-item ${openFaq === 8 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(8)}>How does recurring booking management work for cleaning services?</button><div className="faq-a">Full Loop CRM supports 7 recurring booking patterns: daily, weekly, biweekly, triweekly, monthly by date, monthly by weekday, and custom interval. Each series can end never, after a set number of occurrences, or on a specific date. You can edit a single instance or all future bookings in a series. The system auto-generates upcoming bookings and prevents scheduling conflicts.</div></div>
      <div className={`faq-item ${openFaq === 9 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(9)}>What payment methods does Full Loop CRM support?</button><div className="faq-a">Full Loop CRM tracks payments via Zelle, Apple Pay, Venmo, Cash, Check, and credit card. The finance dashboard shows real-time revenue, outstanding balances, per-team payroll with one-click "Mark Paid" buttons, expense tracking across 9 categories, bank statement uploads, margin analysis, and auto-generated 1099 contractor reports for tax season.</div></div>
      <div className={`faq-item ${openFaq === 10 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(10)}>How does the automated review and feedback system work?</button><div className="faq-a">Three days after a first-time client's service, Full Loop CRM automatically sends a personalized thank-you email and SMS with a 10% discount for rebooking. A floating feedback widget appears on all client portal pages. When a client texts a complaint, the AI immediately detects negative sentiment and escalates to a phone call rather than attempting resolution over text.</div></div>
      <div className={`faq-item ${openFaq === 11 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(11)}>Is Full Loop CRM available in my city or is there a waiting list?</button><div className="faq-a">Full Loop CRM operates on an exclusive territory model — only one service provider per trade per metropolitan area. A metro area is defined as a mid-to-large US city and its surrounding neighborhoods. If you are a cleaning service in Dallas, no other cleaning service in the Dallas metro can use Full Loop CRM. Availability is first-come-first-serve and we are currently accepting partnership requests.</div></div>
      <div className={`faq-item ${openFaq === 12 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(12)}>Why does Full Loop CRM only work with one business per trade per city?</button><div className="faq-a">Exclusivity is the core of our value proposition. Our organic lead generation strategy builds neighborhood-specific domains that rank in local search. If we gave those same domains and leads to competing businesses, the value would be diluted. By locking one partner per trade per metro, your leads are your leads, your domains are your domains, and your organic growth has zero competition from within our own platform.</div></div>
      <div className={`faq-item ${openFaq === 13 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(13)}>What does Full Loop CRM look for in a home service business partner?</button><div className="faq-a">We look for business owners committed to organic, sustainable local growth — not just chasing paid ads. The right partner appreciates the consulting guidance and real-world experience we bring, including lessons from both failure and success in home services over 20+ years. We want partners who see this as a long-term relationship, not a software subscription. If you value quality over shortcuts and are ready to own your market, we want to talk.</div></div>
      <div className={`faq-item ${openFaq === 14 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(14)}>How much does Full Loop CRM cost for a home service business?</button><div className="faq-a">The annual platform license is $25,000/year — that includes your exclusive territory, all 7 stages, AI sales assistant, all portals, and core updates. Installation is revenue-based: $5,000 for businesses under $500K, scaling up to $15,000+ for $3M+ businesses. Optional monthly support retainers range from 0.5% to 2% of your annual revenue ($750 to $6,000+/month). Hourly support is $199/hr. Custom development is $299/hr. This is infrastructure and expert consulting, not a SaaS subscription.</div></div>
      <div className={`faq-item ${openFaq === 15 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(15)}>Can Full Loop CRM replace Jobber, Housecall Pro, or ServiceTitan?</button><div className="faq-a">Yes. Full Loop CRM replaces Jobber (scheduling), Housecall Pro (field management), ServiceTitan (operations), Mailchimp (email marketing), SimpleTexting (SMS), Google Analytics (tracking), QuickBooks (finance), ReferralCandy (referrals), and more. The key difference is that those tools don't generate leads. Full Loop CRM starts with organic lead generation and carries through the entire business cycle.</div></div>
      <div className={`faq-item ${openFaq === 16 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(16)}>How does the client self-service booking portal work?</button><div className="faq-a">Clients access a mobile-friendly portal with phone + email two-factor authentication. The 3-step wizard walks through: client info (pre-filled for returning clients), service type with real-time pricing, then date/time selection from a live availability calendar. Booking confirmation is sent instantly via email and SMS, followed by automated reminders at 7 days, 3 days, 1 day, and 2 hours before service.</div></div>
      <div className={`faq-item ${openFaq === 17 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(17)}>Does Full Loop CRM offer a referral program with commission tracking?</button><div className="faq-a">Yes. Full Loop CRM includes a complete referral program with self-service referrer signup, unique codes, trackable links, real-time click and conversion analytics, automatic 10% commission calculation on the first booking of every referred client, and one-click payout processing via Zelle or Apple Cash. Referrers get their own dashboard to track everything.</div></div>
      <div className={`faq-item ${openFaq === 18 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(18)}>What analytics and reporting does Full Loop CRM provide?</button><div className="faq-a">Multi-layer analytics: website tracking across 100+ domains, traffic source breakdown (Google, Bing, ChatGPT, social, direct), domain health classification (Revenue, Converting, Traffic Only, Dead), revenue attribution with confidence scoring, client lifecycle analytics, retention and churn rates, average lifetime value, top clients by revenue, 10-month forecasting, and full P&amp;L with margin analysis.</div></div>
      <div className={`faq-item ${openFaq === 19 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(19)}>How does Full Loop CRM track leads from ChatGPT and AI search engines?</button><div className="faq-a">Every website visit across your domain portfolio is tracked with the referring source. Full Loop CRM categorizes traffic from Google, Bing, Yahoo, DuckDuckGo, and AI search engines including ChatGPT, Claude, and Perplexity. Each visit captures domain, referrer, device type, session ID, scroll depth, and time on page. CTA events are tracked separately with the same detail.</div></div>
      <div className={`faq-item ${openFaq === 20 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(20)}>Can Full Loop CRM run my business without me being involved day-to-day?</button><div className="faq-a">Yes. Website tracking, lead attribution, AI sales via Selenas, online booking, confirmations, reminder cascades, recurring booking generation, GPS check-in/out, pay calculation, post-service follow-ups, lifecycle updates, referral tracking, and daily team summaries all run without human intervention. Human decision points — booking approval, team assignment, payroll, complaints — are optional bottlenecks you can keep or automate.</div></div>
      <div className={`faq-item ${openFaq === 21 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(21)}>What notifications does Full Loop CRM send?</button><div className="faq-a">20+ notification types via email, SMS, and web push: hot leads, new bookings, confirmations, check-in/out events, GPS mismatches, payments, cancellations, team applications, referral signups, emergency broadcasts, daily summaries, series expiry alerts, pending nudges, health checks, and error alerts. Each type has a unique color-coded icon and can be toggled per channel.</div></div>
      <div className={`faq-item ${openFaq === 22 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(22)}>How secure is Full Loop CRM for storing client data?</button><div className="faq-a">Enterprise-grade security: HMAC-SHA256 signed sessions, rate limiting on all public endpoints, Content Security Policy headers, HSTS enforcement, XSS/clickjacking protection, and Row Level Security on every database table. Client login uses phone + email 2FA. Team login uses PIN authentication with encrypted sessions. All data encrypted in transit (TLS) and at rest (PostgreSQL).</div></div>
      <div className={`faq-item ${openFaq === 23 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(23)}>Does Full Loop CRM work for home service businesses in any US city?</button><div className="faq-a">Absolutely. Full Loop CRM is designed for any mid-to-large US metropolitan area and its surrounding neighborhoods. The multi-domain SEO strategy, AI sales assistant, scheduling, GPS-verified operations, and financial tools work identically regardless of geography. Whether you serve a single metro or are expanding into neighboring markets, the platform scales with you.</div></div>
      <div className={`faq-item ${openFaq === 24 ? 'open' : ''}`}><button className="faq-q" onClick={() => toggleFaq(24)}>How do I apply to become a Full Loop CRM partner?</button><div className="faq-a">Text us at (212) 202-9220, call us, or email hello@fullloopcrm.com. Tell us your trade, your city, and a little about your business. We'll check territory availability, and if your market is open and you're the right fit — a business owner committed to organic growth who values partnership and real operational guidance — we'll walk you through the platform and lock your exclusive territory.</div></div>
    </div>
  </div>
</section>

{/* ===== 25 REVIEWS FROM BUSINESS OWNERS ===== */}
<section id="reviews" style={{padding: '6rem 2rem', background: 'var(--white)'}}>
  <div className="section-container">
    <div className="section-header">
      <span className="section-label" style={{background: 'var(--yellow-light)', color: 'var(--yellow)'}}>What Business Owners Are Saying</span>
      <h2>Real Reactions From Real Home Service Owners</h2>
      <p>These business owners saw Full Loop CRM live. Here's what they said.</p>
    </div>
    <div className="review-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1.25rem'}}>

      <div className="feature-card" style={{borderLeft: '3px solid var(--green)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"I've been in the cleaning business for 12 years. I use Jobber for scheduling, Mailchimp for emails, SimpleTexting for SMS, QuickBooks for invoicing, and a spreadsheet to track leads. When I saw Full Loop replace all of that in one screen — with lead generation built in — I literally said 'where has this been?' The fact that it tracks which of my websites actually generate revenue? Game changer."</p>
        <strong style={{fontSize: '0.85rem'}}>— Rachel M.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, residential cleaning service · Dallas, TX</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--blue)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"The AI chatbot blew my mind. I get leads at 11pm, 2am, weekends — and they used to just sit there until Monday. Watching Selenas engage a lead, qualify them, answer their pricing question, and push them to book — all via text, all automatic — that alone is worth it. My team doesn't even know Selenas exists and our bookings went up."</p>
        <strong style={{fontSize: '0.85rem'}}>— Marcus T.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, maid service · Atlanta, GA</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--purple)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"I have 14 team members and payroll was a nightmare every week. Figuring out who worked where, how many hours, what they're owed. Full Loop calculates it all automatically from their GPS check-in/out. I just open the payroll tab and hit 'Mark Paid.' I got 3 hours of my week back."</p>
        <strong style={{fontSize: '0.85rem'}}>— Diana L.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, house cleaning company · Phoenix, AZ</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--orange)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"We had no idea which of our 6 websites was actually bringing in clients. We thought our downtown site was our best performer. Turns out it was getting traffic but zero conversions. Our westside domain — which we almost let expire — was generating $8,000 a month in attributed revenue. Full Loop showed us that in 5 minutes."</p>
        <strong style={{fontSize: '0.85rem'}}>— James &amp; Patricia K.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owners, premium cleaning service · New York, NY</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--teal)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"The exclusivity is what sold me. I'm the only pest control company in Houston with this platform. My competitors can't get it. The organic leads from those neighborhood websites are mine — nobody else's. That's not something any other CRM offers."</p>
        <strong style={{fontSize: '0.85rem'}}>— Carlos R.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, pest control service · Houston, TX</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--red)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"I thought I needed to hire a receptionist. Turns out I needed Selenas. She handles 80% of what a front desk person would do — answering questions, scheduling, even handling complaints by escalating to me. And she works at 3am on a Saturday. The ROI isn't even close."</p>
        <strong style={{fontSize: '0.85rem'}}>— Keisha W.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, deep cleaning service · Chicago, IL</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--green)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"My cleaners are all Spanish-speaking. Every other app I've tried, they can't use it. Full Loop's team portal is fully bilingual — the login, the job list, check-in, earnings, everything. They actually use it now. Before, I was texting them job details every morning manually."</p>
        <strong style={{fontSize: '0.85rem'}}>— Sofia G.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, residential cleaning · Miami, FL</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--blue)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"What impressed me most was the financial reporting. I'm looking at a real P&L — revenue, labor costs broken out per cleaner, expenses by category, net margin. I've been in business 8 years and never had this level of financial visibility. My accountant was thrilled when I showed her the 1099 export."</p>
        <strong style={{fontSize: '0.85rem'}}>— David H.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, janitorial service · Denver, CO</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--purple)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"The referral program sold itself. I told my existing clients about it, three of them signed up as referrers in the first week. They share their link, I get new clients, they get 10% of the first booking. It's tracked automatically — clicks, conversions, commissions. I used to do this with spreadsheets and Venmo."</p>
        <strong style={{fontSize: '0.85rem'}}>— Brenda F.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, eco-friendly cleaning · Portland, OR</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--orange)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"I was skeptical about the organic lead gen. I've been burning $3,000/month on Google Ads for two years. When they showed me the domain portfolio — 100+ neighborhood websites all ranking organically — and then showed me which ones were driving actual paying clients, I turned off my ads the next day. Haven't looked back."</p>
        <strong style={{fontSize: '0.85rem'}}>— Anthony S.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, pressure washing service · Tampa, FL</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--teal)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"Recurring bookings were always a mess. Client wants biweekly, then skips one, then wants to change to weekly for a month, then back. Every other system I've used breaks when you try to edit recurring series. Full Loop handles all of it — edit one, edit all future, custom intervals. It just works."</p>
        <strong style={{fontSize: '0.85rem'}}>— Jennifer C.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, house cleaning service · San Diego, CA</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--red)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"GPS check-in was a hard sell for my team at first. But once they saw that their hours were automatically calculated and their pay was instantly visible — no more disputes, no more 'I worked 5 hours not 4' arguments — they loved it. It protects them as much as it protects me."</p>
        <strong style={{fontSize: '0.85rem'}}>— Robert N.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, commercial cleaning · Philadelphia, PA</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--green)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"The notifications alone saved me twice in one week. Got an alert that a team member checked in 600 feet from the client's address — turns out she was at the wrong building. Then got another alert for a complaint escalation from Selenas — client was unhappy about a missed spot. I called within 10 minutes and saved the account."</p>
        <strong style={{fontSize: '0.85rem'}}>— Michelle D.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, luxury cleaning service · Scottsdale, AZ</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--blue)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"I came in expecting another CRM. What I got was a business partner. The person behind this has actually run cleaning crews, dealt with no-shows, managed payroll, built websites, ranked domains. You can feel it in every feature. This wasn't designed by developers who Googled 'cleaning business software' — it was built by someone who lived it."</p>
        <strong style={{fontSize: '0.85rem'}}>— Linda P.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, window cleaning company · Austin, TX</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--purple)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"My at-risk client list was a revelation. I had 31 clients who hadn't booked in 45-90 days and I didn't even know it. I texted 10 of them that afternoon. Four rebooked. That's $2,400 in revenue I would have lost if I didn't have that lifecycle dashboard staring me in the face."</p>
        <strong style={{fontSize: '0.85rem'}}>— Eric J.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, carpet cleaning service · Nashville, TN</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--orange)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"The live visitor feed is addicting. I can see in real time someone landing on my website from Google, scrolling through the page, then clicking the call button. Five minutes later Selenas is texting them. Twenty minutes later they're booked. I watched the entire funnel happen live. That's when it clicked — this is the whole loop."</p>
        <strong style={{fontSize: '0.85rem'}}>— Tanya B.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, move-in/out cleaning · Charlotte, NC</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--teal)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"I've tried Housecall Pro and Launch27. Both are good at what they do — scheduling. But neither one generates a single lead for you. Full Loop starts with lead gen. That's the difference. You're not just managing clients, you're creating them. And the scheduling is just as good, if not better."</p>
        <strong style={{fontSize: '0.85rem'}}>— Andre M.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, handyman service · Minneapolis, MN</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--red)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"The thank-you automation is subtle but powerful. Three days after a first-time client's service, they get a personalized email and text with a 10% discount for rebooking. My rebooking rate for first-timers went from maybe 30% to over 50%. That one automated sequence probably generates $4,000/month in recurring revenue."</p>
        <strong style={{fontSize: '0.85rem'}}>— Stephanie V.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, green cleaning service · Seattle, WA</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--green)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"The booking portal my clients use is beautiful. Phone login, pick their service, choose a date — done. They don't call me anymore for scheduling. My phone ring volume dropped 60% in the first month. I actually have time to grow my business instead of answering the same scheduling questions all day."</p>
        <strong style={{fontSize: '0.85rem'}}>— Omar A.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, office cleaning service · San Antonio, TX</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--blue)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"Nobody else is doing one partner per city. That's what made me act fast. I called within an hour of seeing the platform because I knew if another cleaning company in my area saw this, I'd lose the territory. Best business decision I've made in five years."</p>
        <strong style={{fontSize: '0.85rem'}}>— Natasha K.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, residential cleaning · Columbus, OH</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--purple)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"ChatGPT is sending me leads. I didn't even know that was possible. Full Loop tracks visitors from ChatGPT, Claude, Perplexity — AI search engines. 8.7% of my traffic comes from AI search now. It's a completely new channel and Full Loop was already tracking it."</p>
        <strong style={{fontSize: '0.85rem'}}>— Jason R.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, HVAC maintenance · Sacramento, CA</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--orange)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"The consulting side is what you don't expect. The founder has been through everything I'm going through — hiring, firing, no-shows, bad clients, scaling too fast, not scaling fast enough. The platform is incredible, but the guidance that comes with the partnership? That's the real value. I don't get that from Jobber."</p>
        <strong style={{fontSize: '0.85rem'}}>— Crystal W.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, deep cleaning service · Las Vegas, NV</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--teal)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"I manage 200+ clients and Full Loop handles all of them without me touching anything most days. Bookings auto-generate from recurring series, reminders go out on their own, check-ins happen via the team portal, pay calculates automatically, follow-ups send themselves. I went on vacation for a week and the business ran itself."</p>
        <strong style={{fontSize: '0.85rem'}}>— Mariana S.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, apartment cleaning · Washington, DC</span>
      </div>

      <div className="feature-card" style={{borderLeft: '3px solid var(--red)'}}>
        <p style={{fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: '1.65', marginBottom: '0.75rem'}}>"Two things sealed it for me. One: I can see my net margin by month — real P&L, not guessing. Two: I can see exactly which neighborhoods are profitable and which are costing me money in drive time. I stopped servicing two zip codes and my margin went from 38% to 49% in one month. Data-driven decisions. Finally."</p>
        <strong style={{fontSize: '0.85rem'}}>— Gregory T.</strong><br /><span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>Owner, lawn care &amp; landscaping · Jacksonville, FL</span>
      </div>

    </div>
  </div>
</section>

{/* FOUNDER */}
<section className="founder-section" id="founder">
  <div className="founder-container">
    <span className="section-label" style={{background: 'var(--blue-light)', color: 'var(--blue)'}}>The Story</span>
    <h2>Built by Someone Who's Actually Done the Work</h2>
    <p>Full Loop CRM wasn't built in a Silicon Valley boardroom. It was built by a 20+ year veteran of home services, business development, web design, SEO, and organic lead generation — someone who's personally run cleaning crews, answered the phones, built the websites, ranked the domains, and scaled the operations. Someone who's failed, learned, pivoted, and built again.</p>
    <p>After years of duct-taping together scheduling apps, CRM tools, payment platforms, lead trackers, email services, SMS tools, and spreadsheets — the frustration boiled over. None of these tools talked to each other. None of them understood the full picture. None of them generated a single lead. So we built the platform we always needed — and we made it exclusive.</p>
    <p>When you partner with Full Loop CRM, you don't just get software. You get the consulting guidance and operational experience of someone who has been exactly where you are — building a home service business from the ground up. The wins, the losses, the hard lessons. That's what makes this different. We're not selling you a subscription. We're investing in your market alongside you.</p>
    <p>Full Loop CRM is only available to one service provider per trade per metro area. First come, first serve. If you're the kind of business owner who values organic growth over shortcuts, long-term partnerships over quick fixes, and real guidance over generic support tickets — we want to hear from you.</p>
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

{/* FINAL CTA */}
<section className="cta-section" id="contact">
  <h2>Is your market still available?</h2>
  <p>One partner per trade per metro area. First come, first serve. Tell us your trade and your city — we'll check availability and see if we're the right fit for each other.</p>
  <div className="cta-buttons">
    <a href="sms:+12122029220" className="btn-white">Text Us</a>
    <a href="tel:+12122029220" className="btn-outline">Call Us</a>
    <a href="mailto:hello@fullloopcrm.com" className="btn-outline">Email Us</a>
  </div>
  <p style={{color: 'var(--gray-500)', fontSize: '0.85rem', marginTop: '2rem', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto'}}>We're looking for business owners committed to organic local growth who value real consulting guidance built on 20+ years of home service experience — including the failures. If that's you, reach out.</p>
</section>

{/* FOOTER */}
<footer>
  <div className="footer-container">
    <div className="footer-top">
      <div className="footer-brand">
        <h3>Full<span>Loop</span> CRM</h3>
        <p>The first full-cycle CRM for home service businesses. From lead generation to five-star reviews — one platform, zero gaps.</p>
      </div>
      <div className="footer-col">
        <h4>Platform</h4>
        <a href="#features">Features</a>
        <a href="#Selenas">AI Sales (Selenas)</a>
        <a href="#dashboards">Dashboards</a>
        <a href="#portals">Portals</a>
        <a href="#pricing">Pricing</a>
        <a href="#reviews">Reviews</a>
        <a href="#faq">FAQ</a>
      </div>
      <div className="footer-col">
        <h4>Company</h4>
        <a href="#founder">About</a>
        <a href="#compare">Why Full Loop</a>
        <a href="#contact">Contact</a>
        <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer">Built by Consortium NYC</a>
      </div>
      <div className="footer-col">
        <h4>Contact</h4>
        <a href="sms:+12122029220">Text Us: (212) 202-9220</a>
        <a href="tel:+12122029220">Call Us: (212) 202-9220</a>
        <a href="mailto:hello@fullloopcrm.com">hello@fullloopcrm.com</a>
        <a href="https://maps.google.com/?q=150+W+47th+St+New+York+NY+10036" style={{marginTop: '0.5rem', lineHeight: '1.5'}}>150 W 47th St<br />New York, NY 10036</a>
      </div>
    </div>
    <div className="footer-bottom">
      <span>&copy; 2026 Full Loop CRM. All rights reserved.</span>
      <span>Built by <a href="https://www.consortiumnyc.com" style={{color: 'var(--blue)', textDecoration: 'none'}} target="_blank" rel="noopener noreferrer">Consortium NYC</a></span>
    </div>
  </div>
</footer>


      <Script
        id="tawk-to"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
            (function(){
              var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
              s1.async=true;
              s1.src='https://embed.tawk.to/6823effa7c5b09190cd447fe/1ir662r4n';
              s1.charset='UTF-8';
              s1.setAttribute('crossorigin','*');
              s0.parentNode.insertBefore(s1,s0);
            })();
          `,
        }}
      />
    </>
  )
}
