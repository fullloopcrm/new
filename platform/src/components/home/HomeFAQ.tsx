import Link from "next/link";
import { C, display, mono, proseStyle } from "./editorial";
import SectionHead from "./SectionHead";
import SectionCloser from "./SectionCloser";

const link = { color: C.good, textDecoration: "underline", textUnderlineOffset: "2px" };

interface QA {
  q: string;
  a: React.ReactNode;
}

const faqs: QA[] = [
  {
    q: "What is Full Loop CRM, exactly?",
    a: (
      <>
        Full Loop is the first full-cycle CRM for home service businesses. Instead of
        covering one slice of your operation, it runs the entire loop &mdash; it generates
        your leads, closes them with an AI sales agent, books the job, dispatches and
        GPS-tracks your crew, collects payment, requests the review, and retargets the
        customer for the next booking. One platform, no integrations to stitch together.
        See the{" "}
        <Link href="/full-loop-crm-service-features" style={link}>full feature breakdown</Link>{" "}
        for how the seven stages fit together.
      </>
    ),
  },
  {
    q: "How is this different from other home service CRMs?",
    a: (
      <>
        Most CRMs assume the lead already exists and just help you organize it. Full Loop
        generates the lead in the first place, then converts it automatically. The other
        difference is exclusivity: we license the platform to one operator per trade per
        city, so your direct competitors can&apos;t use the same lead engine, SEO network, or
        AI sales agent against you. It&apos;s closer to a franchise operating system than to a
        seat in a tool everyone shares.
      </>
    ),
  },
  {
    q: "What does “one operator per trade per city” mean?",
    a: (
      <>
        We license each trade in each city to a single operator. One house cleaning
        company in your metro, one HVAC company, one plumber. When you hold the license,
        every other business in that trade in that city is locked out of Full Loop &mdash; the
        lead generation, the automation, all of it. Once a territory is claimed, it&apos;s off
        the board. That&apos;s why we ask which trade and city you&apos;re in before anything else.
      </>
    ),
  },
  {
    q: "How does the AI sales agent actually convert leads?",
    a: (
      <>
        The moment an inquiry comes in &mdash; any hour, any day &mdash; the AI replies by text and
        chat, qualifies the customer, quotes from your real pricing, answers questions,
        handles objections, and books the job. It works in English and Spanish, stays on
        your brand voice, and never lets a lead sit. Speed-to-lead is the single biggest
        predictor of who wins the job, and the agent responds in seconds even while you&apos;re
        on a roof or asleep.
      </>
    ),
  },
  {
    q: "Do I need to run ads to get leads?",
    a: (
      <>
        No. The lead engine is built on organic, SEO-optimized sites that rank for the
        searches your customers already make. The{" "}
        <Link href="/case-study/the-nyc-maid" style={link}>NYC Maid case study</Link>{" "}
        documents tens of thousands of organic lead clicks with zero paid ad spend and a
        UTM audit showing no paid sources. You can layer ads on top if you want volume
        faster, but the platform is designed to generate leads without renting them.
      </>
    ),
  },
  {
    q: "What types of businesses is this built for?",
    a: (
      <>
        Home and field service trades &mdash; more than fifty of them. Cleaning, HVAC,
        plumbing, electrical, landscaping, lawn care, pest control, roofing, painting,
        junk removal, pool service, handyman, restoration, and many more. Browse the full{" "}
        <Link href="/full-loop-crm-service-business-industries" style={link}>industries directory</Link>{" "}
        to see how the loop maps to your specific trade. If you sell a recurring or
        repeatable service to homeowners or property managers, it fits.
      </>
    ),
  },
  {
    q: "How does GPS-verified check-in and check-out work?",
    a: (
      <>
        Your crew works from a mobile portal that shows the day&apos;s route and job details.
        When they arrive, they check in; when they finish, they check out &mdash; both verified
        by location. That gives you an honest record of who was on site and for how long,
        which is what billing, payroll, and customer updates are based on. No more
        reconstructing the day from memory or trusting a timesheet filled out at the end
        of the week.
      </>
    ),
  },
  {
    q: "How do payments and crew payouts work?",
    a: (
      <>
        Full Loop collects payment automatically &mdash; cards on file, deposits, balances,
        and recurring billing &mdash; and reconciles it without you chasing invoices. Crew
        payouts can run automatically too: on the NYC Maid, more than 99% of payouts went
        out through Stripe Connect the moment a job closed. Your team gets paid fast and
        correctly, and you stop spending Fridays cutting checks.
      </>
    ),
  },
  {
    q: "Is there a team portal for my crew?",
    a: (
      <>
        Yes &mdash; a bilingual (English/Spanish) mobile portal where your crew sees their
        route, job details, customer notes, and navigation, checks in and out with GPS,
        and sends photos and completion notes back to the office and the customer in real
        time. It&apos;s designed for people working with one hand on a phone between jobs, not
        for office staff at a desk.
      </>
    ),
  },
  {
    q: "Can it handle recurring clients and schedules?",
    a: (
      <>
        Recurring revenue is where the platform shines. Recurring clients are rebooked on
        their cadence automatically, one-time jobs get nudged toward recurring, and the
        whole calendar stays the single source of truth. For cleaning, lawn care, pest
        control, and pool service especially, this is the compounding engine that turns a
        good month into a predictable book of business.
      </>
    ),
  },
  {
    q: "How does it earn and manage reviews?",
    a: (
      <>
        The moment a job is completed and paid, the system requests a review from the
        customer at the right time and routes it to the platforms that matter. Those
        reviews feed back into your local search rankings, which generate the next lead &mdash;
        so reputation isn&apos;t a side project, it&apos;s built into the loop. Done across every
        job, it compounds into a local position competitors can&apos;t easily buy past.
      </>
    ),
  },
  {
    q: "Do I keep my own brand and customers?",
    a: (
      <>
        Completely. Full Loop runs the machine; you own the business. Your brand, your
        customer relationships, your pricing, and your margins stay yours. We are not a
        marketplace that owns the customer and rents them back to you &mdash; the leads and
        clients the platform generates belong to your company.
      </>
    ),
  },
  {
    q: "How fast can I get started?",
    a: (
      <>
        It starts with a territory check. Tell us your trade and city and we confirm
        whether it&apos;s still open &mdash; once a trade is claimed in a city, it&apos;s gone. From
        there we get your pricing, services, and team into the platform and the loop
        starts running. The fastest first step is the{" "}
        <a href="#lead-form" style={link}>territory form</a> on this page.
      </>
    ),
  },
  {
    q: "What does it cost?",
    a: (
      <>
        Full Loop is priced as an operating partnership, not a per-seat SaaS subscription,
        because it replaces lead-gen spend, multiple software tools, and office labor at
        once. Exact pricing depends on your trade and market, and because each territory
        is exclusive we discuss it directly. Start with a{" "}
        <a href="#lead-form" style={link}>territory check</a> and we&apos;ll walk you through
        the numbers for your city.
      </>
    ),
  },
  {
    q: "Will this replace my office staff?",
    a: (
      <>
        It replaces the office work, not necessarily the people &mdash; it frees them. The
        repetitive parts (answering inquiries, quoting, booking, reminding, invoicing,
        chasing payment, requesting reviews) run automatically, so the humans on your team
        can focus on the work that actually needs judgment and a personal touch. Most
        operators use the freed-up time to take on more jobs without adding headcount.
      </>
    ),
  },
  {
    q: "What if I already use a CRM or scheduling tool?",
    a: (
      <>
        Most operators come to Full Loop running three to five disconnected tools plus a
        spreadsheet. The platform replaces that stack with one system, so you&apos;re
        consolidating rather than adding another login. We&apos;ll talk through your current
        setup during the territory conversation and map out the switch &mdash; the goal is
        fewer tools, not more.
      </>
    ),
  },
  {
    q: "Is my data and my customers’ data secure?",
    a: (
      <>
        Yes. Payments run on Stripe&apos;s infrastructure, customer and business data is
        handled on secure, access-controlled systems, and your customer list is yours &mdash;
        not shared with other operators or resold. Because each territory is exclusive,
        your competitive data never sits in the same shared pool a rival can see.
      </>
    ),
  },
  {
    q: "How do I know it actually works?",
    a: (
      <>
        Because it already runs a real company. The NYC Maid operates entirely on Full
        Loop in production &mdash; real clients, real crews, real revenue &mdash; and every figure
        we publish traces to the live database. Read the{" "}
        <Link href="/case-study/the-nyc-maid" style={link}>full case study</Link> and the{" "}
        <Link href="/why-you-should-choose-full-loop-crm-for-your-business" style={link}>
          reasons operators switch
        </Link>{" "}
        before you decide. Proof first, pitch second.
      </>
    ),
  },
  {
    q: "What makes a CRM “full-cycle” instead of just a CRM?",
    a: (
      <>
        A traditional CRM is a database of contacts and a place to log activity &mdash; it
        organizes demand you already created. A full-cycle CRM owns every stage of the
        revenue cycle: it creates the demand (lead generation), converts it (AI sales),
        delivers it (booking, dispatch, field ops), captures it (payments), and renews it
        (reviews, retention, retargeting). Full Loop is built around that complete cycle,
        which is why one platform replaces the website, scheduler, invoicing app, review
        tool, and follow-up system most operators run separately. The{" "}
        <Link href="/full-loop-crm-service-features" style={link}>features page</Link>{" "}
        walks through all seven stages.
      </>
    ),
  },
  {
    q: "Do I get my own website, or does it plug into mine?",
    a: (
      <>
        Lead generation runs on a network of organic, SEO-optimized sites and local
        landing pages tuned to rank for your trade in your city, feeding inquiries
        straight into your pipeline. If you already have a brand site you love, it can
        coexist; the point is that the lead engine produces searchable, rankable pages
        working for you around the clock. Because your territory is exclusive, those pages
        compete for your market on your behalf and are off-limits to rivals on the
        platform.
      </>
    ),
  },
  {
    q: "How does multi-domain organic SEO lead generation work?",
    a: (
      <>
        Instead of betting everything on a single domain, the platform operates a network
        of focused, trade-and-location specific pages that each target the real searches
        homeowners make &mdash; service plus city, service plus neighborhood, emergency
        variants, and the long-tail questions that signal buying intent. Each page is
        built to rank organically and convert, then routes the lead into your pipeline
        where the AI sales agent takes over. It is the same engine documented in the{" "}
        <Link href="/case-study/the-nyc-maid" style={link}>NYC Maid case study</Link>,
        which shows organic lead clicks at scale with zero paid spend.
      </>
    ),
  },
  {
    q: "Can it track which website or page generated a paying client?",
    a: (
      <>
        Yes &mdash; attribution runs end to end. The platform can trace a paying customer back
        to the specific page, source, and search that produced the lead, so you know which
        parts of the lead engine are actually generating revenue rather than just traffic.
        For an operator who has spent years guessing which marketing &ldquo;works,&rdquo; closed-loop
        attribution from first click to paid invoice is one of the most valuable things
        the system provides.
      </>
    ),
  },
  {
    q: "Does it work for emergency and 24/7 trades?",
    a: (
      <>
        Especially well. Emergency trades &mdash;{" "}
        <Link href="/industry/crm-for-plumbing-businesses" style={link}>plumbing</Link>,{" "}
        <Link href="/industry/crm-for-locksmith-businesses" style={link}>locksmith</Link>,
        water damage restoration, garage door repair &mdash; live and die on speed-to-lead at
        odd hours. The AI sales agent answers instantly at 2&nbsp;a.m. when your competitors&apos;
        calls go to voicemail, captures the job, and dispatches it. Round-the-clock
        response is exactly where an autonomous front office beats a human one.
      </>
    ),
  },
  {
    q: "Does it support a bilingual (English/Spanish) team?",
    a: (
      <>
        Yes. The crew mobile portal is bilingual, and the AI sales agent converses with
        customers in English or Spanish. Home service teams are frequently bilingual, and
        forcing everyone through English-only software creates errors and slows the field
        down. Full Loop is built for how these crews actually work.
      </>
    ),
  },
  {
    q: "What happens to my data if I ever leave?",
    a: (
      <>
        Your customers and your data are yours. We don&apos;t hold your client list hostage or
        resell it to other operators. If you ever decide to leave, you can take your
        customer records with you. The exclusivity rule cuts both ways: your competitive
        data never sits in a shared pool a rival could access while you&apos;re a partner, and
        it goes with you if you go.
      </>
    ),
  },
  {
    q: "Can I see real numbers before I commit?",
    a: (
      <>
        That is the entire reason the{" "}
        <Link href="/case-study/the-nyc-maid" style={link}>NYC Maid case study</Link>{" "}
        exists. It publishes real operating metrics from a live business running on Full
        Loop &mdash; clients, bookings, revenue, payout automation rate, review counts, and
        lead-source attribution &mdash; with every figure traceable to the production
        database. We&apos;d rather show you a working machine than pitch you a promise.
      </>
    ),
  },
  {
    q: "How is this different from buying leads from Angi, Thumbtack, or Google LSA?",
    a: (
      <>
        Lead marketplaces sell the same lead to several competitors and charge you per
        lead forever &mdash; you&apos;re renting demand and racing rivals to the phone. Full Loop
        generates leads that belong to you, converts them automatically, and keeps the
        customer in your world for repeat business. You stop paying a toll on every job
        and start building an asset: organic rankings, a review moat, and a recurring
        client base that compounds.
      </>
    ),
  },
  {
    q: "What size business is this right for?",
    a: (
      <>
        It works from a solo, one-truck operator up to a multi-crew company running a
        whole metro. For the solo operator, it replaces the office staff they can&apos;t yet
        afford. For the established company, it consolidates a messy tool stack and adds a
        lead engine and AI sales floor that would cost a fortune to build in-house. The
        common thread is an owner who wants the business to run without living inside it.
      </>
    ),
  },
  {
    q: "Which cities and markets are available?",
    a: (
      <>
        Full Loop is built for every US metro, and each trade in each city is licensed to
        one operator. Availability is therefore specific to your trade and your market &mdash;
        the only way to know is to check. Browse the{" "}
        <Link href="/home-service-crm-locations" style={link}>cities we cover</Link> and
        then run a territory check with your trade and city. If it&apos;s open, we&apos;ll show you
        what the loop looks like for your business; if it&apos;s taken, we&apos;ll tell you.
      </>
    ),
  },
  {
    q: "What’s the very first step?",
    a: (
      <>
        Check your territory. Use the <a href="#lead-form" style={link}>form on this page</a>{" "}
        with your trade and city, and we&apos;ll confirm whether it&apos;s still available. There&apos;s
        no obligation and no cost to find out &mdash; but once a trade is claimed in a city,
        it&apos;s off the board, so the operators who move first are the ones who lock their
        markets.
      </>
    ),
  },
];

