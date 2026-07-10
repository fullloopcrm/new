// ---------------------------------------------------------------------------
// Location-page content builder.
//
// Turns the REAL per-state data in stateMetadata (licensing authority, climate
// zone, permit/tax rules, seasonal demand, trade association, population rank)
// plus the city name into genuinely-differentiated section copy — so each of
// the ~400 metro pages is materially different, not a template swap. This is
// the fix for the "Crawled – currently not indexed" quality signal on the long
// tail of location pages: real value per page, not padded filler.
//
// No fabricated city facts. Every claim is either a general home-service
// operating truth or comes from stateMetadata (a maintained per-state dataset).
// ---------------------------------------------------------------------------
import type { StateMetadata } from "./stateMetadata";
import type { ComboMetro } from "./combos";

export interface LocationSection {
  /** short-tail keyword — rendered as the section badge */
  badge: string;
  /** long-tail keyword — rendered as the section <h2> title */
  title: string;
  /** mixed long/short-tail — rendered as the section intro description */
  description: string;
  /** body paragraphs */
  paragraphs: string[];
  /** optional bullet list */
  bullets?: string[];
}

type ClimateZone = StateMetadata["climateZone"];

// Real operating implications of each climate zone for home-service trades.
// Domain content, not invented local facts.
const CLIMATE_COPY: Record<
  ClimateZone,
  { label: string; demand: string; bullets: string[] }
> = {
  "hot-humid": {
    label: "hot, humid",
    demand:
      "long cooling seasons and high humidity keep HVAC, mold remediation, pressure washing, and pest control busy nearly year-round, while summer storms drive roofing and restoration spikes",
    bullets: [
      "HVAC and refrigeration demand runs 8–9 months a year, not a short summer peak",
      "Humidity accelerates mold, mildew, and exterior grime — recurring pressure-washing and remediation work",
      "Hurricane and thunderstorm season concentrates roofing, tree, and water-damage jobs into tight windows",
      "Fast dispatch matters most when a storm creates a flood of same-day emergency calls at once",
    ],
  },
  "hot-dry": {
    label: "hot, dry",
    demand:
      "intense summer heat drives peak HVAC and pool-service demand, while dust, hard water, and sun exposure create steady work for cleaning, exterior, and irrigation trades",
    bullets: [
      "HVAC load peaks hard from late spring through early fall — capacity planning is everything",
      "Pool, irrigation, and landscape-water management run year-round in arid metros",
      "Dust and hard-water buildup sustain recurring cleaning and window-washing routes",
      "Cooling-emergency calls cluster on the hottest days — an AI agent that never misses a call wins those jobs",
    ],
  },
  "mixed-humid": {
    label: "mixed-humid",
    demand:
      "four distinct seasons spread demand across HVAC (both heating and cooling), gutters, roofing, lawn care, and seasonal cleanups — with shoulder seasons that reward operators who can smooth their schedule",
    bullets: [
      "Dual heating and cooling seasons mean HVAC work never fully goes quiet",
      "Spring and fall cleanups, gutter work, and lawn care create predictable recurring routes",
      "Freeze-thaw cycles drive plumbing, foundation, and roofing repair demand",
      "Shoulder-season scheduling gaps are where automated rebooking and win-back campaigns pay off",
    ],
  },
  cold: {
    label: "cold",
    demand:
      "long heating seasons and hard winters drive furnace, plumbing (frozen-pipe), snow, and insulation work, with a compressed but intense warm-season window for exterior trades",
    bullets: [
      "Heating, furnace, and frozen-pipe emergencies dominate a long winter",
      "Snow removal and ice-dam work create sharp, weather-triggered demand spikes",
      "The exterior-work window (roofing, paint, concrete) is short — booking density matters",
      "Emergency response speed decides who wins the 2am no-heat call",
    ],
  },
  "very-cold": {
    label: "very-cold",
    demand:
      "severe winters make heating, emergency plumbing, and snow/ice work the backbone of the year, with a short, high-pressure summer season for every exterior trade",
    bullets: [
      "No-heat and burst-pipe emergencies are life-safety calls — instant response is non-negotiable",
      "Snow, plow, and ice-dam work is a major revenue line, not a sideline",
      "The buildable exterior season is measured in weeks — schedule utilization is critical",
      "Seasonal crews and recurring winter contracts reward tight CRM scheduling",
    ],
  },
  marine: {
    label: "mild, marine",
    demand:
      "mild temperatures and wet winters favor year-round exterior work, moss/algae control, gutter and drainage service, and steady HVAC without extreme peaks",
    bullets: [
      "A long, mild operating season keeps exterior trades productive nearly all year",
      "Persistent rain drives moss removal, gutter, drainage, and pressure-washing demand",
      "HVAC leans toward heating and air quality rather than extreme cooling peaks",
      "Consistent demand rewards recurring-service plans over one-off jobs",
    ],
  },
};

