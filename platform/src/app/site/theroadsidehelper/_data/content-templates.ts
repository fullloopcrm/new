// @ts-nocheck
import { PHONE } from "./content";
import { Service, SERVICES, SERVICE_CATEGORIES } from "./services";

// ============================================================
// STATE PAGE CONTENT — ~3k words
// ============================================================
export function statePageContent(stateName: string, stateAbbr: string, cities: { name: string; slug: string }[]) {
  const topCities = cities.slice(0, 10);
  const sc = SERVICES.length;

  return {
    title: `Roadside Assistance in ${stateName} — Flat $149/hr 24/7 | (888) 944-3001`,
    metaDescription: `Fast roadside assistance in ${cities.length}+ cities across ${stateName}. Jump-starts, flat tires, lockouts, fuel, towing, winch-outs. $149/hr — $25 off online ($124 first hr), 1-hour minimum. No memberships. Average response under 60 minutes.`,
    heroSubtitle: `${cities.length} ${stateAbbr} Cities Served — 24/7`,
    sections: [
      {
        heading: `Roadside Assistance in ${stateName} — Pay-As-You-Go, No Membership`,
        paragraphs: [
          `The Roadside Helper is the pay-as-you-go alternative to auto-club memberships across ${stateName}. Most ${stateAbbr} drivers pay $80–$120 per year for a roadside membership and never use it, then still wait two or three hours when they actually need help. We flipped that model. Pay when you need us, never when you don't.`,
          `One flat rate everywhere in ${stateName}: $149 per hour with a 1-hour minimum. Most calls — jump-starts, lockouts, tire changes — are done inside the minimum. The rate at 2pm on a Tuesday is the same as 2am on Christmas. No after-hours surcharge, no holiday premium, no per-mile-to-your-location trip fee.`,
          `Whether you're in ${topCities[0]?.name || "the capital"}, ${topCities[1]?.name || "a suburb"}, ${topCities[2]?.name || "a growing city"}, or anywhere else in ${stateAbbr} — our network is local, licensed, insured, and dispatched 24/7. We handle ${sc} specialized roadside services and operate across ${cities.length} cities in ${stateName}.`,
          `Our mission is simple: get you back on the road fast, charge a predictable rate, and never sell you something you didn't need. The technician quotes additional time before continuing if your situation turns out to be more complex than the typical job. Nothing is added to your bill that wasn't agreed to first.`,
        ],
      },
      {
        heading: `How Roadside Assistance Works in ${stateName}`,
        paragraphs: [
          `Step 1 — Call ${PHONE}. A real dispatcher (not a phone tree) answers. We ask your exact location in ${stateName}, vehicle make and model, the nature of the problem, and any safety concerns. That information goes straight to the nearest qualified technician.`,
          `Step 2 — The technician calls you with an arrival estimate. You'll also get a text with their name, photo, and ETA. Average response time in the ${stateAbbr} cities we serve is under 60 minutes.`,
          `Step 3 — On arrival, the tech confirms the situation, walks you through what they're about to do, and gets to work. For roadside calls on highways, they position the service vehicle to shield you from traffic, deploy cones, and put on a reflective vest before starting.`,
          `Step 4 — Once the issue is resolved, you get a digital invoice on your phone with the total time worked, the flat-rate cost, and a payment link. All major cards, Apple Pay, Google Pay, Venmo, Zelle, CashApp, or cash. A receipt goes straight to your email for expense reports, insurance, or rideshare records.`,
          `If the roadside fix isn't enough — a vehicle with a more serious issue — the technician will tell you on the spot, quote a tow to a shop, and get it done. We don't disappear once we discover a roadside fix won't work.`,
        ],
      },
      {
        heading: `${sc} Roadside Services Available in ${stateName}`,
        paragraphs: [
          `We offer ${sc} specialized roadside services across ${stateName}. Every service is available in all ${cities.length} ${stateAbbr} cities we serve. Same flat rate. Same trained technicians. Same 24/7 dispatch.`,
          `Emergency roadside includes jump-starts for dead batteries, flat tire changes (spare swap or on-site plug-and-inflate), mobile tire replacement when a new tire is needed, on-site battery replacement, and EV charging delivery for stranded electric vehicles. Lockout services cover car lockouts, trunk lockouts, broken key extraction, and key fob battery replacement.`,
          `Fuel and recovery covers out-of-gas delivery (gasoline or diesel, 2–5 gallons at pump price plus the service rate), local towing (flatbed for AWD/4WD or low-clearance vehicles, wheel-lift for standard sedans), and winch-out recovery for vehicles stuck in mud, snow, sand, or ditches.`,
          `Specialty vehicle service in ${stateName} covers motorcycle roadside (motorcycle-trained techs only, never standard auto techs), RV roadside for Class A, B, and C motorhomes and travel trailers, and diesel truck roadside for light and medium-duty work trucks (cold-start, fuel-bleed, DEF delivery).`,
        ],
      },
      {
        heading: `Why ${stateName} Drivers Choose The Roadside Helper`,
        paragraphs: [
          `${stateName} drivers are tired of paying for auto-club memberships they barely use. Traditional clubs collect $80–$120 a year, gate service behind 3–4 calls, and still keep you waiting two or three hours when something breaks. We charge only when you need us, dispatch 24/7, and the average response in ${stateAbbr} is under an hour.`,
          `The pricing is transparent: $149 per hour, 1-hour minimum, same rate at every hour of every day. Tow mileage past 5 miles, replacement parts (like a new battery), and fuel are billed separately at cost — exactly what the gas station or parts supplier charges, nothing inflated.`,
          `Every technician on our ${stateName} network is licensed, bonded, and insured. If your vehicle is damaged during a service call — a scratched rim during a tire change, a scuffed bumper during a tow hookup — our liability insurance covers the repair at no cost to you.`,
          `For fleet, dealership, and rideshare customers in ${stateName}, we offer consolidated monthly billing, dedicated dispatch lines, and consistent technician assignments. The rate per call is the same flat $149/hr, but the operational support is more substantial for commercial accounts.`,
        ],
      },
      {
        heading: `Roadside Pricing in ${stateName}`,
        paragraphs: [
          `Pricing is identical across all ${cities.length} ${stateAbbr} cities: $149 per hour with a 1-hour minimum. No surcharges for overnight, weekends, or holidays. No per-mile trip fee to reach your location.`,
          `Most roadside calls are completed within the 1-hour minimum, which means the minimum is also the maximum for the majority of jobs. A jump-start that takes 20 minutes still bills at the 1-hour minimum — that's the deal. If the situation is more complex — a stuck wheel lug, a vehicle deep in soft ground, a difficult lockout — additional time is quoted before continuing.`,
          `Add-on costs are straightforward and capped at actual cost: tow mileage beyond 5 miles is billed at the standard local rate. Fuel delivery is billed at pump price for the fuel itself plus the service rate. Replacement batteries are billed at retail price (no markup) plus the install time. Nothing else.`,
        ],
      },
      {
        heading: `Same-Day Roadside Across ${stateName}`,
        paragraphs: [
          `Most roadside calls in ${stateName} are by definition same-day — you don't plan a dead battery. Dispatch is reactive and fast. For ${topCities[0]?.name || "major metros"} and other high-density ${stateAbbr} markets, the closest technician is usually within 20 minutes of your location.`,
          `For non-urgent scheduled service (a known-failing battery you want replaced before it strands you, a fuel delivery for a parked car, a planned winch-out), you can book a specific time window through the booking page. The rate is the same and there are no premium charges for evenings, weekends, or holidays.`,
          `For fleet and dealership customers in ${stateName} with recurring needs, we coordinate scheduled service rounds (lot battery checks before cold snaps, scheduled tire inspections) at the same flat rate.`,
        ],
      },
      {
        heading: `What Vehicles We Service in ${stateName}`,
        paragraphs: [
          `Passenger vehicles — sedans, coupes, hatchbacks, crossovers, SUVs — get the standard service across every roadside category. We use commercial-grade jump packs that protect modern vehicle electronics, breaker bars and proper torque wrenches for tire changes, professional wedge-and-rod lockout tools (no slim jims, no scratched paint).`,
          `Light and medium-duty trucks (1/2-ton, 3/4-ton, 1-ton) get full service including diesel-specific roadside for diesel-powered work trucks. Heavy-duty Class 7-8 trucks require a specialist heavy-duty service; we don't dispatch Class 7-8 calls but will refer you to partners who do.`,
          `Motorcycles are handled by motorcycle-trained technicians only, with proper motorcycle tow trailers (not wheel lifts, which would damage a bike). RVs and travel trailers (Class A, B, C motorhomes) are handled by RV-trained techs with the right tire inventory, jump systems, and recovery rigs.`,
        ],
      },
    ],
  };
}

