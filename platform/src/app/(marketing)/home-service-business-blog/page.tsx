import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  itemListSchema,
} from "@/lib/schema";

const SITE = "https://homeservicesbusinesscrm.com";
const HUB = `${SITE}/home-service-business-blog`;

const breadcrumbs = [
  { name: "Home", url: SITE },
  { name: "Home Service Business Blog", url: HUB },
];

export const metadata: Metadata = {
  title: "Home Service Business Blog | Run, Automate & Scale | Full Loop CRM",
  description:
    "102 long-form guides for home service operators: running without overhead, autonomous operations in 2026, Yinez AI, dispatch, pricing, hiring, payments, and scaling a crew-based business.",
  alternates: { canonical: HUB },
  openGraph: {
    title: "Home Service Business Blog | Full Loop CRM",
    description:
      "Long-form guides for home service operators — running lean, automating the back office, and scaling a crew-based business in 2026.",
    url: HUB,
    siteName: "Full Loop CRM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Home Service Business Blog | Full Loop CRM",
    description:
      "How modern operators are running home service businesses leaner, faster, and with 70% less overhead.",
  },
};

type Post = {
  slug: string;
  title: string;
  blurb: string;
  pillar: string;
  status: "live" | "coming-soon";
};

/**
 * The full 102-post content map.
 * Every post has a canonical slug so cross-links resolve as the corpus fills.
 * Flagships are published first; clusters roll out in waves.
 */
