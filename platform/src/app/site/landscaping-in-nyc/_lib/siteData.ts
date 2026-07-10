/* ─── Site Constants ─── */

export const SITE_NAME = "Landscaping In NYC";
export const SITE_DOMAIN = "https://www.landscapinginnyc.com";
export const PHONE = "(212) 470-9637";
export const PHONE_HREF = "tel:2124709637";
export const SMS_HREF = "sms:2124709637";
export const EMAIL = "green@landscapinginnyc.com";
export const ADDRESS = "150 W 47th St, New York, NY 10036";

/* ─── Service Interface & Data (18 total) ─── */

export interface Service {
  name: string;
  h1: string;
  slug: string;
  tagline: string;
  shortDesc: string;
  description: string;
  features: string[];
}

export const services: Service[] = [
  {
    name: "Landscape Design",
    h1: "Custom Landscape Design & Architecture for NYC Brownstones, Townhouses & Estates",
    slug: "landscape-design",
    tagline: "Bespoke outdoor environments that maximize every square foot — 3D renderings, native plant selection, hardscape integration, water features, and phased installation plans tailored to your NYC property's unique conditions and your budget.",
    shortDesc:
      "Bespoke landscape architecture and design plans tailored to New York City properties of every size.",
    description:
      "Our landscape design team creates stunning outdoor environments that maximize every square foot of your NYC property. From intimate brownstone gardens to expansive estate grounds, we blend functionality with beauty using plants, hardscape, and water features suited to the Northeast climate. Every design begins with a thorough site analysis and consultation to ensure your vision becomes reality.",
    features: [
      "Full-service landscape architecture and planning",
      "3D renderings and detailed planting plans",
      "Native and climate-adapted plant selection",
      "Hardscape integration with patios, paths, and walls",
      "Water feature and fountain design",
      "Sustainable and low-maintenance design options",
      "NYC DOB permit coordination when required",
      "Phased installation plans to fit any budget",
    ],
  },
  {
    name: "Rooftop Gardens & Terraces",
    h1: "Rooftop Garden Design & Installation for NYC Apartments, Condos & Commercial Buildings",
    slug: "rooftop-gardens",
    tagline: "Turn your NYC rooftop into a private green retreat — structural load assessments, waterproofing coordination, wind-resistant plantings, built-in irrigation, custom planters, pergolas, and co-op board approval support all handled for you.",
    shortDesc:
      "Expert rooftop garden design and installation for apartments, condos, and commercial buildings across New York City.",
    description:
      "Rooftop gardens are one of the most sought-after amenities in New York City, and our team specializes in building them from scratch. We handle everything from structural load assessments and waterproofing coordination to container selection, irrigation, and plant installation. Whether you want a lush private retreat or an entertaining space with skyline views, we design rooftop gardens that thrive in NYC's unique microclimate.",
    features: [
      "Structural load assessment and engineering coordination",
      "Waterproof membrane protection and root barriers",
      "Lightweight soil and container systems",
      "Wind-resistant plant selection for high elevations",
      "Built-in irrigation and drainage systems",
      "Custom planters, pergolas, and seating areas",
      "Green roof and living wall installations",
      "NYC DOB and co-op/condo board approval support",
    ],
  },
  {
    name: "Irrigation Systems",
    h1: "Smart Irrigation System Design, Installation & Maintenance for NYC Landscapes & Rooftops",
    slug: "irrigation-systems",
    tagline: "Automated drip and spray systems with WiFi controllers, rain sensors, and weather-based scheduling — built for NYC's freeze-thaw cycle with winterization and spring startup included to keep your landscape green from April through November.",
    shortDesc:
      "Automated irrigation design, installation, and maintenance to keep your landscape green all season long.",
    description:
      "A properly designed irrigation system saves water, saves money, and keeps your landscape looking its best from spring through fall. We install drip irrigation, spray systems, and smart controller setups tailored to your property's unique layout and plant needs. Our systems are built for NYC's freeze-thaw cycle with proper winterization and spring startup services included.",
    features: [
      "Custom drip and spray zone design",
      "Smart WiFi controllers with weather-based scheduling",
      "Rain and soil moisture sensors",
      "Backflow preventer installation and testing",
      "Seasonal winterization and spring activation",
      "Water-efficient nozzles and rotors",
      "Rooftop and container irrigation solutions",
      "Ongoing monitoring and maintenance plans",
    ],
  },
  {
    name: "Landscape Lighting",
    h1: "Low-Voltage LED Landscape Lighting Design & Installation for NYC Homes & Businesses",
    slug: "landscape-lighting",
    tagline: "Energy-efficient LED path lights, tree uplighting, step lighting, and outdoor entertainment area illumination — custom-designed to add drama, safety, and curb appeal to your NYC property after dark.",
    shortDesc:
      "Low-voltage LED landscape lighting that enhances beauty, safety, and security for homes and businesses.",
    description:
      "Landscape lighting transforms your outdoor space after dark, adding drama, safety, and curb appeal to any NYC property. We design and install energy-efficient LED systems that highlight architectural features, illuminate pathways, and create inviting entertainment areas. Every installation is custom-designed to complement your landscape and meet New York City electrical codes.",
    features: [
      "Low-voltage LED path and accent lighting",
      "Uplighting for trees, walls, and architectural features",
      "Step and deck lighting for safety",
      "Smart timers and dusk-to-dawn photocells",
      "Outdoor dining and entertainment area lighting",
      "Bollard and post lighting for driveways",
      "Color-changing and dimmable LED options",
      "Energy-efficient transformers and wiring",
    ],
  },
  {
    name: "Lawn & Garden Maintenance",
    h1: "Year-Round Lawn Mowing, Fertilization & Garden Maintenance Services Across NYC",
    slug: "lawn-garden-maintenance",
    tagline: "Weekly mowing, edging, seasonal fertilization, core aeration, overseeding, shrub trimming, mulching, and fall leaf removal — flexible scheduling and customized care plans for residential yards, commercial properties, and community gardens across all five boroughs.",
    shortDesc:
      "Comprehensive lawn mowing, edging, fertilization, and garden upkeep on weekly, biweekly, or monthly schedules.",
    description:
      "Keeping a lawn and garden looking pristine in NYC takes consistent, professional attention. Our maintenance crews handle everything from mowing and edging to seasonal fertilization, aeration, and overseeding. We offer flexible scheduling and customized care plans for residential yards, commercial properties, and community gardens throughout all five boroughs and beyond.",
    features: [
      "Weekly or biweekly mowing and edging",
      "Seasonal fertilization and weed control programs",
      "Core aeration and overseeding",
      "Shrub and hedge trimming",
      "Mulching and bed maintenance",
      "Leaf removal and fall cleanup",
      "Spring cleanup and bed preparation",
      "Customizable maintenance contracts",
    ],
  },
  {
    name: "Snow Removal",
    h1: "NYC Snow Removal & Ice Management — Residential Driveways, Commercial Lots & Sidewalks",
    slug: "snow-removal",
    tagline: "Seasonal contracts and on-call service with professional-grade plowing, shoveling, eco-friendly de-icing, 24/7 storm monitoring, and NYC sidewalk compliance — from light dustings to major nor'easters, we keep your property safe and accessible.",
    shortDesc:
      "Fast, dependable snow plowing, shoveling, and ice management for NYC properties of all sizes.",
    description:
      "When winter storms hit New York City, our snow removal crews are ready to keep your property safe and accessible. We offer seasonal contracts and on-call services for residential driveways, commercial lots, sidewalks, and building entrances. Our team uses professional-grade equipment and eco-friendly de-icing products to handle everything from light dustings to major nor'easters.",
    features: [
      "Seasonal snow removal contracts",
      "On-call and per-event service options",
      "Sidewalk shoveling and salt application",
      "Parking lot and driveway plowing",
      "Eco-friendly de-icing and anti-icing treatments",
      "24/7 storm monitoring and rapid response",
      "NYC sidewalk compliance (building owner liability)",
      "Commercial and multi-property route service",
    ],
  },
  {
    name: "Seasonal Flower Rotations",
    h1: "Seasonal Flower Bed Plantings & Color Rotations for NYC Properties — Spring, Summer & Fall",
    slug: "seasonal-flower-rotations",
    tagline: "Spring bulbs, summer annuals, fall mums, and winter holiday displays — premium plantings rotated each season with soil prep, deadheading, and replacement included so your beds always look their absolute best.",
    shortDesc:
      "Professional flower bed plantings rotated each season to keep your property colorful and inviting.",
    description:
      "Nothing elevates a property's curb appeal like fresh, seasonal flowers. We design and install color rotations for spring, summer, and fall using premium annuals and perennials selected for the NYC climate. Our team handles everything from soil preparation and planting to ongoing deadheading and replacement, ensuring your beds always look their absolute best.",
    features: [
      "Spring bulb and annual installations",
      "Summer color rotations with heat-tolerant varieties",
      "Fall mums, ornamental kale, and seasonal accents",
      "Holiday greenery and winter container displays",
      "Custom color palettes to match your brand or style",
      "Soil amendment and bed preparation included",
      "Container and window box plantings",
      "Scheduled rotations with no hassle for you",
    ],
  },
  {
    name: "Tree & Shrub Care",
    h1: "Tree Pruning, Deep Root Feeding & Shrub Care for NYC Properties — Certified Arborists",
    slug: "tree-shrub-care",
    tagline: "Structural pruning, deep root fertilization, pest and disease treatment, storm damage cleanup, and seasonal health inspections by certified arborists who understand urban tree care challenges — compacted soils, limited root zones, and salt exposure.",
    shortDesc:
      "Pruning, feeding, pest management, and health assessments for trees and shrubs across New York City.",
    description:
      "Healthy trees and shrubs are the backbone of any great landscape. Our certified arborists and horticulturists provide comprehensive care including structural pruning, deep root feeding, pest and disease management, and storm damage assessment. We understand the unique challenges of urban tree care in NYC, from compacted soils to limited root zones and salt exposure.",
    features: [
      "Structural and aesthetic pruning",
      "Deep root fertilization and soil conditioning",
      "Pest and disease diagnosis and treatment",
      "Storm damage assessment and cleanup",
      "New tree and shrub planting",
      "Root zone aeration and mulching",
      "NYC Parks Department permit coordination",
      "Seasonal health inspections and reporting",
    ],
  },
  {
    name: "Patio & Hardscape Design",
    h1: "Bluestone Patio, Natural Stone Walkway & Hardscape Design for NYC Homes & Properties",
    slug: "patio-hardscape-design",
    tagline: "Extend your living space outdoors with custom-built patios, walkways, steps, and gathering areas using bluestone, flagstone, brick pavers, and porcelain tile — with proper grading, drainage, and a compacted base built to last decades.",
    shortDesc:
      "Bluestone, brick, and natural stone patios, walkways, and outdoor living areas designed and built to last.",
    description:
      "A well-designed patio or hardscape area extends your living space outdoors and adds significant value to your NYC property. We design and build custom patios, walkways, steps, and gathering areas using premium materials including bluestone, natural stone, brick pavers, and porcelain tile. Every project includes proper grading, drainage, and a compacted base for decades of durability.",
    features: [
      "Bluestone, flagstone, and natural stone patios",
      "Brick and concrete paver installations",
      "Custom walkways and garden paths",
      "Steps, stoops, and landing areas",
      "Proper grading and subsurface drainage",
      "Mortared and dry-laid construction methods",
      "Outdoor kitchen and fire pit integration",
      "Permeable paver options for stormwater management",
    ],
  },
  {
    name: "Retaining Walls",
    h1: "Retaining Wall Construction for NYC Properties — Natural Stone, Block & Boulder Systems",
    slug: "retaining-walls",
    tagline: "Engineered retaining walls that manage slopes, prevent erosion, and create usable terraced space — natural stone, concrete block, timber, and boulder systems with proper drainage, backfill, and NYC DOB permits handled.",
    shortDesc:
      "Engineered retaining walls that solve grading challenges and add architectural beauty to your landscape.",
    description:
      "Retaining walls are essential for managing slopes, preventing erosion, and creating usable outdoor space on uneven NYC properties. We build retaining walls using natural stone, concrete block, timber, and boulder systems — all engineered for stability and longevity. Our team handles everything from initial site assessment and permit filing to excavation, drainage installation, and final construction.",
    features: [
      "Natural stone and boulder wall construction",
      "Segmental concrete block retaining systems",
      "Timber and landscape tie walls",
      "Engineered designs for walls over 4 feet",
      "Proper drainage and backfill systems",
      "Terraced and multi-level wall designs",
      "Erosion control and slope stabilization",
      "NYC DOB permit filing when required",
    ],
  },
  {
    name: "Sod & Turf Installation",
    h1: "Sod Laying & Artificial Turf Installation for NYC Lawns, Rooftops & Play Areas",
    slug: "sod-turf-installation",
    tagline: "Instant green lawns with premium Kentucky Bluegrass and Fescue sod or maintenance-free synthetic turf — complete soil prep, grading, drainage, starter fertilization, and post-installation care guidance for NYC yards of every size.",
    shortDesc:
      "Professional sod laying and artificial turf installation for lawns, play areas, and rooftops.",
    description:
      "Whether you want an instant natural lawn or a maintenance-free artificial turf area, our installation team delivers flawless results. We prepare your soil with proper grading, amendments, and drainage before laying premium sod or installing high-quality synthetic turf. Sod installations include a starter fertilization and watering plan to ensure your new lawn establishes quickly and stays green.",
    features: [
      "Premium Kentucky Bluegrass and Fescue sod",
      "Complete soil preparation and grading",
      "Artificial turf for rooftops, patios, and play areas",
      "Pet-friendly synthetic turf options",
      "Proper drainage and base preparation",
      "Starter fertilization and watering schedules",
      "Small urban yards to large estate lawns",
      "Post-installation care guidance included",
    ],
  },
  {
    name: "Drainage Solutions",
    h1: "French Drains, Dry Wells & Stormwater Drainage Solutions for Waterlogged NYC Properties",
    slug: "drainage-solutions",
    tagline: "Stop standing water and foundation damage — French drains, channel drains, dry wells, regrading, downspout rerouting, and permeable paving solutions designed for NYC's unique soil conditions, tight property lines, and DEP stormwater compliance.",
    shortDesc:
      "French drains, dry wells, grading corrections, and stormwater management for waterlogged NYC properties.",
    description:
      "Standing water and poor drainage can destroy your landscape, damage foundations, and create safety hazards. Our drainage experts diagnose water flow issues and install effective solutions including French drains, channel drains, dry wells, and regrading. We work with NYC's unique soil conditions and tight property lines to solve even the most challenging drainage problems.",
    features: [
      "French drain and curtain drain installation",
      "Channel and trench drains for hardscape areas",
      "Dry well and rain garden construction",
      "Regrading and swale creation",
      "Downspout rerouting and underground piping",
      "Sump pump and catch basin installation",
      "Permeable paving for stormwater reduction",
      "NYC DEP stormwater compliance support",
    ],
  },
  {
    name: "Commercial Landscaping",
    h1: "Commercial Landscaping Services for NYC Office Buildings, Retail Centers, Hotels & HOAs",
    slug: "commercial-landscaping",
    tagline: "Full-service commercial grounds management — landscape design, year-round maintenance contracts, seasonal color displays, snow and ice management, irrigation monitoring, and NYC zoning compliance for high-traffic commercial properties.",
    shortDesc:
      "Full-service landscaping for office buildings, retail centers, restaurants, hotels, and commercial properties.",
    description:
      "First impressions matter, and your commercial landscape is the first thing customers, tenants, and visitors see. We provide comprehensive commercial landscaping services including design, installation, and year-round maintenance for office parks, retail centers, restaurants, hotels, and multi-family properties throughout New York City. Our commercial team understands the demands of high-traffic properties and delivers consistently excellent results.",
    features: [
      "Commercial landscape design and master planning",
      "Year-round grounds maintenance contracts",
      "Seasonal color and holiday displays",
      "Snow and ice management for commercial properties",
      "Irrigation system installation and monitoring",
      "Parking lot and entrance landscaping",
      "HOA and property management partnerships",
      "Compliance with NYC zoning and DOB requirements",
    ],
  },
  {
    name: "Residential Landscaping",
    h1: "Residential Landscaping for NYC Brownstones, Townhouses & Single-Family Homes",
    slug: "residential-landscaping",
    tagline: "Custom front and backyard landscapes designed for NYC homeowners — brownstone gardens, privacy screening, outdoor entertaining areas, curb appeal upgrades, and year-round maintenance plans from Brooklyn to Westchester and Long Island.",
    shortDesc:
      "Complete landscaping services for brownstones, townhouses, single-family homes, and residential properties.",
    description:
      "Your home deserves a landscape that reflects your personal style and enhances your daily life. We work with NYC homeowners to design, build, and maintain outdoor spaces that are beautiful, functional, and low-maintenance. From brownstone backyards and townhouse gardens to suburban estates in Westchester and Long Island, we bring expert craftsmanship to every residential project.",
    features: [
      "Custom front and backyard landscape design",
      "Brownstone and townhouse garden specialists",
      "Privacy screening and hedge installation",
      "Outdoor entertaining and dining areas",
      "Children's play areas and pet-friendly designs",
      "Foundation planting and curb appeal upgrades",
      "Year-round residential maintenance plans",
      "Flexible budgets with phased installation options",
    ],
  },
  {
    name: "Planting & Garden Beds",
    h1: "Garden Bed Design, Perennial Planting & Ornamental Installation for NYC Properties",
    slug: "planting-garden-beds",
    tagline: "Curated mixes of perennials, ornamental grasses, ground covers, and flowering shrubs tailored to your site's sun, soil, and style — with proper edging, amended soil, mulching, and four-season interest planting plans that thrive year after year.",
    shortDesc:
      "Professional garden bed creation, plant installation, and ornamental planting for NYC properties.",
    description:
      "Beautiful garden beds are the heart of every great landscape. Our horticulturists design and install planting beds using a carefully curated mix of perennials, ornamental grasses, ground covers, and flowering shrubs tailored to your site's sun exposure, soil, and style preferences. We build beds with proper edging, amended soil, and mulch for healthy plants that thrive season after season.",
    features: [
      "Custom perennial and annual bed designs",
      "Shade garden and woodland planting specialists",
      "Ornamental grass and native plant installations",
      "Raised bed and container garden construction",
      "Soil testing, amendment, and preparation",
      "Professional edging and mulching",
      "Pollinator-friendly and wildlife habitat gardens",
      "Four-season interest planting plans",
    ],
  },
  {
    name: "Fence & Gate Installation",
    h1: "Wood, Metal & Vinyl Fence Installation with Custom Gates for NYC Homes & Businesses",
    slug: "fence-gate-installation",
    tagline: "Cedar, aluminum, wrought iron, vinyl, and composite fencing in every style — custom entry gates, automated openers, pool enclosures to code, and NYC permit coordination with proper post setting and level alignment built to last.",
    shortDesc:
      "Wood, metal, vinyl, and composite fencing with custom gates for privacy, security, and style.",
    description:
      "A well-built fence defines your property, provides privacy, and adds security and style to your NYC home or business. We install wood, aluminum, wrought iron, vinyl, and composite fencing in a variety of styles to match your landscape and architecture. Every installation includes proper post setting, level alignment, and hardware selection for a fence that stands strong for years.",
    features: [
      "Cedar, pressure-treated, and composite wood fencing",
      "Aluminum and wrought iron ornamental fencing",
      "Vinyl and PVC privacy fencing",
      "Custom entry and garden gates",
      "Automated gate openers and access systems",
      "Property line surveys and NYC permit coordination",
      "Pool enclosure fencing to code",
      "Fence repair and replacement services",
    ],
  },
  {
    name: "Outdoor Living Spaces",
    h1: "Outdoor Kitchen, Fire Pit & Pergola Design for NYC Backyards, Terraces & Rooftops",
    slug: "outdoor-living-spaces",
    tagline: "Turn your outdoor space into a year-round living extension — custom kitchens, fire pits, fireplaces, pergolas, built-in seating, outdoor audio and TV, gas hookups, and weather-resistant finishes designed for how you actually live and entertain.",
    shortDesc:
      "Custom outdoor kitchens, fire pits, pergolas, and entertainment areas for NYC homes and businesses.",
    description:
      "Outdoor living spaces turn your backyard, terrace, or rooftop into an extension of your home where you cook, entertain, and relax. We design and build complete outdoor living environments including kitchens, fire pits, fireplaces, pergolas, and seating areas. Every project is custom-designed to fit your space, style, and how you want to use your outdoor area.",
    features: [
      "Outdoor kitchen design and construction",
      "Fire pit and fireplace installations",
      "Pergolas, arbors, and shade structures",
      "Built-in seating and dining areas",
      "Outdoor audio, TV, and WiFi integration",
      "Natural gas and electrical hookups",
      "Weather-resistant materials and finishes",
      "Full project management from design to completion",
    ],
  },
  {
    name: "Power Washing & Cleanup",
    h1: "Power Washing for Patios, Driveways & Fences + Full Property Cleanup in NYC",
    slug: "power-washing-cleanup",
    tagline: "Restore stone, brick, concrete, decks, and fences to like-new condition — high-pressure and soft washing, algae and mold treatment, stain removal, debris clearing, overgrowth cleanup, and post-construction site preparation.",
    shortDesc:
      "High-pressure washing for patios, driveways, siding, and fences plus full property debris cleanup.",
    description:
      "Years of city grime, algae, mold, and weather staining can make even the best hardscape and exterior surfaces look neglected. Our power washing service restores patios, walkways, driveways, fences, decks, and building facades to like-new condition. We also provide complete property cleanups including debris removal, overgrowth clearing, and site preparation for new landscaping projects.",
    features: [
      "High-pressure washing for stone, brick, and concrete",
      "Soft washing for delicate surfaces and siding",
      "Deck and fence cleaning and brightening",
      "Driveway and sidewalk stain removal",
      "Algae, mold, and mildew treatment",
      "Full property debris and junk removal",
      "Overgrowth clearing and site preparation",
      "Post-construction landscape cleanup",
    ],
  },
];

