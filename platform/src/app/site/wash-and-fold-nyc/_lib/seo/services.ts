export interface Service {
  slug: string
  urlSlug: string
  name: string
  shortName: string
  description: string
  features: string[]
  idealFor: string[]
  priceRange: string
  duration: string
}

export const SERVICES: Service[] = [
  {
    slug: 'wash-and-fold',
    urlSlug: 'nyc-wash-and-fold',
    name: 'Wash & Fold',
    shortName: 'Wash & Fold',
    description: 'Drop off your dirty laundry and pick it up clean, fresh, and perfectly folded. $3/lb with a $39 minimum. Same-day rush +$20. Subscriptions: 10% off weekly, 5% off biweekly.',
    features: ['Sort by color and fabric type', 'Pre-treat stains and spots', 'Wash with premium detergent', 'Tumble dry on appropriate heat', 'Hand-fold every item', 'Organize by garment type', 'Package in clean bags', 'Same-day available for +$20 rush', 'Eco-friendly detergent options', 'Fabric softener or fragrance-free options', 'Inventory check on pickup', 'Text notification when ready'],
    idealFor: ['Busy professionals', 'Families', 'Students', 'Anyone who hates laundry'],
    priceRange: '$3/lb',
    duration: '24–48 hours',
  },
  {
    slug: 'in-unit-laundry',
    urlSlug: 'nyc-in-unit-laundry-service',
    name: 'In-Unit Laundry Service',
    shortName: 'In-Unit',
    description: 'We come to your apartment and do your laundry using your own washer and dryer. Sort, wash, dry, fold — all while you relax or work from home.',
    features: ['Use your own washer/dryer', 'Sort by color and fabric', 'Pre-treat stains', 'Wash and dry multiple loads', 'Fold and organize all items', 'Put away clothes if requested', 'Iron select items on request', 'Bed linens and towels included', 'Separate delicates cycle', 'Clean lint traps and machine surfaces', 'Organize closets and drawers optional', 'Recurring weekly/bi-weekly scheduling'],
    idealFor: ['Busy professionals with in-unit W/D', 'New parents', 'Work-from-home professionals', 'Elderly or mobility-limited residents'],
    priceRange: '$45–$85/visit',
    duration: '2–4 hours',
  },
  {
    slug: 'in-building-laundry',
    urlSlug: 'nyc-in-building-laundry-service',
    name: 'In-Building Laundry Service',
    shortName: 'In-Building',
    description: 'We handle your laundry using your building\'s shared laundry room. We bring quarters, manage the machines, and deliver everything folded to your door.',
    features: ['We supply quarters/laundry card funds', 'Sort and pre-treat all garments', 'Manage multiple machine cycles', 'Monitor wash and dry times', 'Fold and organize everything', 'Deliver folded to your apartment door', 'Handle bed linens and towels', 'Separate delicates', 'Text updates during service', 'Coordinate with building laundry hours', 'Recurring scheduling available', 'No need to leave your apartment'],
    idealFor: ['Apartment dwellers with shared laundry', 'Co-op and condo residents', 'Anyone who avoids the laundry room', 'Tenants in buildings without in-unit W/D'],
    priceRange: '$50–$90/visit',
    duration: '2–4 hours',
  },
  {
    slug: 'pickup-and-delivery',
    urlSlug: 'nyc-pickup-and-delivery',
    name: 'Pickup & Delivery Laundry',
    shortName: 'Pickup & Delivery',
    description: 'We pick up your dirty laundry from your door, wash and fold it, and deliver it back clean and fresh. Free pickup, free delivery — same $3/lb rate.',
    features: ['Free doorstep pickup', 'Sort by color and fabric type', 'Pre-treat all stains', 'Wash with premium detergent', 'Tumble dry on appropriate settings', 'Hand-fold every item', 'Package in sealed clean bags', 'Free delivery back to your door', 'Text tracking from pickup to delivery', 'Recurring weekly scheduling', 'Express same-day turnaround available', 'Doorman and concierge friendly'],
    idealFor: ['Busy professionals', 'Families with no time', 'Anyone without easy laundry access', 'WFH workers who want zero hassle'],
    priceRange: '$3/lb',
    duration: '24–48 hours',
  },
  {
    slug: 'dry-cleaning',
    urlSlug: 'nyc-dry-cleaning',
    name: 'Dry Cleaning',
    shortName: 'Dry Cleaning',
    description: 'Premium dry cleaning with free pickup and delivery. Suits, dresses, coats, delicates — even wedding gowns. White-glove service, handled with care.',
    features: ['Suits and blazers ($34)', 'Dresses and formal wear ($28)', 'Coats and outerwear ($45)', 'Silk and cashmere items', 'Stain treatment and removal', 'Professional pressing and finishing', 'Garment bags for protection', 'Button and minor repair check', 'Free pickup and delivery', 'Same-week turnaround', 'Wedding dress and gown cleaning ($350)', 'Evening gowns ($60)'],
    idealFor: ['Professionals with office wardrobes', 'Special occasion garments', 'Luxury and designer clothing', 'Seasonal wardrobe maintenance'],
    priceRange: '$10–$350/item',
    duration: '3–5 days',
  },
  {
    slug: 'comforter-cleaning',
    urlSlug: 'nyc-comforter-cleaning',
    name: 'Comforter & Bedding Cleaning',
    shortName: 'Comforters',
    description: 'Oversized comforters, duvets, quilts, and pillows cleaned and freshened. Flat-rate pricing: Twin $35, Full/Queen $45, King $55. Too big for your home machine — perfect for ours.',
    features: ['Twin comforter ($35)', 'Full/Queen comforter ($45)', 'King comforter ($55)', 'Duvet cover ($20)', 'Pillow — each ($12)', 'Mattress pad ($25)', 'Sleeping bag ($30)', 'Stain pre-treatment', 'Allergen-reduction wash cycle', 'Fluff dry for maximum loft', 'Folded and sealed in clean packaging', 'Pickup and delivery available'],
    idealFor: ['Seasonal bedding refresh', 'Allergy sufferers', 'Pet owners', 'Anyone with oversized bedding'],
    priceRange: '$35–$55/item',
    duration: '2–3 days',
  },
  {
    slug: 'commercial-laundry',
    urlSlug: 'nyc-commercial-laundry',
    name: 'Commercial Laundry',
    shortName: 'Commercial',
    description: 'Laundry service for businesses — restaurants, salons, gyms, Airbnbs, and offices. Bulk pricing, recurring schedules, and reliable turnaround.',
    features: ['Restaurant linens and towels', 'Salon capes and towels', 'Gym towels and uniforms', 'Airbnb linen turnover', 'Office towels and supplies', 'Bulk pricing by volume', 'Recurring daily/weekly schedules', 'Pickup and delivery included', 'Stain treatment for food and product', 'Folded and packaged by type', 'Invoice billing for businesses', 'Dedicated account manager'],
    idealFor: ['Restaurants and cafes', 'Hair salons and spas', 'Gyms and fitness studios', 'Airbnb and short-term rental hosts'],
    priceRange: '$1–$2/lb',
    duration: '24 hours',
  },
]

export function getService(slug: string): Service | undefined {
  return SERVICES.find(s => s.slug === slug)
}

export function getServiceByUrlSlug(urlSlug: string): Service | undefined {
  return SERVICES.find(s => s.urlSlug === urlSlug)
}

export function getAllServiceSlugs(): string[] {
  return SERVICES.map(s => s.slug)
}

export function getAllServiceUrlSlugs(): string[] {
  return SERVICES.map(s => s.urlSlug)
}