// Plain-text mirror of the on-page FAQ, for FAQPage structured data. Kept in
// the same file so questions stay in sync with what renders above.
export const homeFaqForSchema: { question: string; answer: string }[] = [
  { question: "What is Full Loop CRM, exactly?", answer: "Full Loop is the first full-cycle CRM for home service businesses. It generates your leads, closes them with an AI sales agent, books the job, dispatches and GPS-tracks your crew, collects payment, requests the review, and retargets the customer for the next booking — one platform, no integrations." },
  { question: "How is this different from other home service CRMs?", answer: "Most CRMs only organize leads you already have. Full Loop generates the lead and converts it automatically, and it is licensed to one operator per trade per city so competitors can't use the same lead engine, SEO network, or AI sales agent against you." },
  { question: "What does one operator per trade per city mean?", answer: "We license each trade in each city to a single operator — one cleaning company, one HVAC company, one plumber per metro. While you hold the license, every other business in that trade in that city is locked out of Full Loop. Once a territory is claimed, it's off the board." },
  { question: "How does the AI sales agent actually convert leads?", answer: "The moment an inquiry arrives, the AI replies by text and chat, qualifies the customer, quotes from your real pricing, handles objections, and books the job — in English or Spanish, 24/7. Speed-to-lead is the biggest predictor of who wins the job, and it responds in seconds." },
  { question: "Do I need to run ads to get leads?", answer: "No. The lead engine is built on organic, SEO-optimized sites that rank for the searches customers already make. The NYC Maid case study documents tens of thousands of organic lead clicks with zero paid ad spend." },
  { question: "What types of businesses is this built for?", answer: "More than fifty home and field service trades — cleaning, HVAC, plumbing, electrical, landscaping, lawn care, pest control, roofing, painting, junk removal, pool service, handyman, restoration, and more." },
  { question: "How does GPS-verified check-in and check-out work?", answer: "Crews work from a mobile portal showing the day's route and job details, then check in and out with location verification, giving you an honest record of who was on site and for how long — the basis for billing, payroll, and customer updates." },
  { question: "How do payments and crew payouts work?", answer: "Full Loop collects payment automatically — cards on file, deposits, balances, recurring billing — and reconciles it. Crew payouts can run automatically too; on the NYC Maid, more than 99% of payouts went out via Stripe Connect the moment a job closed." },
  { question: "Is there a team portal for my crew?", answer: "Yes — a bilingual English/Spanish mobile portal where crews see their route, job details, and notes, check in and out with GPS, and send photos and completion notes back to the office and customer in real time." },
  { question: "Can it handle recurring clients and schedules?", answer: "Yes. Recurring clients are rebooked on their cadence automatically and one-time jobs get nudged toward recurring, with the calendar as the single source of truth — ideal for cleaning, lawn care, pest control, and pool service." },
  { question: "How does it earn and manage reviews?", answer: "When a job is completed and paid, the system requests a review at the right time and routes it to the platforms that matter. Those reviews feed your local search rankings, which generate the next lead." },
  { question: "Do I keep my own brand and customers?", answer: "Completely. Full Loop runs the machine; you own the business, the brand, the customer relationships, the pricing, and the margins. The leads and clients the platform generates belong to your company." },
  { question: "How fast can I get started?", answer: "It starts with a territory check — tell us your trade and city and we confirm whether it's open. From there we load your pricing, services, and team, and the loop starts running." },
  { question: "What does it cost?", answer: "Full Loop is priced as an operating partnership rather than per-seat SaaS, because it replaces lead-gen spend, multiple tools, and office labor at once. Exact pricing depends on your trade and market and is discussed directly, since each territory is exclusive." },
  { question: "Will this replace my office staff?", answer: "It replaces the office work, not necessarily the people — the repetitive tasks run automatically so your team can focus on work that needs judgment. Most operators use the freed-up time to take on more jobs without adding headcount." },
  { question: "What if I already use a CRM or scheduling tool?", answer: "Most operators arrive running three to five disconnected tools plus a spreadsheet. Full Loop replaces that stack with one system, so you're consolidating rather than adding another login." },
  { question: "Is my data and my customers' data secure?", answer: "Yes. Payments run on Stripe's infrastructure, data is handled on secure access-controlled systems, and your customer list is yours — never shared with other operators or resold." },
  { question: "How do I know it actually works?", answer: "Because it already runs a real company. The NYC Maid operates entirely on Full Loop in production, and every published figure traces to the live database. Read the full case study before you decide." },
  { question: "What makes a CRM full-cycle instead of just a CRM?", answer: "A traditional CRM organizes demand you already created. A full-cycle CRM creates the demand, converts it, delivers it, captures payment, and renews it — every stage of the revenue cycle in one platform." },
  { question: "Do I get my own website, or does it plug into mine?", answer: "Lead generation runs on a network of organic, SEO-optimized sites and landing pages tuned to rank for your trade in your city. An existing brand site can coexist; the point is that the lead engine produces rankable pages working for you." },
  { question: "How does multi-domain organic SEO lead generation work?", answer: "Instead of betting on one domain, the platform runs a network of trade-and-location specific pages targeting the real searches homeowners make, each built to rank organically and route the lead into your pipeline where the AI takes over." },
  { question: "Can it track which website or page generated a paying client?", answer: "Yes — attribution runs end to end, tracing a paying customer back to the specific page, source, and search that produced the lead, so you know which parts of the lead engine actually generate revenue." },
  { question: "Does it work for emergency and 24/7 trades?", answer: "Especially well. For plumbing, locksmith, water damage, and garage door repair, the AI sales agent answers instantly at any hour when competitors' calls go to voicemail, captures the job, and dispatches it." },
  { question: "Does it support a bilingual English/Spanish team?", answer: "Yes. The crew mobile portal is bilingual and the AI sales agent converses with customers in English or Spanish." },
  { question: "What happens to my data if I ever leave?", answer: "Your customers and data are yours. We don't hold your client list hostage or resell it, and you can take your records with you if you leave." },
  { question: "Can I see real numbers before I commit?", answer: "Yes — that's why the NYC Maid case study exists. It publishes real operating metrics from a live business running on Full Loop, with every figure traceable to the production database." },
  { question: "How is this different from buying leads from Angi, Thumbtack, or Google LSA?", answer: "Lead marketplaces sell the same lead to several competitors and charge per lead forever. Full Loop generates leads that belong to you, converts them automatically, and keeps the customer for repeat business — building an asset instead of paying a toll." },
  { question: "What size business is this right for?", answer: "From a solo one-truck operator to a multi-crew company running a whole metro. For the solo operator it replaces office staff they can't yet afford; for the established company it consolidates the tool stack and adds a lead engine and AI sales floor." },
  { question: "Which cities and markets are available?", answer: "Full Loop is built for every US metro, with each trade in each city licensed to one operator, so availability is specific to your trade and market. Run a territory check with your trade and city to find out." },
  { question: "What's the very first step?", answer: "Check your territory — submit the form with your trade and city and we'll confirm whether it's still available. There's no cost to find out, but once a trade is claimed in a city it's off the board." },
];

