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
    slug: 'house-cleaning',
    urlSlug: 'nyc-house-cleaning-service',
    name: 'House Cleaning Service',
    shortName: 'House Cleaning',
    description: 'Complete house cleaning for NYC homes — kitchens, bathrooms, bedrooms, living areas, and more. Sunnyside Clean NYC delivers consistent, thorough cleaning you can rely on.',
    features: ['Full kitchen cleaning — countertops, stovetop, sink, and appliance exteriors', 'Bathroom scrub — toilet, tub, shower, sink, and mirror', 'All surface dusting — shelves, ledges, decor, and furniture', 'Vacuuming all floors and rugs', 'Mopping hard floors', 'Bed making and linen change', 'Mirror and glass polishing', 'Trash and recycling taken out', 'Entryway and hallway cleaning', 'Light switches and door handles sanitized', 'Countertop and table sanitization', 'Baseboard spot-clean'],
    idealFor: ['Single-family homes', 'Multi-story houses', 'Families with children', 'Pet owners'],
    priceRange: '$149–$399',
    duration: '3–5 hours',
  },
  {
    slug: 'apartment-cleaning',
    urlSlug: 'nyc-apartment-cleaning-service',
    name: 'Apartment Cleaning Service',
    shortName: 'Apartment Cleaning',
    description: 'Professional apartment cleaning tailored for NYC living. Whether you have a studio or a 3-bedroom, Sunnyside Clean NYC keeps your space spotless on your schedule.',
    features: ['Kitchen countertops, stovetop, and sink', 'Bathroom toilet, tub, and sink scrub', 'All surface dusting — shelves, ledges, decor', 'Vacuuming all floors and rugs', 'Mopping hard floors', 'Bed making and linen change', 'Mirror and glass polishing', 'Appliance exterior wipe-down', 'Trash and recycling taken out', 'Entryway and hallway cleaning', 'Light switches and door handles', 'Countertop and table sanitization'],
    idealFor: ['Studios and 1-bedrooms', 'Busy professionals', 'Bi-weekly upkeep', 'Families in apartments'],
    priceRange: '$98–$260',
    duration: '2–4 hours',
  },
  {
    slug: 'deep-cleaning',
    urlSlug: 'nyc-deep-cleaning-service',
    name: 'Deep Cleaning Service',
    shortName: 'Deep Cleaning',
    description: 'Our most thorough cleaning service — we tackle every corner, from baseboards to ceiling fans. Perfect for first-time cleanings, seasonal refreshes, or when your space needs serious attention.',
    features: ['Inside oven degreasing and scrub', 'Inside refrigerator — shelves, drawers, seals', 'Baseboard and trim scrubbing', 'Window sills, tracks, and frames', 'Bathroom deep-scrub — tub, toilet, tile', 'Cabinet and drawer exterior wipe-down', 'Light fixtures and ceiling fan dusting', 'Behind and under all furniture', 'Air vents and register covers', 'Inside microwave and stovetop', 'Door frames, light switches, and handles', 'All floors vacuumed and mopped'],
    idealFor: ['First-time clients', 'Seasonal deep cleans', 'Pre-holiday preparation', 'After extended absence'],
    priceRange: '$196–$390',
    duration: '3–5 hours',
  },
  {
    slug: 'moving-cleaning',
    urlSlug: 'nyc-moving-cleaning-service',
    name: 'Moving Cleaning Service',
    shortName: 'Move Clean',
    description: 'Moving in or out? Get your full deposit back or start fresh in a pristine home. We clean every inch of empty space — inside cabinets, appliances, closets, and more.',
    features: ['Inside all cabinets, drawers, and shelves', 'Inside oven, fridge, and dishwasher', 'Closet interiors — rods, shelves, floors', 'Wall spot-cleaning and scuff removal', 'Light switches, outlets, and cover plates', 'Window interiors and sills', 'Baseboard and trim scrubbing', 'Bathroom top to bottom — tub, tile, toilet', 'All floors scrubbed and polished', 'Vent covers removed and cleaned', 'Door frames, hinges, and handles', 'Final walk-through inspection'],
    idealFor: ['Moving into a new apartment', 'Moving out (deposit recovery)', 'Lease turnovers', 'Real estate showings'],
    priceRange: '$260–$520',
    duration: '3–5 hours',
  },
  {
    slug: 'same-day-cleaning',
    urlSlug: 'nyc-same-day-cleaning-service',
    name: 'Same-Day Cleaning Service',
    shortName: 'Same-Day',
    description: 'Need a clean home today? Our same-day cleaning service dispatches a professional cleaner to your door within hours. Perfect for unexpected guests or last-minute situations.',
    features: ['Cleaner dispatched within hours', 'Kitchen counters, sink, and stovetop', 'Bathroom toilet, tub, and sink', 'Vacuuming all rooms', 'Mopping kitchen and bath floors', 'Surface dusting throughout', 'Trash and recycling taken out', 'Mirror and glass cleaning', 'Bed making and general tidy-up', 'Countertop and table sanitization', 'Dishes loaded or hand-washed', 'Quick declutter of common areas'],
    idealFor: ['Unexpected guests', 'Last-minute events', 'Post-party cleanup', 'Emergency situations'],
    priceRange: '$200–$400',
    duration: '2–4 hours',
  },
  {
    slug: 'window-cleaning',
    urlSlug: 'nyc-window-cleaning-service',
    name: 'Window Cleaning Service',
    shortName: 'Window Cleaning',
    description: 'Crystal-clear windows inside and out. We remove NYC grime, hard water spots, and buildup from all interior glass surfaces, tracks, sills, and frames.',
    features: ['Interior window glass cleaning', 'Window sill and track cleaning', 'Window frame wipe-down', 'Hard water spot removal', 'Screen dusting and cleaning', 'Storm window interiors', 'Sliding door glass cleaning', 'Mirror cleaning throughout', 'Glass partition cleaning', 'Streak-free finish guaranteed', 'Exterior windows where accessible', 'Final inspection and touch-up'],
    idealFor: ['Seasonal window cleaning', 'Move-in preparation', 'Pre-holiday refresh', 'High-rise apartments'],
    priceRange: '$150–$350',
    duration: '2–4 hours',
  },
  {
    slug: 'junk-removal-cleaning',
    urlSlug: 'nyc-junk-removal-cleaning-service',
    name: 'Junk Removal & Cleaning Service',
    shortName: 'Junk Removal',
    description: 'Clear out the clutter and clean up after. We handle junk removal and deep cleaning in one visit — perfect for decluttering, estate cleanouts, and post-renovation debris.',
    features: ['Furniture removal and hauling', 'Appliance removal', 'General junk and debris clearing', 'Post-removal deep cleaning', 'Donation item sorting and drop-off coordination', 'Closet and storage area cleanout', 'Garage and basement clearing', 'Construction debris removal', 'E-waste and electronics disposal', 'Floor cleaning after removal', 'Surface sanitization', 'Final sweep and inspection'],
    idealFor: ['Apartment decluttering', 'Estate cleanouts', 'Post-renovation cleanup', 'Storage unit clearing'],
    priceRange: '$250–$600',
    duration: '3–6 hours',
  },
  {
    slug: 'home-organizing',
    urlSlug: 'nyc-home-organizing-service',
    name: 'Home Organizing Service',
    shortName: 'Home Organizing',
    description: 'Professional home organizing for NYC spaces. We sort, declutter, and create systems that keep your home tidy and functional long after we leave.',
    features: ['Closet organization and maximization', 'Kitchen cabinet and pantry organizing', 'Bathroom storage optimization', 'Drawer and shelf systems setup', 'Seasonal wardrobe rotation', 'Under-bed and hidden storage solutions', 'Entryway and hallway organization', 'Home office desk and file organizing', 'Kids room and toy organizing', 'Linen closet setup', 'Labeling and categorization', 'Custom system recommendations'],
    idealFor: ['Small apartment dwellers', 'Families with kids', 'Work-from-home professionals', 'Anyone feeling overwhelmed by clutter'],
    priceRange: '$175–$400',
    duration: '3–5 hours',
  },
  {
    slug: 'common-area-cleaning',
    urlSlug: 'nyc-common-area-cleaning-service',
    name: 'Common Area Cleaning Service',
    shortName: 'Common Area',
    description: 'Keep your building lobbies, hallways, and shared spaces spotless. Professional common area cleaning for residential buildings, co-ops, and condos across NYC.',
    features: ['Lobby floor sweeping and mopping', 'Elevator interior cleaning', 'Hallway vacuuming and mopping', 'Stairwell sweeping and wiping', 'Mailbox area cleaning', 'Entry door and glass cleaning', 'Light fixture and switch wiping', 'Railing and handrail sanitizing', 'Trash and recycling area maintenance', 'Doormat cleaning and placement', 'Wall spot-cleaning', 'Building-specific protocol compliance'],
    idealFor: ['Co-op buildings', 'Condo associations', 'Small residential buildings', 'Property management companies'],
    priceRange: '$150–$450',
    duration: '2–5 hours',
  },
  {
    slug: 'office-cleaning',
    urlSlug: 'nyc-office-cleaning-service',
    name: 'Office Cleaning Service',
    shortName: 'Office Cleaning',
    description: 'Professional workspace cleaning for offices, co-working spaces, and commercial suites. We keep your workplace healthy, presentable, and productive.',
    features: ['Desk and workstation wipe-down', 'Common area cleaning and organizing', 'Kitchen and break room — sink, counter, table', 'Restroom scrub and restock', 'Trash and recycling from all bins', 'Vacuuming and mopping all floors', 'Glass partitions and window wipe-down', 'Conference room table and chairs', 'Reception desk and lobby cleaning', 'Door handles and high-touch surfaces', 'Kitchen appliance exteriors', 'Entrance mats and entryway sweep'],
    idealFor: ['Small offices', 'Co-working spaces', 'Medical offices', 'Retail spaces'],
    priceRange: '$98–$325',
    duration: '2–5 hours',
  },
  {
    slug: 'maid-service',
    urlSlug: 'nyc-maid-service',
    name: 'NYC Recurring Cleaning Service',
    shortName: 'Recurring Cleaning',
    description: 'Reliable, recurring cleaning service for NYC homes and apartments. The same trusted cleaner every visit, maintaining your home to the highest standard week after week.',
    features: ['Same dedicated cleaner each visit', 'Full kitchen wipe-down and sanitize', 'Bathroom toilet, shower, and sink', 'Vacuuming all rooms and hallways', 'Mopping kitchen and bathroom floors', 'Bed making with fresh linens', 'Surface dusting throughout', 'Mirror and glass cleaning', 'Trash and recycling removal', 'Countertop and table wipe-down', 'Appliance fronts and handles', 'Rotating focus areas each visit'],
    idealFor: ['Weekly maintenance', 'Bi-weekly upkeep', 'Busy professionals', 'Families who want consistency'],
    priceRange: '$98–$260',
    duration: '2–4 hours',
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
