import type { Neighborhood } from './locations'
import type { Service } from './services'
import type { Area } from './data/areas'

// Deterministic hash for consistent but varied content selection
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

function pick<T>(arr: T[], seed: string, offset = 0): T {
  return arr[(hashCode(seed) + offset) % arr.length]
}

// ============ HOMEPAGE ============

export function homepageContent() {
  return {
    title: 'NYC Maid Service & House Cleaning From $49/hr | 5-Star Rated | The NYC Maid',
    metaDescription: 'NYC\'s top-rated maid service from $49/hr. House cleaning across Manhattan, Brooklyn, Queens, Long Island & NJ. Licensed, insured. 5.0★ Google. (212) 202-8400',
    h1: 'NYC\'s #1 Rated Maid Service & House Cleaning — From $49/hr',
    subtitle: 'Professional house cleaning across Manhattan, Brooklyn, Queens, Long Island & New Jersey. Licensed, insured, and loved by thousands of clients.',
  }
}

// ============ AREA PAGES ============

const areaIntros: Record<string, string[]> = {
  manhattan: [
    'From luxury Upper East Side co-ops to Tribeca lofts, our Manhattan cleaning team handles every type of home with care and precision.',
    'Manhattan\'s diverse housing — from pre-war apartments to modern high-rises — demands experienced cleaners who understand the details.',
  ],
  brooklyn: [
    'Brooklyn\'s beautiful brownstones, converted lofts, and family homes deserve a cleaning team that understands the borough.',
    'From Park Slope families to DUMBO professionals, our Brooklyn cleaners deliver spotless results every time.',
  ],
  queens: [
    'Queens is NYC\'s most diverse borough, and our cleaning team serves every neighborhood with reliable, thorough service.',
    'From Long Island City high-rises to Forest Hills gardens, we bring professional cleaning to all of Queens.',
  ],
  'long-island': [
    'Long Island\'s luxury homes and estates require premium cleaning services — that\'s exactly what we deliver.',
    'From Great Neck estates to Garden City colonials, our Long Island team provides meticulous, detail-oriented cleaning.',
  ],
  'new-jersey': [
    'The NJ waterfront communities deserve NYC-quality cleaning service — and that\'s exactly what we bring across the Hudson.',
    'Hoboken brownstones, Jersey City high-rises, Weehawken waterfronts — our NJ team delivers thorough, reliable cleaning.',
  ],
}

export function areaContent(area: Area) {
  const intros = areaIntros[area.slug] || areaIntros['manhattan']
  return {
    title: `House Cleaning Services in ${area.name}`,
    metaDescription: `Professional cleaning in ${area.name} from $49/hr. Deep cleaning, weekly service, move-in/out & more. 5.0★ Google. (212) 202-8400`,
    h1: `Professional Cleaning Services in ${area.name}`,
    intro: pick(intros, area.slug),
  }
}

// ============ NEIGHBORHOOD PAGES ============

const introTemplates = [
  (n: Neighborhood) => `Looking for a reliable cleaning service in ${n.name}? The NYC Maid has been trusted by ${n.name} residents for years, delivering spotless results in ${n.housing_types[0]}, ${n.housing_types[1]}, and more.`,
  (n: Neighborhood) => `${n.name} deserves a cleaning team that understands its unique homes. From ${n.housing_types[0]} to ${n.housing_types[1]}, our experienced cleaners handle every detail with care.`,
  (n: Neighborhood) => `Your ${n.name} home should always feel fresh and welcoming. Our professional cleaning team specializes in the ${n.housing_types[0]} and ${n.housing_types[1]} that make this neighborhood special.`,
  (n: Neighborhood) => `Residents of ${n.name} know their neighborhood is one of a kind — and their cleaning service should be too. Near ${n.landmarks[0]}, we provide thorough, reliable cleaning tailored to local homes.`,
]

const h1Templates = [
  (n: Neighborhood) => `${n.name} Cleaning Services`,
  (n: Neighborhood) => `House Cleaning in ${n.name}`,
  (n: Neighborhood) => `Professional Cleaning in ${n.name}`,
  (n: Neighborhood) => `${n.name} House Cleaning Services`,
]

export function neighborhoodContent(neighborhood: Neighborhood, area: Area) {
  const seed = neighborhood.slug
  const intro = pick(introTemplates, seed)(neighborhood)
  const h1 = pick(h1Templates, seed, 1)(neighborhood)

  return {
    title: `${h1} | ${area.name}`,
    metaDescription: `Professional cleaning in ${neighborhood.name}, ${area.name} from $49/hr. Serving ${neighborhood.housing_types.slice(0, 2).join(', ')} near ${neighborhood.landmarks[0]}. 5.0★ Google. (212) 202-8400`,
    h1,
    intro,
  }
}

// ============ NEIGHBORHOOD CHARACTER CONTENT ============

const vibeTemplates = [
  (n: Neighborhood, a: Area) => `${n.name} is one of ${a.name}'s most distinctive neighborhoods — a place where ${n.housing_types[0]} sit alongside ${n.housing_types[1]}, and residents have ${n.landmarks[0]} practically in their backyard. It's the kind of neighborhood where people put down roots and stay.`,
  (n: Neighborhood, a: Area) => `There's a reason ${n.name} residents are fiercely loyal to their neighborhood. Between the ${n.housing_types[0]}, the proximity to ${n.landmarks[0]}, and the energy of ${a.name} right outside the door — it's a place that feels like home from day one.`,
  (n: Neighborhood, a: Area) => `${n.name} has its own rhythm. The ${n.housing_types[0]} and ${n.housing_types[1]} give it architectural character, while ${n.landmarks[0]} anchors the neighborhood's identity. Whether you've lived here for decades or just moved in, ${n.name} has a way of feeling like yours.`,
  (n: Neighborhood, a: Area) => `Walk through ${n.name} and you'll notice what makes it special — the ${n.housing_types[0]}, the tree-lined streets near ${n.landmarks[0]}, and a community that takes pride in where they live. It's one of ${a.name}'s neighborhoods that rewards the people who call it home.`,
]

const knownForTemplates = [
  (n: Neighborhood) => [`Home to ${n.landmarks[0]}`, `Known for its beautiful ${n.housing_types[0]}`, `A neighborhood of ${n.housing_types[1]} and local character`, `Walking distance to ${n.landmarks[1] || n.landmarks[0]}`, `One of NYC's most sought-after areas for families and professionals`],
  (n: Neighborhood) => [`Steps from ${n.landmarks[0]} and ${n.landmarks[1] || 'local parks'}`, `Defined by its ${n.housing_types[0]} and ${n.housing_types[1]}`, `A tight-knit community with real neighborhood feel`, `Served by ZIP codes ${n.zip_codes.slice(0, 2).join(' & ')}`, `Where longtime residents and newcomers live side by side`],
  (n: Neighborhood) => [`Famous for ${n.landmarks[0]}`, `Architecturally rich with ${n.housing_types[0]} and ${n.housing_types[1]}`, `A neighborhood that rewards exploration`, `${n.nearby.length} neighboring areas within walking distance`, `One of ${n.zip_codes.length > 3 ? 'the largest' : 'the most charming'} neighborhoods in its borough`],
]

const funFactTemplates = [
  (n: Neighborhood) => [
    { label: 'ZIP Codes', value: n.zip_codes.length.toString(), detail: n.zip_codes.slice(0, 3).join(', ') + (n.zip_codes.length > 3 ? ` +${n.zip_codes.length - 3}` : '') },
    { label: 'Landmarks', value: n.landmarks.length.toString(), detail: `Including ${n.landmarks[0]}` },
    { label: 'Housing Styles', value: n.housing_types.length.toString(), detail: `From ${n.housing_types[0]} to ${n.housing_types[1]}` },
    { label: 'Nearby Areas', value: n.nearby.length.toString(), detail: 'Connected neighborhoods' },
  ],
]

export function neighborhoodVibe(neighborhood: Neighborhood, area: Area): string {
  return pick(vibeTemplates, neighborhood.slug)(neighborhood, area)
}

export function neighborhoodKnownFor(neighborhood: Neighborhood): string[] {
  const template = pick(knownForTemplates, neighborhood.slug)
  return template(neighborhood)
}

export function neighborhoodFunFacts(neighborhood: Neighborhood): { label: string; value: string; detail: string }[] {
  return funFactTemplates[0](neighborhood)
}

// ============ NEIGHBORHOOD × SERVICE PAGES ============

const serviceIntroTemplates = [
  (n: Neighborhood, s: Service) => `Need ${s.name.toLowerCase()} in ${n.name}? Our professional cleaning team specializes in ${s.name.toLowerCase()} for ${n.housing_types[0]} and ${n.housing_types[1]} throughout the neighborhood.`,
  (n: Neighborhood, s: Service) => `${n.name} residents trust The NYC Maid for expert ${s.name.toLowerCase()}. We understand the unique ${n.cleaning_challenges[0]} and ${n.cleaning_challenges[1]} that come with cleaning homes in this area.`,
  (n: Neighborhood, s: Service) => `Our ${s.name.toLowerCase()} service in ${n.name} is tailored to the neighborhood's ${n.housing_types[0]} and ${n.housing_types[1]}. Near ${n.landmarks[0]}, we deliver exceptional results every time.`,
  (n: Neighborhood, s: Service) => `From ${n.cleaning_challenges[0]} to ${n.cleaning_challenges[1]}, our ${s.name.toLowerCase()} team in ${n.name} handles it all. Trusted by local residents for thorough, reliable service.`,
]

const serviceH1Templates = [
  (n: Neighborhood, s: Service) => `${s.name} in ${n.name}`,
  (n: Neighborhood, s: Service) => `${n.name} ${s.name} Services`,
  (n: Neighborhood, s: Service) => `Professional ${s.name} in ${n.name}`,
  (n: Neighborhood, s: Service) => `${s.name} Services in ${n.name}`,
]

export function neighborhoodServiceContent(neighborhood: Neighborhood, service: Service, area: Area) {
  const seed = `${neighborhood.slug}-${service.slug}`
  const intro = pick(serviceIntroTemplates, seed)(neighborhood, service)
  const h1 = pick(serviceH1Templates, seed, 1)(neighborhood, service)

  return {
    title: `${h1} | ${area.name}`,
    metaDescription: `${service.name} in ${neighborhood.name}, ${area.name}. ${service.features.slice(0, 2).join(', ')} & more. ${service.priceRange}. 5.0★ Google. (212) 202-8400`,
    h1,
    intro,
    whyUs: [
      `Local ${neighborhood.name} expertise — we know the ${neighborhood.housing_types[0]} and ${neighborhood.housing_types[1]} here`,
      `Specialized in ${neighborhood.cleaning_challenges[hashCode(seed) % neighborhood.cleaning_challenges.length]} common in this area`,
      `${service.duration} of thorough, detail-oriented ${service.name.toLowerCase()}`,
      'Licensed, insured, and background-checked cleaners',
      'Satisfaction guaranteed on every visit',
    ],
  }
}

