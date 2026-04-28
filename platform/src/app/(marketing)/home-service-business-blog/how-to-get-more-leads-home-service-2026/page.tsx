import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  articleSchema,
  faqSchema,
  howToSchema,
} from "@/lib/schema";

const SITE = "https://homeservicesbusinesscrm.com";
const URL = `${SITE}/home-service-business-blog/how-to-get-more-leads-home-service-2026`;
const PUBLISHED = "2026-04-22";
const MODIFIED = "2026-04-22";

const breadcrumbs = [
  { name: "Home", url: SITE },
  { name: "Home Service Business Blog", url: `${SITE}/home-service-business-blog` },
  {
    name: "How to Get More Leads for a Home Service Business in 2026",
    url: URL,
  },
];

const TITLE =
  "How to Get More Leads for a Home Service Business in 2026";
const DESCRIPTION =
  "The complete lead generation guide for home service owners in 2026: the six channels that actually work, the three that waste money, the one metric that kills most lead-gen budgets, and how to build a lead engine in 90 days.";

export const metadata: Metadata = {
  title: "How to Get More Home Service Leads in 2026 | Full Loop CRM",
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    type: "article",
    publishedTime: PUBLISHED,
    modifiedTime: MODIFIED,
    siteName: "Full Loop CRM",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const faqs = [
  {
    question: "What is the cheapest way to generate leads for a home service business in 2026?",
    answer:
      "Referrals from existing customers remain the cheapest lead source, typically under $15 per booked job when you include the cost of referral incentives. Google Business Profile (with consistent review flow and weekly posting) is second cheapest, averaging $25–$60 per booked job in most residential service markets. Paid channels (Google Ads, Facebook, Local Services Ads) range from $80 to $300 per booked job depending on trade and market. The honest truth: cheap channels scale slowly; paid channels scale fast but require a working sales process to not lose money.",
  },
  {
    question: "How many leads does a home service business need to grow?",
    answer:
      "It depends on your close rate and target growth. A cleaning business with a 40% close rate adding one new crew (which handles roughly 25–30 recurring customers) needs about 70 qualified leads to fill the crew and another 30–40 per month to replace churn. A pest control or HVAC operation with a 20–25% close rate needs roughly double that inbound volume. The mistake most operators make is setting a lead goal without calculating downstream close rate and capacity — you end up with leads you can't serve or sales you can't fulfill.",
  },
  {
    question: "Is Yelp still worth it for home service businesses in 2026?",
    answer:
      "For most trades, no. Yelp's reach has shrunk meaningfully as Google consolidated local search, and pay-per-lead pricing has drifted higher while conversion rates have drifted lower. It remains situationally worth it in specific markets (mostly large metros with long-standing Yelp usage patterns) and for specific trades (some food-adjacent services still get traffic). Our analysis of the trade-by-trade breakdown is in our dedicated post on Yelp for home service — the short answer is run a controlled 90-day test with real cost-per-booked-job tracking before committing.",
  },
  {
    question: "How important is speed-to-lead for home service businesses?",
    answer:
      "Decisive. Responding to a new lead in under 60 seconds produces booking rates that are 3–7x higher than responding in under 30 minutes, and 10x+ higher than responding in under 4 hours. This is the single largest lever in home service lead conversion, and it's why AI lead agents that respond in under 8 seconds have reshaped competitive dynamics in every market they've entered. If you want to make every other channel more efficient, fix speed-to-lead first.",
  },
  {
    question: "Should a home service business run Google Ads or Local Services Ads in 2026?",
    answer:
      "Both, but not at the same time until you've proven unit economics. Start with Local Services Ads (LSAs) because they're pay-per-lead with tighter qualification and the Google Guarantee badge helps conversion. Once LSA is producing positive unit economics and hitting volume caps, add Google Ads search campaigns for the broader keyword set. Most operators lose money on Google Ads because they run before fixing their website, their tracking, and their speed-to-lead. Fix the funnel first.",
  },
  {
    question: "What's the most common lead generation mistake home service owners make?",
    answer:
      "Measuring cost-per-lead instead of cost-per-booked-job. A $20 lead that never converts is not cheap — it's $20 of overhead producing zero revenue. A $180 lead that books at 50% is effectively $360 per booked customer, which is excellent for most home service trades because lifetime value is $2,000+. The math only works if you track all the way through to paid invoices, not just inbound form submissions.",
  },
  {
    question: "How long does it take to build a reliable lead engine for a home service business?",
    answer:
      "90 days to produce reliable weekly inbound, 6–9 months to have a multi-channel engine that can absorb one channel failing. SEO compounds over 6–18 months. Paid can go live in days but requires ongoing optimization. Referral programs take 60 days to seed and 6 months to produce meaningful volume. Don't expect to flip a switch and have 50 leads tomorrow — and don't trust anyone who says you can.",
  },
];

const howToSteps = [
  {
    name: "Week 1–2 — Fix the funnel",
    text: "Audit your website, your Google Business Profile, your intake form, and your speed-to-lead. Turn on AI lead response if you don't have it. Do not run a single dollar of paid traffic until your intake process can convert.",
  },
  {
    name: "Week 3–4 — Turn on free channels",
    text: "Claim and optimize GMB. Post weekly. Request reviews on every completed job. Start engaging in 3–5 local Facebook groups. Set up a referral program with a clear customer-to-customer incentive.",
  },
  {
    name: "Week 5–8 — Launch paid channels with tight tracking",
    text: "Start with Local Services Ads. Add Google Ads search campaigns on 3–5 high-intent keywords. Track cost-per-booked-job, not cost-per-lead. Kill any channel not producing positive unit economics after 30 days.",
  },
  {
    name: "Week 9–12 — Build content that compounds",
    text: "Publish service-area pages, neighborhood-specific landing pages, and a small content library answering the top 10 questions your customers ask. Prioritize schema and page speed. This work pays back slowly but compounds for years.",
  },
  {
    name: "Month 4+ — Optimize unit economics",
    text: "Reduce CAC per channel. Raise conversion at each funnel step. Add retargeting for visitors who didn't book. Use customer segments to run reactivation campaigns. By month 6, you should have a 3-channel engine hitting consistent volume.",
  },
];

export default function LeadsPillarPage() {
  const allSchemas = [
    webPageSchema(TITLE, DESCRIPTION, URL, breadcrumbs),
    breadcrumbSchema(breadcrumbs),
    articleSchema(TITLE, DESCRIPTION, URL, PUBLISHED, MODIFIED),
    faqSchema(faqs),
    howToSchema(
      "How to build a home service lead engine in 90 days",
      "A month-by-month plan for going from unreliable inbound to a multi-channel lead engine that produces consistent weekly volume.",
      howToSteps
    ),
  ];

  return (
    <>
      {allSchemas.map((s, i) => (
        <JsonLd key={i} data={s} />
      ))}

      <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-900">Home</Link>{" "}
          <span className="mx-2">/</span>
          <Link href="/home-service-business-blog" className="hover:text-slate-900">Home Service Business Blog</Link>{" "}
          <span className="mx-2">/</span>
          <span className="text-slate-900">Lead Generation</span>
        </nav>

        <header className="mb-10 border-b border-slate-200 pb-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-violet-700">
            Pillar · Lead Generation · 11-minute read
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl md:leading-tight">
            How to Get More Leads for a Home Service Business in 2026
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-700 md:text-xl">
            The six channels that actually work in 2026, the three that waste
            most operators&apos; money, the one metric that kills 90% of
            lead-gen budgets, and the 90-day plan for building a lead engine
            that survives any single channel failing.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Published April 22, 2026 · Full Loop CRM Editorial
          </p>
        </header>

        <nav
          aria-label="Table of contents"
          className="mb-12 rounded-xl border border-slate-200 bg-slate-50 p-6"
        >
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">In this pillar</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li><a href="#the-reality" className="hover:text-slate-900">The lead-gen reality for home service in 2026</a></li>
            <li><a href="#whats-changed" className="hover:text-slate-900">What&apos;s changed since 2020</a></li>
            <li><a href="#six-channels" className="hover:text-slate-900">The six channels that actually work</a></li>
            <li><a href="#what-to-ignore" className="hover:text-slate-900">What to ignore (and why)</a></li>
            <li><a href="#the-metric" className="hover:text-slate-900">The one metric that kills most lead-gen budgets</a></li>
            <li><a href="#speed-multiplier" className="hover:text-slate-900">The speed-to-lead multiplier</a></li>
            <li><a href="#by-trade" className="hover:text-slate-900">The lead mix that works by trade</a></li>
            <li><a href="#90-day-plan" className="hover:text-slate-900">Building your lead engine in 90 days</a></li>
            <li><a href="#faq" className="hover:text-slate-900">Frequently asked questions</a></li>
          </ol>
        </nav>

        <div className="prose prose-slate prose-lg max-w-none prose-headings:scroll-mt-24 prose-h2:text-3xl prose-h2:font-bold prose-h2:text-slate-900 prose-h2:mt-14 prose-h2:mb-4 prose-h3:text-xl prose-h3:font-semibold prose-h3:text-slate-900 prose-h3:mt-8 prose-h3:mb-3 prose-p:text-slate-800 prose-p:leading-relaxed prose-a:text-emerald-700 prose-a:underline hover:prose-a:text-emerald-900 prose-strong:text-slate-900">

          <h2 id="the-reality">The lead-gen reality for home service in 2026</h2>
          <p>
            The home service lead generation landscape looks fundamentally
            different than it did five years ago. Three things have shifted,
            and every operator needs to reckon with them before spending
            another dollar on inbound:
          </p>
          <p>
            <strong>The winning advantage is speed, not spend.</strong> A
            business that responds in 8 seconds converts leads at 3–7x the
            rate of a business that responds in 4 hours, even when the slow
            business spends more per lead. The cheapest way to double your
            revenue in 2026 is not to buy more leads — it&apos;s to convert
            more of the ones you already get. See{" "}
            <Link href="/home-service-business-blog/speed-to-lead-home-service">
              why 8-second speed-to-lead wins
            </Link>{" "}
            for the underlying data.
          </p>
          <p>
            <strong>Google consolidated.</strong> Local Services Ads, the Map
            Pack, and Google Business Profile together control a majority of
            home service intent traffic in most US markets. Yelp, Angi, and
            legacy lead aggregators have lost share. Not every operator has
            internalized this yet — and the ones who have are spending
            differently.
          </p>
          <p>
            <strong>Attribution broke.</strong> The tidy funnels you inherited
            from 2018 marketing playbooks don&apos;t hold in a world of
            incognito browsing, iOS 18+ privacy restrictions, and
            cross-device journeys. Last-click attribution lies. Serious
            operators are now tracking cost-per-booked-job, not
            cost-per-click or cost-per-lead.
          </p>
          <p>
            This pillar walks through what still works, what stopped working,
            and what to do about it. For context on where lead generation
            sits in the broader autonomous operations picture, see{" "}
            <Link href="/home-service-business-blog/autonomous-home-service-business-2026">
              the autonomous home service business in 2026
            </Link>{" "}
            and{" "}
            <Link href="/home-service-business-blog/home-service-business-without-the-overhead">
              the home service business without the overhead
            </Link>
            .
          </p>

          <h2 id="whats-changed">What&apos;s changed since 2020</h2>
          <p>
            Five shifts to orient around before we go channel by channel:
          </p>
          <ol>
            <li>
              <strong>AI lead intake changed the math on every paid channel.</strong>{" "}
              When an 8-second AI response converts at 3–7x, the same paid
              traffic is suddenly 3–7x more efficient. Paid channels that
              used to lose money now print money, and vice versa for
              operators who haven&apos;t adopted AI intake. For the primer,
              see{" "}
              <Link href="/home-service-business-blog/what-is-selena-ai">
                what Selena is (and isn&apos;t)
              </Link>
              .
            </li>
            <li>
              <strong>Video dominates social.</strong> Static-image ads still
              work on search; they have stopped working on Meta. If your
              Facebook and Instagram strategy is still photos, that&apos;s
              money out the door.
            </li>
            <li>
              <strong>GMB reviews are the new front page.</strong> A business
              with 150+ recent reviews at 4.8+ stars gets priced differently
              in Google&apos;s eyes — and converts customers differently.
            </li>
            <li>
              <strong>Third-party aggregators declined.</strong> Thumbtack,
              Angi, HomeAdvisor, Yelp — they still exist, but their share of
              serious home service intent has shrunk in most markets.
            </li>
            <li>
              <strong>Content has to earn its rank.</strong> Thin SEO
              content stopped ranking after the helpful-content and
              E-E-A-T updates. Long-form content written by people who
              actually operate the business is now the minimum bar.
            </li>
          </ol>

          <h2 id="six-channels">The six channels that actually work</h2>
          <h3>1. Google Business Profile and local SEO</h3>
          <p>
            The single highest-leverage channel for 90% of home service
            businesses. GMB plus the Map Pack plus locally-ranked organic
            pages is where most residential intent traffic lives now. A fully
            optimized GMB with consistent weekly posts, regular review flow,
            and accurate service areas is the backbone of any home service
            lead strategy. See the deep dives in{" "}
            <Link href="/home-service-business-blog/local-seo-for-home-service-businesses">
              local SEO for home service businesses
            </Link>{" "}
            and{" "}
            <Link href="/home-service-business-blog/google-business-profile-for-home-service">
              the practical GMB setup for home service owners
            </Link>
            . For the zero-friction wiring from GMB directly to booking, see{" "}
            <Link href="/home-service-business-blog/gmb-to-booking-flow">
              the GMB-to-booking funnel
            </Link>
            .
          </p>
          <h3>2. A website that actually converts</h3>
          <p>
            The average home service website converts at 1–3%. A well-built
            one converts at 8–15%. That gap is the difference between paid
            channels making money and losing it. It&apos;s also the cheapest
            form of conversion uplift available — one-time investment that
            pays back on every dollar of traffic going forward. Read{" "}
            <Link href="/home-service-business-blog/website-that-converts-home-service">
              the home service website that actually converts in 2026
            </Link>
            ,{" "}
            <Link href="/home-service-business-blog/landing-page-patterns-that-convert">
              landing page patterns that convert home service traffic
            </Link>
            ,{" "}
            <Link href="/home-service-business-blog/forms-that-convert-home-service">
              forms that convert
            </Link>
            , and{" "}
            <Link href="/home-service-business-blog/post-click-speed-home-service">
              why your page has to load in under 1.5 seconds
            </Link>
            .
          </p>
          <h3>3. Local Facebook groups</h3>
          <p>
            Still the cheapest path to qualified leads in most markets —{" "}
            <em>if</em> you participate in the groups rather than spam them.
            The rules have hardened. Post-and-promote behavior gets you
            banned. Showing up as a genuine community member, answering
            questions, occasionally mentioning your business, builds a slow
            but durable referral flow. See the playbook in{" "}
            <Link href="/home-service-business-blog/facebook-groups-lead-generation-home-service">
              Facebook groups are still the cheapest lead source for home
              service
            </Link>
            .
          </p>
          <h3>4. Referral programs</h3>
          <p>
            The lowest CAC channel in home service, and the one most
            operators run poorly or not at all. A well-structured referral
            program with a two-sided incentive (give $30, get $30 type
            structures) produces 15–25% of total bookings for mature
            operators. The four structures that work, and three that waste
            your budget, are in{" "}
            <Link href="/home-service-business-blog/referral-programs-home-service-business">
              referral programs that actually work for home service
              businesses
            </Link>
            .
          </p>
          <h3>5. Paid ads: Google, Local Services Ads, and Facebook</h3>
          <p>
            Each serves a different intent tier. LSAs for high-intent,
            ready-to-buy searches. Google Ads for the broader high-intent
            keyword set. Facebook for awareness-plus-interest campaigns in
            markets where you have a strong visual brand. The budgets and
            sequencing are different for each. Full walkthrough in{" "}
            <Link href="/home-service-business-blog/paid-ads-for-home-service-businesses">
              paid ads for home service businesses
            </Link>
            .
          </p>
          <h3>6. Nextdoor (situationally)</h3>
          <p>
            Nextdoor works well in dense suburban markets with high
            neighborhood engagement. It works poorly in dense urban markets
            and rural areas. Tune your expectations by geography before
            spending, and read{" "}
            <Link href="/home-service-business-blog/nextdoor-for-home-service-businesses">
              Nextdoor for home service businesses: what works in 2026
            </Link>
            .
          </p>

          <h2 id="what-to-ignore">What to ignore (and why)</h2>
          <p>
            Three categories of lead source consistently drain budgets for
            home service operators in 2026. If anything on this list is in
            your current marketing mix, scrutinize the unit economics
            carefully before renewing.
          </p>
          <p>
            <strong>Yelp paid advertising</strong> — Yelp&apos;s traffic has
            shrunk and cost-per-booked-job has drifted higher than most
            residential service trades can sustain. Run a controlled 90-day
            test before committing, and see{" "}
            <Link href="/home-service-business-blog/yelp-for-home-service-is-it-worth-it">
              the honest Yelp answer by trade and market
            </Link>
            .
          </p>
          <p>
            <strong>Lead aggregator services (Angi, Thumbtack, HomeAdvisor)</strong>{" "}
            — The economics have deteriorated meaningfully. The leads are
            shopped to 3–6 competitors simultaneously, forcing a race to the
            bottom on price. Exception: specific trades in specific markets
            still work. Default assumption: skeptical.
          </p>
          <p>
            <strong>Mass-market traditional</strong> — Bus stop ads,
            billboards, radio, direct-mail-without-tracking. These can work
            for trusted legacy brands with enormous budgets, but for
            owner-operators trying to grow a 5–20-person service business,
            they&apos;re almost always a worse return than GMB + paid search
            + referrals.
          </p>
          <p>
            The channels on this list aren&apos;t worthless for every
            business. They&apos;re just lower-ROI than the six above in the
            typical case. Only add them once the six core channels are
            saturated and you need incremental volume.
          </p>

          <h2 id="the-metric">The one metric that kills most lead-gen budgets</h2>
          <p>
            Ninety percent of lead-gen budget waste traces to one mistake:
            measuring cost-per-lead instead of cost-per-booked-job.
          </p>
          <p>
            A $20 lead that never closes is not cheap. It&apos;s $20 of
            advertising producing zero revenue. A $180 lead that closes at
            50% is $360 per booked customer — which is excellent economics
            for most home service trades because the lifetime value of a
            residential cleaning customer is $2,000+, an HVAC customer is
            $3,500+, a pest control customer is $1,800+.
          </p>
          <p>
            The right metric is cost-per-booked-job divided by customer
            lifetime value. As long as CAC/LTV stays below 0.3 you&apos;re
            healthy. Most home service operators who think their marketing
            &quot;doesn&apos;t work&quot; are actually running profitable
            channels they&apos;re killing too early because they&apos;re
            only looking at top-of-funnel cost.
          </p>
          <p>
            The flip side is equally important: a $5 lead that closes at 2%
            costs you $250 per booked job and doesn&apos;t produce lifetime
            value because it&apos;s a low-intent lead that churns fast.
            Cheap leads often cost more than expensive leads when you track
            all the way through. For the pricing side of this math — why
            your close rate depends on how you quote, not just how fast —
            see{" "}
            <Link href="/home-service-business-blog/pricing-home-service-2026">
              how to price a home service business in 2026
            </Link>
            .
          </p>

          <h2 id="speed-multiplier">The speed-to-lead multiplier</h2>
          <p>
            Every channel above performs 3–7x better when speed-to-lead is
            under 60 seconds. This is the single largest lever in home
            service lead conversion in 2026, and it&apos;s why the operators
            running AI lead agents are gaining share against operators still
            responding via human-only workflows.
          </p>
          <p>
            If your current speed-to-lead is north of an hour, you have two
            practical paths to fix it:
          </p>
          <ul>
            <li>
              <strong>AI lead agent</strong> — responds in under 8 seconds,
              qualifies, quotes, books, and collects deposit. Inside{" "}
              <Link href="/full-loop-crm-service-features">Full Loop CRM</Link>{" "}
              this is Selena. Handles 95%+ of inbound without human
              intervention. This is the step-change fix.
            </li>
            <li>
              <strong>Human shared inbox with SLA</strong> — a team member
              watches inbound in real time during business hours, with a
              strict under-5-minute SLA. Works for small operations.
              Doesn&apos;t scale past about $400k of revenue without becoming
              the dominant cost in your office.
            </li>
          </ul>
          <p>
            Do not skip this step and go buy more leads. Adding traffic to a
            slow funnel is lighting money on fire. Fix speed-to-lead first,
            then scale the channels above.
          </p>

          <h2 id="by-trade">The lead mix that works by trade</h2>
          <p>
            The channel mix that wins depends on the trade. What follows are
            the patterns we&apos;ve seen hold across dozens of operators in
            each vertical. They&apos;re starting points, not recipes —
            local-market dynamics and your specific positioning will shift
            the numbers.
          </p>
          <h3>Residential cleaning</h3>
          <p>
            Cleaning is the purest example of &quot;speed + GMB wins.&quot;
            Target a lead mix of roughly 35% GMB/local SEO, 25% referrals,
            25% paid search (Google Ads + LSAs), and 15% Facebook groups.
            Don&apos;t over-invest in Facebook paid ads early — the audience
            targeting for residential cleaning is crowded and expensive.
            Referral programs with a two-sided incentive produce
            outsized volume because cleaning customers talk about their
            cleaners with friends more than customers of almost any other
            home service.
          </p>
          <h3>HVAC</h3>
          <p>
            HVAC skews toward paid: roughly 45% paid (LSAs + Google Ads),
            30% GMB/local SEO, 15% maintenance-plan retention, 10%
            referrals. The seasonality means you need to front-load paid in
            shoulder seasons (spring and fall) or you&apos;ll get priced out
            when demand spikes. Emergency service searches dominate in peak
            heat and peak cold; LSAs are the best-tuned channel for those
            moments.
          </p>
          <h3>Plumbing</h3>
          <p>
            Similar to HVAC with a slightly higher referral component —
            plumbers earn more word-of-mouth because emergency jobs produce
            grateful customers. Target 40% paid, 30% GMB, 20% referrals,
            10% partnership (real estate agents, property managers, insurance
            adjusters). The partnership channel is underrated — a single
            well-nurtured relationship with a local property management
            firm can produce steady monthly volume.
          </p>
          <h3>Lawn care and pest control</h3>
          <p>
            Both are recurring-revenue trades where the lead engine should
            lean heavily into neighborhood-level targeting and referral. Mix:
            30% Facebook (including groups and paid neighborhood targeting),
            30% GMB/local SEO, 25% referrals, 15% paid search. Yard signs
            and truck wraps produce meaningful incidental volume in these
            trades and deserve mentioning even though they&apos;re not
            strictly digital.
          </p>
          <h3>Handyman, electrical, restoration</h3>
          <p>
            These vary so much by market and positioning that a universal
            channel mix isn&apos;t useful. What does generalize: fix
            speed-to-lead first, then test one paid channel at a time with
            a strict 30-day cost-per-booked-job kill rule, and don&apos;t
            abandon GMB as your foundation regardless of what else you add.
          </p>

          <h2 id="90-day-plan">Building your lead engine in 90 days</h2>
          <h3>Weeks 1–2: fix the funnel</h3>
          <p>
            Audit your website, your GMB, your intake form, your
            speed-to-lead. Turn on AI lead response. Do not run a single
            dollar of paid traffic until your intake process can convert.
            Fix page speed, remove friction from forms, make sure GMB
            matches everything on your website.
          </p>
          <h3>Weeks 3–4: turn on free channels</h3>
          <p>
            Optimize GMB. Post weekly. Request reviews on every completed
            job. Start participating in 3–5 local Facebook groups. Set up
            your referral program with a clear two-sided incentive. These
            channels take 60–90 days to compound but cost nothing incremental.
          </p>
          <h3>Weeks 5–8: launch paid with tight tracking</h3>
          <p>
            Start with Local Services Ads because the intent is highest and
            the pay-per-lead pricing makes unit economics legible. Add Google
            Ads search campaigns on 3–5 high-intent keywords after LSA is
            proven. Track cost-per-booked-job, not cost-per-lead. Kill any
            channel not producing positive unit economics after 30 days
            &mdash; don&apos;t let a losing campaign run on hope.
          </p>
          <h3>Weeks 9–12: build content that compounds</h3>
          <p>
            Publish service-area pages, neighborhood-specific landing pages,
            and a content library answering the top 10 questions your
            customers actually ask. Prioritize schema, page speed, and
            internal linking. This work pays back slowly but compounds for
            years. At this point your engine is a three-legged stool (GMB
            + paid + content) that can survive any one leg failing.
          </p>
          <h3>Month 4+: compound</h3>
          <p>
            Reduce CAC per channel. Raise conversion at each funnel step.
            Add retargeting for visitors who didn&apos;t book. Run
            reactivation campaigns on existing customer segments. By month 6,
            you should have a multi-channel engine hitting consistent
            volume — at which point you can start thinking seriously about
            scaling the business itself rather than fighting for leads every
            month.
          </p>

          <h2 id="where-this-lives">Where this lives in the broader picture</h2>
          <p>
            Lead generation is one pillar of running a modern home service
            business. The other pillars — pricing, hiring, operations,
            customer experience, growth, back-office — each shape what
            happens after a lead arrives. If your lead engine works but your
            close rate is 15%, the bottleneck is pricing or sales, not
            leads. If your close rate is 45% but customers churn at 40%, the
            bottleneck is service delivery, not leads.
          </p>
          <p>
            See the full editorial index at the{" "}
            <Link href="/home-service-business-blog">
              Home Service Business Blog
            </Link>
            . For the platform that runs the full loop, see the{" "}
            <Link href="/full-loop-crm-service-features">feature list</Link>.
            Pricing lives at{" "}
            <Link href="/full-loop-crm-pricing">full pricing</Link>. For
            which trades this fits, see{" "}
            <Link href="/full-loop-crm-service-business-industries">
              industries served
            </Link>
            . For the philosophy,{" "}
            <Link href="/full-loop-crm-101-educational-tips">
              101 CRM educational tips
            </Link>
            . For comparisons,{" "}
            <Link href="/why-you-should-choose-full-loop-crm-for-your-business">
              why Full Loop CRM
            </Link>{" "}
            and the{" "}
            <Link href="/full-loop-crm-frequently-asked-questions">
              platform FAQ
            </Link>
            .
          </p>

          <h2 id="faq">Frequently asked questions</h2>
          <dl className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <dt className="text-lg font-semibold text-slate-900">{faq.question}</dt>
                <dd className="mt-2 text-slate-700">{faq.answer}</dd>
              </div>
            ))}
          </dl>

          <h2>The bottom line</h2>
          <p>
            You don&apos;t need more leads. You need a lead engine.
            That&apos;s the difference between operators who can hire their
            second crew this year and operators who spend every month
            chasing inbound. Fix speed-to-lead first. Build the six channels
            that work. Ignore the three that don&apos;t. Measure
            cost-per-booked-job. Give it 90 days to take shape and 9 months
            to become durable.
          </p>
          <p>
            The businesses that do this don&apos;t have a lead problem a year
            from now. The ones that don&apos;t, are still asking where to buy
            more leads on a Facebook group at 11pm.
          </p>
          <p>
            One last concrete takeaway: pick one channel this week that is
            currently leaking money and either fix it or kill it. If
            you&apos;re paying for Yelp without tracking cost-per-booked-job,
            track it for 30 days and make the call. If your Google Ads are
            running without AI lead response behind them, pause the ads
            until the intake side is fixed. If you&apos;ve never asked your
            last 20 happy customers for a referral, do that before spending
            another dollar on paid traffic. One concrete move this week
            beats a new marketing plan next month.
          </p>
        </div>

        <aside className="mt-16 rounded-2xl border border-slate-200 bg-slate-900 p-8 text-white md:p-10">
          <h2 className="text-2xl font-semibold md:text-3xl">
            Built-in lead engine. One platform.
          </h2>
          <p className="mt-3 text-slate-300">
            Full Loop CRM ships with AI lead response, conversion-tuned
            landing pages, GMB-to-booking wiring, and automated review flow
            out of the box. Fix the funnel before you fix the traffic —
            that&apos;s where the leverage is.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/crm-partnership-request-form"
              className="rounded-lg bg-white px-5 py-3 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Apply for your territory
            </Link>
            <Link
              href="/full-loop-crm-service-features"
              className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700"
            >
              See the platform
            </Link>
            <Link
              href="/full-loop-crm-pricing"
              className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700"
            >
              Pricing
            </Link>
          </div>
        </aside>
      </article>
    </>
  );
}
