import { PHONE } from "./content";
import { Service, SERVICES, SERVICE_CATEGORIES } from "./services";

// ============================================================
// BOROUGH PAGE CONTENT (legacy param name: "state")
// ============================================================
export function statePageContent(stateName: string, stateAbbr: string, cities: { name: string; slug: string }[]) {
  const topCities = cities.slice(0, 10);
  const sc = SERVICES.length;

  return {
    title: `${stateName} Tow Truck Service Near Me — 24/7 Towing in ${stateName}, NYC`,
    metaDescription: `${stateName} tow truck service near you — 24/7 dispatch across ${cities.length}+ ${stateName} neighborhoods. Light-duty, heavy-duty, flatbed, battery, tire, lockout, gas. Flat-rate pricing, 20–40 min arrival. Call ${PHONE}.`,
    heroSubtitle: `${cities.length} ${stateName} Neighborhoods Covered`,
    sections: [
      {
        heading: `Towing & Roadside in ${stateName} — 24/7, Every Neighborhood`,
        paragraphs: [
          `The NYC Towing Service runs trucks in ${stateName} around the clock. We cover ${cities.length} neighborhoods across the borough with a dispatch hub and multiple staged trucks, which is why we can promise 20–40 minute arrivals on most calls. Whether you are stranded on a narrow residential block, stuck in a loading zone, or broken down on one of the bridges or tunnels that feed ${stateName}, we can get to you faster than any national chain or AAA-subcontracted tow.`,
          `What we do in ${stateName}: light-duty towing for cars, sedans, and compact SUVs. Heavy-duty towing for box trucks, sprinter vans, and oversized vehicles. Flatbed for AWD, EVs, luxury, and anything going more than a few miles. Motorcycle towing. Accident and collision recovery. Junk car pickup. And every type of roadside call — dead battery, flat tire, keys locked in, out of gas, stuck in snow or a ditch. One phone number for all of it.`,
          `We understand ${stateName} traffic and parking enforcement. Our dispatchers run live routing that accounts for which bridges and tunnels are backed up right now, which streets are closed for construction or markets, where the NYPD tow trucks are already active, and where the alternate-side-parking rules just flipped. That routing intelligence is worth 30 minutes on every rush-hour call. A tow operator who does not live and work here cannot match it.`,
          `Flat-rate pricing, quoted before we dispatch. Light-duty tows start at $125 base, flatbed starts at $175, and standard roadside (battery, tire, lockout, gas) is $85 per call. No NYC surcharge after the fact. No "storage fee" that appears when you arrive at the drop. No after-hours markup — overnight and holiday rates match daytime rates. If the rate changes because the job changed, we tell you before we start, not after.`,
        ],
      },
      {
        heading: `How a ${stateName} Tow Call Works`,
        paragraphs: [
          `Step one: call ${PHONE}. Tell the dispatcher the cross-streets or nearest intersection (you do not need the exact address if you are not sure — "corner of 4th and Smith" works), what is wrong with the vehicle, and where you need it to go. The call takes about 90 seconds. No phone tree, no call center in another state, no transfer to a subcontractor.`,
          `Step two: we quote you a flat rate on the phone and give you a truck number, a driver name, and a live ETA. If you want to see the truck en route, we can send a GPS tracking link to your phone. ETAs are honest — if traffic is bad or there is a queue of calls ahead of yours, the dispatcher will tell you and offer options.`,
          `Step three: driver arrives, confirms vehicle condition with you, takes timestamped photos (for your records and for ours), and walks through what is about to happen. If it is a tow, you see the tie-downs or wheel-lift hookup before the truck moves. If it is roadside, you see the exact tool or part before it touches the vehicle. Nothing happens out of sight.`,
          `Step four: job done, you pay the quoted rate, and the receipt is emailed immediately. Most major cards, Apple Pay, Google Pay, and cash all accepted. For accident tows, we bill insurance directly in most cases — you provide carrier info and we handle the paperwork.`,
          `If the job changes mid-call — say, a jump-start turns into a tow because the alternator is dead — we tell you the new rate before we start and credit the roadside fee against the tow. No double-billing, no bait-and-switch.`,
        ],
      },
      {
        heading: `${sc} Services Available in ${stateName}`,
        paragraphs: [
          `We run ${sc} distinct services in ${stateName}, all dispatched from the same ${stateAbbr} number, all staffed by drivers who live and work in the borough. Each service below links to a dedicated page with details, pricing, and common scenarios.`,
          `Light-duty and motorcycle towing handle the standard breakdown — a car that won't start, a bike that went down, a vehicle that needs to go from where it sits to a shop or home. Heavy-duty, flatbed, accident recovery, and long-distance towing handle everything the light-duty rigs cannot — AWD cars, EVs, oversized trucks, collisions, and runs out to the suburbs or out of state.`,
          `Roadside services cover the jobs that do not require a tow: jump-starting a dead battery (we test the alternator before we leave so you do not get stuck again two blocks later), mounting a spare or plugging a punctured tire on scene, unlocking a car when the keys are inside, delivering fuel when you ran out, and winching a vehicle that is stuck in snow, mud, or off-pavement. All flat-rate, all 24/7.`,
          `Specialty services in ${stateName} include junk car removal (we pay cash for scrap when the vehicle has weight and value), private-property tows for landlords and property managers dealing with unauthorized parking, impound recovery if NYPD or a private tow already took your vehicle, and legal abandoned-vehicle removal following NYC DOT process. For commercial clients, fleet accounts with dedicated dispatch, net-30 billing, and priority routing.`,
        ],
      },
      {
        heading: `Why ${stateName} Drivers Call Us`,
        paragraphs: [
          `Every national roadside network — AAA, Allstate Motor Club, BMW Roadside, Mercedes Roadside, the one built into your credit card — operates the same way: they subcontract to whoever is cheapest and nearest. That means the driver who shows up at your stranded car in ${stateName} is often someone with no incentive to take good care of your vehicle or your time. We are the local operator those networks are supposed to call when they are doing the job right. When you call us directly, you skip the dispatch markup and the subcontractor chain.`,
          `Our ${stateName} drivers are W-2 employees, not gig workers. They train on every common vehicle type, every tie-down configuration, and every NYC-specific hazard (streetcar tracks, bike lane curbing, low-clearance tunnels, no-turn restrictions). They carry proper equipment on every truck — soft straps for motorcycles, wheel skates for vehicles with flat tires, EV-specific dollies, battery testers, lockout kits.`,
          `We are fully licensed: NYC DCWP tow license, commercial auto, garage liability, and on-hook insurance on every vehicle we pick up. That last one matters — a lot of NYC tow operators carry auto insurance on the truck but not on-hook insurance on what they are hauling. If something happens to your car in transit, the truck operator's auto policy does not cover it. Ours does.`,
          `Environmental and safety practices matter too. Drained EV batteries get handled per manufacturer specs. Junk car fluids get reclaimed at licensed scrap yards. Accident-scene debris gets cleaned up properly (we carry absorbent, brooms, and dustpans on every accident rig) so the scene does not become the next breakdown.`,
          `And we answer the phone. 24/7, every day, every holiday. Not a voicemail, not a chatbot, not "please hold for the next available operator." A live NYC dispatcher who can route a truck to you in 20–40 minutes.`,
        ],
      },
      {
        heading: `Towing & Roadside Pricing in ${stateName}`,
        paragraphs: [
          `Light-duty tow in ${stateName}: $125 base hook-up plus $4 per mile beyond the first five miles. That covers cars, sedans, compact SUVs, and anything under about 10,000 lbs gross weight. Wheel-lift trucks handle these — they fit in tighter spaces than full flatbeds.`,
          `Flatbed tow: $175 base hook-up plus $5 per mile beyond the first five. Required for AWD and 4WD vehicles, EVs, low-clearance sports and luxury cars, motorcycles, and any tow going more than roughly 20 miles (anywhere past the city line). If you are not sure whether your car needs flatbed, tell dispatch the year/make/model — we know the answer for every common vehicle on the road.`,
          `Heavy-duty tow: quoted per job based on vehicle weight, distance, and complexity. For box trucks, sprinter vans, oversized SUVs, and commercial vehicles above roughly 10,000 lbs GVWR. Heavy wreckers, integrated booms, and axle ratings that actually match the load.`,
          `Roadside flat rate: $85 per call for jump-start, flat-tire change, lockout, or gas delivery. Winch-out from snow, mud, or a ditch starts at $125 depending on the recovery difficulty. Any fuel delivered is billed at cost plus a small handling fee on top of the service rate.`,
          `No hidden fees. No "NYC surcharge" that shows up on the invoice after the fact. No storage fee on same-day drops. No after-hours markup. If the job complexity changes (a jump turns into a tow, a tow to one location has to be redirected to a different one), we quote the new rate before we execute — never after.`,
        ],
      },
      {
        heading: `When to Call (and When Not to)`,
        paragraphs: [
          `Call us for any non-emergency breakdown, roadside issue, or planned vehicle transport in ${stateName}. If your car stalled in a parking spot, your battery is dead in your driveway, your tire went flat on the shoulder, you locked the keys inside, or you need to move a vehicle between shops — we are who to call. Same goes for junk cars, impound recovery, and private-property enforcement.`,
          `Do NOT call us first if the vehicle is blocking a travel lane on an active highway or the bridge/tunnel decks. Call 911 first — NYPD and the bridge authority need to secure the scene before any tow operator can safely approach. Once the scene is managed, we can take the tow. Same rule if anyone is injured: 911, FDNY, then us.`,
          `Do call us if your vehicle is in a dangerous spot but not in an active travel lane — a pulled-over spot on the highway shoulder, a disabled vehicle in a crosswalk, a car leaking fluid onto the sidewalk. We can arrive in 20–40 minutes on most of those. While you wait, stay out of the travel lanes, turn on hazards, and if you have a triangle or flares, set them up at least 50 feet behind the vehicle.`,
        ],
      },
      {
        heading: `Same-Day and Scheduled Service Across ${stateName}`,
        paragraphs: [
          `Most calls in ${stateName} are same-day — the vehicle broke down, and the tow happens now. Dispatch routes the nearest available truck, we quote the flat rate on the phone, and arrival is typically 20–40 minutes. Peak rush hour (5–7 PM weekdays) and snowstorms can extend that, and dispatch will always give you a live, honest ETA.`,
          `Scheduled tows also work — if you have a car that needs to go from home to a shop on a specific day, or a non-running vehicle that needs to come off a block before street cleaning, we can schedule 24–48 hours ahead and hit a specific 30-minute window. That is a better option than waiting until the moment you get a ticket.`,
          `For commercial clients — fleets, body shops, dealers, property managers — we set up recurring dispatch. One phone number or account code, priority over retail calls, consistent drivers who learn your properties, and net-30 invoicing. That setup usually saves 20–30 minutes per call compared to retail dispatch and eliminates payment friction.`,
        ],
      },
    ],
  };
}

