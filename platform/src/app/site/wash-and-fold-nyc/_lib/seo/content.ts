// @ts-nocheck
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
    title: 'NYC Wash & Fold Laundry Service — $3/lb, Free Pickup & Delivery | The NYC Wash and Fold Service Company',
    metaDescription: 'NYC\'s top-rated laundry service. $3/lb wash & fold with free pickup and delivery across Manhattan, Brooklyn & Queens. Same-day rush +$20. $39 minimum. 5.0★ Google. (917) 970-6002',
    h1: 'NYC\'s #1 Laundry Service — $3/lb With Free Pickup & Delivery',
    subtitle: 'Professional wash and fold serving Manhattan, Brooklyn & Queens. $39 minimum order. Same-day rush +$20. 10% off weekly subscriptions.',
  }
}

// ============ AREA PAGES ============

const areaIntros: Record<string, string[]> = {
  manhattan: [
    'From luxury Upper East Side co-ops to Tribeca lofts, our Manhattan laundry team handles every type of home with care and precision.',
    'Manhattan\'s diverse housing — from pre-war apartments to modern high-rises — demands a laundry service that understands every building type.',
  ],
  brooklyn: [
    'Brooklyn\'s beautiful brownstones, converted lofts, and family homes deserve a laundry team that understands the borough.',
    'From Park Slope families to DUMBO professionals, our Brooklyn laundry team delivers fresh, folded results every time.',
  ],
  queens: [
    'Queens is NYC\'s most diverse borough, and our laundry team serves every neighborhood with reliable, thorough service.',
    'From Long Island City high-rises to Forest Hills gardens, we bring professional wash and fold laundry service to all of Queens.',
  ],
}

export function areaContent(area: Area) {
  const intros = areaIntros[area.slug] || areaIntros['manhattan']
  return {
    title: `${area.name} Wash & Fold — $3/lb Laundry Service With Free Pickup | The NYC Wash and Fold Service Company`,
    metaDescription: `Professional wash and fold in ${area.name} — $3/lb, free pickup & delivery, 24-48hr turnaround. Serving every ${area.name} neighborhood. (917) 970-6002`,
    h1: `${area.name} Wash & Fold — $3/lb Laundry With Free Pickup`,
    intro: pick(intros, area.slug),
  }
}

// ============ NEIGHBORHOOD PAGES ============

const introTemplates = [
  (n: Neighborhood) => `Looking for a reliable laundry service in ${n.name}? The NYC Wash and Fold Service Company has been trusted by ${n.name} residents for years, delivering spotless results in ${n.housing_types[0]}, ${n.housing_types[1]}, and more.`,
  (n: Neighborhood) => `${n.name} deserves a laundry team that understands its unique homes. From ${n.housing_types[0]} to ${n.housing_types[1]}, our laundry team handles every load with care.`,
  (n: Neighborhood) => `Your ${n.name} home should always feel fresh and welcoming. Our professional laundry team specializes in the ${n.housing_types[0]} and ${n.housing_types[1]} that make this neighborhood special.`,
  (n: Neighborhood) => `Residents of ${n.name} know their neighborhood is one of a kind — and their laundry service should be too. Near ${n.landmarks[0]}, we provide thorough, reliable cleaning tailored to local homes.`,
]

const h1Templates = [
  (n: Neighborhood) => `${n.name} Wash & Fold — $3/lb Laundry With Free Pickup`,
  (n: Neighborhood) => `Laundry Service in ${n.name} — $3/lb, Picked Up & Delivered Free`,
  (n: Neighborhood) => `${n.name} Laundry Pickup & Delivery — $3/lb, 24-Hour Turnaround`,
  (n: Neighborhood) => `Wash & Fold Near ${n.landmarks[0]} — ${n.name} Laundry From $3/lb`,
]

