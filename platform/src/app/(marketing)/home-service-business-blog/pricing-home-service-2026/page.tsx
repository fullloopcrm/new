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
const URL = `${SITE}/home-service-business-blog/pricing-home-service-2026`;
const PUBLISHED = "2026-04-22";
const MODIFIED = "2026-04-22";

const breadcrumbs = [
  { name: "Home", url: SITE },
  { name: "Home Service Business Blog", url: `${SITE}/home-service-business-blog` },
  { name: "How to Price a Home Service Business in 2026", url: URL },
];

const TITLE = "How to Price a Home Service Business in 2026: The Owner's Pricing Playbook";
const DESCRIPTION =
  "The complete pricing guide for home service owners in 2026: cost-plus vs value-based, when to raise prices, how much, and the price-increase rollout that keeps customers.";

export const metadata: Metadata = {
  title: "How to Price a Home Service Business in 2026 | Full Loop CRM",
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
    question: "How often should a home service business raise prices?",
    answer:
      "Annually at minimum for existing customers, and immediately for new quotes when your true cost basis shifts more than 3–4%. Most home service operators under-raise by 40–60% of what the market would bear — usually from fear of losing customers, which is almost always unfounded if you roll the increase out well. The businesses that raise prices every year quietly compound margin; the businesses that avoid it erode margin until they can't afford to operate.",
  },
  {
    question: "What is a healthy gross margin for a home service business?",
    answer:
      "Varies by trade, but as a rough benchmark: residential cleaning 45–55%, lawn care 50–60%, pest control 60–70%, HVAC service 55–65%, HVAC installation 30–40%, plumbing service 50–60%. Gross margin below these numbers usually indicates under-pricing, hidden cost bleed, or both. Net margin after all overhead (with the new low-overhead stack) should land 25–35%; with traditional overhead, net is often under 12%.",
  },
  {
    question: "How do I decide between cost-plus pricing and value-based pricing?",
    answer:
      "Cost-plus works when your work is relatively commodified and customers are price-sensitive (most residential cleaning, basic lawn care, routine pest control). Value-based works when you're solving a bigger problem — emergency plumbing, HVAC replacement, restoration. Many operators use a hybrid: cost-plus for recurring services that compete on price, value-based for emergency and one-time high-stakes work. What doesn't work is pricing randomly — either method beats gut-based pricing.",
  },
  {
    question: "How much should I charge per hour as a home service business?",
    answer:
      "Your billable hourly rate depends on your fully-loaded labor cost, target gross margin, and utilization rate. A tech earning $25/hr fully loaded with payroll tax and benefits costs about $32/hr. At 70% utilization (industry-typical), every on-site billable hour must cover the labor cost plus proportional overhead plus margin. The math typically lands at 3.0–3.8x fully-loaded labor cost, which in most markets puts billable rates at $95–$150/hr. Charging less than this isn't 'competitive' — it's unsustainable.",
  },
  {
    question: "What's the biggest pricing mistake home service owners make?",
    answer:
      "Confusing 'cheapest' with 'most competitive.' Being the lowest-priced option in your market typically attracts low-LTV customers who churn fast and haggle. Being a quality mid-to-premium priced option attracts customers who pay on time, stay for years, and refer their neighbors. Almost every home service operator who has raised prices 15–25% has discovered, to their surprise, that it improved their customer mix.",
  },
  {
    question: "Should I publish prices on my website in 2026?",
    answer:
      "For standardized services (weekly cleaning, pest control, lawn care), yes — publishing pricing ranges or starting prices improves lead quality and close rates because it pre-qualifies. For custom or diagnostic services (HVAC installations, plumbing repairs, restoration), publishing ranges ('$200–$800') helps more than publishing precise numbers. Hiding pricing entirely is a 2015 strategy that now signals distrust to modern customers.",
  },
  {
    question: "How do I raise prices without losing customers?",
    answer:
      "Give 30–60 days notice. Announce it by mail or email, not by surprise on the next invoice. Explain the reason honestly (labor costs rose, supplies rose, we invested in better equipment) without over-apologizing. Grandfather your most loyal customers for 3–6 months to soften the curve. Expect 2–5% churn; most operators who raise prices properly actually improve retention because they've signaled confidence. The full 8-step rollout is documented in our dedicated post.",
  },
];

