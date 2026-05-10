// @ts-nocheck
/* ─────────────────────────────────────────────
   Portfolio Data — 16 Brands, 158+ Sites
   Single source of truth for hub + brand pages
   ───────────────────────────────────────────── */

export interface PortfolioBrand {
  /** Display order (1-based) */
  order: number;
  name: string;
  slug: string;
  tagline: string;
  primaryDomain: string;
  category: string;
  siteCount: number;
  /** Hero-level summary (150-200 words) */
  summary: string;
  /** Key stats for the hub cards */
  stats: {
    rankings?: string;
    traffic?: string;
    leads?: string;
    revenue?: string;
    growth?: string;
    customers?: string;
    neighborhoods?: string;
    pages?: string;
  };
  services: string[];
  techStack: "HTML" | "Next.js" | "HTML + Next.js";
  phone?: string;
  email?: string;
  address?: string;
  founded?: string;
  pricing?: string;
  monetization: string;
  starRating?: string;
  /** All domains in the brand network */
  sites: { domain: string; description: string }[];
  /** What makes this brand different */
  differentiators: string[];
  /** Google search link to verify results */
  googleSearch?: string;
  /** Whether this brand has a local build on this machine */
  hasLocalBuild: boolean;
}

export const brands: PortfolioBrand[] = [
  /* ── 1. The NYC Marketing Company ─────────────────── */
  {
    order: 1,
    name: "The NYC Marketing Company",
    slug: "the-nyc-marketing-company",
    tagline: "The Strategy Behind Everything You See Here",
    primaryDomain: "thenycmarketingcompany.com",
    category: "Digital Marketing / SEO / AI / Web Design",
    siteCount: 12,
    summary:
      "This is us. The NYC Marketing Company is the agency behind every brand on this page — and this page itself is proof of what we do. 12 sites in the network, 54,696+ programmatic SEO pages on thenycseo.com alone, AI agent development, web design, and a philosophy built on one idea: organic traffic compounds. No ads. No contracts. Just systems that get better every month. We built all of this with AI — Claude, specifically — and we're not shy about it. Because the point was never to hide the tools. The point was to build things that work.",
    stats: {
      rankings: "10,000+",
      traffic: "50,000+/mo",
      pages: "54,696+",
      customers: "10,000+",
    },
    services: ["SEO", "Web Design", "AI Automation", "Programmatic SEO", "Branding", "Content"],
    techStack: "Next.js",
    phone: "212-202-9220",
    email: "hello@thenycmarketingcompany.com",
    address: "150 W 47th St, New York, NY 10036",
    founded: "2000",
    pricing: "$100/hr, $250/yr managed micro sites, $950/mo SEO",
    monetization: "Retainer + micro site subscriptions",
    starRating: "A+ BBB",
    sites: [
      { domain: "thenycmarketingcompany.com", description: "NYC Marketing Company hub site" },
      { domain: "digitalmarketinginnyc.com", description: "AI-powered digital marketing NYC" },
      { domain: "thenycseo.com", description: "Flagship SEO platform — 54,696+ programmatic pages" },
      { domain: "aiagentdevteam.com", description: "National AI agent development" },
      { domain: "aiagentnyc.com", description: "NYC-specific AI agent dev" },
      { domain: "consortiumnyc.com", description: "Full-service NYC web design + marketing" },
      { domain: "flatironwebdesigner.com", description: "Flatiron District web designer" },
      { domain: "chelseawebdesigner.com", description: "Chelsea NYC web designer" },
      { domain: "dumbowebdesigner.com", description: "DUMBO Brooklyn web designer" },
      { domain: "licwebdesigner.com", description: "LIC Queens web designer" },
      { domain: "barmarketingconsultantnyc.com", description: "NYC bar/nightlife marketing" },
      { domain: "nyccleaningbusinessforsale.com", description: "Cleaning business acquisition lead-gen" },
    ],
    differentiators: [
      "54,696+ programmatic SEO pages on a single domain",
      "Optimized for Google, ChatGPT, Perplexity, Gemini, and Claude simultaneously",
      "Every brand on this page was built by this company",
      "AI-first workflow — built with Claude, not hiding it",
      "25+ years of experience, A+ BBB rating",
    ],
    googleSearch: "https://www.google.com/search?q=nyc+marketing+company",
    hasLocalBuild: true,
  },

  /* ── 2. The NYC Maid ──────────────────────────────── */
  {
    order: 2,
    name: "The NYC Maid",
    slug: "the-nyc-maid",
    tagline: "86 Websites. 225+ Neighborhoods. 12,000+ Customers.",
    primaryDomain: "thenycmaid.com",
    category: "Residential Cleaning — NYC/NJ/LI",
    siteCount: 86,
    summary:
      "The NYC Maid is the flagship. 86 live websites, each one targeting a specific NYC neighborhood, service type, or season. From thenycmaid.com to harlemmaid.com to nycspringcleaningmaid.com — every domain is a standalone SEO asset with its own content, its own rankings, its own audience. The network covers 225+ neighborhoods across Manhattan, Brooklyn, Queens, the Bronx, Staten Island, Long Island, and New Jersey. 12,000+ customers. 5.0 stars on Google. Founded 2018. No contracts, pay after service, $49/hr. This is the model that proved everything else on this page.",
    stats: {
      rankings: "5,000+",
      traffic: "15,000+/mo",
      leads: "200+/mo",
      revenue: "$500K+",
      customers: "12,000+",
      neighborhoods: "225+",
    },
    services: ["SEO", "Web Design", "Local SEO", "GBP", "Programmatic SEO", "Multilingual"],
    techStack: "HTML",
    phone: "212-202-8400",
    email: "hi@thenycmaid.com",
    address: "150 W 47th St, New York, NY 10036",
    founded: "2018",
    pricing: "$49/hr (client supplies), $65-$75/hr (they supply), $100/hr same-day",
    monetization: "Direct service bookings via phone/text",
    starRating: "5.0 Google",
    sites: [
      { domain: "thenycmaid.com", description: "Flagship — main booking site, 225+ neighborhoods" },
      { domain: "thenycmaidservice.com", description: "SEO variation domain" },
      { domain: "nycmaid.nyc", description: "All 5 boroughs, 12,000+ customers, multilingual" },
      { domain: "maidny.com", description: "4.9+ stars, 3,200+ customers, since 2008" },
      { domain: "manhattanmaidservice.com", description: "Manhattan focus, linen turnover" },
      { domain: "thenyccleaningservice.com", description: "Midtown, 2,500+ customers" },
      { domain: "thenyccleaningcrew.com", description: "Pet + cleaning combo, dog walking" },
      { domain: "nychousecleanernearne.com", description: "'Near me' search intent, 12,000+ customers" },
      { domain: "cleanservicenyc.com", description: "Pet sitting + cleaning, $49-$150/hr" },
      { domain: "citycleannyc.com", description: "Tiered pricing, recurring discounts up to 20%" },
      { domain: "samedaycleannyc.com", description: "Same-day/emergency focus" },
      { domain: "nycemergencycleaning.com", description: "24/7 emergency restoration, IICRC certified" },
      { domain: "nycspringcleaningmaid.com", description: "Seasonal spring cleaning, 3,800+ cleanings" },
      { domain: "nycholidaymaid.com", description: "Holiday seasonal — Christmas, Thanksgiving, NYE" },
      { domain: "maidservicequeensny.com", description: "Queens-specific, 30+ neighborhoods" },
      { domain: "centralparkcleangservice.com", description: "Luxury near Central Park, 287+ reviews" },
      { domain: "cleaningserviceinmidtown.com", description: "Midtown, Zelle/Apple Pay only" },
      { domain: "uescleaningservice.com", description: "UES luxury, townhomes, penthouses" },
      { domain: "cleaningservicebrooklynny.com", description: "Brooklyn, Park Slope, Williamsburg, DUMBO" },
      { domain: "cleaningservicequeensny.com", description: "Queens, LIC, Astoria, Sunnyside" },
      { domain: "cleaningservicedumbony.com", description: "DUMBO/Brooklyn Heights/Fort Greene, multilingual" },
      { domain: "cleaningservicelongislandcity.com", description: "LIC Queens, multilingual" },
      { domain: "cleaningserviceastoriany.com", description: "Astoria Queens, multilingual Greek" },
      { domain: "cleaningservicesunnysideny.com", description: "Sunnyside Clean NYC brand, 266+ neighborhoods" },
      { domain: "uescarpetcleaner.com", description: "UES carpet specialist, Oriental/antique rugs" },
      { domain: "petcleaningnyc.com", description: "Pet mess cleanup exclusively, UV light detection" },
      { domain: "nycpetsittingservice.com", description: "Pet sitting + cleaning + dog walking + laundry" },
      { domain: "midtownmaid.com", description: "Midtown, Times Square, Theater District, 2,800+ customers" },
      { domain: "harlemmaid.com", description: "Harlem brownstone specialist" },
      { domain: "hellskitchenmaid.com", description: "Hell's Kitchen, multilingual (5 languages)" },
      { domain: "westvillagemaid.com", description: "West Village, townhouse/historic home, 1,150+ customers" },
      { domain: "greenwichvillagemaid.com", description: "Greenwich Village, 1,900+ customers" },
      { domain: "grammercymaid.com", description: "Gramercy Park, key-holder buildings" },
      { domain: "fidimaid.com", description: "FiDi luxury high-rise/condo specialist" },
      { domain: "tribecamaid.com", description: "Tribeca loft/warehouse specialist, 580+ customers" },
      { domain: "hudsonyardsmaid.com", description: "Hudson Yards luxury new-construction" },
      { domain: "stuytownmaid.com", description: "StuyTown/PCV specialist, 950+ customers" },
      { domain: "uesmaid.com", description: "UES white-glove service" },
      { domain: "uwsmaid.com", description: "UWS, pre-war buildings, 650+ customers" },
      { domain: "licmaid.com", description: "LIC high-rise specialist, 420+ customers" },
      { domain: "parkslopemaid.com", description: "Park Slope brownstone, 720+ customers" },
      { domain: "edgewatermaid.com", description: "Edgewater NJ, 'The New Jersey Maid'" },
      { domain: "flatironmaid.com", description: "Flatiron, NoMad, Madison Square, 100+ clients" },
      { domain: "murrayhillmaid.com", description: "Murray Hill, mid-rise apartments/walkups" },
      { domain: "kipsbaymaid.com", description: "Kips Bay, medical professional community" },
      { domain: "batteryparkmaid.com", description: "Battery Park City, waterfront, 100+ clients" },
      { domain: "rooseveltislandmaid.com", description: "Roosevelt Island, Cornell Tech area, 100+ clients" },
      { domain: "foresthillsmaid.com", description: "Forest Hills, Tudor homes" },
      { domain: "chelseacleaningservice.com", description: "Chelsea, Flatiron, Gramercy, West Village" },
      { domain: "hellskitchencleaningservice.com", description: "Hell's Kitchen, Midtown West, Clinton" },
      { domain: "uwscleaningservice.com", description: "Upper West Side cleaning service" },
      { domain: "columbuscirclecleaningservice.com", description: "Columbus Circle, UWS, Hell's Kitchen, 5.0 stars" },
      { domain: "unionsquarecleaningservice.com", description: "Union Square, Flatiron, Gramercy" },
      { domain: "stuytowncleaningservice.com", description: "StuyTown/PCV, East Village, Gramercy" },
      { domain: "westvillagecleaningservice.com", description: "West Village luxury lofts, apartments" },
      { domain: "rooseveltislandcleaningservice.com", description: "Roosevelt Island waterfront apartments" },
      { domain: "elmhurstmaid.com", description: "Elmhurst, 7 languages, most multilingual site" },
      { domain: "woodsidemaid.com", description: "Woodside, 7-train/LIRR commuter angle, multilingual" },
      { domain: "kewgardensmaid.com", description: "Kew Gardens Tudor estates, 122+ reviews" },
      { domain: "jacksonheightsmaid.com", description: "Jackson Heights Historic District, multilingual" },
      { domain: "coronamaid.com", description: "Corona Queens, Spanish-speaking, AI/voice optimized" },
      { domain: "regoparkmaid.com", description: "Rego Park Queens, Russian/Eastern European community" },
      { domain: "jerseycitymaid.com", description: "Jersey City NJ waterfront luxury" },
      { domain: "weehawkenmaid.com", description: "Weehawken NJ, floor-to-ceiling windows specialist" },
      { domain: "hobokenmaidservice.com", description: "Hoboken NJ, Manhattan skyline views" },
      { domain: "gardencitymaid.com", description: "Garden City Long Island, suburban family" },
      { domain: "baysidemaid.com", description: "Bayside Queens, suburban family homes" },
    ],
    differentiators: [
      "86 standalone websites — each one a separate SEO asset",
      "One city, one neighborhood, one solution model",
      "Multilingual sites serving 7+ languages across Queens",
      "Pay after service — no upfront payment on any brand",
      "No contracts — cancel anytime",
      "5.0 stars on Google",
      "Founded 2018, 12,000+ customers served",
    ],
    googleSearch: "https://www.google.com/search?q=nyc+maid",
    hasLocalBuild: true,
  },

  /* ── 3. Stretch NY ────────────────────────────────── */
  {
    order: 3,
    name: "Stretch NY",
    slug: "stretch-ny",
    tagline: "Mobile Assisted Stretching. NYC to 10 Cities Nationwide.",
    primaryDomain: "stretchny.com",
    category: "Mobile Wellness / Stretching",
    siteCount: 6,
    summary:
      "Stretch NY is a mobile assisted stretching brand built for NYC and expanding nationally. Certified stretchologists come to you — home, office, park, hotel. PNF, Active Isolated Stretching, myofascial release, passive stretching. The marathon domain strategy is the standout move: 2025nycmarathon.com and 2026nycmarathon.com were registered to capture pre-event SEO traffic for race-day stretching services. Corporate wellness programs, senior programs, event services. $99/60-min session, 10% weekly discount, $29/month membership. National expansion to 10 cities via assistedstretchservice.com.",
    stats: {
      rankings: "500+",
      traffic: "3,000+/mo",
      customers: "1,000+",
    },
    services: ["SEO", "Web Design", "Local SEO", "Event Marketing"],
    techStack: "HTML",
    phone: "212-202-7080",
    address: "150 W 47th St, New York, NY 10036",
    founded: "2020",
    pricing: "$99/hr regular, $39-$199/hr corporate, $29/mo membership",
    monetization: "Pay-per-session mobile wellness",
    starRating: "4.9",
    sites: [
      { domain: "stretchny.com", description: "Flagship mobile assisted stretching NYC" },
      { domain: "assistedstretchservice.com", description: "National expansion — top 10 US cities" },
      { domain: "nyccorporatewellness.com", description: "Corporate workplace stretching" },
      { domain: "nycmarathonwellness.com", description: "NYC Marathon pre-race/post-race recovery" },
      { domain: "2025nycmarathon.com", description: "2025 NYC Marathon runner stretching" },
      { domain: "2026nycmarathon.com", description: "2026 NYC Marathon — forward-planned SEO domain" },
    ],
    differentiators: [
      "Marathon domain strategy — registering year-specific domains for pre-event SEO",
      "National expansion model from single NYC brand",
      "Corporate wellness + event services",
      "Mobile-first — therapists come to you",
    ],
    googleSearch: "https://www.google.com/search?q=assisted+stretching+nyc",
    hasLocalBuild: false,
  },

  /* ── 4. Moodap ────────────────────────────────────── */
  {
    order: 4,
    name: "Moodap",
    slug: "moodap",
    tagline: "GPS-Verified Video Reviews. 25,000 Pages. Zero Ads.",
    primaryDomain: "moodap.com",
    category: "Local Discovery Platform",
    siteCount: 1,
    summary:
      "Moodap is a GPS-verified local venue discovery platform for NYC. Every review is video, every reviewer is GPS-confirmed at the location. No fake reviews. No pay-to-play. Free for all businesses. The SEO play: 25,000 programmatic pages launched in 2 months, generating 2,000+ page 1 rankings and 1,000+ monthly visits with zero ad spend. One local ad + one corporate ad per result = the revenue model. Businesses can claim free profiles, add photos/tips, and respond to reviews. Currently in testing mode. Social: @moodap.nyc.",
    stats: {
      rankings: "2,000+",
      traffic: "1,000+/mo",
      pages: "25,000+",
      growth: "3,490%",
    },
    services: ["SEO", "Web Design", "Programmatic SEO", "Full-Stack Development"],
    techStack: "Next.js",
    phone: "212-202-9220",
    founded: "2025",
    pricing: "Free for businesses, ad-supported",
    monetization: "Local + corporate advertising per result",
    sites: [
      { domain: "moodap.com", description: "GPS-verified local venue discovery platform" },
    ],
    differentiators: [
      "25,000 programmatic pages in 2 months",
      "GPS-verified video reviews — no fakes",
      "Free for all businesses, no pay-to-play",
      "2,000+ page 1 rankings from launch",
      "3,490% growth with zero ad spend",
    ],
    googleSearch: "https://www.google.com/search?q=moodap",
    hasLocalBuild: true,
  },

  /* ── 5. Full Loop CRM ─────────────────────────────── */
  {
    order: 5,
    name: "Full Loop CRM",
    slug: "full-loop-crm",
    tagline: "The First Full-Cycle CRM Built for Home Service Businesses.",
    primaryDomain: "homeservicesbusinesscrm.com",
    category: "SaaS — Home Service CRM",
    siteCount: 1,
    summary:
      "Full Loop CRM is the 'first full-cycle CRM for home service businesses' — built by a portfolio owner with 20+ years running cleaning crews. It replaces 9+ tools: Jobber, Housecall Pro, ServiceTitan, and more. Exclusive territory lock per trade per metro. AI sales assistant named Selenas (bilingual). Multi-domain organic SEO built in — 1,000s of city/trade programmatic pages. Plans from $199/month. 50+ trades supported. This is the ultimate case study: a SaaS product born from firsthand experience running the businesses it serves.",
    stats: {
      pages: "1,000s",
      traffic: "Growing",
    },
    services: ["SaaS Development", "AI Automation", "Programmatic SEO", "Full-Stack"],
    techStack: "Next.js",
    phone: "212-202-9220",
    founded: "2025",
    pricing: "$199/month, exclusive territory lock",
    monetization: "SaaS subscription + territory licenses",
    sites: [
      { domain: "homeservicesbusinesscrm.com", description: "Full-cycle CRM for home service businesses" },
    ],
    differentiators: [
      "Built by someone who ran cleaning crews for 20+ years",
      "Replaces 9+ tools in one platform",
      "Exclusive territory lock per trade per metro",
      "AI sales assistant (Selenas) — bilingual",
      "Multi-domain programmatic SEO built into the product",
    ],
    googleSearch: "https://www.google.com/search?q=home+services+business+crm",
    hasLocalBuild: true,
  },

  /* ── 6. Debt Service Ratio Loan ───────────────────── */
  {
    order: 6,
    name: "Debt Service Ratio Loan",
    slug: "debt-service-ratio-loan",
    tagline: "DSCR Loan Education at Scale. 600+ City Pages.",
    primaryDomain: "debtserviceratioloan.com",
    category: "Finance / DSCR Loans — DMV/National",
    siteCount: 7,
    summary:
      "Debt Service Ratio Loan is a DSCR loan education and lender connection platform. 600+ city-specific pages with state property tax rates, landlord-friendliness ratings, and income tax data for loan qualification. Covers the DC/MD/VA tri-state region plus national. Qualify based on rental income, not W-2s. No income documentation required. 6-day closings. Plus first-time homebuyer programs for Virginia, Maryland, and the DMV region. 4.9/5 rating, 100+ reviews.",
    stats: {
      rankings: "1,000+",
      traffic: "5,000+/mo",
      pages: "600+",
    },
    services: ["SEO", "Web Design", "Programmatic SEO", "Content", "Lead Gen"],
    techStack: "Next.js",
    founded: "2024",
    pricing: "Lead gen — mortgage referral fees",
    monetization: "Lender referrals / lead generation",
    starRating: "4.9/5, 100+ reviews",
    sites: [
      { domain: "debtserviceratioloan.com", description: "National DSCR loan guide, 600+ cities" },
      { domain: "dscrdmv.com", description: "DC/MD/VA tri-state flagship, 98% on-time rate" },
      { domain: "dscrvirginia.com", description: "Virginia DSCR loans, 95% approval rate" },
      { domain: "dscrmaryland.com", description: "Maryland DSCR loans" },
      { domain: "vafirsttimeloan.com", description: "Virginia first-time homebuyer loans" },
      { domain: "dmvfirsttimeloan.com", description: "DMV tri-state first-time homebuyer loans" },
      { domain: "mdfirsttimeloan.com", description: "Maryland first-time homebuyer loans" },
    ],
    differentiators: [
      "600+ city pages with state-specific financial data",
      "Programmatic SEO with property tax rates, landlord laws, income tax data",
      "6-day closings, no income documentation required",
      "First-time homebuyer programs alongside DSCR investor loans",
    ],
    googleSearch: "https://www.google.com/search?q=dscr+loan+guide",
    hasLocalBuild: true,
  },

  /* ── 7. The Florida Maid ──────────────────────────── */
  {
    order: 7,
    name: "The Florida Maid",
    slug: "the-florida-maid",
    tagline: "567+ Neighborhoods. Miami to Tampa. The Florida Expansion.",
    primaryDomain: "thefloridamaid.com",
    category: "Residential Cleaning — Florida",
    siteCount: 21,
    summary:
      "The Florida Maid is the NYC Maid model replicated across Florida. 567+ neighborhoods statewide — Miami-Dade, Broward, Palm Beach, Tampa Bay, Orlando, Jacksonville, SW FL, Space/Treasure Coast, and the Keys. Same pricing structure: $49/hr client supplies, $65/hr they supply, $100/hr same-day. Pay after service. No contracts. 10% referral program. Tampa sub-brand 'The Tampa Maid' with its own phone line. 20+ neighborhood-specific domains covering South Tampa, Clearwater Beach, Seminole Heights, Hyde Park, and more. Plus FL Dumpster Rentals for the service trades.",
    stats: {
      neighborhoods: "567+",
      customers: "5,000+",
    },
    services: ["SEO", "Web Design", "Local SEO", "Programmatic SEO"],
    techStack: "HTML",
    phone: "(954) 710-3636",
    email: "hi@thefloridamaid.com",
    founded: "2018",
    pricing: "$49/hr (client supplies), $65/hr (they supply), $100/hr same-day",
    monetization: "Direct service bookings via phone/text",
    starRating: "5-star rated",
    sites: [
      { domain: "thefloridamaid.com", description: "Flagship FL brand, 567+ neighborhoods statewide" },
      { domain: "thetampamaid.com", description: "Tampa flagship, 17+ neighborhoods" },
      { domain: "southtampamaid.com", description: "South Tampa, Hyde Park, Bayshore Blvd" },
      { domain: "davislandsmaid.com", description: "Davis Islands waterfront condos" },
      { domain: "downtownstpetemaid.com", description: "Downtown St. Pete historic lofts" },
      { domain: "newtampamaid.com", description: "New Tampa family communities" },
      { domain: "seminoleheightsmaid.com", description: "Seminole Heights historic bungalows" },
      { domain: "clearwaterbeachmaid.com", description: "Clearwater Beach condos, vacation rentals" },
      { domain: "sandkeymaid.com", description: "Sand Key/Belleair Beach luxury high-rises" },
      { domain: "carrollwoodmaid.com", description: "Carrollwood Tampa family homes" },
      { domain: "oldnortheastmaid.com", description: "Old Northeast St. Pete historic homes" },
      { domain: "snellislemaid.com", description: "Snell Isle St. Pete luxury waterfront" },
      { domain: "westchasemaid.com", description: "Westchase Tampa executive homes" },
      { domain: "hydeparkmaid.com", description: "Hyde Park Tampa historic bungalows" },
      { domain: "sunsetparkmaid.com", description: "Sunset Park South Tampa" },
      { domain: "parklandestatesmaid.com", description: "Parkland Estates South Tampa" },
      { domain: "palmaceiamaid.com", description: "Palma Ceia Tampa country club estates" },
      { domain: "channelsidemaid.com", description: "Channelside Tampa luxury high-rises" },
      { domain: "beachparkmaid.com", description: "Beach Park South Tampa" },
      { domain: "fladumpsterrentals.com", description: "Florida dumpster rental, 10/20/30 yard roll-off" },
    ],
    differentiators: [
      "NYC Maid model proven, then replicated across 567+ FL neighborhoods",
      "Tampa sub-brand with dedicated phone line",
      "Same pay-after-service, no-contract model",
      "Geographic expansion playbook from NYC to Florida",
    ],
    googleSearch: "https://www.google.com/search?q=florida+maid+service",
    hasLocalBuild: true,
  },

  /* ── 8. Wash and Fold NYC ─────────────────────────── */
  {
    order: 8,
    name: "Wash and Fold NYC",
    slug: "wash-and-fold-nyc",
    tagline: "Laundry Pickup & Delivery. Per-Pound Pricing. NYC.",
    primaryDomain: "washandfoldnyc.com",
    category: "Laundry Pickup/Delivery — NYC",
    siteCount: 1,
    summary:
      "Wash and Fold NYC is a laundry pickup and delivery service for NYC residential customers. Per-pound pricing. Companion to the NYC Maid brand — same customer base, different service. Built to capture the 'wash and fold near me' search intent that the maid sites don't cover.",
    stats: {},
    services: ["SEO", "Web Design", "Local SEO"],
    techStack: "Next.js",
    founded: "2025",
    pricing: "Per-pound pricing",
    monetization: "Per-pound laundry service",
    sites: [
      { domain: "washandfoldnyc.com", description: "Wash and fold laundry pickup/delivery NYC" },
    ],
    differentiators: [
      "Companion brand to NYC Maid — same customer base",
      "Per-pound pricing model",
      "Pickup and delivery — no storefront needed",
    ],
    hasLocalBuild: true,
  },

  /* ── 9. Destin Digital ────────────────────────────── */
  {
    order: 9,
    name: "Destin Digital",
    slug: "destin-digital",
    tagline: "Marketing Agency + Tourism Content Network. Destin, FL.",
    primaryDomain: "destindigitalmarketing.com",
    category: "Digital Marketing Agency + Tourism — Destin FL",
    siteCount: 9,
    summary:
      "Destin Digital is a digital marketing agency based in Destin, FL with a tourism content network built around it. SEO, PPC, social media, web development, reputation marketing. The tourism sites — vacation rentals, Crab Island guide, boat rentals, jet ski rentals — are both portfolio pieces and revenue-generating content assets. Each tourism site ranks for high-intent Destin vacation searches and drives affiliate/ad revenue.",
    stats: {
      rankings: "100+",
      traffic: "5,000+/mo",
      revenue: "$15K+",
      growth: "250%",
    },
    services: ["SEO", "Web Design", "PPC", "Social Media", "Branding"],
    techStack: "HTML",
    phone: "(850) 610-0770",
    email: "info@destindigitalmarketing.com",
    founded: "2022",
    pricing: "Agency retainer fees",
    monetization: "Agency retainer + tourism affiliate/ad revenue",
    sites: [
      { domain: "destindigitalmarketing.com", description: "Destin FL digital marketing agency" },
      { domain: "vacationrentalsindestinfl.com", description: "Destin vacation rentals guide" },
      { domain: "crabislanddestinfl.com", description: "Crab Island Destin guide" },
      { domain: "rentaboatindestin.com", description: "Boat rentals in Destin guide" },
      { domain: "jetskirentalsindest.com", description: "Jet ski rentals in Destin guide" },
    ],
    differentiators: [
      "Agency + content network model — the tourism sites are both portfolio and revenue",
      "Each tourism domain targets high-intent vacation searches",
      "Destin FL local market expertise",
    ],
    googleSearch: "https://www.google.com/search?q=destin+digital+marketing",
    hasLocalBuild: false,
  },

  /* ── 10. Landscaping in NYC ───────────────────────── */
  {
    order: 10,
    name: "Landscaping in NYC",
    slug: "landscaping-in-nyc",
    tagline: "18 Services. 187 Clients. All 5 Boroughs + LI + Westchester.",
    primaryDomain: "landscapinginnyc.com",
    category: "Landscaping — NYC",
    siteCount: 1,
    summary:
      "Landscaping in NYC covers all 5 boroughs plus Long Island and Westchester. 18 services including rooftop gardens, hardscaping, irrigation, lighting, snow removal, brownstone backyards, and commercial green spaces. 4.9/5 rating, 187 clients. Founded 2012. Free estimates. The cross-brand synergy play: NYC homeowners who need landscaping also need cleaning, handyman, interior design, and pest control — all brands in this portfolio.",
    stats: {
      customers: "187",
      rankings: "50+",
    },
    services: ["SEO", "Web Design", "Local SEO"],
    techStack: "Next.js",
    phone: "(212) 470-9637",
    founded: "2012",
    pricing: "Project-based + maintenance plans",
    monetization: "Project-based + maintenance plans",
    starRating: "4.9/5",
    sites: [
      { domain: "landscapinginnyc.com", description: "NYC landscaping, all 5 boroughs + LI + Westchester" },
    ],
    differentiators: [
      "18 services from rooftop gardens to snow removal",
      "Brownstone backyard specialists — unique NYC niche",
      "Cross-brand synergy with cleaning, handyman, interior design",
    ],
    googleSearch: "https://www.google.com/search?q=landscaping+in+nyc",
    hasLocalBuild: true,
  },

  /* ── 11. The NYC Exterminator ──────────────────────── */
  {
    order: 11,
    name: "The NYC Exterminator",
    slug: "the-nyc-exterminator",
    tagline: "Pest Control for NYC. Every Borough. Every Bug.",
    primaryDomain: "thenycexterminator.com",
    category: "Pest Control — NYC",
    siteCount: 1,
    summary:
      "The NYC Exterminator is the pest control arm of the NYC home services portfolio. Same cross-brand model: NYC homeowners who need pest control also need cleaning, handyman, landscaping, and interior design. Built locally, part of the network.",
    stats: {},
    services: ["SEO", "Web Design", "Local SEO"],
    techStack: "Next.js",
    phone: "212-202-9220",
    founded: "2025",
    monetization: "Pay-per-service",
    sites: [
      { domain: "thenycexterminator.com", description: "NYC pest control, all boroughs" },
    ],
    differentiators: [
      "Part of the NYC home services cross-brand network",
      "Same trust model — no contracts, transparent pricing",
    ],
    hasLocalBuild: true,
  },

  /* ── 12. The NYC Interior Designer ────────────────── */
  {
    order: 12,
    name: "The NYC Interior Designer",
    slug: "the-nyc-interior-designer",
    tagline: "Full-Home Design. All 5 Boroughs + Westchester.",
    primaryDomain: "thenycinteriordesigner.com",
    category: "Interior Design — NYC",
    siteCount: 1,
    summary:
      "The NYC Interior Designer covers full-home design, kitchen/bath remodels, home offices (video call backdrops), lighting design, custom closets, smart home integration, and real estate staging. All 5 boroughs + Westchester. Free consultations. Currently hiring designers at $55K-$85K — an active business signal. Part of the NYC home services network.",
    stats: {},
    services: ["SEO", "Web Design", "Local SEO"],
    techStack: "Next.js",
    phone: "212-202-9220",
    founded: "2024",
    pricing: "Project-based design fees",
    monetization: "Project-based design fees",
    sites: [
      { domain: "thenycinteriordesigner.com", description: "Professional NYC interior design services" },
    ],
    differentiators: [
      "Video call backdrop design — post-COVID niche",
      "Real estate staging for sellers",
      "Actively hiring — real business, not a placeholder",
      "Cross-brand with cleaning, landscaping, handyman",
    ],
    hasLocalBuild: true,
  },

  /* ── 13. The New York Handyman ─────────────────────── */
  {
    order: 13,
    name: "The New York Handyman",
    slug: "the-new-york-handyman",
    tagline: "14+ Years. 24/7 Emergency. All 5 Boroughs + LI + Westchester.",
    primaryDomain: "thenewyorkhandyman.com",
    category: "Handyman / Home Repair — NYC",
    siteCount: 1,
    summary:
      "The New York Handyman has been running since 2010. 14+ years of NYC home repair — plumbing, electrical, drywall, TV mounting, painting, appliance installation. 24/7 emergency service. $199/hr (under 8 hrs), $85 emergency call fee, $65 standard call fee. Licensed, insured. All 5 boroughs + Long Island + Westchester. Address: 70 E 55th St Unit 2a, New York NY 10022.",
    stats: {
      customers: "5,000+",
    },
    services: ["SEO", "Web Design", "Local SEO"],
    techStack: "HTML",
    phone: "212-202-9075",
    address: "70 E 55th St Unit 2a, New York NY 10022",
    founded: "2010",
    pricing: "$199/hr, $85 emergency call, $65 standard call",
    monetization: "Pay-per-service",
    sites: [
      { domain: "thenewyorkhandyman.com", description: "NYC handyman/home repair since 2010" },
    ],
    differentiators: [
      "14+ years in business — longest-running brand in the portfolio",
      "24/7 emergency service",
      "Licensed and insured",
      "Cross-brand synergy — feeds the cleaning network",
    ],
    googleSearch: "https://www.google.com/search?q=new+york+handyman",
    hasLocalBuild: false,
  },

  /* ── 14. NYC Mobile Salon ─────────────────────────── */
  {
    order: 14,
    name: "NYC Mobile Salon",
    slug: "nyc-mobile-salon",
    tagline: "5,000+ Appointments. 4.9 Stars. Beauty That Comes to You.",
    primaryDomain: "thenycmobilesalon.com",
    category: "Mobile Beauty Services — NYC",
    siteCount: 1,
    summary:
      "The NYC Mobile Salon brings hair, nails, makeup, grooming, skincare, and waxing to you. $99/hr, 1-hour minimum. 5,000+ appointments completed. 4.9 stars. Licensed NY State professionals. All 5 boroughs. No travel fees. Events: bridal, bachelorette, corporate wellness, on-set hair/makeup ($500+/day). 20-30% less than comparable Manhattan salons.",
    stats: {
      customers: "5,000+",
      rankings: "500+",
      traffic: "500+/mo",
      growth: "250%",
    },
    services: ["SEO", "Web Design", "Local SEO"],
    techStack: "HTML",
    phone: "212-202-9220",
    founded: "2022",
    pricing: "$99/hr, 1-hour minimum, events from $500/day",
    monetization: "Pay-per-session mobile beauty",
    starRating: "4.9",
    sites: [
      { domain: "thenycmobilesalon.com", description: "Mobile beauty services NYC, all 5 boroughs" },
    ],
    differentiators: [
      "Mobile-first — beauty professionals come to you",
      "500+ page 1 rankings in under 15 days",
      "Event services — bridal, corporate, on-set",
      "20-30% less than Manhattan salon prices",
    ],
    googleSearch: "https://www.google.com/search?q=nyc+mobile+salon",
    hasLocalBuild: true,
  },

  /* ── 15. Urban Clothing USA ───────────────────────── */
  {
    order: 15,
    name: "Urban Clothing USA",
    slug: "urban-clothing-usa",
    tagline: "Global Drip, Local Roots. 32,000 Monthly Visits.",
    primaryDomain: "urbanclothingusa.com",
    category: "Streetwear / E-Commerce — NYC",
    siteCount: 1,
    summary:
      "Urban Co NYC streetwear brand. 'Global Drip, Local Roots.' Men's and women's urban fashion, accessories. 125+ years combined streetwear expertise. Flagship product: Urban 212 Hoodie. 32,000 monthly visits. 100+ page 1 rankings. Zero ad spend. The SEO proof that organic works even for e-commerce fashion.",
    stats: {
      rankings: "100+",
      traffic: "32,000/mo",
      leads: "100+/mo",
      growth: "600%",
    },
    services: ["SEO", "Web Design", "E-Commerce"],
    techStack: "HTML",
    phone: "212-202-8770",
    monetization: "E-commerce product sales",
    sites: [
      { domain: "urbanclothingusa.com", description: "Urban Co NYC streetwear brand" },
    ],
    differentiators: [
      "32,000 monthly visits with zero ad spend",
      "100+ page 1 rankings for streetwear keywords",
      "Direct-to-consumer e-commerce",
      "Proves organic SEO works for fashion/e-commerce",
    ],
    googleSearch: "https://www.google.com/search?q=urban+clothing+nyc",
    hasLocalBuild: false,
  },

  /* ── 16. The NYC Classifieds ──────────────────────── */
  {
    order: 16,
    name: "The NYC Classifieds",
    slug: "the-nyc-classifieds",
    tagline: "Geo-Verified. 126+ Neighborhoods. Free Forever.",
    primaryDomain: "thenycclassifieds.com",
    category: "Classifieds Platform — NYC",
    siteCount: 1,
    summary:
      "The NYC Classifieds is a free geo-verified classifieds platform for New York City. 126+ neighborhoods. All 5 boroughs. Selfie + GPS verification = real neighbors only. Categories: housing, jobs, services, for sale, gigs, community. 'The Porch' community feed: events, stoop sales, lost & found, local alerts, neighborhood questions. 100% free forever. Anti-spam/anti-fake positioning vs Craigslist. 10+ page 1 rankings in under 10 days from launch.",
    stats: {
      rankings: "10+",
      traffic: "100+/mo",
      growth: "220%",
      neighborhoods: "126+",
    },
    services: ["SEO", "Web Design", "Programmatic SEO", "Full-Stack"],
    techStack: "Next.js",
    phone: "212-202-9220",
    founded: "2025",
    pricing: "Free for users, ad-supported",
    monetization: "Advertising (free for users/businesses)",
    sites: [
      { domain: "thenycclassifieds.com", description: "Free geo-verified classifieds platform NYC" },
    ],
    differentiators: [
      "GPS + selfie verification — no fake listings",
      "10+ page 1 rankings in under 10 days from launch",
      "126+ neighborhood-specific pages",
      "100% free forever — positioned against Craigslist",
      "'The Porch' community feed — unique social feature",
    ],
    googleSearch: "https://www.google.com/search?q=nyc+classifieds",
    hasLocalBuild: true,
  },
];

/* ── Aggregate stats for the hub hero ────────────────── */
export const portfolioTotals = {
  totalSites: 158,
  totalBrands: 16,
  totalProgrammaticPages: "80,000+",
  totalCustomers: "25,000+",
  totalNeighborhoods: "900+",
  yearsExperience: "25+",
  languages: "7+",
};

/* ── Helper: get brand by slug ───────────────────────── */
export function getBrandBySlug(slug: string): PortfolioBrand | undefined {
  return brands.find((b) => b.slug === slug);
}

/* ── Helper: all slugs for generateStaticParams ──────── */
export function getAllBrandSlugs(): string[] {
  return brands.map((b) => b.slug);
}