/* ─── Area Interface & Data ─── */

export interface Area {
  name: string;
  slug: string;
  borough: string;
  boroughSlug: string;
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function area(name: string, borough: string, boroughSlug: string): Area {
  return { name, slug: slug(name), borough, boroughSlug };
}

export const areas: Area[] = [
  /* ── Manhattan (30) ── */
  area("Upper East Side", "Manhattan", "manhattan"),
  area("Upper West Side", "Manhattan", "manhattan"),
  area("Midtown", "Manhattan", "manhattan"),
  area("Chelsea", "Manhattan", "manhattan"),
  area("Greenwich Village", "Manhattan", "manhattan"),
  area("East Village", "Manhattan", "manhattan"),
  area("West Village", "Manhattan", "manhattan"),
  area("SoHo", "Manhattan", "manhattan"),
  area("Tribeca", "Manhattan", "manhattan"),
  area("Lower East Side", "Manhattan", "manhattan"),
  area("Financial District", "Manhattan", "manhattan"),
  area("Harlem", "Manhattan", "manhattan"),
  area("East Harlem", "Manhattan", "manhattan"),
  area("Washington Heights", "Manhattan", "manhattan"),
  area("Inwood", "Manhattan", "manhattan"),
  area("Hell's Kitchen", "Manhattan", "manhattan"),
  area("Murray Hill", "Manhattan", "manhattan"),
  area("Gramercy", "Manhattan", "manhattan"),
  area("Flatiron", "Manhattan", "manhattan"),
  area("NoHo", "Manhattan", "manhattan"),
  area("Nolita", "Manhattan", "manhattan"),
  area("Chinatown", "Manhattan", "manhattan"),
  area("Battery Park", "Manhattan", "manhattan"),
  area("Hudson Yards", "Manhattan", "manhattan"),
  area("Roosevelt Island", "Manhattan", "manhattan"),
  area("Morningside Heights", "Manhattan", "manhattan"),
  area("Hamilton Heights", "Manhattan", "manhattan"),
  area("Kips Bay", "Manhattan", "manhattan"),
  area("Stuyvesant Town", "Manhattan", "manhattan"),
  area("Central Park South", "Manhattan", "manhattan"),

  /* ── Brooklyn (25) ── */
  area("Park Slope", "Brooklyn", "brooklyn"),
  area("Williamsburg", "Brooklyn", "brooklyn"),
  area("DUMBO", "Brooklyn", "brooklyn"),
  area("Brooklyn Heights", "Brooklyn", "brooklyn"),
  area("Cobble Hill", "Brooklyn", "brooklyn"),
  area("Carroll Gardens", "Brooklyn", "brooklyn"),
  area("Greenpoint", "Brooklyn", "brooklyn"),
  area("Bushwick", "Brooklyn", "brooklyn"),
  area("Bed-Stuy", "Brooklyn", "brooklyn"),
  area("Crown Heights", "Brooklyn", "brooklyn"),
  area("Flatbush", "Brooklyn", "brooklyn"),
  area("Bay Ridge", "Brooklyn", "brooklyn"),
  area("Sunset Park", "Brooklyn", "brooklyn"),
  area("Prospect Heights", "Brooklyn", "brooklyn"),
  area("Fort Greene", "Brooklyn", "brooklyn"),
  area("Clinton Hill", "Brooklyn", "brooklyn"),
  area("Red Hook", "Brooklyn", "brooklyn"),
  area("Windsor Terrace", "Brooklyn", "brooklyn"),
  area("Ditmas Park", "Brooklyn", "brooklyn"),
  area("Bensonhurst", "Brooklyn", "brooklyn"),
  area("Sheepshead Bay", "Brooklyn", "brooklyn"),
  area("Brighton Beach", "Brooklyn", "brooklyn"),
  area("Kensington", "Brooklyn", "brooklyn"),
  area("Gowanus", "Brooklyn", "brooklyn"),
  area("Boerum Hill", "Brooklyn", "brooklyn"),

  /* ── Queens (20) ── */
  area("Astoria", "Queens", "queens"),
  area("Long Island City", "Queens", "queens"),
  area("Flushing", "Queens", "queens"),
  area("Forest Hills", "Queens", "queens"),
  area("Jackson Heights", "Queens", "queens"),
  area("Bayside", "Queens", "queens"),
  area("Rego Park", "Queens", "queens"),
  area("Woodside", "Queens", "queens"),
  area("Elmhurst", "Queens", "queens"),
  area("Corona", "Queens", "queens"),
  area("Kew Gardens", "Queens", "queens"),
  area("Sunnyside", "Queens", "queens"),
  area("Jamaica", "Queens", "queens"),
  area("Howard Beach", "Queens", "queens"),
  area("Whitestone", "Queens", "queens"),
  area("Douglaston", "Queens", "queens"),
  area("Fresh Meadows", "Queens", "queens"),
  area("Ridgewood", "Queens", "queens"),
  area("Middle Village", "Queens", "queens"),
  area("Maspeth", "Queens", "queens"),

  /* ── Bronx (15) ── */
  area("Riverdale", "Bronx", "bronx"),
  area("Pelham Bay", "Bronx", "bronx"),
  area("Throgs Neck", "Bronx", "bronx"),
  area("City Island", "Bronx", "bronx"),
  area("Morris Park", "Bronx", "bronx"),
  area("Fordham", "Bronx", "bronx"),
  area("Belmont", "Bronx", "bronx"),
  area("Kingsbridge", "Bronx", "bronx"),
  area("Mott Haven", "Bronx", "bronx"),
  area("Hunts Point", "Bronx", "bronx"),
  area("Concourse", "Bronx", "bronx"),
  area("Woodlawn", "Bronx", "bronx"),
  area("Wakefield", "Bronx", "bronx"),
  area("Parkchester", "Bronx", "bronx"),
  area("Co-op City", "Bronx", "bronx"),

  /* ── Staten Island (12) ── */
  area("St. George", "Staten Island", "staten-island"),
  area("Todt Hill", "Staten Island", "staten-island"),
  area("Great Kills", "Staten Island", "staten-island"),
  area("New Dorp", "Staten Island", "staten-island"),
  area("Tottenville", "Staten Island", "staten-island"),
  area("Stapleton", "Staten Island", "staten-island"),
  area("Westerleigh", "Staten Island", "staten-island"),
  area("Eltingville", "Staten Island", "staten-island"),
  area("Annadale", "Staten Island", "staten-island"),
  area("Huguenot", "Staten Island", "staten-island"),
  area("Rossville", "Staten Island", "staten-island"),
  area("Travis", "Staten Island", "staten-island"),

  /* ── Long Island (20) ── */
  area("Garden City", "Long Island", "long-island"),
  area("Great Neck", "Long Island", "long-island"),
  area("Manhasset", "Long Island", "long-island"),
  area("Roslyn", "Long Island", "long-island"),
  area("Port Washington", "Long Island", "long-island"),
  area("Oyster Bay", "Long Island", "long-island"),
  area("Huntington", "Long Island", "long-island"),
  area("Northport", "Long Island", "long-island"),
  area("Cold Spring Harbor", "Long Island", "long-island"),
  area("Syosset", "Long Island", "long-island"),
  area("Jericho", "Long Island", "long-island"),
  area("Massapequa", "Long Island", "long-island"),
  area("Babylon", "Long Island", "long-island"),
  area("Islip", "Long Island", "long-island"),
  area("Smithtown", "Long Island", "long-island"),
  area("Commack", "Long Island", "long-island"),
  area("Dix Hills", "Long Island", "long-island"),
  area("Woodbury", "Long Island", "long-island"),
  area("Old Westbury", "Long Island", "long-island"),
  area("Brookville", "Long Island", "long-island"),

  /* ── Westchester (15) ── */
  area("Scarsdale", "Westchester", "westchester"),
  area("Bronxville", "Westchester", "westchester"),
  area("Larchmont", "Westchester", "westchester"),
  area("Rye", "Westchester", "westchester"),
  area("Mamaroneck", "Westchester", "westchester"),
  area("New Rochelle", "Westchester", "westchester"),
  area("White Plains", "Westchester", "westchester"),
  area("Pelham", "Westchester", "westchester"),
  area("Dobbs Ferry", "Westchester", "westchester"),
  area("Irvington", "Westchester", "westchester"),
  area("Tarrytown", "Westchester", "westchester"),
  area("Hastings-on-Hudson", "Westchester", "westchester"),
  area("Yonkers", "Westchester", "westchester"),
  area("Mount Vernon", "Westchester", "westchester"),
  area("Eastchester", "Westchester", "westchester"),
];

/* ─── Borough Display Names ─── */

const BOROUGH_NAMES: Record<string, string> = {
  manhattan: "Manhattan",
  brooklyn: "Brooklyn",
  queens: "Queens",
  bronx: "Bronx",
  "staten-island": "Staten Island",
  "long-island": "Long Island",
  westchester: "Westchester",
};

/* ─── Helper Functions ─── */

export function findServiceBySlug(serviceSlug: string): Service | undefined {
  return services.find((s) => s.slug === serviceSlug);
}

export function findAreaBySlug(
  boroughSlug: string,
  areaSlug: string
): Area | undefined {
  return areas.find(
    (a) => a.boroughSlug === boroughSlug && a.slug === areaSlug
  );
}

export function getAllBoroughs(): {
  name: string;
  slug: string;
  count: number;
}[] {
  const seen = new Map<string, { name: string; slug: string; count: number }>();
  for (const a of areas) {
    const existing = seen.get(a.boroughSlug);
    if (existing) {
      existing.count++;
    } else {
      seen.set(a.boroughSlug, {
        name: BOROUGH_NAMES[a.boroughSlug] ?? a.borough,
        slug: a.boroughSlug,
        count: 1,
      });
    }
  }
  return Array.from(seen.values());
}

export function getAreasByBorough(boroughSlug: string): Area[] {
  return areas.filter((a) => a.boroughSlug === boroughSlug);
}

export function getBoroughUrl(boroughSlug: string): string {
  return `/areas/${boroughSlug}`;
}

export function getAreaUrl(a: Area): string {
  return `/areas/${a.boroughSlug}/${a.slug}`;
}

export function getAreaServiceUrl(a: Area, service: Service): string {
  return `/areas/${a.boroughSlug}/${a.slug}/${service.slug}`;
}

export function getServiceUrl(service: Service): string {
  return `/services/${service.slug}`;
}
