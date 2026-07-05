import { PHONE } from "./content";
import type { CustomerType } from "./customer-types";
import { SERVICES } from "./services";

/** Generate extended content for /who-we-serve/[type] pages */
export function customerTypeContent(ct: CustomerType) {
  const relatedServices = SERVICES.filter((s) => ct.services.includes(s.slug));
  return [
    `${ct.name} are a core audience for The NYC Towing Service. We built this operation specifically to serve the daily, real problems that ${ct.name.toLowerCase()} face in New York City — not a national template applied to every market. NYC has its own parking enforcement rhythm, its own bridges and tunnels, its own weather-driven breakdown patterns, and its own regulatory environment for tow operators. A generic national roadside network cannot match a local licensed operator who lives inside that system every day.`,

    `${ct.longDescription}`,

    `For ${ct.name.toLowerCase()} specifically, what matters most is response time and accurate dispatch. We run trucks staged in every borough — Manhattan, Brooklyn, Queens, the Bronx, Staten Island — so a truck is always close to you. Our dispatchers are NYC-based and route traffic in real time, which means the ETA you hear on the phone is honest. Arrival on most calls is 20–40 minutes. Peak rush hour and severe weather can extend that, and dispatch will always tell you the truth about timing.`,

    `The specific challenges ${ct.name.toLowerCase()} face are real and recurring: ${ct.painPoints[0]}? That's exactly why we staged trucks borough-by-borough instead of running everything from a single central yard. ${ct.painPoints[1]}? Our flat-rate pricing and priority dispatch are designed around that. ${ct.painPoints[2] || "Whatever the specific situation"} — our drivers handle it every single day. ${ct.painPoints[3] ? ct.painPoints[3] + " — we have a specific process for that." : ""}`,

    `What we deliver on every call for ${ct.name.toLowerCase()}: ${ct.creditHighlights[0]}. ${ct.creditHighlights[1]}. ${ct.creditHighlights[2] || "And consistent execution every single time, not just the first call."} Those aren't marketing claims — they're the standard operating procedure on every dispatch. Drivers who can't execute against those standards don't stay on the team.`,

    `Our transparency practices are especially important for ${ct.name.toLowerCase()}. Flat-rate pricing quoted on the phone before we dispatch — you know the number before you commit. Timestamped photos of the vehicle on scene and at drop. Receipts emailed within minutes of completion. Any change in job scope gets quoted before we execute the change, not after. Insurance carriers billed directly for accident tows in most cases. COI available within 24 hours for fleet and property-manager accounts.`,

    `For ${ct.name.toLowerCase()}, we most often run these services: ${relatedServices.map((s) => s.title).join(", ")}. Each follows the same transparent flat-rate pricing and 24/7 dispatch model. The exact mix of services you need depends on your specific situation — dispatch will figure that out on the phone in under two minutes. If you're not sure whether a roadside call is enough or whether you need a tow, describe the problem and we'll tell you which is right.`,

    `NYC coverage: all five boroughs, every major neighborhood, every bridge and tunnel approach, and most adjacent highway corridors (Cross Bronx, BQE, LIE, Grand Central Parkway, West Side Highway, FDR, Belt Parkway, Van Wyck, Major Deegan, Henry Hudson). Out-of-area runs (to NJ, CT, upstate NY, eastern PA, MA) handled as scheduled long-distance jobs with flat-rate quotes on destination.`,

    `Scheduling flexibility matters for ${ct.name.toLowerCase()}. We run 24 hours a day, 365 days a year — overnight rates match daytime rates, holiday rates match weekday rates, snowstorm operations run as long as roads are safe. Same-day dispatch is the default (you're broken down now, we dispatch now). Scheduled service (24–48 hours ahead) locks in a 30-minute arrival window for planned vehicle moves. Commercial accounts get dedicated dispatch and priority over retail calls.`,

    `Safety and insurance: we carry NYC DCWP tow license, commercial auto insurance, garage liability, and on-hook insurance on every truck. That last one matters — a lot of NYC tow operators have auto insurance on the truck but not on-hook insurance on what they're hauling. If something happens to your vehicle in transit, the truck operator's auto policy won't cover it. Ours does. Certificates of insurance available within 24 hours for fleet and property-manager accounts.`,

    `Training matters, especially for ${ct.name.toLowerCase()} dealing with modern vehicles. Our drivers train on every common vehicle platform: conventional cars, AWD and 4WD (flatbed required — dragging drive wheels destroys transfer cases), EVs (flatbed required, manufacturer-spec procedures for Tesla, Rivian, Lucid, Mach-E, etc.), motorcycles (flatbed with front-wheel chock, frame or peg tie-downs — never handlebars), low-clearance sports and luxury cars (low-angle ramps, corner protection), and heavy commercial vehicles (proper wreckers with the boom capacity and axle ratings to actually match the load).`,

    `We're hiring too. If you know someone who'd be great at this work — experienced tow operator, CDL holder, or someone willing to train — we pay competitive rates with W-2 employment (not gig), full benefits for full-time employees (health insurance, PTO, 401k), and a clear path from entry-level to heavy-duty and dispatch roles. No sketchy 1099 arrangements. No "independent contractor" games. Visit the careers page for current openings.`,

    `Bottom line for ${ct.name.toLowerCase()}: you need a tow or roadside service that picks up the phone, quotes a real price, dispatches a real truck, and does the job right. Not a national call center that subcontracts to whoever's cheapest. Not a light-pole flyer operator who bait-and-switches on arrival. Not a credit-card roadside benefit with a 90-minute ETA. A local licensed NYC operator. That's us. Call ${PHONE}. 24/7. Any borough, any neighborhood, any hour.`,
  ];
}

