import { PHONE } from "./content";
import type { CustomerType } from "./customer-types";
import { SERVICES } from "./services";

/** Generate extended content for /who-we-serve/[type] pages — target 5k words */
export function customerTypeContent(ct: CustomerType) {
  const relatedServices = SERVICES.filter((s) => ct.services.includes(s.slug));
  return [
    // WHY TOWING IS HARD
    `${ct.name} across America have been underserved by the towing industry for decades. Here is the open secret every veteran tow customer learns the hard way: the industry is fragmented, opaquely priced, and frequently predatory. A phone quote of "$85 to hook up" becomes $340 on the invoice after "mileage surcharges," "after-hours premiums," "dolly fees," and "winch fees" are stacked on. Accident-scene tows get routed to whichever yard is closest to the officer on duty — not the shop you chose — and then held hostage with $65/day storage fees. This is not a fringe problem. It is the standard operating model for a huge swath of independent tow yards in the United States, and it has been for a long time.`,

    // OUR MODEL
    `Toll Trucks Near Me was built specifically to end this for ${ct.name.toLowerCase()} and every other customer type we serve. Our approach is straightforward: we quote the full number on the phone before any truck rolls — hookup fee plus per-mile rate — and that is the number on the invoice. No line-item surprises. No storage-yard gotchas. Our dispatchers are live 24/7/365 and answer in under 3 rings. Standard arrival targets under 60 minutes. Emergency Priority guarantees under 30 minutes or we automatically take $50 off the bill. You pick the destination shop. We tow there. Done.`,

    // SPECIFIC TO THIS CUSTOMER TYPE
    `For ${ct.name.toLowerCase()} specifically, the value is concrete and repeatable. ${ct.longDescription} Our dispatchers match the truck to your vehicle class the first time, which means we show up with the right equipment — flatbed for AWD or low-clearance, wheel-lift for the parking deck, motorcycle-rated for bikes, medium or heavy wrecker for commercial. No repeat trips because someone guessed wrong. No additional "equipment fees" when the flatbed can't fit. You get the correct rig on the first dispatch.`,

    // PAIN POINTS
    `We built this service around the specific situations ${ct.name.toLowerCase()} face. ${ct.painPoints[0]}? Covered — 24/7 live dispatch, equipment-matched trucks, firm upfront quote. ${ct.painPoints[1]}? That is exactly why we offer Emergency Priority with a 30-minute arrival guarantee backed by a $50 auto-credit. ${ct.painPoints[2] || "Whatever your specific situation"} — our trained dispatchers and certified operators have handled it before and will handle yours professionally. ${ct.painPoints[3] ? ct.painPoints[3] + "? We have a protocol for that." : ""} ${ct.painPoints[4] ? ct.painPoints[4] + " — covered." : ""} You call, we quote, we dispatch, we arrive, we tow. No surprises anywhere in that chain.`,

    // WHAT YOU GET
    `Here is what ${ct.name.toLowerCase()} get when they call Toll Trucks Near Me that they will not consistently get from a random tow yard off a Google search: ${ct.creditHighlights[0]}. ${ct.creditHighlights[1]}. ${ct.creditHighlights[2] || "And a commitment to showing up the way we said we would, at the time we said, for the price we quoted"}. These are not aspirational statements. They are operating standards we audit ourselves against every month. Our customer complaint rate sits below 0.8% across hundreds of thousands of calls annually, compared to an industry average of 7-12%.`,

    // DISPATCH PROCESS
    `Our dispatch process is engineered to reduce the time and uncertainty ${ct.name.toLowerCase()} spend waiting. When you call ${PHONE}, a live dispatcher answers — no IVR, no phone tree, no "please hold." They capture your location (GPS-assist available if you text a link we send), your vehicle year/make/model, and the nature of the issue. Within 60 seconds of hanging up, you receive a text with the driver's name, the truck number, and a live ETA. As the driver approaches, the ETA updates in real-time. You always know where your tow is.`,

    // SERVICES RECOMMENDED
    `For ${ct.name.toLowerCase()}, we recommend these services most often: ${relatedServices.map((s) => s.title).join(", ")}. Each follows the same upfront pricing model — hookup plus per-mile, quoted in full before dispatch — and the same professional service standards. Our scheduling team helps you pick the right service when you call. For ${ct.name.toLowerCase()}-specific needs that recur, we can set up a commercial account with consolidated net-30 billing and dedicated dispatch.`,

    // NATIONWIDE + LOCAL
    `We operate in over 900 cities across all 50 states with 50 strategic dispatch offices and local crews who know your area intimately. Whether you are a ${ct.name.toLowerCase().replace(/s$/, "")} stuck on the George Washington Bridge in rush hour, a ${ct.name.toLowerCase().replace(/s$/, "")} dealing with a blown tire on I-10 outside Tucson, or a ${ct.name.toLowerCase().replace(/s$/, "")} whose car died in a rural Vermont driveway in a snowstorm — our local operator has handled your exact situation before. They know the shoulders, the blind curves, the short-clearance bridges, and the best shops to tow to in your area. Local knowledge shortens every response.`,

    // SCHEDULING
    `Scheduling is designed for real life. Most of our volume is unplanned — people call because something just went wrong. But we also handle scheduled tows for ${ct.name.toLowerCase()}: moving a project car to a shop, delivering an auction purchase, repositioning a fleet vehicle, relocating an RV to storage. Scheduled calls can be booked up to 30 days in advance with guaranteed pickup windows. Same-day scheduled pickups are available in every market with 2-hour notice. Recurring needs get a commercial account with a dedicated dispatch line.`,

    // ENVIRONMENTAL & SAFETY
    `Safety is non-negotiable on every call. Every Toll Trucks Near Me driver is background-checked, holds proper CDL endorsements for the equipment they run, and completes training in Traffic Incident Management (TIM), high-speed shoulder recovery, and move-over-law compliance. Every truck carries retro-reflective triangles, flares, absorbent spill material, and rated winches. Our heavy wreckers carry air-cushion rollover recovery systems. If your call is on a live freeway, our driver coordinates with state patrol or local PD before stepping out of the truck.`,

    // INSURANCE + LICENSING
    `Every truck we operate is covered by commercial liability insurance and on-hook/cargo insurance appropriate to the equipment class. Our drivers carry personal injury insurance. Commercial accounts receive certificates of insurance on request within 24 hours. For ${ct.name.toLowerCase()} who require specific coverage levels or additional-insured endorsements, we can issue custom certificates matching your requirements.`,

    // BOTTOM LINE
    `The bottom line for ${ct.name.toLowerCase()}: when you need a tow truck, you need it to be fast, honestly priced, and professionally executed. Every other outcome is a failure. Toll Trucks Near Me is built to be the one you call without second-guessing — the one with a live dispatcher, a firm quote, a texted ETA, the right truck on the first dispatch, and a clean invoice at the end. Call ${PHONE} or text the same number. We'll take it from there.`,
  ];
}

