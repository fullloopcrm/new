import { PHONE } from "./content";
import type { CustomerType } from "./customer-types";
import { SERVICES } from "./services";

/** Generate extended content for /who-we-serve/[type] pages */
export function customerTypeContent(ct: CustomerType) {
  const relatedServices = SERVICES.filter((s) => ct.services.includes(s.slug));
  return [
    // INTRO
    `${ct.name} across America are tired of paying for auto-club memberships they barely use. Most members pay $80–$120 a year, hit the 3- or 4-call limit before extras kick in, and still wait two or three hours when something actually breaks. The Roadside Helper was built specifically for ${ct.name.toLowerCase()} who want a different deal: pay only when you need us, no contracts, dispatch 24/7, and a flat rate that doesn't change at 3am or on Christmas.`,

    // OUR MODEL
    `Our model is straightforward. One flat rate — $149 per hour with a 1-hour minimum — covers a real, trained roadside technician, commercial-grade equipment, and the time to fix the problem. Most roadside calls finish inside the 1-hour minimum, which means the minimum is also the maximum for the typical job. Tow mileage past 5 miles, replacement parts (like a new battery), and fuel are billed separately at actual market cost — nothing inflated.`,

    // SPECIFIC TO THIS CUSTOMER TYPE
    `For ${ct.name.toLowerCase()} specifically, the model fits the situation. ${ct.longDescription} Average response time in the cities we serve is under 60 minutes. The dispatcher gives you a real ETA based on the nearest available technician's current location — not a vague "someone will be there eventually" estimate.`,

    // PAIN POINTS
    `We understand the specific challenges ${ct.name.toLowerCase()} face on the road. ${ct.painPoints[0]}? Priority dispatch and a real human dispatcher on the first ring. ${ct.painPoints[1]}? That's why we built 24/7 service with no surcharge for overnight, weekends, or holidays. ${ct.painPoints[2] || "Whatever your specific situation"} — our trained technicians have handled it before, today, this week. ${ct.painPoints[3] ? ct.painPoints[3] + "? We have a specific process for that too." : ""}`,

    // VALUE HIGHLIGHTS
    `What we deliver for ${ct.name.toLowerCase()}: ${ct.creditHighlights[0]}. ${ct.creditHighlights[1]}. ${ct.creditHighlights[2] || "And the rate stays the same regardless of when you call"}. The dispatcher quotes you the rate before the technician rolls. The technician confirms the rate on arrival. Nothing is added to your bill that wasn't agreed to first. If the situation turns out to be more complex than typical, you're told the additional time before any extra work starts.`,

    // SERVICES RECOMMENDED
    `For ${ct.name.toLowerCase()}, the most common services we dispatch are: ${relatedServices.map((s) => s.title).join(", ")}. Each service uses the same flat $149/hr rate. The technician dispatched to your call is trained specifically for that service type — motorcycle calls go to motorcycle-trained techs, diesel calls go to diesel-trained techs, RV calls go to RV-trained techs. You're never sent a generalist for a specialty job.`,

    // NATIONWIDE + LOCAL
    `We operate in over 900 cities across all 50 states. Whether you're a ${ct.name.toLowerCase().replace(/s$/, "")} stranded on a New York highway, in a suburban Dallas parking lot, or on a rural Vermont back road — our network has a qualified technician within dispatch range. Local technicians know the area: which interchanges are safe to pull off on, which shoulders have decent cell signal, which exits lead to nearby shops if a tow is needed.`,

    // SCHEDULING / DISPATCH
    `Dispatch for ${ct.name.toLowerCase()} works around the clock. We operate 24/7, 365 days a year — overnights, weekends, holidays at the same flat rate. Most calls are unplanned (you don't schedule a dead battery), so dispatch is reactive and fast. For planned roadside service (a known-failing battery, a fuel delivery for a parked vehicle, a scheduled winch-out on private property), you can book a specific time window through the booking page. Same flat rate, no surcharge for scheduling.`,

    // SAFETY + INSURANCE
    `Every technician on our network is background-checked before joining, trained in safe roadside procedures, and certified to use commercial-grade equipment. For highway-side work, technicians wear ANSI-compliant high-visibility gear, deploy cones, and position the service vehicle to shield the customer from traffic before any work begins. Every service vehicle is liability-insured. If your vehicle is damaged during a roadside call — a scratched rim during a tire change, a scuffed bumper during a tow hookup — our insurance covers the repair at no cost to you.`,

    // BOTTOM LINE
    `The bottom line for ${ct.name.toLowerCase()}: pay only when you need roadside help, get a fast dispatch, and pay a predictable flat rate. No annual dues, no membership contract, no 3-hour wait, no after-hours surcharge. Call ${PHONE} when you need us. The dispatcher will give you a real ETA and the technician will get you back on the road.`,
  ];
}