// "FAQ and answers" — no-JS accordion via <details>. Full FAQ page at
// /full-loop-crm-frequently-asked-questions.
export default function HomeFAQ() {
  return (
    <section style={{ background: C.canvas, color: C.ink }} className="border-t" >
      <div className="w-full max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="Home service CRM FAQ"
          heading="Full Loop CRM FAQ: Common Questions About Home Service CRM Software, Pricing, Leads & Setup"
          description={
            <>
              Everything operators ask before they claim a territory &mdash; how the AI sales
              agent converts leads, how the exclusive one-trade-per-city model works, what
              it costs, and how fast you can be up and running.
            </>
          }
        />
        <div className="mt-4" />


        <div
          className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-x-12"
          style={{ borderTop: `1px solid ${C.line}` }}
        >
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group self-start"
              style={{ borderBottom: `1px solid ${C.lineSoft}` }}
            >
              <summary
                className="flex items-start justify-between gap-6 cursor-pointer list-none py-6"
                style={{
                  fontFamily: display,
                  fontWeight: 500,
                  fontSize: "clamp(18px, 1.6vw, 21px)",
                  letterSpacing: "-0.015em",
                  color: C.ink,
                }}
              >
                <span>{item.q}</span>
                <span
                  aria-hidden
                  className="transition-transform group-open:rotate-45 shrink-0"
                  style={{ fontFamily: mono, color: C.good, fontSize: "20px", lineHeight: 1.3 }}
                >
                  +
                </span>
              </summary>
              <p style={proseStyle} className="pb-7">{item.a}</p>
            </details>
          ))}
        </div>

        <SectionCloser
          href="/full-loop-crm-frequently-asked-questions"
          label="Read every question answered" formLabel="I'm In — Submit Application"
        />
      </div>
    </section>
  );
}