// ============ SERVICE PAGES ============

export function serviceContent(service: Service) {
  return {
    title: `${service.name} Services | NYC, Brooklyn, Queens`,
    metaDescription: `Professional ${service.name.toLowerCase()} across NYC, Brooklyn, Queens, Long Island & NJ. ${service.features.slice(0, 2).join(', ')} & more. ${service.priceRange}. 5.0★ Google. (212) 202-8400`,
    h1: `${service.name} Services`,
    intro: service.description,
  }
}

// ============ RICH SERVICE PAGE CONTENT ============

interface RichSection {
  heading: string
  subheading?: string
  body: string[]
}

interface RoomChecklist {
  room: string
  tasks: string[]
}

interface ComparisonRow {
  task: string
  regular: boolean
  deep: boolean
}

interface Tip {
  title: string
  detail: string
}

export interface ServiceRichContent {
  heroH1: string
  heroSubtitle: string
  whatIs: RichSection
  rooms?: RoomChecklist[]
  roomsTitle?: string
  comparison?: { title: string; rows: ComparisonRow[] }
  whenToBook: { title: string; items: string[] }
  nycTips: Tip[]
  tipsTitle?: string
  educationSections: RichSection[]
  pricingNote: string
  faqs: { question: string; answer: string }[]
}

const richContentMap: Record<string, ServiceRichContent> = {
  'deep-cleaning': {
    heroH1: 'NYC Deep Cleaning Service — The Reset Your Apartment Needs',
    roomsTitle: 'What Gets Deep Cleaned in Every NYC Apartment',
    tipsTitle: 'NYC Deep Cleaning — Insider Tips From Local Pros',
    heroSubtitle: 'The most thorough cleaning your NYC apartment has ever had. We get into every corner, behind every appliance, and inside every cabinet — so your home feels brand new.',
    whatIs: {
      heading: 'What Exactly Is a Deep Cleaning?',
      subheading: 'A deep clean goes far beyond a regular tidy-up. It targets the grime, dust, and buildup that accumulates over weeks and months in places you don\'t normally reach.',
      body: [
        'A deep cleaning covers everything a regular cleaning does — plus inside appliances, behind furniture, baseboards, light fixtures, window tracks, cabinet interiors, vent covers, and detailed bathroom scrubbing. It\'s the reset button for your home.',
        'Most NYC apartments need a deep clean before transitioning to a recurring maintenance schedule. If it\'s been more than a month since your last professional cleaning — or if you\'ve never had one — a deep clean is where to start.',
        'Our deep cleans typically take 4-8 hours depending on apartment size and condition. A studio might take 3-4 hours; a 3-bedroom that hasn\'t been professionally cleaned can take 6-8 hours. We don\'t rush — we clean until the job is done right.',
      ],
    },
    rooms: [
      { room: 'Kitchen', tasks: ['Inside oven and stovetop degreasing', 'Inside refrigerator — shelves, drawers, seals', 'Inside microwave', 'Cabinet exteriors and handles', 'Backsplash scrubbing', 'Sink and faucet deep polish', 'Countertop sanitization', 'Small appliance exteriors', 'Floor scrubbing including under appliances'] },
      { room: 'Bathroom', tasks: ['Tile and grout deep scrubbing', 'Shower door track and glass', 'Inside medicine cabinet', 'Toilet — including base, behind, and tank', 'Bathtub and shower deep scrub', 'Sink, faucet, and countertop', 'Mirror and glass polishing', 'Exhaust fan and vent cleaning', 'Floor scrubbing including corners'] },
      { room: 'Living Areas', tasks: ['Baseboard and trim scrubbing', 'Light fixture and ceiling fan dusting', 'Window sill and track cleaning', 'Behind and under furniture', 'Air vent and register cleaning', 'Door frame and light switch wipe-down', 'Detailed surface dusting', 'Floor vacuuming and mopping', 'Cobweb removal from all corners'] },
      { room: 'Bedrooms', tasks: ['Baseboard and trim cleaning', 'Under-bed cleaning and dusting', 'Closet floor and shelf wipe-down', 'Light fixture dusting', 'Window sill and track cleaning', 'Mirror and glass polishing', 'Nightstand and dresser surface detail', 'Bed making with fresh linens (if provided)', 'Floor vacuuming and mopping'] },
    ],
    comparison: {
      title: 'Deep Cleaning vs. Regular Cleaning — What\'s the Difference?',
      rows: [
        { task: 'Kitchen surfaces and countertops', regular: true, deep: true },
        { task: 'Bathroom toilet, tub, and sink', regular: true, deep: true },
        { task: 'Vacuuming and mopping floors', regular: true, deep: true },
        { task: 'General dusting', regular: true, deep: true },
        { task: 'Inside oven and refrigerator', regular: false, deep: true },
        { task: 'Baseboard and trim scrubbing', regular: false, deep: true },
        { task: 'Window sills and tracks', regular: false, deep: true },
        { task: 'Behind and under furniture', regular: false, deep: true },
        { task: 'Light fixtures and ceiling fans', regular: false, deep: true },
        { task: 'Cabinet exteriors', regular: false, deep: true },
        { task: 'Air vent and register cleaning', regular: false, deep: true },
        { task: 'Tile and grout scrubbing', regular: false, deep: true },
      ],
    },
    whenToBook: {
      title: 'When Should You Book a Deep Cleaning?',
      items: [
        'Before starting a recurring weekly or bi-weekly service — the first clean should always be a deep clean',
        'Moving into a new apartment — even "clean" apartments need a real deep clean before you unpack',
        'After guests leave or before guests arrive — reset your home to spotless',
        'Seasonal deep clean — most NYC apartments benefit from a deep clean every 3-6 months',
        'After illness — eliminate bacteria and allergens from every surface',
        'Before or after a holiday or party — get your space guest-ready or recover fast',
        'If it\'s been more than a month since your last professional cleaning',
      ],
    },
    nycTips: [
      { title: 'Pre-war apartments need extra attention', detail: 'Older NYC buildings have crown molding, intricate baseboards, original hardwood, and radiators that collect decades of dust. Our cleaners are experienced with these details and know how to clean them without damage.' },
      { title: 'High-rise dust is real', detail: 'Upper-floor apartments collect more airborne dust from HVAC systems. Deep cleaning air vents, window tracks, and behind furniture makes a massive difference in air quality and cleanliness.' },
      { title: 'Schedule your deep clean on a weekday', detail: 'Weekday availability is typically better than weekends. If you can work from home or leave a key, weekday deep cleans mean we can start earlier and take the time needed without feeling rushed.' },
      { title: 'Your first deep clean always takes the longest', detail: 'After the initial deep clean, switching to a weekly or bi-weekly maintenance schedule at $49/hr keeps your apartment in great shape. Most recurring clients never need another deep clean — because we maintain it.' },
      { title: 'Declutter before we arrive', detail: 'The less clutter on surfaces, the more actual cleaning we can do. Clear countertops, pick up clothes, and tidy personal items so our cleaners can focus on scrubbing, not moving things.' },
    ],
    educationSections: [
      {
        heading: 'How Long Does a Deep Cleaning Take in NYC?',
        body: [
          'The duration depends entirely on apartment size and current condition. Here\'s what to expect:',
          'Studio / 1-bedroom: 3-4 hours for a well-maintained apartment, 4-5 hours if it hasn\'t been professionally cleaned recently.',
          '2-bedroom: 4-5 hours typical. A neglected 2BR can take 5-6 hours.',
          '3-bedroom+: 5-8 hours depending on condition. Large apartments with multiple bathrooms take the longest.',
          'We never rush. Our cleaners work methodically room by room, and they don\'t leave until the job is done. If a deep clean runs longer than estimated, we\'ll communicate with you before continuing.',
        ],
      },
      {
        heading: 'Deep Cleaning Pricing — What Affects the Cost?',
        body: [
          'We charge by the hour — $49/hr with your supplies, $65/hr when we bring everything. The total cost depends on how long the job takes.',
          'Apartment size is the biggest factor. A studio takes 3-4 hours, a 3-bedroom takes 5-8 hours.',
          'Current condition matters. An apartment that gets cleaned monthly will take less time than one that hasn\'t been touched in 6 months.',
          'Special requests like inside-cabinet cleaning, window washing, or laundry add time.',
          'The good news: after your initial deep clean, you can switch to recurring maintenance at $49/hr, which is significantly cheaper per visit because we\'re maintaining — not catching up.',
        ],
      },
    ],
    pricingNote: 'Most deep cleans cost between $196 and $390 total. A studio typically runs $196–$245 (4–5 hrs at $49/hr), while a 3-bedroom averages $320–$390 (5–6 hrs at $65/hr). Your first deep clean is always the most expensive — after that, recurring service at $49/hr keeps costs low.',
    faqs: [
      { question: 'What does a deep cleaning include that a regular cleaning doesn\'t?', answer: 'A deep clean includes everything in a regular clean plus inside appliances (oven, fridge, microwave), baseboard and trim scrubbing, window sill and track cleaning, behind and under furniture, light fixture dusting, air vent cleaning, cabinet exteriors, and detailed tile and grout scrubbing. It\'s a complete reset for your home.' },
      { question: 'How much does a deep cleaning cost in NYC?', answer: 'Deep cleaning costs $49–$65/hr depending on who provides supplies. A typical studio deep clean runs $196–$260 (4–5 hours). A 2-bedroom is usually $260–$390 (4–6 hours). A 3-bedroom can be $325–$520 (5–8 hours). We charge by the hour so you only pay for the time your space actually needs.' },
      { question: 'How long does a deep cleaning take?', answer: 'Studio: 3–4 hours. 1-bedroom: 3–5 hours. 2-bedroom: 4–6 hours. 3-bedroom+: 5–8 hours. Duration depends on apartment condition, size, and any special requests. First-time deep cleans take longer than subsequent ones.' },
      { question: 'Should I get a deep clean before starting weekly service?', answer: 'Yes, absolutely. We always recommend a deep clean first. It establishes a clean baseline so your recurring weekly or bi-weekly cleanings are faster and more effective. After the deep clean, maintenance cleanings typically take just 2–3 hours.' },
      { question: 'Do I need to be home during the deep cleaning?', answer: 'No. Many clients leave a key, provide a door code, or arrange access through their doorman. You\'re welcome to be home or out — whatever is most comfortable for you.' },
      { question: 'Can I request specific areas to focus on?', answer: 'Absolutely. If your kitchen needs the most attention, or you want extra time in the bathrooms, just let us know. We customize every deep clean based on your priorities.' },
      { question: 'How often should I get a deep cleaning?', answer: 'If you have recurring weekly or bi-weekly service, you may never need another deep clean. Without recurring service, we recommend a deep clean every 3–6 months to prevent buildup. Seasonal deep cleans in spring and fall are especially popular with NYC apartment dwellers.' },
      { question: 'Is deep cleaning worth it for a small studio?', answer: 'Yes. Studios have compact kitchens and bathrooms that accumulate grease, soap scum, and dust quickly. A 3–4 hour deep clean completely resets the space. Most studio deep cleans cost $147–$260 — less than a dinner out.' },
      { question: 'What products do you use for deep cleaning?', answer: 'At $65/hr we bring professional-grade degreasers, bathroom cleaners, glass cleaner, microfiber systems, and a commercial vacuum. At $49/hr you provide your own products. We\'re happy to use eco-friendly or hypoallergenic products — just let us know.' },
      { question: 'Do you deep clean inside kitchen cabinets?', answer: 'Cabinet exteriors are included in every deep clean. Interior cabinet cleaning is available as an add-on — just mention it when booking and we\'ll allow extra time for it.' },
    ],
  },

  'regular-cleaning': {
    heroH1: 'NYC Apartment Cleaning — Consistent, Reliable, Affordable',
    tipsTitle: 'Smart Apartment Cleaning Tips for NYC Residents',
    heroSubtitle: 'Consistent, reliable apartment cleaning on your schedule. The same trusted cleaner every visit — so your home always feels fresh and you never come back to a mess.',
    whatIs: {
      heading: 'What Is Regular Apartment Cleaning?',
      subheading: 'Regular cleaning is your ongoing maintenance service — the recurring clean that keeps your home consistently spotless between deep cleans.',
      body: [
        'A regular apartment cleaning covers all the essentials: full kitchen cleaning (counters, sink, stovetop, appliance exteriors), bathroom sanitization (toilet, tub, sink, mirror), dusting all surfaces, vacuuming and mopping all floors, trash removal, and bed making.',
        'The key difference between regular cleaning and a one-time service is consistency. We assign you the same cleaner each visit so they learn your home, your preferences, and your standards. Over time, your cleaner knows exactly how you like things done.',
        'Most NYC apartment dwellers book regular cleaning on a weekly or bi-weekly schedule. Weekly clients see the best results — their homes stay in great shape with minimal effort.',
      ],
    },
    whenToBook: {
      title: 'When Should You Book Regular Cleaning?',
      items: [
        'You\'re a busy professional who doesn\'t have time to clean regularly',
        'You want your apartment to always feel fresh when you walk in the door',
        'You\'ve had a deep clean and want to maintain that level of cleanliness',
        'You have pets that shed — regular cleaning keeps hair and dander under control',
        'You entertain frequently and want your space always guest-ready',
        'You want the lowest per-visit cost — recurring clients at $49/hr save significantly',
      ],
    },
    nycTips: [
      { title: 'Weekly is the sweet spot for most NYC apartments', detail: 'NYC apartments accumulate dust, allergens, and kitchen grime faster than suburban homes due to density, HVAC systems, and street-level particles. Weekly cleaning prevents buildup so every clean is fast and efficient.' },
      { title: 'Provide your own supplies to save 25%', detail: 'At $49/hr vs $65/hr, providing your own vacuum, mop, and basic cleaning products saves you $32+ per 2-hour visit. Over a year of weekly cleanings, that\'s $1,600+ in savings.' },
      { title: 'Same cleaner means better results over time', detail: 'When the same person cleans your apartment every week, they learn the quirks — which faucet drips, where dust collects fastest, how you like your kitchen organized. Consistency compounds into better quality.' },
      { title: 'Start with a deep clean first', detail: 'We always recommend an initial deep clean before starting regular service. This establishes a clean baseline so your recurring cleanings are faster, cheaper, and more effective from day one.' },
    ],
    educationSections: [
      {
        heading: 'Regular Cleaning vs. Deep Cleaning — Which Do You Need?',
        body: [
          'If your apartment hasn\'t been professionally cleaned in over a month, start with a deep clean. After that, transition to regular cleaning to maintain the results.',
          'Regular cleaning maintains a clean home. Deep cleaning resets a dirty one. Think of it like going to the dentist — regular cleanings prevent problems, but if you haven\'t gone in years, you need a deep clean first.',
          'Most regular cleanings take 2–3 hours for a 1–2 bedroom apartment. The same apartment might take 4–6 hours for a deep clean.',
        ],
      },
      {
        heading: 'What Does Regular Cleaning Cost in NYC?',
        body: [
          'Regular cleaning starts at $49/hr when you provide supplies or $65/hr when we bring everything. A typical 2-hour regular clean for a 1-bedroom costs just $98 with your supplies.',
          'Weekly clients who provide supplies pay as little as $98/visit — that\'s $392/month for a consistently spotless apartment. Less than most gym memberships.',
          'Compare that to one-time deep cleans at $250–$400 each. Recurring regular service is the most cost-effective way to keep your NYC apartment clean.',
        ],
      },
    ],
    pricingNote: 'Regular cleaning typically costs $98–$260 per visit. A weekly 2-hour clean at $49/hr is just $98/visit — the most affordable way to maintain a spotless NYC apartment.',
    faqs: [
      { question: 'What\'s included in a regular apartment cleaning?', answer: 'Full kitchen cleaning (counters, sink, stovetop, appliance exteriors), bathroom sanitization (toilet, tub, sink, mirror), dusting all surfaces, vacuuming and mopping all floors, trash and recycling removal, and bed making. We can customize the checklist based on your priorities.' },
      { question: 'How much does regular apartment cleaning cost in NYC?', answer: 'Regular cleaning is $49/hr with your supplies or $65/hr when we bring everything. A typical 1-bedroom takes 2 hours ($98–$130). A 2-bedroom takes 2.5–3 hours ($122–$195). Weekly clients see the lowest per-visit costs.' },
      { question: 'Can I get the same cleaner every time?', answer: 'Yes — that\'s how we operate. For recurring clients, we assign the same cleaner to your home so they learn your space, your preferences, and your standards. Consistency is one of our biggest advantages.' },
      { question: 'How often should I schedule regular cleaning?', answer: 'Weekly is ideal for most NYC apartments. Bi-weekly works well for singles or couples with low-traffic homes. Monthly is suitable for very tidy households that want occasional professional maintenance.' },
      { question: 'Do I need a deep clean before starting regular service?', answer: 'We strongly recommend it. A deep clean establishes a spotless baseline so your recurring regular cleanings are faster and more effective. Without it, the first few regular cleanings will take longer and cost more.' },
      { question: 'What\'s the cancellation policy for recurring cleaning?', answer: '7 days notice to cancel the service entirely. 3 days notice to reschedule a cleaning within the same week. We protect our cleaners\' schedules — consistent scheduling benefits everyone.' },
    ],
  },

  'weekly-cleaning': {
    heroH1: 'NYC Weekly Maid Service — Never Come Home to a Mess Again',
    tipsTitle: 'Weekly Cleaning Secrets From NYC\'s Top-Rated Maids',
    heroSubtitle: 'The same professional cleaner every week, maintaining your home to the highest standard. Walk in to a spotless apartment every single time — without lifting a finger.',
    whatIs: {
      heading: 'What Is Weekly Maid Service?',
      subheading: 'Weekly service is the gold standard of home maintenance. Your assigned cleaner comes on the same day each week, maintaining your apartment in consistently perfect condition.',
      body: [
        'Weekly maid service means you never have to think about cleaning again. Every week, your dedicated cleaner arrives on schedule, cleans your entire apartment to your standards, and leaves everything spotless.',
        'Because weekly service is maintenance-based, each visit is fast and efficient — typically 2–3 hours. Your cleaner isn\'t playing catch-up; they\'re maintaining an already clean home. This means lower cost per visit and better results.',
        'Weekly clients get priority scheduling, the same cleaner every visit, and the lowest effective hourly rate at $49/hr with your supplies. It\'s the most popular service for busy NYC professionals and families.',
      ],
    },
    whenToBook: {
      title: 'Who Benefits Most From Weekly Maid Service?',
      items: [
        'Busy professionals who work long hours and value coming home to a clean apartment',
        'Families with children — kids create messes faster than you can clean them',
        'Pet owners — weekly cleaning keeps hair, dander, and odors under control',
        'Anyone who hates cleaning and would rather spend their weekends doing literally anything else',
        'People who entertain regularly and want their home always guest-ready',
        'Recurring clients who want the lowest per-visit cost and the most consistent results',
      ],
    },
    nycTips: [
      { title: 'Weekly cleaning is cheaper than you think', detail: 'A 2-hour weekly clean at $49/hr is $98/week — $392/month. That\'s less than most gym memberships, less than a weekly dinner out, and you get a spotless apartment every single week in return.' },
      { title: 'Pick the same day each week', detail: 'Consistency is key. When your cleaner comes every Tuesday, for example, your apartment never has time to get dirty. By Thursday you\'re still enjoying a fresh home, and by Monday there\'s only a few days of light accumulation.' },
      { title: 'Your cleaner becomes an extension of your household', detail: 'After a few weeks, your assigned cleaner knows your home inside out — where dust collects, how you like your kitchen, which products to use on your countertops. This familiarity translates directly into better, faster cleaning.' },
      { title: 'Provide supplies for maximum savings', detail: 'Weekly clients who provide their own vacuum, mop, and products save $32/visit ($16/hr × 2 hrs). Over a year, that\'s $1,664 in savings while getting the exact same quality of work.' },
    ],
    educationSections: [
      {
        heading: 'Weekly vs. Bi-Weekly — Which Schedule Is Right?',
        body: [
          'Weekly service keeps your apartment in near-perfect condition at all times. Bi-weekly lets it get a bit dirtier between visits, which means each cleaning takes slightly longer.',
          'For 1–2 person households with light usage, bi-weekly often works well. For families, pet owners, or anyone who cooks frequently, weekly is strongly recommended.',
          'The per-visit cost difference is minimal: a weekly 2-hour clean at $49/hr is $98. A bi-weekly clean might run 2.5–3 hours at $49/hr ($122–$147) because more buildup has accumulated.',
        ],
      },
    ],
    pricingNote: 'Weekly maid service typically costs $98–$195 per visit. Most 1-bedroom apartments need just 2 hours ($98 at $49/hr) per weekly visit. 2-bedrooms average 2.5 hours ($122). The weekly consistency keeps each visit short and affordable.',
    faqs: [
      { question: 'How much does weekly maid service cost in NYC?', answer: 'Weekly service is $49/hr with your supplies or $65/hr when we bring everything. Most 1-bedroom weekly cleans take 2 hours ($98–$130/visit). 2-bedrooms average 2.5 hours ($122–$162/visit). It\'s the most cost-effective way to maintain a spotless home.' },
      { question: 'Will I get the same cleaner every week?', answer: 'Yes. We specifically assign one cleaner to your home for all recurring visits. They learn your preferences, your space, and your standards. If your regular cleaner is unavailable, we\'ll notify you in advance and send a qualified replacement.' },
      { question: 'What day of the week can I schedule service?', answer: 'We offer Monday through Friday 8am–6pm and Saturday 9am–4pm. You choose your preferred day and time, and we keep that slot reserved for you every week.' },
      { question: 'What if I need to skip a week?', answer: 'We require 3 days notice to reschedule within the same week. If you need to cancel a service entirely, 7 days notice is required. Consistent scheduling protects our cleaners\' income and ensures availability for all clients.' },
    ],
  },

  'move-in-move-out-cleaning': {
    heroH1: 'NYC Move-In/Move-Out Cleaning — Protect Your Deposit',
    tipsTitle: 'NYC Moving Day Cleaning — What Every Renter Should Know',
    heroSubtitle: 'Get your full deposit back or move into a pristine home. We clean every inch of the empty space — inside cabinets, appliances, closets, and more.',
    whatIs: {
      heading: 'What Is Move-In/Move-Out Cleaning?',
      subheading: 'Move cleaning is the most thorough service we offer — designed specifically for empty apartments during the transition between occupants.',
      body: [
        'When you\'re moving out, your landlord expects the apartment to be returned in the same condition you received it. A professional move-out clean covers everything: inside every cabinet and drawer, full appliance cleaning (oven, fridge, dishwasher), closet interiors, wall spot cleaning, light switch and outlet plates, and window interiors.',
        'When you\'re moving in, even a "clean" apartment from the previous tenant usually isn\'t clean enough. Our move-in clean ensures you\'re unpacking into a truly sanitized, spotless space.',
        'Empty apartments are easier to clean because there\'s no furniture to work around — but they also reveal every mark, stain, and cobweb that furniture was hiding. That\'s exactly what we address.',
      ],
    },
    whenToBook: {
      title: 'When Do You Need Move-In/Move-Out Cleaning?',
      items: [
        'Moving out and want to get your full security deposit back',
        'Moving into a new apartment and want it professionally sanitized before unpacking',
        'Landlord or management company requires professional cleaning before lease turnover',
        'Preparing an apartment for real estate showings or open houses',
        'End of lease and the previous tenant didn\'t leave the apartment in acceptable condition',
        'Renovated apartment that needs a final post-construction and move-in clean combo',
      ],
    },
    nycTips: [
      { title: 'Book before your lease ends — not the day of', detail: 'Schedule your move-out clean 2–3 days before your lease end date. This gives you a buffer in case anything needs a second pass and ensures the apartment is spotless for the landlord walkthrough.' },
      { title: 'Empty apartment = faster, cheaper clean', detail: 'Move cleaning is most efficient when the apartment is fully empty. If possible, schedule after movers leave but before your lease expires. No furniture means we can clean floors, baseboards, and walls thoroughly.' },
      { title: 'Document everything with photos', detail: 'Take photos of the clean apartment before your landlord walkthrough. This protects your security deposit claim and shows the condition you left the unit in.' },
      { title: 'Ask your landlord what they expect', detail: 'Some NYC landlords have specific cleaning requirements for move-out. Ask beforehand so we can make sure everything on their checklist is covered.' },
    ],
    educationSections: [
      {
        heading: 'Move-Out Cleaning — Protect Your Security Deposit',
        body: [
          'NYC security deposits are typically one month\'s rent — that\'s $2,000–$5,000+ you could lose if the apartment isn\'t returned in acceptable condition. A professional move-out clean costs $260–$520 and virtually guarantees you get your full deposit back.',
          'We clean everything the landlord will inspect: inside oven and fridge, cabinet interiors, closet shelves and rods, bathroom tile and grout, window sills, baseboards, and all floors.',
          'It\'s the best ROI of any cleaning service — spend $300 to protect a $3,000 deposit.',
        ],
      },
      {
        heading: 'Move-In Cleaning — Start Fresh',
        body: [
          'Even if your new apartment looks clean, a professional move-in clean ensures it actually is. Previous tenants leave behind bacteria, allergens, dust, and residue that surface cleaning doesn\'t address.',
          'We sanitize kitchen and bathroom surfaces, clean inside all cabinets and drawers (where your dishes and clothes will go), scrub floors, and ensure you\'re moving into a genuinely clean space.',
          'Schedule the move-in clean after you get the keys but before the movers arrive. It\'s much faster and cheaper to clean an empty apartment.',
        ],
      },
    ],
    pricingNote: 'Move-in/move-out cleaning typically costs $260–$520 depending on apartment size and condition. A 1-bedroom usually takes 4–5 hours, a 2-bedroom 5–6 hours, and a 3-bedroom 6–8 hours. The cost to clean is a fraction of the security deposit you\'re protecting.',
    faqs: [
      { question: 'How much does move-in/move-out cleaning cost in NYC?', answer: 'Move cleaning is $49/hr with your supplies or $65/hr when we bring everything. A 1-bedroom typically costs $260–$325 (4–5 hours). A 2-bedroom runs $325–$390 (5–6 hours). A 3-bedroom+ is $390–$520 (6–8 hours). The exact cost depends on apartment condition.' },
      { question: 'Will move-out cleaning guarantee I get my deposit back?', answer: 'While we can\'t guarantee your landlord\'s decision, a professional move-out clean addresses every item landlords typically inspect. We clean inside appliances, cabinets, closets, baseboards, and all surfaces. Our clients overwhelmingly report getting their full deposits back.' },
      { question: 'Should I schedule the clean before or after moving furniture?', answer: 'After. An empty apartment is faster and cheaper to clean because we can access all floors, baseboards, walls, and corners without working around furniture. Schedule the clean after movers leave.' },
      { question: 'How far in advance should I book a move-out clean?', answer: 'Book at least 5–7 days in advance. Moving season (May–September) is our busiest time for this service, so earlier is better. We can sometimes accommodate last-minute requests but availability is limited.' },
      { question: 'Do you clean inside cabinets and closets?', answer: 'Yes — inside every cabinet, drawer, and closet is standard for move-in/move-out cleaning. We wipe down shelves, rods, interiors, and door faces. This is one of the key differences from a regular or deep clean.' },
      { question: 'Can you do a move-in and move-out clean on the same day?', answer: 'If both apartments are in the same area, yes. We can clean your move-out apartment in the morning and your new move-in apartment in the afternoon. Just coordinate the timing when booking.' },
    ],
  },

  'bi-weekly-cleaning': {
    heroH1: 'NYC Bi-Weekly Cleaning — Spotless Every Two Weeks, Half the Cost',
    tipsTitle: 'Bi-Weekly Cleaning Tips for NYC Apartment Dwellers',
    heroSubtitle: 'The perfect balance between spotless and budget-friendly. Every two weeks, your dedicated cleaner resets your home — so it never has the chance to get out of hand.',
    whatIs: {
      heading: 'What Is Bi-Weekly Cleaning?',
      subheading: 'Bi-weekly cleaning is a recurring service every two weeks — more thorough than weekly maintenance, more affordable than scheduling every seven days.',
      body: [
        'Bi-weekly cleaning is the most popular schedule for NYC couples, small apartments, and professionals who keep a relatively tidy home between visits. Your cleaner arrives every 14 days and performs a thorough cleaning of the entire apartment — kitchen, bathrooms, all surfaces, floors, and more.',
        'Because two weeks of buildup accumulates between visits, each bi-weekly clean is slightly more thorough than a weekly visit. Expect each session to run 2.5–4 hours depending on apartment size. Your cleaner will give extra attention to the kitchen, bathrooms, and high-traffic areas where grime builds up fastest.',
        'Like all recurring services, you get the same assigned cleaner every visit. They learn your home, your expectations, and your cleaning priorities. Over time, bi-weekly cleanings become faster and more efficient because your cleaner knows exactly what needs attention.',
      ],
    },
    whenToBook: {
      title: 'When Is Bi-Weekly the Right Schedule?',
      items: [
        'You keep a generally tidy home but want professional-level cleaning regularly',
        'You\'re a couple or individual — not a high-traffic household',
        'Weekly service feels like more than you need, but monthly isn\'t enough',
        'You want a consistent cleaning routine without the weekly cost',
        'You\'re budget-conscious but don\'t want to sacrifice cleanliness',
        'You have a small apartment (studio or 1-bedroom) that doesn\'t get very dirty',
      ],
    },
    nycTips: [
      { title: 'Bi-weekly is ideal for 1-bedroom apartments', detail: 'A 1-bedroom apartment with one or two occupants rarely needs weekly professional cleaning. Bi-weekly keeps it in excellent shape while saving you roughly $400/month compared to weekly service.' },
      { title: 'Do light maintenance between visits', detail: 'Quick tasks between bi-weekly cleanings — wiping down the kitchen counter after cooking, a fast bathroom wipe, running the vacuum — extend the "just cleaned" feeling and make your cleaner\'s job even more effective.' },
      { title: 'Consider upgrading to weekly during summer', detail: 'NYC summers bring more dust, allergens, and AC use. Many bi-weekly clients temporarily switch to weekly June–September, then drop back to bi-weekly in the fall. We make schedule changes easy.' },
      { title: 'Pair with a seasonal deep clean', detail: 'Bi-weekly maintenance keeps your apartment clean, but twice a year, book a deep clean to hit the areas that regular cleaning doesn\'t cover — inside appliances, baseboards, behind furniture.' },
    ],
    educationSections: [
      {
        heading: 'Bi-Weekly vs. Weekly — Which Schedule Saves More?',
        body: [
          'Bi-weekly service costs roughly half of weekly service over a year — that\'s $2,400–$5,000 in savings depending on apartment size.',
          'The trade-off: each bi-weekly cleaning takes slightly longer (and costs slightly more per visit) than a weekly clean because there\'s more buildup. A weekly 2-hour clean at $49/hr is $98/visit; a bi-weekly visit might run 2.5–3 hours for $122–$147.',
          'For most 1-bedroom and small 2-bedroom apartments with 1–2 occupants, bi-weekly provides the best value-to-cleanliness ratio. If you have kids, pets, or cook daily, weekly is usually worth the upgrade.',
        ],
      },
      {
        heading: 'What Gets Extra Attention on a Bi-Weekly Clean?',
        body: [
          'With 14 days between visits, certain areas need deeper attention than they would on a weekly schedule. Your cleaner will spend extra time on:',
          'Kitchen: stovetop degreasing, counter sanitization, sink deep polish, appliance exterior wipe-down, floor scrubbing.',
          'Bathrooms: toilet deep clean, shower/tub scrubbing, grout attention, mirror and glass, floor scrubbing.',
          'Floors: thorough vacuuming including under furniture edges, mopping with attention to corners and baseboards.',
          'Surfaces: detailed dusting of shelves, frames, electronics, and windowsills that accumulate visible dust over two weeks.',
        ],
      },
    ],
    pricingNote: 'Bi-weekly cleaning typically costs $120–$260 per visit. A 1-bedroom usually takes 2.5 hours ($122 at $49/hr). A 2-bedroom averages 3 hours ($147 at $49/hr). Over a year, that\'s roughly $3,200–$6,800 — about half the cost of weekly service.',
    faqs: [
      { question: 'How much does bi-weekly cleaning cost in NYC?', answer: 'Bi-weekly cleaning is $49/hr with your supplies or $65/hr when we bring everything. A 1-bedroom typically costs $122–$162 per visit (2.5 hours). A 2-bedroom runs $147–$195 (3 hours). You pay for time worked — no flat-rate markups.' },
      { question: 'Is bi-weekly enough for a 2-bedroom apartment?', answer: 'For 1–2 occupants who keep a reasonably tidy home, yes. If you have children, pets, or cook daily, weekly service may be a better fit. Many clients start bi-weekly and upgrade to weekly when they realize how much they enjoy a clean home.' },
      { question: 'Can I switch from bi-weekly to weekly later?', answer: 'Absolutely. Many clients start with bi-weekly and upgrade to weekly over time. We keep the same cleaner and simply adjust your schedule. Likewise, you can drop from weekly to bi-weekly if needed.' },
      { question: 'Do I get the same cleaner for bi-weekly service?', answer: 'Yes. All recurring clients — weekly, bi-weekly, or monthly — are assigned the same dedicated cleaner. They learn your home and your standards over time, which means better quality with every visit.' },
      { question: 'Should I start with a deep clean before bi-weekly service?', answer: 'We strongly recommend it. A deep clean establishes a spotless baseline that bi-weekly maintenance can sustain. Without it, the first 2–3 bi-weekly visits will essentially be catch-up cleans that take longer and cost more.' },
      { question: 'What\'s the cancellation policy for bi-weekly cleaning?', answer: '7 days notice to cancel the recurring service entirely. 3 days notice to reschedule a visit within the same week. This protects your cleaner\'s schedule and ensures consistent availability for all our recurring clients.' },
    ],
  },

  'monthly-cleaning': {
    heroH1: 'NYC Monthly Cleaning Service — A Professional Reset Every 30 Days',
    tipsTitle: 'Monthly Cleaning Strategies for NYC Homes & Apartments',
    heroSubtitle: 'A thorough monthly reset for your entire home. We go deeper than a regular clean, rotating through detailed tasks so every corner gets attention over time.',
    whatIs: {
      heading: 'What Is Monthly Cleaning Service?',
      subheading: 'Monthly cleaning is a deeper-than-regular recurring service — designed for people who maintain their own home day-to-day but want a professional reset once a month.',
      body: [
        'Monthly cleaning sits between a regular maintenance clean and a full deep clean. Each visit, your cleaner covers all the standard tasks — kitchen, bathrooms, surfaces, floors — plus rotates through deeper tasks like baseboard wipe-downs, window sill cleaning, cabinet fronts, and detailed bathroom scrubbing.',
        'Because 30 days pass between visits, monthly cleans take longer than weekly or bi-weekly — typically 3–5 hours. Your cleaner is doing more intensive work each visit to address a month\'s worth of dust, grime, and buildup.',
        'Monthly service is ideal for people who clean up after themselves regularly but want professional-quality results on the tasks that are hard to do yourself — bathroom deep scrubbing, thorough floor care, dust in hard-to-reach places, and kitchen degreasing.',
      ],
    },
    whenToBook: {
      title: 'When Does Monthly Cleaning Make Sense?',
      items: [
        'You already tidy up regularly but want a professional deep reset once a month',
        'You live alone or with a partner in a smaller apartment with light usage',
        'Budget is a consideration — monthly is the most affordable recurring option',
        'You own a second home or pied-à-terre that needs periodic professional attention',
        'You want to supplement your own cleaning with professional-grade work monthly',
        'You\'re between deep cleans and want to prevent buildup from getting out of hand',
      ],
    },
    nycTips: [
      { title: 'Monthly clients benefit most from a rotating deep task list', detail: 'Each month, ask your cleaner to focus on a different area in addition to the standard clean. Month 1: inside the fridge. Month 2: baseboards and trim. Month 3: window tracks. This way, every area gets professional attention over a quarter.' },
      { title: 'Schedule the same day each month for consistency', detail: 'Book the first Tuesday or last Friday of each month — whatever works. Consistent scheduling ensures your cleaner blocks the time and your apartment never goes more than 30 days between professional cleanings.' },
      { title: 'Monthly works best for minimal-mess lifestyles', detail: 'If you eat out frequently, travel often, or simply don\'t generate much mess, monthly cleaning is perfectly sufficient. You\'re paying for the professional touch on tasks that are tedious to do yourself.' },
      { title: 'Combine monthly service with a seasonal deep clean', detail: 'Many monthly clients book a full deep clean twice a year (spring and fall) and use monthly service for the other 10 months. This keeps your apartment in excellent condition year-round at the lowest possible cost.' },
    ],
    educationSections: [
      {
        heading: 'Monthly vs. Bi-Weekly — How to Decide',
        body: [
          'The core question: can your home stay reasonably clean for 30 days between professional cleanings?',
          'Monthly works for: singles and couples, small apartments, people who cook infrequently, minimal-mess lifestyles, and supplemental professional cleaning.',
          'Bi-weekly is better for: families, pet owners, frequent cooks, larger apartments (2BR+), and anyone who doesn\'t want to maintain between visits.',
          'Cost difference: monthly saves roughly $1,500–$3,000/year over bi-weekly service. If you\'re on the fence, start monthly and upgrade if you find yourself wishing for more frequent visits.',
        ],
      },
      {
        heading: 'Getting the Most From Your Monthly Cleaning',
        body: [
          'Preparation is key for monthly cleanings. Because your cleaner has more ground to cover, a few minutes of tidying before they arrive maximizes their cleaning time.',
          'Clear countertops and desks. Pick up clothes and personal items. Put dishes away. The less clutter your cleaner has to navigate, the more actual cleaning they can accomplish.',
          'Communicate your top priorities. If the bathroom bothers you most, say so. If you want extra time in the kitchen this month, let your cleaner know. Monthly cleans are long enough to accommodate focus areas.',
        ],
      },
    ],
    pricingNote: 'Monthly cleaning typically costs $147–$325 per visit. A 1-bedroom takes 3 hours ($147 at $49/hr). A 2-bedroom averages 3.5–4 hours ($171–$196). Over a year, that\'s roughly $1,764–$3,900 — the most budget-friendly recurring option.',
    faqs: [
      { question: 'How much does monthly cleaning cost in NYC?', answer: 'Monthly cleaning is $49/hr with your supplies or $65/hr when we bring everything. A 1-bedroom typically costs $147–$195 (3–4 hours). A 2-bedroom runs $171–$260 (3.5–5 hours). Monthly cleans take longer than weekly because there\'s more buildup to address.' },
      { question: 'Is monthly cleaning thorough enough?', answer: 'For people who maintain their home between visits, absolutely. Monthly cleaning goes deeper than a weekly maintenance clean — your cleaner has more time to address baseboards, window sills, cabinet fronts, and other areas that weekly clients don\'t need. It\'s a hybrid between regular and deep cleaning.' },
      { question: 'Can I add extra tasks to my monthly cleaning?', answer: 'Yes. Monthly sessions are longer, which gives room for rotating deep tasks. Let us know if you want the fridge cleaned, baseboards scrubbed, or any other specific focus area for a particular visit.' },
      { question: 'Do I get the same cleaner each month?', answer: 'Yes. Like all our recurring services, monthly clients are assigned the same dedicated cleaner. They visit your home on the same day each month and learn your preferences over time.' },
      { question: 'Should I get a deep clean before starting monthly service?', answer: 'Recommended but not required. If your apartment hasn\'t been professionally cleaned in a while, an initial deep clean gives your monthly cleaner a clean baseline to maintain. Without it, the first 1–2 monthly visits will be more intensive.' },
      { question: 'What\'s the cancellation policy for monthly cleaning?', answer: '7 days notice to cancel the service entirely. 3 days notice to reschedule within the same week. These policies protect our cleaners\' schedules and ensure consistent availability.' },
    ],
  },

  'post-renovation-cleaning': {
    heroH1: 'NYC Post-Construction Cleanup — Make Your Renovation Livable',
    roomsTitle: 'What Gets Cleaned After a NYC Apartment Renovation',
    tipsTitle: 'Post-Renovation Cleanup Tips for NYC Co-ops & Condos',
    heroSubtitle: 'Construction dust doesn\'t just sit on surfaces — it gets into vents, behind walls, inside cabinets, and everywhere you can\'t see. We eliminate every particle so your renovation actually feels finished.',
    whatIs: {
      heading: 'What Is Post-Construction Cleanup?',
      subheading: 'Post-renovation cleaning is a specialized service that removes construction dust, debris, adhesive residue, paint splatter, and fine particulate from every surface in your newly renovated space.',
      body: [
        'After a renovation, your apartment looks new — but it\'s far from clean. Construction dust is ultra-fine and coats everything: inside cabinets, on top of door frames, inside light fixtures, in vent returns, and on every horizontal surface. Standard cleaning doesn\'t cut it — this requires specialized tools and techniques.',
        'Post-construction cleanup typically happens in two phases. The first pass removes debris, bulk dust, and visible residue. The second pass is a detailed wipe-down of every surface, fixture, and opening. For major renovations, a third pass may be needed to catch the fine dust that resettles after the first two rounds.',
        'This is our most intensive service. A full apartment renovation cleanup can take 5–10 hours depending on the scope of work. Kitchen and bathroom renovations produce the most dust and debris due to tile cutting, grouting, and demolition.',
      ],
    },
    rooms: [
      { room: 'All Surfaces', tasks: ['Wipe every horizontal surface (shelves, ledges, sills)', 'Clean top of door frames and baseboards', 'Wipe light switch plates and outlet covers', 'Clean window interiors and tracks', 'Wipe cabinet interiors and exteriors', 'Detail ceiling fan blades and light fixtures'] },
      { room: 'Kitchen', tasks: ['Clean inside all cabinets and drawers', 'Degrease and sanitize countertops', 'Clean inside and behind appliances', 'Remove adhesive, caulk, or grout residue', 'Scrub sink and polish fixtures', 'Detail backsplash tile and grout'] },
      { room: 'Bathroom', tasks: ['Remove grout haze from new tile', 'Clean inside vanity and medicine cabinet', 'Polish all new fixtures', 'Scrub shower/tub surfaces', 'Remove construction film from glass', 'Clean exhaust fan and vent'] },
      { room: 'Floors', tasks: ['Vacuum all hard floors with HEPA filter', 'Wet-mop all hard surfaces', 'Vacuum carpet and rugs thoroughly', 'Remove paint drips or adhesive from floors', 'Clean baseboards and trim', 'Polish or treat hardwood as needed'] },
    ],
    whenToBook: {
      title: 'When Do You Need Post-Construction Cleanup?',
      items: [
        'After a full apartment renovation — gut reno, kitchen remodel, bathroom overhaul',
        'After a kitchen or bathroom remodel that involved tile, grout, or demo work',
        'After painting — even a simple repaint leaves fine paint dust and splatter',
        'After new flooring installation — hardwood, tile, or LVP all generate cutting dust',
        'After any construction that produced dust, debris, or adhesive residue',
        'Before moving into a newly built or newly renovated apartment',
      ],
    },
    nycTips: [
      { title: 'Wait 24-48 hours after construction ends', detail: 'Fine construction dust stays airborne for hours after work stops. Let it settle for 1–2 days before scheduling your cleanup. This ensures we capture the majority of settled dust in one thorough pass rather than needing a follow-up.' },
      { title: 'Expect 2 passes for major renovations', detail: 'After a gut renovation or full kitchen remodel, one cleaning pass won\'t get it all. Ultra-fine drywall and grout dust resettles over 24–48 hours. Most clients book a thorough first pass, then a follow-up detail clean 2–3 days later.' },
      { title: 'Protect HVAC during renovation if possible', detail: 'If your renovation is still in progress, cover vent returns with plastic and change your HVAC filter immediately after construction. This prevents dust from circulating through your entire apartment for weeks after the reno.' },
      { title: 'NYC co-op and condo boards may require it', detail: 'Many NYC buildings require professional post-construction cleaning and sign-off before issuing a completion certificate. Ask your building manager about requirements — we can provide proof of service if needed.' },
      { title: 'Don\'t use your regular vacuum on construction dust', detail: 'Construction dust is finer than household dust and will destroy a standard vacuum filter. We use commercial HEPA-filtered vacuums designed for post-construction environments.' },
    ],
    educationSections: [
      {
        heading: 'Post-Construction Cleanup — What Makes It Different',
        body: [
          'Post-construction cleaning is fundamentally different from regular or deep cleaning. The type of dirt is different — construction dust, adhesive residue, paint splatter, and grout haze require different products, tools, and techniques than household grime.',
          'We use commercial HEPA vacuums that capture fine particulate without recirculating it into the air. We use specialized adhesive removers, grout haze cleaners, and paint splatter solvents that won\'t damage new finishes.',
          'The scope is also different. Every cabinet interior, every vent opening, every light fixture, every door frame, every window track — construction dust penetrates everywhere, and we clean everywhere.',
        ],
      },
      {
        heading: 'How Long Does Post-Construction Cleanup Take?',
        body: [
          'Duration depends entirely on the scope of renovation and apartment size.',
          'Bathroom remodel only: 3–4 hours. Limited scope, but tile dust and grout haze require careful attention.',
          'Kitchen remodel: 4–6 hours. Kitchens generate heavy dust from cabinet installation, tile work, and appliance fitting. Inside every cabinet and drawer must be cleaned.',
          'Full apartment renovation: 6–10 hours. Gut renovations produce the most dust and require the most thorough cleaning. Multiple passes may be needed.',
          'Paint-only renovation: 2–3 hours. Less intensive but still requires dusting, splatter removal, and window cleaning.',
        ],
      },
    ],
    pricingNote: 'Post-construction cleanup typically costs $325–$650 depending on renovation scope and apartment size. A bathroom remodel cleanup runs $245–$325 (3–5 hrs). A kitchen remodel is $325–$455 (5–7 hrs). A full apartment gut renovation is $455–$650+ (7–10 hrs). This is a one-time cost to make your investment livable.',
    faqs: [
      { question: 'How much does post-construction cleaning cost in NYC?', answer: 'Post-construction cleaning is $65/hr (we always bring our own commercial equipment for this service). A bathroom remodel cleanup costs $245–$325 (3–5 hours). Kitchen remodel: $325–$455 (5–7 hours). Full renovation: $455–$650+ (7–10 hours). Cost depends on renovation scope and apartment condition.' },
      { question: 'How soon after construction can you clean?', answer: 'We recommend waiting 24–48 hours after construction ends for dust to settle. For major renovations, we may schedule a thorough first pass, then a detail follow-up 2–3 days later to catch resettled fine dust.' },
      { question: 'Do you remove paint splatter from floors?', answer: 'Yes. We use professional-grade paint removers that are safe for hardwood, tile, and LVP flooring. For large areas of paint splatter, we\'ll address it as part of the floor cleaning phase. We cannot remove paint that has bonded into unsealed surfaces.' },
      { question: 'Can you clean while construction is still ongoing?', answer: 'We recommend waiting until all construction is complete. Cleaning during an active renovation means dust and debris will immediately re-accumulate. If you need an interim cleaning (for example, between phases), we can do that — but expect to book a final clean after all work ends.' },
      { question: 'Do you clean inside HVAC vents and ducts?', answer: 'We clean vent covers, registers, and the visible interior of duct openings. Full duct cleaning requires a specialized HVAC service. However, we strongly recommend changing your HVAC filter immediately after construction and again 30 days later.' },
      { question: 'Will one cleaning session be enough?', answer: 'For bathroom remodels and paint jobs, usually yes. For kitchen remodels and full renovations, most clients need two sessions — an initial thorough clean, then a detail pass 2–3 days later after fine dust resettles. We\'ll give you an honest assessment after the first visit.' },
      { question: 'Is post-construction cleaning required by NYC buildings?', answer: 'Many NYC co-op and condo boards require professional cleaning before issuing a construction completion certificate or releasing your alteration deposit. Check with your building management — we can provide a receipt and proof of service.' },
    ],
  },

  'same-day-cleaning': {
    heroH1: 'Same-Day Cleaning in NYC — A Pro at Your Door in Hours',
    tipsTitle: 'Last-Minute NYC Cleaning — How to Get It Done Today',
    heroSubtitle: 'Need your apartment cleaned today? We dispatch a professional cleaner to your door within hours. No compromises on quality — just faster scheduling.',
    whatIs: {
      heading: 'What Is Same-Day Cleaning Service?',
      subheading: 'Same-day cleaning is exactly what it sounds like — you call or text in the morning, and a professional cleaner is at your door by the afternoon.',
      body: [
        'Life happens. Unexpected guests, a landlord visit, a party you forgot about, or just waking up and deciding you can\'t stand the mess anymore. Same-day service gives you a professional cleaning with just a few hours\' notice.',
        'Same-day cleanings cover the same scope as our regular cleaning service — full kitchen, bathrooms, surfaces, floors, and more. The difference is priority scheduling and the $100/hr rate that compensates our cleaner for rearranging their day.',
        'Availability depends on the day and time you contact us. Morning requests have the best availability for afternoon service. We\'ll be upfront about timing — if we can\'t get someone to you today, we\'ll offer the earliest available slot.',
      ],
    },
    whenToBook: {
      title: 'When Do You Need Same-Day Cleaning?',
      items: [
        'Unexpected guests arriving tonight — parents, in-laws, friends passing through NYC',
        'Landlord or management company scheduling a surprise inspection',
        'Post-party cleanup — the apartment is a disaster and you need it handled today',
        'You\'re hosting dinner tonight and the apartment needs professional attention',
        'After illness — you\'re finally feeling better and want the apartment sanitized',
        'Real estate showing or open house scheduled on short notice',
        'You simply woke up and decided today is the day your apartment gets clean',
      ],
    },
    nycTips: [
      { title: 'Text us early for best availability', detail: 'Same-day requests sent before 10am have the best chance of afternoon availability. After noon, same-day availability drops significantly. Text (212) 202-8400 as early as possible for the best shot at a same-day slot.' },
      { title: 'Prioritize the rooms your guests will see', detail: 'If guests are arriving tonight, tell your cleaner to start with the bathroom and living areas — the spaces guests actually use. Kitchen next. Bedrooms last. This way, even if time runs short, the important rooms are spotless.' },
      { title: 'Same-day is a premium service — plan ahead when possible', detail: 'At $100/hr, same-day service costs roughly double our regular rate. If you know you\'ll need cleaning this week, booking 2–3 days ahead at $49–$65/hr saves significant money. Same-day is for genuine emergencies.' },
      { title: 'Keep a set of supplies ready', detail: 'Same-day cleaners may not have time to bring a full supply kit. Having a basic set at home — spray cleaner, paper towels, trash bags, a vacuum — ensures the cleaner can start immediately without supply delays.' },
    ],
    educationSections: [
      {
        heading: 'Same-Day vs. Regular — Why the Price Difference?',
        body: [
          'Same-day cleaning is $100/hr compared to $49–$65/hr for scheduled service. The premium covers the operational reality of last-minute scheduling.',
          'When you book same-day, we\'re rearranging a cleaner\'s existing schedule, handling logistics in real-time, and guaranteeing you a professional within hours. Our cleaners who take same-day jobs earn a premium for their flexibility.',
          'The quality of cleaning is identical. You\'re getting the same background-checked, insured, experienced cleaner doing the same thorough work. The only difference is the scheduling priority.',
          'If cost is a concern, consider booking 2–3 days in advance at our standard rate. The cleaning will be the same — you\'ll just save 50% or more.',
        ],
      },
      {
        heading: 'How to Maximize a Same-Day Clean',
        body: [
          'Time is limited with same-day service, so preparation helps your cleaner be maximally efficient.',
          'Do a 15-minute tidy before they arrive: pick up clothes, clear counters, put dishes in the sink. This saves your cleaner 30+ minutes of organizing and gives them more time for actual cleaning.',
          'Be specific about priorities. Tell us which rooms matter most, what you care about, and what can be skipped if time runs short. A focused 2-hour clean on the kitchen, bathroom, and living room beats a rushed 2-hour clean of the whole apartment.',
          'If guests are coming, think about what they\'ll see. Entryway, living room, bathroom, and kitchen usually matter most. Close bedroom doors and focus resources on the common areas.',
        ],
      },
    ],
    pricingNote: 'Same-day cleaning is $100/hr flat. A focused 2-hour clean is $200. A thorough 3–4 hour apartment clean is $300–$400. For non-urgent needs, scheduling 2+ days ahead at $49–$65/hr saves 35–50%.',
    faqs: [
      { question: 'How much does same-day cleaning cost in NYC?', answer: 'Same-day cleaning is $100/hr flat. A typical 2-hour focused clean costs $200. A thorough 3-hour apartment clean is $300. This premium rate compensates our cleaner for last-minute schedule changes. For non-urgent needs, scheduling in advance saves 35–50%.' },
      { question: 'How quickly can you get a cleaner to my apartment?', answer: 'For morning requests (before 10am), we can typically have a cleaner at your door by early afternoon — within 3–5 hours. Afternoon requests are harder to accommodate same-day. We\'ll always give you an honest timeline when you reach out.' },
      { question: 'Is same-day cleaning the same quality as regular service?', answer: 'Identical. You\'re getting the same background-checked, insured, experienced cleaners doing the same thorough work. The only difference is the scheduling urgency and the premium rate that compensates for last-minute logistics.' },
      { question: 'What if no cleaner is available today?', answer: 'If we can\'t accommodate same-day, we\'ll offer the earliest available slot — often the next morning. We\'d rather be honest about availability than send someone who can\'t do the job properly.' },
      { question: 'Can I request a same-day deep clean?', answer: 'Same-day availability is best suited for regular-scope cleaning (2–4 hours). A full deep clean requires 4–8 hours, which is difficult to fit into a same-day schedule. If you need a deep clean urgently, we\'ll do our best to arrange it but recommend booking at least 24 hours ahead.' },
      { question: 'How do I book same-day service?', answer: 'Text or call (212) 202-8400 as early in the day as possible. Text is fastest — we\'ll confirm availability and estimated arrival time within minutes. Morning requests before 10am have the best availability for afternoon service.' },
    ],
  },

  'airbnb-cleaning': {
    heroH1: 'NYC Airbnb & Short-Term Rental Cleaning — 5-Star Turnovers Guaranteed',
    tipsTitle: 'Airbnb Hosting Tips From NYC\'s Go-To Turnover Cleaners',
    heroSubtitle: 'Fast, reliable turnover cleaning between guests — with a strict checklist, linen change, and photo-ready staging. Protect your 5-star reviews with every single turnover.',
    whatIs: {
      heading: 'What Is Airbnb & Short-Term Rental Cleaning?',
      subheading: 'Airbnb cleaning is a rapid, thorough turnover service designed to get your rental guest-ready between check-out and check-in — every single time, without fail.',
      body: [
        'Short-term rental cleaning is different from residential cleaning. Speed matters — your next guest may be checking in just hours after the last one left. Consistency matters — every turnover must meet the same standard or your reviews suffer. Reliability matters — a missed or late turnover means a bad guest experience and potential refund.',
        'Our Airbnb cleaning service includes a full clean of the entire unit, complete linen and towel change, amenity restocking check, trash and recycling removal, and a final walkthrough to ensure the space is photo-ready. We follow a standardized checklist so nothing gets missed.',
        'We work with hosts managing single listings and multi-unit operators. For regular hosts, we coordinate turnovers with your booking calendar so you never have to think about scheduling — we just show up and handle it.',
      ],
    },
    whenToBook: {
      title: 'When Do You Need Airbnb Cleaning?',
      items: [
        'Between every guest checkout and check-in — this is your core turnover service',
        'After a longer stay (7+ nights) that requires deeper attention than a standard turnover',
        'Before your listing goes live — a deep clean + professional photos sets the right tone',
        'After a problematic guest who left the unit in worse condition than expected',
        'Seasonal deep clean to maintain overall unit quality between busy booking periods',
        'Setting up a new short-term rental with initial deep clean and staging',
      ],
    },
    nycTips: [
      { title: 'Build turnover time into your booking gaps', detail: 'Schedule at least a 4-hour gap between checkout and check-in. A 1-bedroom turnover takes 1.5–2 hours, but you need buffer time for late checkouts, restocking, and any unexpected issues. Tight turnovers lead to rushed cleans and bad reviews.' },
      { title: 'Keep a standardized supply kit at each unit', detail: 'Store extra linens, towels, toiletries, and cleaning supplies at the property. Your cleaner shouldn\'t have to bring everything — a well-stocked unit means faster turnovers and consistent guest experience.' },
      { title: 'Create a custom checklist for your listing', detail: 'Every Airbnb is different. Share a specific checklist with your cleaner: how you fold towels, where amenities go, which lights to leave on, what the thermostat should be set to. Consistency across turnovers protects your rating.' },
      { title: 'Photography-ready is the standard', detail: 'Your unit should look exactly like your listing photos after every turnover. That means beds made to hotel standards, towels folded or arranged, counters completely clear, and no trace of the previous guest. This is what earns 5-star cleanliness reviews.' },
    ],
    educationSections: [
      {
        heading: 'Airbnb Cleaning vs. Regular Residential Cleaning',
        body: [
          'Airbnb cleaning is a fundamentally different service than residential cleaning. The priorities, pace, and checklist are all different.',
          'Speed: turnovers happen in a tight window. A 1-bedroom should take 1.5–2 hours max. Your cleaner needs to be efficient and systematic.',
          'Consistency: every turnover must produce the same result. Guests expect the unit to look like the listing photos every single time. A detailed checklist ensures nothing varies.',
          'Extras: linen changes, towel folding, amenity restocking, trash removal, and staging are standard for Airbnb but not for regular residential cleaning.',
          'Reliability: a no-show or late cleaner means a guest walks into a dirty unit. We treat Airbnb turnovers as time-critical appointments with zero margin for error.',
        ],
      },
      {
        heading: 'How to Price Your Airbnb Cleaning Fee',
        body: [
          'Most NYC Airbnb hosts charge a $75–$150 cleaning fee to guests, which covers (or partially covers) the turnover cost.',
          'Our turnover service costs $49–$65/hr — a 1-bedroom turnover at 1.5–2 hours runs $75–$130. A 2-bedroom takes 2–2.5 hours at $98–$162.',
          'Set your Airbnb cleaning fee to roughly match your actual cost. Guests expect to pay a cleaning fee — it\'s standard on the platform. Eating the cost to lower your nightly rate rarely improves bookings enough to justify it.',
          'For frequent turnovers (2+ per week), we offer scheduling consistency that ensures the same cleaner handles your unit every time. Consistency means faster turnovers and fewer mistakes.',
        ],
      },
    ],
    pricingNote: 'Airbnb turnover cleaning costs $75–$195 per session. A studio turnover takes 1.5 hours ($75–$98). A 1-bedroom takes 1.5–2 hours ($75–$130). A 2-bedroom takes 2–3 hours ($98–$195). Most hosts pass this cost through as a guest cleaning fee.',
    faqs: [
      { question: 'How much does Airbnb turnover cleaning cost?', answer: 'Turnover cleaning is $49/hr with supplies on-site or $65/hr when we bring everything. A studio runs $75–$98 (1.5 hours). A 1-bedroom is $75–$130 (1.5–2 hours). A 2-bedroom is $98–$195 (2–3 hours). Most hosts set their Airbnb cleaning fee to match.' },
      { question: 'Can you coordinate with my booking calendar?', answer: 'Yes. For regular hosts, we can sync with your booking schedule so turnovers are automatically scheduled between guests. You share your calendar, we handle the rest. No need to text us before every turnover.' },
      { question: 'What does the turnover include?', answer: 'Full clean of all rooms, complete linen and towel change (with your provided linens), amenity restocking check, trash and recycling removal, dishwasher run/unload, and a final walkthrough to ensure photo-ready condition. We follow a standardized checklist customized to your listing.' },
      { question: 'Do you provide linens and toiletries?', answer: 'We clean with your linens and check your amenity stock. We don\'t provide linens or toiletries — but we can alert you when supplies are running low so you can restock. Many hosts keep backup sets at the property.' },
      { question: 'How quickly can you turn a unit around?', answer: 'A standard 1-bedroom turnover takes 1.5–2 hours. We recommend building a 4-hour gap between checkout and check-in to account for late checkouts and any unexpected issues. For same-day tight turnovers, communicate early and we\'ll prioritize speed.' },
      { question: 'What happens if the previous guest left the unit in bad condition?', answer: 'Standard turnovers cover normal guest mess. If a guest left excessive damage (stains, broken items, extreme mess), the turnover may take longer. We\'ll photograph the condition, notify you, and continue cleaning. Document everything for your Airbnb damage claim.' },
    ],
  },

  'office-cleaning': {
    heroH1: 'NYC Office Cleaning — Keep Your Workspace Healthy & Professional',
    tipsTitle: 'Office Cleaning Best Practices for NYC Businesses',
    heroSubtitle: 'A clean workspace isn\'t optional — it affects health, productivity, and how clients perceive your business. We keep your office spotless so you can focus on the work that matters.',
    whatIs: {
      heading: 'What Is Professional Office Cleaning?',
      subheading: 'Office cleaning is a commercial cleaning service designed for small offices, co-working spaces, medical practices, and professional suites across NYC.',
      body: [
        'Office cleaning goes beyond aesthetics — it\'s about health, productivity, and professional image. Shared workspaces accumulate bacteria on keyboards, phones, door handles, and common areas. Break rooms and restrooms need daily sanitization. Client-facing areas need to look polished at all times.',
        'Our office cleaning service covers desk and workstation sanitization, common area cleaning, kitchen/break room deep cleaning, restroom sanitization, trash and recycling, floor care, and high-touch surface disinfection. We can customize the scope to your office\'s specific needs.',
        'We serve offices during off-hours (early morning or evening) to minimize disruption to your team. For shared spaces and co-working offices, we can work around your hours. Scheduling is flexible — daily, weekly, bi-weekly, or on-demand.',
      ],
    },
    whenToBook: {
      title: 'When Does Your Office Need Professional Cleaning?',
      items: [
        'Your office doesn\'t currently have a cleaning service and it\'s starting to show',
        'Your current cleaning service is inconsistent or not meeting standards',
        'You\'re opening a new office and need regular cleaning from day one',
        'You have a medical or health-focused practice that requires strict sanitization',
        'Before a client visit, investor meeting, or office event',
        'After an office renovation or move-in for post-construction cleanup',
        'Cold and flu season — reduce illness transmission through professional sanitization',
      ],
    },
    nycTips: [
      { title: 'Schedule cleaning after business hours', detail: 'Most NYC offices get cleaned between 6–9pm or 6–8am. Off-hours cleaning means zero disruption to your team and no cleaners navigating around occupied desks. We\'ll work around your schedule.' },
      { title: 'Prioritize high-touch surfaces', detail: 'Door handles, elevator buttons, shared kitchen appliances, phone handsets, and conference tables are bacteria hotspots. Make sure these are wiped down with disinfectant at every cleaning — especially during cold and flu season.' },
      { title: 'A clean office reduces sick days', detail: 'Studies consistently show that regular professional office cleaning reduces employee sick days by 40–50%. The ROI is clear — the cost of a weekly clean is far less than the productivity lost to preventable illness.' },
      { title: 'Ask about green cleaning products', detail: 'Many NYC offices prefer eco-friendly cleaning products, especially in close-quarters spaces. We can use plant-based, low-VOC products that are effective without the chemical smell. Just request it when booking.' },
    ],
    educationSections: [
      {
        heading: 'Office Cleaning Frequency — How Often Is Enough?',
        body: [
          'The right frequency depends on your office size, headcount, and foot traffic.',
          'Daily cleaning is ideal for offices with 10+ employees, client-facing reception areas, medical practices, and any space where restrooms and kitchens see heavy use.',
          'Weekly cleaning works for small offices (2–8 people), especially those with low foot traffic and no public-facing areas.',
          'Bi-weekly is suitable for very small offices, private offices, or spaces used only part of the week.',
          'Most NYC offices with 5+ employees benefit from at least weekly professional cleaning. The cost is modest relative to rent and the impact on team morale and health.',
        ],
      },
      {
        heading: 'What to Expect From Professional Office Cleaning',
        body: [
          'A typical weekly office clean covers: trash and recycling from all stations, kitchen/break room cleaning (sink, counters, appliances, table), restroom sanitization (toilet, sink, mirror, restock), desk surface wiping (when desks are clear), floor vacuuming and mopping, and high-touch surface disinfection.',
          'Monthly add-ons might include: window interior cleaning, baseboard wipe-down, deep carpet cleaning, upholstery and chair cleaning, and light fixture dusting.',
          'We adapt to your office\'s needs. Let us know what matters most to your team and we\'ll build a custom scope.',
        ],
      },
    ],
    pricingNote: 'Office cleaning costs $49–$65/hr depending on supply arrangement. A small office (under 1,000 sqft) takes 2 hours ($98–$130/visit). A mid-size office (1,000–2,500 sqft) takes 3–4 hours ($147–$260). Larger spaces are quoted based on scope. Weekly clients get the most value.',
    faqs: [
      { question: 'How much does office cleaning cost in NYC?', answer: 'Office cleaning is $49/hr with your supplies or $65/hr when we bring everything. A small office (under 1,000 sqft) costs $98–$130 per visit. A mid-size office (1,000–2,500 sqft) runs $147–$260. Weekly service offers the best per-visit value.' },
      { question: 'Can you clean outside of business hours?', answer: 'Yes — most of our office clients prefer after-hours cleaning between 6–9pm or early morning 6–8am. We work around your team\'s schedule to minimize disruption.' },
      { question: 'Do you clean medical or dental offices?', answer: 'Yes. We follow enhanced sanitization protocols for medical and dental practices including EPA-registered disinfectants, proper waste handling, and attention to patient-facing areas. Let us know your specific requirements when booking.' },
      { question: 'What\'s included in a standard office cleaning?', answer: 'Trash and recycling from all workstations, kitchen/break room cleaning, restroom sanitization, desk surface wiping (when cleared), floor vacuuming and mopping, and high-touch surface disinfection (door handles, switches, shared equipment).' },
      { question: 'Can we customize the cleaning scope?', answer: 'Absolutely. Every office has different priorities. If your kitchen needs daily attention but desks only need weekly wiping, we\'ll adjust. We build a custom checklist based on your space and team\'s needs.' },
      { question: 'Do you provide cleaning supplies for offices?', answer: 'At $65/hr we bring all cleaning products and equipment. At $49/hr you provide supplies. For office clients, we recommend keeping a supply closet with basic products, trash bags, and paper goods — we\'ll handle the rest.' },
    ],
  },
}

