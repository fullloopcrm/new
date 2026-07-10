export interface Service {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  longDescription: string;
  ideal: string[];
  category: "emergency" | "roadside" | "specialty" | "heavy-duty" | "commercial";
  image?: string;
}

/** Generate extended SEO content for a service page (~1500 words) */
export function getExtendedContent(service: Service): string[] {
  const t = service.title;
  const tl = service.title.toLowerCase();
  const cat = SERVICE_CATEGORIES[service.category];
  return [
    `${t} is one of the ${SERVICES.length} dispatch-ready services offered by Toll Trucks Near Me nationwide. As part of our ${cat.label.toLowerCase()} service category, ${tl} is engineered for the specific vehicle classes, roadway conditions, and recovery challenges that drivers encounter in this scenario. Unlike general towing companies that send whatever truck is closest, our ${tl} dispatches are equipment-matched the first time — flatbed, wheel-lift, medium wrecker, or heavy wrecker — which means faster arrival, safer loading, and zero repeat trips.`,

    `Demand for professional ${tl} has grown significantly as vehicles become more complex. Modern AWD systems, low-clearance sports cars, electric vehicles with regenerative drivetrains, and semi-autonomous driver-assist packages all make improper towing an expensive mistake. A single chain-and-hook tow on the wrong vehicle can destroy a $4,000 transmission or short a hybrid traction battery. Our ${tl} protocols are built around manufacturer guidance — we move your vehicle the way the OEM says to move it, every time.`,

    `What sets our ${tl} service apart is transparent upfront pricing. Traditional tow operators quote a low base rate on the phone and then stack on mileage surcharges, hookup fees, after-hours premiums, dolly fees, winch fees, and storage charges when the truck arrives. Our dispatchers quote the full number before a truck rolls: hookup plus per-mile. That is the number on the invoice. No line-item surprises. No predatory storage yards. Just the agreed price for the ${tl} service you requested.`,

    `The ${tl} process begins the second you call. Our dispatcher captures your location (GPS-assist available if you text a link), your vehicle year/make/model, the nature of the issue, and any access constraints — low garage, muddy shoulder, multi-level parking deck, guardrail, center median. This information determines which truck we send. You receive a firm quote, a driver name, a truck number, and a live ETA — texted to your phone in under 60 seconds from the time you hang up.`,

    `On arrival, your ${tl} driver does a pre-load walk-around with you. Any existing damage is photographed. Fluid leaks are noted. Personal belongings are confirmed. The driver explains the loading sequence so you know exactly what is about to happen. If anything about your ${tl} situation has changed since you called — a different destination, an additional passenger, a second vehicle — we adjust on the spot and recalculate the quote transparently before hooking up.`,

    `During the ${tl} service, you are welcome to ride along in most cases (space permitting), or arrange your own transportation to meet the truck at the destination. Our drivers communicate throughout: hookup complete, leaving the scene, arriving at the drop, unloading complete. Every step is logged in our dispatch system so you can pull up the full timeline later if your insurance or employer needs it.`,

    `After drop-off on your ${tl} job, the driver presents a clean, itemized invoice — hookup, mileage, any specialty equipment, and applicable taxes. Payment is accepted on the spot: credit/debit, contactless (Apple Pay / Google Pay), corporate accounts, and insurance direct-bill for supported carriers. Paper and emailed receipts are both provided. Commercial accounts with net-30 terms can skip payment entirely and receive a monthly statement.`,

    `The ideal customers for our ${tl} service are ${service.ideal.join(", ").toLowerCase()}. Each of these customer types has specific needs that our ${tl} service addresses. Drivers need speed and safety; fleet managers need consistency and clean paperwork; insurance carriers need compliant documentation; law enforcement needs rapid clearance of travel lanes. Our ${tl} protocols are tuned to each of these audiences so the right priority is executed the first time.`,

    `We encourage anyone who needs ${tl} to call us at (888) 831-3001 at any hour. Our dispatchers are live 24/7/365 — no IVR trees, no voicemail, no overflow. If you want a quote before you commit, we will walk you through the number on the phone. If you are actively stranded, we dispatch the closest equipment-matched truck immediately and keep you on the line until the driver confirms eyes-on your vehicle.`,

    `Safety is a core priority on every ${tl} call. Our drivers are trained in Traffic Incident Management (TIM), high-speed shoulder recovery, dynamic cone deployment, and move-over-law compliance. Every truck carries retro-reflective triangles, road flares, absorbent for spilled fluids, and a rated winch. Our heavy wreckers carry air-cushion systems for rollover recovery. If your ${tl} scene is on a live freeway, our driver coordinates with state patrol or local PD before exiting the truck.`,

    `The economics of ${tl} with Toll Trucks Near Me consistently favor the customer. Against anonymous highway tow operators who charge $450+ for a 10-mile pull and $65/day storage, our flat structure saves most customers 30-50% on the final bill. Against AAA third-party dispatch — which often sends whoever is closest regardless of equipment — our direct-dispatch model arrives faster and with the right truck the first time. Against tow-yard predatory pricing after an accident, we refuse to participate: you pick the destination shop, not us.`,

    `Our ${tl} service is available in over 900 cities across all 50 states from 50 strategic dispatch offices. No matter where you break down in the United States — interstate, urban grid, rural two-lane, or gravel backroad — chances are we have a local operator who knows your area. Each office dispatches drivers who live and work in the communities they serve: they know the shoulders, the blind curves, the short-clearance bridges, the police non-emergency numbers, and the best body shops in town. We run 24/7, 365, including every holiday.`,

    `Scheduling a ${tl} call is designed for real life. Most of our volume is unplanned — people call because something went wrong. But we also handle scheduled tows: moving a project car to a shop, delivering an auction purchase, repositioning a fleet vehicle, relocating an RV to storage. Scheduled ${tl} calls can be booked up to 30 days in advance with guaranteed pickup windows. Same-day scheduled pickups are available in every market with 2-hour notice.`,

    `For customers who need recurring ${tl} service — dealerships, body shops, fleet managers, property managers with parking enforcement, rental car branches — we offer commercial accounts with dedicated dispatch, consistent drivers, and consolidated net-30 billing. Your recurring ${tl} operator learns your properties, your vehicle classes, your paperwork requirements, and your contact hierarchy. The result is smoother calls, tighter ETAs, and a single monthly invoice you can pass straight to accounting.`,

    `Customer satisfaction drives our ${tl} operation. We maintain a 5.0-star rating because we treat a $95 roadside call with the same professionalism as a $3,500 heavy-duty rollover recovery. Every driver wears branded uniforms, arrives in a numbered truck, and leaves the scene cleaner than they found it. If anything about your ${tl} experience falls short, we have a direct escalation line to a supervisor 24/7 and a no-debate refund policy on service failures we caused.`,
  ];
}