/** Generate content for /who-we-serve/[type]/[state] pages */
export function customerStateContent(ct: CustomerType, stateName: string, stateAbbr: string, cityCount: number) {
  const relatedServices = SERVICES.filter((s) => ct.services.includes(s.slug));
  return [
    `${ct.name} in ${stateName} need roadside service that fits the way they actually use it. Most ${stateAbbr} drivers pay $80–$120 a year for an auto-club membership and use it zero or one time. The Roadside Helper flips that: pay $0 unless you need us, then flat $149 per hour with a 1-hour minimum. No contracts, no annual dues, dispatch 24/7 across ${cityCount} ${stateAbbr} cities.`,

    `${ct.longDescription} Our ${stateName} technicians know the local roads, the major highways, and the regional patterns — winter battery failures in cold-weather ${stateAbbr} markets, hot-pavement tire blowouts in summer-hot regions, urban parking-garage lockouts versus rural shoulder breakdowns. Local knowledge translates to faster dispatch and more accurate situational handling.`,

    `Specific challenges ${ct.name.toLowerCase()} face in ${stateName}: ${ct.painPoints.join(". ")}. Every one of these scenarios is something our ${stateAbbr} network handles routinely. Real dispatcher answers, real technician arrives, problem resolved at the flat $149/hr rate.`,

    `What ${ct.name.toLowerCase()} get from us in ${stateAbbr}: ${ct.creditHighlights.join(". ")}. These aren't marketing promises — they describe how the service actually operates day-to-day in our ${stateName} markets.`,

    `For ${ct.name.toLowerCase()} in ${stateName}, the most common services we dispatch are: ${relatedServices.slice(0, 4).map((s) => s.title).join(", ")}. Each follows the same flat-rate pricing and is available in every one of our ${cityCount} ${stateAbbr} cities.`,

    `24/7 dispatch across ${stateName}. No after-hours surcharges, no weekend or holiday premiums. The rate at 2pm Tuesday is the same as 2am Christmas. Call ${PHONE} or book online to request ${ct.name.toLowerCase()} roadside service in ${stateName}.`,

    `Our ${stateName} network is staffed by background-checked, trained, fully insured technicians. Every service vehicle carries liability insurance. If your vehicle is damaged during service, our insurance covers the repair at no cost to you. Certificates of insurance are available on request for commercial ${ct.name.toLowerCase()} and fleet accounts in ${stateAbbr}.`,

    `We're expanding in ${stateName} and hiring qualified roadside technicians across all ${cityCount} ${stateAbbr} cities. If you know someone with experience or the temperament for this work (calm under pressure, mechanically inclined, good with customers), our careers page has open positions. Fleet partner program also available for service centers, tow operators, and roadside contractors who want to join our dispatch network.`,
  ];
}

/** Generate content for /who-we-serve/[type]/[state]/[city] pages */
export function customerCityContent(ct: CustomerType, cityName: string, stateName: string, stateAbbr: string) {
  return [
    `${ct.name} in ${cityName}, ${stateAbbr} — roadside service built for the way you actually use it. Pay $0 unless you need us, then flat $149 per hour with a 1-hour minimum. Dispatch is 24/7 with a real human answering the first ring. Average response in ${cityName} is under 60 minutes.`,

    `${ct.longDescription} Our ${cityName} technicians know the local roads, which highway exits are safe to pull off on, and which shoulders have decent cell signal. Local knowledge means faster on-scene arrival and better situational handling — small things that matter when you're stranded.`,

    `Specific challenges ${ct.name.toLowerCase()} face in ${cityName}: ${ct.painPoints.join("; ")}. Each of these is something our ${cityName} dispatch handles routinely. Real dispatcher answers, qualified technician arrives, problem resolved at the flat $149/hr rate.`,

    `What ${ct.name.toLowerCase()} get from our ${cityName} service: ${ct.creditHighlights.join(". ")}. Real operating details, not marketing copy.`,

    `Same-day roadside in ${cityName} is the standard mode — you don't plan a dead battery. Dispatch routes the closest available technician immediately and they call you back with an ETA. For non-urgent scheduled work (a battery you know is dying, a planned winch-out, a fuel delivery for a parked vehicle), you can book a specific time window through the booking page.`,

    `Our ${cityName} technicians are background-checked, trained, fully insured. Every service vehicle is liability-insured. If your vehicle is damaged during service, our insurance covers the repair. Call ${PHONE} when you need roadside help in ${cityName}.`,
  ];
}