const POSTS: Post[] = [
  // ── FLAGSHIPS (2) ─────────────────────────────────────────────
  {
    slug: "home-service-business-without-the-overhead",
    title:
      "The Home Service Business With No Office, No Dispatcher, No Answering Service",
    blurb:
      "How 2026 operators are running 7-figure home service companies with zero back-office staff — and the real dollar math of removing $150k+ of overhead.",
    pillar: "flagship",
    status: "live",
  },
  {
    slug: "autonomous-home-service-business-2026",
    title:
      "The Autonomously-Run Home Service Business Is Here (2026): A 70% Overhead Cut, Line by Line",
    blurb:
      "What 'autonomous' actually means in 2026 — lead-to-paid without a human in the loop — and the line-by-line breakdown of a 70% overhead reduction.",
    pillar: "flagship",
    status: "coming-soon",
  },

  // ── PILLAR: LEAD GENERATION (10) ─────────────────────────────
  {
    slug: "how-to-get-more-leads-home-service-2026",
    title: "How to Get More Leads for a Home Service Business in 2026",
    blurb:
      "The hub post on lead generation for owner-operators. Channels, costs, conversion rates, and the one mistake that kills 90% of lead-gen budgets.",
    pillar: "leads",
    status: "coming-soon",
  },
  {
    slug: "local-seo-for-home-service-businesses",
    title: "Local SEO for Home Service Businesses: The Complete 2026 Guide",
    blurb:
      "Ranking a home service business locally — GMB, citations, on-page, schema, reviews, and the honest truth about how long it takes.",
    pillar: "leads",
    status: "coming-soon",
  },
  {
    slug: "google-business-profile-for-home-service",
    title: "Google Business Profile for Home Service Owners: A Practical Setup",
    blurb: "Every GBP setting that matters, in order, with examples.",
    pillar: "leads",
    status: "coming-soon",
  },
  {
    slug: "facebook-groups-lead-generation-home-service",
    title:
      "Facebook Groups Are Still the Cheapest Lead Source for Home Service — Here's the Playbook",
    blurb: "How to generate leads in local Facebook groups without getting banned.",
    pillar: "leads",
    status: "coming-soon",
  },
  {
    slug: "referral-programs-home-service-business",
    title: "Referral Programs That Actually Work for Home Service Businesses",
    blurb: "The four referral structures that work, and three that waste your money.",
    pillar: "leads",
    status: "coming-soon",
  },
  {
    slug: "paid-ads-for-home-service-businesses",
    title: "Paid Ads for Home Service Businesses: Google, Facebook, and LSAs",
    blurb:
      "When to run each, what to budget, which to avoid, and the one metric most operators ignore.",
    pillar: "leads",
    status: "coming-soon",
  },
  {
    slug: "nextdoor-for-home-service-businesses",
    title: "Nextdoor for Home Service Businesses: What Works in 2026",
    blurb: "How to show up on Nextdoor without burning the community.",
    pillar: "leads",
    status: "coming-soon",
  },
  {
    slug: "website-that-converts-home-service",
    title: "The Home Service Website That Actually Converts in 2026",
    blurb: "Five above-the-fold patterns that quadruple quote requests.",
    pillar: "leads",
    status: "coming-soon",
  },
  {
    slug: "yelp-for-home-service-is-it-worth-it",
    title: "Yelp for Home Service Businesses: Is It Worth It in 2026?",
    blurb: "The honest answer by trade and market size.",
    pillar: "leads",
    status: "coming-soon",
  },
  {
    slug: "speed-to-lead-home-service",
    title: "Speed-to-Lead: Why 8 Seconds Wins and Everyone Else Loses",
    blurb: "The data on response time and why AI chat changed the math.",
    pillar: "leads",
    status: "coming-soon",
  },

  // ── PILLAR: PRICING & PROFITABILITY (10) ─────────────────────
  {
    slug: "pricing-home-service-2026",
    title:
      "How to Price a Home Service Business in 2026: The Owner's Pricing Playbook",
    blurb:
      "The pillar on pricing. Cost-plus vs. value-based, when to raise, how much, and the pricing letter template that keeps customers.",
    pillar: "pricing",
    status: "coming-soon",
  },
  {
    slug: "how-to-raise-prices-home-service",
    title: "How to Raise Prices Without Losing Customers",
    blurb: "The 8-step rollout we've seen work across trades.",
    pillar: "pricing",
    status: "coming-soon",
  },
  {
    slug: "job-costing-home-service",
    title: "Job Costing for Home Service: The Spreadsheet Every Owner Needs",
    blurb: "What a job actually costs you — and why 60% of operators get it wrong.",
    pillar: "pricing",
    status: "coming-soon",
  },
  {
    slug: "calculating-overhead-home-service",
    title: "Calculating Your Real Overhead: The Number Most Owners Never Find",
    blurb: "Where overhead hides, and how to find it before it sinks you.",
    pillar: "pricing",
    status: "coming-soon",
  },
  {
    slug: "hourly-rate-vs-flat-rate-home-service",
    title: "Hourly vs. Flat Rate Pricing: Which Wins in 2026?",
    blurb: "The tradeoffs by trade and revenue stage.",
    pillar: "pricing",
    status: "coming-soon",
  },
  {
    slug: "tiered-pricing-home-service",
    title: "Tiered Pricing for Home Service: Good, Better, Best That Actually Works",
    blurb: "The psychology, the structure, and sample tiers by trade.",
    pillar: "pricing",
    status: "coming-soon",
  },
  {
    slug: "discounts-and-coupons-home-service",
    title: "Discounts and Coupons: When They Work and When They Wreck You",
    blurb: "The honest ROI math on every discount type.",
    pillar: "pricing",
    status: "coming-soon",
  },
  {
    slug: "deposits-for-home-service-jobs",
    title: "Deposits for Home Service Jobs: Why Every Serious Operator Collects Them",
    blurb: "How to collect deposits without losing leads.",
    pillar: "pricing",
    status: "coming-soon",
  },
  {
    slug: "profit-margins-home-service-benchmarks",
    title: "Profit Margin Benchmarks for Home Service by Trade",
    blurb: "Gross and net margin targets for cleaning, HVAC, plumbing, and more.",
    pillar: "pricing",
    status: "coming-soon",
  },
  {
    slug: "service-agreements-recurring-revenue",
    title:
      "Service Agreements and Recurring Revenue: The Asset Hiding in Your Business",
    blurb:
      "Why recurring customers are worth 4x one-offs, and how to convert on the first job.",
    pillar: "pricing",
    status: "coming-soon",
  },

  // ── PILLAR: HIRING & RETENTION (10) ──────────────────────────
  {
    slug: "hiring-retention-home-service-2026",
    title: "Hiring and Retention for Home Service Businesses in 2026",
    blurb:
      "The pillar on team-building. Sourcing, interviewing, onboarding, compensation, and why most operators are losing the talent war.",
    pillar: "hiring",
    status: "coming-soon",
  },
  {
    slug: "1099-vs-w2-home-service",
    title: "1099 vs W-2 for Home Service: The Legal and Practical Reality",
    blurb:
      "Misclassification is an existential risk. What actually qualifies as 1099 in 2026.",
    pillar: "hiring",
    status: "coming-soon",
  },
  {
    slug: "how-to-find-good-cleaners",
    title: "How to Find Good Cleaners (Or Techs, or Crews) That Actually Stay",
    blurb: "The sourcing channels that work and the ones that don't.",
    pillar: "hiring",
    status: "coming-soon",
  },
  {
    slug: "interview-questions-home-service",
    title: "Interview Questions That Filter Out 90% of Bad Hires",
    blurb: "The 11 questions that expose red flags fast.",
    pillar: "hiring",
    status: "coming-soon",
  },
  {
    slug: "onboarding-home-service-employees",
    title: "Onboarding New Hires So They Don't Quit in Week Three",
    blurb: "The 30-day onboarding plan that drops first-month turnover.",
    pillar: "hiring",
    status: "coming-soon",
  },
  {
    slug: "compensation-home-service",
    title: "Compensation Structures for Home Service: Hourly, Piece-Rate, or Split?",
    blurb: "The three models, the math, and when each wins.",
    pillar: "hiring",
    status: "coming-soon",
  },
  {
    slug: "training-home-service-techs",
    title: "Training Home Service Techs Without Losing a Week of Revenue",
    blurb: "The shadow-lead-solo progression that works across trades.",
    pillar: "hiring",
    status: "coming-soon",
  },
  {
    slug: "retention-home-service-employees",
    title: "Why Home Service Employees Quit — And What Fixes It",
    blurb: "The five root causes of turnover and the counter-moves.",
    pillar: "hiring",
    status: "coming-soon",
  },
  {
    slug: "building-culture-home-service",
    title: "Building a Real Culture at a Home Service Company",
    blurb: "What culture means when your team is in vans, not offices.",
    pillar: "hiring",
    status: "coming-soon",
  },
  {
    slug: "firing-home-service-employee",
    title: "Firing a Home Service Employee the Right Way",
    blurb: "The documentation, the conversation, and the fallout.",
    pillar: "hiring",
    status: "coming-soon",
  },

  // ── PILLAR: OPERATIONS & DISPATCH (10) ───────────────────────
  {
    slug: "operations-dispatch-home-service-2026",
    title: "Operations and Dispatch for Home Service Businesses in 2026",
    blurb:
      "The pillar on daily execution. Routing, dispatch rules, SOPs, and why windshield time eats more profit than any other line item.",
    pillar: "ops",
    status: "coming-soon",
  },
  {
    slug: "route-optimization-home-service",
    title: "Route Optimization for Home Service: Cutting Windshield Time by 30%",
    blurb: "The math on drive time and the tools that actually work.",
    pillar: "ops",
    status: "coming-soon",
  },
  {
    slug: "dispatch-rules-home-service",
    title: "Dispatch Rules That Replace Your Dispatcher",
    blurb: "The 12 rules you codify once and never touch again.",
    pillar: "ops",
    status: "coming-soon",
  },
  {
    slug: "scaling-home-service-crews",
    title: "Scaling From One Crew to Two: The Operational Break Point",
    blurb: "What changes, what stays, and the mistakes that tank the second crew.",
    pillar: "ops",
    status: "coming-soon",
  },
  {
    slug: "handling-callouts-home-service",
    title: "Handling Callouts and No-Shows Without a Panic",
    blurb: "The 4-step recovery protocol that keeps customers.",
    pillar: "ops",
    status: "coming-soon",
  },
  {
    slug: "sops-for-home-service",
    title: "Standard Operating Procedures for Home Service (With Templates)",
    blurb: "The 14 SOPs every home service business needs.",
    pillar: "ops",
    status: "coming-soon",
  },
  {
    slug: "recurring-jobs-home-service",
    title: "Recurring Jobs: The Revenue Model That Changes Your Business",
    blurb: "How to convert one-offs into recurring, and pricing it right.",
    pillar: "ops",
    status: "coming-soon",
  },
  {
    slug: "field-supervisor-home-service",
    title: "When to Hire Your First Field Supervisor",
    blurb: "The revenue threshold, the job description, and the comp.",
    pillar: "ops",
    status: "coming-soon",
  },
  {
    slug: "quality-control-home-service",
    title: "Quality Control Without Being on Every Job",
    blurb: "Photos, checklists, spot audits, and the review-feedback loop.",
    pillar: "ops",
    status: "coming-soon",
  },
  {
    slug: "gps-tracking-home-service",
    title: "GPS Tracking for Home Service Crews: Why and How",
    blurb: "The legal, the practical, and the cultural tradeoffs.",
    pillar: "ops",
    status: "coming-soon",
  },

  // ── PILLAR: CUSTOMER EXPERIENCE (10) ─────────────────────────
  {
    slug: "customer-experience-home-service-2026",
    title: "Customer Experience for Home Service Businesses in 2026",
    blurb:
      "The pillar on CX. Booking UX, communication, cancels, and the five moments that decide whether customers come back.",
    pillar: "cx",
    status: "coming-soon",
  },
  {
    slug: "reducing-cancellations-home-service",
    title: "Reducing Cancellations and No-Shows in Home Service",
    blurb: "The seven friction points that cause cancels — and how to remove each.",
    pillar: "cx",
    status: "coming-soon",
  },
  {
    slug: "customer-communication-home-service",
    title: "Customer Communication Cadence That Books Repeats",
    blurb: "When to text, when to email, and when to shut up.",
    pillar: "cx",
    status: "coming-soon",
  },
  {
    slug: "getting-five-star-reviews-home-service",
    title: "Getting Five-Star Reviews on Autopilot",
    blurb: "The timing, the ask, and the follow-up that triples review volume.",
    pillar: "cx",
    status: "coming-soon",
  },
  {
    slug: "handling-bad-reviews-home-service",
    title: "Handling Bad Reviews Without Making It Worse",
    blurb: "The response template and the three things never to do.",
    pillar: "cx",
    status: "coming-soon",
  },
  {
    slug: "online-booking-home-service",
    title: "Online Booking for Home Service: Why It Doubles Your Conversion",
    blurb: "The UX patterns that convert, and the ones that repel.",
    pillar: "cx",
    status: "coming-soon",
  },
  {
    slug: "appointment-reminders-home-service",
    title: "Appointment Reminders That Actually Reduce No-Shows",
    blurb: "The timing cadence backed by customer data.",
    pillar: "cx",
    status: "coming-soon",
  },
  {
    slug: "customer-portal-home-service",
    title: "The Customer Portal: Self-Service That Customers Actually Want",
    blurb: "What belongs in a portal, and what should never be there.",
    pillar: "cx",
    status: "coming-soon",
  },
  {
    slug: "handling-complaints-home-service",
    title: "Handling Complaints Without Losing the Customer",
    blurb: "The 4-sentence script that saves 70% of angry customers.",
    pillar: "cx",
    status: "coming-soon",
  },
  {
    slug: "reactivating-lapsed-customers",
    title: "Reactivating Lapsed Customers: The Cheapest Revenue You'll Ever Earn",
    blurb: "The sequence that wakes up dormant lists.",
    pillar: "cx",
    status: "coming-soon",
  },

  // ── PILLAR: GROWTH & SCALING (10) ────────────────────────────
  {
    slug: "growth-scaling-home-service-2026",
    title: "Growth and Scaling for Home Service Businesses in 2026",
    blurb:
      "The pillar on scaling. From solo to team to multi-crew to multi-location — what changes at each stage and the traps to avoid.",
    pillar: "growth",
    status: "coming-soon",
  },
  {
    slug: "solo-to-team-home-service",
    title: "From Solo Operator to First Hire: The Revenue and Mindset Shift",
    blurb: "Why most solo operators get stuck, and what breaks the ceiling.",
    pillar: "growth",
    status: "coming-soon",
  },
  {
    slug: "multi-location-home-service",
    title: "Going Multi-Location: What Breaks and What Doesn't",
    blurb: "The 4 things that fail at location #2 and how to pre-solve them.",
    pillar: "growth",
    status: "coming-soon",
  },
  {
    slug: "owner-operator-to-ceo",
    title: "Going From Owner-Operator to CEO: The Hardest Transition in Small Business",
    blurb: "The mindset shift and the org-chart changes that make it stick.",
    pillar: "growth",
    status: "coming-soon",
  },
  {
    slug: "commercial-accounts-home-service",
    title: "Adding Commercial Accounts to a Residential Home Service Business",
    blurb: "The pricing, the ops changes, and the sales motion.",
    pillar: "growth",
    status: "coming-soon",
  },
  {
    slug: "territory-expansion-home-service",
    title: "Expanding Territory Without Hurting Service Quality",
    blurb: "The service-radius math and the operational guardrails.",
    pillar: "growth",
    status: "coming-soon",
  },
  {
    slug: "acquiring-home-service-business",
    title: "Acquiring Another Home Service Business: A 2026 Playbook",
    blurb: "Valuation, due diligence, integration, and the 3 deal-killers.",
    pillar: "growth",
    status: "coming-soon",
  },
  {
    slug: "selling-home-service-business",
    title: "Selling Your Home Service Business: What Buyers Actually Pay For",
    blurb: "Multiples by trade, what adds value, what destroys it.",
    pillar: "growth",
    status: "coming-soon",
  },
  {
    slug: "franchise-vs-independent-home-service",
    title: "Franchise vs. Independent: The Honest Comparison in 2026",
    blurb: "What franchises give you, what they take, and who each path fits.",
    pillar: "growth",
    status: "coming-soon",
  },
  {
    slug: "business-plan-home-service",
    title: "The Home Service Business Plan That Actually Funds Itself",
    blurb: "The 6-section plan you actually use — not the 40-page document.",
    pillar: "growth",
    status: "coming-soon",
  },

  // ── PILLAR: MONEY & BACK-OFFICE (10) ─────────────────────────
  {
    slug: "money-back-office-home-service-2026",
    title: "Money and Back-Office for Home Service Businesses in 2026",
    blurb:
      "The pillar on financial operations. Cash flow, invoicing, sales tax, bookkeeping, and the accounting setup that scales.",
    pillar: "money",
    status: "coming-soon",
  },
  {
    slug: "cash-flow-seasonal-home-service",
    title: "Cash Flow for Seasonal Home Service Businesses",
    blurb: "The reserve math and the 4 moves that smooth the off-season.",
    pillar: "money",
    status: "coming-soon",
  },
  {
    slug: "invoicing-home-service",
    title: "Invoicing Discipline: Why Most Home Service Owners Are Leaking Revenue",
    blurb: "The 6-step invoicing process that closes A/R.",
    pillar: "money",
    status: "coming-soon",
  },
  {
    slug: "quickbooks-for-home-service",
    title: "QuickBooks for Home Service Businesses: The Chart of Accounts That Works",
    blurb: "A real-world chart of accounts you can copy.",
    pillar: "money",
    status: "coming-soon",
  },
  {
    slug: "sales-tax-home-service",
    title: "Sales Tax for Home Service Businesses (By State)",
    blurb: "Where labor is taxed, where it isn't, and the audit-proof setup.",
    pillar: "money",
    status: "coming-soon",
  },
  {
    slug: "accepting-credit-cards-home-service",
    title: "Accepting Credit Cards Without Getting Eaten by Fees",
    blurb: "Stripe, Square, Adyen — the real cost comparison.",
    pillar: "money",
    status: "coming-soon",
  },
  {
    slug: "zelle-venmo-home-service",
    title: "Zelle, Venmo, and Cash: Reconciling Informal Payments Without Losing Your Mind",
    blurb: "The automation that matches informal payments to invoices.",
    pillar: "money",
    status: "coming-soon",
  },
  {
    slug: "tips-and-gratuity-home-service",
    title: "Tips and Gratuity for Home Service: Getting More Without Asking",
    blurb: "The prompts and placements that triple tip volume.",
    pillar: "money",
    status: "coming-soon",
  },
  {
    slug: "taxes-home-service-owner",
    title: "Taxes for the Home Service Owner: What You Should Be Deducting",
    blurb: "The deductions most owners miss every year.",
    pillar: "money",
    status: "coming-soon",
  },
  {
    slug: "payroll-home-service",
    title: "Payroll for Home Service: W-2, 1099, and the Hybrid Model",
    blurb: "Providers compared and the setup that scales to 20 employees.",
    pillar: "money",
    status: "coming-soon",
  },

  // ── PLATFORM SERIES: SELENA (8) ──────────────────────────────
  {
    slug: "what-is-selena-ai",
    title: "What Yinez Is (And What She Isn't): The AI Lead Agent Inside Full Loop",
    blurb: "The honest description of what Yinez does, how she was trained, and where she fails.",
    pillar: "platform-selena",
    status: "coming-soon",
  },
  {
    slug: "selena-voice-setup",
    title: "Setting Up Yinez's Voice, Personality, and Red Lines",
    blurb: "How to make Yinez sound like your company, not a chatbot.",
    pillar: "platform-selena",
    status: "coming-soon",
  },
  {
    slug: "selena-books-jobs-at-2am",
    title: "How Yinez Books Jobs at 2am Without a Human in the Loop",
    blurb: "The full booking flow, screenshot by screenshot.",
    pillar: "platform-selena",
    status: "coming-soon",
  },
  {
    slug: "selena-objection-handling",
    title: "Yinez's Objection-Handling Playbook",
    blurb: "The 11 most common objections and how Yinez handles each.",
    pillar: "platform-selena",
    status: "coming-soon",
  },
  {
    slug: "selena-sms-vs-webchat",
    title: "Yinez on SMS vs. Web Chat: What's Different",
    blurb: "Why SMS trails webchat and how to close the gap.",
    pillar: "platform-selena",
    status: "coming-soon",
  },
  {
    slug: "selena-quote-negotiation",
    title: "Quote Negotiation: When Yinez Holds the Line and When She Flexes",
    blurb: "The rules engine behind negotiable vs. non-negotiable pricing.",
    pillar: "platform-selena",
    status: "coming-soon",
  },
  {
    slug: "selena-payment-collection",
    title: "How Yinez Collects Deposits and Final Payments",
    blurb: "The payment flow from quote to closed invoice.",
    pillar: "platform-selena",
    status: "coming-soon",
  },
  {
    slug: "selena-reschedule-flow",
    title: "Yinez's Reschedule Flow: When Customers Change Their Mind",
    blurb: "Why reschedules are the most underrated retention feature.",
    pillar: "platform-selena",
    status: "coming-soon",
  },

  // ── PLATFORM SERIES: LEAD CAPTURE (4) ────────────────────────
  {
    slug: "landing-page-patterns-that-convert",
    title: "Landing Page Patterns That Convert Home Service Traffic",
    blurb: "The four page patterns Full Loop ships by default, and why.",
    pillar: "platform-leads",
    status: "coming-soon",
  },
  {
    slug: "forms-that-convert-home-service",
    title: "Forms That Convert: Fewer Fields, Higher Intent",
    blurb: "The 3-field rule and when to break it.",
    pillar: "platform-leads",
    status: "coming-soon",
  },
  {
    slug: "gmb-to-booking-flow",
    title: "GMB to Booking: The Zero-Friction Funnel",
    blurb: "Wiring Google Business Profile directly into the booking engine.",
    pillar: "platform-leads",
    status: "coming-soon",
  },
  {
    slug: "post-click-speed-home-service",
    title: "Post-Click Speed: Why Your Page Has to Load in Under 1.5 Seconds",
    blurb: "The Core Web Vitals math and the fixes that move the numbers.",
    pillar: "platform-leads",
    status: "coming-soon",
  },

  // ── PLATFORM SERIES: DISPATCH & SCHEDULE (4) ─────────────────
  {
    slug: "route-optimization-inside-full-loop",
    title: "Route Optimization Inside Full Loop: How It Works",
    blurb: "The routing engine, constraints, and override controls.",
    pillar: "platform-dispatch",
    status: "coming-soon",
  },
  {
    slug: "recurring-jobs-inside-full-loop",
    title: "Recurring Jobs Inside Full Loop: Weekly, Bi-Weekly, Monthly, Custom",
    blurb: "Setting up recurring schedules and handling the edge cases.",
    pillar: "platform-dispatch",
    status: "coming-soon",
  },
  {
    slug: "last-minute-coverage-home-service",
    title: "Last-Minute Coverage: The Rule Engine That Keeps Jobs Staffed",
    blurb: "How Full Loop reroutes when a tech calls out.",
    pillar: "platform-dispatch",
    status: "coming-soon",
  },
  {
    slug: "dispatch-board-full-loop",
    title: "The Full Loop Dispatch Board: A Guided Tour",
    blurb: "Every button, every filter, every shortcut.",
    pillar: "platform-dispatch",
    status: "coming-soon",
  },

  // ── PLATFORM SERIES: BILLING (4) ─────────────────────────────
  {
    slug: "invoicing-inside-full-loop",
    title: "Invoicing Inside Full Loop: From Job Complete to Paid in Minutes",
    blurb: "The end-to-end invoice lifecycle with screenshots.",
    pillar: "platform-billing",
    status: "coming-soon",
  },
  {
    slug: "stripe-inside-full-loop",
    title: "Stripe Inside Full Loop: Card-on-File, Saved Cards, and Split Payouts",
    blurb: "How Stripe is wired into the platform.",
    pillar: "platform-billing",
    status: "coming-soon",
  },
  {
    slug: "tips-inside-full-loop",
    title: "Tips Inside Full Loop: The Feature That Pays Techs More",
    blurb: "How tips flow from customer to tech, automatically.",
    pillar: "platform-billing",
    status: "coming-soon",
  },
  {
    slug: "refunds-disputes-full-loop",
    title: "Refunds and Disputes Inside Full Loop",
    blurb: "The workflow that keeps chargebacks low.",
    pillar: "platform-billing",
    status: "coming-soon",
  },

  // ── PLATFORM SERIES: CRM (4) ─────────────────────────────────
  {
    slug: "pipeline-full-loop",
    title: "The Pipeline Inside Full Loop: From Lead to Customer",
    blurb: "The stages, the automations, and the reports.",
    pillar: "platform-crm",
    status: "coming-soon",
  },
  {
    slug: "tags-and-segments-full-loop",
    title: "Tags and Segments Inside Full Loop",
    blurb: "How to slice your customer list for targeted campaigns.",
    pillar: "platform-crm",
    status: "coming-soon",
  },
  {
    slug: "customer-history-full-loop",
    title: "Customer History: The Tenant-Wide Timeline",
    blurb: "Every touchpoint, every job, every conversation — in one view.",
    pillar: "platform-crm",
    status: "coming-soon",
  },
  {
    slug: "pipeline-automations-full-loop",
    title: "Pipeline Automations: Triggers That Move Leads Forward",
    blurb: "The pre-built automations and when to write your own.",
    pillar: "platform-crm",
    status: "coming-soon",
  },

  // ── PLATFORM SERIES: AUTOMATION (3) ──────────────────────────
  {
    slug: "review-automation-full-loop",
    title: "Review Automation Inside Full Loop",
    blurb: "The sequences that produce 5-star reviews without pestering.",
    pillar: "platform-automation",
    status: "coming-soon",
  },
  {
    slug: "reminder-automations-full-loop",
    title: "Reminder Automations: The Small Texts That Prevent Big Losses",
    blurb: "Appointment, payment, and follow-up reminders.",
    pillar: "platform-automation",
    status: "coming-soon",
  },
  {
    slug: "reactivation-campaigns-full-loop",
    title: "Reactivation Campaigns: Waking Up Dormant Customers",
    blurb: "The 4-touch reactivation sequence, dissected.",
    pillar: "platform-automation",
    status: "coming-soon",
  },

  // ── PLATFORM SERIES: MIGRATION (3) ───────────────────────────
  {
    slug: "migrating-from-jobber-to-full-loop",
    title: "Migrating From Jobber to Full Loop CRM",
    blurb: "Data export, field mapping, cutover, and what changes for your team.",
    pillar: "platform-migration",
    status: "coming-soon",
  },
  {
    slug: "migrating-from-housecall-pro-to-full-loop",
    title: "Migrating From Housecall Pro to Full Loop CRM",
    blurb: "The export script, the mapping, and the first 72 hours after cutover.",
    pillar: "platform-migration",
    status: "coming-soon",
  },
  {
    slug: "migrating-from-spreadsheets-to-full-loop",
    title: "Migrating From Spreadsheets to Full Loop CRM",
    blurb: "The lift from chaos to structure, in a single week.",
    pillar: "platform-migration",
    status: "coming-soon",
  },
];

