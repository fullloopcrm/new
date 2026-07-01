export interface Service {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  longDescription: string;
  ideal: string[];
  category: "residential" | "commercial" | "specialty" | "item-specific" | "structure";
}

/** Generate extended SEO content for a service page (~1500 words) */
export function getExtendedContent(service: Service): string[] {
  const t = service.title;
  const tl = service.title.toLowerCase();
  const cat = SERVICE_CATEGORIES[service.category];
  return [
    `${t} is one of the ${SERVICES.length} specialized junk removal services offered by We Pay You Junk Removal nationwide. As part of our ${cat.label.toLowerCase()} service category, ${tl} is designed to address the specific challenges and item types that customers encounter in this scenario. Unlike generic junk removal services that treat every job the same, our ${tl} service is optimized for the particular items, spaces, and logistics involved — ensuring faster completion times, safer handling, and more accurate appraisals that maximize your resale credit.`,

    `The demand for professional ${tl} has grown significantly over the past decade. More Americans are downsizing, relocating, renovating, and decluttering than ever before. The rise of remote work has changed how people use their homes, driving a wave of home office conversions, garage repurposing, and general space optimization. At the same time, the cost of living increases have made people more conscious of the value locked up in their unused items. Our ${tl} service meets both needs — clearing the space you need while recovering the value you deserve.`,

    `What sets our ${tl} service apart from competitors is the appraisal-as-we-go methodology. Traditional junk companies send a crew that loads everything onto a truck as fast as possible — speed is their priority because they're either charging by volume (incentivizing them to fill the truck) or paying their crew by the hour (incentivizing them to finish fast). Our crews have a different incentive structure. Because we earn revenue from reselling items, our crews are trained to work efficiently while simultaneously identifying and carefully handling items with resale value. This dual focus — speed and value identification — is built into our training, our crew assignments, and our operational protocols.`,

    `The ${tl} process begins before we even arrive at your property. When you call to book, our scheduling team asks specific questions about your ${tl} job: what types of items are involved, approximate quantities, the space they're in, and any access challenges like stairs, narrow doorways, or long carries. This information helps us assign the right crew size (ensuring we don't over-staff a small job or under-staff a large one) and estimate the time required (so we can schedule appropriately and you know what to expect). This pre-job consultation is free and takes about 5 minutes.`,

    `On arrival, your ${tl} crew does a walkthrough with you. This is your opportunity to confirm exactly what's going and what's staying. If you've changed your mind about any items since booking, no problem — we adjust on the spot. The crew also assesses the work environment during the walkthrough, planning the most efficient loading sequence and identifying any items that might require special handling (heavy items, fragile items, items with hazardous components). Once you give the go-ahead, work begins immediately.`,

    `During the ${tl} job, you're welcome to be present or go about your day — whatever you prefer. If you choose to watch, you'll see a systematic process: items are carried to the truck, evaluated for resale potential, and either loaded for disposal or set aside for appraisal. Appraisals happen in real-time — the crew member identifies the item, assesses condition and brand, checks comparable sales data, and determines fair market value. You see every appraisal and approve it before credit is applied. There are no behind-the-scenes calculations or post-job surprises.`,

    `After all items are loaded and appraised during your ${tl} job, the crew presents your final invoice. This shows total hours worked at your hourly rate, each appraised item with its resale value and your 50% credit, total credits, and the final amount due (or owed to you). Payment is processed on the spot — we accept credit cards, debit cards, checks, Venmo, Zelle, and CashApp. If you're receiving a payout (credits exceeded the bill), we process it immediately by check or digital transfer.`,

    `The ideal customers for our ${tl} service are ${service.ideal.join(", ").toLowerCase()}. Each of these customer types has specific needs that our ${tl} service addresses. For residential customers, we focus on careful handling of personal items and thorough space clearing. For commercial customers, we prioritize speed and minimal business disruption. For property managers and realtors, we emphasize fast turnaround and detailed documentation. No matter your situation, our ${tl} crew brings the experience, equipment, and attitude needed to complete the job professionally and efficiently.`,

    `We encourage anyone considering ${tl} to call us at (888) 831-3001 for a free, no-obligation consultation. We'll discuss your specific situation, confirm pricing, estimate the time required, and give you a clear sense of what to expect in terms of cost and potential resale credits. There's no pressure, no sales pitch — just honest information to help you make the best decision. Whether you book with us today, next week, or never, you'll walk away from the call knowing exactly what professional ${tl} costs and how much your items might be worth.`,

    `Safety is a core priority on every ${tl} job. Our crews are trained in proper lifting techniques, stair carry protocols, and the use of professional moving equipment including dollies, hand trucks, furniture straps, moving blankets, and floor runners. Heavy items like pianos, safes, refrigerators, and cast iron tubs require specific handling techniques that our crews practice regularly. We use corner guards to protect doorframes, floor runners to prevent scratches on hardwood and tile, and furniture blankets to protect items being carried through tight spaces. Every crew carries comprehensive liability insurance, so if property damage does occur — a scratched floor, a nicked wall — our insurance covers the repair at no cost to you.`,

    `The economics of ${tl} with We Pay You Junk Removal consistently favor the customer compared to every alternative. Against flat-rate junk companies, our hourly model plus resale credits results in 25-40% savings on the average job and frequent payouts on high-value cleanouts. Against DIY removal, our service saves you an entire day of physical labor, eliminates truck rental and dump fee costs, removes injury risk, and recovers resale value that DIY sends straight to the landfill. Against dumpster rental for ${tl}, our service is faster (same-day vs 3-7 day rental), doesn't take up driveway space, doesn't require you to do any loading, and includes disposal — dumpster rental fees cover only the container, not the landfill cost for heavy materials.`,

    `Our ${tl} service is available in over 900 cities across all 50 states, from 25 strategically located offices. No matter where you are in the United States, chances are we have a local crew experienced in ${tl} ready to serve you. Each office dispatches crews who live and work in the communities they serve — they know the neighborhoods, the disposal facilities, the recycling centers, and the regional resale markets. This local expertise translates to faster service, more accurate appraisals, and higher credits for your valuable items. We operate 7 days a week, 7AM-8PM, including weekends and holidays. Same-day ${tl} is available for calls placed before noon in most markets.`,

    `Scheduling flexibility is another advantage of our ${tl} service. We understand that life doesn't always align with business hours. That's why we operate 7AM-8PM every single day — weekdays, weekends, and holidays. Need ${tl} on a Saturday morning? No problem, same rate. Sunday afternoon? Available. Fourth of July? We're working. For commercial customers, we offer after-hours ${tl} service in the evenings to minimize disruption to business operations. There are no overtime charges, no weekend surcharges, and no holiday premiums. The hourly rate is the same 365 days a year. This scheduling flexibility, combined with same-day availability for morning calls, means you can get your ${tl} done on your timeline — not ours.`,

    `For customers who need recurring ${tl} — property managers handling regular tenant turnovers, contractors with ongoing renovation projects, businesses doing periodic office refreshes — we offer consistent crew assignments and priority scheduling. Your recurring ${tl} crew learns your properties, your preferences, and your expectations. They know where to park, how to access the building, what items typically need removal, and how you like the space left after clearing. This consistency reduces coordination time, speeds up each job, and ensures the same high standard on every visit. Recurring accounts also get same-day and next-day scheduling priority, meaning you're never waiting days for your next ${tl} appointment.`,

    `Customer satisfaction drives everything we do in ${tl}. We maintain a 5.0-star rating across 200+ reviews because we treat every customer the way we'd want to be treated — with honesty, respect, and fairness. Our crews introduce themselves, explain the process clearly, communicate throughout the job, and do a thorough walkthrough before leaving. If anything isn't to your satisfaction, we address it on the spot. If an appraisal seems low, we discuss it openly. If you decide to keep an item after it's been loaded, we take it off the truck — no questions asked. This isn't lip service — it's how we build the kind of customer relationships that generate referrals and repeat business. Over 40% of our ${tl} jobs come from referrals by previous customers who were genuinely impressed by the experience.`,
  ];
}