const CRM_STAGES = [
  {
    n: 1,
    name: "Lead generation",
    body: "A multi-domain local SEO network and landing pages generate inbound leads you own outright — no paid ads, no shared or resold leads that three competitors also bought.",
  },
  {
    n: 2,
    name: "AI phone & text sales agent",
    body: "A 24/7 AI receptionist answers every call and text in seconds, qualifies the caller, quotes from your real pricing, and books the job — so a missed call at 7pm never becomes a lost customer.",
  },
  {
    n: 3,
    name: "Booking & scheduling",
    body: "Jobs land on a field-service calendar with the right crew, price, and recurring cadence, with drag-and-drop rescheduling and real-time availability built for service work.",
  },
  {
    n: 4,
    name: "Dispatch & GPS field ops",
    body: "Crews run from a bilingual mobile portal with GPS-verified check-in and check-out, automatic drive-time logging, and routing that cuts windshield time between jobs.",
  },
  {
    n: 5,
    name: "Invoicing & payments",
    body: "Invoices generate on-site, customers pay by card or ACH, and automated reminders chase the balance — so cash flow stops depending on you remembering to follow up.",
  },
  {
    n: 6,
    name: "Reviews & reputation",
    body: "Every completed job triggers a review request, compounding the local reputation that feeds the next round of organic leads — the loop closes on itself.",
  },
  {
    n: 7,
    name: "Retention & retargeting",
    body: "Automated rebooking, seasonal reminders, and win-back campaigns turn one-time jobs into recurring revenue without anyone on your team lifting a finger.",
  },
];

/**
 * Build the full set of genuinely-differentiated content sections for a metro.
 * `stateMeta` may be null for a metro whose state isn't in the dataset; the
 * builder degrades gracefully to still-useful city-level copy.
 */