const pillarMeta: Record<string, { label: string; accent: string }> = {
  flagship: { label: "Flagship Essays", accent: "bg-slate-900 text-white" },
  leads: { label: "Lead Generation", accent: "bg-violet-100 text-violet-900" },
  pricing: { label: "Pricing & Profitability", accent: "bg-amber-100 text-amber-900" },
  hiring: { label: "Hiring & Retention", accent: "bg-emerald-100 text-emerald-900" },
  ops: { label: "Operations & Dispatch", accent: "bg-rose-100 text-rose-900" },
  cx: { label: "Customer Experience", accent: "bg-blue-100 text-blue-900" },
  growth: { label: "Growth & Scaling", accent: "bg-teal-100 text-teal-900" },
  money: { label: "Money & Back-Office", accent: "bg-orange-100 text-orange-900" },
  "platform-selena": { label: "Platform: Yinez", accent: "bg-indigo-100 text-indigo-900" },
  "platform-leads": { label: "Platform: Lead Capture", accent: "bg-violet-100 text-violet-900" },
  "platform-dispatch": { label: "Platform: Dispatch", accent: "bg-rose-100 text-rose-900" },
  "platform-billing": { label: "Platform: Billing", accent: "bg-orange-100 text-orange-900" },
  "platform-crm": { label: "Platform: CRM", accent: "bg-sky-100 text-sky-900" },
  "platform-automation": { label: "Platform: Automation", accent: "bg-yellow-100 text-yellow-900" },
  "platform-migration": { label: "Platform: Migration", accent: "bg-stone-200 text-stone-900" },
};

