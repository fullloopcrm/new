/**
 * Industry registry — the SINGLE source of trade knowledge for the whole platform.
 *
 * Every one of the 53 territory-map service_categories maps to a canonical
 * IndustryKey with its own service presets + booking checklist, so a tenant is
 * provisioned "thinking like the trade" no matter which trade signs up. mapIndustry
 * is the one door: free-text trade/category → canonical vertical. Order matters —
 * specific patterns are tested before broad ones (e.g. "window cleaning" before the
 * maid "clean" rule; "pet waste" before junk's "waste"; "garage door repair" before
 * handyman's "repair"; "water damage" before plumbing's "water").
 *
 * Presets are hourly-model (price_cents = rate×100, per_unit=hour) to match the
 * existing booking/billing engine; operators edit real numbers in onboarding.
 */

export type IndustryKey =
  // service (booking) verticals — short / 1-day
  | 'cleaning' | 'window_cleaning' | 'gutter' | 'carpet_cleaning' | 'air_duct'
  | 'pressure_washing' | 'post_construction' | 'bin_cleaning' | 'pool' | 'chimney'
  | 'lawn_care' | 'irrigation' | 'snow_removal' | 'tree_service' | 'holiday_lighting'
  | 'pest' | 'junk_removal' | 'dumpster' | 'towing' | 'appliance_repair'
  | 'garage_door' | 'locksmith' | 'home_inspection' | 'septic' | 'auto_detailing'
  | 'pet_grooming' | 'pet_waste' | 'handyman' | 'hvac' | 'plumbing' | 'electrical'
  | 'mobile_salon' | 'laundry' | 'fitness'
  // project (lead) verticals — can run days → a year
  | 'landscaping' | 'remodeling' | 'roofing' | 'siding' | 'painting' | 'flooring'
  | 'concrete' | 'deck' | 'fencing' | 'demolition' | 'drywall' | 'epoxy'
  | 'foundation' | 'insulation' | 'moving' | 'paving' | 'windows_doors' | 'stucco'
  | 'solar' | 'smart_home' | 'accessibility' | 'restoration' | 'interior_design'
  // fallback
  | 'general'

export interface DefaultService {
  name: string
  description: string
  default_duration_hours: number
  default_hourly_rate: number
  sort_order: number
}

export interface ChecklistField {
  key: string
  enabled: boolean
  required: boolean
  question: string
  sms_options: string
}

/** Free-text trade/category → canonical vertical. Specific rules FIRST. */
export function mapIndustry(raw: string | null | undefined): IndustryKey {
  const s = (raw || '').toLowerCase()
  if (!s.trim()) return 'general'

  // --- restoration & damage (before plumbing's "water") ---
  if (/water damage|fire damage|smoke|flood|mold|remediat|restoration|water extraction/.test(s)) return 'restoration'

  // --- specific cleaning-adjacent (before the broad maid "clean" rule) ---
  if (/window clean/.test(s)) return 'window_cleaning'
  if (/gutter/.test(s)) return 'gutter'
  if (/carpet|upholstery/.test(s)) return 'carpet_cleaning'
  if (/air ?duct|dryer vent/.test(s)) return 'air_duct'
  if (/pressure ?wash|power ?wash|soft ?wash/.test(s)) return 'pressure_washing'
  if (/post.?construction/.test(s)) return 'post_construction'
  if (/trash ?bin|garbage ?can|bin clean/.test(s)) return 'bin_cleaning'
  if (/pool/.test(s)) return 'pool'
  if (/chimney/.test(s)) return 'chimney'
  // --- maid / house cleaning ---
  if (/house ?clean|maid|janitor|housekeep|\bcleaning\b/.test(s)) return 'cleaning'

  // --- pets (before junk's "waste") ---
  if (/pet ?groom|dog ?groom|grooming/.test(s)) return 'pet_grooming'
  if (/pet ?waste|dog ?waste|poop|pooper/.test(s)) return 'pet_waste'

  // --- hauling / disposal ---
  if (/dumpster|roll ?off|container rental/.test(s)) return 'dumpster'
  if (/junk|debris|\bhaul|cleanout/.test(s)) return 'junk_removal'
  if (/tow|roadside|wrecker|recovery|jumpstart|lockout tow/.test(s)) return 'towing'

  // --- outdoor / seasonal (before landscaping's broad rules) ---
  if (/tree (service|trim|remov)|stump|arborist/.test(s)) return 'tree_service'
  if (/snow|plow|de-?ice|ice removal/.test(s)) return 'snow_removal'
  if (/irrigation|sprinkler/.test(s)) return 'irrigation'
  if (/lawn ?care|lawn ?mow|mowing/.test(s)) return 'lawn_care'
  if (/holiday|christmas light/.test(s)) return 'holiday_lighting'
  if (/landscap|hardscape|mulch|garden|sod\b/.test(s)) return 'landscaping'

  // --- pest ---
  if (/pest|extermin|termite|rodent|bed ?bug|mosquito|roach/.test(s)) return 'pest'

  // --- specialty installs/repairs (before broad electrical/handyman) ---
  if (/solar/.test(s)) return 'solar'
  if (/smart ?home|security (install|system|camera)|home automation|surveillance/.test(s)) return 'smart_home'
  if (/aging.?in.?place|accessibility|grab bar|wheelchair|\bada\b|mobility/.test(s)) return 'accessibility'
  if (/appliance/.test(s)) return 'appliance_repair'
  if (/garage ?door/.test(s)) return 'garage_door'
  if (/locksmith|rekey|lock install/.test(s)) return 'locksmith'
  if (/home inspection|inspector|pre-?listing inspect/.test(s)) return 'home_inspection'
  if (/septic/.test(s)) return 'septic'
  if (/car detail|auto detail|mobile detail|detailing/.test(s)) return 'auto_detailing'

  // --- construction / project trades ---
  if (/roof/.test(s)) return 'roofing'
  if (/siding|soffit|fascia/.test(s)) return 'siding'
  if (/epoxy|garage floor|floor coating/.test(s)) return 'epoxy'
  if (/floor(ing)?|hardwood|\blvp\b|laminate|tile install/.test(s)) return 'flooring'
  if (/paint/.test(s)) return 'painting'
  if (/concrete|masonry|paver|brick/.test(s)) return 'concrete'
  if (/paving|asphalt|sealcoat/.test(s)) return 'paving'
  if (/deck build|\bdeck\b|pergola/.test(s)) return 'deck'
  if (/fenc/.test(s)) return 'fencing'
  if (/demolition|\bdemo\b|teardown/.test(s)) return 'demolition'
  if (/drywall|sheetrock|plaster/.test(s)) return 'drywall'
  if (/foundation|waterproof|basement seal|sump/.test(s)) return 'foundation'
  if (/insulation|spray foam|air seal/.test(s)) return 'insulation'
  if (/moving|movers|relocation/.test(s)) return 'moving'
  if (/window.*door|replacement window|door install|entry door/.test(s)) return 'windows_doors'
  if (/stucco/.test(s)) return 'stucco'
  if (/remodel|general contract|renovation|kitchen|bathroom remodel|addition/.test(s)) return 'remodeling'

  // --- core home-service verticals ---
  if (/hvac|heating|cooling|air ?condition|furnace/.test(s)) return 'hvac'
  if (/plumb|drain|sewer|water ?heater/.test(s)) return 'plumbing'
  if (/electric|\bev charger\b/.test(s)) return 'electrical'
  if (/salon|barber|\bhair\b|beauty|makeup|\bnail|blowout/.test(s)) return 'mobile_salon'
  if (/laundry|wash.*fold|dry ?clean|linen/.test(s)) return 'laundry'
  if (/interior ?design|decorat|home ?stag|\bstager\b|\bstaging\b/.test(s)) return 'interior_design'
  if (/fitness|trainer|\bgym\b|personal train|\byoga\b|pilates/.test(s)) return 'fitness'
  if (/handy|\brepair\b|assembly|honey.?do/.test(s)) return 'handyman'

  return 'general'
}