/** Generate content for /who-we-serve/[type]/[state] pages (legacy param: state = borough) */
export function customerStateContent(ct: CustomerType, stateName: string, stateAbbr: string, cityCount: number) {
  const relatedServices = SERVICES.filter((s) => ct.services.includes(s.slug));
  return [
    `${ct.name} in ${stateName} get a different kind of tow service from us — specifically built around the ${cityCount} neighborhoods we cover across the borough. Retail national roadside networks treat every ${stateAbbr} neighborhood the same and dispatch accordingly, which is why they arrive 60–90 minutes after you call. We stage trucks inside ${stateName} with drivers who know the specific streets, parking enforcement rhythms, bridge and tunnel approaches, and building access constraints of your neighborhood. Arrival: 20–40 minutes typical.`,

    `${ct.longDescription} In ${stateName} specifically, that general capability adapts to what the borough actually requires. ${stateName === "Manhattan" ? "Narrow one-way streets, strict alternate-side-parking rules, and constant loading-zone enforcement mean flatbed access is often the deciding factor on where a tow can happen." : stateName === "Brooklyn" ? "Wide traffic range from the BQE to residential one-ways, plus the bridge approaches into and out of Manhattan, means fast routing makes or breaks arrival time." : stateName === "Queens" ? "The mix of commercial corridors (Queens Blvd, Northern Blvd), the airport approaches (JFK, LaGuardia), and the suburban-style residential streets means a truck has to be equipped for every scenario." : stateName === "Bronx" ? "The Cross Bronx, Deegan, and bridges into Westchester and Upper Manhattan make this borough a high-volume corridor for breakdowns and accidents — we stage heavy wreckers accordingly." : "Hylan Boulevard, the Verrazzano approach, the West Shore, and the residential networks each have their own access patterns — local knowledge saves real time."}`,

    `The specific challenges ${ct.name.toLowerCase()} face in ${stateName}: ${ct.painPoints.join(". ")}. Every one of these is a scenario our ${stateAbbr} drivers handle on a daily basis. We show up inside the quoted arrival window, execute to the quoted rate, and document everything — photos, timestamps, and a receipt emailed within minutes.`,

    `What we deliver consistently on ${ct.name.toLowerCase()} calls in ${stateName}: ${ct.creditHighlights.join(". ")}. Those aren't marketing claims — they're the standard operating procedure on every dispatch into ${stateName}. When we fall short, dispatch hears about it immediately and the driver hears about it within the hour.`,

    `For ${ct.name.toLowerCase()} in ${stateName}, we most often run these services: ${relatedServices.slice(0, 4).map((s) => s.title).join(", ")}. All of these run 24/7 with flat-rate pricing quoted before dispatch. The mix of services you actually need depends on the situation — our dispatchers figure that out on the phone.`,

    `Same-day dispatch is the default in ${stateName} — you're broken down now, we dispatch now. Typical arrival 20–40 minutes. Peak rush hour (5–7 PM weekdays) and severe weather extend that, and the dispatcher gives you an honest ETA on the call. Scheduled service for planned moves books 24–48 hours ahead and hits a 30-minute window. Commercial clients get dedicated dispatch with priority over retail.`,

    `${stateName} coverage is comprehensive — ${cityCount} neighborhoods, every major arterial, every bridge and tunnel approach. Overnight and holiday rates match daytime rates. Snowstorm operations run as long as roads are safe to operate on. No NYC surcharge, no storage fees on same-day drops, no after-hours markup.`,

    `Our ${stateName} operation is fully licensed (NYC DCWP), insured (commercial auto, garage liability, on-hook insurance), and staffed by W-2 employees, not gig workers. Drivers are consistent across a given account or property, which means the person who shows up to your ${stateAbbr} location has probably been there before and already knows the access pattern. That consistency is the difference between a 20-minute hookup and a 40-minute "we can't access it" callback.`,

    `We're hiring in ${stateName} for drivers and dispatchers. Competitive pay, W-2 employment, full benefits for full-time, and a clear path from entry-level into heavy-duty and dispatch roles. CDL holders welcome. No 1099 games, no gig arrangements. Check the careers page for open positions.`,
  ];
}