export const SERVICES: Service[] = [
  // RESIDENTIAL CLEANOUTS
  {
    slug: "full-service-junk-removal",
    title: "Full-Service Junk Removal",
    subtitle: "We Do All the Heavy Lifting",
    description: "Our crew handles everything — loading, hauling, and disposal. Point at what you want gone and we take care of the rest. If anything has resale value, we credit you 50% (when applicable) toward your bill.",
    longDescription: "Full-service junk removal is our bread and butter. You don't sort, you don't lift, you don't haul — you just point at what you want gone. Our crew loads everything onto the truck, separates items with resale value for appraisal, and hauls the rest to the dump. Dump fees are included in your hourly rate, and every item with resale potential earns you a 50% credit toward your bill. Whether it's a single room or an entire house, we handle the job from start to finish.",
    ideal: ["Homeowners", "Renters", "Property Managers"],
    category: "residential",
  },
  {
    slug: "garage-cleanouts",
    title: "Garage Cleanouts",
    subtitle: "Reclaim Your Parking Space",
    description: "Years of accumulated stuff often means years of hidden value. We clear it all out, appraise what's worth something, and credit you 50% (when applicable).",
    longDescription: "Garages become catch-all storage over the years — tools, old furniture, sports equipment, holiday decorations, and everything in between. Our crew clears the entire space, appraises items with resale value (tools and equipment often have significant value), and credits you 50% toward the bill. Many garage cleanout customers are surprised how much their \"junk\" is actually worth.",
    ideal: ["Homeowners", "Renters", "Downsizers"],
    category: "residential",
  },
  {
    slug: "basement-cleanouts",
    title: "Basement Cleanouts",
    subtitle: "Clear the Clutter Below",
    description: "Basements collect decades of forgotten items. We haul it all and credit you for anything with resale value — furniture, tools, electronics, you name it.",
    longDescription: "Basements are where items go to be forgotten. Old furniture, boxes of belongings, broken appliances, outdated electronics — it piles up for years. Our crew navigates stairs and tight spaces to clear everything out. We appraise items as we load and credit you 50% (when applicable) of resale value (when applicable). Basement cleanouts frequently uncover hidden gems — vintage furniture, working power tools, collectibles — that significantly offset the cost.",
    ideal: ["Homeowners", "Estate Managers", "Renovators"],
    category: "residential",
  },
  {
    slug: "attic-cleanouts",
    title: "Attic Cleanouts",
    subtitle: "Clear the Space Up Top",
    description: "Attics hold decades of stored items. We safely remove everything, appraise valuables, and credit you 50% (when applicable) of resale value (when applicable) toward your bill.",
    longDescription: "Attics are tricky — tight spaces, steep stairs or pull-down ladders, extreme temperatures. Our crews are trained to safely navigate attic access and remove everything from old furniture and boxes to insulation and debris. We appraise all items with resale value on the spot. Attic cleanouts often yield vintage items, antiques, and collectibles that owners forgot they had.",
    ideal: ["Homeowners", "Estate Managers", "Sellers"],
    category: "residential",
  },
  {
    slug: "estate-cleanouts",
    title: "Estate Cleanouts",
    subtitle: "Complete Property Clearing",
    description: "Estates are full of hidden value. We clear the entire property and appraise every item with resale potential. Credits can offset — or exceed — your bill.",
    longDescription: "Estate cleanouts are where our model truly shines. A lifetime of belongings means a property full of items with real resale value — furniture sets, appliances, electronics, tools, antiques, collectibles. Other junk companies charge you thousands to clear an estate and then resell everything for profit. We charge by the hour, appraise every valuable item, and credit you 50% (when applicable). On large estates, customers regularly walk away with a check instead of a bill.",
    ideal: ["Families", "Estate Managers", "Realtors", "Attorneys"],
    category: "residential",
  },
  {
    slug: "hoarder-cleanouts",
    title: "Hoarder Cleanouts",
    subtitle: "Compassionate, Thorough Clearing",
    description: "We handle hoarding situations with sensitivity and professionalism. Careful sorting, item appraisal, and complete clearing — no judgment, just results.",
    longDescription: "Hoarding cleanouts require a different approach — patience, sensitivity, and thoroughness. Our crews are trained to work through heavy accumulation methodically, sorting items carefully. We identify and appraise anything with resale value and credit you 50% (when applicable). We work with families, social workers, and property managers to clear spaces completely while treating everyone with dignity and respect.",
    ideal: ["Families", "Social Workers", "Property Managers"],
    category: "residential",
  },
  {
    slug: "storage-unit-cleanouts",
    title: "Storage Unit Cleanouts",
    subtitle: "Stop Paying Monthly Rent on Junk",
    description: "Paying monthly rent on a storage unit full of stuff you don't need? We clear it, credit you for valuables, and you stop bleeding money.",
    longDescription: "The average American spends $100+/month on storage units full of items they never access. We clear the entire unit, appraise everything with resale value, and credit you 50% (when applicable). Between the resale credits and the monthly rent you stop paying, a storage unit cleanout often pays for itself within the first month. We coordinate directly with storage facilities for access and scheduling.",
    ideal: ["Renters", "Movers", "Downsizers", "Estate Managers"],
    category: "residential",
  },

  // ITEM-SPECIFIC REMOVAL
  {
    slug: "furniture-removal",
    title: "Furniture Removal",
    subtitle: "Couches, Beds, Desks & More",
    description: "That old couch might be worth something. We remove it, appraise it, and if it has resale value you get 50% credited to your bill.",
    longDescription: "Furniture removal is one of the most common calls we get — and one of the best opportunities for resale credit. Couches, dining sets, dressers, desks, bookshelves, bed frames — if it's in decent condition, it has resale value and you get 50% credited toward your bill. Even if the furniture is damaged or worn, we haul it as part of your hourly rate with dump fees included. No extra charges for heavy items or stairs.",
    ideal: ["Movers", "Upgraders", "Downsizers", "Landlords"],
    category: "item-specific",
  },
  {
    slug: "appliance-removal",
    title: "Appliance Removal",
    subtitle: "Refrigerators, Washers, Dryers & More",
    description: "Appliances hold real value — even old ones. We safely remove them, assess fair market resale, and credit 50% of that value to your bill.",
    longDescription: "Appliances almost always have resale value — even older models. Refrigerators, washers, dryers, dishwashers, ovens, and microwaves all have active resale markets. We safely disconnect (where applicable), load, and haul them. Every working appliance gets appraised at fair market value with 50% credited to your bill. Non-working appliances still have scrap value, and we handle those too as part of your hourly rate.",
    ideal: ["Homeowners", "Landlords", "Renovators", "Property Managers"],
    category: "item-specific",
  },
  {
    slug: "mattress-removal",
    title: "Mattress Removal",
    subtitle: "Mattresses, Box Springs & Bed Frames",
    description: "Old mattresses are bulky and hard to dispose of. We haul them as part of your hourly rate — and if the bed frame has value, you get credit.",
    longDescription: "Mattress disposal is a hassle — they don't fit in your car, the dump charges extra, and most donation centers won't take them. We load and haul mattresses, box springs, and bed frames as part of your hourly rate with dump fees included. While mattresses themselves rarely have resale value, bed frames (especially wood, metal, or designer frames) often do — and you get 50% credit for those.",
    ideal: ["Homeowners", "Landlords", "Hotels", "Movers"],
    category: "item-specific",
  },
  {
    slug: "refrigerator-removal",
    title: "Refrigerator & Freezer Removal",
    subtitle: "All Types & Sizes Removed Safely",
    description: "Refrigerators and freezers require careful handling. We disconnect, load, haul, and credit you 50% (when applicable) of resale value (when applicable) on working units.",
    longDescription: "Refrigerators and freezers are heavy, bulky, and contain refrigerant that requires proper handling. Our crew safely disconnects the unit, navigates it through doorways and stairs, and loads it for hauling. Working refrigerators and freezers have strong resale value — you get 50% credited to your bill. Even non-working units have scrap and parts value. All refrigerant is handled in compliance with EPA regulations.",
    ideal: ["Homeowners", "Landlords", "Renovators", "Restaurants"],
    category: "item-specific",
  },
  {
    slug: "tv-electronics-removal",
    title: "TV & Electronics Removal",
    subtitle: "TVs, Computers, Monitors & More",
    description: "Old electronics often have more value than you think. We appraise everything, credit you 50% (when applicable) of resale value (when applicable), and recycle what can't be resold.",
    longDescription: "Electronics have active resale markets — flat screen TVs, computers, monitors, gaming consoles, audio equipment, and even older electronics with collector value. We appraise every electronic item and credit you 50% (when applicable) of resale value (when applicable). Items that can't be resold are recycled through certified e-waste facilities. We handle all responsible disposal so you don't have to figure out where to take that old CRT TV.",
    ideal: ["Homeowners", "Businesses", "Schools", "Offices"],
    category: "item-specific",
  },
  {
    slug: "exercise-equipment-removal",
    title: "Exercise Equipment Removal",
    subtitle: "Treadmills, Weights, Home Gyms",
    description: "Heavy gym equipment is a nightmare to move. We handle the heavy lifting and credit you for equipment with resale value.",
    longDescription: "Treadmills, ellipticals, stationary bikes, weight sets, home gym systems — exercise equipment is heavy, bulky, and hard to move. Our crew disassembles when needed and hauls everything out. The resale market for fitness equipment is strong — especially for brand-name machines. You get 50% of fair market resale value (when applicable) credited toward your bill. Many customers are surprised how much their old Peloton or Bowflex is actually worth.",
    ideal: ["Homeowners", "Gym Owners", "Movers", "Upgraders"],
    category: "item-specific",
  },
  {
    slug: "piano-removal",
    title: "Piano Removal",
    subtitle: "Uprights, Grands & Baby Grands",
    description: "Pianos require specialized handling. We safely remove pianos of all sizes and credit you if the instrument has resale value.",
    longDescription: "Piano removal is one of the most challenging junk removal tasks — uprights can weigh 500+ lbs and grand pianos over 1,000 lbs. Our crews are trained in safe piano moving techniques to protect your floors, walls, and doorways. Working pianos in good condition often have significant resale value, and you get 50% credited to your bill. Even non-functional pianos are properly disposed of as part of your hourly rate.",
    ideal: ["Homeowners", "Churches", "Schools", "Estate Managers"],
    category: "item-specific",
  },
  {
    slug: "tire-removal",
    title: "Tire Removal",
    subtitle: "Car, Truck, Motorcycle & More",
    description: "Tires are one of the hardest items to dispose of on your own. We haul them as part of your hourly rate — dump fees included.",
    longDescription: "Most dumps and transfer stations charge extra for tires, and many won't accept them at all. We haul tires of all types — car, truck, motorcycle, bicycle, tractor, and ATV — as part of your hourly rate with disposal fees included. Whether you have 4 tires or 40, we load them up and handle proper disposal through licensed tire recycling facilities.",
    ideal: ["Auto Shops", "Homeowners", "Farms", "Dealerships"],
    category: "item-specific",
  },
  {
    slug: "hot-tub-removal",
    title: "Hot Tub & Spa Removal",
    subtitle: "Full Demolition & Haul-Away",
    description: "We disassemble and remove hot tubs, spas, and above-ground pools. Includes demolition, loading, hauling, and disposal.",
    longDescription: "Hot tub removal requires demolition — cutting the shell into manageable pieces, disconnecting electrical and plumbing, and hauling away all components. Our crew handles the full process: demolition, loading, hauling, and disposal. All included in your hourly rate. Hot tub removal typically takes a 2-3 man crew 2-4 hours depending on size and access. No additional charges for demolition work.",
    ideal: ["Homeowners", "Property Flippers", "Realtors"],
    category: "item-specific",
  },
  {
    slug: "pool-table-removal",
    title: "Pool Table Removal",
    subtitle: "Disassembly & Haul-Away",
    description: "Pool tables are extremely heavy and require disassembly. We break them down, haul them out, and credit you if they have resale value.",
    longDescription: "Pool tables can weigh 700-1,000+ lbs and require careful disassembly — removing the felt, rails, slate, and frame separately. Our crew handles full disassembly and removal. Quality pool tables (solid slate, brand-name) often have strong resale value, and you get 50% credited toward your bill. Even tables past their prime are fully removed as part of your hourly rate.",
    ideal: ["Homeowners", "Bars", "Game Rooms", "Movers"],
    category: "item-specific",
  },

  // STRUCTURE REMOVAL
  {
    slug: "shed-removal",
    title: "Shed & Playhouse Removal",
    subtitle: "Full Demolition & Haul-Away",
    description: "Old sheds and playhouses demolished and removed completely. Hourly rate includes demolition, loading, hauling, and dump fees.",
    longDescription: "Whether it's a rotting garden shed, an old playhouse the kids outgrew, or a storage building that's seen better days — we demo it, load it, and haul it away. Our crew handles full demolition including walls, roof, floor, and foundation. Everything is loaded and disposed of as part of your hourly rate with dump fees included. We leave the ground clear and clean.",
    ideal: ["Homeowners", "Property Flippers", "Realtors"],
    category: "structure",
  },
  {
    slug: "fence-removal",
    title: "Fence Removal",
    subtitle: "Wood, Chain Link, Vinyl & More",
    description: "Old fences torn down and hauled away. All types — wood, chain link, vinyl, wrought iron. Hourly rate covers everything.",
    longDescription: "We remove fences of all types — wood privacy fences, chain link, vinyl, wrought iron, and split rail. Our crew handles full removal including posts (pulled or cut at ground level per your preference), rails, panels, and hardware. Everything is loaded and hauled as part of your hourly rate. Wrought iron and metal fencing often has scrap value, earning you resale credit.",
    ideal: ["Homeowners", "Contractors", "Property Managers"],
    category: "structure",
  },
  {
    slug: "deck-removal",
    title: "Deck Removal",
    subtitle: "Full Demolition & Disposal",
    description: "Old decks demolished and hauled away completely. Includes full tear-down, loading, hauling, and dump fees in the hourly rate.",
    longDescription: "Deck removal involves full demolition — tearing up decking boards, removing railings and stairs, pulling support posts, and hauling away all debris. Our crew handles the entire process from start to finish. All lumber, hardware, and debris is loaded and disposed of as part of your hourly rate. Deck removal typically requires a 2-3 man crew depending on deck size and construction.",
    ideal: ["Homeowners", "Contractors", "Property Flippers"],
    category: "structure",
  },
  {
    slug: "trampoline-removal",
    title: "Trampoline Removal",
    subtitle: "Disassembly & Haul-Away",
    description: "Old trampolines disassembled and removed. Frame, mat, springs, enclosure — all hauled as part of your hourly rate.",
    longDescription: "Trampolines are bulky and awkward to dispose of — the frame, springs, mat, and safety enclosure all need to be disassembled and removed separately. Our crew handles full disassembly, loading, and hauling as part of your hourly rate with dump fees included. Metal frames have scrap value and may earn you a small resale credit.",
    ideal: ["Homeowners", "Property Managers"],
    category: "structure",
  },

  // CONSTRUCTION & YARD
  {
    slug: "construction-debris-removal",
    title: "Construction Debris Removal",
    subtitle: "Post-Renovation & Jobsite Cleanup",
    description: "Drywall, lumber, concrete, tiles — we remove all types of construction and renovation debris. Flat hourly rate, dump fees included.",
    longDescription: "Construction and renovation projects generate massive amounts of debris — drywall, lumber, concrete, tile, roofing materials, old fixtures, and general jobsite waste. We haul all of it as part of your hourly rate with dump fees included. Our crews work around active jobsites and can schedule recurring pickups for ongoing projects. No need to rent a dumpster — we show up, load, and haul.",
    ideal: ["Contractors", "Renovators", "DIYers", "Builders"],
    category: "specialty",
  },
  {
    slug: "renovation-waste-removal",
    title: "Renovation Waste Removal",
    subtitle: "Kitchen, Bath & Whole-Home Reno Debris",
    description: "Cabinets, countertops, fixtures, flooring, drywall — all renovation waste hauled at our hourly rate with dump fees included.",
    longDescription: "Home renovations produce a specific type of debris — old cabinets, countertops, fixtures, flooring, drywall, plumbing, and electrical components. We remove all renovation waste as part of your hourly rate. Old cabinets, fixtures, and countertops in good condition often have resale value (especially solid wood or stone), earning you 50% credit. We work with your renovation timeline and can do multiple pickups as demo progresses.",
    ideal: ["Homeowners", "Contractors", "Designers", "Flippers"],
    category: "specialty",
  },
  {
    slug: "yard-waste-removal",
    title: "Yard Waste Removal",
    subtitle: "Branches, Soil, Landscaping Debris",
    description: "Fallen branches, old mulch, dirt piles, fence panels — we haul away all types of yard and landscaping waste. Simple hourly rate.",
    longDescription: "Yard waste includes fallen branches, tree limbs, leaves, old mulch, dirt and soil, sod, fence panels, landscaping timbers, and storm debris. We haul all of it as part of your hourly rate with dump fees included. Whether it's a weekend cleanup or storm damage aftermath, our crew loads everything and leaves your yard clean. Large tree trunk sections and firewood may have resale value.",
    ideal: ["Homeowners", "Landscapers", "Property Managers"],
    category: "specialty",
  },
  {
    slug: "carpet-flooring-removal",
    title: "Carpet & Flooring Removal",
    subtitle: "Carpet, Tile, Hardwood & Laminate",
    description: "Old flooring ripped up and hauled away. We handle carpet, tile, hardwood, laminate, and vinyl — all part of the hourly rate.",
    longDescription: "We rip up and haul away old carpet, carpet padding, tile, hardwood, laminate, and vinyl flooring. Our crew handles the full process — pulling up the flooring, removing tack strips and adhesive where possible, and loading all debris for disposal. Everything is included in your hourly rate with dump fees. Hardwood flooring in good condition often has strong resale value, earning you 50% credit.",
    ideal: ["Homeowners", "Renovators", "Landlords", "Flippers"],
    category: "specialty",
  },
  {
    slug: "scrap-metal-removal",
    title: "Scrap Metal Removal",
    subtitle: "Steel, Aluminum, Copper & More",
    description: "Scrap metal has real value. We haul it and credit you 50% (when applicable) of the scrap/resale value — metal removal often significantly reduces your bill.",
    longDescription: "Scrap metal is one of the highest-value categories we encounter. Steel, aluminum, copper, brass, iron — all have active scrap markets with real dollar value. We haul all types of scrap metal as part of your hourly rate and credit you 50% (when applicable) of scrap value toward your bill. Copper wire and pipe, aluminum siding, steel beams, old appliances with metal frames — it all adds up. Metal-heavy jobs frequently result in very low bills or even a payout.",
    ideal: ["Contractors", "Homeowners", "Plumbers", "Electricians"],
    category: "specialty",
  },

  // COMMERCIAL
  {
    slug: "office-cleanouts",
    title: "Office & Commercial Cleanouts",
    subtitle: "Desks, Cubicles, Equipment & More",
    description: "Office furniture and electronics hold serious resale value. We credit you 50% (when applicable) of fair market value on every item we can resell.",
    longDescription: "Office cleanouts are one of the best scenarios for our credit model. Herman Miller chairs, standing desks, monitors, printers, conference tables, filing cabinets — commercial furniture and electronics have strong resale markets. We clear entire offices and credit you 50% (when applicable) of resale value (when applicable) on everything we can resell. Large office cleanouts frequently result in credits that cover the entire bill and then some.",
    ideal: ["Businesses", "Office Managers", "Commercial Tenants"],
    category: "commercial",
  },
  {
    slug: "foreclosure-cleanouts",
    title: "Foreclosure & Eviction Cleanouts",
    subtitle: "Fast Turnaround for Property Managers",
    description: "Need a property cleared fast? We handle it with speed. Valuable items left behind get appraised and credited toward your bill.",
    longDescription: "When a property needs to be cleared for resale or new tenants, speed matters. We provide fast-turnaround cleanouts for foreclosures, evictions, and abandoned properties. Items left behind by previous occupants often include furniture, appliances, and electronics with real resale value — all of which earn you 50% credit toward the bill. We work with banks, property managers, and realtors to get properties market-ready fast.",
    ideal: ["Banks", "Property Managers", "Realtors"],
    category: "commercial",
  },
  {
    slug: "retail-cleanouts",
    title: "Retail & Store Cleanouts",
    subtitle: "Shelving, Fixtures, Inventory & More",
    description: "Closing or remodeling a retail space? We clear shelving, fixtures, signage, and inventory. Display fixtures with value earn you credit.",
    longDescription: "Retail closures and remodels generate large volumes of shelving, display fixtures, signage, point-of-sale equipment, and remaining inventory. We clear everything as part of your hourly rate. Commercial display fixtures, shelving systems, and retail equipment often have strong resale value in the secondary market — you get 50% credit for everything we can resell.",
    ideal: ["Retailers", "Franchises", "Mall Managers", "Liquidators"],
    category: "commercial",
  },
  {
    slug: "warehouse-cleanouts",
    title: "Warehouse Cleanouts",
    subtitle: "Large-Scale Industrial Clearing",
    description: "Old equipment, pallets, racking, scrap — we bring the trucks and manpower for warehouses of any size. Hourly rate, dump fees included.",
    longDescription: "Warehouse cleanouts require serious manpower and truck capacity. We handle old equipment, pallet racking, shelving systems, pallets, scrap materials, and general warehouse debris. Our our crews tackle large-scale jobs efficiently. Pallet racking, industrial equipment, and scrap metal often carry significant resale and scrap value — earning you substantial credits toward the bill.",
    ideal: ["Warehouse Managers", "Businesses", "Landlords", "Liquidators"],
    category: "commercial",
  },
  {
    slug: "hotel-cleanouts",
    title: "Hotel & Hospitality Cleanouts",
    subtitle: "Furniture, Fixtures & Equipment Removal",
    description: "Mattresses, furniture, fixtures from hotels and vacation rentals. Bulk furniture in good condition earns significant credits.",
    longDescription: "Hotels, motels, and vacation rentals cycle through furniture, mattresses, and fixtures regularly. We handle bulk removal of beds, dressers, desks, chairs, TVs, mini-fridges, and general FF&E (furniture, fixtures, and equipment). Hotel furniture in good condition has active resale markets — especially commercial-grade pieces. We offer discreet off-hours service to minimize guest disruption.",
    ideal: ["Hotels", "Motels", "Vacation Rentals", "Resort Managers"],
    category: "commercial",
  },
  {
    slug: "property-management-cleanouts",
    title: "Property Management Cleanouts",
    subtitle: "Tenant Turnovers & Ongoing Service",
    description: "Recurring cleanout service for property managers. Fast tenant turnovers with credits on valuable items left behind.",
    longDescription: "Property managers deal with tenant turnovers constantly — left-behind furniture, appliances, personal belongings, and general trash. We provide fast-turnaround cleanouts to get units market-ready. Recurring clients get priority scheduling and consistent crew assignments. Items left behind by tenants often include furniture and appliances with real resale value, reducing your per-unit cleanout costs.",
    ideal: ["Property Managers", "Landlords", "HOAs", "Real Estate Companies"],
    category: "commercial",
  },
  {
    slug: "church-nonprofit-cleanouts",
    title: "Church & Nonprofit Cleanouts",
    subtitle: "Pews, Furniture, Equipment & Donations",
    description: "We handle cleanouts for churches, nonprofits, and community organizations with care. Donated items earn credit too.",
    longDescription: "Churches, nonprofits, and community organizations accumulate furniture, equipment, and supplies over decades. When it's time to renovate, relocate, or downsize, we handle the full cleanout. Church pews, commercial kitchen equipment, office furniture, and AV equipment often have significant resale value. We work respectfully with congregations and organizations to clear spaces efficiently.",
    ideal: ["Churches", "Nonprofits", "Community Centers", "Schools"],
    category: "commercial",
  },
  {
    slug: "school-university-cleanouts",
    title: "School & University Cleanouts",
    subtitle: "Desks, Lab Equipment, Dorm Furniture & More",
    description: "End-of-year cleanouts, renovations, or closures. School furniture and equipment frequently earns significant resale credit.",
    longDescription: "Schools and universities generate large cleanout needs — end-of-year dorm furniture, classroom desks and chairs, lab equipment, cafeteria furniture, IT equipment, and more. We handle cleanouts of any scale. Institutional furniture, lab equipment, and electronics have active resale markets. We coordinate with facilities teams to work around academic schedules and minimize disruption.",
    ideal: ["Schools", "Universities", "Districts", "Facilities Managers"],
    category: "commercial",
  },
];

export const SERVICE_CATEGORIES = {
  residential: { label: "Residential Cleanouts", description: "Full home, garage, basement, attic, estate, and storage cleanouts" },
  "item-specific": { label: "Item-Specific Removal", description: "Individual item pickup — furniture, appliances, electronics, and specialty items" },
  structure: { label: "Structure Removal", description: "Sheds, fences, decks, trampolines, and other outdoor structures" },
  specialty: { label: "Construction & Specialty", description: "Construction debris, renovation waste, yard waste, and scrap metal" },
  commercial: { label: "Commercial Services", description: "Offices, warehouses, retail, hotels, schools, and property management" },
} as const;