export const SERVICES: Service[] = [
  // EMERGENCY TOWING
  {
    slug: "emergency-towing",
    title: "Emergency Towing",
    subtitle: "24/7 Dispatch, 30-Minute Arrival Option",
    description: "Broken down, crashed, or stranded? We dispatch 24/7 with the right truck the first time. Standard 60-min arrival; Emergency Priority guarantees 30 min or $50 off.",
    longDescription: "Emergency towing is the core of what we do. When something goes wrong — mechanical failure, accident, weather event, dead battery on the shoulder at 2 AM — our 24/7 dispatchers answer live in under 3 rings. We match the truck to your vehicle (flatbed for low-clearance, wheel-lift for traditional tows) and send the closest operator. Standard service targets under 60 minutes on-scene; Emergency Priority guarantees 30 minutes or takes $50 off the bill automatically.",
    ideal: ["Drivers", "Commuters", "Road Trip Travelers", "Rideshare Drivers"],
    category: "emergency",
    image: "emergency-night",
  },
  {
    slug: "flatbed-towing",
    title: "Flatbed Towing",
    subtitle: "All-Wheel-Drive & Low-Clearance Safe",
    description: "The safest way to move modern vehicles. AWD, sports cars, luxury cars, EVs — flatbed is the correct tool and it's our default for most tows.",
    longDescription: "Flatbed towing is the OEM-recommended method for all-wheel-drive vehicles, most luxury cars, sports cars with low ground clearance, EVs with regenerative drivetrains, and any vehicle that cannot safely travel with two wheels on the ground. Our flatbeds use soft straps (never chain-and-hook on the body), integrated tie-down points, and powered tilt decks. First choice for any tow that isn't constrained by space or weight.",
    ideal: ["AWD Owners", "Luxury Car Owners", "EV Drivers", "Sports Car Owners"],
    category: "emergency",
    image: "flatbed-tow",
  },
  {
    slug: "wheel-lift-towing",
    title: "Wheel-Lift Towing",
    subtitle: "Tight Spaces, Quick Hookups",
    description: "For driveways, parking decks, and alleys where a flatbed won't fit. Fast hookup, small footprint, safe for most 2WD vehicles.",
    longDescription: "Wheel-lift is the right tool when a flatbed physically cannot access the vehicle — underground parking decks with 6'6\" clearance, narrow urban alleys, tight driveways, or tandem-parked rows. Our wheel-lift trucks use a hydraulic yoke that cradles the drive wheels. Hookup takes under 3 minutes. Appropriate for most front-wheel-drive and rear-wheel-drive vehicles, never for AWD.",
    ideal: ["Urban Drivers", "Apartment Residents", "Parking Garage Users"],
    category: "emergency",
    image: "city-tow",
  },
  {
    slug: "long-distance-towing",
    title: "Long-Distance Towing",
    subtitle: "Cross-State & Cross-Country Transport",
    description: "Moving a car more than 100 miles? We offer flat-rate long-distance tows with tracking, enclosed options, and door-to-door delivery.",
    longDescription: "Long-distance towing covers cross-state and cross-country vehicle transport. We use a flat per-mile rate with no hourly games or 'driver time' add-ons. Enclosed transport available for classics, exotics, and high-value vehicles. Door-to-door delivery with live GPS tracking. Typical turnaround: 1-3 days for same-region, 5-8 days coast-to-coast. Ideal for relocations, online car purchases, and snowbird seasonal moves.",
    ideal: ["Movers", "Online Car Buyers", "Snowbirds", "Dealerships"],
    category: "specialty",
    image: "classic-car",
  },
  {
    slug: "motorcycle-towing",
    title: "Motorcycle Towing",
    subtitle: "Soft-Strap Safe for Every Bike",
    description: "Sport bikes, cruisers, touring, dirt — every bike moves on a dedicated motorcycle-rated flatbed with soft ties and wheel chocks.",
    longDescription: "Motorcycle towing requires specialized equipment: proper wheel chocks, soft canyon straps that won't damage fairings, and a driver who knows not to strap through the bars. We use dedicated motorcycle-trailer flatbeds or standard flatbeds with proper moto chocks. Every major bike type — sportbikes, cruisers, baggers, adventure, dirt, scooters — handled correctly. Ride-along space usually available so you're not stranded.",
    ideal: ["Motorcyclists", "Riders", "Bike Shops", "Track Day Riders"],
    category: "specialty",
    image: "motorcycle-tow",
  },
  {
    slug: "heavy-duty-towing",
    title: "Heavy-Duty Towing",
    subtitle: "Semis, Buses, RVs & Commercial Trucks",
    description: "Class 7 and Class 8 wreckers for tractor-trailers, RVs, buses, and box trucks. Rotators, air cushions, and certified heavy operators.",
    longDescription: "Heavy-duty towing is a specialty discipline requiring specialized equipment and certified operators. Our heavy fleet includes 50-ton and 75-ton wreckers, rotators for load-shift recovery, and air-cushion systems for rollover uprighting. We tow fully-loaded semis, motorcoaches, school buses, Class A RVs, box trucks, refuse vehicles, and construction equipment. Every heavy operator carries WreckMaster or TRAA certification.",
    ideal: ["Truckers", "Fleet Managers", "Bus Operators", "RV Owners"],
    category: "heavy-duty",
    image: "heavy-duty-tow",
  },
  {
    slug: "medium-duty-towing",
    title: "Medium-Duty Towing",
    subtitle: "Work Trucks, Cargo Vans, Box Trucks",
    description: "Between light-duty and heavy: cargo vans, box trucks up to 26,000 lbs GVWR, landscape rigs, service trucks. Right-sized wrecker every time.",
    longDescription: "Medium-duty covers the gap between a standard flatbed and a full heavy wrecker. Typical medium-duty tows include cargo vans (Sprinter, Transit, ProMaster), box trucks up to 26,000 lbs GVWR, landscape/utility bed pickups loaded with equipment, stake-beds, and small dumps. Our medium-duty fleet handles these without risk of overloading a light-duty flatbed or tying up a heavy wrecker meant for semis.",
    ideal: ["Contractors", "Delivery Fleets", "Landscapers", "Small Business Owners"],
    category: "heavy-duty",
    image: "fleet",
  },
  {
    slug: "accident-recovery",
    title: "Accident Recovery",
    subtitle: "Crash Scene Clearance & Documentation",
    description: "Post-collision towing with law-enforcement coordination, insurance-ready paperwork, and destination control — YOU pick the shop, not us.",
    longDescription: "Accident recovery is more than just towing the wreck. Our drivers are trained in Traffic Incident Management — working with police and fire to clear travel lanes quickly and safely. We photograph the scene, note vehicle damage for your insurance claim, collect personal belongings, and tow to YOUR chosen body shop (not a predatory tow-yard we profit from). Every accident recovery generates a full incident report you can forward straight to your adjuster.",
    ideal: ["Drivers", "Insurance Adjusters", "Accident Victims", "Law Enforcement"],
    category: "emergency",
    image: "roadside-assistance",
  },
  {
    slug: "winch-out-service",
    title: "Winch-Out Service",
    subtitle: "Mud, Snow, Ditch & Sand Extraction",
    description: "Stuck in mud, snow, a ditch, or soft sand? We winch you out with rated recovery equipment — no damage, no drama.",
    longDescription: "Winch-out service recovers vehicles that are not towable because they aren't stuck — they're stuck. Muddy driveways, snowbank-ploughed curbsides, ditch rollovers, soft-sand beach access, bogged construction sites. Our trucks carry hydraulic winches rated from 8,000 to 50,000 lbs depending on vehicle class, plus tree-saver straps, snatch blocks, and recovery rigging to pull in the correct line without damaging your vehicle or property.",
    ideal: ["Drivers", "Off-Roaders", "Contractors", "Farmers"],
    category: "specialty",
    image: "winch-out",
  },
  {
    slug: "off-road-recovery",
    title: "Off-Road Recovery",
    subtitle: "Trail, Backcountry & Remote Extractions",
    description: "Dropped a wheel off the trail? Rolled on a forest road? We bring 4WD-capable recovery trucks and certified off-road operators.",
    longDescription: "Off-road recovery goes beyond standard winch-out. When a vehicle is stuck miles into a trail system, below a cliff band, in a creek crossing, or at the bottom of a scree field — we dispatch 4WD-capable recovery rigs with certified operators. Extended winch lines, block-and-tackle rigging, and in some markets, coordination with helicopter lift services for the most extreme extractions. Not cheap, but available when nothing else is.",
    ideal: ["Overlanders", "Off-Roaders", "Forest Service", "Search & Rescue"],
    category: "specialty",
    image: "winch-out",
  },

  // ROADSIDE ASSISTANCE
  {
    slug: "jump-start-service",
    title: "Jump Start Service",
    subtitle: "Dead Battery, Fast Revive — $75 Flat",
    description: "Dead battery? We arrive with a commercial-grade jump pack and have you running in minutes. $75 flat, most visits under 20 minutes.",
    longDescription: "Jump start service handles the #1 roadside call: dead battery. We arrive with commercial-grade lithium jump packs rated for up to 12,000 amps of peak current — safe for modern vehicles with sensitive ECUs. Most visits resolve in under 20 minutes. If your battery fails to hold a charge, we can test it on-site and replace it from truck stock (common sizes) or arrange a tow to a parts store.",
    ideal: ["Drivers", "Commuters", "Parking Lot Victims"],
    category: "roadside",
    image: "jump-start",
  },
  {
    slug: "flat-tire-change",
    title: "Flat Tire Change",
    subtitle: "Swap to Your Spare in Under 20 Minutes",
    description: "Got a spare? We'll swap it for you. No spare? We'll tow you to the nearest tire shop. $75 flat for the change.",
    longDescription: "Flat tire change swaps your flat for your spare — whether that's a full-size, compact donut, or inflatable kit. We bring the torque wrench, the breaker bar, and the muscle. Under 20 minutes in most cases. If you don't have a spare, or your vehicle uses run-flats and you've exceeded the run-flat range, we tow you to the nearest tire shop at standard light-duty rates.",
    ideal: ["Drivers", "Commuters", "Elderly Motorists", "Anyone in a Skirt"],
    category: "roadside",
    image: "tire-change",
  },
  {
    slug: "fuel-delivery",
    title: "Fuel Delivery",
    subtitle: "Gas or Diesel — Enough to Get You to a Station",
    description: "Ran out of gas? We bring 2-5 gallons of gas or diesel right to you. $75 flat includes the fuel and the delivery.",
    longDescription: "Fuel delivery gets you back on the road when you run dry. We bring 2-5 gallons of regular gasoline or diesel — enough to get you to the nearest station, not a full tank. $75 flat covers the delivery and the fuel. If you've run out of an uncommon fuel (E85, DEF, race gas), call first so we can confirm availability before dispatching.",
    ideal: ["Drivers", "Long-Haul Commuters", "Rural Travelers"],
    category: "roadside",
    image: "fuel-delivery",
  },
  {
    slug: "lockout-service",
    title: "Lockout Service",
    subtitle: "Locked Out? We're In Inside 10 Minutes",
    description: "Keys locked in the car? We'll get you back in without damaging the door, window, or lock. $75 flat, no mechanic needed.",
    longDescription: "Lockout service opens your locked vehicle without damage. Our technicians use professional-grade wedge and long-reach tools for most vehicles. For vehicles with deadbolt-style door locks or smart-key systems requiring additional verification, we can coordinate with a locksmith. Standard vehicle lockouts are $75 flat and usually resolved in under 10 minutes on-site.",
    ideal: ["Drivers", "Parents of Toddlers", "Absent-Minded Professors"],
    category: "roadside",
    image: "lockout",
  },
  {
    slug: "battery-replacement",
    title: "Mobile Battery Replacement",
    subtitle: "Dead Battery, Swapped On-Site",
    description: "Battery won't hold a charge? We'll test it, replace it with a new one from truck stock, and recycle the old one — no tow needed.",
    longDescription: "Mobile battery replacement handles the cases where a jump start isn't enough because the battery itself is toast. We carry the most common Group 24, 35, 48, and 65 batteries in truck stock. On-site test with a load tester confirms the battery is dead. Swap takes 10 minutes. Old battery is recycled at no cost to you. Price varies by battery size — quoted on the phone before we dispatch.",
    ideal: ["Drivers", "Commuters", "Fleet Vehicles"],
    category: "roadside",
    image: "mechanic",
  },

  // SPECIALTY TOWING
  {
    slug: "luxury-exotic-towing",
    title: "Luxury & Exotic Car Towing",
    subtitle: "Soft-Strap Flatbeds & Enclosed Transport",
    description: "Ferrari, Lamborghini, Porsche, McLaren — or just a low-clearance performance car. Soft-strap flatbeds and enclosed transport available.",
    longDescription: "Luxury and exotic car towing uses specialized equipment: soft-strap (not chain-hook) tie-downs, powered tilt decks with low approach angles for sub-4\" ground clearance, and for high-value vehicles, fully enclosed transport. We are insured to transport high-value vehicles up to $500,000 per load without additional rider policies. Preferred by dealerships, restoration shops, and private collectors.",
    ideal: ["Collectors", "Dealerships", "Restorers", "Track Day Enthusiasts"],
    category: "specialty",
    image: "classic-car",
  },
  {
    slug: "classic-car-transport",
    title: "Classic Car Transport",
    subtitle: "Barn Finds to Concours — Moved With Care",
    description: "Vintage, antique, and barn-find vehicles transported with the care they deserve. Non-running classics are our specialty.",
    longDescription: "Classic car transport handles vehicles ranging from daily-driver vintage to concours-restored showpieces. Non-running classics — which most exotics are, at least until after restoration — require extra care to load: winching without damaging body panels, protecting fragile trim, and for very old vehicles, loading without cranking them over. Our classic drivers have experience with pre-war vehicles, muscle cars, European touring classics, and barn-find recoveries.",
    ideal: ["Collectors", "Restorers", "Auction Buyers", "Estate Managers"],
    category: "specialty",
    image: "classic-car",
  },
  {
    slug: "rv-motorhome-towing",
    title: "RV & Motorhome Towing",
    subtitle: "Class A, B, and C Recreational Vehicles",
    description: "Broken down RV? We tow Class A, B, and C motorhomes with the right heavy-duty equipment. Fifth-wheels and travel trailers also handled.",
    longDescription: "RV and motorhome towing requires heavy-duty equipment and drivers familiar with recreational vehicle dimensions and systems. Class A motorhomes often need a 35-50 ton wrecker. Class B and C handled by medium-duty units. Fifth-wheel and travel trailer towing requires a truck with a matching hitch. We confirm weight, length, and coupling type before dispatching to make sure the right truck rolls first.",
    ideal: ["RV Owners", "Snowbirds", "RV Dealerships", "Campground Managers"],
    category: "heavy-duty",
    image: "rv-towing",
  },
  {
    slug: "boat-trailer-towing",
    title: "Boat & Trailer Towing",
    subtitle: "Ramp Recoveries, Broken Trailers, Stranded Rigs",
    description: "Trailer broke at the ramp? Blown bearing on I-95? We tow boats on their own trailers or load boat-plus-trailer on a heavy flatbed.",
    longDescription: "Boat and trailer towing covers a few distinct scenarios: towing a boat on a working trailer when the tow vehicle fails; towing a broken trailer (blown bearing, shredded tire, axle failure) when the boat itself is fine; and loading boat-plus-trailer onto our flatbed when both are disabled. We are familiar with fishing boats, bowriders, pontoons, cuddy cabins, and small cruisers up to typical trailerable sizes.",
    ideal: ["Boaters", "Marina Owners", "Fishing Tournament Drivers"],
    category: "specialty",
    image: "rv-towing",
  },
  {
    slug: "equipment-transport",
    title: "Construction Equipment Transport",
    subtitle: "Skid Steers, Mini-Excavators, Lifts",
    description: "Move your equipment between job sites. Skid steers, mini-excavators, scissor lifts, and light construction gear transported on heavy flatbeds.",
    longDescription: "Construction equipment transport moves your rolling and tracked equipment between job sites, to the shop, or to auction. We handle skid steers, mini-excavators up to 10,000 lbs, scissor lifts, boom lifts, compactors, welding rigs, and light-tower generators. For equipment above 10,000 lbs or with permit-requiring dimensions, we coordinate with specialized heavy haulers.",
    ideal: ["Contractors", "Equipment Rental Shops", "Construction Fleets"],
    category: "heavy-duty",
    image: "heavy-duty-tow",
  },
  {
    slug: "impound-towing",
    title: "Impound & Private-Property Towing",
    subtitle: "Authorized Removal of Illegally Parked Vehicles",
    description: "Property managers: we remove trespassing vehicles from parking lots, fire lanes, and restricted areas in full compliance with state notification laws.",
    longDescription: "Impound and private-property towing removes unauthorized vehicles from parking lots, fire lanes, handicap spaces occupied without permit, and other restricted areas. We follow every state's notification and photographic evidence requirements, post state-required signage consultation, maintain DMV-grade chain-of-custody, and deliver to licensed storage yards with owner notification. Property managers with recurring needs get a dedicated dispatch line and net-30 billing.",
    ideal: ["Property Managers", "HOAs", "Shopping Centers", "Apartment Complexes"],
    category: "commercial",
    image: "city-tow",
  },
  {
    slug: "repossession-towing",
    title: "Repossession Towing",
    subtitle: "Licensed Recovery for Lenders & Financial Institutions",
    description: "Credit unions, banks, and buy-here-pay-here lots: fully licensed vehicle recovery with DMV-compliant documentation and secure storage.",
    longDescription: "Repossession towing is a licensed discipline separate from general towing. Our repo operators hold state-required recovery agent licenses, carry dedicated repo insurance, and follow breach-of-peace protocols. We recover from driveways, workplaces, and public lots; maintain full chain-of-custody documentation; and deliver to secure fenced storage with lender-specified retrieval protocols.",
    ideal: ["Credit Unions", "Auto Lenders", "Buy-Here-Pay-Here Dealers"],
    category: "commercial",
    image: "city-tow",
  },

  // COMMERCIAL & FLEET
  {
    slug: "fleet-vehicle-towing",
    title: "Fleet Vehicle Towing",
    subtitle: "Net-30 Accounts, Dedicated Dispatch, Consolidated Billing",
    description: "Delivery fleets, service companies, rental car branches: one dispatch number, dedicated drivers, monthly consolidated billing.",
    longDescription: "Fleet vehicle towing is our commercial account program. Instead of your drivers paying and expensing, we set up a dedicated dispatch line, authorized caller list, and net-30 consolidated billing. Each tow generates a per-vehicle invoice with VIN, odometer at pickup, photographs, and destination — everything your fleet management software expects. Preferred rates for contracted volume; custom SLAs for high-availability fleets.",
    ideal: ["Delivery Fleets", "Service Companies", "Rental Car Branches", "Property Managers"],
    category: "commercial",
    image: "fleet",
  },
  {
    slug: "semi-truck-towing",
    title: "Semi-Truck Towing",
    subtitle: "Class 8 Recovery, Load-Shift Uprighting, 24/7",
    description: "Loaded semis, empty tractors, stranded trailers. 50-ton and 75-ton wreckers. Rollover recovery with air-cushion systems.",
    longDescription: "Semi-truck towing is the flagship of our heavy-duty operation. We run 50-ton and 75-ton wreckers plus rotators for load-shift recovery. Services include straight tractor-trailer tows, drop-deck recovery, rollover uprighting with air-cushion systems, load-transfer coordination, and coordination with state DOT for lane closures. Our heavy operators are WreckMaster certified and available 24/7 on every interstate we cover.",
    ideal: ["Trucking Companies", "Owner-Operators", "Logistics Coordinators"],
    category: "heavy-duty",
    image: "heavy-duty-tow",
  },
  {
    slug: "bus-towing",
    title: "Bus & Motorcoach Towing",
    subtitle: "School Buses, Transit, Motorcoaches, Minibuses",
    description: "School district buses, city transit, charter motorcoaches, airport shuttles. Heavy-duty towing with passenger-safety protocols.",
    longDescription: "Bus and motorcoach towing covers school district fleets, municipal transit, charter operators, and airport shuttle companies. When a bus breaks down with passengers aboard, our first priority is safe passenger transfer coordinated with the operator. After passengers are clear, we execute the tow with heavy-duty equipment matched to the bus class. We handle Blue Bird, Thomas Built, IC, MCI, Prevost, and most other major bus manufacturers.",
    ideal: ["School Districts", "Transit Authorities", "Charter Companies", "Shuttle Operators"],
    category: "heavy-duty",
    image: "heavy-duty-tow",
  },
  {
    slug: "dealership-transport",
    title: "Dealership & Auction Transport",
    subtitle: "Inventory Moves, Trade-Ins, Auction Buys",
    description: "Move dealer inventory between lots, ferry trade-ins from the appraisal station, deliver auction purchases, dispatch loaner swaps.",
    longDescription: "Dealership and auction transport handles the daily vehicle movement that keeps a dealership running: inventory swaps between rooftops, trade-in transport from remote appraisals, auction buy delivery, loaner car ferrying, service drop-off/pickup for high-value customers. Enclosed transport available for exotic and classic inventory. Single-point-of-contact dispatch plus consolidated monthly billing.",
    ideal: ["Dealerships", "Auction Houses", "Auto Brokers", "Wholesale Traders"],
    category: "commercial",
    image: "classic-car",
  },
  {
    slug: "body-shop-transport",
    title: "Body Shop & Collision Transport",
    subtitle: "Insurance Pickups, Total-Loss Tows, Parts Runs",
    description: "Body shops: we pick up insurance-approved tows, haul total-losses to salvage yards, and run urgent parts between shops.",
    longDescription: "Body shop and collision transport is a specialty commercial service. We coordinate with insurance carriers on authorized pickups, tow total-loss vehicles to insurer-designated salvage yards, and handle inter-shop parts runs for urgent repairs. Our drivers understand body shop paperwork (POE forms, BAR inspections in CA, titles of salvage) and can execute on carrier-specific protocols.",
    ideal: ["Body Shops", "Collision Centers", "Insurance Carriers", "Salvage Yards"],
    category: "commercial",
    image: "mechanic",
  },
  {
    slug: "junk-car-removal",
    title: "Junk Car Removal",
    subtitle: "Cash for Cars — We Pay, We Tow, We Title Out",
    description: "Got a vehicle that won't run and isn't worth fixing? We pay cash on the spot, haul it free, and handle the DMV paperwork.",
    longDescription: "Junk car removal pays you cash for end-of-life vehicles — no-starts, no-titles, accident totals, flood cars, scrap-value only. We give you a firm quote based on year/make/model/weight and current scrap metal prices. If you accept, we tow for free, pay cash on the spot (or ACH), and handle DMV notification-of-release paperwork. Your old junker leaves; your driveway returns to you.",
    ideal: ["Homeowners", "Estate Managers", "Property Managers", "Landlords"],
    category: "specialty",
    image: "winch-out",
  },
  {
    slug: "auction-transport",
    title: "Auction Vehicle Transport",
    subtitle: "Manheim, ADESA, Copart, IAA Pickups & Deliveries",
    description: "Bought at auction? We handle pickup, transport, and delivery from Manheim, ADESA, Copart, IAA, and regional auctions.",
    longDescription: "Auction vehicle transport handles pickup and delivery from major auction houses: Manheim, ADESA, Copart, IAA, and regional independents. We're familiar with auction check-out protocols, gate paperwork, and the specific loading requirements each yard imposes. Enclosed transport available for premium lanes. We also coordinate inter-auction transport for dealers operating across multiple venues.",
    ideal: ["Dealers", "Wholesale Buyers", "Individual Auction Buyers"],
    category: "commercial",
    image: "classic-car",
  },

  // SPECIALTY RECOVERY
  {
    slug: "rollover-recovery",
    title: "Rollover Recovery",
    subtitle: "Uprighting With Air-Cushion Systems",
    description: "Vehicle on its side or roof? Our heavy wreckers carry air-cushion uprighting systems for damage-minimized recovery.",
    longDescription: "Rollover recovery handles vehicles on their side or upside down — most commonly heavy commercial, RV, or bus rollovers, but also passenger vehicles when the scene demands care. Our heavy wreckers carry air-cushion systems that inflate under the rolled vehicle and lift it back onto its wheels without the additional body damage that chains or cables would cause. Particularly valuable for loaded commercial rollovers where load transfer is also required.",
    ideal: ["Drivers", "Fleet Managers", "Insurance Adjusters", "DOT Incident Responders"],
    category: "heavy-duty",
    image: "heavy-duty-tow",
  },
  {
    slug: "underwater-recovery",
    title: "Underwater Vehicle Recovery",
    subtitle: "Lakes, Ponds, Canals, Storm-Washed Scenes",
    description: "Vehicle in water? We coordinate with dive teams and deploy long-reach recovery equipment for submerged and partially-submerged vehicles.",
    longDescription: "Underwater vehicle recovery handles the rare-but-serious scenario of a vehicle in water — boat ramp slippage, lake-edge rollovers, storm-washed vehicles, intentional dumping. We coordinate with professional dive teams for rigging, then deploy long-reach heavy recovery equipment to retrieve. Most underwater recoveries also trigger EPA-compliant fluid containment (fuel, oil, coolant) to prevent environmental damage.",
    ideal: ["Emergency Services", "Insurance Carriers", "Law Enforcement"],
    category: "specialty",
    image: "winch-out",
  },
  {
    slug: "ditch-recovery",
    title: "Ditch & Embankment Recovery",
    subtitle: "Road-Departure Pulls With Winch Rigging",
    description: "Slid off in the snow? Ended up in the ditch? We rig winches, snatch blocks, and tree-savers for safe road-departure recovery.",
    longDescription: "Ditch and embankment recovery handles vehicles that have departed the roadway — weather slide-offs, distracted-driver runoffs, evasive maneuvers that end in a ditch. Proper rigging matters: pulling straight up a steep embankment with a single line can cause additional damage, while using a snatch block to change direction or a two-point pull can recover with zero additional damage. Our operators rig every pull to protect your vehicle.",
    ideal: ["Drivers", "Winter Commuters", "Rural Residents"],
    category: "specialty",
    image: "winch-out",
  },
  {
    slug: "parking-lot-assistance",
    title: "Parking Lot & Garage Assistance",
    subtitle: "Tight Spaces, Low Clearances, Drained Batteries",
    description: "Stuck in a parking garage? Dead in a shopping center? We use wheel-lift and low-clearance equipment for tight-space recoveries.",
    longDescription: "Parking lot and garage assistance handles the everyday breakdowns that happen in places a standard flatbed can't enter: underground parking decks with 6'6\" clearance, multi-level garages with tight ramps, shopping center lots packed with carts, and airport parking structures. We dispatch wheel-lift trucks or low-profile flatbeds rated for these spaces. Jump starts, tire changes, and lockouts also routinely handled.",
    ideal: ["Urban Drivers", "Apartment Residents", "Shopping Center Visitors"],
    category: "roadside",
    image: "city-tow",
  },
];

export const SERVICE_CATEGORIES = {
  emergency: { label: "Emergency Towing", description: "24/7 dispatch, flatbed & wheel-lift tows, accident recovery" },
  roadside: { label: "Roadside Assistance", description: "Jump starts, flat tires, lockouts, fuel delivery, mobile batteries" },
  "heavy-duty": { label: "Heavy-Duty Towing", description: "Semis, buses, RVs, construction equipment, Class 7/8 wreckers" },
  specialty: { label: "Specialty Transport", description: "Luxury, classic, off-road recovery, long-distance, underwater" },
  commercial: { label: "Commercial & Fleet", description: "Fleet accounts, impound, repossession, dealership, body shop transport" },
} as const;