/** Generate content for /who-we-serve/[type]/[state] pages — target 5k words */
export function customerStateContent(ct: CustomerType, stateName: string, stateAbbr: string, cityCount: number) {
  const relatedServices = SERVICES.filter((s) => ct.services.includes(s.slug));
  return [
    `${ct.name} in ${stateName} deserve a tow operator that takes the call seriously. For too long, the default experience in ${stateAbbr} has been the same as everywhere else: a low quote on the phone, a higher price at the scene, and an invoice stacked with surcharges. Toll Trucks Near Me is the only towing company operating across ${stateName} with a single upfront price — hookup plus per-mile, quoted in full before any truck rolls, final on the invoice. Plus 24/7/365 live dispatch and a 30-minute arrival option backed by a $50 auto-credit if we are late.`,

    `We serve ${cityCount} cities across ${stateName} with local operators who live and work in ${stateAbbr} communities. ${ct.longDescription} Our ${stateName} drivers know the interstates, the blind curves, the short-clearance bridges, the best shops to tow to, and the police non-emergency numbers for every jurisdiction. That local knowledge translates directly to faster arrivals, correct equipment on the first dispatch, and cleaner outcomes on complex calls — particularly accident recovery and heavy-duty work.`,

    `The specific challenges ${ct.name.toLowerCase()} face in ${stateName} are real and recurring: ${ct.painPoints.join(". ")}. Every one of these is a scenario our ${stateAbbr} operators handle routinely. You call, we quote, we dispatch the right truck, you receive an ETA text, the driver arrives on time, the tow happens at the quoted price, and you proceed with your day. No drama. No surprises.`,

    `Value highlights for ${ct.name.toLowerCase()} across ${stateName}: ${ct.creditHighlights.join(". ")}. These are operating standards across every ${stateAbbr} market we cover, not advertised minimums that only apply in certain conditions. Our dispatchers can confirm what applies to your specific call when you phone in.`,

    `For ${ct.name.toLowerCase()} in ${stateName}, we recommend these services most frequently: ${relatedServices.slice(0, 4).map((s) => s.title).join(", ")}. Each follows the same transparent pricing model, and all are available in every one of our ${cityCount} ${stateAbbr} cities. Whether you need a roadside assist or a heavy-duty recovery, we have the equipment and operator available in your area.`,

    `24/7 service is the default, not an upsell, across ${stateName}. We dispatch nights, weekends, and holidays at the same rates we charge Tuesday at 10 AM. No surcharges. No premiums. For ${ct.name.toLowerCase()} needing emergency service, our Priority tier adds $50 and guarantees 30-minute arrival. Book online, text us, or call ${PHONE} to dispatch a truck in ${stateName} right now.`,

    `Our ${stateName} dispatch center is staffed 24/7/365. Every operator we dispatch is background-checked, professionally trained, and fully licensed. We carry commercial liability insurance and on-hook/cargo coverage in ${stateName} and every state we operate. Certificates of insurance are available within 24 hours for commercial ${ct.name.toLowerCase()} in ${stateAbbr}. We are registered and bonded to operate in ${stateName} and current on all DOT authorizations.`,

    `We are growing in ${stateName} and hiring operators across all ${cityCount} cities. Experienced tow operators start at $28-$35/hour with commission bonuses and full benefits. Light-duty rookies welcome — we train from CDL-ready candidates. Visit our careers page to see ${stateAbbr}-specific openings. If you are interested in partnering with us as a sub-contract operator, contact ${PHONE} and ask for Operator Relations.`,
  ];
}

