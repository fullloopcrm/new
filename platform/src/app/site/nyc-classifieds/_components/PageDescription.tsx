// @ts-nocheck
'use client'

import Link from 'next/link'

interface PageDescriptionProps {
  categorySlug: string
  categoryName: string
  subcategorySlug?: string
  subcategoryName?: string
  neighborhood?: string
  neighborhoodHref?: string
  borough?: string
}

export default function PageDescription({
  categorySlug,
  categoryName,
  subcategorySlug,
  subcategoryName,
  neighborhood,
  neighborhoodHref,
  borough,
}: PageDescriptionProps) {
  const sub = subcategoryName
  const loc = neighborhood && borough ? `${neighborhood}, ${borough}` : borough || 'New York City'
  const locLink = neighborhoodHref ? (
    <Link href={neighborhoodHref} style={{ color: '#1a56db', textDecoration: 'none', fontWeight: 600 }}>{loc}</Link>
  ) : (
    <span style={{ fontWeight: 600 }}>{loc}</span>
  )
  const locShort = neighborhood || borough || 'NYC'
  const alertsLink = <Link href="/alerts" style={{ color: '#1a56db', textDecoration: 'none', fontWeight: 600 }}>get alerts</Link>
  const bold = (text: string) => <strong style={{ color: '#111827' }}>{text}</strong>

  // Get subcategory-specific examples
  const examples = sub && subcategorySlug ? getExamples(categorySlug, subcategorySlug) : null

  // Subcategory descriptions
  if (sub) {
    switch (categorySlug) {
      case 'jobs':
        return <P>Find {sub.toLowerCase()} jobs in {locLink} posted by {bold('verified local employers')} and businesses. {bold('Every job poster is geo-verified')} with a live selfie and GPS at their NYC address — no recruiters, no spam, just real opportunities in your neighborhood. {examples && <>Browse {examples}. </>}{bold('100% free')} to post and apply. {alertsLink} when new {sub.toLowerCase()} jobs drop in {locShort}.</P>
      case 'for-sale':
        return <P>Shop {sub.toLowerCase()} in {locLink} from your {bold('geo-verified')} neighbors. {bold('Every seller')} is confirmed to live or work nearby — meet locally, buy safely, no shipping hassles. {examples && <>Browse {examples}. </>}{bold('100% free')} to list and browse. {alertsLink} when new {sub.toLowerCase()} listings drop in {locShort}.</P>
      case 'services':
        return <P>Find trusted {sub.toLowerCase()} professionals in {locLink} — {bold('every provider is geo-verified')} to your neighborhood. These are your real neighbors offering real services, not anonymous contractors from across the city. {examples && <>Browse {examples}. </>}{bold('Completely free')} to post and browse. {alertsLink} when new {sub.toLowerCase()} pros post in {locShort}.</P>
      case 'housing':
        return <P>Find {sub.toLowerCase()} in {locLink} posted by {bold('geo-verified')} locals. {bold('Every listing')} comes from a real person confirmed to live or work here — no brokers, no scams, no fake photos. {examples && <>Browse {examples}. </>}{bold('Completely free')} to post and browse. {alertsLink} when new {sub.toLowerCase()} listings go live in {locShort}.</P>
      case 'gigs':
        return <P>Find {sub.toLowerCase()} gigs in {locLink} posted by your {bold('geo-verified')} neighbors. Quick jobs and side work from people {bold('confirmed to be in your area')} — pick up work right in your neighborhood. {examples && <>Browse {examples}. </>}{bold('Free')} to post and apply. {alertsLink} for new {sub.toLowerCase()} gigs in {locShort}.</P>
      case 'community':
        return <P>Connect with your {bold('verified neighbors')} through {sub.toLowerCase()} in {locLink}. {bold('Every post')} comes from someone confirmed to live or work right here — a real community board, not a faceless feed. {examples && <>Browse {examples}. </>}{bold('Free')} to join and post. {alertsLink} to stay connected with {locShort}.</P>
      case 'tickets':
        return <P>Buy and sell {sub.toLowerCase()} tickets in {locLink} from {bold('geo-verified')} locals. No bots, no scalpers — {bold('every seller')} is confirmed to be a real person in your area. {examples && <>Browse {examples}. </>}{bold('Free')} to post and browse. {alertsLink} when new {sub.toLowerCase()} tickets drop in {locShort}.</P>
      case 'pets':
        return <P>Find {sub.toLowerCase()} in {locLink} from {bold('verified pet owners')} and animal lovers. {bold('Every poster is geo-verified')} — they're your actual neighbors who care about animals as much as you do. {examples && <>Browse {examples}. </>}{bold('Completely free')} to post. {alertsLink} for {sub.toLowerCase()} in {locShort}.</P>
      case 'personals':
        return <P>Find {sub.toLowerCase()} in {locLink}. {bold('Every person is geo-verified')} with a live selfie and GPS — you know they're real and actually local. {examples && <>Browse {examples}. </>}{bold('Free')} and safe to use. {alertsLink} to connect with verified people in {locShort}.</P>
      case 'barter':
        return <P>Browse {sub.toLowerCase()} listings in {locLink}. Trade with your {bold('geo-verified')} neighbors — {bold('every user')} is confirmed local. {examples && <>Browse {examples}. </>}No money needed, just swap what you have for what you need. {bold('Free')} to post in {locShort}.</P>
      case 'rentals':
        return <P>Find {sub.toLowerCase()} available to rent or borrow in {locLink}. {bold('Every lender is geo-verified')} — they're your actual neighbors. {examples && <>Browse {examples}. </>}Why buy when you can borrow from someone nearby? {bold('Free')} to post and browse in {locShort}.</P>
      case 'resumes':
        return <P>Browse verified {sub.toLowerCase()} professionals in {locLink}. {bold('Every candidate is geo-verified')} with selfie + GPS — they actually live or work in your area. {examples && <>Browse {examples}. </>}{bold('Free')} to post your resume and get found by local employers. {alertsLink} for new {sub.toLowerCase()} candidates in {locShort}.</P>
      default:
        return <P>Browse {sub.toLowerCase()} listings in {locLink}. {bold('Every poster is geo-verified')} with a live selfie and GPS at their NYC address. {bold('Free')} to browse and post. {alertsLink} when new {sub.toLowerCase()} listings drop in {locShort}.</P>
    }
  }

  // Category-level descriptions (no subcategory)
  switch (categorySlug) {
    case 'housing':
      return <P>Find apartments, rooms, sublets, and more in {locLink}. {bold('Every listing')} is posted by a {bold('geo-verified')} local — confirmed with a selfie and GPS at their NYC address. No brokers, no scams, no fees. Just real housing from real neighbors. {alertsLink} when new housing listings go live in {locShort}.</P>
    case 'jobs':
      return <P>Browse jobs in {locLink} posted by {bold('verified local businesses')} and neighbors. From full-time careers to part-time roles across 41 industries, {bold('every poster')} is confirmed to be in your area with selfie + GPS verification. No middlemen, no fees. {alertsLink} for new jobs in {locShort}.</P>
    case 'for-sale':
      return <P>Find great deals on everything in {locLink}. {bold('Every seller')} is a {bold('geo-verified')} local — confirmed with a selfie and GPS. Furniture, electronics, clothing, bikes, and more from neighbors you can actually meet. No fees, no shipping hassles. {alertsLink} for new listings in {locShort}.</P>
    case 'services':
      return <P>Hire trusted local professionals in {locLink}. From cleaning to plumbing to tutoring, {bold('every service provider is geo-verified')} with a selfie and GPS. These are your real neighbors offering real services — not anonymous gig workers from across the city. {bold('Free')} to post and browse in {locShort}.</P>
    case 'gigs':
      return <P>Browse gig work in {locLink}. Dog walking, moving help, tutoring, event staffing, and 30+ categories — all posted by {bold('geo-verified')} locals. Pick up work right in your neighborhood or hire someone nearby. {bold('Free')} to post, free to apply. {alertsLink} in {locShort}.</P>
    case 'community':
      return <P>Connect with your {bold('verified neighbors')} in {locLink}. Events, groups, local alerts, garage sales, stoop sales, and more — {bold('every post')} comes from a {bold('geo-verified')} local. This is your neighborhood community board, spam-free and real. Join the conversation in {locShort}.</P>
    case 'tickets':
      return <P>Buy and sell tickets and find local events in {locLink}. {bold('Every poster')} is a {bold('geo-verified')} neighbor. Broadway, concerts, comedy, festivals, and sports — get deals from real people, not scalper bots. {bold('Free')} to browse and post. {alertsLink} in {locShort}.</P>
    case 'pets':
      return <P>Adopt pets, find dog walkers, groomers, and pet sitters in {locLink}. {bold('Every poster')} is a {bold('verified local')} — confirmed with selfie + GPS. Connect with fellow animal lovers in your neighborhood. {bold('Completely free')} to post and browse in {locShort}.</P>
    case 'personals':
      return <P>Personals in {locLink}. Meet real, {bold('verified New Yorkers')} who actually live near you. Activity partners, missed connections, and platonic friendships — {bold('every user')} is confirmed local with selfie + GPS verification. No catfish, no fakes. {bold('Free')} and safe in {locShort}.</P>
    case 'barter':
      return <P>Trade goods and skills with {bold('verified neighbors')} in {locLink}. {bold('Every user is geo-verified')} — they live or work right here. Goods for goods, goods for skills, skills for skills. No money needed, just swap with people you can trust. {bold('Free')} to post in {locShort}.</P>
    case 'rentals':
      return <P>Rent and borrow from {bold('verified neighbors')} in {locLink}. Tools, cameras, sports gear, party supplies, and more — all from {bold('geo-verified')} locals. Why buy it when your neighbor has one? {bold('Free')} to post and browse in {locShort}.</P>
    case 'resumes':
      return <P>Browse resumes from {bold('verified professionals')} in {locLink}. {bold('Every candidate is geo-verified')} with selfie + GPS — they actually live or work here. Find local talent across 30+ industries. {bold('Free')} to post your resume and get found by employers. {alertsLink} in {locShort}.</P>
    default:
      return <P>Browse {categoryName.toLowerCase()} listings in {locLink}. {bold('Every poster is geo-verified')}. {bold('Free')} to browse and post. {alertsLink} in {locShort}.</P>
  }
}

