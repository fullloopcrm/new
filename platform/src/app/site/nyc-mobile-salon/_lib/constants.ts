// @ts-nocheck
// ─── Types ──────────────────────────────────────────────────────────

export type Service = { name: string; slug: string; description: string };
export type ServiceCategory = { title: string; slug: string; services: Service[] };
export type EventItem = { name: string; slug: string; description: string };
export type EventCategory = { title: string; slug: string; description: string; items: EventItem[] };
export type ClassItem = { name: string; slug: string; description: string; duration: string; groupSize: string };
export type ClassCategory = { title: string; slug: string; items: ClassItem[] };
export type Neighborhood = { name: string; slug: string };

// ─── Women's Services ───────────────────────────────────────────────

export const womensHair: Service[] = [
  { name: "Blowouts & Styling", slug: "blowouts-and-styling", description: "Salon-quality blowout, styled your way" },
  { name: "Haircuts & Trims", slug: "haircuts-and-trims", description: "Precision cuts tailored to your face and vibe" },
  { name: "Single Process Color", slug: "single-process-color", description: "Full color, root touch-up, gray coverage" },
  { name: "Double Process Color", slug: "double-process-color", description: "Bleach and tone for dramatic transformations" },
  { name: "Highlights / Balayage / Ombre", slug: "highlights-balayage-ombre", description: "Dimension, depth, and sun-kissed looks" },
  { name: "Deep Conditioning Treatment", slug: "deep-conditioning-treatment", description: "Restore moisture, shine, and strength" },
  { name: "Silk Press", slug: "silk-press", description: "Sleek, straight finish on natural hair" },
  { name: "Braids & Protective Styles", slug: "braids-and-protective-styles", description: "Box braids, cornrows, twists, locs, and more" },
  { name: "Extensions (Install / Removal)", slug: "extensions", description: "Clip-ins, tape-ins, sew-ins, and removal" },
  { name: "Updo & Formal Styling", slug: "updo-and-formal-styling", description: "Elegant updos for weddings, galas, and events" },
];

export const womensNails: Service[] = [
  { name: "Classic Manicure", slug: "classic-manicure", description: "Shape, buff, cuticle care, and polish" },
  { name: "Gel Manicure", slug: "gel-manicure", description: "Long-lasting gel with chip-free shine" },
  { name: "Classic Pedicure", slug: "classic-pedicure", description: "Soak, scrub, and polish for happy feet" },
  { name: "Gel Pedicure", slug: "gel-pedicure", description: "Gel finish pedicure that lasts" },
  { name: "Nail Art", slug: "nail-art", description: "Custom designs, hand-painted details" },
  { name: "Acrylic / Press-On Application", slug: "acrylic-press-on", description: "Full set or fill with your choice of shape" },
  { name: "Dip Powder", slug: "dip-powder", description: "Lightweight, durable, no UV light needed" },
];

export const womensMakeup: Service[] = [
  { name: "Full Glam Makeup", slug: "full-glam-makeup", description: "Camera-ready, event-level glam" },
  { name: "Natural / Everyday Makeup", slug: "natural-everyday-makeup", description: "Enhanced beauty, effortless look" },
  { name: "Lash Application", slug: "lash-application", description: "Strip lash application for instant drama" },
];

export const womensSkin: Service[] = [
  { name: "Express Facial", slug: "express-facial", description: "Quick cleanse, tone, and glow-up" },
  { name: "Deep Cleansing Facial", slug: "deep-cleansing-facial", description: "Extractions, masks, and targeted treatment" },
  { name: "Microdermabrasion", slug: "microdermabrasion", description: "Exfoliation for smoother, brighter skin" },
  { name: "Light Chemical Peel", slug: "light-chemical-peel", description: "Gentle resurfacing for tone and texture" },
];

