export interface Service {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  longDescription: string;
  ideal: string[];
  category: "emergency" | "lockout" | "fuel-power" | "recovery" | "specialty";
}

/** Generate extended SEO content for a service page (~1500 words) */
export function getExtendedContent(service: Service): string[] {
  const t = service.title;
  const tl = service.title.toLowerCase();
  const cat = SERVICE_CATEGORIES[service.category];
  return [
    `${t} is one of the ${SERVICES.length} roadside assistance services offered by The Roadside Helper nationwide. As part of our ${cat.label.toLowerCase()} service category, ${tl} is built around speed, transparent flat-rate pricing, and getting you back on the road safely. Unlike auto-club memberships that lock you into yearly fees you may never use, our service is pay-as-you-go: one flat $149/hr rate, no contracts, no surprises. When you call, a real dispatcher answers — not an automated menu — and the closest qualified technician is sent your way.`,

    `Demand for professional ${tl} has grown sharply as auto-club wait times have crept past two and three hours in many markets. Drivers are tired of paying $149+ per year for memberships and still waiting half a day for help on the side of a highway. Our model fixes that. You pay only when you need us, you know the price before we roll, and our average response time is well under an hour in the cities we serve. The ${tl} service is built for the moment you actually need it — not the abstract idea of it.`,

    `What sets our ${tl} service apart is the pricing model: $149 per hour with a 1-hour minimum. No mileage fees, no after-hours surcharges on most calls, no equipment up-charges for standard service. The clock starts when the technician arrives on scene and stops the moment your vehicle is rolling again. Most ${tl} jobs are completed inside the 1-hour minimum, which means you pay exactly the minimum and nothing more. If your situation is more complex — a stuck wheel lug, a vehicle deep in soft ground, a difficult lockout — you'll know that going in and we'll quote the additional time before continuing.`,

    `The ${tl} process begins the moment you call. Our dispatcher asks a short set of questions: your exact location, vehicle make and model, the nature of the problem, and any safety concerns. That information goes straight to the nearest technician, who calls you back with an arrival estimate. You'll get a text with the technician's name and ETA. On arrival, the technician confirms the situation, walks you through what they're about to do, and gets to work. No upsells, no surprise add-ons — the rate you were quoted is the rate you pay.`,

    `On arrival, the ${tl} technician does a quick safety check before starting work. For roadside calls on highways and busy roads, that means positioning the service vehicle to shield you from traffic, deploying cones, and putting on a reflective vest. For lot calls and driveway calls, it's about checking the surroundings and confirming the vehicle is stable. Once the scene is safe, work begins immediately. You're welcome to watch or stay in your vehicle — whatever you're most comfortable with.`,

    `During the ${tl} job, communication stays steady. The technician explains each step in plain language, calls out anything unexpected, and lets you know the moment the issue is resolved. If a deeper problem is uncovered — for example, a battery that holds a jump but won't hold a charge, or a tire with sidewall damage that needs replacement rather than a swap — the technician documents it on the spot and gives you straight talk about your options.`,

    `After the ${tl} is complete, you'll get a digital invoice on your phone with the total time worked, the flat-rate cost, and a payment link. We accept all major credit and debit cards, Apple Pay, Google Pay, Venmo, Zelle, and CashApp. Cash is also fine. There is no separate "trip fee" or "service call fee" hiding at the bottom of the invoice — what you were quoted is what you pay. A receipt goes straight to your email for expense reports, insurance, or rideshare records.`,

    `The ideal customers for our ${tl} service are ${service.ideal.join(", ").toLowerCase()}. Each of these groups has slightly different needs — commuters need fast turnaround, rideshare drivers need to get back to earning, parents need a calm response when they're stranded with kids, and fleet managers need predictable billing. Our ${tl} service is built to serve all of them without making any of them feel like an afterthought. We move fast, we treat every customer with respect, and we get you back to your day.`,

    `Anyone considering ${tl} should feel free to call (888) 944-3001 for a free, no-obligation quote. We'll confirm pricing, walk through what to expect, and give you an honest assessment of whether our service is the right fit for your situation. If your problem is something we don't handle — for example, a major mechanical failure that requires a shop — we'll tell you that and point you toward the right next step. No pressure, no sales pitch.`,

    `Safety is the core priority on every ${tl} call. Our technicians carry standard equipment for the job, wear ANSI-compliant high-visibility gear, and follow strict procedures for highway-side work. Every vehicle is liability-insured. If a customer vehicle is damaged during a service call — a scratched rim during a tire change, a scuffed bumper during a tow hookup — our insurance covers repair at no cost to the customer. That kind of accountability is rare in roadside, but it should be the standard.`,

    `The economics of ${tl} consistently favor pay-as-you-go customers compared to membership-based alternatives. Auto-club memberships average $80–$120 per year and most members use them zero or one time. Our flat-rate model means you pay only when you actually need help. For a typical driver who needs roadside service once every two years, our pricing is dramatically cheaper than years of unused membership dues. For drivers who never need help, you owe us nothing — which is the honest answer no club membership will give you.`,

    `Our ${tl} service is available in over 900 cities across all 50 states, dispatched from 50 strategically located offices. No matter where you break down in the United States, chances are there's a local technician familiar with the area, the traffic patterns, and the regional quirks. Our network operates 24 hours a day, 365 days a year — overnights, weekends, holidays, and severe weather days included. The rate doesn't change based on when you call. A ${tl} job at 2pm on a Tuesday and a ${tl} job at 2am on Christmas morning are billed identically.`,

    `Scheduling flexibility is built into the model. Most ${tl} calls are unscheduled by nature — you don't plan a flat tire — so dispatch is reactive and fast. For planned service (think a battery you know is dying, a fuel delivery for an empty tank in a parked car, or a winch-out for a vehicle stuck on a property), you can book a specific time window through the booking page. Either way, the rate is the same and there are no premium charges for evenings, weekends, or holidays.`,

    `For fleet and commercial customers who need recurring ${tl} support — delivery companies, rideshare operators, rental car branches, dealerships — we offer consolidated billing, dedicated dispatch lines, and consistent technician assignments where geography allows. Your account gets priority scheduling and a single point of contact for invoicing. Recurring partners also receive volume-based service summaries each month, which are useful for routing analysis, vehicle health planning, and insurance documentation.`,

    `Customer satisfaction drives everything we do in ${tl}. The reviews from our network consistently focus on three things: the technician was on time, the price matched the quote, and the work was done right the first time. That is the entire bar — and we hit it because the model is honest. No commission structures incentivizing upsells, no opaque fee tables, no dispatchers reading from a sales script. Just a technician, a vehicle, the right tools, and a clear flat $149/hr rate.`,
  ];
}