// ── Location-only description (borough or neighborhood hub) ──

export function LocationDescription({ neighborhood, neighborhoodHref, borough }: {
  neighborhood?: string
  neighborhoodHref?: string
  borough?: string
}) {
  const loc = neighborhood && borough ? `${neighborhood}, ${borough}` : borough || 'New York City'
  const locLink = neighborhoodHref ? (
    <Link href={neighborhoodHref} style={{ color: '#1a56db', textDecoration: 'none', fontWeight: 600 }}>{loc}</Link>
  ) : (
    <span style={{ fontWeight: 600 }}>{loc}</span>
  )
  const locShort = neighborhood || borough || 'NYC'
  const alertsLink = <Link href="/alerts" style={{ color: '#1a56db', textDecoration: 'none', fontWeight: 600 }}>get alerts</Link>
  const bold = (text: string) => <strong style={{ color: '#111827' }}>{text}</strong>
  const signupLink = <Link href="/signup" style={{ color: '#1a56db', textDecoration: 'none', fontWeight: 600 }}>sign up free</Link>

  if (neighborhood) {
    return <P>Welcome to {locLink} on The NYC Classifieds — your {bold('neighborhood marketplace')} for apartments, jobs, services, things for sale, gigs, and more. {bold('Every person who posts here is geo-verified')} with a live selfie and GPS to {locShort}. No bots, no strangers from across the city — just your {bold('real neighbors')} buying, selling, hiring, and connecting. {signupLink} or {alertsLink} for new posts in {locShort}.</P>
  }

  // Borough-level
  return <P>Browse classified ads across {bold(`every neighborhood in ${loc}`)} on The NYC Classifieds. Apartments, jobs, services, items for sale, gigs, community posts, and more — all from people {bold('geo-verified')} with a live selfie and GPS to their {loc} address. This isn't a faceless feed. {bold('These are your actual neighbors.')} {signupLink} or {alertsLink} to stay connected.</P>
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: '#4b5563',
      fontSize: '0.875rem',
      lineHeight: 1.6,
      marginBottom: '20px',
      maxWidth: '720px',
    }}>
      {children}
    </p>
  )
}