export const womensWaxing: Service[] = [
  { name: "Brow Wax & Shape", slug: "brow-wax-and-shape", description: "Clean arches that frame your face" },
  { name: "Lip & Chin Wax", slug: "lip-and-chin-wax", description: "Quick and clean facial hair removal" },
  { name: "Full Face Wax", slug: "full-face-wax", description: "Brow, lip, chin, and sideburns" },
  { name: "Bikini / Brazilian", slug: "bikini-brazilian-wax", description: "Clean lines or full removal" },
  { name: "Full Leg / Half Leg", slug: "leg-wax", description: "Smooth legs, no razor burn" },
  { name: "Underarm", slug: "underarm-wax", description: "Quick, clean underarm wax" },
];

// ─── Men's Services ─────────────────────────────────────────────────

export const mensHair: Service[] = [
  { name: "Haircut & Style", slug: "mens-haircut-and-style", description: "Classic or modern, cut to your look" },
  { name: "Fade (Low / Mid / High)", slug: "fade-haircut", description: "Crisp fades, blended to perfection" },
  { name: "Line Up / Edge Up", slug: "line-up-edge-up", description: "Sharp lines around the hairline" },
  { name: "Buzz Cut", slug: "buzz-cut", description: "Clean and even all over" },
];

export const mensBeard: Service[] = [
  { name: "Beard Trim & Shape", slug: "beard-trim-and-shape", description: "Sculpted beard, clean neckline" },
  { name: "Hot Towel Straight Razor Shave", slug: "hot-towel-shave", description: "Old-school barbershop luxury" },
  { name: "Beard Oil Treatment", slug: "beard-oil-treatment", description: "Hydrate, soften, and condition" },
];

export const mensGrooming: Service[] = [
  { name: "Brow Cleanup", slug: "mens-brow-cleanup", description: "Wax or tweeze for a clean look" },
  { name: "Ear & Nose Wax", slug: "ear-and-nose-wax", description: "Quick detail grooming" },
  { name: "Scalp Treatment", slug: "scalp-treatment", description: "Exfoliate and nourish your scalp" },
  { name: "Men's Manicure", slug: "mens-manicure", description: "Clean, trimmed, buffed nails" },
  { name: "Men's Pedicure", slug: "mens-pedicure", description: "Soak, scrub, and clean finish" },
  { name: "Back Wax", slug: "back-wax", description: "Full back hair removal" },
];

// ─── Service Categories ─────────────────────────────────────────────

export const womensCategories: ServiceCategory[] = [
  { title: "Hair", slug: "hair", services: womensHair },
  { title: "Nails", slug: "nails", services: womensNails },
  { title: "Makeup", slug: "makeup", services: womensMakeup },
  { title: "Skin", slug: "skin", services: womensSkin },
  { title: "Waxing", slug: "waxing", services: womensWaxing },
];

export const mensCategories: ServiceCategory[] = [
  { title: "Hair", slug: "mens-hair", services: mensHair },
  { title: "Beard", slug: "beard", services: mensBeard },
  { title: "Grooming", slug: "grooming", services: mensGrooming },
];

export const allServices: Service[] = [
  ...womensHair, ...womensNails, ...womensMakeup, ...womensSkin, ...womensWaxing,
  ...mensHair, ...mensBeard, ...mensGrooming,
];

// ─── Events ─────────────────────────────────────────────────────────