export function neighborhoodContent(neighborhood: Neighborhood, area: Area) {
  const seed = neighborhood.slug
  const intro = pick(introTemplates, seed)(neighborhood)
  const h1 = pick(h1Templates, seed, 1)(neighborhood)

  return {
    title: `${h1} | ${area.name}`,
    metaDescription: `Professional laundry service in ${neighborhood.name}, ${area.name} from $3/lb. Serving ${neighborhood.housing_types.slice(0, 2).join(', ')} near ${neighborhood.landmarks[0]}. 5.0★ Google. (917) 970-6002`,
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
  (n: Neighborhood, s: Service) => `Need ${s.name.toLowerCase()} in ${n.name}? Our professional laundry team specializes in ${s.name.toLowerCase()} for ${n.housing_types[0]} and ${n.housing_types[1]} throughout the neighborhood.`,
  (n: Neighborhood, s: Service) => `${n.name} residents trust The NYC Wash and Fold Service Company for expert ${s.name.toLowerCase()}. We understand the unique ${n.cleaning_challenges[0]} and ${n.cleaning_challenges[1]} that come with cleaning homes in this area.`,
  (n: Neighborhood, s: Service) => `Our ${s.name.toLowerCase()} service in ${n.name} is tailored to the neighborhood's ${n.housing_types[0]} and ${n.housing_types[1]}. Near ${n.landmarks[0]}, we deliver exceptional results every time.`,
  (n: Neighborhood, s: Service) => `From ${n.cleaning_challenges[0]} to ${n.cleaning_challenges[1]}, our ${s.name.toLowerCase()} team in ${n.name} handles it all. Trusted by local residents for thorough, reliable service.`,
]

const serviceH1Templates = [
  (n: Neighborhood, s: Service) => `${s.name} in ${n.name} — ${s.priceRange}, Free Pickup & Delivery`,
  (n: Neighborhood, s: Service) => `${n.name} ${s.name} — Picked Up & Delivered From ${s.priceRange}`,
  (n: Neighborhood, s: Service) => `Professional ${s.name} Near ${n.landmarks[0]} — ${n.name}, ${s.priceRange}`,
  (n: Neighborhood, s: Service) => `${s.name} for ${n.housing_types[0].charAt(0).toUpperCase() + n.housing_types[0].slice(1)} in ${n.name} — ${s.priceRange}`,
]

export function neighborhoodServiceContent(neighborhood: Neighborhood, service: Service, area: Area) {
  const seed = `${neighborhood.slug}-${service.slug}`
  const intro = pick(serviceIntroTemplates, seed)(neighborhood, service)
  const h1 = pick(serviceH1Templates, seed, 1)(neighborhood, service)

  const neighborhoodStory = `${neighborhood.name} is one of ${area.name}'s most distinctive neighborhoods. Home to ${neighborhood.housing_types.join(', ')}, the area is anchored by landmarks like ${neighborhood.landmarks.slice(0, 2).join(' and ')}. Residents here know that convenience matters — and that is exactly why ${service.name.toLowerCase()} with free pickup and delivery has become one of the most requested services in ${neighborhood.name}. Whether you live in a ${neighborhood.housing_types[0]} near ${neighborhood.landmarks[0]} or a ${neighborhood.housing_types[1]} closer to ${neighborhood.landmarks[1] || neighborhood.landmarks[0]}, our service reaches every building in the neighborhood.`

  const pricingDetail = `${service.name} in ${neighborhood.name} is ${service.priceRange} with a $39 minimum order. Pickup and delivery is always free — we come to your door, your lobby, or your doorman. Same-day rush service is available for a flat $20 fee on orders placed before 10am. Weekly subscribers save 10 percent, biweekly subscribers save 5 percent. ${neighborhood.name} residents pay the exact same rate as every other neighborhood we serve across ${area.name} — no distance surcharges, no zone fees, no surge pricing. The price on our website is the price on your bill.`

  const processDetail = `Here is exactly what happens when you book ${service.name.toLowerCase()} in ${neighborhood.name}: You text or call (917) 970-6002 with your address and what you need. We confirm pricing and schedule a pickup time that works for you. Our driver arrives at your ${neighborhood.name} address — whether that is a ${neighborhood.housing_types[0]}, a ${neighborhood.housing_types[1]}, or any other building type in the area. Your laundry is taken to our partner facility, sorted by color and fabric type, pre-treated for stains, washed with premium detergent, dried on appropriate heat settings, hand-folded item by item, organized by garment type, and packaged in clean sealed bags. We deliver back to your door within ${service.duration}. You pay after delivery.`

  const comparisonText = `Most ${neighborhood.name} residents have three options for laundry: do it themselves, go to a neighborhood laundromat, or use a service like The NYC Wash and Fold Service Company. Doing it yourself means hauling bags, finding available machines, waiting through cycles, and spending your evening folding. A laundromat in ${neighborhood.name} costs $2.50 to $4.00 per load in machine fees alone — before detergent, your time, and the commute. With our ${service.name.toLowerCase()} service, you text a number, leave a bag at your door, and get it back clean and folded. At ${service.priceRange}, most ${neighborhood.name} residents find it costs about the same as the laundromat when you factor in time, supplies, and convenience — except you get your evenings and weekends back.`

  return {
    title: `${service.name} in ${neighborhood.name}, ${area.name} — ${service.priceRange} | The NYC Wash and Fold Service Company`,
    metaDescription: `${service.name} in ${neighborhood.name}, ${area.name}. ${service.priceRange}, free pickup & delivery. ${service.features.slice(0, 2).join(', ')} & more. 5.0★ Google. (917) 970-6002`,
    h1,
    intro,
    neighborhoodStory,
    pricingDetail,
    processDetail,
    comparisonText,
    whyUs: [
      `Local ${neighborhood.name} expertise — we know the ${neighborhood.housing_types[0]} and ${neighborhood.housing_types[1]} here`,
      `Specialized in ${neighborhood.cleaning_challenges[hashCode(seed) % neighborhood.cleaning_challenges.length]} common in this area`,
      `${service.priceRange} with free pickup and delivery to your door`,
      `${service.duration} turnaround — fast, reliable, consistent`,
      'Your laundry is processed separately — never mixed with other orders',
      'Premium detergent, stain pre-treatment, hand-folded every item',
      'Text updates at pickup, processing, and delivery',
      'Licensed, insured, and background-checked team',
      'Satisfaction guaranteed on every order',
    ],
  }
}

// ============ SERVICE PAGES ============

export function serviceContent(service: Service) {
  return {
    title: `${service.name} in NYC — ${service.priceRange}, Free Pickup & Delivery | The NYC Wash and Fold Service Company`,
    metaDescription: `Professional ${service.name.toLowerCase()} across Manhattan, Brooklyn & Queens. ${service.priceRange}, free pickup & delivery. ${service.features.slice(0, 2).join(', ')} & more. 5.0★ Google. (917) 970-6002`,
    h1: `NYC ${service.name} — ${service.priceRange} With Free Pickup & Delivery`,
    intro: service.description,
  }
}

// ============ RICH SERVICE PAGE CONTENT ============

interface RichSection {
  heading: string
  subheading?: string
  body: string[]
}


// ============ FAQ CONTENT ============

export function neighborhoodFAQs(neighborhood: Neighborhood, area: Area): { question: string; answer: string }[] {
  return [
    {
      question: `How much does wash and fold cost in ${neighborhood.name}?`,
      answer: `Wash and fold in ${neighborhood.name} is $3 per pound with a $39 minimum order. Free pickup and delivery to any address in ${neighborhood.name}. Same-day rush is +$20. Weekly subscribers save 10%. These are the same rates across all of ${area.name} — no neighborhood surcharges.`,
    },
    {
      question: `Do you pick up laundry in ${neighborhood.name}?`,
      answer: `Yes, we offer free pickup and delivery throughout ${neighborhood.name} and surrounding areas including ${neighborhood.nearby.slice(0, 3).map(s => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(', ')}. We pick up from your door, lobby, or doorman. Text (917) 970-6002 with your ${neighborhood.name} address to schedule.`,
    },
    {
      question: `How fast is laundry turnaround in ${neighborhood.name}?`,
      answer: `Standard turnaround for ${neighborhood.name} is 24 to 48 hours. Same-day rush is available for +$20 on orders picked up before 10am. Weekly subscription customers in ${neighborhood.name} typically get under-24-hour turnaround.`,
    },
    {
      question: `Do you serve ${neighborhood.housing_types[0]} in ${neighborhood.name}?`,
      answer: `Yes. We serve all building types in ${neighborhood.name} including ${neighborhood.housing_types.join(', ')}. Whether you have a doorman, a lobby, or a walkup — we coordinate pickup and delivery to work with your building.`,
    },
    {
      question: `What laundry services do you offer in ${neighborhood.name}?`,
      answer: `In ${neighborhood.name} we offer wash and fold ($3/lb), pickup and delivery (free), dry cleaning ($10-$350/item), comforter cleaning ($35-$55), in-unit laundry service ($45-$85/visit), in-building laundry service ($50-$90/visit), and commercial laundry ($1-$2/lb). All with free pickup and delivery.`,
    },
    {
      question: `Is there a minimum order in ${neighborhood.name}?`,
      answer: `The minimum order for pickup and delivery in ${neighborhood.name} is $39. At $3/lb, that is about 13 pounds — most individual orders are 15+ pounds so most customers hit it easily.`,
    },
    {
      question: `Do you offer dry cleaning pickup in ${neighborhood.name}?`,
      answer: `Yes. We pick up dry cleaning from your ${neighborhood.name} address and deliver it back clean and pressed. Dress shirts $10, suits $34, dresses $28, winter coats $45. Free pickup and delivery on all dry cleaning orders.`,
    },
    {
      question: `Can I get a subscription plan in ${neighborhood.name}?`,
      answer: `Yes. ${neighborhood.name} residents can subscribe to weekly (10% off) or biweekly (5% off) laundry service. Weekly 15 lb plan is $162/mo, weekly 20 lb is $216/mo, biweekly 15 lb is $85.50/mo. Same driver every pickup, consistent schedule, pause or cancel anytime.`,
    },
  ]
}

export function serviceFAQs(service: Service): { question: string; answer: string }[] {
  return [
    {
      question: `What does ${service.name.toLowerCase()} include?`,
      answer: `Our ${service.name.toLowerCase()} includes: ${service.features.join(', ')}. Every order is processed separately — your laundry never mixes with anyone else's.`,
    },
    {
      question: `How much does ${service.name.toLowerCase()} cost?`,
      answer: `${service.name} is ${service.priceRange}. Free pickup and delivery on orders over $39. Same-day rush is +$20. Weekly subscribers save 10%, biweekly save 5%.`,
    },
    {
      question: `How long does ${service.name.toLowerCase()} take?`,
      answer: `Standard turnaround for ${service.name.toLowerCase()} is ${service.duration}. Same-day rush is available for +$20 on orders received before 10am.`,
    },
    {
      question: `Who is ${service.name.toLowerCase()} ideal for?`,
      answer: `${service.name} is perfect for: ${service.idealFor.join(', ')}. Whether you need a one-time order or recurring service, we handle it all.`,
    },
    {
      question: `Is pickup free for ${service.name.toLowerCase()}?`,
      answer: `Yes. Pickup and delivery is free on all ${service.name.toLowerCase()} orders over the $39 minimum. We pick up from your door, lobby, or doorman and deliver back within ${service.duration}.`,
    },
    {
      question: `Can I get recurring ${service.name.toLowerCase()}?`,
      answer: `Yes. Weekly subscribers get 10% off and biweekly subscribers get 5% off. You get the same pickup day, the same driver, and priority processing. Pause, skip, or cancel anytime.`,
    },
  ]
}

// Common FAQs that apply to any service — used to pad to 25 total
export function commonServiceFAQs(service: Service): { question: string; answer: string }[] {
  return [
    { question: 'Is your team background-checked?', answer: 'Yes. Every team member undergoes a comprehensive background check before handling any customer laundry. We also carry general liability insurance. Your garments and property are protected on every order.' },
    { question: 'Do I need to be home for pickup?', answer: 'No. Most customers leave their laundry bag with the doorman, at their front door, or in a designated spot. We text you when we pick up and when we deliver. You do not need to be present for either.' },
    { question: 'How do I schedule a pickup?', answer: 'Text or call (917) 970-6002 with your address and what you need. We confirm pricing and schedule a pickup, usually within a few hours. No app to download, no account to create.' },
    { question: 'What areas do you serve?', answer: 'We serve all of Manhattan, Brooklyn, and Queens — nearly 200 neighborhoods. Same rate everywhere, no distance surcharges.' },
    { question: 'When do I pay?', answer: 'After delivery. We never charge upfront or take deposits. Payment is collected when your clean, folded laundry is delivered back to you. We accept credit card, Zelle (hi@washandfoldnyc.com), Venmo, Apple Pay, and cash.' },
    { question: 'What if something goes wrong with my order?', answer: 'Contact us within 48 hours and we will make it right. We carry full liability insurance. Lost or damaged items are extremely rare because every order is processed separately and inventoried at pickup.' },
    { question: 'What detergent do you use?', answer: 'We use premium commercial-grade detergent. If you prefer fragrance-free, eco-friendly, or hypoallergenic detergent, just let us know — we accommodate all requests at no extra charge.' },
    { question: 'Can I get the same driver every time?', answer: 'Yes. Weekly and biweekly subscribers are assigned a consistent route driver for every pickup and delivery. This builds familiarity — your driver knows your building, your doorman, and your preferences.' },
    { question: 'How far in advance do I need to schedule?', answer: 'Most pickups can be scheduled same-day or next-day. For same-day rush (+$20), schedule before 10am. For standard 24-48 hour turnaround, anytime works. Subscription customers have a standing weekly schedule.' },
    { question: `Is ${service.name.toLowerCase()} available on weekends?`, answer: 'We accept pickup and delivery requests seven days a week. Typical pickup windows are 7am to 9pm. Weekend slots are popular, so schedule early for Saturday or Sunday pickup.' },
    { question: 'What payment methods do you accept?', answer: 'Credit card, debit card, Zelle (hi@washandfoldnyc.com), Venmo, Apple Pay, and cash. Subscription customers can set up automatic billing. One-time orders are charged at delivery.' },
    { question: 'Are you licensed and insured?', answer: 'Yes. The NYC Wash and Fold Service Company is fully licensed, bonded, and insured with general liability coverage. We can provide proof of insurance upon request. Every team member is background-checked.' },
    { question: 'Do you offer eco-friendly options?', answer: 'Yes. We offer fragrance-free, plant-based, and hypoallergenic detergent options at no extra cost. Just mention your preference when scheduling and we will use it on every order.' },
    { question: `Can I combine ${service.name.toLowerCase()} with other services?`, answer: `Yes. Many customers combine wash and fold with dry cleaning pickup, comforter cleaning, or commercial laundry for their business. Text us what you need and we will handle it all in one pickup.` },
    { question: 'What if I need to cancel?', answer: 'One-time orders can be cancelled before pickup with no charge. Subscription customers can pause, skip, or cancel anytime with no penalties. We do not lock you into contracts.' },
    { question: 'Do you handle all fabric types?', answer: 'Yes. We sort every load by fabric type and wash each on the appropriate setting — delicates on gentle, heavy items on normal, towels on hot. Items that are dry-clean-only are flagged and set aside. We follow care labels on every garment.' },
    { question: 'How do you prevent lost items?', answer: 'Every order is tagged with your name and order number at pickup. Your laundry is processed in its own separate batch — it never mixes with anyone else. We do an inventory count at pickup and cross-check at delivery. Lost items are extremely rare.' },
    { question: 'Do you fold everything?', answer: 'Yes, every single item is hand-folded by a trained professional. Shirts are folded flat, pants are creased, towels are stacked, socks are paired, and everything is organized by garment type. When you open your bag, it is ready to put directly into drawers.' },
    { question: 'What happens if it rains on delivery day?', answer: 'Your laundry is packaged in sealed bags that protect against weather. If conditions are severe, we will coordinate with you to reschedule or find a safe delivery location like a lobby or doorman desk.' },
    { question: 'Do you serve businesses too?', answer: 'Yes. Our commercial laundry service handles restaurants, salons, gyms, Airbnb hosts, and offices. Bulk pricing from $1-$2/lb with daily or weekly pickup schedules. Text (917) 970-6002 for a custom business quote.' },
  ]
}