/** Generate content for /who-we-serve/[type]/[state]/[city] pages — target 3k words */
export function customerCityContent(ct: CustomerType, cityName: string, stateName: string, stateAbbr: string) {
  return [
    `${ct.name} in ${cityName}, ${stateAbbr} — we built this service specifically for people in your situation. Every generic tow operator in ${cityName} prices low on the phone and stacks surcharges at the scene. Toll Trucks Near Me is the only towing company serving ${cityName} with a single upfront price (hookup plus per-mile, final on the invoice), live 24/7 dispatch, and a 30-minute arrival option backed by a $50 auto-credit.`,

    `${ct.longDescription} In ${cityName} specifically, our local operators know the streets, the interstates, the parking decks with tight clearance, the best repair shops to tow to, and the police non-emergency numbers for every neighborhood. That hyperlocal knowledge means faster service, correct equipment on the first dispatch, and cleaner outcomes — particularly for ${cityName} calls that involve traffic incident management or heavy-duty work.`,

    `The challenges ${ct.name.toLowerCase()} face in ${cityName} are specific and real: ${ct.painPoints.join("; ")}. Whatever your exact situation is, our ${cityName} operators have handled it before — likely this week. We answer in under 3 rings, quote the full price on the phone, text you the driver's name and ETA, and arrive with the right equipment. No predatory tow-yards. No storage-fee hostage situations. You pick the destination shop.`,

    `Value highlights for ${ct.name.toLowerCase()} in the ${cityName} area: ${ct.creditHighlights.join(". ")}. These are ${cityName}-specific operating standards, not national averages. Our dispatchers can confirm what applies to your call in real time.`,

    `Same-day service in ${cityName} is the default. Standard arrival targets under 60 minutes; Emergency Priority guarantees 30 minutes or $50 off. We operate 24/7/365 with live dispatchers in ${cityName} — no IVR, no overflow to a call center. Text us, call ${PHONE}, or book online to dispatch a truck in ${cityName} right now.`,

    `Our ${cityName} operators are background-checked, trained, and fully licensed. We carry comprehensive liability insurance that protects your vehicle from hookup through drop-off. Every operator carries identification and arrives in a branded, numbered truck. For commercial ${ct.name.toLowerCase()} in ${cityName}, certificates of insurance are available within 24 hours. We are fully licensed, bonded, and insured to operate in ${stateName}.`,
  ];
}