export const eventCategories: EventCategory[] = [
  {
    title: "Bridal",
    slug: "bridal",
    description: "Your day, your way — we come to you.",
    items: [
      { name: "Bridal Hair & Makeup", slug: "bridal-hair-and-makeup", description: "Full glam for the bride" },
      { name: "Bridal Party Hair & Makeup", slug: "bridal-party-hair-and-makeup", description: "Bridesmaids, MOB, MOG — the whole crew" },
      { name: "Bridal Trial Run", slug: "bridal-trial-run", description: "Preview session before the big day" },
      { name: "Engagement / Boudoir Shoot Glam", slug: "engagement-boudoir-shoot-glam", description: "Photo-ready hair and makeup" },
    ],
  },
  {
    title: "Parties & Celebrations",
    slug: "parties",
    description: "Turn any gathering into a pampering session.",
    items: [
      { name: "Birthday Glam Parties", slug: "birthday-glam-party", description: "Hair, nails, and makeup for the birthday crew" },
      { name: "Bachelorette Pampering", slug: "bachelorette-pampering", description: "Pre-wedding party vibes" },
      { name: "Sweet 16 / Quinceañera Glam", slug: "sweet-16-quinceanera-glam", description: "Make the guest of honor shine" },
      { name: "Prom Prep Parties", slug: "prom-prep-party", description: "Get the whole group ready together" },
      { name: "Girls' Night In", slug: "girls-night-in", description: "Mani/pedis + blowouts + wine (you supply the wine)" },
      { name: "Spa Day at Home", slug: "spa-day-at-home", description: "Facials, nails, and hair for your crew" },
      { name: "Baby Shower Pampering", slug: "baby-shower-pampering", description: "Treat the mama-to-be and guests" },
    ],
  },
  {
    title: "Corporate & Professional",
    slug: "corporate",
    description: "Boost morale. Look sharp. On-site.",
    items: [
      { name: "Office Wellness Days", slug: "office-wellness-day", description: "Mani/pedis, brow bar, and more at your office" },
      { name: "Headshot / Photo Shoot Styling", slug: "headshot-photo-shoot-styling", description: "Hair and makeup for the whole team" },
      { name: "Conference Touch-Up Stations", slug: "conference-touch-up-station", description: "Quick-service stations at your event" },
      { name: "Employee Appreciation Glam", slug: "employee-appreciation-glam", description: "Reward your team with pampering" },
    ],
  },
  {
    title: "Film / Photo / Content",
    slug: "film-photo-content",
    description: "On-set ready. Every time.",
    items: [
      { name: "On-Set Hair & Makeup", slug: "on-set-hair-and-makeup", description: "Film, TV, music video production" },
      { name: "Content Creator Glam", slug: "content-creator-glam", description: "Influencer and creator styling" },
      { name: "Lookbook & Editorial", slug: "lookbook-editorial-styling", description: "High-fashion editorial styling" },
      { name: "Red Carpet / Press Prep", slug: "red-carpet-press-prep", description: "Event-ready, camera-ready" },
    ],
  },
  {
    title: "Community & Specialty",
    slug: "community",
    description: "Beauty for everyone, everywhere.",
    items: [
      { name: "Senior Home Salon Days", slug: "senior-home-salon-day", description: "Bring the salon to assisted living" },
      { name: "Hospital / Recovery Pampering", slug: "hospital-recovery-pampering", description: "Feel good during tough times" },
      { name: "Shelter & Nonprofit Glam Events", slug: "shelter-nonprofit-glam-event", description: "Confidence-boosting beauty for those in need" },
      { name: "Back-to-School Kids' Haircuts", slug: "back-to-school-kids-haircuts", description: "Fresh cuts for the first day" },
    ],
  },
];

export const allEvents: EventItem[] = eventCategories.flatMap((c) => c.items);

// ─── Classes & Workshops ────────────────────────────────────────────

