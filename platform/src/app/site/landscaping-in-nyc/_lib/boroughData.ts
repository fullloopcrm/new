export interface BoroughInfo {
  name: string;
  slug: string;
  description: string;
  landscapingHighlights: string[];
  popularServices: string[];
  averageProjectCostRange: string;
  permitNotes: string;
  seasonalConsiderations: string;
  uniqueChallenges: string;
}

const boroughData: Record<string, BoroughInfo> = {
  manhattan: {
    name: "Manhattan",
    slug: "manhattan",
    description:
      "Manhattan presents some of the most unique landscaping challenges and opportunities in the world. With limited ground-level green space, the borough has embraced rooftop gardens, terrace plantings, courtyard oases, and vertical green walls. From luxury penthouses overlooking Central Park to brownstone backyards in the West Village, Manhattan landscaping demands creativity, precision engineering, and expertise with weight-load-rated planters, irrigation in high-rise environments, and wind-tolerant plant selections. Landscaping In NYC specializes in transforming Manhattan's concrete-heavy spaces into lush, functional outdoor living areas.",
    landscapingHighlights: [
      "Rooftop garden design with structural load analysis",
      "Penthouse terrace plantings with automated irrigation",
      "Brownstone backyard garden renovations",
      "Vertical green walls for commercial lobbies",
      "High Line-inspired native perennial gardens",
      "Co-op and condo common area beautification",
    ],
    popularServices: [
      "Rooftop Gardens & Terraces",
      "Landscape Lighting",
      "Seasonal Flower Rotations",
      "Patio & Hardscape Design",
      "Commercial Landscaping",
      "Power Washing & Cleanup",
    ],
    averageProjectCostRange: "$15,000 - $150,000+",
    permitNotes:
      "Manhattan projects often require DOB permits for rooftop structural work, crane permits for material hoisting, and landmarks approval in historic districts. Co-op and condo boards typically require alteration agreements and insurance certificates. Street tree work requires NYC Parks Department approval.",
    seasonalConsiderations:
      "Spring (March-May) is prime planting season. Summer heat islands intensify watering needs on rooftops. Fall cleanup is critical to prevent debris from clogging rooftop drains. Winter involves protecting container plants from freeze-thaw cycles and ensuring roof membranes are not damaged by ice.",
    uniqueChallenges:
      "Rooftop access is the defining challenge in Manhattan. Materials must be hoisted by crane or carried through freight elevators with strict building schedules. Structural weight limits dictate soil depth, planter size, and material choices. Wind exposure at height requires wind-break structures and specially anchored plantings. Co-op board approval processes can add weeks to project timelines.",
  },
  brooklyn: {
    name: "Brooklyn",
    slug: "brooklyn",
    description:
      "Brooklyn's landscaping scene is as diverse as the borough itself. From the stately brownstone gardens of Park Slope and Brooklyn Heights to the expansive backyards of Bay Ridge and Marine Park, Brooklyn offers a wide range of outdoor spaces. The borough has seen a surge in edible gardens, native pollinator plantings, and sustainable landscape design driven by its environmentally conscious residents. Landscaping In NYC brings deep experience with Brooklyn's unique mix of historic townhouse gardens, new-construction condo terraces, and community green spaces.",
    landscapingHighlights: [
      "Brownstone backyard garden design and renovation",
      "Edible gardens and raised-bed vegetable plots",
      "Native pollinator gardens for urban biodiversity",
      "New-construction condo terrace plantings",
      "Bluestone patio and walkway installation",
      "Privacy screening with evergreen hedges",
    ],
    popularServices: [
      "Landscape Design",
      "Planting & Garden Beds",
      "Patio & Hardscape Design",
      "Fence & Gate Installation",
      "Lawn & Garden Maintenance",
      "Drainage Solutions",
    ],
    averageProjectCostRange: "$8,000 - $75,000",
    permitNotes:
      "Brooklyn Landmarks Preservation Commission approval is required for exterior work in designated historic districts including Brooklyn Heights, Park Slope, and Fort Greene. Fence and retaining wall permits may be needed for structures over 6 feet. Street tree planting and pruning requires NYC Parks permits.",
    seasonalConsiderations:
      "Brooklyn's microclimate is slightly milder than Manhattan due to lower building density in many neighborhoods. Spring planting starts mid-March in southern Brooklyn. Salt spray affects plantings in coastal neighborhoods like Brighton Beach and Coney Island. Fall leaf cleanup is heavy in tree-lined neighborhoods like Prospect Heights.",
    uniqueChallenges:
      "Many Brooklyn properties have narrow side yards and limited rear access for equipment. Historic brownstone gardens often have irregular footprints, old brick walls requiring repair, and drainage issues from century-old infrastructure. Parking restrictions and narrow streets complicate material deliveries in neighborhoods like Williamsburg and DUMBO.",
  },
  queens: {
    name: "Queens",
    slug: "queens",
    description:
      "Queens is the most geographically diverse borough for landscaping, with everything from the dense urban blocks of Astoria and Long Island City to the suburban-style properties of Bayside, Douglaston, and Fresh Meadows. Many Queens homes have sizeable front and back yards with actual lawns, making traditional landscaping services like sod installation, irrigation systems, and lawn maintenance highly relevant. The borough also has a rich gardening culture influenced by its incredibly diverse population, with many homeowners incorporating cultural garden elements from around the world.",
    landscapingHighlights: [
      "Full lawn installation and renovation",
      "In-ground irrigation system design",
      "Foundation plantings and curb appeal upgrades",
      "Multi-season garden design with year-round interest",
      "Driveway and walkway paver installation",
      "Backyard outdoor living spaces with kitchens",
    ],
    popularServices: [
      "Sod & Turf Installation",
      "Irrigation Systems",
      "Lawn & Garden Maintenance",
      "Retaining Walls",
      "Outdoor Living Spaces",
      "Tree & Shrub Care",
    ],
    averageProjectCostRange: "$5,000 - $60,000",
    permitNotes:
      "Queens properties in flood zones (especially near Jamaica Bay and the Rockaways) may require elevated grading and special drainage plans. Retaining walls over 4 feet need DOB permits. Driveway expansions require curb cut permits from DOT.",
    seasonalConsiderations:
      "Queens lawns benefit from aeration and overseeding in early fall (September). Irrigation systems must be winterized by late October to prevent pipe bursts. Spring cleanup and mulching should begin by mid-March. The Rockaways and coastal areas face salt damage requiring salt-tolerant plant selections.",
    uniqueChallenges:
      "Queens properties often have significant grade changes requiring retaining walls and proper drainage engineering. The borough's clay-heavy soil in many neighborhoods creates drainage challenges and requires soil amendment before planting. Larger property sizes mean higher material costs compared to Manhattan and Brooklyn. Flood-prone areas near Jamaica Bay require resilient landscaping approaches.",
  },
  bronx: {
    name: "Bronx",
    slug: "bronx",
    description:
      "The Bronx is home to some of New York City's most important green spaces, including the New York Botanical Garden and Van Cortlandt Park, and its residential landscaping scene is growing rapidly. From the stately homes of Riverdale and Fieldston to the rowhouses of Morris Park and Throggs Neck, the Bronx offers diverse landscaping opportunities. The borough's hilly terrain creates interesting design possibilities with terraced gardens, retaining walls, and sloped plantings that add dimension and visual drama to residential properties.",
    landscapingHighlights: [
      "Hillside and sloped garden terracing",
      "Stone retaining walls and grading solutions",
      "Front yard curb appeal transformations",
      "Shade garden design under mature canopy trees",
      "Concrete-to-garden conversions",
      "Low-maintenance native landscape installations",
    ],
    popularServices: [
      "Retaining Walls",
      "Landscape Design",
      "Tree & Shrub Care",
      "Snow Removal",
      "Residential Landscaping",
      "Drainage Solutions",
    ],
    averageProjectCostRange: "$4,000 - $50,000",
    permitNotes:
      "The Bronx has several historic districts (Mott Haven, Longwood) where exterior work may require Landmarks approval. Retaining walls over 4 feet require DOB permits. Tree removal on private property may still require Parks Department review if the tree exceeds a certain caliper.",
    seasonalConsiderations:
      "The Bronx's inland location and hilly terrain create colder microclimates than waterfront boroughs. Spring planting may need to start slightly later (late March to early April). Heavy snowfall in winter makes snow removal services critical for hilly properties. Fall leaf volume is high due to abundant mature street and yard trees.",
    uniqueChallenges:
      "The Bronx's hilly topography requires careful grading and drainage planning for nearly every project. Many properties sit on rocky subsoil that complicates excavation and planting. Access to some Riverdale and Fieldston properties is challenging for large equipment. Deer damage to plantings is a real concern in neighborhoods bordering Van Cortlandt Park and Pelham Bay Park.",
  },
  "staten-island": {
    name: "Staten Island",
    slug: "staten-island",
    description:
      "Staten Island is New York City's most suburban borough and offers the most traditional landscaping environment. Properties here often feature spacious front and back yards, mature trees, and the kind of lawn-centric landscapes found in neighboring New Jersey. Staten Island homeowners invest heavily in curb appeal, outdoor entertaining spaces, and year-round garden maintenance. The borough's proximity to the waterfront also means salt tolerance and drainage are important considerations for many properties.",
    landscapingHighlights: [
      "Large-scale lawn installation and maintenance",
      "Outdoor kitchens and entertainment patios",
      "In-ground pool landscaping and surrounds",
      "Estate-style driveway and entrance design",
      "Specimen tree planting and mature tree transplanting",
      "Full-property landscape master planning",
    ],
    popularServices: [
      "Sod & Turf Installation",
      "Outdoor Living Spaces",
      "Irrigation Systems",
      "Landscape Lighting",
      "Fence & Gate Installation",
      "Lawn & Garden Maintenance",
    ],
    averageProjectCostRange: "$6,000 - $80,000",
    permitNotes:
      "Staten Island projects in the Special Natural Area District (SNAD) require environmental review before clearing or grading. Pool installations require DOB permits and electrical inspections. Fences over 6 feet need permits. Properties in flood zones (especially south shore) require elevated landscaping and drainage compliance.",
    seasonalConsiderations:
      "Staten Island's slightly warmer microclimate compared to the Bronx allows for a longer growing season. Spring planting can begin early March. Hurricane and nor'easter preparedness is important for south shore properties. Winter salt damage from road treatments affects front-yard plantings along major roads.",
    uniqueChallenges:
      "Salt spray and coastal wind damage affect south shore properties, requiring salt-tolerant species like bayberry, beach plum, and seaside goldenrod. The borough's serpentinite rock layer creates unique soil conditions in some areas. Larger property sizes mean higher water bills for irrigation. Deer are a significant problem in the Greenbelt area, requiring deer-resistant planting strategies or fencing.",
  },
  "long-island": {
    name: "Long Island",
    slug: "long-island",
    description:
      "Long Island's landscaping market spans from the dense suburban communities of Nassau County to the expansive estates and beach properties of Suffolk County's East End. Whether it is a classic North Shore estate garden, a Levittown ranch house curb appeal upgrade, or a Hamptons oceanfront property, Long Island offers an enormous range of landscaping needs. Landscaping In NYC extends its services across Long Island, bringing NYC-caliber design expertise to properties that benefit from larger canvases and fewer access constraints than the five boroughs.",
    landscapingHighlights: [
      "Estate garden design and installation",
      "Oceanfront salt-tolerant landscape design",
      "Swimming pool landscaping and outdoor rooms",
      "Automated irrigation for large lawns",
      "Specimen tree installation with crane service",
      "Seasonal color programs for commercial properties",
    ],
    popularServices: [
      "Irrigation Systems",
      "Landscape Design",
      "Sod & Turf Installation",
      "Outdoor Living Spaces",
      "Commercial Landscaping",
      "Landscape Lighting",
    ],
    averageProjectCostRange: "$8,000 - $200,000+",
    permitNotes:
      "Long Island municipalities each have their own permitting requirements. Nassau and Suffolk counties require permits for retaining walls, fences, and pool surrounds. Hamptons villages have strict aesthetic guidelines. Wetland buffer zones along the south shore require environmental permits for any grading or clearing work.",
    seasonalConsiderations:
      "Long Island's coastal climate provides a slightly longer growing season than inland NYC. Spring planting begins in early to mid-March. Summer drought stress is common on sandy South Shore soils, making irrigation critical. Fall is ideal for lawn renovation and bulb planting. Winter salt damage from ocean spray is a major factor on beachfront properties.",
    uniqueChallenges:
      "Salt damage is the defining challenge on Long Island, particularly along the south shore and east end. Ocean spray, salt-laden wind, and road salt all stress plantings and require careful species selection. Sandy soils on the south shore drain quickly and require frequent irrigation and heavy organic amendment. North shore properties often sit on clay-heavy glacial till that drains poorly. The Hamptons market demands high-end materials and design that meet extremely discerning aesthetic standards.",
  },
  westchester: {
    name: "Westchester",
    slug: "westchester",
    description:
      "Westchester County represents the premium suburban landscaping market just north of New York City. From the river towns of Hastings, Irvington, and Tarrytown to the estate communities of Scarsdale, Bronxville, and Bedford, Westchester homeowners expect sophisticated landscape design and meticulous year-round maintenance. The county's rolling terrain, mature tree canopy, and large property sizes create opportunities for elaborate garden rooms, stone walls, specimen plantings, and multi-season interest that rival the finest gardens in the Northeast.",
    landscapingHighlights: [
      "Multi-acre estate landscape master planning",
      "Natural stone walls and terraced gardens",
      "Woodland garden design under mature canopy",
      "Formal hedging and parterre gardens",
      "Koi ponds and water features",
      "Four-season perennial border design",
    ],
    popularServices: [
      "Landscape Design",
      "Tree & Shrub Care",
      "Retaining Walls",
      "Landscape Lighting",
      "Lawn & Garden Maintenance",
      "Snow Removal",
    ],
    averageProjectCostRange: "$10,000 - $250,000+",
    permitNotes:
      "Westchester municipalities have varied permitting requirements. Many villages require tree removal permits, even on private property. Wetland and watercourse buffer regulations are strict in most towns. Historic districts in villages like Bronxville and Tarrytown require design review. Pool, fence, and retaining wall permits are standard.",
    seasonalConsiderations:
      "Westchester sits in USDA Zone 6b/7a with a growing season from mid-April through October. The county gets significantly more snow than NYC proper, making snow removal contracts essential for commercial and residential properties. Fall foliage cleanup is extensive due to heavy tree canopy. Spring soil often remains wet longer due to clay content and hilly terrain.",
    uniqueChallenges:
      "Deer pressure is the single biggest landscaping challenge in Westchester. Deer populations are dense throughout the county, and they devastate hostas, arborvitae, yews, and dozens of other common landscape plants. Every planting plan must account for deer resistance or include protective fencing. Rocky terrain and ledge rock complicate excavation and require specialized equipment. Many properties have steep slopes that need professional grading and erosion control. Well water and septic systems on larger properties add constraints to irrigation design.",
  },
};

export function getBoroughInfo(boroughSlug: string): BoroughInfo | null {
  return boroughData[boroughSlug] ?? null;
}

export function getAllBoroughs(): BoroughInfo[] {
  return Object.values(boroughData);
}

export function getAllBoroughSlugs(): string[] {
  return Object.keys(boroughData);
}