// Fallback for services without rich content yet
const defaultRichContent: ServiceRichContent = {
  heroH1: '',
  heroSubtitle: '',
  whatIs: { heading: '', body: [] },
  whenToBook: { title: 'When Should You Book This Service?', items: [] },
  nycTips: [],
  educationSections: [],
  pricingNote: '',
  faqs: [],
}

export function getServiceRichContent(slug: string): ServiceRichContent | null {
  return richContentMap[slug] || null
}

// ============ FAQ CONTENT ============

export function neighborhoodFAQs(neighborhood: Neighborhood, area: Area): { question: string; answer: string }[] {
  return [
    {
      question: `How much does house cleaning cost in ${neighborhood.name}?`,
      answer: `Our cleaning services in ${neighborhood.name} start at $150 for regular cleaning and $250+ for deep cleaning. Pricing depends on home size, condition, and service type. We provide a custom quote based on your specific needs.`,
    },
    {
      question: `Do you serve all of ${neighborhood.name}?`,
      answer: `Yes! We serve all of ${neighborhood.name} and surrounding areas including ${neighborhood.nearby.slice(0, 2).map(s => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(' and ')}. Our cleaners are familiar with the local ${neighborhood.housing_types[0]} and ${neighborhood.housing_types[1]}.`,
    },
    {
      question: `Are your ${neighborhood.name} cleaners insured?`,
      answer: `Absolutely. All of our cleaners are fully licensed, insured, and background-checked. We carry general liability insurance and bonding for your peace of mind.`,
    },
    {
      question: `How do I book a cleaning in ${neighborhood.name}?`,
      answer: `You can book online through our website, call us at (212) 202-8400, or text us. We typically can schedule within 24-48 hours, with same-day availability for urgent requests.`,
    },
    {
      question: `What cleaning services do you offer in ${neighborhood.name}?`,
      answer: `We offer deep cleaning, regular recurring cleaning, move-in/move-out cleaning, post-renovation cleaning, office cleaning, and Airbnb turnover cleaning throughout ${neighborhood.name}, ${area.name}.`,
    },
  ]
}