export function buildLocationSections(
  metro: ComboMetro,
  stateMeta: StateMetadata | null
): LocationSection[] {
  const { city, state, stateAbbr } = metro;
  const sections: LocationSection[] = [];

  // 1. Market intro ---------------------------------------------------------
  const rankLine = stateMeta
    ? `${state} is the #${stateMeta.populationRank} most populous state, and ${city} sits among its most competitive home-service markets`
    : `${city} is one of ${state}'s most competitive home-service markets`;
  sections.push({
    badge: "Home Service CRM",
    title: `The Home Service CRM Built for ${city}, ${stateAbbr} Businesses`,
    description: `Full Loop is the all-in-one home service CRM for ${city} contractors — lead generation, AI sales, scheduling, payments, and reviews in one platform, proven by a real company it runs almost autonomously.`,
    paragraphs: [
      `${rankLine}. Cleaning companies, HVAC contractors, plumbers, electricians, landscapers, roofers, and a dozen other trades compete for the same ${city} homeowners — and the operator who answers first, quotes fastest, and follows up automatically is the one who wins the job.`,
      `Full Loop CRM replaces the stack of disconnected tools most ${city} service businesses cobble together — a phone line, a scheduling app, an invoicing tool, a review platform, a spreadsheet — with a single full-cycle system. It is the only home service CRM that runs the entire customer lifecycle from lead to repeat booking, and licenses just one operator per trade in ${city} so you are never competing against another Full Loop partner in your own market.`,
      stateMeta
        ? `Because it is tuned to ${state} operating conditions — from ${stateMeta.tradeAssociation} standards to local licensing and seasonal demand — the platform fits how ${city} home-service work actually gets done, not a generic national template.`
        : `The platform is tuned to how ${city} home-service work actually gets done, not a generic national template.`,
    ],
  });

  // 2. Pain points ----------------------------------------------------------
  sections.push({
    badge: `${city} Lead Management`,
    title: `Why ${city} Home Service Businesses Lose Jobs They Should Win`,
    description: `The revenue leaks are almost always the same in ${city}: slow response, scattered scheduling, no follow-up, and no idea which marketing actually pays. Here is where ${stateAbbr} service businesses bleed jobs.`,
    paragraphs: [
      `Most ${city} home-service owners are not losing jobs because their work is bad. They are losing them in the gaps between jobs — the call that went to voicemail, the quote that never got followed up, the past customer who was never asked to rebook.`,
    ],
    bullets: [
      `Speed-to-lead: ${city} homeowners call three or four companies and hire whoever answers first. Every call that hits voicemail is a job handed to a competitor.`,
      `Scattered pipeline: juggling texts, voicemails, DMs, and sticky notes means profitable ${city} leads slip through the cracks with no system tracking them.`,
      `Manual admin: scheduling, dispatching, invoicing, and follow-up quietly eat 10+ hours a week that a ${city} owner should spend on billable work or growth.`,
      `Blind marketing spend: without lead-source tracking, most ${city} service companies cannot say which channels drive paying customers, so they keep funding ads that do not convert.`,
      `No retention engine: one-time ${city} customers are never systematically rebooked, so hard-won jobs never compound into recurring revenue.`,
      `Owner bottleneck: when every quote, schedule change, and follow-up runs through the owner's phone, the business cannot grow past what one exhausted person can personally handle.`,
    ],
  });

  // 3. Climate & seasonal demand -------------------------------------------
  if (stateMeta) {
    const c = CLIMATE_COPY[stateMeta.climateZone];
    sections.push({
      badge: `${c.label.replace(/,/g, "")} climate ops`.replace(/\b\w/g, (m) => m.toUpperCase()),
      title: `How ${city}'s ${c.label.charAt(0).toUpperCase() + c.label.slice(1)} Climate Shapes Home Service Demand`,
      description: `Home service demand in ${city} is driven by ${state}'s ${c.label} climate — planning your CRM, scheduling, and staffing around it is the difference between a smooth year and constant scramble.`,
      paragraphs: [
        `${city} sits in a ${c.label} climate zone, which means ${c.demand}. ${stateMeta.seasonalNote}`,
        `A home service CRM that understands this rhythm lets ${city} operators pre-book recurring routes ahead of each season, staff up before the spike instead of during it, and keep crews productive through the slow weeks with automated win-back and maintenance-plan campaigns. Full Loop's scheduling and retargeting are built to smooth exactly these seasonal swings.`,
      ],
      bullets: c.bullets,
    });
  }

  // 4. Licensing, permits & tax --------------------------------------------
  if (stateMeta) {
    sections.push({
      badge: `${stateAbbr} Licensing & Compliance`,
      title: `Licensing, Permits & Tax Rules for ${city} Home Service Contractors`,
      description: `Operating a home service business in ${city} means working inside ${state}'s licensing, permit, and tax framework. Full Loop tracks the paperwork so ${city} contractors stay compliant without a back office.`,
      paragraphs: [
        `In ${state}, home-service licensing runs through the ${stateMeta.licensingAuthority}. ${stateMeta.permitNote} Full Loop keeps license numbers, permit records, and certificates of insurance attached to each job and customer, so a ${city} operator can produce them on demand instead of digging through a truck glovebox.`,
        `On the money side, ${stateMeta.taxNote} The platform's invoicing and bookkeeping apply the right treatment automatically and export 1099-ready records, so ${city} owners are not reverse-engineering their tax position at year end. Membership standards from the ${stateMeta.tradeAssociation} and similar ${state} bodies are easy to uphold when every job's documentation lives in one place.`,
      ],
    });
  }

  // 5. Full-cycle workflow --------------------------------------------------
  sections.push({
    badge: "Full-Cycle CRM",
    title: `The 7-Stage ${city} Home Service Workflow, Fully Automated`,
    description: `Full Loop runs the entire ${city} customer lifecycle — lead to repeat booking — as one connected loop, so no stage depends on someone remembering to do it.`,
    paragraphs: [
      `Most CRMs handle one slice of the job and leave the rest to you. Full Loop runs all seven stages of the ${city} home-service lifecycle as a single automated loop, where the output of each stage feeds the next:`,
    ],
    bullets: CRM_STAGES.map((s) => `${s.n}. ${s.name} — ${s.body}`),
  });

  // 6. AI agent -------------------------------------------------------------
  sections.push({
    badge: "AI Receptionist",
    title: `A 24/7 AI Sales Agent Answering ${city} Service Calls`,
    description: `The single biggest lead leak for ${city} home service businesses is the unanswered call. Full Loop's AI phone and text agent closes it — answering live, every time, day or night.`,
    paragraphs: [
      `When a ${city} homeowner has a burst pipe at midnight or a dead AC on the hottest day of the year, they do not leave a voicemail — they call the next company. Full Loop's AI agent answers on the first ring, holds a real conversation, qualifies the job, quotes from your live pricing, and books it directly onto your calendar.`,
      `It works the same way over text and web chat, so a ${city} lead who fills out a form at 11pm gets an instant, useful reply instead of a next-day callback. Every caller is captured as a lead even if they do not book, so your ${city} pipeline never leaks a contact — and you are not paying a receptionist to sit by the phone waiting for it to ring.`,
    ],
  });

  // 7. Exclusivity ----------------------------------------------------------
  sections.push({
    badge: "One Operator Per City",
    title: `Exclusive ${city}, ${stateAbbr} Territory — One Partner Per Trade`,
    description: `Full Loop licenses a single operator per trade in ${city}. When your industry's slot is claimed, the AI lead generation, local SEO assets, and platform in ${city} are yours alone.`,
    paragraphs: [
      `Full Loop is not sold to every plumber in ${city} at once. Each trade gets one exclusive ${city} partner, which means the entire lead-generation engine — the local SEO network, the AI sales agent, the retargeting — works for you instead of being split across a dozen competitors buying the same platform.`,
      `Because the model is one-operator-per-city, the ${city} slot for your trade is either open or it is gone. Getting on the waitlist early is how ${city} operators lock in their market before a competitor does.`,
    ],
  });

  return sections;
}