function groupByPillar(posts: Post[]) {
  const grouped = new Map<string, Post[]>();
  for (const p of posts) {
    const arr = grouped.get(p.pillar) ?? [];
    arr.push(p);
    grouped.set(p.pillar, arr);
  }
  return grouped;
}

export default function HomeServiceBusinessBlogPage() {
  const grouped = groupByPillar(POSTS);
  const pillarOrder = [
    "flagship",
    "leads",
    "pricing",
    "hiring",
    "ops",
    "cx",
    "growth",
    "money",
    "platform-selena",
    "platform-leads",
    "platform-dispatch",
    "platform-billing",
    "platform-crm",
    "platform-automation",
    "platform-migration",
  ];

  const itemListForSchema = POSTS.map((p) => ({
    name: p.title,
    url: `${HUB}/${p.slug}`,
    description: p.blurb,
  }));

  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Home Service Business Blog | Full Loop CRM",
          "102 long-form guides for home service operators on running, automating, and scaling a crew-based business in 2026.",
          HUB,
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={itemListSchema("Home Service Business Blog", itemListForSchema)} />

      <section className="bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-600">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>{" "}
            <span className="mx-2">/</span>
            <span className="text-slate-900">Home Service Business Blog</span>
          </nav>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            The Home Service Business Blog
          </h1>
          <p className="mt-4 text-lg text-slate-700 md:text-xl">
            Long-form guides for home service operators. How to run lean, automate
            the back office, and scale a crew-based business without the overhead
            the old stack required. {POSTS.filter((p) => p.status === "live").length}{" "}
            published, {POSTS.filter((p) => p.status === "coming-soon").length} on
            the editorial calendar.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/full-loop-crm-service-features"
              className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            >
              See the platform
            </Link>
            <Link
              href="/waitlist"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 hover:bg-slate-100"
            >
              Pricing
            </Link>
            <Link
              href="/full-loop-crm-101-educational-tips"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 hover:bg-slate-100"
            >
              101 CRM Tips
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        {pillarOrder.map((pillar) => {
          const posts = grouped.get(pillar) ?? [];
          if (posts.length === 0) return null;
          const meta = pillarMeta[pillar];
          return (
            <section key={pillar} className="mb-16 scroll-mt-24" id={pillar}>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">
                  {meta.label}
                </h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${meta.accent}`}
                >
                  {posts.length} post{posts.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="grid gap-4 md:grid-cols-2">
                {posts.map((post) => (
                  <li
                    key={post.slug}
                    className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-400 hover:shadow-sm"
                  >
                    {post.status === "live" ? (
                      <Link
                        href={`/home-service-business-blog/${post.slug}`}
                        className="group block"
                      >
                        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-slate-700">
                          {post.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {post.blurb}
                        </p>
                        <span className="mt-3 inline-block text-sm font-medium text-emerald-700">
                          Read the guide →
                        </span>
                      </Link>
                    ) : (
                      <div className="opacity-70">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {post.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {post.blurb}
                        </p>
                        <span className="mt-3 inline-block text-sm font-medium text-slate-500">
                          Coming soon
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <section className="mt-20 rounded-2xl border border-slate-200 bg-slate-50 p-8 md:p-12">
          <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">
            Want the platform behind the playbook?
          </h2>
          <p className="mt-3 text-base text-slate-700 md:text-lg">
            Every post in this series points back to the same thing:{" "}
            <Link
              href="/full-loop-crm-service-features"
              className="underline hover:text-slate-900"
            >
              Full Loop CRM
            </Link>
            {" "}— the first full-cycle CRM built specifically for home service
            owners who want to run leaner, automate the repetitive work, and
            reclaim the margin their overhead used to eat.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/waitlist"
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Apply for your territory
            </Link>
            <Link
              href="/waitlist"
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              See pricing
            </Link>
            <Link
              href="/why-you-should-choose-full-loop-crm-for-your-business"
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Why Full Loop
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