export const classCategories: ClassCategory[] = [
  {
    title: "Hair",
    slug: "hair-classes",
    items: [
      { name: "DIY Blowout Workshop", slug: "diy-blowout-workshop", description: "Learn to blowout like a pro at home", duration: "90 min", groupSize: "4–10" },
      { name: "Braiding Basics", slug: "braiding-basics-class", description: "French braids, Dutch braids, fishtails, and more", duration: "2 hrs", groupSize: "4–8" },
    ],
  },
  {
    title: "Makeup",
    slug: "makeup-classes",
    items: [
      { name: "Everyday Makeup Masterclass", slug: "everyday-makeup-masterclass", description: "Build a quick, polished daily routine", duration: "90 min", groupSize: "4–10" },
    ],
  },
  {
    title: "Skincare",
    slug: "skincare-classes",
    items: [
      { name: "Skincare Routine Workshop", slug: "skincare-routine-workshop", description: "Find your perfect routine — cleanse, treat, protect", duration: "90 min", groupSize: "4–12" },
    ],
  },
  {
    title: "Nails",
    slug: "nail-classes",
    items: [
      { name: "Group Nail Art Class", slug: "group-nail-art-class", description: "Learn designs, techniques, and nail art basics", duration: "2 hrs", groupSize: "4–8" },
    ],
  },
  {
    title: "Men's",
    slug: "mens-classes",
    items: [
      { name: "Men's Grooming 101", slug: "mens-grooming-101", description: "Skincare, beard care, and looking sharp daily", duration: "90 min", groupSize: "4–10" },
    ],
  },
];

export const allClasses: ClassItem[] = classCategories.flatMap((c) => c.items);

// ─── Dropdown options for lead form ─────────────────────────────────

export const serviceOptions = [
  "Blowouts & Styling",
  "Haircut",
  "Color / Highlights",
  "Silk Press",
  "Braids & Protective Styles",
  "Extensions",
  "Updo & Formal Styling",
  "Manicure",
  "Pedicure",
  "Nail Art / Acrylics",
  "Makeup",
  "Facial",
  "Waxing",
  "Men's Haircut / Fade",
  "Beard Trim / Shave",
  "Men's Grooming",
  "Event / Group Booking",
  "Class / Workshop",
  "Other",
];

export const boroughs = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
  "Long Island",
  "Hoboken",
];

// ─── Social Proof ───────────────────────────────────────────────────

export const testimonials = [
  {
    name: "Jessica M.",
    borough: "Manhattan",
    text: "I never have to fight for a salon appointment again. They came right to my apartment and the blowout was amazing.",
    rating: 5,
  },
  {
    name: "Marcus T.",
    borough: "Brooklyn",
    text: "Best fade I've ever gotten — and I didn't even have to leave my couch. These guys are the real deal.",
    rating: 5,
  },
  {
    name: "Priya S.",
    borough: "Queens",
    text: "Booked them for my bridal party and every single person looked incredible. Worth every penny.",
    rating: 5,
  },
];

export const stats = [
  { value: "5k", label: "Happy New Yorkers" },
  { value: "4.9", label: "Average Rating" },
  { value: "5", label: "Boroughs Covered" },
  { value: "$99/hr", label: "Starting Price" },
  { value: "10k+", label: "Hours Saved" },
];

// ─── Navigation ─────────────────────────────────────────────────────

export const mainNav = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "Services", href: "/services" },
  { label: "Events", href: "/events" },
  { label: "Classes", href: "/classes" },
];

