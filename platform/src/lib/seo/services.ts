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
    slug: 'deep-cleaning',
    urlSlug: 'deep-cleaning-service-in-nyc',
    name: 'Deep Cleaning',
    shortName: 'Deep Clean',
    description: 'Our most thorough cleaning service — we tackle every corner, from baseboards to ceiling fans. Perfect for first-time cleanings or seasonal refreshes.',
    features: ['Inside oven degreasing and scrub', 'Inside refrigerator — shelves, drawers, seals', 'Baseboard and trim scrubbing', 'Window sills, tracks, and frames', 'Bathroom deep-scrub — tub, toilet, tile', 'Cabinet and drawer exterior wipe-down', 'Light fixtures and ceiling fan dusting', 'Behind and under all furniture', 'Air vents and register covers', 'Inside microwave and stovetop', 'Door frames, light switches, and handles', 'All floors vacuumed and mopped'],
    idealFor: ['First-time clients', 'Seasonal deep cleans', 'Pre-holiday preparation', 'After extended absence'],
    priceRange: '$196–$390',
    duration: '3–5 hours',
  },
  {
    slug: 'regular-cleaning',
    urlSlug: 'apartment-cleaning-service-in-nyc',
    name: 'Regular Apartment Cleaning',
    shortName: 'Regular',
    description: 'Consistent, reliable cleaning on your schedule. Our recurring service keeps your home spotless week after week so you never come home to a mess.',
    features: ['Kitchen countertops, stovetop, and sink', 'Bathroom toilet, tub, and sink scrub', 'All surface dusting — shelves, ledges, decor', 'Vacuuming all floors and rugs', 'Mopping hard floors', 'Bed making and linen change', 'Mirror and glass polishing', 'Appliance exterior wipe-down', 'Trash and recycling taken out', 'Entryway and hallway cleaning', 'Light switches and door handles', 'Countertop and table sanitization'],
    idealFor: ['Weekly maintenance', 'Bi-weekly upkeep', 'Busy professionals', 'Families with children'],
    priceRange: '$98–$260',
    duration: '2–4 hours',
  },
  {
    slug: 'weekly-cleaning',
    urlSlug: 'weekly-maid-service-in-nyc',
    name: 'Weekly Maid Service',
    shortName: 'Weekly',
    description: 'Keep your home consistently clean with our weekly maid service. The same trusted cleaner every week, maintaining your home to the highest standard.',
    features: ['Same dedicated cleaner each visit', 'Full kitchen wipe-down and sanitize', 'Bathroom toilet, shower, and sink', 'Vacuuming all rooms and hallways', 'Mopping kitchen and bathroom floors', 'Bed making with fresh linens', 'Surface dusting throughout', 'Mirror and glass cleaning', 'Trash and recycling removal', 'Countertop and table wipe-down', 'Appliance fronts and handles', 'Rotating focus areas each week'],
    idealFor: ['Busy professionals', 'Families', 'Pet owners', 'Anyone who loves a consistently clean home'],
    priceRange: '$98–$195',
    duration: '2–3 hours',
  },
  {
    slug: 'bi-weekly-cleaning',
    urlSlug: 'bi-weekly-cleaning-service-in-nyc',
    name: 'Bi-Weekly Cleaning',
    shortName: 'Bi-Weekly',
    description: 'The perfect balance of cleanliness and budget. Our bi-weekly cleaning keeps your home fresh without the weekly commitment.',
    features: ['Full kitchen — counters, stovetop, sink', 'Bathroom scrub — toilet, tub, shower', 'All surface dusting and wipe-down', 'Vacuuming and mopping all floors', 'Bed making and linen change', 'Inside microwave cleaning', 'Mirror and glass polishing', 'Baseboard spot-clean', 'Trash and recycling removal', 'Sink and faucet polish', 'Light fixture dusting', 'Alternating deep-focus areas'],
    idealFor: ['Budget-conscious homeowners', 'Couples', 'Small apartments', 'Light-use homes'],
    priceRange: '$120–$260',
    duration: '2.5–4 hours',
  },
  {
    slug: 'monthly-cleaning',
    urlSlug: 'monthly-cleaning-service-in-nyc',
    name: 'Monthly Cleaning',
    shortName: 'Monthly',
    description: 'A thorough monthly cleaning that goes deeper than your average tidy-up. We rotate through detailed tasks to keep every corner of your home spotless.',
    features: ['Full kitchen deep clean — inside and out', 'Bathroom deep scrub top to bottom', 'Baseboard and trim cleaning', 'Window sill and track wipe-down', 'Detailed dusting — fans, fixtures, vents', 'Floor vacuuming, mopping, and polish', 'Inside oven and stovetop scrub', 'Cabinet exterior wipe-down', 'Behind and under furniture', 'Mirror and glass detailing', 'Door frames and light switches', 'Cobweb check in all corners'],
    idealFor: ['Minimal-mess households', 'Supplementing self-cleaning', 'Budget-friendly maintenance', 'Second homes'],
    priceRange: '$147–$325',
    duration: '3–5 hours',
  },
  {
    slug: 'move-in-move-out-cleaning',
    urlSlug: 'move-in-move-out-cleaning-service-in-nyc',
    name: 'Move-In/Move-Out Cleaning',
    shortName: 'Move Clean',
    description: 'Get your full deposit back or move into a pristine home. We clean every inch of the empty space — inside cabinets, appliances, closets, and more.',
    features: ['Inside all cabinets, drawers, and shelves', 'Inside oven, fridge, and dishwasher', 'Closet interiors — rods, shelves, floors', 'Wall spot-cleaning and scuff removal', 'Light switches, outlets, and cover plates', 'Window interiors and sills', 'Baseboard and trim scrubbing', 'Bathroom top to bottom — tub, tile, toilet', 'All floors scrubbed and polished', 'Vent covers removed and cleaned', 'Door frames, hinges, and handles', 'Final walk-through inspection'],
    idealFor: ['Moving into a new apartment', 'Moving out (deposit recovery)', 'Lease turnovers', 'Real estate showings'],
    priceRange: '$260–$520',
    duration: '3–5 hours',
  },
  {
    slug: 'post-renovation-cleaning',
    urlSlug: 'post-construction-cleanup-service-in-nyc',
    name: 'Post-Construction Cleanup',
    shortName: 'Post-Reno',
    description: 'Construction dust gets everywhere. Our post-renovation cleaning removes fine dust, debris, and residue from every surface to make your newly renovated space livable.',
    features: ['Fine construction dust on all surfaces', 'Paint splatter and adhesive removal', 'Vent and duct exterior cleaning', 'Floor scrubbing — dust, debris, residue', 'Window and glass cleaning inside', 'New fixture and hardware detailing', 'Baseboard and trim wipe-down', 'Inside cabinets — sawdust and dust', 'Light switches and outlet plates', 'Debris and leftover material removal', 'Countertop and surface restoration', 'Final detail pass — every room'],
    idealFor: ['After kitchen remodel', 'Bathroom renovation', 'Full apartment renovation', 'New construction move-in'],
    priceRange: '$325–$650',
    duration: '3–5 hours',
  },
  {
    slug: 'same-day-cleaning',
    urlSlug: 'same-day-cleaning-service-in-nyc',
    name: 'Same-Day Cleaning',
    shortName: 'Same-Day',
    description: 'Need a clean home today? Our same-day cleaning service dispatches a professional cleaner to your door within hours. Perfect for unexpected guests or emergencies.',
    features: ['Cleaner dispatched within hours', 'Kitchen counters, sink, and stovetop', 'Bathroom toilet, tub, and sink', 'Vacuuming all rooms', 'Mopping kitchen and bath floors', 'Surface dusting throughout', 'Trash and recycling taken out', 'Mirror and glass cleaning', 'Bed making and general tidy-up', 'Countertop and table sanitization', 'Dishes loaded or hand-washed', 'Quick declutter of common areas'],
    idealFor: ['Unexpected guests', 'Last-minute events', 'Post-party cleanup', 'Emergency situations'],
    priceRange: '$200–$400',
    duration: '2–4 hours',
  },
  {
    slug: 'airbnb-cleaning',
    urlSlug: 'airbnb-cleaning-in-nyc',
    name: 'Airbnb & Short-Term Rental Cleaning',
    shortName: 'Airbnb',
    description: 'Fast, reliable turnover cleaning between guests. We follow a strict checklist to ensure 5-star reviews every time — linens, restocking, and photo-ready finish.',
    features: ['Strip and remake beds with fresh linens', 'Amenity restocking check', 'Photo-ready staging of all rooms', 'Bathroom full scrub and sanitize', 'Kitchen reset — dishes, counters, appliances', 'Trash and recycling removal', 'Vacuuming and mopping all floors', 'Mirror and glass polishing', 'Surface dusting throughout', 'Appliance fronts wiped down', 'Welcome setup — towels, toiletries', 'Spot-check for damage or maintenance'],
    idealFor: ['Airbnb hosts', 'VRBO properties', 'Corporate housing', 'Furnished rentals'],
    priceRange: '$75–$195',
    duration: '1.5–3 hours',
  },
  {
    slug: 'office-cleaning',
    urlSlug: 'office-cleaning-service-in-nyc',
    name: 'Office Cleaning',
    shortName: 'Office',
    description: 'Professional workspace cleaning for small offices, co-working spaces, and commercial suites. We keep your workspace healthy and presentable.',
    features: ['Desk and workstation wipe-down', 'Common area cleaning and organizing', 'Kitchen and break room — sink, counter, table', 'Restroom scrub and restock', 'Trash and recycling from all bins', 'Vacuuming and mopping all floors', 'Glass partitions and window wipe-down', 'Conference room table and chairs', 'Reception desk and lobby cleaning', 'Door handles and high-touch surfaces', 'Kitchen appliance exteriors', 'Entrance mats and entryway sweep'],
    idealFor: ['Small offices', 'Co-working spaces', 'Medical offices', 'Retail spaces'],
    priceRange: '$98–$325',
    duration: '2–5 hours',
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