// ============================================================
// NEIGHBORHOOD PAGE CONTENT
// ============================================================
export function cityPageContent(cityName: string, stateName: string, stateAbbr: string, stateSlug: string, otherCities: { name: string; slug: string }[]) {
  const sc = SERVICES.length;
  const nearbyCities = otherCities.slice(0, 8);

  return {
    title: `${cityName} Tow Truck Service Near Me — 24/7 Towing in ${cityName}, ${stateName}`,
    metaDescription: `${cityName} tow truck service near you — 24/7 dispatch covering ${cityName}, ${stateName}. Light-duty, flatbed, battery, tire, lockout, gas. Flat-rate pricing, 20–40 min arrival. Call ${PHONE}.`,
    heroSubtitle: `24/7 Towing & Roadside in ${cityName}`,
    sections: [
      {
        heading: `Towing & Roadside in ${cityName}, ${stateName}`,
        paragraphs: [
          `Broken down in ${cityName}? The NYC Towing Service has trucks staged in ${stateName} and runs 24/7, with typical arrivals of 20–40 minutes. We handle every common NYC roadside situation — dead batteries on cold mornings, flats from the endless pothole lottery, keys locked in cars, cars that ran out of gas between stations, cars stuck in snow or a loading-zone curb cut, and the full range of tow situations from a quick shop transfer to a full collision recovery.`,
          `Our ${cityName} drivers know the neighborhood. They know which streets are too narrow for a full flatbed, which blocks are one-way the wrong way at this hour, where the fire hydrants and bike-lane curbs are, and which garages in the area have ceiling clearances too low for a standard tow truck. That local knowledge is why we arrive fast and get the vehicle loaded without the "we can't access it" call-back that plagues out-of-area operators.`,
          `Flat-rate pricing, quoted on the phone before we dispatch. $125 base for light-duty tows, $175 base for flatbed, $85 flat for most roadside calls. First five miles included on tows, per-mile after that. No NYC surcharge, no storage fee on same-day drops, no after-hours markup. If the job complexity shifts, we tell you the new number before we execute.`,
          `${sc} distinct services, all dispatched from one number, all running 24 hours a day in ${cityName}. Light-duty and heavy-duty towing, flatbed for AWD / EV / luxury, motorcycle transport, full roadside, accident recovery, junk car pickup, impound retrieval, private-property enforcement, and fleet accounts for commercial clients.`,
        ],
      },
      {
        heading: `How to Call a Tow in ${cityName}`,
        paragraphs: [
          `Step 1: Call ${PHONE}. Tell the dispatcher where you are (cross-streets or nearest intersection is fine if you are not sure of the exact address) and what is wrong with the vehicle. If you know the year/make/model, share that — it helps us send the right truck (wheel-lift vs. flatbed matters a lot in ${cityName}, especially for AWD, EVs, and low-clearance cars).`,
          `Step 2: You get a flat-rate quote and a live ETA on the call. The dispatcher is NYC-based, so the ETA is honest — if traffic is bad right now in ${cityName}, you will hear that. If we have a truck 10 minutes out, you will hear that too. No "30 minutes" that turns into 90.`,
          `Step 3: Truck arrives. Driver confirms the vehicle condition with you, takes timestamped photos (protects both of us), and walks through the loading or roadside procedure before touching anything. If the vehicle is in a dangerous spot in ${cityName} — blocking a travel lane, in a bike lane, hanging into a fire hydrant zone — we move it to a safe staging point first.`,
          `Step 4: Job completes at the quoted rate. Receipt emailed within minutes. Most major cards, Apple Pay, Google Pay, and cash all accepted on scene. For accident tows, we bill insurance directly in most cases.`,
        ],
      },
      {
        heading: `${sc} Services Available in ${cityName}, ${stateAbbr}`,
        paragraphs: [
          `We run all ${sc} of our dedicated services in ${cityName}. Browse the full list below — each links to a dedicated page with scenarios, pricing, and what to expect.`,
          `Light-duty and motorcycle towing for everyday breakdowns. Heavy-duty and flatbed for anything bigger, heavier, or drivetrain-sensitive (AWD, EV, low-clearance). Accident recovery with scene cleanup and insurance billing. Long-distance towing to destinations beyond the city line. Full roadside: jump-starts, tire changes, lockouts, gas delivery, winch-outs.`,
          `Specialty work in ${cityName}: junk car removal (often for cash), private-property enforcement tows for landlords and property managers, impound recovery from NYPD or private pounds, and legal abandoned-vehicle removal. Commercial accounts: fleet dispatch with priority routing and net-30 billing.`,
          `Not sure which service you need? Dispatch will figure it out on the call. Describe the situation and the vehicle — the right truck, crew, and equipment gets sent.`,
        ],
      },
      {
        heading: `Why ${cityName} Drivers Choose Us`,
        paragraphs: [
          `${cityName} has plenty of tow-truck numbers on plastered light-pole flyers. Most of them are bait-and-switch operators — low price on the phone, a different number on the invoice, storage fees that appear overnight, and vehicles that end up at an impound yard you have to fight to recover. We are the opposite. Licensed by NYC DCWP. Commercial auto, garage liability, and on-hook insurance on every truck and load. Flat-rate quoted before we dispatch. Receipt emailed before the truck leaves.`,
          `Our drivers are employees, not gig workers. They train on every common vehicle, every tie-down, every NYC-specific hazard. They know the difference between when a wheel-lift is fine and when a flatbed is mandatory. They know when to plug a tire on-site and when to tow to a shop. They carry the right tools for lockouts on every common make — including the modern vehicles that will fry the airbag module if you slim-jim them.`,
          `Response time is our biggest edge in ${cityName}. National roadside networks route through call centers that have no idea where anything is. We dispatch from trucks already in ${stateName}, already familiar with the streets, already running a known route. That difference is typically 20–40 minutes versus 60–90.`,
          `Pricing is the next edge. National networks mark up subcontractor rates 30–50%. Credit card roadside (the "free" roadside that came with your card) quietly caps coverage and dumps overage onto you. We charge a flat rate, and we charge it one time.`,
        ],
      },
      {
        heading: `${cityName} Towing Pricing`,
        paragraphs: [
          `Light-duty tow from ${cityName}: $125 base plus $4/mile past five miles. $125 covers the hookup, the first five miles, and drop-off at a standard location — a shop, a residence, a commercial lot. Most intra-borough tows from ${cityName} fit inside the base rate.`,
          `Flatbed tow from ${cityName}: $175 base plus $5/mile past five. If your vehicle is AWD, 4WD, an EV, or a low-clearance sports/luxury car, flatbed is mandatory — dragging drive wheels destroys the drivetrain and low bumpers scrape off on wheel-lift. Motorcycles also go flatbed.`,
          `Roadside (jump, tire, lockout, gas): $85 flat. Arrival 20–40 minutes typical. Winch-out from snow or a ditch starts at $125 depending on the recovery difficulty. Any delivered fuel is billed at cost plus a small handling fee on top of the service rate.`,
          `Accident and collision tows in ${cityName}: base rate plus any scene-cleanup time. We bill most major insurance carriers directly — you provide your carrier and claim number and we handle the paperwork.`,
        ],
      },
      {
        heading: `Common ${cityName} Breakdown Scenarios`,
        paragraphs: [
          `Dead battery in the morning: most common ${cityName} call November through March. Cold overnight temps kill marginal batteries. We arrive, test both the battery and the alternator (a lot of operators skip the alternator test — bad move), jump or replace as needed. If the alternator is gone, a jump is a waste of your time; we will tow you to a shop instead.`,
          `Flat tire on the way somewhere: second most common. NYC potholes and curb scrapes shred sidewalls. We mount your spare, or plug/patch the tire on scene if the damage is repairable (nail or screw in the tread). Shoulder of a bridge or highway is not a place to do this yourself.`,
          `Locked keys inside the car: third most common. We use proper lockout tools (air wedges, long-reach) — not the slim jim your uncle told you about, because modern cars with side-impact airbags in the door will literally blow out the airbag module if you try.`,
          `Ran out of gas: usually between highway exits or on a bridge approach. We bring 2 gallons of gas or diesel directly to the vehicle. Enough to get you to a station.`,
          `Collision: scene cleanup, proper loading of damaged vehicles, timestamped photos, direct drop to your insurance-approved body shop. Bill to carrier in most cases.`,
          `Stuck in snow or a snowbank: winch-out. Flat-rate job. Common after plow trucks pile snow at corners and residents get boxed in on narrow streets.`,
        ],
      },
      {
        heading: `Same-Day vs. Scheduled in ${cityName}`,
        paragraphs: [
          `Same-day is the default — you are broken down now, we dispatch now, typical 20–40 minute arrival. That covers the vast majority of ${cityName} calls. Peak rush hour and major weather can push arrival out to 45–75 minutes, and dispatch will tell you honestly.`,
          `Scheduled tows work for planned vehicle moves in ${cityName}: car that needs to go from home to a shop on a specific day, vehicle that has to move before street cleaning, commercial equipment that needs to be at a job site at a specific time. Book 24–48 hours ahead, hit a 30-minute window.`,
          `Commercial accounts in ${cityName}: fleet operators, body shops, dealers, and property managers get dedicated dispatch with priority over walk-up calls, consistent drivers who learn your properties and vehicles, and net-30 invoicing with consolidated monthly statements.`,
        ],
      },
      {
        heading: `What to Do While You Wait`,
        paragraphs: [
          `If you are in a safe spot: stay with the vehicle. Turn on your hazards. Doors locked if you feel unsafe, open windows cracked for ventilation if it is hot. If you have a triangle or flares, set them up at least 50 feet behind the vehicle. Watch for our truck number — the dispatcher will text it to you.`,
          `If you are on a bridge or in a tunnel with no shoulder: call 911 before you call us. Those corridors have bridge-authority or MTA rules about how tows get staged, and the authorities need to manage the scene before any tow operator is allowed to approach. Once the scene is safe, we can execute the tow.`,
          `If you are in an active travel lane on a highway: same rule. 911 first. Get out on the safer side of the vehicle (usually the non-traffic side) and stand well clear. Hazards on. We will be there as soon as NYPD clears us in.`,
          `If you are on a residential ${cityName} street: relax, you are probably fine. Stay dry if it's raining, stay warm if it's cold, and if you need to leave the car to use a bathroom at a nearby business, text the dispatcher so the driver knows to call you when they arrive.`,
        ],
      },
      {
        heading: `Environmental and Safety Practices in ${cityName}`,
        paragraphs: [
          `We run drained EV batteries per manufacturer specs — drive wheels off the ground, battery disconnected where required, and transport temperature-controlled when the state of charge demands it. We do not drag EVs. Ever. The motor damage alone would bankrupt the tow operation if we ever did.`,
          `Junk cars get scrapped at licensed NYC recyclers. All fluids drained and reclaimed. Catalytic converters go to regulated buyers (NY requires documented chain of custody on catalytic converters to combat theft). Aluminum wheels, steel body, and any resellable parts factor into what we can pay you on a junk pickup.`,
          `Accident-scene cleanup: absorbent for oil and fluid spills, broom and dustpan for glass and plastic, cones to mark the scene for following traffic. We clean up what we can without blocking traffic further. Heavier cleanup (major fluid spills, structural debris in the roadway) is an FDNY or DOT response and we defer to them.`,
          `Every truck carries a fire extinguisher, wheel chocks, reflective vests, and a first-aid kit. Every driver is trained to protect the scene, not just the tow.`,
        ],
      },
    ],
    nearbyCities,
  };
}

