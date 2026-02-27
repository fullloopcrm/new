import type { Metadata } from 'next'
import Link from 'next/link'
import LoopVisual from '@/components/marketing/loop-visual'
import StatsBar from '@/components/marketing/stats-bar'
import CtaSection from '@/components/marketing/cta-section'

export const metadata: Metadata = {
  title: 'Features — Full Loop CRM | 7-Stage Business Automation',
  description: 'Explore all 7 stages of Full Loop CRM — organic lead generation, AI sales chatbot, smart scheduling, GPS field operations, payment tracking, automated reviews, and client retargeting. Built for home service businesses.',
  keywords: ['CRM features', 'home service automation', 'AI sales chatbot features', 'GPS field operations', 'scheduling software features', 'organic lead generation tools', 'business automation platform'],
  openGraph: {
    title: 'Features — Full Loop CRM | 7-Stage Business Automation',
    description: 'Explore all 7 stages of Full Loop CRM — organic lead generation, AI sales chatbot, smart scheduling, GPS field operations, payment tracking, automated reviews, and client retargeting. Built for home service businesses.',
    url: 'https://fullloopcrm.com/features',
    siteName: 'Full Loop CRM',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Features — Full Loop CRM | 7-Stage Business Automation',
    description: 'Explore all 7 stages of Full Loop CRM — organic lead generation, AI sales chatbot, smart scheduling, GPS field operations, payment tracking, automated reviews, and client retargeting. Built for home service businesses.',
  },
  alternates: {
    canonical: 'https://fullloopcrm.com/features',
  },
}

export default function FeaturesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Features — Full Loop CRM | 7-Stage Business Automation",
            "description": "Explore all 7 stages of Full Loop CRM — organic lead generation, AI sales chatbot, smart scheduling, GPS field operations, payment tracking, automated reviews, and client retargeting.",
            "url": "https://fullloopcrm.com/features",
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
                  "name": "Features",
                  "item": "https://fullloopcrm.com/features"
                }
              ]
            }
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Full Loop CRM — 7 Stages of Business Automation",
            "description": "The 7 stages covered by Full Loop CRM for home service businesses.",
            "numberOfItems": 7,
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Lead Generation", "description": "Organic SEO across multi-domain network" },
              { "@type": "ListItem", "position": 2, "name": "AI-Powered Sales (Selenas)", "description": "Bilingual AI SMS sales chatbot that qualifies and converts leads 24/7" },
              { "@type": "ListItem", "position": 3, "name": "Scheduling", "description": "Automated booking with smart availability, recurring management, and reminders" },
              { "@type": "ListItem", "position": 4, "name": "Field Operations", "description": "GPS-verified check-in/out, bilingual team portal, earnings dashboard" },
              { "@type": "ListItem", "position": 5, "name": "Payments & Finance", "description": "Revenue tracking, payroll, P&L, margin analysis, and 1099 reports" },
              { "@type": "ListItem", "position": 6, "name": "Feedback & Reviews", "description": "Automated follow-ups, anonymous feedback, complaint escalation via AI" },
              { "@type": "ListItem", "position": 7, "name": "Marketing & Retargeting", "description": "Client lifecycle analytics, referral programs, retention intelligence, multi-channel communication" }
            ]
          })
        }}
      />

      {/* PAGE HERO */}
      <section className="features-hero" style={{padding: '8rem 2rem 4rem', textAlign: 'center', background: 'var(--gray-50)'}} aria-label="Features page hero">
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <h1 style={{fontSize: 'clamp(2.4rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '1rem'}}>Everything Your Home Service Business Needs. One Platform.</h1>
          <p style={{color: 'var(--gray-500)', fontSize: '1.15rem', lineHeight: 1.7}}>Full Loop CRM covers all 7 stages of your business — from the first Google search to the five-star review. Every feature built specifically for home service companies by someone who ran one for 20+ years.</p>
        </div>
      </section>

      {/* THE LOOP VISUAL */}
      <LoopVisual />

      {/* STATS BAR */}
      <StatsBar />

      {/* STAGE 1: LEAD GENERATION */}
      <section id="lead-gen" aria-label="Stage 1 — Lead Generation">
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
      <section className="Selenas-section" id="selenas" aria-label="Stage 2 — AI-Powered Sales">
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
      <section className="alt-bg" aria-label="Stage 3 — Scheduling">
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
      <section aria-label="Stage 4 — Field Operations">
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
      <section className="alt-bg" aria-label="Stage 5 — Payments and Finance">
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
      <section aria-label="Stage 6 — Feedback and Reviews">
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
      <section className="alt-bg" aria-label="Stage 7 — Marketing and Retargeting">
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
      <section aria-label="Client Management">
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
      <section className="alt-bg" aria-label="Admin Dashboard overview">
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
      <section className="mockup-section" id="dashboards" aria-label="Admin Dashboard page-by-page deep dive">
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
      <section className="mockup-section alt-bg" id="analytics" aria-label="Analytics deep dive">
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
      <section className="mockup-section" id="portals" aria-label="Three self-service portals">
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
      <section className="mockup-section alt-bg" id="autonomy" aria-label="Autonomous versus human decision points">
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

      {/* TECH STACK */}
      <section className="alt-bg" aria-label="Technology stack">
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
              <h3 style={{fontSize: '1rem'}}>Radar</h3>
              <p style={{fontSize: '0.85rem'}}>Address autocomplete and geocoding for client address validation</p>
            </div>
            <div className="feature-card" style={{textAlign: 'center'}}>
              <h3 style={{fontSize: '1rem'}}>Leaflet.js</h3>
              <p style={{fontSize: '0.85rem'}}>Interactive maps for job locations and domain portfolio visualization</p>
            </div>
            <div className="feature-card" style={{textAlign: 'center'}}>
              <h3 style={{fontSize: '1rem'}}>Web Push (VAPID)</h3>
              <p style={{fontSize: '0.85rem'}}>Real-time push notifications across all platforms including iOS</p>
            </div>
            <div className="feature-card" style={{textAlign: 'center'}}>
              <h3 style={{fontSize: '1rem'}}>Outlook (Resend)</h3>
              <p style={{fontSize: '0.85rem'}}>Transactional email with Outlook-compatible responsive templates</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <CtaSection />
    </>
  )
}
