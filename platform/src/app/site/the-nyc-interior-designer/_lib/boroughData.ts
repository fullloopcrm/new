export interface BoroughInfo {
  name: string;
  slug: string;
  description: string;
  designHighlights: string[];
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
      "Manhattan is the epicenter of interior design in New York City, with some of the most prestigious residential and commercial spaces in the world. From pre-war co-ops on the Upper East Side to glass-tower condos in Hudson Yards, Manhattan interiors demand the highest level of design sophistication. The borough's diverse housing stock — brownstones, lofts, penthouses, studio apartments, and historic townhouses — creates unique design challenges and opportunities. The NYC Interior Designer specializes in maximizing Manhattan's compact floor plans while delivering the elevated aesthetic that discerning Manhattan clients expect.",
    designHighlights: [
      "Pre-war apartment restoration with modern functionality",
      "Penthouse and high-floor condo design with skyline views",
      "Brownstone and townhouse full-gut renovations",
      "Luxury kitchen and bathroom design for co-op apartments",
      "Commercial office and retail interior design in Midtown",
      "Pied-a-terre and investment property staging",
    ],
    popularServices: [
      "Full-Home Interior Design",
      "Kitchen Design",
      "Bathroom Design",
      "Custom Closet Design",
      "Renovation Management",
      "Staging & Styling",
    ],
    averageProjectCostRange: "$25,000 - $500,000+",
    permitNotes:
      "Manhattan projects frequently require DOB permits for plumbing, electrical, and structural modifications. Co-op and condo boards require alteration agreements, architect-reviewed plans, insurance certificates, and board approval before any work begins. Landmark districts including the Upper West Side, Greenwich Village, and SoHo require LPC approval for any work affecting the building exterior. Building schedules for deliveries and construction hours are strictly enforced.",
    seasonalConsiderations:
      "Manhattan renovations are busiest from January through June as owners plan spring and summer completions. Material deliveries must be scheduled around building freight elevator availability. Many buildings restrict renovation work during holiday seasons (Thanksgiving through New Year). Summer is popular for staging ahead of fall real estate listings.",
    uniqueChallenges:
      "Manhattan's greatest design challenge is maximizing extremely limited square footage. Apartments average 700-900 square feet, and every design decision must balance aesthetics with storage and functionality. Freight elevator access, narrow hallways, and building delivery windows complicate furniture procurement. Co-op board approval processes can add 4-12 weeks to project timelines. Noise regulations and construction hour restrictions (typically 8 AM to 5 PM weekdays) limit renovation schedules.",
  },
  brooklyn: {
    name: "Brooklyn",
    slug: "brooklyn",
    description:
      "Brooklyn has emerged as one of the most design-forward boroughs in New York City, with a distinctive aesthetic that blends industrial heritage with contemporary sophistication. The borough's brownstone belt — Park Slope, Brooklyn Heights, Cobble Hill, Fort Greene — provides some of the most architecturally significant residential interiors in the city. Meanwhile, neighborhoods like Williamsburg, DUMBO, and Gowanus have pioneered the loft-living movement with converted warehouse spaces that demand creative, open-concept design solutions. The NYC Interior Designer understands Brooklyn's unique character and designs interiors that honor architectural heritage while delivering modern comfort.",
    designHighlights: [
      "Brownstone parlor floor and garden-level renovations",
      "Warehouse loft conversions with industrial-modern design",
      "New-construction condo interiors in Williamsburg and DUMBO",
      "Family-friendly brownstone kitchens and living spaces",
      "Home office design for Brooklyn's creative professionals",
      "Garden apartment and backyard-facing room design",
    ],
    popularServices: [
      "Full-Home Interior Design",
      "Kitchen Design",
      "Living Room Design",
      "Home Office Design",
      "Renovation Management",
      "Wallpaper & Wall Treatments",
    ],
    averageProjectCostRange: "$15,000 - $300,000",
    permitNotes:
      "Brooklyn has numerous landmark districts including Brooklyn Heights, Park Slope, Fort Greene, Clinton Hill, and Boerum Hill where exterior modifications require LPC approval. Interior renovations involving plumbing and electrical changes require DOB permits. Brownstone renovations must comply with historic preservation guidelines when in designated districts. Street parking permits for dumpsters and material deliveries are often required.",
    seasonalConsiderations:
      "Brooklyn brownstone renovations are best planned during the drier months (April through October) when exterior access and material deliveries are easier. Many Brooklyn families schedule renovations during summer when they can relocate temporarily. Fall is peak staging season for brownstone sales. Winter is ideal for design planning and board approval processes.",
    uniqueChallenges:
      "Brooklyn brownstones present unique structural challenges: load-bearing walls limit open-concept layouts, narrow staircases restrict furniture delivery, and uneven floors in pre-war buildings require leveling before new finishes can be installed. Basement and garden-level apartments face moisture issues that affect material selections. Loft spaces with soaring ceilings require creative approaches to lighting, acoustics, and proportional furniture selection. Parking and access limitations in dense neighborhoods like Williamsburg complicate renovation logistics.",
  },
  queens: {
    name: "Queens",
    slug: "queens",
    description:
      "Queens offers the most diverse range of interior design projects in the city, from modern high-rise condos in Long Island City with stunning Manhattan skyline views to spacious Colonial and Tudor homes in Forest Hills, Bayside, and Douglaston. The borough's multicultural population brings an extraordinary range of design influences and aesthetic preferences, making Queens one of the most creatively stimulating markets for interior designers. Many Queens homes have larger floor plans than their Manhattan and Brooklyn counterparts, allowing for more expansive design concepts including dedicated dining rooms, home offices, and generous storage solutions.",
    designHighlights: [
      "Long Island City luxury condo interiors with skyline views",
      "Tudor and Colonial home modernization in Forest Hills",
      "Multi-generational home design with in-law suites",
      "Open-concept kitchen and living room renovations",
      "Basement finishing and entertainment room design",
      "Culturally inspired interior design reflecting Queens' diversity",
    ],
    popularServices: [
      "Full-Home Interior Design",
      "Kitchen Design",
      "Bathroom Design",
      "Space Planning",
      "Lighting Design",
      "Smart Home Integration",
    ],
    averageProjectCostRange: "$10,000 - $200,000",
    permitNotes:
      "Queens renovation permits follow standard NYC DOB requirements. Kitchen and bathroom renovations involving plumbing relocation need permits. Basement finishing requires DOB approval for egress windows and electrical work. Long Island City condos typically require board approval and alteration agreements similar to Manhattan buildings. Some historic homes in areas like Flushing may have landmark considerations.",
    seasonalConsiderations:
      "Queens homeowners often schedule major renovations in spring and summer. The borough's larger homes allow for phased renovations where families can continue living in unaffected areas during construction. Fall is popular for kitchen renovations ahead of holiday entertaining season. Winter is ideal for planning and design development.",
    uniqueChallenges:
      "Queens' housing stock varies dramatically — designing for a 500-square-foot LIC studio requires a completely different approach than a 2,500-square-foot Bayside Colonial. Multi-generational living is common, requiring designs that balance privacy with shared spaces. Older homes often have outdated electrical and plumbing systems that must be upgraded during renovation. Language diversity among contractors and vendors can complicate communication on project sites.",
  },
  bronx: {
    name: "Bronx",
    slug: "bronx",
    description:
      "The Bronx is experiencing a design renaissance, with neighborhoods like Mott Haven, Concourse, and Riverdale attracting homeowners and developers who recognize the borough's value and potential. Riverdale's grand homes and Co-op City's sprawling apartments offer substantial spaces for ambitious interior design projects, while the South Bronx's emerging condo market brings demand for modern, design-forward interiors. The Bronx's architectural diversity — from Art Deco apartment buildings along the Grand Concourse to stately Tudor homes in Fieldston — provides rich canvases for interior design that respects history while embracing contemporary living.",
    designHighlights: [
      "Art Deco apartment restoration along the Grand Concourse",
      "Riverdale estate home interior renovations",
      "Co-op City apartment modernization and redesign",
      "Mott Haven new-construction condo interiors",
      "Family-oriented kitchen and living space design",
      "Historic detail preservation with modern amenities",
    ],
    popularServices: [
      "Full-Home Interior Design",
      "Kitchen Design",
      "Living Room Design",
      "Color Consultation",
      "Furniture Selection",
      "Renovation Management",
    ],
    averageProjectCostRange: "$8,000 - $150,000",
    permitNotes:
      "The Bronx has several historic districts including Mott Haven and Longwood where exterior and some interior modifications may require Landmarks approval. Standard DOB permits apply for plumbing, electrical, and structural work. Co-op buildings in Riverdale and Co-op City require board approval and alteration agreements. Some Bronx properties in flood zones require compliance with updated building codes.",
    seasonalConsiderations:
      "Bronx renovation schedules follow typical NYC patterns, with spring through fall being the busiest construction season. Large Riverdale homes benefit from summer renovations when families can use outdoor spaces while interiors are under construction. Co-op City apartments can be renovated year-round with minimal weather impact. Winter is ideal for design planning and material selection.",
    uniqueChallenges:
      "The Bronx's diverse housing stock requires designers who can work across multiple styles — from restoring ornate Art Deco plasterwork to creating sleek modern interiors in new construction. Many older buildings have low ceilings and small windows that require strategic lighting and color choices to feel spacious. Delivery logistics can be challenging in hilly neighborhoods like Riverdale. Budget-conscious design solutions are important in many Bronx neighborhoods while still delivering elevated results.",
  },
  "staten-island": {
    name: "Staten Island",
    slug: "staten-island",
    description:
      "Staten Island offers the most suburban interior design market within New York City, with spacious single-family homes, generous room sizes, and a lifestyle focused on family living and entertaining. Homes in Todt Hill, Grymes Hill, and Emerson Hill rival the finest suburban residences in Westchester or Long Island, with custom kitchens, formal dining rooms, finished basements, and master suites that demand high-end interior design. The borough's newer construction in developments across the South Shore provides opportunities for ground-up interior design with modern open floor plans and contemporary finishes.",
    designHighlights: [
      "Custom kitchen design for large family homes",
      "Master suite and luxury bathroom renovations",
      "Finished basement design with home theaters and bars",
      "Open-concept living and dining room transformations",
      "Whole-home color palette and furniture selection",
      "New construction interior specification and design",
    ],
    popularServices: [
      "Full-Home Interior Design",
      "Kitchen Design",
      "Bathroom Design",
      "Lighting Design",
      "Window Treatment Design",
      "Smart Home Integration",
    ],
    averageProjectCostRange: "$12,000 - $250,000",
    permitNotes:
      "Staten Island follows standard NYC DOB permitting. Kitchen and bathroom renovations with plumbing changes require permits. Finished basements need DOB approval for egress, electrical, and plumbing. New construction projects require full DOB permits and inspections. The Special Natural Area District (SNAD) overlay applies to some properties and may affect exterior work that relates to interior additions or extensions.",
    seasonalConsiderations:
      "Staten Island homeowners often plan major renovations around the school year, scheduling work during summer months. Kitchen renovations are popular in fall before the holiday season. The borough's suburban lifestyle means outdoor entertaining spaces and their adjacent indoor rooms are priorities for spring and summer design updates. Winter is the best time for whole-home design planning.",
    uniqueChallenges:
      "Staten Island's larger homes require more furniture, more materials, and higher budgets than comparable projects in the other boroughs. The borough's distance from Manhattan-based design showrooms and trade sources requires more planning for material sourcing and deliveries. Newer construction often comes with builder-grade finishes that need comprehensive upgrading. Some older homes in established neighborhoods have compartmentalized floor plans that require structural changes to achieve the open-concept layouts clients desire.",
  },
  "long-island": {
    name: "Long Island",
    slug: "long-island",
    description:
      "Long Island represents a premium interior design market spanning the established luxury communities of the North Shore's Gold Coast to the beachfront estates of the Hamptons. Nassau County communities like Garden City, Great Neck, and Manhasset feature classic Colonial and Tudor homes where interior design balances traditional elegance with modern functionality. Suffolk County offers everything from charming village homes in Northport and Cold Spring Harbor to sprawling waterfront estates that demand the highest level of interior design sophistication. The NYC Interior Designer brings city-caliber design expertise to Long Island's spacious homes and discerning clientele.",
    designHighlights: [
      "Gold Coast estate home interior renovation",
      "Hamptons-style beach house design",
      "Classic Colonial and Tudor home modernization",
      "Custom kitchen and great room design for entertaining",
      "Master suite design with spa-inspired bathrooms",
      "Seasonal home and vacation property design",
    ],
    popularServices: [
      "Full-Home Interior Design",
      "Kitchen Design",
      "Bathroom Design",
      "Furniture Selection",
      "Window Treatment Design",
      "Staging & Styling",
    ],
    averageProjectCostRange: "$15,000 - $500,000+",
    permitNotes:
      "Long Island municipalities each have their own permitting requirements. Nassau and Suffolk counties require permits for kitchen and bathroom renovations involving plumbing and electrical changes. Historic districts in villages like Oyster Bay and Cold Spring Harbor may require design review. Each town and village has specific building codes that affect renovation scope and timeline.",
    seasonalConsiderations:
      "Long Island design projects peak in spring as homeowners prepare for summer entertaining. Hamptons properties see intensive design work from January through May ahead of summer season. Fall is popular for kitchen renovations when outdoor entertaining winds down. Winter is the ideal planning period for large-scale whole-home renovations that will execute in spring and summer.",
    uniqueChallenges:
      "Long Island homes tend to be significantly larger than NYC apartments, requiring more furniture, more materials, and larger budgets. Many homes have multiple living areas and bedrooms that must feel cohesive while maintaining individual character. Older homes on the North Shore often have structural quirks, low ceilings, and outdated systems that complicate renovation. Homeowners frequently have extensive existing furniture collections that must be incorporated into new designs, requiring diplomatic editing and creative integration.",
  },
  westchester: {
    name: "Westchester",
    slug: "westchester",
    description:
      "Westchester County is one of the most sophisticated interior design markets in the New York metro area. Communities like Scarsdale, Bronxville, Larchmont, and Rye feature homes that range from elegant Tudors and stately Colonials to sleek contemporary residences — all demanding interior design that matches the caliber of their architecture and the expectations of their owners. Westchester clients value quality materials, timeless design, and interiors that function beautifully for both family life and formal entertaining. The NYC Interior Designer brings Manhattan design sensibility to Westchester's gracious homes.",
    designHighlights: [
      "Tudor and Colonial whole-home interior renovation",
      "Contemporary kitchen and open-concept living design",
      "Home library, study, and formal living room design",
      "Master suite expansion and luxury bathroom design",
      "Mudroom, laundry room, and utility space design",
      "Historic home restoration with period-appropriate details",
    ],
    popularServices: [
      "Full-Home Interior Design",
      "Kitchen Design",
      "Bathroom Design",
      "Color Consultation",
      "Furniture Selection",
      "Renovation Management",
    ],
    averageProjectCostRange: "$20,000 - $400,000+",
    permitNotes:
      "Westchester municipalities have varied permitting requirements. Most villages require permits for kitchen and bathroom renovations, structural modifications, and electrical upgrades. Historic districts in villages like Bronxville, Tarrytown, and Irvington require design review for exterior changes that may affect interior renovation scope. Each municipality has its own building department and inspection process.",
    seasonalConsiderations:
      "Westchester renovation schedules often align with the school year — families prefer to start major projects in early summer for fall completion. Spring is popular for kitchen and bathroom renovations. Fall is ideal for color consultation and furniture selection as natural light changes character. Winter is the prime planning season for large-scale projects that will begin in spring.",
    uniqueChallenges:
      "Westchester homes are often larger and older than their NYC counterparts, with multiple floors, numerous rooms, and architectural details that must be respected in any renovation. Many homes have been renovated multiple times over the decades, creating inconsistent layouts and hidden structural surprises. The county's older housing stock frequently has asbestos, lead paint, and outdated electrical systems that add cost and complexity to renovation projects. Clients often have strong attachment to certain architectural features that must be balanced against functional modernization.",
  },
  "new-jersey": {
    name: "New Jersey",
    slug: "new-jersey",
    description:
      "The Hudson River waterfront communities of New Jersey — Hoboken, Jersey City, Weehawken, and Edgewater — have become a natural extension of the New York City interior design market. These neighborhoods attract NYC professionals who want more space, modern finishes, and Manhattan skyline views at a better price point. The luxury condo and townhouse developments along the Gold Coast demand sophisticated interior design that rivals anything found across the river. The NYC Interior Designer serves the New Jersey waterfront with the same design expertise and trade resources available to our Manhattan and Brooklyn clients.",
    designHighlights: [
      "Luxury waterfront condo design with Manhattan views",
      "Hoboken brownstone and townhouse renovation",
      "Jersey City new-construction condo interiors",
      "Modern open-concept living design for young professionals",
      "Nursery and children's room design for growing families",
      "Home office and flex-space design for hybrid workers",
    ],
    popularServices: [
      "Full-Home Interior Design",
      "Kitchen Design",
      "Space Planning",
      "Furniture Selection",
      "Lighting Design",
      "Smart Home Integration",
    ],
    averageProjectCostRange: "$10,000 - $250,000",
    permitNotes:
      "New Jersey permitting varies by municipality. Hoboken, Jersey City, and Weehawken each have their own building departments and permit requirements. Most kitchen and bathroom renovations require permits for plumbing and electrical work. Condo associations and HOAs typically require approval for renovations, similar to NYC co-op boards. Historic districts in Hoboken have additional review requirements for any work affecting the building exterior.",
    seasonalConsiderations:
      "NJ waterfront communities follow similar renovation timing to NYC — spring through fall is the busiest construction season. Many young families moving from Manhattan schedule renovations immediately after closing, with design work starting during the purchase process. Summer is popular for full-apartment renovations when owners can stay with family or travel. Winter is the best time for design planning and furniture procurement.",
    uniqueChallenges:
      "NJ waterfront condos often have open floor plans that require careful furniture layout and zone definition to avoid feeling like one large undifferentiated space. Skyline views are a major asset that designs must frame and protect — furniture placement and window treatment selection are critical. Many buildings are relatively new construction with developer-grade finishes that look similar unit to unit, creating demand for personalized design that differentiates each home. Cross-river coordination with Manhattan-based trade sources, showrooms, and installers requires additional logistics planning.",
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
