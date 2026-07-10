import { SERVICES } from "./services";

export interface ServiceFAQ {
  q: string;
  a: string;
}

/** Global FAQs applied to every service */
const GLOBAL_FAQS: ServiceFAQ[] = [
  {
    q: "How fast can you get here?",
    a: "Typical arrival window is 20 to 40 minutes anywhere in the five boroughs, and the dispatcher quotes a specific ETA before ending the call. Arrival times stretch during snowstorms, major highway incidents, and the tightest rush-hour windows on the Cross Bronx, BQE, and Queens-Midtown approach. Overnight ETAs are often faster than daytime because traffic is lower. You get a truck number and driver name the moment dispatch routes the call, and you can call back any time for a live status update while you wait.",
  },
  {
    q: "Do you charge extra for overnight, weekends, or holidays?",
    a: "No. The rate quoted on the phone is the rate on the invoice regardless of time of day, day of the week, or holiday. We staff 24/7/365 on purpose so that overnight and weekend calls are part of the normal operation, not an exception we charge a surcharge for. National roadside networks sometimes add after-hours surcharges when they subcontract to local operators; we don't, because we are the local operator.",
  },
  {
    q: "How do I pay, and will I get a receipt?",
    a: "We accept every major credit card, Apple Pay, Google Pay, Zelle for established customers, and cash. The driver processes payment on scene before leaving, and the itemized receipt emails to you within minutes. For fleet accounts we bill net-30 on a consolidated monthly invoice. For insurance claim tows where your policy covers the service, we direct-bill the carrier and your out-of-pocket is zero. Receipts include the truck number, driver, odometer readings, and itemized line items for your records or insurance submission.",
  },
];

