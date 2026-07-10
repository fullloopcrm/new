import type { Neighborhood } from "./data";

interface AreaContent {
  heroDescription: string;
  sections: { heading: string; content: string }[];
}

const regionInfo: Record<string, { climate: string; commonProjects: string; permitNote: string; deliveryNote: string; landscape: string }> = {
  "South Florida": {
    climate: "South Florida's year-round heat and humidity accelerate wear on buildings, roofing, and outdoor structures. Hurricane season runs June through November, bringing high winds and flooding that create urgent demand for storm debris dumpsters.",
    commonProjects: "High-rise condo renovations, waterfront property cleanouts, hurricane damage restoration, pool demolition, luxury home remodeling, and commercial buildouts in rapidly growing cities like Miami, Fort Lauderdale, and West Palm Beach.",
    permitNote: "Miami-Dade, Broward, and Palm Beach counties have some of the strictest dumpster placement regulations in Florida. Right-of-way permits are required for any dumpster placed on public property, and many municipalities limit residential dumpster rentals to 14 days.",
    deliveryNote: "We maintain heavy inventory across South Florida with same-day delivery available in all three counties. High-density areas like Miami Beach and downtown Fort Lauderdale may require specific placement coordination due to narrow streets and limited driveway access.",
    landscape: "Flat terrain with sandy soil, extensive canal systems, and dense urban development. Many properties have limited driveway space, making dumpster size selection critical. Coastal properties may have additional salt air damage creating more renovation debris.",
  },
  "Central Florida": {
    climate: "Central Florida's subtropical climate brings intense summer heat and afternoon thunderstorms that can delay outdoor projects. The region experiences occasional freezes in winter that can damage pipes and landscaping in northern areas.",
    commonProjects: "Theme park area commercial renovations, new subdivision construction, ranch and farm cleanouts, vacation rental remodeling, large-scale land clearing, and residential development projects fueled by Central Florida's population boom.",
    permitNote: "Orange County and most Central Florida municipalities allow dumpsters on private property without permits. Street placement requires a right-of-way permit in Orlando, Kissimmee, and most incorporated cities. Processing typically takes 1-3 business days.",
    deliveryNote: "Central Florida's grid layout and wide streets make delivery straightforward in most areas. The I-4 corridor from Daytona to Tampa is our busiest delivery zone. Same-day service is available throughout the metro area.",
    landscape: "Rolling hills, lakes, and a mix of urban development and agricultural land. Newer subdivisions have wide driveways that easily accommodate 30 yard dumpsters. Older Orlando neighborhoods may have narrower lots requiring careful placement.",
  },
  "Tampa Bay": {
    climate: "Tampa Bay's coastal climate means salt air corrosion on metal structures, frequent afternoon storms in summer, and occasional tropical systems. The region's sandy soil can shift under heavy loads, which matters for dumpster placement on unpaved surfaces.",
    commonProjects: "Waterfront condo renovations, historic Ybor City restorations, commercial warehouse cleanouts, residential roof replacements due to storm damage, dock and seawall demolition, and new construction in rapidly developing Wesley Chapel and Riverview.",
    permitNote: "Tampa requires permits for street-placed dumpsters. St. Petersburg and Clearwater have similar requirements with 24-48 hour processing. Hillsborough County is generally permit-free for driveway placement. Beach communities like Clearwater Beach have strict placement rules.",
    deliveryNote: "Our Tampa Bay fleet covers Hillsborough, Pinellas, Pasco, and Manatee counties with same-day delivery. Bridge access to barrier islands and beach communities is sometimes limited during peak tourist season. Plan ahead for deliveries to beach areas.",
    landscape: "Coastal lowlands with bay access, barrier islands, and rapidly expanding suburban development to the north and east. Many homes have screened pool enclosures that frequently need replacement after storms.",
  },
  "North Florida": {
    climate: "North Florida has a more temperate climate with actual winter cold snaps. Jacksonville and Gainesville experience occasional freezing temperatures that can burst pipes and damage outdoor structures. Summer brings the same heat and storms as the rest of the state.",
    commonProjects: "Military base housing renovations near Jacksonville, university area remodeling near Gainesville, historic district restorations in St. Augustine, new residential construction in growing suburbs like Nocatee and Fleming Island, and agricultural property cleanouts.",
    permitNote: "Jacksonville and Duval County have straightforward permitting for dumpster placement. St. Johns County requires permits for street placement in St. Augustine's historic district. Most other North Florida counties have minimal dumpster regulations.",
    deliveryNote: "North Florida coverage extends from Jacksonville to Gainesville and across to the Georgia border. Same-day delivery is available in the Jacksonville metro. More rural counties like Baker, Bradford, and Union may require next-day scheduling.",
    landscape: "Varied terrain from coastal beaches to pine forests and agricultural flatlands. Properties tend to have larger lots with easier dumpster access. Many older homes in Jacksonville's urban core sit on smaller lots requiring careful placement.",
  },
  "Southwest Florida": {
    climate: "Southwest Florida's Gulf Coast climate brings extreme summer heat, heavy seasonal rainfall, and direct hurricane exposure. The region's rapid growth over the past two decades means a mix of new construction and aging development that frequently needs renovation.",
    commonProjects: "Hurricane Ian rebuilding and restoration, retirement community renovations, golf course community remodeling, coastal property storm hardening, new subdivision development in Cape Coral and Fort Myers, and seasonal property maintenance for snowbird homes.",
    permitNote: "Lee County and Collier County require permits for street-placed dumpsters. Cape Coral has specific regulations about dumpster duration on residential properties. Naples has strict aesthetic requirements in some neighborhoods. Most HOA communities have their own rules.",
    deliveryNote: "Southwest Florida delivery covers Lee, Collier, Charlotte, Sarasota, and surrounding counties. Post-Hurricane Ian demand occasionally spikes inventory. We maintain dedicated inventory for this region. Island deliveries to Sanibel and Marco Island are available with advance scheduling.",
    landscape: "Flat coastal terrain with extensive canal systems in Cape Coral, island communities, and inland agricultural areas. Many homes are in gated communities with specific delivery access requirements. Coastal erosion and flooding create ongoing demolition and rebuild demand.",
  },
  "Space Coast": {
    climate: "The Space Coast's Atlantic-facing position makes it vulnerable to nor'easters and hurricanes from the east. Salt air corrosion is a constant factor for coastal properties. The region experiences typical Florida summer storms with heavy rainfall.",
    commonProjects: "Beachside condo renovations, aerospace industry facility cleanouts, residential roof replacements, new construction in growing areas like Viera and West Melbourne, and storm damage restoration along the barrier islands.",
    permitNote: "Brevard County permits are required for street-placed dumpsters. Most cities follow county guidelines. Cocoa Beach and Melbourne Beach have additional restrictions due to narrow barrier island streets. Merritt Island follows unincorporated county rules.",
    deliveryNote: "Space Coast delivery covers all of Brevard County from Titusville to Sebastian. Same-day delivery is available in the Melbourne and Palm Bay metro area. Barrier island deliveries may require advance scheduling due to bridge access.",
    landscape: "Long, narrow barrier islands with the Indian River Lagoon system. Many properties are waterfront with limited yard space. Mainland areas like Palm Bay and West Melbourne have typical suburban layouts with good dumpster access.",
  },
  "Treasure Coast": {
    climate: "The Treasure Coast sits at the transition between South Florida's tropical climate and Central Florida's subtropical zone. The region gets heavy rainfall, tropical storm exposure, and the same humidity-driven wear on buildings and structures.",
    commonProjects: "Residential remodeling in growing Port St. Lucie, historic downtown Stuart renovations, agricultural property cleanouts in the western portions, beachside condo updates in Vero Beach, and new construction in master-planned communities like Tradition.",
    permitNote: "St. Lucie County and Martin County have standard dumpster permitting for public right-of-way placement. Indian River County follows similar guidelines. Most residential dumpster placements on private driveways require no permit.",
    deliveryNote: "Treasure Coast delivery covers St. Lucie, Martin, Indian River, and Okeechobee counties. Same-day delivery is available in Port St. Lucie, Stuart, and Fort Pierce. Western communities near Lake Okeechobee may require next-day scheduling.",
    landscape: "Coastal communities along the Atlantic with extensive citrus and agricultural land inland. Port St. Lucie's rapid growth means constant new construction waste. Older communities along the coast have ongoing renovation needs.",
  },
  "Florida Panhandle": {
    climate: "The Panhandle experiences Florida's most varied climate with actual cold winters, occasional ice storms, and direct hurricane exposure from the Gulf. Hurricane Michael devastated the region in 2018, and rebuilding continues in some areas.",
    commonProjects: "Military base housing renovations near Pensacola and Panama City, hurricane rebuilding, vacation rental remodeling along 30A and Destin, new residential construction, state government facility maintenance in Tallahassee, and rural property cleanouts.",
    permitNote: "Panhandle permitting varies widely. Tallahassee and Pensacola require permits for street placement. Beach communities like Destin and Panama City Beach have strict rules during tourist season. Rural counties generally have minimal dumpster regulations.",
    deliveryNote: "The Panhandle spans over 200 miles from Pensacola to Tallahassee. We maintain inventory across the region but same-day delivery may not be available in all areas. Pensacola, Panama City, and Tallahassee metros have same-day service. Rural areas typically need next-day.",
    landscape: "Hilly terrain in the northern areas, sugar-white beach communities along the Gulf, and rural pine forest throughout. The 30A corridor's luxury beach homes generate significant renovation waste. Military installations create consistent demand.",
  },
  "Nature Coast": {
    climate: "The Nature Coast has a transitional climate between Central and North Florida. The region is more rural and less developed than other Florida areas, with extensive marshland and forest. Hurricane exposure comes primarily from Gulf storms.",
    commonProjects: "Rural property cleanouts, mobile home removals, aging infrastructure renovation, small-scale residential remodeling, land clearing for new development, and storm debris cleanup in communities like Spring Hill and Crystal River.",
    permitNote: "Nature Coast counties — Citrus, Hernando, Levy, and surrounding areas — generally have minimal dumpster permitting requirements. Most residential placements on private property need no permit. Spring Hill and Brooksville follow Hernando County guidelines.",
    deliveryNote: "Nature Coast delivery covers Citrus, Hernando, Dixie, Levy, Gilchrist, Lafayette, and Taylor counties. Same-day delivery is available in Spring Hill and Brooksville. More remote areas along the coast and inland may require next-day scheduling.",
    landscape: "Low-lying coastal marshland, springs, and rural forest. Properties tend to be on larger lots with easy dumpster access. Some rural roads may have weight restrictions that affect delivery routing. Unpaved driveways are common in outlying areas.",
  },
  "Florida Keys": {
    climate: "The Florida Keys have a true tropical maritime climate with warm temperatures year-round and direct hurricane exposure. The island chain's geography creates unique logistics challenges for everything from construction materials to waste removal.",
    commonProjects: "Hurricane damage restoration, vacation rental renovations, residential remodeling, restaurant and bar buildouts, dock and seawall repair, and historic property renovation in Key West. The Keys' building stock takes a beating from salt air and storms.",
    permitNote: "Monroe County and Key West have specific dumpster placement regulations due to limited space on the islands. Permits are typically required for any dumpster placed on public right-of-way. Key West's historic district has additional restrictions.",
    deliveryNote: "Florida Keys delivery requires advance planning due to the single-road access (US-1). We schedule Keys deliveries on dedicated routes. Key Largo and Islamorada are easiest to reach. Lower Keys and Key West deliveries need 48-72 hour advance booking.",
    landscape: "Narrow island chain connected by bridges with very limited space. Many properties have restricted access, small lots, and no traditional driveways. Dumpster placement creativity is often required. Weight restrictions on some older bridges may affect routing.",
  },
};