// ============================================================
// CITY PAGE CONTENT — ~3k words
// ============================================================
export function cityPageContent(cityName: string, stateName: string, stateAbbr: string, stateSlug: string, otherCities: { name: string; slug: string }[]) {
  const sc = SERVICES.length;
  const nearbyCities = otherCities.slice(0, 8);

  return {
    title: `Roadside Assistance in ${cityName}, ${stateAbbr} — Flat $149/hr 24/7 | (888) 944-3001`,
    metaDescription: `Fast roadside assistance in ${cityName}, ${stateAbbr}. Jump-starts, flat tires, lockouts, fuel, towing, winch-outs. $149/hr — $25 off online ($124 first hr), 1-hour minimum. No memberships. Call ${PHONE}.`,
    heroSubtitle: `24/7 Roadside Assistance in ${cityName}`,
    sections: [
      {
        heading: `Roadside Assistance in ${cityName}, ${stateName} — Available 24/7`,
        paragraphs: [
          `Need roadside help in ${cityName}, ${stateAbbr}? The Roadside Helper dispatches around the clock with the closest qualified technician for your specific situation. Jump-starts, flat tire changes, lockouts, fuel delivery, towing, and winch-outs — all at a flat $149/hr with a 1-hour minimum.`,
          `Most ${cityName} calls are completed within the 1-hour minimum, which means the minimum is also the maximum for typical situations. A jump-start, a quick tire swap, a standard lockout — done inside the first hour. The rate is the same whether you call at 2pm Tuesday or 2am Christmas morning. No after-hours surcharge, no holiday premium.`,
          `Our ${cityName} technicians are licensed, bonded, and insured. They use commercial-grade equipment that protects modern vehicle electronics, ANSI-compliant high-visibility gear for highway-side work, and proper torque wrenches and lockout tools so your vehicle is returned in the same condition we found it.`,
          `Whether you're stuck on a ${cityName} highway, in a parking garage downtown, in a suburban driveway, or on a side street — one call gets help moving toward you. Average response time in ${cityName} is under 60 minutes.`,
        ],
      },
      {
        heading: `How Roadside Help Works in ${cityName}`,
        paragraphs: [
          `Step 1: Call ${PHONE}. A real dispatcher answers — not a phone tree. We ask your exact location in ${cityName}, your vehicle make and model, the nature of the problem, and any safety concerns (kids in the car, hazardous shoulder, low cell signal).`,
          `Step 2: The closest qualified technician is dispatched and calls you back with an arrival estimate. You'll get a text with the tech's name, photo, and ETA. If the situation looks more complex than the typical service call, the dispatcher flags it ahead so the tech arrives prepared.`,
          `Step 3: On arrival, the technician confirms the situation, explains what they're about to do, and gets to work. For highway-side calls, the service vehicle is positioned to shield you from traffic and cones are deployed before any work begins.`,
          `Step 4: Once your vehicle is back on the road, you get a digital invoice on your phone — total time worked, flat-rate cost, payment link. Cards, Apple Pay, Google Pay, Venmo, Zelle, CashApp, or cash. Receipt emailed automatically.`,
        ],
      },
      {
        heading: `${sc} Roadside Services in ${cityName}, ${stateAbbr}`,
        paragraphs: [
          `We offer ${sc} specialized roadside services in ${cityName}: jump-starts, flat tire changes, mobile tire replacement, car lockouts, trunk lockouts, broken key extraction, fuel delivery, EV charging delivery, local towing, accident and collision tow, winch-out recovery, on-site battery replacement, key fob battery replacement, motorcycle roadside, RV roadside, and diesel truck roadside.`,
          `For ${cityName} commuters, the most common services are jump-starts (cold mornings, lights left on) and flat tire changes (potholes, road debris). For rideshare drivers in ${cityName}, priority dispatch keeps downtime minimal — every minute off the road is lost income.`,
          `For parents stranded with kids in the car, our dispatch treats the call as priority. For seniors, our techs are trained to communicate clearly and never resort to high-pressure upsells. For fleet managers operating in ${cityName}, we offer consolidated monthly billing and dedicated dispatch lines.`,
        ],
      },
      {
        heading: `Why ${cityName} Drivers Choose Us Over Auto-Club Memberships`,
        paragraphs: [
          `Auto-club memberships in ${cityName} typically cost $80–$120 a year, limit you to 3–4 calls before extra fees kick in, and still leave you waiting two or three hours when you actually need help. Our model is the opposite: pay only when you need us, no annual fees, no per-call limits, dispatch 24/7 with sub-60-minute average response in ${cityName}.`,
          `The numbers favor pay-as-you-go for most ${cityName} drivers. If you need roadside help once every two years, you save money the first year alone compared to ongoing membership dues. If you never need help, you owe us nothing — which is the honest answer no club membership will give you.`,
          `For ${cityName} drivers who break down more than that — rideshare drivers, commuters with aging vehicles, anyone with a known-failing battery — fleet account pricing and consolidated billing options keep costs predictable.`,
        ],
      },
      {
        heading: `${cityName} Roadside Pricing`,
        paragraphs: [
          `Pricing in ${cityName} is flat $149 per hour with a 1-hour minimum. Same overnight, weekends, holidays. No after-hours or holiday surcharges. No per-mile trip fee to your location.`,
          `Add-on costs at actual market rate: tow mileage past 5 miles billed at the local rate, fuel delivery billed at pump price for the fuel plus service rate, replacement battery billed at retail price plus install time. Nothing inflated, nothing hidden.`,
          `Most ${cityName} roadside calls finish inside the 1-hour minimum. A jump-start typically takes 20–30 minutes including the post-service voltage test. A standard tire change runs 25–45 minutes depending on lug torque and access. A car lockout averages 5–20 minutes for most makes.`,
        ],
      },
      {
        heading: `What's Different About Roadside in ${cityName}`,
        paragraphs: [
          `${cityName} has its own roadside patterns. If ${cityName} sees regular winter weather, jump-starts spike during the first hard freeze each year (marginal batteries that survived fall finally die). If ${cityName} is summer-hot, AC-related battery drain accelerates and tire blowouts from hot pavement become more common.`,
          `For ${cityName} highway calls, we know which interchanges and shoulders are tricky to access safely and which exits give the tech better positioning to shield your vehicle from traffic. For dense urban ${cityName} calls (parking garages, parallel parking dead-batteries), our techs carry the right equipment for tight working space.`,
          `For ${cityName} suburbs and surrounding areas, response times can run slightly longer than dense urban core — typically still under an hour, but the dispatcher will give you a real ETA based on the nearest available tech.`,
        ],
      },
      {
        heading: `Same-Day Roadside in ${cityName}`,
        paragraphs: [
          `Most roadside calls in ${cityName} are same-day by definition — you don't schedule a dead battery in advance. Dispatch is reactive and the closest available technician heads your way as soon as the call is taken.`,
          `For non-urgent scheduled service in ${cityName} — a battery you know is dying, a planned winch-out, a fuel delivery for a vehicle parked at home — you can book a time window. Same flat rate, no surcharge for choosing a specific window.`,
        ],
      },
      {
        heading: `Roadside Helper vs. Auto Clubs in ${cityName}`,
        paragraphs: [
          `Auto clubs charge $80–$120 per year for roadside coverage in ${cityName}. Members get 3–4 calls before extra fees, average wait times of 2–3 hours, and a phone tree on the first call. We charge $0 per year, give you unlimited pay-as-you-go service, average under 60 minutes in ${cityName}, and a real dispatcher answers.`,
          `For a ${cityName} driver who needs roadside once every two years, the math is overwhelming: we save you money the first year and every year after. For a driver who never needs help, you owe us nothing — which is the honest answer.`,
        ],
      },
      {
        heading: `What Vehicles We Service in ${cityName}, ${stateAbbr}`,
        paragraphs: [
          `Passenger cars, light and medium-duty trucks, motorcycles (motorcycle-trained techs only), RVs and travel trailers (Class A, B, C), and most commercial vehicles. Heavy-duty Class 7-8 trucks require a specialist service we don't directly provide, but we'll refer you to partners.`,
          `For modern vehicles with start-stop systems, hybrid powertrains, or EVs, we use compatible equipment — no consumer-grade jumper cables that can damage sensitive electronics. Tesla and other EV jumps require specific procedures we follow exactly.`,
        ],
      },
    ],
    nearbyCities,
  };
}