export function serviceFAQs(service: Service): { question: string; answer: string }[] {
  return [
    {
      question: `What does ${service.name.toLowerCase()} include?`,
      answer: `Our ${service.name.toLowerCase()} includes: ${service.features.join(', ')}. Every cleaning is customized to your home's needs.`,
    },
    {
      question: `How much does ${service.name.toLowerCase()} cost?`,
      answer: `${service.name} pricing ranges from ${service.priceRange}, depending on your home size and condition. We provide accurate quotes after understanding your specific needs.`,
    },
    {
      question: `How long does ${service.name.toLowerCase()} take?`,
      answer: `A typical ${service.name.toLowerCase()} takes ${service.duration}. Time varies based on home size, current condition, and any special requests.`,
    },
    {
      question: `Who is ${service.name.toLowerCase()} ideal for?`,
      answer: `${service.name} is perfect for: ${service.idealFor.join(', ')}.`,
    },
  ]
}

// Common FAQs that apply to any service — used to pad to 25 total
export function commonServiceFAQs(service: Service): { question: string; answer: string }[] {
  return [
    { question: 'Are your cleaners background-checked?', answer: 'Yes. Every cleaner on our team undergoes a comprehensive background check before their first assignment. We also carry general liability insurance and bonding for your protection. You can trust that the person entering your home has been fully vetted.' },
    { question: 'Do I need to be home during the cleaning?', answer: 'No. Many clients leave a key, provide a door code, or arrange access through their doorman or building management. You\'re welcome to be home or away — whatever is most comfortable. We\'ll text you when we arrive and when we\'re done.' },
    { question: 'How do I book a cleaning?', answer: 'Text or call (212) 202-8400. Tell us your address, preferred date, and any special requests. We\'ll confirm your appointment and match you with a cleaner, usually within the hour. You can also book online at thenycmaid.com/book/new.' },
    { question: 'What areas do you serve?', answer: 'We serve all of Manhattan, Brooklyn, Queens, Long Island (North Shore), and northern New Jersey (Hudson County). Same rates everywhere — no travel surcharges regardless of location.' },
    { question: 'Do I pay before or after the cleaning?', answer: 'After. We never charge upfront or take deposits. You pay only after the cleaning is complete, before the cleaner leaves. We accept cash, Venmo, Zelle (hi@thenycmaid.com), and credit card.' },
    { question: 'What if I\'m not satisfied with the cleaning?', answer: 'Let us know within 24 hours and we\'ll send a cleaner back to address any issues at no additional cost. We stand behind our work — your satisfaction is non-negotiable.' },
    { question: 'Do you bring your own cleaning supplies?', answer: 'At $65/hr, yes — we bring professional-grade products, microfiber systems, and a commercial vacuum. At $49/hr, you provide your own supplies. Either way, we\'re happy to use specific products you prefer (eco-friendly, hypoallergenic, etc.).' },
    { question: 'Can I request a specific cleaner?', answer: 'For recurring services, we automatically assign the same cleaner to your home every visit. For one-time bookings, we match you with the best available cleaner for your area and service type.' },
    { question: 'How far in advance do I need to book?', answer: 'We recommend booking 3–5 days ahead for the best availability. For same-day service, text us as early as possible — morning requests before 10am have the best chance of afternoon availability.' },
    { question: `Is ${service.name.toLowerCase()} available on weekends?`, answer: 'We offer service Monday through Friday 8am–6pm and Saturday 9am–4pm. Saturday slots fill up fast, so book early if you prefer weekend service. We do not offer Sunday service.' },
    { question: 'What payment methods do you accept?', answer: 'We accept cash, Venmo, Zelle (hi@thenycmaid.com), and credit card (via Stripe). Payment is collected after the cleaning is complete, before the cleaner leaves. No deposits, no pre-authorization holds.' },
    { question: 'Are you licensed and insured?', answer: 'Yes. The NYC Maid is a fully licensed cleaning company with general liability insurance and bonding. Every cleaner is covered while working in your home. We can provide proof of insurance upon request.' },
    { question: 'Do you offer eco-friendly or green cleaning?', answer: 'Yes. If you prefer eco-friendly, plant-based, or hypoallergenic products, just let us know when booking. At $65/hr we can bring green products; at $49/hr you provide your preferred products and we\'ll use them.' },
    { question: `Can I combine ${service.name.toLowerCase()} with other services?`, answer: `Absolutely. Many clients combine services — for example, a deep clean followed by weekly maintenance, or a move-out clean with post-construction cleanup. Let us know what you need and we'll create a custom plan.` },
    { question: 'What if I need to cancel or reschedule?', answer: 'For one-time services, we have a no-cancellation policy once confirmed. For recurring services, we require 7 days notice to cancel and 3 days notice to reschedule within the same week. This protects our cleaners\' schedules.' },
    { question: 'Do you clean apartments, houses, or both?', answer: 'Both. We clean apartments (studios through 4+ bedrooms), townhouses, brownstones, single-family homes, lofts, and penthouses. The hourly rate is the same regardless of home type.' },
    { question: 'How do you handle pets during cleaning?', answer: 'We\'re pet-friendly. If you have pets, let us know when booking so we can match you with a pet-comfortable cleaner. We ask that aggressive animals be secured in a separate room during the cleaning for everyone\'s safety.' },
    { question: 'Do you offer gift certificates?', answer: 'Yes — cleaning makes a great gift. Text us at (212) 202-8400 to purchase a gift certificate in any amount. We\'ll send a digital certificate that the recipient can redeem for any service.' },
    { question: 'What happens if something is damaged during cleaning?', answer: 'We carry general liability insurance specifically for this reason. If a cleaner accidentally damages something in your home, report it within 24 hours and we\'ll work with you to resolve it through our insurance coverage.' },
    { question: 'Do you have a referral program?', answer: 'Yes. Refer a friend and earn money every time they book a cleaning — not just the first time. Visit thenycmaid.com/referral or text us for details. It\'s one of the most generous referral programs in NYC cleaning.' },
  ]
}