// --- Archetype / funnel classification -------------------------------------
//
// Project/lead verticals: jobs that run days → a year and must be qualified and
// quoted, NEVER hourly-slot-booked. These default to the quote-first funnel
// ('pipeline' in funnel_mode terms; agent-config-loader maps that to the
// quote_first booking model). Everything else books directly ('booking').
// Operators can still override per-tenant in settings. Kept in sync with the
// "project (lead) verticals" block of the IndustryKey union above.
export const PROJECT_LEAD_INDUSTRIES: ReadonlySet<IndustryKey> = new Set<IndustryKey>([
  'landscaping', 'remodeling', 'roofing', 'siding', 'painting', 'flooring',
  'concrete', 'deck', 'fencing', 'demolition', 'drywall', 'epoxy',
  'foundation', 'insulation', 'moving', 'paving', 'windows_doors', 'stucco',
  'solar', 'smart_home', 'accessibility', 'restoration', 'interior_design',
])

/**
 * Default core funnel for a freshly-provisioned tenant, by trade archetype.
 * Project/lead trades quote-first ('pipeline'); every other trade books directly.
 */
export function defaultFunnelMode(industry: IndustryKey): 'booking' | 'pipeline' {
  return PROJECT_LEAD_INDUSTRIES.has(industry) ? 'pipeline' : 'booking'
}

// --- Pricing-unit classification -------------------------------------------
//
// Flat / per-unit trades: their preset prices are per-rental / per-visit / per-
// order flat amounts, NOT $/hr. Provisioning must seed these with
// pricing_model='flat' + the right per_unit so quote, checkout, and invoice math
// bill the FIXED price instead of elapsed-hours × rate. Left hourly, a flat
// "Half Truckload" ($150) would bill 2h × rate at check-out.
export const FLAT_PRICING_UNIT: Partial<Record<IndustryKey, 'job' | 'visit'>> = {
  dumpster: 'job',       // flat per rental
  junk_removal: 'job',   // flat per load
  bin_cleaning: 'visit', // per bin / per visit
  pet_waste: 'visit',    // per visit
  snow_removal: 'visit', // per plow / storm
  laundry: 'job',        // flat per order
  fitness: 'visit',      // per session
}

export interface PricingShape {
  pricing_model: 'hourly' | 'flat'
  per_unit: string // one of the service_types per_unit enum values (hour/job/visit/…)
}

/**
 * How a trade's seeded services are priced. Hourly by default; flat/per-unit for
 * the trades in FLAT_PRICING_UNIT.
 */
export function pricingShapeFor(industry: IndustryKey): PricingShape {
  const unit = FLAT_PRICING_UNIT[industry]
  return unit ? { pricing_model: 'flat', per_unit: unit } : { pricing_model: 'hourly', per_unit: 'hour' }
}

const PRICE_UNIT_SUFFIX: Record<string, string> = {
  hour: '/hr', job: ' flat', visit: '/visit', unit: ' each', day: '/day',
}

/** Display label for the agent pricing_rows table: "$59/hr", "$350 flat", "$20/visit". */
export function priceLabel(rate: number, shape: PricingShape): string {
  return `$${rate}${PRICE_UNIT_SUFFIX[shape.per_unit] ?? '/hr'}`
}

const svc = (name: string, description: string, hours: number, rate: number, i: number): DefaultService =>
  ({ name, description, default_duration_hours: hours, default_hourly_rate: rate, sort_order: i })