/** Generate content for /who-we-serve/[type]/[state]/[city] pages */
export function customerCityContent(ct: CustomerType, cityName: string, stateName: string, stateAbbr: string) {
  return [
    `${ct.name} in ${cityName}, ${stateName} — we run this specific neighborhood every day. The NYC Towing Service dispatches from trucks already staged in ${stateName}, with drivers who know ${cityName} streets, parking enforcement rhythm, building clearances, and the common breakdown spots. Typical arrival 20–40 minutes. Flat-rate pricing quoted before we dispatch. 24/7, every day of the year.`,

    `${ct.longDescription} In ${cityName} specifically, our local drivers know the access constraints — which blocks are too narrow for a full flatbed, which garages have low clearances that rule out a standard tow truck, which one-ways are going the wrong direction at this hour, and which intersections have active construction affecting staging. That detail-level knowledge is why our ${cityName} arrival times hold up when nationals and out-of-area operators fall behind.`,

    `The challenges ${ct.name.toLowerCase()} face in ${cityName} are specific and real: ${ct.painPoints.join("; ")}. Whatever the exact situation, our ${cityName} drivers have handled it before — probably this week. We arrive on time, execute to the quoted rate, and document the job so there are no disputes afterward.`,

    `What you get on every ${ct.name.toLowerCase()} call in ${cityName}: ${ct.creditHighlights.join(". ")}. Those are the standard procedures, not optional upgrades.`,

    `Same-day is the default in ${cityName} — you're broken down now, we dispatch now. 24/7 operation. Overnight and holiday rates match daytime. No NYC surcharge, no storage fees on same-day drops, no after-hours markup. Any job-scope change gets quoted before we execute.`,

    `The NYC Towing Service operation in ${cityName}: NYC DCWP licensed, full commercial auto, garage liability, and on-hook insurance. W-2 driver employees who train on every common vehicle platform. Flat-rate pricing. Photos at scene and drop. Receipts emailed within minutes. Call ${PHONE}.`,

    `For ${ct.name.toLowerCase()} in ${cityName} with recurring needs — fleet managers, body shops, property managers, commercial clients — set up a dedicated account. Priority dispatch, consistent drivers who learn your locations, net-30 consolidated billing. Works across all five boroughs so if your operation covers more than just ${cityName}, one account handles all of it.`,
  ];
}