// ============================================================
// NEIGHBORHOOD + SERVICE PAGE CONTENT
// ============================================================
export function cityServicePageContent(cityName: string, stateName: string, stateAbbr: string, service: Service) {
  const category = SERVICE_CATEGORIES[service.category];
  const relatedServices = SERVICES.filter((s) => s.category === service.category && s.slug !== service.slug);
  const svcLower = service.title.toLowerCase();

  return {
    title: `${service.title} in ${cityName}, ${stateName} — 24/7 Tow Truck Near Me`,
    metaDescription: `${service.title} in ${cityName}, ${stateName} — 24/7 tow truck dispatch near you. Flat-rate pricing, 20–40 min arrival, licensed and insured. Call ${PHONE}.`,
    heroSubtitle: `${service.title} in ${cityName} — 24/7`,
    sections: [
      {
        heading: `${service.title} in ${cityName}, ${stateName}`,
        paragraphs: [
          `Need ${svcLower} in ${cityName}? The NYC Towing Service runs this job 24 hours a day, with trucks staged in ${stateName} and typical arrival times of 20–40 minutes. Flat-rate pricing quoted on the phone before we dispatch. No NYC surcharge, no storage fees on same-day drops, no bait-and-switch.`,
          `${service.longDescription}`,
          `Our ${cityName} drivers handle ${svcLower} calls every single day. They know the local streets, the parking rules, the building clearances, and the common hazards — streetcar tracks where they exist, bike-lane concrete curbs, low-clearance garages, and the specific intersections where police enforcement or active construction can complicate a hookup. That local knowledge is why we arrive fast and get the job done without callbacks.`,
          `For ${svcLower} specifically in ${cityName}, we carry the right tools on every truck. Proper battery testers for dead-battery calls (not just a voltmeter — a load tester that actually stresses the battery). Full-size impact guns and ${stateAbbr}-sized lug sockets for tire changes. Air wedges and long-reach tools for lockouts. Fuel cans rated for on-road delivery. For tows, proper tie-down kits sized to the vehicle class.`,
        ],
      },
      {
        heading: `How ${service.title} Works in ${cityName}`,
        paragraphs: [
          `Step 1 — Call ${PHONE}. Tell dispatch you are in ${cityName} and you need ${svcLower}. Share the cross-streets (or nearest intersection if you do not know the address), the vehicle year/make/model, and any details that matter — AWD, EV, low clearance, keys are in the ignition, etc. The call takes about 90 seconds.`,
          `Step 2 — You get a flat-rate quote and a live ETA. The dispatcher is local, so the ETA is honest. If traffic is bad or there is a queue, you hear that on the call. We send a truck number and driver name so you know who is showing up.`,
          `Step 3 — Driver arrives, confirms condition, takes timestamped photos, and walks through the procedure before touching the vehicle. For tows in ${cityName}, you see the tie-downs or hookup points before the vehicle moves. For roadside, you see the tool or part before it touches anything.`,
          `Step 4 — Job done at the quoted rate. Receipt emailed immediately. All major cards, Apple Pay, Google Pay, and cash accepted. Accident tows bill to insurance directly in most cases.`,
          `If the job changes on scene — roadside turns into a tow because the issue is bigger than expected — we quote the new rate before executing and credit the roadside fee against the tow. No surprise billing.`,
        ],
      },
      {
        heading: `What ${service.title} Includes in ${cityName}`,
        paragraphs: [
          `${service.subtitle}: ${service.description} This is part of our ${category.label.toLowerCase()} category, which covers ${category.description.toLowerCase()}.`,
          `Every ${svcLower} call in ${cityName} includes: correct truck and crew for the job (we do not show up in a wheel-lift truck for a job that needs a flatbed), proper equipment (tie-downs, tools, or parts sized for the vehicle), timestamped photo documentation, a live driver who walks you through the procedure, a flat rate quoted before dispatch, and a receipt emailed within minutes of completion.`,
          `Insurance: for collision tows and insurance-covered roadside, we bill your carrier directly in most cases. For routine jobs, you pay at completion and we issue an itemized receipt for reimbursement. COI available within 24 hours for commercial clients.`,
          `After the job: if it's a tow, the vehicle goes exactly where you directed — your home, a shop, a dealer, a body shop, an airport, an impound lot. We do not redirect without your explicit okay. If there's a delay at the drop (the shop is backed up, nobody's home, the gate is locked), we call you and wait for direction before unloading anywhere else.`,
        ],
      },
      {
        heading: `${service.title} Pricing in ${cityName}, ${stateAbbr}`,
        paragraphs: [
          `${service.title} pricing in ${cityName} follows our standard flat-rate structure. Light-duty tows $125 base, flatbed $175 base, heavy-duty quoted per job, roadside services $85 flat. First five miles included on tows, per-mile after that. No NYC surcharge, no after-hours markup, no storage fees on same-day drops.`,
          `The job type determines the exact number. Dispatch will quote your ${svcLower} call on the phone before we dispatch — you know the rate before you commit. If the job changes (a jump-start turns into a tow because the alternator is gone, or a tow destination changes mid-run), we quote the new rate before we execute.`,
          `Payment: all major cards, Apple Pay, Google Pay, cash. Fleet and commercial accounts: net-30 invoicing with consolidated monthly statements and a dedicated account number for dispatch.`,
          `To give you a sense of real numbers: a typical light-duty tow within ${cityName} to a local shop runs $125–$150 total. A flatbed tow from ${cityName} to a specialty shop a few miles away runs $175–$220. A roadside ${svcLower} call is $85 flat unless the job type changes.`,
        ],
      },
      {
        heading: `When to Call for ${service.title} in ${cityName}`,
        paragraphs: [
          `Call 24/7. Dispatch runs around the clock every day of the year. Overnight rates match daytime rates. Holiday rates match weekday rates. Snowstorm operations run as long as the roads are safe to operate on.`,
          `Same-day is the default for ${svcLower} in ${cityName} — you are broken down or need service now, we dispatch now. Typical arrival 20–40 minutes. Peak rush hour and severe weather can extend that, and dispatch gives you an honest ETA on the call.`,
          `Scheduled service: for planned ${svcLower} in ${cityName}, book 24–48 hours ahead. We hit a 30-minute window. Works for vehicle moves, fleet relocations, and pre-arranged service appointments.`,
          `For commercial clients with recurring ${svcLower} needs in ${cityName} — fleets, body shops, dealers, property managers — set up a fleet account. Priority dispatch over retail calls, consistent drivers, net-30 billing.`,
        ],
      },
      {
        heading: `Why Choose The NYC Towing Service for ${service.title} in ${cityName}`,
        paragraphs: [
          `${cityName} has plenty of options for ${svcLower}, from national roadside networks to light-pole flyer operators. We are the local licensed operator that national networks subcontract to when they do the job right. When you call us directly, you skip the dispatch markup and the subcontractor chain. Faster response, lower rate, clearer communication.`,
          `Our ${cityName} drivers are licensed, insured, trained, and — critically — consistent. You get the same crew over time when you have a fleet or recurring account. That consistency eliminates the "we can't access the property" calls that plague drivers who have never been to a given address before.`,
          `Flat-rate, upfront pricing. NYC DCWP tow license. Commercial auto, garage liability, and on-hook insurance on every truck and every load. No storage fees on same-day drops. Receipts emailed before the truck leaves the scene.`,
          `Call ${PHONE}. 24/7. Any borough, any neighborhood, any hour.`,
        ],
      },
    ],
    relatedServices,
    category,
  };
}