export const SERVICES: Service[] = [
  // EMERGENCY
  {
    slug: "jump-start-service",
    title: "Jump Start Service",
    subtitle: "Dead Battery, Back on the Road",
    description: "Battery won't turn over? A trained technician arrives with commercial-grade jump equipment, gets your vehicle running, and tests the system to confirm the battery will hold a charge.",
    longDescription: "Jump start service is one of the most common roadside calls and one of the simplest fixes — when it's done right. Our technicians use commercial jump packs (not consumer-grade cables) that protect modern vehicle electronics, then run a quick voltage test on the alternator and battery to tell you whether the issue was a one-time drain or a battery on its last legs. If it's a one-time drain (interior light left on, short trip in cold weather, parasitic draw), you're done. If the battery is failing, you'll know that before you drive off — so you can plan a replacement instead of getting stranded again that night.",
    ideal: ["Commuters", "Rideshare Drivers", "Parents", "Anyone with a dead battery"],
    category: "emergency",
  },
  {
    slug: "flat-tire-change",
    title: "Flat Tire Change",
    subtitle: "Spare Swap or Inflation On-Site",
    description: "Flat on the side of the road? We change to your spare, properly torque the lug nuts, and check the spare's pressure. If the issue is a slow leak, we can inflate and seal on-site.",
    longDescription: "Flat tire service starts with a quick safety setup — cones deployed, vehicle stabilized, technician in a reflective vest — and ends with a properly torqued spare and a brief inspection of the flat to identify the cause. If it's a nail or screw in the tread, we can often plug-seal the tire on the spot. If the damage is in the sidewall or the tire is shredded, we mount the spare and refer you to a tire shop. We carry portable compressors for spare inflation, breaker bars for stubborn lugs, and locking-lug key adapters if you've lost yours.",
    ideal: ["Commuters", "Long-Haul Drivers", "Parents", "Rideshare Drivers"],
    category: "emergency",
  },
  {
    slug: "car-lockout-service",
    title: "Car Lockout Service",
    subtitle: "Locked Out? We'll Get You In",
    description: "Keys locked in the car? We use no-damage entry tools to unlock your vehicle without scratching paint, cracking windows, or harming weather seals.",
    longDescription: "Our lockout technicians use professional wedge-and-rod tools rated for modern vehicles — no slim jims that damage power window components, no coat hangers that scratch interior panels. The process takes 5–15 minutes for most makes and models. We can also help with trunk lockouts, glove box lockouts, and lockouts where the keys are visible inside the vehicle but you have no spare. For dead key fob batteries, we keep common CR2032 and CR2025 cells on the truck. We do not handle ignition cylinder repair or transponder programming — those are dealership jobs.",
    ideal: ["Anyone locked out", "Parents", "Rideshare Drivers", "Commuters"],
    category: "lockout",
  },
  {
    slug: "fuel-delivery-service",
    title: "Out of Gas? Fuel Delivery",
    subtitle: "Enough Fuel to Reach the Pump",
    description: "Ran the tank dry? We deliver enough gasoline or diesel to get you to the nearest station — typically 2-5 gallons, no need to abandon your vehicle.",
    longDescription: "Fuel delivery is exactly what it sounds like: you ran out, we bring enough fuel to get you to a pump. We carry approved fuel containers and deliver 2-5 gallons of regular unleaded, premium, or diesel depending on what your vehicle needs. The fuel itself is billed at local pump price plus the standard service rate — no inflated 'emergency fuel' markup. Once we pour, we'll often stay until the engine cranks and runs smoothly, because some vehicles need a minute and a few attempts to clear vapor from the lines after running dry.",
    ideal: ["Commuters", "Road Trippers", "Anyone with an empty tank"],
    category: "fuel-power",
  },
  {
    slug: "tow-truck-service",
    title: "Local Tow Service",
    subtitle: "Short-Distance Tows to a Shop or Home",
    description: "Vehicle won't move? We tow to the nearest shop, your home, or wherever you need it within local range. Flatbed and wheel-lift options depending on the vehicle.",
    longDescription: "Tow service is for situations where a roadside repair isn't enough — a vehicle with a serious mechanical issue, a wreck, a fluid leak that needs a shop, or simply a vehicle that needs to come home from where it broke down. We use flatbed trucks for AWD/4WD vehicles, low-clearance cars, and any vehicle that shouldn't be wheel-lifted. Standard wheel-lift towing is fine for most front- or rear-wheel-drive sedans. Local tows are billed at our flat $149/hr rate plus per-mile charges past a 5-mile included distance. Long-distance towing is available with a separate quote.",
    ideal: ["Anyone with a disabled vehicle", "After accidents", "Mechanical breakdowns"],
    category: "recovery",
  },
  {
    slug: "winch-out-recovery",
    title: "Winch-Out & Recovery",
    subtitle: "Stuck in Mud, Snow, Sand, or a Ditch",
    description: "Tires spinning, vehicle stuck? Our recovery trucks have professional winches rated for full-size SUVs and pickups. We pull you out, no damage to your vehicle.",
    longDescription: "Winch-outs cover the long list of ways a vehicle can get stuck: snow drifts, mud, soft shoulders, sand, ditches, snowbanks pushed up by plows, off-camber driveways, and the occasional creative parking attempt. Our recovery trucks carry heavy-duty winches with proper rigging — tow straps with soft shackles, snatch blocks for tight angles, and tree-saver straps if a winch point isn't available on the vehicle. We do not perform off-road recovery in true off-pavement scenarios; that's a specialist 4x4 recovery job. For everything roadside-adjacent, we've got you.",
    ideal: ["Winter drivers", "Off-the-shoulder situations", "Mud and sand stuck", "Snowbank stranded"],
    category: "recovery",
  },

  // SECONDARY EMERGENCY
  {
    slug: "battery-replacement-on-site",
    title: "On-Site Battery Replacement",
    subtitle: "New Battery Installed Where You Are",
    description: "Battery is dead and won't hold a charge? We deliver and install a fresh battery on the spot — at your home, office, or roadside.",
    longDescription: "Sometimes a jump-start isn't enough — the battery is genuinely at end of life and won't hold a charge no matter how long you drive. Rather than getting stranded again that night, we can deliver and install a new battery on-site. We stock common Group 24, 35, 48, 65, and 78 batteries for most American and import vehicles. The new battery is billed at retail price (no markup beyond standard pump pricing) plus our service rate, and we recycle the old battery at no extra cost. Most installs take 15-25 minutes.",
    ideal: ["Drivers with failing batteries", "Anyone who jumped and stalled again", "Cold-weather stranded"],
    category: "emergency",
  },
  {
    slug: "motorcycle-roadside",
    title: "Motorcycle Roadside Service",
    subtitle: "Specialized Help for Riders",
    description: "Motorcycles need specialized roadside handling. We offer motorcycle-specific tow trailers, jump starts, fuel delivery, and tire help.",
    longDescription: "Motorcycle roadside is its own discipline. Motorcycles can't be wheel-lifted, so they require flatbed-with-strap-system loading or proper motorcycle trailers. Jump-starting requires care because some bikes have small batteries that are easily damaged by improper jumps. Motorcycle tire changes typically require pulling the wheel from the bike, which is shop work — but we can deliver fuel, jump-start, and tow to the nearest motorcycle shop or your home. All techs handling motorcycle calls have specific training; we don't send standard auto techs to motorcycle jobs.",
    ideal: ["Motorcycle riders", "Sport bike owners", "Cruiser riders", "Touring riders"],
    category: "specialty",
  },
  {
    slug: "rv-roadside-service",
    title: "RV & Trailer Roadside",
    subtitle: "Big Rigs Need Bigger Service",
    description: "RV breakdown, trailer flat, or coach won't start? We handle Class A, B, C motorhomes and travel trailers with appropriate equipment.",
    longDescription: "RVs and travel trailers require heavier equipment than passenger vehicles. We dispatch trucks with the right tire size inventory (RV tires range from 16\" to 22.5\"), high-amp jump systems for diesel pushers, and recovery rigs rated for full-size Class A motorhomes. We can handle slide-out failures on the road, awning damage, and most fluid-related emergencies. We do not handle major mechanical repair on RVs — those go to an RV service center — but we can tow your rig there if it won't run.",
    ideal: ["RV owners", "Travel trailer towers", "Full-time RVers", "Vacation drivers"],
    category: "specialty",
  },
  {
    slug: "diesel-truck-roadside",
    title: "Diesel Truck Roadside",
    subtitle: "Light & Medium-Duty Diesel Support",
    description: "Diesel issues need specific equipment. Cold-start, fuel-bleed, DEF delivery, and tire service for light and medium-duty diesel trucks.",
    longDescription: "Light and medium-duty diesel trucks (3/4-ton, 1-ton, and chassis cab work trucks) have their own roadside quirks — air in the fuel system after running dry, gelling in cold weather, DEF (diesel exhaust fluid) tank empty, glow plug starting issues. We carry diesel-specific tools including hand primers, glow plug testers, and DEF in 2.5-gallon containers. Heavy-duty (Class 7-8) trucks require a specialized heavy-duty roadside service; we do not service Class 7-8 vehicles directly but can refer you to partners.",
    ideal: ["Contractors", "Work truck owners", "Diesel commuters", "Fleet managers"],
    category: "specialty",
  },
  {
    slug: "key-fob-battery",
    title: "Key Fob Battery Replacement",
    subtitle: "Dead Fob? Quick Roadside Fix",
    description: "Key fob stopped working? Most fobs use a coin cell that we carry on every service truck. Five-minute fix to get you back in your car.",
    longDescription: "Modern vehicles often won't unlock — or in some cases won't start — when the key fob battery dies, even if a physical key is hidden inside the fob. Our techs carry CR2025, CR2032, CR2450, and a handful of other common cells, plus the small Torx and Philips drivers needed to open most fob shells without breaking the clips. The replacement itself is a five-minute job; the value is in not having to wait until tomorrow for a dealership service appointment.",
    ideal: ["Anyone with a dead fob", "Drivers locked out due to fob failure"],
    category: "lockout",
  },
  {
    slug: "ev-charging-delivery",
    title: "EV Charging Delivery",
    subtitle: "Dead EV? Mobile Charge Where You Stranded",
    description: "Electric vehicle out of charge? We bring portable Level 2 charging to your location — enough juice to reach the nearest fast-charge station.",
    longDescription: "Running an EV down to zero used to mean a tow to the nearest charger. Not anymore. We dispatch mobile units with portable Level 2 charging equipment that can add 8–15 miles of range in 20–30 minutes — enough to get you to the nearest DC fast-charger. Compatible with J1772 (Tesla included via adapter), CCS adapter cables on request. We handle Tesla, Rivian, Ford F-150 Lightning, Chevy Bolt, Hyundai Ioniq, Nissan Leaf, and most other EVs. The charge itself is billed at a flat per-kWh rate plus the standard service rate. If your EV won't accept charge at all, we can tow it flatbed to the nearest dealer or charging hub.",
    ideal: ["EV drivers stranded with low battery", "Tesla owners", "Anyone with a dead EV"],
    category: "emergency",
  },
  {
    slug: "mobile-tire-replacement",
    title: "Mobile Tire Replacement",
    subtitle: "New Tire Installed Roadside",
    description: "Sidewall damage, blowout, or no spare? We deliver and install a brand-new tire on the spot — no tow to a shop required.",
    longDescription: "Mobile tire replacement is for situations where a spare swap or plug isn't an option: sidewall damage, full blowout, no spare in the vehicle, or a spare too old to safely drive on. We stock the most common passenger tire sizes (15\"-22\") and can source uncommon sizes within an hour from a partner warehouse in most markets. The tire is billed at retail price plus our service rate, and we dispose of the old tire at no charge. We balance the wheel on-site using a portable balancer for sizes up to 20\". Run-flats, performance tires, and oversized sizes may require an extended sourcing window.",
    ideal: ["Drivers with sidewall damage", "Blowout victims", "Anyone without a usable spare"],
    category: "emergency",
  },
  {
    slug: "trunk-lockout-service",
    title: "Trunk Lockout Service",
    subtitle: "Keys, Wallet, or Phone Locked in the Trunk",
    description: "Locked your keys, wallet, or essentials in the trunk? We open trunks without damaging the latch, paint, or weather seals.",
    longDescription: "Trunk lockouts are common — keys go in with the groceries, kids slam the trunk, or the trunk button fails. We use professional trunk-release tools to open most sedan, SUV, and crossover trunks without damaging the lock cylinder, the paint, or the rubber seal. For vehicles where the trunk only releases from inside the cabin, we first open the cabin door (standard car lockout technique) and pull the trunk release. For trunks with mechanical locks (older vehicles), pick-style entry takes 5–10 minutes. The job is billed at the standard $149/hr rate with the 1-hour minimum.",
    ideal: ["Drivers locked out of trunk", "Parents with kids' bags inside", "Anyone with essentials locked in back"],
    category: "lockout",
  },
  {
    slug: "broken-key-extraction",
    title: "Broken Key Extraction",
    subtitle: "Key Snapped in the Ignition or Door Lock",
    description: "Key broke off in the ignition, door, or trunk? We extract the broken half without damaging the lock cylinder.",
    longDescription: "Broken keys are a common issue with older vehicles and worn-out keys. The broken half stuck in the lock can't be removed by hand — pulling on it usually pushes it deeper. We use professional broken-key extractor tools that grip the broken edge and pull cleanly without scoring the lock cylinder. Once extracted, the lock works normally with a replacement key, which we can also help you arrange. If the cylinder itself is damaged from the break, we'll quote a cylinder replacement before doing anything destructive. We extract from ignitions, door locks, trunk locks, and steering column locks.",
    ideal: ["Drivers with broken keys in lock", "Older vehicle owners", "Worn-key situations"],
    category: "lockout",
  },
  {
    slug: "accident-tow-service",
    title: "Accident & Collision Tow",
    subtitle: "Post-Accident Towing to a Body Shop or Home",
    description: "Just had an accident? We dispatch a flatbed tow trained for collision recovery — drivable or not, your vehicle goes where you need it.",
    longDescription: "Accident towing is different from breakdown towing. The vehicle may have damaged suspension, leaking fluids, or wheels that won't roll — which means flatbed is almost always the right choice. Our accident-trained drivers know how to load a damaged vehicle without causing further harm to bumpers, fenders, or undercarriage components. We coordinate directly with insurance adjusters for billing when you have collision coverage, and we can deliver the vehicle to a body shop, a dealership, your home, or a storage facility. If your insurance covers the tow, we bill them direct. If you're paying out-of-pocket, the standard flat rate applies with per-mile charges past the 5-mile included distance.",
    ideal: ["Accident victims", "Anyone with collision damage", "Insurance claim tows"],
    category: "recovery",
  },
];

export const SERVICE_CATEGORIES = {
  emergency: { label: "Emergency Roadside", description: "Dead battery, flat tire, and on-the-road breakdown service" },
  lockout: { label: "Lockout Service", description: "Car and key fob lockout assistance" },
  "fuel-power": { label: "Fuel & Power", description: "Out-of-fuel delivery and battery replacement on the spot" },
  recovery: { label: "Tow & Recovery", description: "Local towing, winch-outs, and vehicle recovery" },
  specialty: { label: "Specialty Vehicle Service", description: "Motorcycles, RVs, diesel trucks, and other specialty roadside needs" },
} as const;