// ── Subcategory examples (inline for this component) ──

const examples: Record<string, Record<string, string>> = {
  housing: {
    'apartments': 'studio and 1BR units, no-fee rentals, walk-ups, and elevator buildings',
    'apartments-wanted': 'apartment-wanted posts, roommate searches, and neighborhood-specific housing requests',
    'co-working': 'shared desks, private offices, meeting rooms, and day passes',
    'for-sale-real-estate': 'condos, co-ops, townhouses, multi-family properties, and investment opportunities',
    'parking-storage': 'monthly parking spots, garage spaces, storage units, and warehouse rentals',
    'real-estate-wanted': 'buyer requests, investment inquiries, and property searches',
    'rooms-shared': 'private rooms, shared apartments, furnished rooms, and month-to-month arrangements',
    'sublets': 'short-term sublets, summer sublets, furnished sublets, and temporary housing',
  },
  jobs: {
    'accounting-finance': 'bookkeeping roles, tax prep positions, financial analyst openings, and CPA opportunities',
    'admin-office': 'receptionist positions, office manager roles, executive assistant openings, and data entry jobs',
    'ai-machine-learning': 'ML engineer roles, AI researcher positions, NLP specialists, and prompt engineering jobs',
    'architecture-design': 'architect positions, interior design roles, CAD drafting jobs, and urban planning openings',
    'biotech-pharma': 'lab technician roles, research scientist positions, clinical trial coordinators, and pharmaceutical sales',
    'cannabis-industry': 'budtender positions, dispensary management roles, cultivation jobs, and compliance officers',
    'construction': 'general labor, foreman roles, project manager positions, and heavy equipment operators',
    'creative-media': 'graphic designer roles, video editor positions, content creator jobs, and art director openings',
    'customer-service': 'call center roles, help desk positions, client relations jobs, and support specialists',
    'cybersecurity': 'security analyst roles, penetration tester positions, SOC analyst jobs, and compliance officers',
    'data-science': 'data analyst roles, data engineer positions, BI jobs, and visualization specialists',
    'delivery-logistics': 'delivery driver positions, warehouse coordinator roles, dispatch jobs, and courier openings',
    'education-teaching': 'tutoring positions, after-school programs, ESL teaching roles, and substitute teacher openings',
    'engineering': 'mechanical engineer roles, civil engineer positions, electrical engineering jobs, and project engineering',
    'fashion-apparel': 'fashion designer roles, merchandising positions, retail buyer jobs, and showroom coordinators',
    'film-tv-production': 'production assistant roles, camera operator positions, set design jobs, and post-production',
    'fitness-wellness': 'personal trainer roles, yoga instructor positions, gym manager jobs, and wellness coaching',
    'food-beverage': 'chef positions, line cook roles, bakery jobs, barista openings, and food truck operators',
    'government': 'city agency roles, public administration positions, policy analyst jobs, and municipal worker openings',
    'healthcare': 'medical assistant roles, phlebotomist positions, home health aide jobs, and EMT openings',
    'hotel-tourism': 'front desk roles, concierge positions, housekeeping jobs, and tour guide openings',
    'human-resources': 'HR coordinator roles, recruiter positions, benefits specialist jobs, and training managers',
    'legal': 'paralegal roles, legal secretary positions, compliance officer jobs, and associate openings',
    'marketing-advertising': 'social media manager roles, SEO specialist positions, brand strategist jobs, and campaign coordinators',
    'nonprofit': 'program coordinator roles, fundraising positions, grant writer jobs, and outreach specialists',
    'nursing': 'registered nurse roles, LPN positions, home care nurse jobs, and nurse practitioners',
    'operations-warehouse': 'operations manager roles, inventory specialist positions, shipping clerk jobs, and logistics coordinators',
    'part-time': 'flexible part-time roles, weekend positions, evening shifts, and supplemental income opportunities',
    'property-management': 'property manager roles, leasing agent positions, superintendent jobs, and maintenance coordinators',
    'real-estate': 'real estate agent positions, broker roles, appraiser jobs, and transaction coordinators',
    'remote-hybrid': 'work-from-home positions, hybrid roles, remote-first opportunities, and flexible location jobs',
    'restaurant-hospitality': 'server positions, host roles, bartender jobs, kitchen manager openings, and catering coordinators',
    'retail': 'sales associate positions, store manager roles, visual merchandiser jobs, and inventory specialists',
    'sales': 'account executive roles, business development positions, inside sales jobs, and sales manager openings',
    'security': 'security guard positions, loss prevention roles, building security jobs, and event security',
    'social-work': 'case manager roles, therapist positions, community outreach jobs, and crisis counselors',
    'software-engineering': 'full-stack developer roles, frontend engineer positions, backend developer jobs, and DevOps',
    'sustainability-green': 'sustainability coordinator roles, environmental analyst positions, and green energy jobs',
    'tech-engineering': 'IT support roles, systems administrator positions, network engineer jobs, and QA testers',
    'trades-skilled-labor': 'electrician roles, plumber positions, HVAC technician jobs, and welder openings',
    'transportation': 'CDL driver positions, dispatcher roles, fleet manager jobs, and logistics coordinators',
    'writing-editing': 'content writer roles, copy editor positions, technical writer jobs, and proofreader openings',
  },
  'for-sale': {
    'appliances': 'washers, dryers, refrigerators, microwaves, and small kitchen appliances',
    'art-prints': 'original artwork, framed prints, photography, posters, and gallery pieces',
    'baby-kids': 'strollers, cribs, toys, children\'s clothing, and baby gear',
    'bikes': 'road bikes, mountain bikes, city cruisers, fixies, and bike accessories',
    'books-media': 'novels, textbooks, vinyl records, DVDs, and audiobooks',
    'building-materials': 'lumber, tiles, paint, fixtures, and renovation supplies',
    'cameras-photo': 'DSLR cameras, mirrorless bodies, lenses, tripods, and lighting equipment',
    'cars-trucks': 'sedans, SUVs, trucks, vans, and classic vehicles',
    'cell-phones': 'iPhones, Android phones, unlocked devices, accessories, and tablets',
    'clothing-accessories': 'designer clothing, vintage wear, shoes, belts, and scarves',
    'collectibles': 'trading cards, coins, figurines, memorabilia, and limited editions',
    'computer-parts': 'GPUs, motherboards, RAM, SSDs, and monitors',
    'e-bikes-scooters': 'electric bikes, e-scooters, mopeds, and electric skateboards',
    'electronics': 'TVs, speakers, headphones, smart home devices, and laptops',
    'free-stuff': 'furniture, clothing, books, appliances, and household items — all free',
    'furniture': 'sofas, tables, chairs, desks, bookshelves, and bed frames',
    'gaming-consoles': 'PlayStation, Xbox, Nintendo Switch, gaming PCs, and retro consoles',
    'handbags-wallets': 'designer handbags, wallets, clutches, tote bags, and messenger bags',
    'health-beauty': 'skincare products, makeup, hair tools, wellness devices, and fragrances',
    'home-decor': 'rugs, lamps, wall art, mirrors, and decorative accents',
    'instruments': 'guitars, keyboards, drums, brass instruments, and DJ equipment',
    'jewelry-watches': 'rings, necklaces, bracelets, luxury watches, and vintage jewelry',
    'kitchen-dining': 'cookware, small appliances, barware, tableware, and storage containers',
    'motorcycles': 'sport bikes, cruisers, scooters, vintage motorcycles, and gear',
    'office-equipment': 'desks, chairs, printers, monitors, and office supplies',
    'outdoor-camping': 'tents, backpacks, sleeping bags, hiking gear, and camping stoves',
    'power-tools': 'drills, saws, sanders, impact drivers, and tool sets',
    'sneakers-streetwear': 'limited-edition sneakers, Supreme, vintage streetwear, and hype drops',
    'sporting-goods': 'gym equipment, yoga mats, weights, sports gear, and fitness accessories',
    'toys-games': 'board games, LEGO sets, action figures, puzzles, and outdoor toys',
    'vinyl-records': 'classic rock, jazz, hip-hop, rare pressings, and record players',
    'vintage-antiques': 'mid-century furniture, antique jewelry, vintage clothing, and estate finds',
  },
  services: {
    'ai-automation': 'AI chatbot setup, workflow automation, data pipelines, and custom AI tools',
    'appliance-repair': 'washer/dryer repair, refrigerator fixes, dishwasher service, and oven troubleshooting',
    'auto-repair': 'oil changes, brake service, transmission work, body repair, and inspections',
    'beauty-hair': 'haircuts, color treatments, blowouts, braiding, and bridal styling',
    'bike-repair': 'flat fixes, tune-ups, brake adjustments, wheel truing, and full overhauls',
    'carpentry': 'custom shelving, cabinet installation, door hanging, trim work, and furniture repair',
    'catering': 'event catering, meal prep for parties, corporate lunch, and holiday catering',
    'childcare-nanny': 'full-time nannies, part-time babysitters, after-school care, and newborn specialists',
    'cleaning': 'deep cleaning, move-out cleaning, weekly service, office cleaning, and post-renovation cleanup',
    'content-creation': 'blog writing, social media content, video scripts, and brand storytelling',
    'dj-entertainment': 'wedding DJs, party DJs, karaoke hosts, live music, and event MCs',
    'e-bike-scooter-repair': 'battery diagnostics, motor repair, tire replacement, and electrical troubleshooting',
    'electrical': 'outlet installation, panel upgrades, lighting fixtures, wiring repair, and ceiling fans',
    'flooring': 'hardwood installation, tile work, laminate, floor refinishing, and carpet installation',
    'graphic-design': 'logo design, brand identity, flyer design, social media graphics, and packaging',
    'handyman': 'furniture assembly, TV mounting, shelf hanging, minor plumbing, and general repairs',
    'home-organizing': 'closet organization, kitchen decluttering, garage cleanup, and storage solutions',
    'hvac-heating': 'AC repair, furnace maintenance, duct cleaning, thermostat install, and heat pumps',
    'interior-design': 'room makeovers, space planning, furniture selection, color consulting, and staging',
    'junk-removal': 'furniture removal, appliance hauling, construction debris, and estate cleanouts',
    'legal': 'contract review, lease disputes, small claims guidance, and business formation',
    'locksmith': 'lockouts, rekeying, lock installation, key duplication, and smart lock setup',
    'massage-wellness': 'deep tissue, Swedish, sports massage, prenatal massage, and reflexology',
    'meal-prep': 'weekly meal prep, diet-specific cooking, family portions, and post-workout meals',
    'moving-hauling': 'local moves, apartment moves, furniture delivery, packing, and storage transport',
    'music-lessons': 'guitar lessons, piano instruction, vocal coaching, drum lessons, and music theory',
    'notary': 'document notarization, loan signings, affidavits, and power of attorney',
    'painting': 'interior painting, exterior painting, accent walls, cabinet refinishing, and touch-ups',
    'personal-training': 'one-on-one training, group fitness, weight loss, strength, and flexibility coaching',
    'pest-control': 'roach treatment, bed bug removal, rodent control, and preventive spraying',
    'pet-grooming': 'dog grooming, cat grooming, nail trimming, de-shedding, and mobile grooming',
    'photography': 'portrait sessions, event photography, headshots, product photos, and real estate',
    'plant-care': 'indoor plant maintenance, repotting, plant health consultations, and balcony gardens',
    'plumbing': 'leak repair, drain unclogging, toilet installation, faucet replacement, and water heaters',
    'smart-home-setup': 'smart speakers, security cameras, smart lighting, thermostats, and home automation',
    'social-media-mgmt': 'account management, content scheduling, engagement strategy, and analytics',
    'soundproofing': 'wall insulation, window treatment, door sealing, acoustic panels, and studio work',
    'tailoring': 'hem alterations, suit tailoring, dress fittings, zipper replacement, and custom adjustments',
    'tax-accounting': 'tax filing, bookkeeping, quarterly estimates, small business accounting, and audits',
    'tutoring': 'math tutoring, SAT/ACT prep, college essays, language instruction, and science',
    'tv-mounting': 'flat-screen mounting, cable management, sound bar installation, and projector setup',
    'videography': 'event videos, promotional content, social media reels, interviews, and walkthroughs',
    'web-app-dev': 'website design, app development, e-commerce, WordPress, and SEO optimization',
    'window-cleaning': 'residential windows, commercial washing, screen cleaning, and high-rise service',
  },
  gigs: {
    'background-extra-work': 'TV/film background roles, commercial extras, music video appearances, and crowd scenes',
    'bartending': 'event bartending, private party bar service, cocktail catering, and tastings',
    'brand-ambassador': 'product sampling, street team promotions, event representation, and brand activations',
    'catering-help': 'event prep, food service, kitchen assistance, cleanup crew, and buffet setup',
    'cleaning': 'one-time deep cleans, move-out cleaning, post-party cleanup, and office tidying',
    'closet-organizing': 'wardrobe edits, closet systems, seasonal rotation, and donation sorting',
    'content-creation': 'social media posts, product photos, short-form video, and TikTok content',
    'data-entry': 'spreadsheet work, database input, document digitization, and form processing',
    'delivery-runs': 'package drops, grocery delivery, restaurant pickups, and same-day courier runs',
    'dog-walking': 'daily walks, group walks, puppy visits, and senior dog exercise',
    'errand-running': 'pharmacy pickups, dry cleaning, post office runs, and miscellaneous errands',
    'event-setup': 'table/chair setup, decorations, sound equipment, and venue breakdown',
    'flyer-promo': 'flyer distribution, door-to-door drops, poster hanging, and street marketing',
    'focus-groups': 'paid research sessions, product testing, surveys, and user interviews',
    'furniture-assembly': 'IKEA assembly, desk setup, bookshelf building, and bed frame construction',
    'grocery-shopping': 'weekly grocery runs, specialty store shopping, bulk buying, and delivery',
    'house-sitting': 'overnight stays, plant watering, mail collection, and pet companionship',
    'line-waiting': 'restaurant lines, sneaker releases, government office waits, and event queues',
    'market-research': 'survey completion, in-store audits, mystery shopping, and consumer interviews',
    'moving-help': 'loading/unloading, furniture carrying, box packing, and truck riding',
    'packing-unpacking': 'box packing, labeling, fragile wrapping, and unpacking at your new place',
    'painting': 'room painting, touch-ups, accent walls, and small area jobs',
    'personal-shopping': 'outfit selection, gift shopping, home decor sourcing, and style consultations',
    'pet-sitting': 'overnight pet care, drop-in visits, medication admin, and multi-pet sitting',
    'photography': 'event photos, portraits, product shots, and real estate photography',
    'snow-shoveling': 'sidewalk clearing, stoop shoveling, driveway plowing, and salt spreading',
    'tech-help': 'computer setup, Wi-Fi troubleshooting, printer installation, and device support',
    'translation': 'document translation, interpreter services, phone calls, and form assistance',
    'video-editing': 'social media edits, YouTube videos, highlight reels, and promotional clips',
    'warehouse-help': 'inventory sorting, package handling, shelf stocking, and order fulfillment',
  },
  'tickets': {
    'broadway': 'musical tickets, play tickets, matinee shows, orchestra seats, and previews',
    'comedy': 'stand-up shows, improv nights, comedy club tickets, and open mic events',
    'concerts': 'live music shows, arena concerts, intimate venues, and festival passes',
    'festivals': 'food festivals, music festivals, cultural events, and street fairs',
    'resale': 'sold-out tickets, premium seating, VIP passes, and face-value transfers',
    'sports': 'Knicks, Nets, Yankees, Mets, Rangers, and other NYC sports tickets',
  },
  pets: {
    'adoption': 'dogs, cats, rabbits, birds, and other animals looking for loving homes',
    'dog-walking': 'daily walks, group walks, puppy visits, senior dog exercise, and adventure hikes',
    'grooming': 'full grooming, nail trimming, bathing, de-shedding, and breed-specific cuts',
    'lost-found-pets': 'missing pet alerts, found animal reports, sighting updates, and reunion help',
    'pet-sitting': 'overnight stays, drop-in visits, medication admin, and vacation pet care',
  },
  personals: {
    'activity-partners': 'workout buddies, hiking partners, concert companions, museum friends, and dining partners',
    'missed-connections': 'coffee shop encounters, subway moments, park conversations, and neighborhood sightings',
    'penpals-virtual-only': 'letter exchanges, email buddies, long-distance friendships, and virtual conversation partners',
    'strictly-platonic': 'friendship seekers, new-to-NYC connections, hobby partners, and neighborhood hangouts',
  },
  barter: {
    'goods-for-goods': 'furniture swaps, electronics trades, clothing exchanges, and household bartering',
    'goods-for-skills': 'trade stuff for services — furniture for cleaning, electronics for tutoring, and more',
    'skills-for-skills': 'swap expertise — design for photography, language lessons for cooking, and more',
  },
  'rentals': {
    'baby-kid-gear': 'strollers, cribs, car seats, high chairs, and baby carriers',
    'cameras-gear': 'DSLR cameras, lenses, lighting kits, tripods, and video equipment',
    'formal-wear': 'evening gowns, suits, tuxedos, designer dresses, and accessories',
    'moving-equipment': 'dollies, hand trucks, moving blankets, straps, and furniture sliders',
    'party-supplies': 'folding tables, chairs, speakers, projectors, and decoration kits',
    'sports-equipment': 'bikes, kayaks, skis, camping gear, and fitness equipment',
    'tools-equipment': 'power drills, saws, ladders, pressure washers, and painting equipment',
  },
  resumes: {
    'accounting-finance': 'accountants, financial analysts, bookkeepers, and tax specialists',
    'admin-office': 'office managers, executive assistants, receptionists, and admin coordinators',
    'ai-data-science': 'ML engineers, data scientists, AI researchers, and analytics specialists',
    'architecture-design': 'architects, interior designers, CAD specialists, and urban planners',
    'biotech-pharma': 'lab researchers, clinical trial managers, and pharmaceutical scientists',
    'construction': 'project managers, site supervisors, estimators, and safety coordinators',
    'creative-media': 'graphic designers, video editors, content creators, and art directors',
    'customer-service': 'support specialists, call center reps, and client success managers',
    'cybersecurity': 'security analysts, penetration testers, and compliance officers',
    'education-teaching': 'teachers, tutors, curriculum developers, and education administrators',
    'engineering': 'mechanical engineers, civil engineers, electrical engineers, and project engineers',
    'fashion': 'fashion designers, merchandisers, stylists, and production coordinators',
    'film-tv': 'producers, directors, editors, and cinematographers',
    'fitness-wellness': 'personal trainers, yoga instructors, wellness coaches, and gym managers',
    'food-hospitality': 'chefs, restaurant managers, bartenders, and catering coordinators',
    'healthcare': 'medical assistants, technicians, therapists, and healthcare administrators',
    'human-resources': 'HR managers, recruiters, benefits coordinators, and training specialists',
    'legal': 'paralegals, legal assistants, compliance officers, and contract specialists',
    'marketing-advertising': 'marketing managers, SEO specialists, social media managers, and brand strategists',
    'nonprofit': 'program directors, fundraisers, grant writers, and community organizers',
    'nursing': 'registered nurses, LPNs, nurse practitioners, and clinical specialists',
    'operations': 'operations managers, logistics coordinators, and supply chain analysts',
    'real-estate': 'real estate agents, property managers, leasing consultants, and appraisers',
    'retail': 'store managers, sales associates, visual merchandisers, and district managers',
    'sales': 'account executives, BDRs, sales managers, and territory managers',
    'social-work': 'social workers, case managers, therapists, and outreach coordinators',
    'software-engineering': 'full-stack developers, frontend engineers, backend devs, and DevOps',
    'tech': 'IT admins, systems engineers, network specialists, and QA testers',
    'trades-skilled-labor': 'electricians, plumbers, HVAC techs, welders, and carpenters',
    'transportation': 'CDL drivers, dispatchers, fleet managers, and logistics planners',
    'writing-editing': 'writers, editors, content strategists, and technical communicators',
  },
}

function getExamples(categorySlug: string, subcategorySlug: string): string | null {
  return examples[categorySlug]?.[subcategorySlug] || null
}