/** Per-service FAQ overrides and additions, keyed by service slug */
const SERVICE_FAQS: Record<string, ServiceFAQ[]> = {
  "light-duty-towing": [
    {
      q: "Can you fit in my Manhattan garage?",
      a: "Our wheel-lift trucks clear most NYC residential building garages — the common cap is 6'6\" or 7' and we fit. A flatbed with a car loaded needs 12' of clearance and will not fit in most condo garages; if your vehicle requires flatbed (AWD, EV, low-clearance luxury) we'll meet you at the garage entry and stage outside. Tell the dispatcher which building and garage you're in and we'll confirm clearance before sending the truck.",
    },
    {
      q: "What if my car is blocking a fire hydrant or has tickets on it?",
      a: "If NYPD or parking enforcement has already flagged your vehicle, the tow needs to happen before the next enforcement window. Dispatch prioritizes calls where the alt-side clock or NYPD action is imminent. For vehicles with outstanding ticket judgments, we can still tow you to your destination, but you will need to clear the tickets with NYC DOF before registration and plate issues compound. We don't resolve tickets; we just get the vehicle to the shop or home.",
    },
    {
      q: "Will you tow me out of state?",
      a: "Yes. Light-duty vehicles tow on wheel-lift for short distances; anything over about 20 miles or any out-of-state destination moves on flatbed because wheel-lift towing at highway speeds for extended distances causes drivetrain wear. Long-distance pricing is quoted as a destination flat rate — you know the total before we load. Most northeastern destinations are same-day.",
    },
    {
      q: "What happens if the car won't shift into neutral?",
      a: "If the transmission is locked in park because of an electrical problem, a dead battery, or a failed shift interlock, we still tow. We use wheel skates or a flatbed with a winch depending on the vehicle. On automatic transmissions we can sometimes bypass the shift lock manually. The driver assesses on scene and picks the right loading method. No charge for the extra work if it's part of the original tow scope.",
    },
    {
      q: "Can you drop the car at a locked service center after hours?",
      a: "Yes — we coordinate with the service center in advance if possible, and if the service center has a drop box for keys we use it. For shops without after-hours procedures, the car can go to our secure yard overnight and get delivered to the shop in the morning. Tell dispatch the destination and receiving hours and we'll work it out.",
    },
  ],

  "motorcycle-towing": [
    {
      q: "Do I need to be there when the bike is towed?",
      a: "For a breakdown pickup, yes — the bike needs to be unlocked, and if there's any aftermarket security you need to disarm it. For a scheduled transport (to a shop, to a buyer, to storage), we can pick up without you being present if we have keys and written authorization. Some Manhattan residential buildings require tenant presence for any vehicle removal, and we coordinate with the building management as needed.",
    },
    {
      q: "What if my bike has a dead battery?",
      a: "A dead battery doesn't change the flatbed procedure — we roll or push the bike onto the flatbed, strap it down, and take it wherever it needs to go. We can also jump-start the bike on scene if you'd rather ride it to your destination or to a shop. Tell dispatch what you need.",
    },
    {
      q: "How do you strap down a bike without damaging it?",
      a: "Straps go to the frame, subframe, triple-tree, or foot pegs — never through the handlebars or clip-ons. The front wheel sits in a chock that holds the bike upright. We use soft loops at contact points to avoid scratching painted or polished surfaces. Every bike gets photographed before loading so any pre-existing wear is documented.",
    },
    {
      q: "Can you handle a track bike or a race bike without a title?",
      a: "Yes. Track-only bikes without street registration transport the same as street bikes — flatbed with chock and straps. We'll need authorization documentation from the owner (especially if the pickup and drop are different locations), and for cross-state track transport we may need additional paperwork for toll-road and carrier compliance.",
    },
    {
      q: "What about scooters, mopeds, or small-displacement bikes?",
      a: "Same flatbed procedure as larger bikes. The chock and straps scale down. We've moved everything from 125cc scooters to full dressers, and the only difference is the truck selection — some of our motorcycle-ready flatbeds are configured differently for very small or very large bikes. Tell the dispatcher what you have.",
    },
  ],

  "heavy-duty-towing": [
    {
      q: "What's the weight limit on your heavy wreckers?",
      a: "Our heavy wrecker fleet handles Class 6, 7, and 8 vehicles — box trucks, tractors, large dump trucks, and most commercial vehicles up to about 40 tons. For specialty rollover recovery involving rotators, we size the truck to the scene. For loads above standard Class 8 (oversized construction equipment, specialty haulers), we coordinate with specialty recovery operators. Tell dispatch the GVWR and cargo type and we'll confirm capacity before dispatch.",
    },
    {
      q: "Do you handle cargo during a commercial tow?",
      a: "We preserve cargo — stabilize, tarp, and secure for transport — but we don't transfer cargo to another vehicle on the scene. That's the shipper's or receiver's call. We can coordinate with a second truck if cargo needs to be offloaded before we can move the disabled vehicle. For hazmat, we don't move it — the shipper must call a licensed hazmat recovery operator.",
    },
    {
      q: "What about air-brake failures?",
      a: "Air-brake failures are a specialty. Our heavy wreckers carry air tanks and lines to re-pressurize the system on scene, which lets us move the truck to the shop without dragging locked wheels. Some cases require a rebuild before the truck moves at all, and we coordinate with the receiving shop on that.",
    },
    {
      q: "Can you dispatch to I-95 or the Cross Bronx during rush hour?",
      a: "Yes. Heavy-duty dispatch runs 24/7, and rush hour calls on the Cross Bronx, BQE, and LIE are part of our regular flow. We coordinate with state troopers or NYPD for scene protection before arrival because heavy wrecker work in a travel lane or on a narrow shoulder requires emergency response. Expect the arrival window to reflect rush-hour traffic, but the truck is en route as soon as the scene is ready for our work.",
    },
    {
      q: "What does DOT-compliant documentation include?",
      a: "Every heavy-duty tow generates paperwork for the trucking company's compliance file: incident report with time, location, and cause; photos of the scene and the vehicle; driver's logbook annotation; and the tow invoice with itemized line items. For DOT-reportable incidents we also coordinate with the DOT reporting requirements and provide copies to your safety manager.",
    },
  ],

  "flatbed-towing": [
    {
      q: "Why does my Audi or Subaru need a flatbed?",
      a: "AWD vehicles — including every Subaru, every Audi quattro, every Tesla, every Rivian, most BMW xDrive, most Mercedes 4MATIC, and most Volvo AWD — require all four wheels off the ground during towing. Wheel-lift towing spins the drive wheels against the drivetrain, which generates heat and wear in the center differential and transfer case. On some AWD systems, even a few miles of wheel-lift towing can cause thousands of dollars in drivetrain damage.",
    },
    {
      q: "Can flatbeds fit in my parking garage?",
      a: "Usually not. Most NYC residential parking garages cap at 6'6\" or 7' of clearance; a flatbed truck with a vehicle loaded needs 12' of clearance. We'll meet you at the garage entry and load the vehicle outside. If your vehicle can't be pushed out of the garage manually, we can sometimes use wheel skates to move it to the loading position.",
    },
    {
      q: "Will my wheels get damaged during flatbed towing?",
      a: "No. We use soft tie-down straps that attach to factory tow hooks or subframe points, not to the wheels. Wheel nets (if needed to keep a wheel from spinning during loading) are made of soft material that doesn't scratch painted or polished wheels. For luxury cars with expensive wheels, we use rim protectors at any contact point.",
    },
    {
      q: "Is flatbed more expensive than wheel-lift?",
      a: "Yes, modestly. The equipment costs more to operate and the loading work takes a few more minutes per call. The premium is quoted on the phone before dispatch. For most customers, the choice isn't flatbed vs. wheel-lift — it's whether flatbed is required for your vehicle. If it is, the small premium prevents a much larger drivetrain repair bill.",
    },
    {
      q: "Can I ride in the cab during a flatbed tow?",
      a: "For short trips (same borough or adjacent borough) yes, space permitting. For long-distance tows, we usually recommend you drive separately or take a rideshare — multi-hour transport rides aren't comfortable in a tow truck cab. The driver will tell you what works for the specific move.",
    },
  ],

  "accident-recovery": [
    {
      q: "Do I have to go with the tow truck NYPD called?",
      a: "Not in most cases. If NYPD has closed a travel lane because of your accident, they will call a rotation tow to clear the lane quickly. You can refuse rotation tow and call us instead — but in that case you (or your passenger) need to be able to safely manage the scene while we arrive. For injury accidents or major lane blockages, rotation tow is often faster. The rotation tow operator will take the vehicle to a specific pound, which you can later release via our impound recovery service.",
    },
    {
      q: "Will my insurance cover the tow?",
      a: "Most auto insurance policies in NYC include tow coverage after an accident regardless of fault. We work with Geico, State Farm, Allstate, Progressive, USAA, Liberty Mutual, Farmers, Nationwide, Travelers, and most regional carriers. If your policy covers the tow, we direct-bill the carrier and your out-of-pocket is zero. If coverage is uncertain at the scene, we collect payment up front and provide a detailed itemized receipt for reimbursement.",
    },
    {
      q: "How do I choose a body shop?",
      a: "You have the right to choose. Your insurance carrier may recommend preferred shops that have direct-repair agreements (faster claim processing), but you can go to any licensed shop. We know the specialty shops in NYC for every major brand and can recommend if you're unsure. Most insurance carriers will pay up to a shop's rate cap; differences above that cap come out of your pocket unless your policy waives the cap.",
    },
    {
      q: "What if the other driver is at fault?",
      a: "You still have options. Your own insurance typically covers the tow regardless of fault (via collision or comprehensive coverage), and your carrier pursues subrogation against the at-fault driver's carrier. Alternatively, the at-fault driver's carrier can pay the tow directly if liability is clear and their adjuster accepts fault. The practical advice is to get the car off the scene via your own coverage and let the insurance companies work out reimbursement.",
    },
    {
      q: "What's 'scene cleanup' and why does it matter?",
      a: "After a collision, the scene has glass, plastic bumper pieces, and often fluid (engine oil, transmission fluid, coolant, brake fluid). NYC DOT expects the scene to be cleaned before we leave. We carry absorbent material, a broom, and a debris pan to handle it. Leaving the scene without cleanup creates civil liability and a road hazard for the next driver.",
    },
  ],

  "long-distance-towing": [
    {
      q: "How far do you tow?",
      a: "Regularly we run up to Boston and the Cape via I-95 and I-90, down to DC via the NJ Turnpike, west through Pennsylvania and as far as Pittsburgh, and north through the Adirondacks via I-87 and I-84. Cross-country moves (to the West Coast, to Florida, to the Midwest) are available on request and scheduled with driver rotation to meet DOT hours-of-service rules.",
    },
    {
      q: "Do you use enclosed or open trailers?",
      a: "Open flatbed is the default for most long-distance moves. Enclosed transport is available for classics, exotics, concours vehicles, and any vehicle over $100K in appraised value where climate and weather protection matter. Enclosed runs about twice the rate of open flatbed because the trailer is a more expensive asset.",
    },
    {
      q: "When will the vehicle arrive?",
      a: "Same-day for regional destinations under about 200 miles. Next-day for medium-distance moves (300-500 miles) with an overnight layover at a secured staging point. Multi-day for cross-country, with arrival times scheduled based on driver hours-of-service compliance. You get a live GPS link during the move so you can track progress.",
    },
    {
      q: "What if the destination can't receive the vehicle when we arrive?",
      a: "We coordinate with the destination before departure to confirm receiving hours and procedures. If something changes en route (receiver closed unexpectedly, address confusion), we have secured overnight staging facilities across the Northeast where the vehicle can stay safely until the destination opens.",
    },
    {
      q: "How is payment handled for long-distance?",
      a: "Typically card, Zelle, or wire transfer at pickup, with a detailed itemized receipt emailed immediately. For dealer accounts and other B2B customers, net-30 invoicing on a consolidated monthly statement is standard. Cash is accepted but paperwork becomes more complicated for cross-state moves — we prefer card or electronic payment for the record trail.",
    },
  ],

  "rv-motorhome-towing": [
    {
      q: "Where do you take an RV after pickup?",
      a: "NYC has almost no RV repair shops, so most RV tows end up at an RV dealer or RV-capable truck shop outside the city — Camping World in Hanover NJ, La Mesa RV in Stafford Township NJ, Alpin Haus in Amsterdam NY, or specialty chassis shops that can work on Freightliner, Spartan, Ford, or Workhorse RV chassis. Our dispatcher coordinates with the receiving shop before we tow so we know they can accept the vehicle and have space.",
    },
    {
      q: "Do you handle slides that won't retract?",
      a: "We can secure a stuck slide manually for transport — the slide stays out but we brace it so it can't move during the tow. This isn't ideal for long-distance moves because the slide creates wind drag and drastically changes the RV's profile, but for short-distance recovery to a repair shop it works. For long-distance moves with a stuck slide we usually recommend on-site repair before transport if possible.",
    },
    {
      q: "What about propane tanks?",
      a: "Propane must be shut off at the tank before any tow, and our driver will verify before hooking up. Federal regulations prohibit transporting RVs with live propane lines, and the Holland and Lincoln Tunnels explicitly prohibit propane-equipped vehicles. We coordinate the propane shutdown at pickup.",
    },
    {
      q: "Can you tow with pets inside the RV?",
      a: "Generally no — we recommend pets travel with you separately in a car or with family members. The RV's climate control won't work during the tow and conditions inside can get hot in summer or cold in winter. For cases where pets must travel with the RV, we coordinate carefully and limit transport duration.",
    },
    {
      q: "What's the cost of an RV tow vs. a regular tow?",
      a: "Significantly higher. RVs require a heavy wrecker with 35-50 ton capacity, specialty rigging for the specific chassis, and route planning around bridge and tunnel restrictions. Local NYC tows run several times the cost of a light-duty car tow. Long-distance RV transport is quoted as a destination flat rate.",
    },
  ],

  "roadside-assistance": [
    {
      q: "What does a roadside call cover?",
      a: "Any problem that doesn't require a tow. Jump-starts for dead batteries, flat-tire swaps or plug-patch repairs, lockout service for locked keys or dead fobs, fuel delivery for empty tanks, and winch-out for vehicles stuck in snow, mud, or off the pavement. Each is flat-rate per call. If the problem turns out to require a tow, the roadside fee credits toward the tow rate.",
    },
    {
      q: "Is this cheaper than AAA?",
      a: "For single-call service, yes — significantly. AAA membership has annual fees, mileage caps per call, and (when the subcontractor they assign takes too long) the underlying service is still ours. Calling us directly skips the dispatch markup and gets you faster service. For multi-call coverage, AAA membership can work out cheaper over time if you have many calls per year.",
    },
    {
      q: "How quickly can you get here?",
      a: "20-40 minutes is the typical window, faster overnight when traffic is lower. Arrival times stretch during weather events and major traffic incidents. The dispatcher quotes a specific ETA before ending the call. We route from trucks already in your borough, not from a central depot.",
    },
    {
      q: "Do you serve commercial accounts?",
      a: "Yes. Fleet accounts get priority dispatch, consistent drivers, net-30 invoicing, and volume pricing. Delivery fleets, rideshare operators, and commercial truck operators all use us for roadside coverage that's faster than national networks.",
    },
    {
      q: "What if I'm on a bridge or in a tunnel?",
      a: "Bridges and tunnels have specific rules about stopped vehicles. NYPD and the Port Authority need to protect the scene before roadside work can happen. Call 911 first if you're in a tunnel or a travel lane on a bridge; the emergency response coordinates with us on arrival.",
    },
  ],

  "jump-start": [
    {
      q: "Will the jump-start fix my problem permanently?",
      a: "Depends on why the battery died. If it's a temporary issue (left the lights on, sat unused for weeks), the jump brings the battery back and a 20-30 minute drive recharges it. If the battery is at end of life or has a failed cell, the jump is temporary and you need a replacement. If the alternator has failed, a jump gets you a few miles before the car stalls again. We test the battery with a load tester before jumping so you know what you're dealing with.",
    },
    {
      q: "Can you replace my battery on the spot?",
      a: "Yes. We stock batteries in the common group sizes on our roadside trucks — if the test shows the battery is toast, we can swap on the curb for the cost of the battery plus the install fee. This usually costs less than going to a shop and is much faster. Some luxury imports require battery registration to the vehicle's BCM (BMW, Audi, Mercedes, and most recent Ford/GM) and we carry the scan tools for that step.",
    },
    {
      q: "Why won't my car start even after a jump?",
      a: "If the car cranks but won't catch after a jump, the battery probably isn't the problem — could be fuel system, ignition, starter, or sensor. If the car won't crank at all even with a jump pack, it could be a bad starter, a bad ground, or an issue with the main fuse. Our roadside mechanic can run basic diagnostics on the curb to identify whether the problem is resolvable on scene or needs shop service.",
    },
    {
      q: "Is it safe to jump an EV?",
      a: "Electric vehicles have a 12V auxiliary battery that powers the computers and unlocks the car; that 12V battery can be jumped the same way as a conventional battery (with specific procedures for some models). The main high-voltage battery can't be jumped — if the main battery is depleted the vehicle needs to be flatbed transported to a charger. We handle both scenarios.",
    },
    {
      q: "What if I need a jump at 3 AM?",
      a: "Same rate, same procedure, same drivers. Our dispatch runs 24/7 with trucks staged around the city. Overnight jump-starts are actually often faster than daytime because there's less traffic.",
    },
  ],

  "battery-replacement": [
    {
      q: "What brands and types of batteries do you stock?",
      a: "Common group sizes (24F, 34, 35, 48, 49, 65, 75, 78, 94R, plus European DIN sizes) in AGM and flooded lead-acid configurations. AGM is required for start-stop system vehicles and is recommended for most modern cars. We stock mainstream brands (Interstate, Exide, Duralast, DieHard) — mid-tier to premium quality, with warranty ranging from 2 to 7 years depending on the battery.",
    },
    {
      q: "Will I lose my radio presets and settings?",
      a: "We use a memory saver device that maintains power to the vehicle's electronics during the swap. With the memory saver, you keep radio presets, clock, steering-wheel settings, and electronic configuration. On some older vehicles without the right port, we do have to disconnect — in which case radio presets and clock reset, but the vehicle learns back to normal within a few drives.",
    },
    {
      q: "Do you take my old battery?",
      a: "Yes, always. Lead-acid batteries need professional recycling, not curbside disposal. We take the old battery and deliver it to a licensed recycler. The core credit (if any) is factored into your invoice.",
    },
    {
      q: "How long will a new battery last in NYC?",
      a: "Typical battery life in NYC is 3-5 years for mainstream flooded batteries and 5-7 years for quality AGM. NYC's climate is harder on batteries than average — freeze-thaw cycles, road salt, and short-trip driving all shorten life. We recommend AGM for most modern vehicles because the longer life and better cold-weather performance pay off.",
    },
    {
      q: "Why does my luxury car need 'battery registration'?",
      a: "Many modern German and premium vehicles (BMW, Audi, Mercedes, VW, Porsche, and recent Ford/GM) track battery age and charge state. When you install a new battery, the car's computer needs to know a new battery is installed so it can run the correct charging profile. Without registration, the car keeps running the old battery's profile, which shortens the new battery's life. We carry scan tools that register the new battery to the BCM as part of the install.",
    },
  ],

  "gas-delivery": [
    {
      q: "How much fuel do you deliver?",
      a: "Standard delivery is 2 gallons, which is enough for any passenger car to start and reach the nearest gas station. For trucks, boat trailers, and other vehicles with larger tanks and higher consumption, we can deliver more on request. For diesel vehicles we deliver diesel — tell dispatch the fuel type on the call.",
    },
    {
      q: "What if I have a diesel vehicle?",
      a: "We deliver diesel on request. Make sure you specify diesel when you call — gasoline in a diesel tank is a serious problem that requires tank drain and flush before the vehicle will run again. We only deliver diesel when dispatch confirms the vehicle is diesel-compatible.",
    },
    {
      q: "Can you deliver in a tunnel or on a bridge?",
      a: "Tunnels and bridges have specific rules about stopped vehicles. NYPD or Port Authority has to manage the scene before we can enter. Call 911 first if you're in a tunnel. Bridge shoulder calls are possible but depend on the specific bridge — some have usable shoulders, others don't.",
    },
    {
      q: "Is the fuel at pump price or higher?",
      a: "Fuel is billed at our cost (pump price at the station we filled from) plus a small handling fee for the canister cycle. The call-out itself is a flat service fee separate from the fuel. Everything is itemized on the receipt.",
    },
    {
      q: "What if the car still won't start after I get fuel?",
      a: "Sometimes a car that ran completely out of gas needs a minute to prime the fuel system after the first small amount of fuel is added. Our driver will verify the vehicle starts and runs before leaving. If the vehicle still won't start, we can tow you to the nearest station or a shop — the fuel delivery fee credits toward the tow.",
    },
  ],

  "flat-tire-change": [
    {
      q: "Can you plug a tire on the side of the road?",
      a: "Yes, if the damage is in the tread area. A nail-in-tread puncture can usually be plugged on scene in about 20 minutes, and the tire holds reliably until you can get to a tire shop for a full patch on your own schedule. Sidewall damage is not repairable and requires tire replacement.",
    },
    {
      q: "What if I don't have a spare or the spare is flat too?",
      a: "Common problem — compact spares lose pressure over years of sitting in the trunk, and many newer cars ship with no spare at all. If we can plug or patch your existing tire, we do. If the tire is beyond curbside repair, we tow you to the nearest tire shop (the tire service fee credits toward the tow).",
    },
    {
      q: "Why shouldn't I just change the tire myself?",
      a: "On a narrow NYC highway shoulder with traffic 3 feet away, roadside tire changes are genuinely dangerous. The factory scissor jack and lug wrench that come with the car are also slow and frustrating to use. Our driver uses a hydraulic jack and impact wrench and gets the job done in a fraction of the time with proper scene protection.",
    },
    {
      q: "What if my lug nuts are locked?",
      a: "If you have the wheel-lock key, no problem. Without the key, we sometimes can't remove the locked nut without destroying the nut — in which case we either tow you to a shop that can extract it, or we can extract on scene with specialty tools for an additional fee. Best to keep the wheel-lock key in your glove compartment.",
    },
    {
      q: "Do I need to reset the TPMS after a tire change?",
      a: "Some vehicles require TPMS reset after any tire change; others auto-learn over a few drives. Our driver resets TPMS on vehicles that require it as part of the service. If your dash TPMS light stays on after a tire swap, tell dispatch and we can arrange a follow-up.",
    },
  ],

  "lockout-service": [
    {
      q: "Will you damage my car unlocking it?",
      a: "No. We use proper automotive lockout tools — long-reach tools and air wedges designed for the procedure. We don't use slim jims on vehicles with side-impact airbags in the door (which is most modern vehicles) because slim jims can damage the airbag module. Our procedure doesn't mark weatherstripping, dent door frames, or damage the door seal.",
    },
    {
      q: "What if a child or pet is locked in?",
      a: "Call 911 first — fire department and EMS respond in minutes and will break a window if inside temperature is dangerous. Call us simultaneously; we can be there in 20-30 minutes for non-emergency entry. For hot-day situations where internal temperature matters, emergency response is always the right first call.",
    },
    {
      q: "Can you make a new key on the spot?",
      a: "Sometimes, depending on the vehicle. Older vehicles with purely mechanical keys can have a new key cut by some locksmiths on scene. Modern vehicles with transponder keys or key fobs typically need dealer-level programming — we can get you into the vehicle, but key replacement for modern cars often requires a dealer or automotive locksmith specialist.",
    },
    {
      q: "Will you unlock a car that isn't mine?",
      a: "Only with proof of authorization. We require ID and ownership proof (registration, insurance, or similar) matching, or written authorization from the owner. We don't assist in situations that look like unauthorized access — and if the situation is suspicious, we may decline and call NYPD for their assessment.",
    },
    {
      q: "What if my fob battery is dead?",
      a: "We can replace the fob battery on scene — common CR2032 and CR2025 batteries are stocked on the trucks. Sometimes the fob battery is the whole problem: the car won't unlock wirelessly but the physical key blade (hidden inside most modern fobs) still opens the door manually. We can walk you through that or handle it for you.",
    },
  ],

  "winch-out-recovery": [
    {
      q: "What's the difference between winch-out and towing?",
      a: "Winch-out gets your vehicle free from being stuck — snow bank, mud, off the pavement, hung up on a curb. The vehicle is otherwise driveable and once freed, you drive away under your own power. Towing is transport of a non-driveable vehicle. If the winch-out reveals the vehicle is actually damaged enough that it can't drive (bent suspension, blown tire, etc.), we tow and credit the winch fee toward the tow.",
    },
    {
      q: "Can you pull my car out of a snowbank?",
      a: "Yes. Snowbank recovery is our highest-volume winch-out scenario during winter. We bring shovels, traction aids, and a heavy winch. Depending on how buried the vehicle is, the job takes 15-45 minutes. In major storms the response time lengthens because call volume spikes.",
    },
    {
      q: "What if my car is partly in water?",
      a: "Flooded-street recovery is a specific service. We pull the vehicle out of the water and onto higher ground, but we don't start a vehicle that's been partly submerged — water ingestion damage to the engine is possible and cranking a wet engine can hydrolock it. After extraction, we usually tow to a shop for inspection.",
    },
    {
      q: "Will the pull damage my vehicle?",
      a: "Correctly done, no. We use factory tow points and pull at safe angles. Incorrectly done, a winch-out can bend a bumper or damage a control arm. Our drivers are trained on proper recovery procedures and know where each vehicle's factory tow points are.",
    },
    {
      q: "Can you help on private property or in a parking lot?",
      a: "Yes. Winch-out on private property is often simpler than public-street recovery because we don't need scene protection for traffic. Tell dispatch the situation and we'll dispatch appropriately.",
    },
  ],

  "winter-snow-extraction": [
    {
      q: "How long does snow extraction take?",
      a: "For a standard plowed-in vehicle, 20-40 minutes including shoveling. For deeply buried vehicles (6+ inches of snow on the vehicle), 45-90 minutes. Ice-locked-to-curb situations can take longer if chopping or melting is needed. Tell dispatch the situation and we'll estimate based on the specific conditions.",
    },
    {
      q: "Can you extract during an active snowstorm?",
      a: "Sometimes. We operate when conditions are safe for the driver and the recovery truck. Heavy wind and zero-visibility storms force us to postpone until conditions improve. Active light-to-moderate snow is fine. Dispatch assesses at the time of the call.",
    },
    {
      q: "What if I'm plowed in on an alt-side suspended day?",
      a: "This is our most common winter extraction scenario. The city suspends alt-side parking during snow emergencies so vehicles can stay in place, but the plows still come through and pile snow against parked cars. We dig out the berm in front of and behind your tires, winch if needed, and get you free. Do this before alt-side resumes so you don't also catch a ticket.",
    },
    {
      q: "Do you bring chains for my tires?",
      a: "We carry tire chains we can install temporarily if your vehicle needs them to move after extraction. Some AWD and 4WD vehicles do fine on snow tires alone; front-wheel-drive and rear-wheel-drive cars often benefit from chains until they reach plowed roads. Tell dispatch the drivetrain and we'll plan accordingly.",
    },
    {
      q: "What does extraction cost vs. just paying for a tow?",
      a: "Extraction is flat-rate per call, significantly less than a full tow. Most extractions end with the vehicle driving away under its own power. If the vehicle can't drive after extraction (damaged while stuck, dead battery from sitting through the storm), we tow and credit the extraction fee toward the tow.",
    },
  ],

  "mobile-mechanic-on-site-repairs": [
    {
      q: "What kinds of repairs can you actually do on scene?",
      a: "Minor electrical (fuses, relays, terminal cleaning, ground straps, loose wires), simple cooling system work (hose replacement, coolant top-off, thermostat swap on many vehicles), basic sensor replacement (O2, coolant temp, crank, cam, MAP), serpentine belt replacement on vehicles where the routing isn't excessive, and battery replacement with registration to the BCM. We don't do major engine work, transmission work, or anything that requires a lift.",
    },
    {
      q: "How do I know if my problem is fixable curbside?",
      a: "Call dispatch and describe the symptoms. We'll ask about the check-engine code if you have it, whether the vehicle cranks, whether accessories work, and similar diagnostic questions. The dispatcher will give you a preliminary assessment; the driver does the actual diagnosis on scene. If the problem turns out to be beyond curbside repair, we tow to a shop and credit the diagnostic fee.",
    },
    {
      q: "Do you have the parts to fix my specific car?",
      a: "Common parts (fuses, relays, common sensors, hoses, belts, batteries) are stocked on the trucks. Brand-specific or model-specific parts we source from local auto-parts distributors — NYC's parts network is dense enough that we can get most common repair parts within 30-60 minutes. If the part has to come from a dealer and the wait is days, we recommend a tow to the shop.",
    },
    {
      q: "Is curbside repair cheaper than going to a shop?",
      a: "Usually yes, significantly. Shop rates in NYC run $125-200+ per hour labor, plus shop fees, plus the time you lose for the visit. Curbside repair is a flat diagnostic fee plus parts at cost-plus-modest-markup plus labor by the job. For a simple sensor swap that takes 20 minutes, you'll save $100+ vs the dealer or independent shop.",
    },
    {
      q: "What if my car needs more work than you can do on scene?",
      a: "We'll tell you. Honest assessment is the whole point — if the fix isn't doable on the curb, we recommend a tow to the appropriate shop (specialty if you need it, generalist if not) and credit the diagnostic fee toward the tow. We're not trying to upsell a curbside repair that won't solve the real problem.",
    },
  ],

  "junk-car-removal": [
    {
      q: "Will you pay cash for my junk car?",
      a: "For cars with scrap value (weight, catalytic converter, aluminum wheels), yes — we quote a cash offer on the phone based on year, make, model, and condition. For cars with low or zero scrap value (older small cars with no catalytic converter, rusted-out frames), there's a flat pickup fee instead of a cash offer. Either way, the quote is given on the phone before we dispatch.",
    },
    {
      q: "What if I don't have the title?",
      a: "We can still help in most cases, depending on how the title was lost. NYS offers title recovery through DMV that takes 2-4 weeks. For estate situations where the owner is deceased, executor or administrator paperwork substitutes for the title. For cases where the title genuinely can't be recovered, we have procedures for 'titleless' scrap under specific conditions.",
    },
    {
      q: "Do I need to drain fluids or prep the car?",
      a: "No. We handle fluid drain procedures at the scrapyard with proper environmental handling. Just pull your personal items out of the car before we arrive, and remove the license plates so you can surrender them to NYS DMV.",
    },
    {
      q: "What happens to the car after you take it?",
      a: "The car goes to a licensed NYC-area scrapyard for dismantling and crushing. Valuable components (catalytic converter, aluminum wheels, re-sellable parts) are removed before crushing. The frame and body go into the scrap-metal pipeline that ultimately feeds new steel production. We provide you the scrapyard's receipt for your records.",
    },
    {
      q: "Can you remove a car from a public street?",
      a: "On public streets, the removal requires either owner authorization (and us confirming ownership matches the plate and title) or the NYC DOT abandoned-vehicle process. We handle both. On private property (driveway, lot, garage), owner authorization is sufficient.",
    },
  ],

  "illegally-parked-towing": [
    {
      q: "Do I need to post signs before towing from my lot?",
      a: "Yes. NYC DCWP requires compliant signage before any private-property tow can happen legally — specific language, font size, and placement. We verify signage during account setup and can recommend compliant signs if you need them. Without compliant signage, a tow can be challenged and you can face DCWP penalties.",
    },
    {
      q: "How fast can you respond to an illegal-parking call?",
      a: "20-40 minutes typical, depending on borough and time of day. For property managers with ongoing accounts, we can schedule periodic patrol (driving the lot on a set schedule to identify violators) which reduces per-call response time and catches habitual violators.",
    },
    {
      q: "Who pays for the tow?",
      a: "The vehicle owner pays at release from the impound, per DCWP-capped rates. Property owners pay nothing out of pocket in most cases. For situations where the property owner wants immediate removal without waiting for vehicle owner payment, direct-billing to the property is possible.",
    },
    {
      q: "What if the driver argues during the tow?",
      a: "Our drivers are trained on de-escalation and follow a specific protocol. If the vehicle hasn't been hooked up yet, we usually allow the driver to move their vehicle voluntarily (documentation preserved). If the hookup is complete and the driver appears on scene, the tow proceeds; the driver can pay at the impound for release. We don't engage in physical confrontation — NYPD gets called if a situation escalates.",
    },
    {
      q: "Can you tow cars blocking a fire lane?",
      a: "Yes. Fire lane violations have special standing under NYC fire code and allow immediate tow without a waiting period. Photos document the violation; the tow happens quickly. Fire lanes on commercial property must be clearly marked per fire code for the tow to be legal.",
    },
  ],

  "impound-recovery": [
    {
      q: "How do I know which pound my car is at?",
      a: "Call 311 or use the NYC DOF parking ticket search at nyc.gov/finance. You'll need the plate number. The system tells you where the vehicle was towed, the reason for the tow, and any outstanding judgments. We can also help figure out the pound during our intake call.",
    },
    {
      q: "What do I need to retrieve my car?",
      a: "Valid driver's license, the vehicle's registration, current insurance card, and proof that any outstanding ticket judgments have been paid. For NYPD pounds, specific payment methods are required for the release fee (certified check, money order, or credit card). We handle all of this when you authorize us to retrieve on your behalf.",
    },
    {
      q: "How long does the process take?",
      a: "NYPD pounds can take 3-5 hours on a weekday with lines. Saturday mornings are often longer. Our recovery service compresses that time because we know the procedure and handle the paperwork efficiently — typical recovery is 2-3 hours from start to drop-off.",
    },
    {
      q: "Can you bring the car to me?",
      a: "Yes. We retrieve from the pound and deliver to any address in the five boroughs — home, work, shop, storage facility. Delivery outside the boroughs is available with additional per-mile charge.",
    },
    {
      q: "What if my car was towed for unpaid tickets?",
      a: "You need to pay all outstanding ticket judgments before the car can be released — the pound won't release without proof of payment. We can help with this: pay tickets online at nyc.gov/finance before or during the recovery, then we use that proof at the pound counter.",
    },
  ],

  "abandoned-vehicle-removal": [
    {
      q: "How long before a vehicle is considered abandoned?",
      a: "On public streets, NYC DOT's abandoned-vehicle process requires specific observation periods and posting before removal — typically 3-5 days after initial posting. On private property, authorization from the property owner is sufficient, though documented attempts to contact the vehicle's registered owner are recommended.",
    },
    {
      q: "Do I need to go through NYC DOT for a vehicle on my property?",
      a: "No — private-property abandonment doesn't require DOT involvement as long as you have authorization. For public-street abandonment adjacent to your property, DOT's process applies and is usually slow. Many property managers coordinate with us on a private basis for street-abandoned vehicles that DOT hasn't moved on.",
    },
    {
      q: "What if the vehicle has sentimental or legal issues?",
      a: "Estate vehicles, vehicles subject to divorce proceedings, vehicles with contested ownership — all require additional documentation before removal. We work with property owners' attorneys on these edge cases to ensure the removal is legal and documented.",
    },
    {
      q: "Can you scrap the vehicle for me?",
      a: "Yes. If the vehicle has title and authorization is clear, we scrap at licensed yards and provide you the receipt. If there's scrap value, it credits against the removal fee.",
    },
    {
      q: "What about the plates?",
      a: "Plates should be surrendered to NYS DMV to cancel registration. We can hand you the plates from the vehicle at pickup, and you handle the DMV surrender. This protects you from future liability if someone else uses the plates.",
    },
  ],

  "ev-tesla-towing": [
    {
      q: "Why do EVs require flatbed?",
      a: "EV drive wheels cannot spin during towing. When drive wheels spin, the motor generates back-EMF (reverse current) that damages the inverter and motor controller. Every major EV manufacturer — Tesla, Rivian, Lucid, Ford Lightning, Hyundai Ioniq, Kia EV6, all of them — explicitly requires flatbed transport with drive wheels off the ground. Towing an EV with wheels on the ground causes expensive drive-unit damage and voids warranty.",
    },
    {
      q: "What is Tesla's 'transport mode' and why does it matter?",
      a: "Transport mode disables the electronic parking brake and some safety interlocks so the vehicle can be winched onto a flatbed. Without transport mode, the Tesla locks the wheels and can't be loaded. The procedure varies by model (Model S, Model 3, Model X, Model Y all have slightly different menus). Our drivers know the procedure; the vehicle's manual also documents it.",
    },
    {
      q: "What if my 12V auxiliary battery is dead?",
      a: "A dead 12V locks the Tesla (or other EV) out — the car's computers can't boot and the doors won't unlock, even with a fully-charged main battery. We can jump the 12V on scene using access points specific to each EV, which usually wakes the car up enough to go into transport mode. If the 12V won't hold a charge at all, we replace it.",
    },
    {
      q: "Can you take my EV to a Supercharger?",
      a: "Yes. If your EV ran out of main battery and just needs a charge, we flatbed it to the nearest Supercharger or Level 2 charger. If the vehicle has a software or hardware issue, we route to the manufacturer's service center — Tesla in Manhattan, Brooklyn, LIC, or the NJ locations; Rivian in Gaithersburg MD; Lucid in Millburn NJ.",
    },
    {
      q: "Does the Tesla app's roadside coordinate with you?",
      a: "Tesla's roadside feature in the app can request roadside through third-party operators, and we're part of that network in NYC. For Tesla owners, requesting through the app is often faster because the vehicle's location and status auto-transmit and the routing is automatic.",
    },
  ],

  "luxury-exotic-towing": [
    {
      q: "What makes exotic towing different from regular towing?",
      a: "The equipment and the driver. Exotics sit 3-4 inches off the ground; standard flatbed ramps scrape. We use low-angle hydraulic flatbeds with wooden ramp extensions. Tie-downs go to factory tow hooks or subframe points only, never to body panels or control arms. Drivers assigned to exotic calls are specifically cleared and experienced — we don't let generalists load a Lamborghini.",
    },
    {
      q: "Do you carry enough insurance for a $300K car?",
      a: "Yes. Standard tow-operator insurance isn't adequate for exotics; we carry elevated cargo insurance specifically for high-value vehicles. Coverage amounts are available on request for customers who need to verify before authorizing transport.",
    },
    {
      q: "Can you do enclosed transport?",
      a: "Yes. For concours-quality vehicles, fresh paint, original paint classics, or any vehicle where weather and road grime exposure matter, enclosed transport is the right choice. Enclosed runs about twice the rate of open flatbed because the trailer is a more expensive asset. Scheduling typically requires 24-72 hours lead time for enclosed.",
    },
    {
      q: "Will the driver know how to handle my specific car?",
      a: "Yes — drivers assigned to exotic transport are familiar with the major brands and models (Ferrari, Lamborghini, Porsche, Rolls-Royce, Bentley, McLaren, Koenigsegg). If your vehicle has specific considerations (air suspension settings, active aero modes, factory tow-hook requirements), tell dispatch and we brief the driver accordingly.",
    },
    {
      q: "Can you transport to an auction or concours?",
      a: "Yes. Greenwich Concours, Amelia Island, Pebble Beach, The Quail, Hershey AACA, and specialty auctions (RM Sotheby's, Gooding, Bonhams) are regular destinations. For cross-country events, we coordinate driver rotation to meet DOT hours-of-service rules and arrival timing.",
    },
  ],

  "insurance-claim-towing": [
    {
      q: "Which carriers do you work with directly?",
      a: "Direct-bill relationships with Geico, State Farm, Allstate, Progressive, USAA, Liberty Mutual, Farmers, Nationwide, Travelers, AAA, and most regional carriers. For carriers we don't have direct-bill with, we collect payment up front and provide a detailed receipt for reimbursement.",
    },
    {
      q: "Will I pay anything out of pocket?",
      a: "Typically no, for insurance-covered tows. Most NYC auto policies include tow coverage after a collision regardless of fault, and we bill the carrier directly. Your deductible may apply to the repair, but the tow itself is usually covered without out-of-pocket cost. For at-fault situations with specific exclusions, out-of-pocket may apply and we'll tell you before the tow.",
    },
    {
      q: "How does the carrier know the tow is legitimate?",
      a: "Claim number, documentation, and established direct-bill relationships. We document the scene (photos, time-stamps, vehicle condition), match the tow to the claim number on the intake, and submit the invoice through the carrier's established process. Fraud enforcement has made carriers cautious about tow operators without clean records; we maintain approved-vendor status with all major carriers.",
    },
    {
      q: "What if the claim is denied or coverage is uncertain?",
      a: "We collect payment up front in those cases and provide an itemized receipt you can submit for reimbursement. Many customers who pay up front end up reimbursed in full once the claim processes.",
    },
    {
      q: "Can you deliver to my preferred body shop?",
      a: "Yes. You have the right to choose the shop, and we deliver wherever you specify. Your insurance may have preferred-shop direct-repair networks that offer faster claim processing, but the choice is yours.",
    },
  ],

  "auto-body-collision-delivery": [
    {
      q: "Does my body shop accept deliveries from you?",
      a: "Most NYC body shops do. We have established relationships with shops in Long Island City, Maspeth, East Williamsburg, Hunts Point, Travis, and most of the brand-specific specialty shops across the boroughs. For shops we haven't worked with before, we call ahead to confirm receiving procedures before dispatch.",
    },
    {
      q: "Will the shop know the vehicle's arriving?",
      a: "Yes — we call ahead before departure with the ETA, vehicle details, and damage notes. The shop can prepare a bay, alert their adjuster, or queue the vehicle in their intake system before we arrive.",
    },
    {
      q: "Can you deliver after hours?",
      a: "Depends on the shop. Many NYC body shops have after-hours drop procedures (lockbox for keys, surveillance, sealed-envelope paperwork). Some don't. We confirm receiving procedures with the shop during intake.",
    },
    {
      q: "What if the shop is full and can't accept the vehicle?",
      a: "We find a secondary destination — your second-choice shop, our secure storage facility while the shop frees up space, or a staging lot near the shop. Communication with the shop before departure avoids this in most cases.",
    },
    {
      q: "Do you take photos for the shop?",
      a: "Yes. Condition-report photos at pickup and delivery become part of the shop's repair order and the insurance claim. The photo set protects both of us (and you) on damage-accountability questions.",
    },
  ],

  "boat-trailer-towing": [
    {
      q: "Can you tow a boat trailer with a boat on it?",
      a: "Yes, for trailers under about 10,000 lbs total. Larger boat-plus-trailer combinations require heavy-duty wrecker service — the weight and handling exceed standard trailer-recovery equipment. Tell dispatch the boat length, beam, and the total combined weight for correct truck assignment.",
    },
    {
      q: "Where can you take my trailer?",
      a: "Your marina, storage lot, home, boat shop, or trailer-repair shop. We know the receiving procedures at most NYC-area marinas — Sheepshead Bay, Gateway, City Island, Flushing Bay, Staten Island yacht clubs. For out-of-NYC destinations, we quote as flat-rate long-distance.",
    },
    {
      q: "What about bearing failures mid-trip?",
      a: "Bearing failures are our most common trailer call. If the bearing is hot but the wheel is still rolling, we can sometimes get you to the nearest trailer shop on a limp-along basis. If the wheel has seized, we winch onto a flatbed. Either way, the goal is getting off the shoulder safely and to a shop that can do the bearing repack.",
    },
    {
      q: "Do you handle jet ski trailers?",
      a: "Yes, jet ski trailers are usually simpler — lighter, smaller, easier to load. Flat tire swaps and bearing failures on jet ski trailers are our bread-and-butter summer calls from Sheepshead Bay, the Rockaways, and the Long Island shore.",
    },
    {
      q: "What about utility trailers and car haulers?",
      a: "Same service — whether it's a 6-by-12 landscaping trailer or a 20-foot car hauler, we handle it. Commercial trailer operators (landscapers, contractors, car transporters) often set up fleet accounts for predictable pricing on recurring trailer recovery needs.",
    },
  ],

  "classic-antique-car-transport": [
    {
      q: "Open or enclosed — which should I choose?",
      a: "Enclosed for concours-quality vehicles, fresh paint, original paint survivors, wire-wheel classics, anything over $100K appraised, and any vehicle where weather exposure matters. Open flatbed for drivers, non-show-quality vehicles, and short-distance moves where weather isn't a factor. Cost difference is significant but so is the protection.",
    },
    {
      q: "Does your insurance cover my Duesenberg, Packard, or early Ferrari?",
      a: "We carry elevated cargo insurance for high-value classics. Coverage amounts scale with appraised value. For especially valuable vehicles (six-figure-plus), we recommend confirming your own collector-car policy covers transport and verifying our supplemental coverage before authorizing the move.",
    },
    {
      q: "Can you transport to Amelia Island, Pebble Beach, or Greenwich?",
      a: "Yes. Greenwich Concours is a same-day drive from NYC. Amelia Island is a 2-3 day move depending on driver hours-of-service. Pebble Beach is a 7-10 day cross-country run with driver rotation. All are regular routes we run seasonally.",
    },
    {
      q: "Do you handle pre-war vehicles differently?",
      a: "Yes. Pre-war frames weren't designed for modern tow-hook strapping. We use soft straps at specific subframe or chassis points, avoid winch-line pressure on fragile frame sections, and we've mapped the correct tie-down points for all the common pre-war marques (Packard, Duesenberg, early Cadillac, Ford Model T/A, pre-war Mercedes, Bugatti, etc.).",
    },
    {
      q: "Can you coordinate pickup from a storage facility?",
      a: "Yes. We work regularly with climate-controlled collector storage in NYC (LIC, Greenpoint, specific Manhattan buildings) and understand their access procedures. For pickup from remote collections, we coordinate with the facility manager on timing and access.",
    },
  ],

  "fleet-towing": [
    {
      q: "How do I set up a fleet account?",
      a: "Call our fleet line at (212) 470-4068 and ask for account setup. We'll collect your operational details, COI requirements, unit numbers or VIN range, preferred service destinations, and billing contact. Account activation takes 24-48 hours, and you have account numbers and a dedicated dispatcher before the first call.",
    },
    {
      q: "What's the difference between fleet dispatch and regular dispatch?",
      a: "Fleet accounts get priority routing (ahead of walk-up calls), consistent drivers familiar with your vehicles and yards, pre-agreed pricing without per-call negotiation, and consolidated monthly invoicing with net-30 terms. The dispatcher you talk to for fleet calls is the one assigned to your account, not a general intake operator.",
    },
    {
      q: "Do you integrate with fleet management systems?",
      a: "Yes, with the common systems (Fleetio, Samsara, Verizon Connect, GPS Insight, and others). Condition-report photos, arrival timestamps, and invoices sync automatically where integration is available. For systems we haven't integrated with, we provide clean data exports.",
    },
    {
      q: "What's the pricing structure?",
      a: "Volume-based contracts with tiered per-call rates. Monthly minimums exchange for lower per-call rates. The break-even varies by operation; for fleets doing 20+ tows per month, the savings vs per-call pricing are substantial.",
    },
    {
      q: "Can you handle fleet accident recovery with DOT documentation?",
      a: "Yes. Commercial vehicle accident recovery with DOT-compliant documentation, insurance coordination, and direct-billing to the fleet's commercial policy is standard for our commercial accounts. We maintain the paperwork trail your safety manager needs.",
    },
  ],

  "commercial-towing": [
    {
      q: "Do you move hazmat?",
      a: "No. Hazardous material recovery requires licensed hazmat operators with specific training, equipment, and insurance. If your commercial vehicle carries hazmat and breaks down, the shipper must coordinate with a licensed hazmat recovery operator. We can handle the vehicle after hazmat is cleared, or coordinate with the hazmat operator on scene handoff.",
    },
    {
      q: "Can you handle oversized loads or oversize permits?",
      a: "Oversized loads with active permits may require specialty recovery operators — especially loads exceeding standard Class 8 dimensions. For standard Class 6-8 commercial vehicles (most box trucks, sprinter vans, tractors, large dump trucks), we handle routinely. Tell dispatch the exact vehicle class, GVWR, and load so we can size the truck correctly.",
    },
    {
      q: "What about cargo during a breakdown?",
      a: "We preserve cargo during recovery — stabilize shifted loads, tarp exposed loads, secure loose cargo. We don't transfer cargo to another truck on scene (that's the shipper's or receiver's call). For time-sensitive cargo, we coordinate with your dispatch on alternative arrangements.",
    },
    {
      q: "Do you coordinate with state DOT inspectors?",
      a: "Yes. DOT roadside inspections sometimes identify out-of-service conditions that require the truck to be towed to a shop before it can return to service. We coordinate with the inspector, generate the required paperwork, and tow to your chosen shop.",
    },
    {
      q: "How does billing work for commercial accounts?",
      a: "Net-30 invoicing on a consolidated monthly statement. Each tow is itemized with hook-up, winch, cargo handling, miles, and drop fee on separate lines. DOT-compliant documentation attaches to each invoice. Insurance tows on commercial policies are direct-billed to the carrier.",
    },
  ],

  "emergency-247-towing": [
    {
      q: "Is dispatch really 24/7 or just an answering service overnight?",
      a: "Really 24/7. The same dispatcher who answers at noon answers at midnight — not an answering service, not a voicemail, not a remote call-center. Overnight staffing is thinner than daytime but it's real dispatch with real routing authority.",
    },
    {
      q: "How many trucks do you run overnight?",
      a: "We don't publish exact fleet numbers publicly, but we maintain coverage in every borough 24/7. Overnight staging is lower than peak daytime but trucks are always on the road responding to calls. Response times overnight are often faster than daytime because traffic is lower.",
    },
    {
      q: "Do you dispatch during snowstorms?",
      a: "Yes, when it's safe for the driver and truck. Heavy wind, zero-visibility blizzards, and conditions where the plows can't keep up force us to postpone until conditions improve. Moderate snow is routine and we run through it.",
    },
    {
      q: "What about holidays?",
      a: "Same service, same rate. Thanksgiving, Christmas, New Year's Eve, July 4th — dispatch runs and trucks respond. Holiday volume sometimes exceeds weekday volume (travel, snowstorms combined with holiday weekends), and we plan staffing accordingly.",
    },
    {
      q: "Are overnight drivers the same drivers as daytime?",
      a: "Overnight shift is its own rotation — drivers specifically choose overnight and have training and experience for the specific challenges (less visibility, fewer traffic control options, more weather exposure). They're full employees on our team, not gig contractors.",
    },
  ],

  "dealer-auto-transport": [
    {
      q: "How much volume qualifies as a fleet account?",
      a: "No formal minimum, but dealers running 10+ moves per month see meaningful savings vs per-call pricing. For 20+ moves per month, we assign a dedicated account manager. Single-store independents can still use us on per-call rates.",
    },
    {
      q: "Do you handle auction pickups?",
      a: "Yes. Regular runs to Manheim (Pennsylvania), ADESA Newark, IAA and Copart facilities in the tri-state, and specialty auctions on a scheduled basis. For high-value auction pickups (especially from specialty auctions like Barrett-Jackson, Mecum, RM Sotheby's), enclosed transport is available.",
    },
    {
      q: "What about customer delivery to a home address?",
      a: "Yes. Customer delivery is a growing part of dealer transport as online car sales grow. We handle key handoff procedures, customer walkthrough if required, and photographic condition report on delivery.",
    },
    {
      q: "Can you integrate with my DMS?",
      a: "Yes, with the common dealer management systems (CDK, Reynolds, DealerTrack, and others). Condition reports, arrival timestamps, and invoices sync automatically. For proprietary or less-common DMS, we provide clean data exports.",
    },
    {
      q: "Do you handle wholesale moves too?",
      a: "Yes. Wholesale transport between dealer and wholesaler, between auction and wholesaler, or between wholesaler and specialty lot is all standard. Pricing scales with volume and vehicle class.",
    },
  ],
};

/** Resolve FAQs for a specific service: 3 global + up to 8 service-specific */
export function getServiceFAQs(slug: string): ServiceFAQ[] {
  const serviceSpecific = SERVICE_FAQS[slug] ?? [];
  return [...serviceSpecific, ...GLOBAL_FAQS];
}

/** Defensive helper: verify all services have FAQ coverage */
export function getAllServicesWithFAQCoverage(): string[] {
  return SERVICES.map((s) => s.slug).filter((slug) => !(slug in SERVICE_FAQS));
}