const howToSteps = [
  {
    name: "Audit your true cost basis",
    text: "Calculate fully-loaded labor (wages + payroll tax + benefits + workers' comp), plus materials, plus proportional vehicle, insurance, software, and overhead per job. Most operators discover they're 10–20% under where they thought.",
  },
  {
    name: "Benchmark your market",
    text: "Get quotes on 5 common service scopes from your top 5 local competitors. You'll often find your prices are 15–25% below the market average — sometimes more.",
  },
  {
    name: "Decide your pricing stance",
    text: "Budget, mid-market, or premium. Each is viable but you can't be all three. Pick one based on your brand, quality level, and customer mix, and price accordingly.",
  },
  {
    name: "Build tiered offers",
    text: "Good / Better / Best tiers raise average transaction value by 18–32% without losing budget customers. Tier structure matters more than absolute price.",
  },
  {
    name: "Roll out price increases the right way",
    text: "30–60 days notice. Email + mail. Honest reason. Grandfather loyal customers for 3–6 months. Expect 2–5% churn and plan around it.",
  },
  {
    name: "Raise prices annually",
    text: "Build an annual pricing review into Q4 planning every year. The operators who review annually compound margin; those who don't erode it until a crisis forces a large overdue increase.",
  },
];

export default function PricingPillarPage() {
  const allSchemas = [
    webPageSchema(TITLE, DESCRIPTION, URL, breadcrumbs),
    breadcrumbSchema(breadcrumbs),
    articleSchema(TITLE, DESCRIPTION, URL, PUBLISHED, MODIFIED),
    faqSchema(faqs),
    howToSchema(
      "How to run a pricing audit and raise prices in a home service business",
      "A six-step playbook for auditing your real costs, benchmarking the market, building tiered offers, and rolling out price increases without losing customers.",
      howToSteps
    ),
  ];

  return (
    <>
      {allSchemas.map((s, i) => <JsonLd key={i} data={s} />)}

      <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-900">Home</Link>{" "}
          <span className="mx-2">/</span>
          <Link href="/home-service-business-blog" className="hover:text-slate-900">Home Service Business Blog</Link>{" "}
          <span className="mx-2">/</span>
          <span className="text-slate-900">Pricing & Profitability</span>
        </nav>

        <header className="mb-10 border-b border-slate-200 pb-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-amber-700">
            Pillar · Pricing & Profitability · 12-minute read
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl md:leading-tight">
            How to Price a Home Service Business in 2026: The Owner&apos;s Pricing Playbook
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-700 md:text-xl">
            Pricing is the single most underleveraged lever in home service. A
            10% price increase adds 10% revenue and roughly 30% more profit
            dollars in most businesses — without adding a customer, a job, or
            an hour of labor. Here is the complete playbook.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Published April 22, 2026 · Full Loop CRM Editorial
          </p>
        </header>

        <nav aria-label="Table of contents" className="mb-12 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">In this pillar</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li><a href="#underleveraged" className="hover:text-slate-900">Why pricing is the most underleveraged lever</a></li>
            <li><a href="#cost-vs-value" className="hover:text-slate-900">Cost-plus vs. value-based pricing</a></li>
            <li><a href="#the-audit" className="hover:text-slate-900">The pricing audit every operator should run annually</a></li>
            <li><a href="#raising-prices" className="hover:text-slate-900">How to raise prices without losing customers</a></li>
            <li><a href="#tiers" className="hover:text-slate-900">Tiered pricing that actually works</a></li>
            <li><a href="#discounts" className="hover:text-slate-900">Discounts: when they work, when they destroy you</a></li>
            <li><a href="#by-trade" className="hover:text-slate-900">Pricing math by trade</a></li>
            <li><a href="#emergency-premium" className="hover:text-slate-900">Emergency and urgency pricing</a></li>
            <li><a href="#worked-example" className="hover:text-slate-900">A worked example: $800k cleaning company</a></li>
            <li><a href="#communicating" className="hover:text-slate-900">Communicating price increases</a></li>
            <li><a href="#faq" className="hover:text-slate-900">Frequently asked questions</a></li>
          </ol>
        </nav>

        <div className="prose prose-slate prose-lg max-w-none prose-headings:scroll-mt-24 prose-h2:text-3xl prose-h2:font-bold prose-h2:text-slate-900 prose-h2:mt-14 prose-h2:mb-4 prose-h3:text-xl prose-h3:font-semibold prose-h3:text-slate-900 prose-h3:mt-8 prose-h3:mb-3 prose-p:text-slate-800 prose-p:leading-relaxed prose-a:text-emerald-700 prose-a:underline hover:prose-a:text-emerald-900 prose-strong:text-slate-900">

          <h2 id="underleveraged">Why pricing is the most underleveraged lever in home service</h2>
          <p>
            A 10% price increase across a home service business does not
            produce 10% more profit — it produces roughly 30% more profit.
            Here&apos;s the math: if your gross margin is 40% and your
            overhead is fixed, every dollar of new revenue from higher
            pricing drops almost entirely to the bottom line because you
            didn&apos;t add an hour of labor or a dollar of materials to
            generate it.
          </p>
          <p>
            No other lever in a home service business works this way. You
            can add leads (see{" "}
            <Link href="/home-service-business-blog/how-to-get-more-leads-home-service-2026">
              how to get more leads for a home service business in 2026
            </Link>
            ), but new leads cost money and come with fulfillment costs. You
            can hire a new tech, but that doubles labor before revenue catches
            up. You can cut overhead — which is real (see{" "}
            <Link href="/home-service-business-blog/home-service-business-without-the-overhead">
              the home service business without the overhead
            </Link>
            ) — but most businesses have fewer overhead dollars to cut than
            they have pricing headroom.
          </p>
          <p>
            And yet the overwhelming majority of owner-operators under-price
            their work by 15–30%. The reasons are emotional, not analytical:
            fear of losing customers, imposter-syndrome discomfort with
            charging more, an outdated read of the local market, or a
            self-image as &quot;the affordable option&quot; even after costs
            have risen for a decade. This pillar is about fixing that.
          </p>
          <p>
            There&apos;s a specific pattern worth naming: operators who
            started their business by undercutting established competitors
            often keep that identity long past the point where it still
            makes sense. The business you started at $40 an hour to steal
            share from a $60/hr competitor now has a team, overhead,
            insurance, and a reputation — you&apos;re no longer
            undercutting, you&apos;re sandbagging. The identity shift from
            &quot;the cheap option&quot; to &quot;the fair option&quot; is
            often the single most profitable mental move an
            owner-operator will make in their career. It usually happens
            around the $400k–$800k revenue range, and it almost never
            happens without a deliberate pricing audit forcing the issue.
          </p>

          <h2 id="cost-vs-value">Cost-plus vs. value-based pricing</h2>
          <p>
            The two main pricing frameworks used by home service businesses,
            and the misconception that you have to pick one:
          </p>
          <h3>Cost-plus</h3>
          <p>
            You calculate the fully-loaded cost of delivering a service and
            add a target margin on top. Works well when: the work is
            relatively standardized, customers are price-sensitive, and your
            competitors are also pricing on a cost-plus basis. Most
            residential cleaning, basic lawn care, and routine pest control
            are priced this way.
          </p>
          <h3>Value-based</h3>
          <p>
            You price based on the value delivered to the customer rather
            than your underlying cost. Works well when: the stakes are high,
            you&apos;re solving a time-sensitive or painful problem, and
            your expertise is non-commodity. Emergency plumbing, HVAC
            installation, and restoration work are typically value-priced.
          </p>
          <h3>The hybrid most winning operators actually use</h3>
          <p>
            Cost-plus pricing for your recurring, predictable services
            (weekly cleaning, monthly pest control, seasonal lawn care).
            Value-based pricing for emergency, one-time, or high-stakes
            work. This hybrid approach is how operators compete on
            affordability where it matters and capture premium economics
            where they matter. Random pricing without a framework is the
            only real loser among these three choices.
          </p>

          <h2 id="the-audit">The pricing audit every operator should run annually</h2>
          <p>
            Every home service owner should sit down once a year — Q4 is
            ideal, because increases usually roll out in Q1 — and audit the
            three components of pricing:
          </p>
          <h3>Your true cost basis</h3>
          <p>
            Fully-loaded labor (wages plus payroll tax plus benefits plus
            workers&apos; comp), plus materials, plus proportional vehicle,
            insurance, software, and overhead per job. Most operators do
            this in their head and are 10–20% under the real number. Write
            it down. The full process is in{" "}
            <Link href="/home-service-business-blog/job-costing-home-service">
              job costing for home service
            </Link>{" "}
            and{" "}
            <Link href="/home-service-business-blog/calculating-overhead-home-service">
              calculating your real overhead
            </Link>
            .
          </p>
          <h3>Your market position</h3>
          <p>
            Get quotes on 5 standardized service scopes from your top 5
            local competitors. Mystery-shop. Don&apos;t rely on their
            websites, because public pricing often trails actual quoted
            pricing. You&apos;ll typically find you are 15–25% below market,
            sometimes more. Shock is the common response — and the common
            tell that the audit was overdue.
          </p>
          <h3>Your margin targets</h3>
          <p>
            What gross margin do you want to hit to cover your overhead, pay
            yourself a real salary, and reinvest in the business? The
            benchmarks: residential cleaning 45–55% gross, lawn care 50–60%,
            pest control 60–70%, HVAC service 55–65%, plumbing service
            50–60%. Below these numbers, you&apos;re subsidizing your
            customers. See{" "}
            <Link href="/home-service-business-blog/profit-margins-home-service-benchmarks">
              profit margin benchmarks for home service by trade
            </Link>
            .
          </p>

          <h2 id="raising-prices">How to raise prices without losing customers</h2>
          <p>
            Raising prices is a process, not an email. The 8-step rollout
            that has worked across hundreds of home service operators:
          </p>
          <ol>
            <li>
              <strong>Decide the number.</strong> Based on the audit above.
              Don&apos;t split the difference out of fear — pick the honest
              number.
            </li>
            <li>
              <strong>Pick an effective date 30–60 days out.</strong> Short
              enough to be real; long enough to give customers time to
              absorb it.
            </li>
            <li>
              <strong>Write the announcement.</strong> Honest reason (labor
              and supply costs rose), no over-apology, no lengthy
              justification. A short, confident paragraph is better than
              three defensive pages.
            </li>
            <li>
              <strong>Send by both email and postal mail for high-value
              customers.</strong> For lower-value customers, email is fine.
              For anyone paying you $200+/month, use mail.
            </li>
            <li>
              <strong>Grandfather your most loyal customers for 3–6
              months.</strong> Customers who have been with you 2+ years and
              pay on time. This is not weakness; it&apos;s a retention
              investment.
            </li>
            <li>
              <strong>Expect 2–5% churn.</strong> If you get more than 5%,
              your messaging or timing was off. If you get less than 2%,
              your increase was probably too small.
            </li>
            <li>
              <strong>Raise for new customers immediately; raise for
              existing customers on the effective date.</strong>
            </li>
            <li>
              <strong>Document the results.</strong> Net revenue impact,
              churn, any patterns in who churned. Use this to calibrate the
              next annual increase.
            </li>
          </ol>
          <p>
            The full playbook with templates is in{" "}
            <Link href="/home-service-business-blog/how-to-raise-prices-home-service">
              how to raise prices without losing customers
            </Link>
            .
          </p>

          <h2 id="tiers">Tiered pricing that actually works</h2>
          <p>
            Tiered pricing — Good / Better / Best — raises average
            transaction value by 18–32% in most home service businesses
            without alienating budget customers. The structure works because
            it anchors the customer to the middle option and gives the
            customer agency over where to land.
          </p>
          <p>
            Tier design rules that matter:
          </p>
          <ul>
            <li>
              The middle tier should be what most customers pick. Price and
              feature-load it accordingly.
            </li>
            <li>
              The top tier should be priced ~30–50% above the middle, with
              genuinely better service. It won&apos;t be the highest-volume
              tier, but it lifts the perceived value of the middle.
            </li>
            <li>
              The bottom tier should be bare-bones. Its job is to be
              recognizable as &quot;budget,&quot; not to be a good deal.
            </li>
            <li>
              Don&apos;t offer more than three tiers. Four confuses; five
              paralyzes.
            </li>
          </ul>
          <p>
            For sample tiers by trade, see{" "}
            <Link href="/home-service-business-blog/tiered-pricing-home-service">
              tiered pricing for home service: good, better, best that
              actually works
            </Link>
            . For whether to charge hourly or flat, see{" "}
            <Link href="/home-service-business-blog/hourly-rate-vs-flat-rate-home-service">
              hourly vs. flat rate pricing
            </Link>
            .
          </p>

          <h2 id="discounts">Discounts: when they work, when they destroy you</h2>
          <p>
            Discounting is the fastest way to train customers to wait for
            the next sale. It&apos;s also occasionally the right move.
            Honest rules:
          </p>
          <p>
            <strong>Discounts that work:</strong> first-time-customer
            promotions (under 15% off, one-time only), bundle discounts for
            booking multiple services, referral credits, multi-month pre-pay
            discounts.
          </p>
          <p>
            <strong>Discounts that destroy:</strong> broad seasonal sales,
            coupon-site deals that drag in price shoppers, unlimited-use
            promo codes, matching competitor discounts reflexively.
          </p>
          <p>
            The underlying test: does the discount bring in customers who
            will pay full price later, or does it bring in customers who
            only buy from you on sale? If you&apos;re acquiring sale-only
            customers, your CAC just went up because LTV collapsed. See{" "}
            <Link href="/home-service-business-blog/discounts-and-coupons-home-service">
              discounts and coupons: when they work and when they wreck you
            </Link>
            .
          </p>
          <p>
            Deposits are a related but different lever. Collecting
            deposits doesn&apos;t lower price — it lowers cancellation risk
            and no-show rates. See{" "}
            <Link href="/home-service-business-blog/deposits-for-home-service-jobs">
              deposits for home service jobs
            </Link>
            .
          </p>

          <h2 id="by-trade">Pricing math by trade</h2>
          <h3>Residential cleaning</h3>
          <p>
            Standardized weekly and bi-weekly pricing scales with square
            footage and bedroom/bathroom count. Starting prices in major
            metros for a 2BR/1BA biweekly clean: $140–$180. In secondary
            markets: $110–$150. Deep cleans 1.5–2x recurring rate. Move-out
            cleans often separately scoped. Add-ons (inside oven, inside
            fridge, inside windows) as a la carte items.
          </p>
          <h3>HVAC</h3>
          <p>
            Service calls: diagnostic fee + hourly labor + parts. Typical
            diagnostic: $89–$149. Hourly labor: $120–$180 billable.
            Installations: flat-rate quoting only, based on equipment tier
            and complexity. Maintenance plans: $180–$280/year, bundling two
            seasonal tune-ups plus priority scheduling.
          </p>
          <h3>Plumbing</h3>
          <p>
            Similar structure to HVAC. Service call + hourly + parts.
            Emergency premium should be real (1.5–2x standard) — not a
            marketing gimmick. Water heater installs, drain clearing, and
            repiping should all be flat-rated with a small buffer for
            unexpected complexity.
          </p>
          <h3>Lawn care and pest control</h3>
          <p>
            Lot-size based pricing. Recurring contracts with seasonal
            pricing (more expensive in summer for lawn, scaling for pest
            pressure season). Treat these as subscriptions and price the
            annual contract, not the individual visit.
          </p>
          <h3>Handyman and general contracting</h3>
          <p>
            Minimum-charge plus hourly, or flat-rate per project. The
            minimum-charge model (typically 1-hour minimum at $120–$180)
            protects against unprofitable short jobs. For larger projects,
            transition to flat-rate quoting with a change-order process.
          </p>
          <p>
            For service agreements that convert one-off jobs into recurring
            revenue (the most valuable pricing transition in home service),
            see{" "}
            <Link href="/home-service-business-blog/service-agreements-recurring-revenue">
              service agreements and recurring revenue: the asset hiding in
              your business
            </Link>
            .
          </p>

          <h2 id="emergency-premium">Emergency and urgency pricing</h2>
          <p>
            Home service businesses that take emergency or after-hours calls
            should charge a genuine premium for that work. Customers
            understand that a plumber at 11pm on a Sunday costs more than a
            plumber at 11am on a Tuesday. The mistake many operators make
            is either (a) charging the same rate regardless, leaving money
            on the table, or (b) charging a premium but feeling guilty
            about it and then discounting after the customer pushes back.
          </p>
          <p>
            The honest math: after-hours labor costs you more (overtime
            wages, crew disruption, opportunity cost on the next
            morning&apos;s normal schedule). A 1.5–2x multiplier on
            emergency hourly rates is standard and defensible. Same-day
            (non-emergency) premium of 10–20% is also common.
          </p>
          <p>
            Three rules for emergency pricing that doesn&apos;t backfire:
          </p>
          <ul>
            <li>
              <strong>Publish the emergency rate structure in advance</strong>{" "}
              — on your website, in your quote, and in your intake flow.
              Surprise premium pricing at the end of a job destroys trust;
              pre-disclosed premium pricing builds it.
            </li>
            <li>
              <strong>Define &quot;emergency&quot; precisely.</strong>{" "}
              &quot;After 6pm weekdays and anytime weekends&quot; is clear.
              &quot;Emergency response&quot; alone is vague and invites
              arguments.
            </li>
            <li>
              <strong>Train your intake agent — human or AI — to hold the
              line.</strong> Customers will ask for the non-emergency rate
              during an emergency. The answer is &quot;our standard rate
              applies during standard hours; this is the emergency
              rate.&quot; Your AI agent can deliver this consistently; a
              human agent needs practice.
            </li>
          </ul>

          <h2 id="worked-example">A worked example: $800k cleaning company</h2>
          <p>
            Let&apos;s ground all of this in one full example. An $800,000
            residential cleaning company with 8 cleaners, an average job
            price of $160, and roughly 5,000 cleanings per year. Current
            gross margin is 42%. The owner thinks prices are where they
            need to be, but hasn&apos;t audited in 18 months.
          </p>
          <p>
            She runs the audit described above. Mystery shops five
            competitors. Discovers her average $160 job would price at
            $180–$195 at comparable competitors — she&apos;s ~15% below
            market. Her fully-loaded labor cost per job has drifted from
            $58 to $71 since her last review because she gave raises and
            workers&apos; comp premiums went up. Her real gross margin is
            closer to 38% than the 42% she thought. She&apos;s under-priced
            and margin-squeezed simultaneously.
          </p>
          <p>
            Her plan: raise the average job price to $180 (12.5%
            increase), grandfather customers who have been with her 3+
            years at their current rate for 6 months, roll out to new
            customers immediately, announce to existing customers 45 days
            ahead. Expected churn: 3–4% based on the operators we&apos;ve
            tracked through similar moves.
          </p>
          <p>
            Math after the rollout: $180 × 5,000 jobs = $900,000 in
            theoretical revenue. Account for 3.5% churn: ~$868,000 actual.
            At her old 38% gross margin that would be $330,000 in gross
            profit; at the new pricing, the incremental $100,000 of revenue
            drops at roughly 90% to gross profit because labor and
            materials barely moved — yielding about $420,000 in gross
            profit. Net profit improvement: roughly $90,000/year from a
            single 4-hour pricing meeting and one mailed letter.
          </p>
          <p>
            This is why pricing is the most underleveraged lever.
          </p>

          <h2 id="communicating">Communicating price increases</h2>
          <p>
            Three honest principles for price-increase communications:
          </p>
          <p>
            <strong>Be direct.</strong> &quot;Starting June 1, our weekly
            service rate will be $165 (from $145).&quot; No apologizing. No
            burying the number in paragraph 4.
          </p>
          <p>
            <strong>Explain once, briefly.</strong> &quot;Labor and supply
            costs have risen, and this increase allows us to continue paying
            our team well and investing in the service quality you
            expect.&quot; Don&apos;t turn it into a manifesto.
          </p>
          <p>
            <strong>Reaffirm value.</strong> &quot;Thanks for your
            continued trust. We&apos;re committed to the same service you
            count on.&quot; End warm, not defensive.
          </p>
          <p>
            Customers who read a direct, confident letter almost always
            stay. Customers who read a long, anxious one pick up on the
            anxiety and reconsider their relationship. Tone drives churn
            more than the number itself.
          </p>

          <h2 id="where-pricing-fits">Where pricing fits in the broader picture</h2>
          <p>
            Pricing is one lever in running a modern home service business.
            If you&apos;re running an AI-driven intake loop (see{" "}
            <Link href="/home-service-business-blog/autonomous-home-service-business-2026">
              the autonomous home service business in 2026
            </Link>
            ), your pricing rules are what the AI quotes from — so pricing
            audits matter directly to conversion. If you&apos;re scaling
            (see{" "}
            <Link href="/home-service-business-blog/scaling-home-service-crews">
              scaling from one crew to two
            </Link>
            ), pricing discipline is what funds the second crew.
          </p>
          <p>
            For the full editorial index, see the{" "}
            <Link href="/home-service-business-blog">
              Home Service Business Blog
            </Link>
            . For the platform that runs the full loop from priced quote to
            paid invoice, see the{" "}
            <Link href="/full-loop-crm-service-features">feature list</Link>,
            the{" "}
            <Link href="/full-loop-crm-pricing">Full Loop CRM pricing page</Link>,
            the{" "}
            <Link href="/full-loop-crm-service-business-industries">
              industries served
            </Link>
            , the{" "}
            <Link href="/full-loop-crm-101-educational-tips">
              101 educational tips
            </Link>
            , and the{" "}
            <Link href="/full-loop-crm-frequently-asked-questions">
              platform FAQ
            </Link>
            . If you&apos;re comparing tools, read{" "}
            <Link href="/why-you-should-choose-full-loop-crm-for-your-business">
              why Full Loop CRM
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
            Pricing is the most profitable 4-hour meeting you&apos;ll have
            all year. Audit your cost basis, audit the market, pick a pricing
            stance, raise prices with a plan, and repeat annually. The
            businesses that do this compound. The businesses that
            don&apos;t, erode.
          </p>
          <p>
            One concrete move: block 4 hours this week. Mystery-shop five
            competitors. Calculate your fully-loaded cost on your three most
            common services. Decide your new prices. Schedule the
            announcement for 45 days out. You&apos;ll add 10–20% margin
            without adding a single job — and you&apos;ll wonder why you
            didn&apos;t do it last year.
          </p>
        </div>

        <aside className="mt-16 rounded-2xl border border-slate-200 bg-slate-900 p-8 text-white md:p-10">
          <h2 className="text-2xl font-semibold md:text-3xl">Pricing rules enforced at quote time.</h2>
          <p className="mt-3 text-slate-300">
            Full Loop CRM lets you define pricing rules once — by service,
            tier, zip code, or frequency — and enforce them every time the
            AI quotes a lead. Stop leaking margin to custom exceptions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/crm-partnership-request-form" className="rounded-lg bg-white px-5 py-3 text-sm font-medium text-slate-900 hover:bg-slate-100">Apply for your territory</Link>
            <Link href="/full-loop-crm-service-features" className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700">See the platform</Link>
            <Link href="/full-loop-crm-pricing" className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700">Pricing</Link>
          </div>
        </aside>
      </article>
    </>
  );
}