export const SERVICE_PRESETS: Record<IndustryKey, DefaultService[]> = {
  cleaning: [
    svc('Standard Cleaning', 'Regular recurring cleaning for occupied homes', 2, 59, 1),
    svc('Deep Cleaning', 'Top-to-bottom cleaning, inside appliances', 4, 75, 2),
    svc('Move In/Out Cleaning', 'Empty-home deep clean for tenant transitions', 4, 75, 3),
    svc('Post-Construction Cleanup', 'Dust + debris removal after renovation', 5, 85, 4),
    svc('Airbnb Turnover', 'Fast same-day turnover cleaning', 2, 65, 5),
    svc('Office Cleaning', 'Commercial office cleaning, after-hours', 3, 65, 6),
  ],
  window_cleaning: [
    svc('Interior + Exterior Windows', 'Full window clean inside and out', 2, 65, 1),
    svc('Exterior Only', 'Outside windows, ground + reachable', 1, 55, 2),
    svc('Screen & Track Cleaning', 'Screens, sills, and tracks', 1, 45, 3),
    svc('Post-Construction Windows', 'Paint/sticker/debris removal', 3, 85, 4),
  ],
  gutter: [
    svc('Gutter Cleaning', 'Clear leaves + flush downspouts', 2, 60, 1),
    svc('Gutter Guard Install', 'Leaf-guard system install', 4, 85, 2),
    svc('Gutter Repair', 'Reseal, refasten, re-pitch', 2, 75, 3),
    svc('Downspout Clearing', 'Unclog and redirect downspouts', 1, 55, 4),
  ],
  carpet_cleaning: [
    svc('Carpet Steam Cleaning', 'Hot-water extraction per area', 2, 75, 1),
    svc('Upholstery Cleaning', 'Sofas, chairs, and cushions', 1, 65, 2),
    svc('Area Rug Cleaning', 'Spot or full rug cleaning', 1, 60, 3),
    svc('Pet Stain & Odor', 'Enzyme treatment for pet damage', 2, 85, 4),
  ],
  air_duct: [
    svc('Air Duct Cleaning', 'Full supply + return duct cleaning', 3, 95, 1),
    svc('Dryer Vent Cleaning', 'Lint removal + airflow check', 1, 75, 2),
    svc('Sanitization Add-On', 'Antimicrobial fog treatment', 1, 65, 3),
    svc('Whole-Home Package', 'Ducts + dryer vent + sanitize', 4, 110, 4),
  ],
  pressure_washing: [
    svc('House Wash (Soft Wash)', 'Low-pressure siding + soffit wash', 2, 75, 1),
    svc('Driveway / Concrete', 'Surface-clean flatwork', 2, 65, 2),
    svc('Deck & Fence Wash', 'Clean + brighten wood', 2, 70, 3),
    svc('Roof Soft Wash', 'Algae/moss treatment', 3, 95, 4),
  ],
  post_construction: [
    svc('Rough Clean', 'Debris + heavy dust after framing', 4, 75, 1),
    svc('Final Clean', 'Move-in-ready detail clean', 5, 85, 2),
    svc('Punch-List Touch-Up', 'Final walkthrough cleanup', 2, 75, 3),
    svc('Window & Debris Haul', 'Windows + construction debris', 3, 80, 4),
  ],
  bin_cleaning: [
    svc('Single Bin Cleaning', 'One trash/recycle can, sanitized', 1, 25, 1),
    svc('Two-Bin Service', 'Trash + recycle', 1, 40, 2),
    svc('Monthly Plan (per visit)', 'Recurring curbside cleaning', 1, 20, 3),
    svc('Commercial Bins', 'Dumpster + multi-bin sanitizing', 2, 95, 4),
  ],
  pool: [
    svc('Weekly Pool Service', 'Skim, brush, vacuum, chemicals', 1, 85, 1),
    svc('Chemical Balance', 'Test + dose only', 1, 55, 2),
    svc('Green-to-Clean', 'Algae recovery treatment', 3, 150, 3),
    svc('Filter Clean / Repair', 'Filter service or repair', 2, 95, 4),
  ],
  chimney: [
    svc('Chimney Sweep', 'Full flue cleaning', 2, 95, 1),
    svc('Inspection (Level 1/2)', 'Safety + camera inspection', 1, 125, 2),
    svc('Cap / Damper Repair', 'Cap, damper, or crown repair', 2, 135, 3),
    svc('Dryer Vent Cleaning', 'Add-on vent cleaning', 1, 75, 4),
  ],
  lawn_care: [
    svc('Mowing & Trim', 'Mow, edge, trim, blow', 1, 55, 1),
    svc('Fertilization', 'Seasonal feed + weed control', 1, 65, 2),
    svc('Aeration & Overseed', 'Core aeration + seed', 2, 85, 3),
    svc('Leaf Cleanup', 'Fall/spring leaf removal', 3, 75, 4),
  ],
  irrigation: [
    svc('Sprinkler Tune-Up', 'Test zones, adjust heads', 1, 85, 1),
    svc('Repair Service Call', 'Diagnose + fix leaks/heads', 2, 95, 2),
    svc('Winterization', 'Blow out lines for winter', 1, 75, 3),
    svc('System Install', 'New irrigation zone install', 8, 110, 4),
  ],
  snow_removal: [
    svc('Per-Visit Plow', 'Driveway plow per storm', 1, 75, 1),
    svc('Seasonal Contract (per visit)', 'Recurring storm service', 1, 65, 2),
    svc('Salting / De-Ice', 'Ice melt application', 1, 55, 3),
    svc('Sidewalk & Walkways', 'Hand-shovel + salt', 1, 60, 4),
  ],
  tree_service: [
    svc('Tree Trimming', 'Shaping + health pruning', 3, 95, 1),
    svc('Tree Removal', 'Full removal + cleanup', 6, 150, 2),
    svc('Stump Grinding', 'Grind + haul chips', 2, 110, 3),
    svc('Emergency / Storm', '24/7 storm-damage response', 3, 175, 4),
  ],
  holiday_lighting: [
    svc('Design & Install', 'Custom lighting design + install', 4, 95, 1),
    svc('Install (Your Lights)', 'Hang customer-supplied lights', 3, 75, 2),
    svc('Takedown & Storage', 'Post-season removal', 2, 65, 3),
    svc('Full Season Package', 'Design, install, service, takedown', 6, 110, 4),
  ],
  pest: [
    svc('General Pest Control', 'Interior + exterior quarterly treatment', 1, 95, 1),
    svc('Rodent Control', 'Rat / mouse exclusion + baiting', 2, 115, 2),
    svc('Termite Inspection', 'Full structure inspection + report', 2, 125, 3),
    svc('Bed Bug Treatment', 'Heat or chemical remediation', 4, 150, 4),
  ],
  junk_removal: [
    svc('Single Item Pickup', 'One item — appliance, mattress, furniture', 1, 95, 1),
    svc('Quarter Truckload', 'Small load haul-away', 1, 125, 2),
    svc('Half Truckload', 'Medium cleanout haul-away', 2, 150, 3),
    svc('Full Truckload', 'Full-truck cleanout + disposal', 3, 175, 4),
    svc('Estate / Property Cleanout', 'Whole-property clearout', 5, 150, 5),
  ],
  dumpster: [
    svc('10-Yard Dumpster', 'Small projects — up to 7-day rental', 1, 350, 1),
    svc('20-Yard Dumpster', 'Mid-size renovation / cleanout', 1, 450, 2),
    svc('30-Yard Dumpster', 'Large construction / demolition', 1, 550, 3),
    svc('40-Yard Dumpster', 'Commercial / heavy debris', 1, 650, 4),
  ],
  towing: [
    svc('Local Tow', 'Standard tow within the metro area', 1, 95, 1),
    svc('Long-Distance Tow', 'Tow beyond the local zone, per-mile', 2, 125, 2),
    svc('Jumpstart / Lockout', 'Battery jump, lockout, tire change', 1, 75, 3),
    svc('Winch / Recovery', 'Off-road or stuck-vehicle recovery', 2, 150, 4),
    svc('Accident / Emergency Tow', '24/7 urgent accident recovery', 2, 175, 5),
  ],
  appliance_repair: [
    svc('Diagnostic Service Call', 'On-site diagnosis (applied to repair)', 1, 95, 1),
    svc('Refrigerator Repair', 'Cooling, compressor, ice maker', 2, 135, 2),
    svc('Washer / Dryer Repair', 'Drum, pump, heating element', 2, 125, 3),
    svc('Oven / Range Repair', 'Igniter, element, control board', 2, 130, 4),
  ],
  garage_door: [
    svc('Service Call', 'Diagnose + minor adjustment', 1, 95, 1),
    svc('Spring Replacement', 'Torsion/extension spring replace', 2, 175, 2),
    svc('Opener Install', 'New opener + setup', 3, 150, 3),
    svc('New Door Install', 'Full garage door replacement', 5, 135, 4),
  ],
  locksmith: [
    svc('Lockout Service', 'Residential/auto lockout entry', 1, 95, 1),
    svc('Rekey Locks', 'Rekey existing locks', 1, 75, 2),
    svc('Lock Install', 'Deadbolt / handle set install', 1, 85, 3),
    svc('Smart Lock Install', 'Keypad/smart lock setup', 2, 125, 4),
  ],
  home_inspection: [
    svc('Full Home Inspection', 'Complete buyer inspection + report', 3, 135, 1),
    svc('Pre-Listing Inspection', 'Seller-side condition report', 3, 125, 2),
    svc('Radon / Termite Add-On', 'Specialty add-on testing', 1, 95, 3),
    svc('Re-Inspection', 'Verify completed repairs', 1, 95, 4),
  ],
  septic: [
    svc('Septic Pumping', 'Tank pump-out + level check', 2, 125, 1),
    svc('Inspection', 'Full system inspection', 2, 135, 2),
    svc('Repair Service Call', 'Diagnose + repair', 2, 150, 3),
    svc('System Install', 'New tank / drain field', 8, 150, 4),
  ],
  auto_detailing: [
    svc('Interior Detail', 'Full interior shampoo + clean', 2, 85, 1),
    svc('Exterior Detail', 'Wash, clay, wax', 2, 85, 2),
    svc('Full Detail', 'Complete interior + exterior', 4, 110, 3),
    svc('Ceramic Coating', 'Paint protection coating', 5, 150, 4),
  ],
  pet_grooming: [
    svc('Bath & Brush', 'Wash, dry, brush-out', 1, 65, 1),
    svc('Full Groom', 'Bath, cut, nails, ears', 2, 95, 2),
    svc('Nail Trim', 'Quick nail service', 1, 25, 3),
    svc('De-Shed Treatment', 'Undercoat removal', 1, 55, 4),
  ],
  pet_waste: [
    svc('Weekly Yard Cleanup', 'Recurring pet-waste removal', 1, 20, 1),
    svc('Twice-Weekly Service', 'Two visits per week', 1, 35, 2),
    svc('One-Time Cleanup', 'Initial or catch-up cleanup', 1, 65, 3),
    svc('Commercial / HOA', 'Common-area waste stations', 2, 95, 4),
  ],
  handyman: [
    svc('Small Repair', 'Single-item repair under 1 hour', 1, 85, 1),
    svc('Half-Day Service', 'Multiple small jobs, 4 hours', 4, 85, 2),
    svc('Full-Day Service', 'Multiple jobs, full day on site', 8, 85, 3),
    svc('Furniture Assembly', 'Assembly of IKEA, Wayfair, etc.', 2, 75, 4),
  ],
  hvac: [
    svc('HVAC Tune-Up', 'Seasonal maintenance, filter, coil', 1, 125, 1),
    svc('Repair Service Call', 'Diagnosis + repair of AC/heat', 2, 150, 2),
    svc('Install / Replacement', 'New HVAC system install', 8, 135, 3),
    svc('Duct Cleaning', 'Full duct clean + sanitize', 3, 125, 4),
  ],
  plumbing: [
    svc('Service Call', 'Diagnosis + repair of plumbing issue', 1, 135, 1),
    svc('Drain Cleaning', 'Clear slow or blocked drains', 1, 125, 2),
    svc('Water Heater Install', 'New water heater + haul-away', 3, 150, 3),
    svc('Emergency Plumbing', 'After-hours urgent response', 2, 175, 4),
  ],
  electrical: [
    svc('Service Call', 'Diagnostic + minor repair', 1, 150, 1),
    svc('Outlet / Switch Install', 'New outlet or switch install', 1, 150, 2),
    svc('Panel Upgrade', 'Electrical panel replacement', 6, 175, 3),
    svc('EV Charger Install', 'Level 2 charger install', 3, 175, 4),
  ],
  mobile_salon: [
    svc('Haircut & Style', 'On-location cut and style', 1, 85, 1),
    svc('Color / Highlights', 'On-location color service', 2, 120, 2),
    svc('Blowout', 'Wash and blowout at your door', 1, 65, 3),
    svc('Bridal / Event', 'On-site hair and makeup', 3, 150, 4),
  ],
  laundry: [
    svc('Wash & Fold', 'Per-pound wash, dry, fold', 1, 40, 1),
    svc('Pickup & Delivery', 'Doorstep pickup + next-day return', 1, 45, 2),
    svc('Dry Cleaning', 'Garment dry cleaning', 1, 55, 3),
    svc('Commercial / Bulk', 'Recurring bulk laundry', 2, 40, 4),
  ],
  fitness: [
    svc('Intro Session', 'First-time assessment + session', 1, 60, 1),
    svc('Single Session', 'One-on-one session', 1, 90, 2),
    svc('Monthly Package', 'Recurring package, per session', 1, 80, 3),
    svc('In-Home Session', 'Session at the client location', 1, 110, 4),
  ],
  landscaping: [
    svc('Lawn Mowing', 'Mow, edge, trim, blow', 1, 75, 1),
    svc('Fall / Spring Cleanup', 'Full property cleanup + haul', 4, 85, 2),
    svc('Mulching & Planting', 'Bed prep, mulch, new plantings', 3, 85, 3),
    svc('Design & Install', 'Landscape design + install', 8, 95, 4),
  ],
  remodeling: [
    svc('Kitchen Remodel', 'Full kitchen renovation', 8, 95, 1),
    svc('Bathroom Remodel', 'Full bath renovation', 8, 95, 2),
    svc('Basement Finish', 'Finish basement build-out', 8, 90, 3),
    svc('Home Addition', 'Room/whole-home addition', 8, 95, 4),
  ],
  roofing: [
    svc('Roof Inspection', 'Full roof condition report', 2, 95, 1),
    svc('Roof Repair', 'Leak / shingle repair', 3, 135, 2),
    svc('Full Roof Replacement', 'Tear-off + new roof', 8, 125, 3),
    svc('Storm / Emergency', 'Tarp + urgent repair', 3, 175, 4),
  ],
  siding: [
    svc('Siding Replacement', 'Full siding replacement', 8, 110, 1),
    svc('Siding Repair', 'Patch/replace damaged panels', 3, 95, 2),
    svc('Soffit & Fascia', 'Soffit/fascia repair or install', 4, 95, 3),
    svc('Trim / Wrap', 'Aluminum trim wrapping', 3, 90, 4),
  ],
  painting: [
    svc('Interior Painting', 'Walls, ceilings, trim', 8, 65, 1),
    svc('Exterior Painting', 'Full exterior repaint', 8, 75, 2),
    svc('Cabinet Refinishing', 'Kitchen cabinet paint/refinish', 8, 85, 3),
    svc('Deck / Fence Staining', 'Stain + seal', 4, 70, 4),
  ],
  flooring: [
    svc('Hardwood Install', 'Solid/engineered hardwood', 8, 95, 1),
    svc('LVP / Laminate', 'Vinyl plank or laminate', 6, 85, 2),
    svc('Tile Install', 'Floor/wall tile install', 8, 95, 3),
    svc('Refinishing', 'Sand + refinish hardwood', 8, 90, 4),
  ],
  concrete: [
    svc('Driveway Pour', 'New concrete driveway', 8, 95, 1),
    svc('Patio / Walkway', 'Patio, walkway, or steps', 6, 90, 2),
    svc('Foundation / Slab', 'Structural slab pour', 8, 110, 3),
    svc('Repair & Resurfacing', 'Crack repair / resurface', 4, 85, 4),
  ],
  deck: [
    svc('Deck Design & Build', 'New deck construction', 8, 95, 1),
    svc('Deck Repair', 'Board/rail/structure repair', 4, 85, 2),
    svc('Staining & Sealing', 'Clean, stain, seal', 4, 70, 3),
    svc('Railing Install', 'New railing system', 4, 90, 4),
  ],
  fencing: [
    svc('Wood Fence Install', 'New wood privacy fence', 8, 85, 1),
    svc('Chain-Link Install', 'Chain-link fence install', 6, 75, 2),
    svc('Vinyl / PVC Install', 'Vinyl fence install', 8, 95, 3),
    svc('Fence Repair', 'Repair/replace sections', 3, 85, 4),
  ],
  demolition: [
    svc('Interior Demo', 'Selective interior tear-out', 6, 95, 1),
    svc('Full Structure Demo', 'Whole structure demolition', 8, 125, 2),
    svc('Concrete Removal', 'Break + haul concrete', 6, 110, 3),
    svc('Debris Haul-Off', 'Load + dispose debris', 4, 95, 4),
  ],
  drywall: [
    svc('Patch & Repair', 'Holes, cracks, dents', 2, 85, 1),
    svc('Hang & Finish (Room)', 'Full room hang + finish', 8, 90, 2),
    svc('Texture Matching', 'Match existing texture', 3, 85, 3),
    svc('Water Damage Repair', 'Replace + finish damaged board', 4, 95, 4),
  ],
  epoxy: [
    svc('Garage Floor Coating', 'Prep + epoxy garage floor', 6, 95, 1),
    svc('Basement Floor', 'Epoxy basement floor', 6, 95, 2),
    svc('Commercial Floor', 'Warehouse/shop coating', 8, 110, 3),
    svc('Repair / Recoat', 'Patch + recoat', 4, 85, 4),
  ],
  foundation: [
    svc('Inspection', 'Foundation condition report', 2, 95, 1),
    svc('Crack Repair', 'Seal + reinforce cracks', 4, 135, 2),
    svc('Waterproofing', 'Interior/exterior waterproofing', 8, 125, 3),
    svc('Sump Pump Install', 'New sump pump system', 4, 150, 4),
  ],
  insulation: [
    svc('Attic Insulation', 'Add/replace attic insulation', 4, 85, 1),
    svc('Blown-In', 'Blown cellulose/fiberglass', 4, 85, 2),
    svc('Spray Foam', 'Closed/open-cell spray foam', 6, 110, 3),
    svc('Air Sealing', 'Seal gaps + penetrations', 3, 90, 4),
  ],
  moving: [
    svc('Local Move', 'Load, transport, unload local', 4, 120, 1),
    svc('Long-Distance Move', 'Interstate/long-haul move', 8, 150, 2),
    svc('Packing Service', 'Professional packing', 4, 85, 3),
    svc('Loading / Unloading Labor', 'Labor-only muscle', 2, 95, 4),
  ],
  paving: [
    svc('Asphalt Driveway', 'New asphalt driveway', 8, 110, 1),
    svc('Sealcoating', 'Seal + protect asphalt', 3, 75, 2),
    svc('Pothole / Repair', 'Patch + repair', 3, 95, 3),
    svc('Parking Lot', 'Commercial lot paving', 8, 125, 4),
  ],
  windows_doors: [
    svc('Window Replacement', 'Replace windows, per unit', 4, 110, 1),
    svc('Entry Door Install', 'New entry/front door', 4, 125, 2),
    svc('Patio / Sliding Door', 'Sliding/patio door install', 4, 120, 3),
    svc('Storm Doors', 'Storm door install', 2, 95, 4),
  ],
  stucco: [
    svc('Stucco Repair', 'Patch + match stucco', 4, 95, 1),
    svc('Re-Stucco', 'Full re-stucco exterior', 8, 110, 2),
    svc('Crack / Patch', 'Hairline + crack repair', 3, 85, 3),
    svc('Waterproof Coating', 'Elastomeric coating', 6, 95, 4),
  ],
  solar: [
    svc('Site Assessment', 'Roof + energy assessment', 2, 125, 1),
    svc('Panel Install', 'Full solar panel install', 8, 135, 2),
    svc('Battery Storage', 'Add battery backup', 6, 150, 3),
    svc('Maintenance / Repair', 'Panel service + inverter repair', 3, 125, 4),
  ],
  smart_home: [
    svc('Consultation & Design', 'System design + quote', 1, 125, 1),
    svc('Security Camera Install', 'Camera + NVR install', 4, 110, 2),
    svc('Smart Lock / Doorbell', 'Locks, doorbells, hubs', 2, 95, 3),
    svc('Whole-Home Automation', 'Full automation build', 8, 125, 4),
  ],
  accessibility: [
    svc('Home Assessment', 'Accessibility needs assessment', 1, 95, 1),
    svc('Grab Bars & Railings', 'Install grab bars/railings', 2, 110, 2),
    svc('Ramp Install', 'Wheelchair ramp install', 6, 120, 3),
    svc('Bathroom Modification', 'Walk-in shower / ADA bath', 8, 125, 4),
  ],
  restoration: [
    svc('Water Damage Extraction', '24/7 water extraction + dry-out', 4, 150, 1),
    svc('Fire & Smoke Restoration', 'Soot/smoke cleanup + restore', 8, 165, 2),
    svc('Mold Remediation', 'Containment + mold removal', 6, 150, 3),
    svc('Storm Damage', 'Emergency storm mitigation', 4, 175, 4),
  ],
  interior_design: [
    svc('Design Consultation', 'In-home consult + concept', 1, 150, 1),
    svc('Room Design', 'Full design for a single room', 3, 125, 2),
    svc('Full-Home Project', 'Whole-home design + PM', 8, 125, 3),
    svc('Staging', 'Staging for sale or event', 4, 100, 4),
  ],
  general: [
    svc('Service Call', 'Initial diagnostic visit', 1, 100, 1),
    svc('Standard Service', 'Typical service package', 2, 100, 2),
    svc('Half-Day Service', 'Multiple items, 4 hours on site', 4, 95, 3),
    svc('Full-Day Service', 'Full day on site, large job', 8, 95, 4),
    svc('Emergency / After-Hours', 'Urgent same-day response', 2, 150, 5),
    svc('Consultation', 'Assessment + written estimate', 1, 75, 6),
  ],
}