export const moreNav = [
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Locations", href: "/locations" },
  { label: "Reviews", href: "/reviews" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Founding CEO Position", href: "/founding-ceo-position-search" },
  { label: "Join the Team", href: "/join" },
];

// ─── Neighborhoods by Borough ───────────────────────────────────────

export const neighborhoods: Record<string, Neighborhood[]> = {
  manhattan: [
    { name: "Upper East Side", slug: "upper-east-side" },
    { name: "Upper West Side", slug: "upper-west-side" },
    { name: "Midtown", slug: "midtown" },
    { name: "Midtown East", slug: "midtown-east" },
    { name: "Midtown West", slug: "midtown-west" },
    { name: "Chelsea", slug: "chelsea" },
    { name: "Greenwich Village", slug: "greenwich-village" },
    { name: "East Village", slug: "east-village" },
    { name: "West Village", slug: "west-village" },
    { name: "SoHo", slug: "soho" },
    { name: "Tribeca", slug: "tribeca" },
    { name: "Lower East Side", slug: "lower-east-side" },
    { name: "Financial District", slug: "financial-district" },
    { name: "Harlem", slug: "harlem" },
    { name: "East Harlem", slug: "east-harlem" },
    { name: "Washington Heights", slug: "washington-heights" },
    { name: "Inwood", slug: "inwood" },
    { name: "Murray Hill", slug: "murray-hill" },
    { name: "Gramercy", slug: "gramercy" },
    { name: "Flatiron", slug: "flatiron" },
    { name: "NoHo", slug: "noho" },
    { name: "Nolita", slug: "nolita" },
    { name: "Hell's Kitchen", slug: "hells-kitchen" },
    { name: "Clinton", slug: "clinton" },
    { name: "Kips Bay", slug: "kips-bay" },
    { name: "Morningside Heights", slug: "morningside-heights" },
    { name: "NoMad", slug: "nomad" },
    { name: "Hudson Yards", slug: "hudson-yards" },
    { name: "Chinatown", slug: "chinatown" },
    { name: "Little Italy", slug: "little-italy" },
    { name: "Meatpacking District", slug: "meatpacking-district" },
    { name: "Battery Park City", slug: "battery-park-city" },
    { name: "Alphabet City", slug: "alphabet-city" },
    { name: "Roosevelt Island", slug: "roosevelt-island" },
    { name: "Yorkville", slug: "yorkville" },
    { name: "Lenox Hill", slug: "lenox-hill" },
    { name: "Carnegie Hill", slug: "carnegie-hill" },
    { name: "Hamilton Heights", slug: "hamilton-heights" },
    { name: "Sugar Hill", slug: "sugar-hill" },
    { name: "Turtle Bay", slug: "turtle-bay" },
    { name: "Two Bridges", slug: "two-bridges" },
    { name: "Marble Hill", slug: "marble-hill" },
    { name: "Sutton Place", slug: "sutton-place" },
    { name: "Stuyvesant Town", slug: "stuyvesant-town" },
  ],
  brooklyn: [
    { name: "Williamsburg", slug: "williamsburg" },
    { name: "South Williamsburg", slug: "south-williamsburg" },
    { name: "East Williamsburg", slug: "east-williamsburg" },
    { name: "Bushwick", slug: "bushwick" },
    { name: "Park Slope", slug: "park-slope" },
    { name: "DUMBO", slug: "dumbo" },
    { name: "Brooklyn Heights", slug: "brooklyn-heights" },
    { name: "Crown Heights", slug: "crown-heights" },
    { name: "Bed-Stuy", slug: "bed-stuy" },
    { name: "Cobble Hill", slug: "cobble-hill" },
    { name: "Carroll Gardens", slug: "carroll-gardens" },
    { name: "Greenpoint", slug: "greenpoint" },
    { name: "Prospect Heights", slug: "prospect-heights" },
    { name: "Fort Greene", slug: "fort-greene" },
    { name: "Clinton Hill", slug: "clinton-hill" },
    { name: "Bay Ridge", slug: "bay-ridge" },
    { name: "Sunset Park", slug: "sunset-park" },
    { name: "Flatbush", slug: "flatbush" },
    { name: "East Flatbush", slug: "east-flatbush" },
    { name: "Bensonhurst", slug: "bensonhurst" },
    { name: "Sheepshead Bay", slug: "sheepshead-bay" },
    { name: "Brighton Beach", slug: "brighton-beach" },
    { name: "Coney Island", slug: "coney-island" },
    { name: "Red Hook", slug: "red-hook" },
    { name: "Gowanus", slug: "gowanus" },
    { name: "Boerum Hill", slug: "boerum-hill" },
    { name: "Windsor Terrace", slug: "windsor-terrace" },
    { name: "Prospect Lefferts Gardens", slug: "prospect-lefferts-gardens" },
    { name: "Ditmas Park", slug: "ditmas-park" },
    { name: "Kensington", slug: "kensington" },
    { name: "Borough Park", slug: "borough-park" },
    { name: "Canarsie", slug: "canarsie" },
    { name: "East New York", slug: "east-new-york" },
    { name: "Brownsville", slug: "brownsville" },
    { name: "Midwood", slug: "midwood" },
    { name: "Dyker Heights", slug: "dyker-heights" },
    { name: "Marine Park", slug: "marine-park" },
    { name: "Mill Basin", slug: "mill-basin" },
    { name: "Gravesend", slug: "gravesend" },
    { name: "Vinegar Hill", slug: "vinegar-hill" },
    { name: "Downtown Brooklyn", slug: "downtown-brooklyn" },
    { name: "Prospect Park South", slug: "prospect-park-south" },
    { name: "Gerritsen Beach", slug: "gerritsen-beach" },
    { name: "Manhattan Beach", slug: "manhattan-beach" },
    { name: "Bergen Beach", slug: "bergen-beach" },
  ],
  queens: [
    { name: "Astoria", slug: "astoria" },
    { name: "Ditmars", slug: "ditmars" },
    { name: "Long Island City", slug: "long-island-city" },
    { name: "Jackson Heights", slug: "jackson-heights" },
    { name: "Flushing", slug: "flushing" },
    { name: "Forest Hills", slug: "forest-hills" },
    { name: "Sunnyside", slug: "sunnyside" },
    { name: "Woodside", slug: "woodside" },
    { name: "Ridgewood", slug: "ridgewood" },
    { name: "Rego Park", slug: "rego-park" },
    { name: "Jamaica", slug: "jamaica" },
    { name: "Bayside", slug: "bayside" },
    { name: "Fresh Meadows", slug: "fresh-meadows" },
    { name: "Kew Gardens", slug: "kew-gardens" },
    { name: "Kew Gardens Hills", slug: "kew-gardens-hills" },
    { name: "Howard Beach", slug: "howard-beach" },
    { name: "Rockaway Beach", slug: "rockaway-beach" },
    { name: "Far Rockaway", slug: "far-rockaway" },
    { name: "Elmhurst", slug: "elmhurst" },
    { name: "Corona", slug: "corona" },
    { name: "Ozone Park", slug: "ozone-park" },
    { name: "South Ozone Park", slug: "south-ozone-park" },
    { name: "Woodhaven", slug: "woodhaven" },
    { name: "Middle Village", slug: "middle-village" },
    { name: "Maspeth", slug: "maspeth" },
    { name: "Glendale", slug: "glendale" },
    { name: "Whitestone", slug: "whitestone" },
    { name: "College Point", slug: "college-point" },
    { name: "Douglaston", slug: "douglaston" },
    { name: "Little Neck", slug: "little-neck" },
    { name: "Richmond Hill", slug: "richmond-hill" },
    { name: "Briarwood", slug: "briarwood" },
    { name: "Springfield Gardens", slug: "springfield-gardens" },
    { name: "Laurelton", slug: "laurelton" },
    { name: "Rosedale", slug: "rosedale" },
    { name: "Belle Harbor", slug: "belle-harbor" },
    { name: "Neponsit", slug: "neponsit" },
    { name: "Bellerose", slug: "bellerose" },
    { name: "Floral Park", slug: "floral-park" },
    { name: "Glen Oaks", slug: "glen-oaks" },
    { name: "Hollis", slug: "hollis" },
    { name: "St. Albans", slug: "st-albans" },
    { name: "Cambria Heights", slug: "cambria-heights" },
    { name: "Queens Village", slug: "queens-village" },
    { name: "Oakland Gardens", slug: "oakland-gardens" },
    { name: "Auburndale", slug: "auburndale" },
    { name: "Murray Hill (Queens)", slug: "murray-hill-queens" },
  ],
  bronx: [
    { name: "Riverdale", slug: "riverdale" },
    { name: "Fordham", slug: "fordham" },
    { name: "Pelham Bay", slug: "pelham-bay" },
    { name: "Throgs Neck", slug: "throgs-neck" },
    { name: "Morris Park", slug: "morris-park" },
    { name: "Kingsbridge", slug: "kingsbridge" },
    { name: "Mott Haven", slug: "mott-haven" },
    { name: "Hunts Point", slug: "hunts-point" },
    { name: "Concourse", slug: "concourse" },
    { name: "Grand Concourse", slug: "grand-concourse" },
    { name: "Parkchester", slug: "parkchester" },
    { name: "City Island", slug: "city-island" },
    { name: "Co-op City", slug: "co-op-city" },
    { name: "Wakefield", slug: "wakefield" },
    { name: "Soundview", slug: "soundview" },
    { name: "Norwood", slug: "norwood" },
    { name: "Tremont", slug: "tremont" },
    { name: "University Heights", slug: "university-heights" },
    { name: "Belmont", slug: "belmont" },
    { name: "Woodlawn", slug: "woodlawn" },
    { name: "Williamsbridge", slug: "williamsbridge" },
    { name: "Eastchester", slug: "eastchester" },
    { name: "Castle Hill", slug: "castle-hill" },
    { name: "Spuyten Duyvil", slug: "spuyten-duyvil" },
    { name: "Highbridge", slug: "highbridge" },
    { name: "Melrose", slug: "melrose" },
    { name: "Port Morris", slug: "port-morris" },
    { name: "Van Nest", slug: "van-nest" },
    { name: "Country Club", slug: "country-club" },
    { name: "Clason Point", slug: "clason-point" },
    { name: "Schuylerville", slug: "schuylerville" },
    { name: "Westchester Square", slug: "westchester-square" },
    { name: "Baychester", slug: "baychester" },
    { name: "Edenwald", slug: "edenwald" },
    { name: "Olinville", slug: "olinville" },
  ],
  "staten-island": [
    { name: "St. George", slug: "st-george" },
    { name: "Stapleton", slug: "stapleton" },
    { name: "Tottenville", slug: "tottenville" },
    { name: "Great Kills", slug: "great-kills" },
    { name: "New Dorp", slug: "new-dorp" },
    { name: "Todt Hill", slug: "todt-hill" },
    { name: "West Brighton", slug: "west-brighton" },
    { name: "Eltingville", slug: "eltingville" },
    { name: "Annadale", slug: "annadale" },
    { name: "Huguenot", slug: "huguenot" },
    { name: "Travis", slug: "travis" },
    { name: "Port Richmond", slug: "port-richmond" },
    { name: "Dongan Hills", slug: "dongan-hills" },
    { name: "Midland Beach", slug: "midland-beach" },
    { name: "South Beach", slug: "south-beach" },
    { name: "Rosebank", slug: "rosebank" },
    { name: "Mariners Harbor", slug: "mariners-harbor" },
    { name: "Westerleigh", slug: "westerleigh" },
    { name: "Castleton Corners", slug: "castleton-corners" },
    { name: "Oakwood", slug: "oakwood" },
    { name: "Princes Bay", slug: "princes-bay" },
    { name: "Charleston", slug: "charleston" },
    { name: "Pleasant Plains", slug: "pleasant-plains" },
    { name: "Woodrow", slug: "woodrow" },
    { name: "Grasmere", slug: "grasmere" },
    { name: "Snug Harbor", slug: "snug-harbor" },
    { name: "Bulls Head", slug: "bulls-head" },
    { name: "New Springville", slug: "new-springville" },
    { name: "Grymes Hill", slug: "grymes-hill" },
    { name: "Emerson Hill", slug: "emerson-hill" },
    { name: "Richmondtown", slug: "richmondtown" },
    { name: "Willowbrook", slug: "willowbrook" },
  ],
};

export const boroughNames: Record<string, string> = {
  manhattan: "Manhattan",
  brooklyn: "Brooklyn",
  queens: "Queens",
  bronx: "Bronx",
  "staten-island": "Staten Island",
};

// ─── Computed counts ────────────────────────────────────────────────

export const totalNeighborhoods = Object.values(neighborhoods).reduce((s, h) => s + h.length, 0);