export function getAreaContent(neighborhood: Neighborhood): AreaContent {
  const { name, region, type } = neighborhood;
  const info = regionInfo[region] || regionInfo["Central Florida"];
  const isCounty = type === "county";
  const areaLabel = isCounty ? "unincorporated areas and cities within the county" : "and the surrounding area";

  const heroDescription = `Looking for a dumpster rental in ${name}? We provide fast, affordable roll-off dumpster service throughout ${name} ${areaLabel}. Whether you are tearing off a roof, cleaning out a garage, renovating a kitchen, or managing a construction site, we have the right size container at a flat rate with no hidden fees. 10, 20, and 30 yard dumpsters available with same-day delivery.`;

  const sections: { heading: string; content: string }[] = [
    {
      heading: `Why ${name} Residents and Contractors Choose Us`,
      content: `Renting a dumpster in ${name} should be simple: you tell us what you need, we give you a price, we deliver on time, and we pick up when you are done. That is exactly how we operate. No bait-and-switch pricing, no mystery fees on your invoice, no voicemail runaround when you call. We have served ${name} and the broader ${region} area for years, and our reputation is built on doing exactly what we say we will do. Our drivers know the roads, the neighborhoods, the permit requirements, and the best placement spots for every type of property in ${name}. Whether you are a homeowner doing your first cleanout or a general contractor running your tenth job this month, you get the same level of service: fast delivery, honest pricing, and someone who actually answers the phone.`,
    },
    {
      heading: `Dumpster Sizes Available in ${name}`,
      content: `We offer three roll-off dumpster sizes in ${name}, and each one is built for specific types of projects. The 10 yard dumpster is our smallest — it holds about 4 pickup truck loads and is perfect for garage cleanouts, small bathroom renovations, yard debris removal, and pre-move decluttering. The 20 yard dumpster is our most popular size — it holds approximately 8 pickup truck loads and handles kitchen renovations, roof tear-offs, estate cleanouts, flooring removal, and medium construction projects. The 30 yard dumpster is our largest — it holds roughly 12 pickup truck loads and is designed for whole-home renovations, new construction, large commercial cleanouts, demolition projects, and multi-room remodels. Not sure which size you need? Tell us about your project and we will recommend the right container. We would rather put you in the right dumpster the first time than have you order a second one mid-project.`,
    },
    {
      heading: `Common Dumpster Rental Projects in ${name}`,
      content: `${info.commonProjects} Beyond these, we regularly handle garage and attic cleanouts, estate cleanouts after a family member passes, pre-move decluttering, shed and fence demolition, flooring removal and replacement, appliance disposal, yard waste and landscaping debris, and general junk removal. If your project generates waste that needs to leave your property, a dumpster rental is almost always the most cost-effective solution. One flat-rate dumpster replaces dozens of trips to the dump, saves you hours of loading and driving, and keeps your property clean throughout the project.`,
    },
    {
      heading: `Delivery and Pickup in ${name}`,
      content: `${info.deliveryNote} When you book a dumpster for delivery in ${name}, here is what happens: we confirm your address, dumpster size, delivery date, and placement location. Our driver arrives within the scheduled window, backs the truck in, and rolls the dumpster into position. The entire delivery takes about 10 minutes. You do not need to be home — just make sure the delivery area is clear of vehicles, trash cans, and obstacles. We need approximately 60 feet of straight-line clearance for the truck and about 23 feet of vertical clearance for overhead wires and trees. When you are finished loading, text or call us and we will schedule pickup, typically within 24 hours. We send a photo confirmation after both delivery and pickup.`,
    },
    {
      heading: `Flat-Rate Pricing for ${name}`,
      content: `Every dumpster rental in ${name} comes with flat-rate pricing that includes delivery, a 7-day rental period, pickup, and disposal up to the included weight limit. There is no separate delivery fee, no fuel surcharge, no environmental fee, and no pickup charge. The price we quote is the price on your invoice. Period. The only potential additional charge is a weight overage if your load exceeds the included weight limit — and we help you avoid that by recommending the right size for your specific project. Our 10 yard dumpsters include 2 tons, 20 yard dumpsters include 3 tons, and 30 yard dumpsters include 4 tons. For most residential projects, you will come in well under the limit. For heavy materials like concrete, tile, or roofing shingles, we will set the right expectations upfront.`,
    },
    {
      heading: `${region} Climate and Your Project`,
      content: `${info.climate} These weather patterns directly affect dumpster rental planning in ${name}. We recommend covering your dumpster with a tarp during heavy rain to prevent water weight from pushing you over the weight limit — Florida afternoon thunderstorms can add hundreds of pounds of water to an open container. For hurricane season, we offer priority scheduling for storm debris cleanup to our existing customers and contractor accounts. If you are planning an outdoor project in ${name}, factor in weather delays and consider booking your dumpster with a few extra rental days as a buffer.`,
    },
    {
      heading: `Permits and Regulations in ${name}`,
      content: `${info.permitNote} If you are placing a dumpster on your own private driveway or property in ${name}, you generally do not need a permit. If the dumpster needs to go on a public street, sidewalk, or right-of-way, a permit is typically required. We know the specific rules for ${name} and every other area we serve. When you book, just tell us your delivery address and where you want the dumpster placed — we will tell you if a permit is needed and can guide you through the process or handle it directly. Do not risk a fine or a towed dumpster over a permit that costs $25 to $150.`,
    },
    {
      heading: `What Can and Cannot Go in Your Dumpster`,
      content: `In ${name}, the same statewide rules apply to dumpster contents. Accepted materials include furniture, appliances (with refrigerant removed from fridges and AC units), drywall, lumber, roofing shingles, concrete, brick, tile, carpet, flooring, yard waste, cardboard, general household junk, and most construction and demolition debris. Prohibited materials include hazardous waste, asbestos, paint (liquid), chemicals, pesticides, propane tanks, batteries, medical waste, and tires in quantities over four. If you are unsure whether a specific item is accepted, text us a photo and we will let you know immediately. Putting banned materials in your dumpster can result in contamination fees from the landfill that get passed to you.`,
    },
    {
      heading: `About ${region}`,
      content: `${info.landscape} ${name} sits within the ${region} region of Florida, which is one of the areas we serve most heavily. We maintain dedicated dumpster inventory across ${region} to ensure fast delivery and reliable pickup scheduling. Whether your project is in the heart of ${name} or on the outskirts, our coverage extends throughout the area. We work with homeowners, general contractors, property managers, real estate investors, restoration companies, and commercial businesses across ${region} every day. Our familiarity with the region means we understand local disposal facilities, tipping fees, recycling options, and the specific logistical challenges of delivering and picking up dumpsters in this part of Florida.`,
    },
  ];

  return { heroDescription, sections };
}