/** Standard 9-field booking checklist with a trade-specific service_type question. */
function stdChecklist(serviceQuestion: string, smsOptions: string, opts?: { addressRequired?: boolean; emailRequired?: boolean }): ChecklistField[] {
  const addr = opts?.addressRequired ?? true
  const email = opts?.emailRequired ?? true
  return [
    { key: 'service_type', enabled: true, required: true, question: serviceQuestion, sms_options: smsOptions },
    { key: 'notes', enabled: true, required: true, question: 'Ask for the job details — scope, condition, and anything specific they need.', sms_options: '' },
    { key: 'rate', enabled: true, required: true, question: 'Quote the rate.', sms_options: '' },
    { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
    { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '' },
    { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
    { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
    { key: 'address', enabled: true, required: addr, question: 'Ask for the service address.', sms_options: '' },
    { key: 'email', enabled: true, required: email, question: 'Ask for email.', sms_options: '' },
  ]
}

// Cleaning keeps its bespoke bedrooms/bathrooms checklist — the ONLY vertical that asks it.
const CLEANING_CHECKLIST: ChecklistField[] = [
  { key: 'service_type', enabled: true, required: true, question: 'Ask what type of clean they need.', sms_options: 'Standard,Deep,Move in/out' },
  { key: 'bedrooms', enabled: true, required: true, question: 'Ask how many bedrooms and bathrooms.', sms_options: '1bd/1ba,2bd/1ba,3bd/2ba' },
  { key: 'rate', enabled: true, required: true, question: 'Give pricing and ask which rate.', sms_options: '' },
  { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
  { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '8am,10am,12pm,2pm,4pm' },
  { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
  { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
  { key: 'address', enabled: true, required: true, question: 'Ask for address.', sms_options: '' },
  { key: 'email', enabled: true, required: true, question: 'Ask for email.', sms_options: '' },
  { key: 'notes', enabled: true, required: false, question: 'Ask about special requests, pets, access.', sms_options: '' },
]

const opts = (svcNames: string[]) => svcNames.join(',')

export const CHECKLIST_BY_INDUSTRY: Record<IndustryKey, ChecklistField[]> = {
  cleaning: CLEANING_CHECKLIST,
  window_cleaning: stdChecklist('Ask interior+exterior, exterior only, screens, or post-construction.', opts(['Int+Ext', 'Exterior', 'Screens', 'Post-construction'])),
  gutter: stdChecklist('Ask cleaning, guard install, or repair — and how many stories.', opts(['Cleaning', 'Guards', 'Repair', 'Downspouts'])),
  carpet_cleaning: stdChecklist('Ask carpet, upholstery, area rug, or pet stain — and how many rooms.', opts(['Carpet', 'Upholstery', 'Rug', 'Pet stain'])),
  air_duct: stdChecklist('Ask air ducts, dryer vent, or whole-home — and number of vents/system type.', opts(['Ducts', 'Dryer vent', 'Sanitize', 'Whole-home'])),
  pressure_washing: stdChecklist('Ask house, driveway, deck/fence, or roof — and rough square footage.', opts(['House', 'Driveway', 'Deck/Fence', 'Roof'])),
  post_construction: stdChecklist('Ask rough clean, final clean, or punch-list — and square footage.', opts(['Rough', 'Final', 'Punch-list', 'Windows'])),
  bin_cleaning: stdChecklist('Ask single bin, two-bin, monthly plan, or commercial.', opts(['Single', 'Two-bin', 'Monthly', 'Commercial'])),
  pool: stdChecklist('Ask weekly service, chemical balance, green-to-clean, or filter — pool size/type.', opts(['Weekly', 'Chemicals', 'Green-to-clean', 'Filter'])),
  chimney: stdChecklist('Ask sweep, inspection, or cap/damper repair — fireplace type.', opts(['Sweep', 'Inspection', 'Repair', 'Dryer vent'])),
  lawn_care: stdChecklist('Ask mowing, fertilization, aeration, or leaf cleanup — lot size.', opts(['Mowing', 'Fertilize', 'Aeration', 'Leaves'])),
  irrigation: stdChecklist('Ask tune-up, repair, winterization, or install — number of zones.', opts(['Tune-up', 'Repair', 'Winterize', 'Install'])),
  snow_removal: stdChecklist('Ask per-visit, seasonal, salting, or walkways — driveway size.', opts(['Per-visit', 'Seasonal', 'Salting', 'Walkways'])),
  tree_service: stdChecklist('Ask trimming, removal, stump grinding, or emergency — tree size/count.', opts(['Trim', 'Removal', 'Stump', 'Emergency'])),
  holiday_lighting: stdChecklist('Ask design & install, install-only, takedown, or full package — home size.', opts(['Design+install', 'Install', 'Takedown', 'Full package'])),
  pest: [
    { key: 'service_type', enabled: true, required: true, question: 'Ask general, rodents, termites, or bed bugs.', sms_options: 'General,Rodents,Termites,Bed bugs' },
    { key: 'notes', enabled: true, required: true, question: 'Ask pest type, severity, where they see them, and property type.', sms_options: '' },
    { key: 'rate', enabled: true, required: true, question: 'Quote service rate.', sms_options: '' },
    { key: 'day', enabled: true, required: true, question: 'Ask what day works.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
    { key: 'time', enabled: true, required: true, question: 'Ask what time works.', sms_options: '' },
    { key: 'name', enabled: true, required: true, question: 'Ask for full name.', sms_options: '' },
    { key: 'phone', enabled: true, required: true, question: 'Ask for phone.', sms_options: '' },
    { key: 'address', enabled: true, required: true, question: 'Ask for address.', sms_options: '' },
    { key: 'email', enabled: true, required: true, question: 'Ask for email.', sms_options: '' },
  ],
  junk_removal: stdChecklist('Ask the load size — single item, quarter, half, full, or cleanout.', opts(['Single', 'Quarter', 'Half', 'Full', 'Cleanout']), { emailRequired: false }),
  dumpster: stdChecklist('Ask dumpster size — 10, 20, 30, or 40 yard — and rental length.', opts(['10yd', '20yd', '30yd', '40yd']), { emailRequired: false }),
  towing: stdChecklist('Ask tow, jumpstart/lockout, winch/recovery, or accident — vehicle + locations.', opts(['Local', 'Long-dist', 'Jumpstart', 'Recovery', 'Accident']), { emailRequired: false }),
  appliance_repair: stdChecklist('Ask which appliance — fridge, washer/dryer, oven — and brand + symptom.', opts(['Fridge', 'Washer/Dryer', 'Oven', 'Other'])),
  garage_door: stdChecklist('Ask service call, spring, opener, or new door — door type.', opts(['Service', 'Spring', 'Opener', 'New door'])),
  locksmith: stdChecklist('Ask lockout, rekey, lock install, or smart lock — residential/auto/commercial.', opts(['Lockout', 'Rekey', 'Install', 'Smart lock'])),
  home_inspection: stdChecklist('Ask full, pre-listing, add-on testing, or re-inspection — property size.', opts(['Full', 'Pre-listing', 'Add-on', 'Re-inspect'])),
  septic: stdChecklist('Ask pumping, inspection, repair, or install — tank size/last serviced.', opts(['Pumping', 'Inspection', 'Repair', 'Install'])),
  auto_detailing: stdChecklist('Ask interior, exterior, full, or ceramic — vehicle type + condition.', opts(['Interior', 'Exterior', 'Full', 'Ceramic'])),
  pet_grooming: stdChecklist('Ask bath & brush, full groom, nail trim, or de-shed — breed + size.', opts(['Bath', 'Full groom', 'Nails', 'De-shed'])),
  pet_waste: stdChecklist('Ask weekly, twice-weekly, one-time, or commercial — yard size + # of dogs.', opts(['Weekly', 'Twice-weekly', 'One-time', 'Commercial'])),
  handyman: stdChecklist('Ask small repair, half-day, full-day, or assembly — list what needs doing.', opts(['Small', 'Half-day', 'Full-day', 'Assembly'])),
  hvac: stdChecklist('Ask tune-up, repair, install, or duct cleaning — system type.', opts(['Tune-up', 'Repair', 'Install', 'Duct clean'])),
  plumbing: stdChecklist('Ask service call, drain, install, or emergency — describe the issue + location.', opts(['Service', 'Drain', 'Install', 'Emergency'])),
  electrical: stdChecklist('Ask service call, outlet/switch, panel, or EV charger — any safety concerns.', opts(['Service', 'Outlet', 'Panel', 'EV charger'])),
  mobile_salon: stdChecklist('Ask cut & style, color, blowout, or bridal — hair length/type + look.', opts(['Cut & style', 'Color', 'Blowout', 'Bridal'])),
  laundry: stdChecklist('Ask wash & fold, pickup & delivery, dry cleaning, or commercial — rough load size.', opts(['Wash & fold', 'Pickup', 'Dry clean', 'Commercial']), { emailRequired: false }),
  fitness: stdChecklist('Ask intro, single, package, or in-home — goals + any limitations.', opts(['Intro', 'Single', 'Package', 'In-home']), { addressRequired: false }),
  landscaping: stdChecklist('Ask mowing, cleanup, planting, or design & install — property size + access.', opts(['Mowing', 'Cleanup', 'Planting', 'Design'])),
  remodeling: stdChecklist('Ask kitchen, bathroom, basement, or addition — scope, finishes, and budget.', opts(['Kitchen', 'Bathroom', 'Basement', 'Addition'])),
  roofing: stdChecklist('Ask inspection, repair, full replacement, or storm — roof age + material.', opts(['Inspection', 'Repair', 'Replace', 'Storm'])),
  siding: stdChecklist('Ask replacement, repair, soffit/fascia, or trim — material + square footage.', opts(['Replace', 'Repair', 'Soffit/Fascia', 'Trim'])),
  painting: stdChecklist('Ask interior, exterior, cabinets, or deck/fence — rooms/areas + colors.', opts(['Interior', 'Exterior', 'Cabinets', 'Deck/Fence'])),
  flooring: stdChecklist('Ask hardwood, LVP/laminate, tile, or refinishing — square footage + rooms.', opts(['Hardwood', 'LVP', 'Tile', 'Refinish'])),
  concrete: stdChecklist('Ask driveway, patio/walkway, slab, or repair — square footage.', opts(['Driveway', 'Patio', 'Slab', 'Repair'])),
  deck: stdChecklist('Ask build, repair, staining, or railing — size + material.', opts(['Build', 'Repair', 'Staining', 'Railing'])),
  fencing: stdChecklist('Ask wood, chain-link, vinyl, or repair — linear feet + property lines.', opts(['Wood', 'Chain-link', 'Vinyl', 'Repair'])),
  demolition: stdChecklist('Ask interior, full structure, concrete, or debris haul — scope + access.', opts(['Interior', 'Structure', 'Concrete', 'Haul'])),
  drywall: stdChecklist('Ask patch/repair, hang & finish, texture, or water damage — # of areas.', opts(['Patch', 'Hang', 'Texture', 'Water damage'])),
  epoxy: stdChecklist('Ask garage, basement, commercial, or repair — square footage + condition.', opts(['Garage', 'Basement', 'Commercial', 'Repair'])),
  foundation: stdChecklist('Ask inspection, crack repair, waterproofing, or sump pump — symptoms.', opts(['Inspection', 'Crack', 'Waterproof', 'Sump'])),
  insulation: stdChecklist('Ask attic, blown-in, spray foam, or air sealing — square footage.', opts(['Attic', 'Blown-in', 'Spray foam', 'Air seal'])),
  moving: stdChecklist('Ask local, long-distance, packing, or labor-only — home size + date + locations.', opts(['Local', 'Long-dist', 'Packing', 'Labor'])),
  paving: stdChecklist('Ask asphalt driveway, sealcoating, repair, or parking lot — square footage.', opts(['Driveway', 'Sealcoat', 'Repair', 'Lot'])),
  windows_doors: stdChecklist('Ask windows, entry door, patio door, or storm doors — # of units.', opts(['Windows', 'Entry', 'Patio', 'Storm'])),
  stucco: stdChecklist('Ask repair, re-stucco, crack/patch, or coating — square footage.', opts(['Repair', 'Re-stucco', 'Crack', 'Coating'])),
  solar: stdChecklist('Ask assessment, install, battery, or maintenance — roof type + electric bill.', opts(['Assessment', 'Install', 'Battery', 'Maintenance'])),
  smart_home: stdChecklist('Ask consultation, cameras, smart lock/doorbell, or automation — home size.', opts(['Consult', 'Cameras', 'Locks', 'Automation'])),
  accessibility: stdChecklist('Ask assessment, grab bars, ramp, or bathroom mod — the specific need.', opts(['Assessment', 'Grab bars', 'Ramp', 'Bath mod'])),
  restoration: stdChecklist('Ask water, fire/smoke, mold, or storm — extent + when it happened (often ASAP).', opts(['Water', 'Fire/Smoke', 'Mold', 'Storm'])),
  interior_design: stdChecklist('Ask consultation, single room, full home, or staging — style + budget.', opts(['Consult', 'Room', 'Full home', 'Staging'])),
  general: stdChecklist('Ask what service they need.', ''),
}