// ============================================================
// CITY + SERVICE PAGE CONTENT — ~5k words
// ============================================================
export function cityServicePageContent(cityName: string, stateName: string, stateAbbr: string, service: Service) {
  const category = SERVICE_CATEGORIES[service.category];
  const relatedServices = SERVICES.filter((s) => s.category === service.category && s.slug !== service.slug);
  const svcLower = service.title.toLowerCase();

  return {
    title: `${service.title} Near Me in ${cityName}, ${stateAbbr} — $149/hr 24/7 | (888) 944-3001`,
    metaDescription: `${service.title} in ${cityName}, ${stateAbbr}. $149/hr — $25 off online ($124 first hr), 1-hour minimum, no membership. Average response under 60 minutes. Call ${PHONE}.`,
    heroSubtitle: `${service.title} in ${cityName} — 24/7`,
    sections: [
      {
        heading: `${service.title} in ${cityName}, ${stateName}`,
        paragraphs: [
          `Need ${svcLower} in ${cityName}, ${stateAbbr}? The Roadside Helper dispatches around the clock with the closest qualified technician for ${svcLower}. $149/hr — $25 off online ($124 first hr), 1-hour minimum, no membership required.`,
          `${service.longDescription}`,
          `Our ${cityName} technicians specialize in ${svcLower} and arrive with the right equipment for the job. Average response time in ${cityName} for ${svcLower} is under 60 minutes. We operate 24 hours a day, 365 days a year — overnights, weekends, holidays at the same flat rate.`,
        ],
      },
      {
        heading: `The Complete Guide to ${service.title} in ${cityName}`,
        paragraphs: [
          `${service.title} is one of the most common roadside calls in ${cityName}. ${cityName} drivers face the standard mix of dead batteries, flat tires, lockouts, and out-of-fuel situations — plus the local twists like weather patterns, traffic flow, and parking density that affect how and where these breakdowns happen.`,
          `Our ${svcLower} service in ${cityName} dispatches the nearest qualified technician, who calls you back with an arrival estimate before they start driving toward you. You'll know exactly when they'll be on scene. The technician brings commercial-grade equipment, follows proper safety procedures for highway-side or roadside work, and gets the issue resolved as fast as possible.`,
          `What makes ${svcLower} different here is the flat-rate model. Auto-club memberships in ${cityName} typically charge $80–$120 a year for ${svcLower} coverage with limits on calls and long wait times. We charge $0 per year and $149 flat per hour with a 1-hour minimum. Most ${svcLower} jobs finish inside that minimum.`,
          `Common scenarios for ${svcLower} in ${cityName}: commuters stranded on the way to or from work, parents stranded with kids in the vehicle, rideshare drivers losing earning time, road-trippers far from their usual mechanic, and fleet vehicles needing fast turnaround to get back to operations.`,
        ],
      },
      {
        heading: `How ${service.title} Works in ${cityName}`,
        paragraphs: [
          `Step 1 — Call: Call ${PHONE} from your ${cityName} location. A real dispatcher answers (not a phone tree). Tell us your exact location, vehicle make and model, the nature of the problem, and any safety concerns.`,
          `Step 2 — Dispatch: We send the nearest qualified technician. They call you back within minutes with an arrival estimate. You'll also get a text with their name, photo, and ETA. The dispatcher stays available for any follow-up questions.`,
          `Step 3 — Service: On arrival, the technician confirms the situation, walks you through what they're about to do, and gets to work. For ${svcLower} specifically, that means ${service.description.toLowerCase()}`,
          `Step 4 — Payment: Once the issue is resolved, you receive a digital invoice on your phone with the total time, flat-rate cost, and payment link. All major cards, Apple Pay, Google Pay, Venmo, Zelle, CashApp, or cash. Receipt automatically emailed for expense reports, insurance, or rideshare documentation.`,
          `If the roadside fix isn't enough — a battery that won't hold a charge, a tire with sidewall damage, a vehicle that won't run after a jump — the technician tells you on the spot and quotes a tow or alternative service. We don't disappear when the first attempted fix doesn't work.`,
        ],
      },
      {
        heading: `What ${service.title} Includes in ${cityName}`,
        paragraphs: [
          `Every ${svcLower} job in ${cityName} includes the dispatch and arrival, the time on scene to perform the service, standard equipment (commercial jump pack, breaker bar, lockout tools, fuel container, etc. — whatever's appropriate for the service), and the post-service confirmation that the vehicle is running.`,
          `Add-on costs are billed at actual market rate, not inflated. Tow mileage past 5 miles is billed at the local per-mile rate. Fuel for fuel-delivery calls is billed at pump price. Replacement batteries are billed at retail price (no markup beyond what the parts store would charge you) plus the install time.`,
          `${service.subtitle}: ${service.description} This service is specifically designed for the situations ${cityName} drivers encounter most often. Our technicians carry the right tools, follow the right procedures, and complete the job efficiently.`,
        ],
      },
      {
        heading: `${service.title} Pricing in ${cityName}, ${stateAbbr}`,
        paragraphs: [
          `${service.title} pricing in ${cityName} is flat $149/hr with a 1-hour minimum. Same overnight, weekends, holidays — no surcharges. Add-on costs (tow mileage past 5 miles, fuel at pump price, replacement parts at cost) are billed at the standard market rate.`,
          `Most ${svcLower} calls in ${cityName} are completed within the 1-hour minimum. That means the minimum is the maximum for the typical job. If your situation is more complex — a stuck wheel lug, a difficult lockout, a vehicle in a tight spot — the technician quotes the additional time before continuing.`,
          `For ${cityName} drivers who need ${svcLower} more than once a year, fleet accounts and consolidated billing options keep costs predictable. For drivers who need it once and hope to never need it again, pay-as-you-go is the cheapest possible model — no annual dues, no membership.`,
        ],
      },
      {
        heading: `${service.title} vs. Auto-Club Memberships in ${cityName}`,
        paragraphs: [
          `Most ${cityName} drivers consider auto-club membership for ${svcLower} coverage. Memberships cost $80–$120 a year and include ${svcLower}, but with caveats: limits on calls per year, long wait times during peak demand, and an annual fee that renews whether you used the service or not.`,
          `Our pay-as-you-go model in ${cityName} costs $0 unless you actually need ${svcLower}. If you need it once every two years, you save money compared to two years of unused membership dues. If you need it never, you owe nothing.`,
          `For the actual ${svcLower} job, our technicians use the same (or better) equipment as auto-club contractors, with the same training and the same insurance coverage. The difference is the business model around it — not the technical quality of the service itself.`,
        ],
      },
      {
        heading: `When to Book ${service.title} in ${cityName}`,
        paragraphs: [
          `Most ${svcLower} in ${cityName} is by definition unplanned — you don't schedule a dead battery. Call when it happens and we dispatch the closest available technician immediately.`,
          `For ${svcLower} that can be planned (a battery you know is dying, a winch-out for a vehicle stuck on private property, a fuel delivery for a parked vehicle), you can book a specific time window through the booking page. Same flat rate, no surcharge for scheduling.`,
          `Seasonal considerations for ${svcLower} in ${cityName}: if ${cityName} sees cold winters, dispatch volume surges during the first hard freeze each year — marginal batteries that survived fall finally die en masse. If ${cityName} is summer-hot, AC-related battery drain and tire blowouts spike in July and August.`,
        ],
      },
      {
        heading: `Why Choose Us for ${service.title} in ${cityName}?`,
        paragraphs: [
          `${cityName} has multiple options for ${svcLower} — auto clubs, independent towing companies, dealership roadside programs, and us. The deciding factors are usually price, response time, and trust. We compete on all three: flat $149/hr (no annual dues), average under 60-minute response, and licensed/bonded/insured technicians.`,
          `Our ${cityName} ${svcLower} technicians are background-checked before joining the network, certified in safe roadside procedures, and equipped with commercial-grade tools. Every service vehicle is liability-insured. If your vehicle is damaged during service, our insurance covers the repair at no cost to you.`,
          `24/7 dispatch with the same flat rate. No memberships, no contracts, no per-mile trip fees. Just a real dispatcher, a fast tech, and a fair price.`,
          `Need ${svcLower} in ${cityName} right now? Call ${PHONE}. The dispatcher will give you a real ETA based on the nearest tech's current location.`,
        ],
      },
    ],
    relatedServices,
    category,
  };
}