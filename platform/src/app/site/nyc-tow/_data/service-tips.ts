import type { ReactNode } from "react";

/**
 * Per-service tips / how-to content for /services/[slug]/tips.
 * This is NEW content — not a rehash of service.longDescription.
 *
 * Each entry returns strings (HTML-free) — the page component renders
 * them into JSX. Inner cross-links are handled at the page level using
 * a link-token system: tokens like {link:/services/jump-start|jump start}
 * get converted to <Link> elements at render time.
 *
 * Token format: {link:HREF|TEXT}
 */

export interface ServiceTipsFAQ {
  q: string;
  a: string;
}

export interface ServiceTipsContent {
  /** 5-8 numbered steps: what to do right now. Each is one short paragraph. */
  rightNow: string[];
  /** 4-6 do items. Each is a short sentence. */
  dos: string[];
  /** 4-6 don't items. Each is a short sentence. */
  donts: string[];
  /** Cost paragraph — flat-rate range + what affects price. Use token links where useful. */
  cost: string;
  /** 3-5 common causes tailored to the service. Each is a short sentence. */
  causes: string[];
  /** Short description above the steps/do-don't blocks — 2-3 sentences with inner links. */
  intro: string;
  /** FAQ — 3-5 items specific to this service. */
  faq: ServiceTipsFAQ[];
}

// Shorthand
type Tips = ServiceTipsContent;

/**
 * Render-time helper used by the page component to turn token-links
 * in strings into JSX. Consumed via dangerouslyParseLinks in the page.
 */
export interface LinkToken {
  type: "link";
  href: string;
  text: string;
}
export type TextPart = string | LinkToken;

/** Parse a string with {link:HREF|TEXT} tokens into parts. */
export function parseLinks(raw: string): TextPart[] {
  const parts: TextPart[] = [];
  const re = /\{link:([^|}]+)\|([^}]+)\}/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    if (match.index > last) parts.push(raw.slice(last, match.index));
    parts.push({ type: "link", href: match[1], text: match[2] });
    last = re.lastIndex;
  }
  if (last < raw.length) parts.push(raw.slice(last));
  return parts;
}

/* eslint-disable no-useless-escape */

// ============================================================
// PER-SERVICE TIPS CONTENT (30 services)
// ============================================================
export const SERVICE_TIPS: Record<string, Tips> = {
  // ---------- LIGHT-DUTY ----------
  "light-duty-towing": {
    intro:
      "Most NYC breakdowns fit inside a light-duty tow — a car, sedan, or compact SUV that won't start, shifted, or moved. If your car is AWD or an EV, stop and request {link:/services/flatbed-towing|flatbed} instead — dragging drive wheels kills transfer cases. Unsure about your drivetrain? {link:/services/roadside-assistance|Call dispatch} and describe the car.",
    rightNow: [
      "Move clear of traffic. If you're in a travel lane on the BQE, Cross Bronx, or any bridge/tunnel approach, call 911 before you call us — NYPD secures the scene before any tow operator is allowed in.",
      "Turn hazards on the second the car stops rolling. If you have a reflective triangle, set it 50 ft behind the vehicle on the shoulder.",
      "Call dispatch with three facts: cross-streets, what the car is doing (won't start / won't shift / dead / noise), and year/make/model. 90-second call.",
      "Confirm drivetrain on the call. FWD / RWD is fine on wheel-lift. AWD, 4WD, and EV need {link:/services/flatbed-towing|flatbed} — request it explicitly.",
      "Stay with the vehicle if it's safe. Unlock it so the driver can steer it during hookup, but stay out of the active traffic side.",
      "Tell dispatch the drop destination — home, shop, dealer, or impound. We quote the flat rate based on distance, not by the minute.",
      "Don't try to move the car. If it won't start, it won't start — pushing a dead vehicle in NYC traffic is how people get hurt.",
    ],
    dos: [
      "Write down the dispatcher's truck number and driver name.",
      "Take your own timestamped photos of the vehicle before hookup.",
      "Remove valuables and documents from the glovebox before the truck arrives.",
      "Have your ID and insurance card ready — the driver may ask for them.",
      "Ask the driver to photograph tie-down points before they secure.",
    ],
    donts: [
      "Don't flag a tow truck off the street — unlicensed \"bandits\" tow to impound yards you'll fight to recover from.",
      "Don't agree to a price that wasn't quoted on the phone by dispatch.",
      "Don't leave the keys in the ignition unless the driver specifically asks.",
      "Don't sign a blank invoice — rates are written before the truck leaves.",
    ],
    cost:
      "Light-duty tows from {link:/pricing|our flat-rate pricing} start at $125 base hook-up, which includes the first five miles. After that it's $4/mile. Most intra-borough tows finish inside the base rate. Factors that can push it higher: {link:/services/flatbed-towing|flatbed required} for AWD or low-clearance vehicles, scene complexity (winching a car out of a tight spot), or drop destinations outside the five boroughs.",
    causes: [
      "Dead battery after a cold night or a short-trip week.",
      "Starter failure — the click-but-no-crank pattern common in 10+ year old NYC cars.",
      "Fuel pump failure — engine cranks but won't fire, often after running near empty repeatedly.",
      "Transmission fluid leak from pothole-damaged pans, especially on the BQE and FDR.",
      "Electrical gremlins after rain — coastal NYC humidity corrodes connectors fast.",
    ],
    faq: [
      {
        q: "Will a light-duty truck fit on my narrow Brooklyn block?",
        a: "Wheel-lift trucks fit streets a full flatbed can't — Carroll Gardens, Brooklyn Heights, West Village. If you're in a brownstone neighborhood with parked cars both sides, tell dispatch so we send the wheel-lift.",
      },
      {
        q: "Can you tow me to New Jersey or Long Island?",
        a: "Yes. Out-of-borough and out-of-state go flat-rate per destination. See {link:/services/long-distance-towing|long distance towing} for pricing beyond the city line.",
      },
      {
        q: "What if the car won't roll — brakes locked, shifter stuck in park?",
        a: "We carry wheel skates (mini dollies) for exactly that. The driver slides them under the locked wheels and winches onto the flatbed. No damage, no dragging.",
      },
      {
        q: "Do I need to be there for the tow?",
        a: "Ideally yes, but if you can't be — fleet account, commercial, or an absentee owner — dispatch can arrange unattended pickup with the right authorization on file.",
      },
    ],
  },

  "motorcycle-towing": {
    intro:
      "A downed or broken bike needs a flatbed, a front-wheel chock, and soft straps — not a hook through the handlebars. If you laid it down in traffic, move yourself out first, then call dispatch. For accident-scene bikes, see {link:/services/accident-recovery|accident recovery}; for a simple transport between boroughs or to a shop, this is the right service.",
    rightNow: [
      "Get off the road if you can push the bike. Kickstand down on the shoulder, hazards if it has them, you stand clear of traffic.",
      "Call 911 first if you're down and anyone is injured — even a slow-speed drop warrants a medical check. FDNY before any tow.",
      "Call dispatch. Tell us make, model, and weight class (sport bike, cruiser, tourer, scooter) — it dictates strap and chock choice.",
      "Note visible damage (scratched fairings, bent bars, leaking fluids) so we can document before load.",
      "Don't lay it back on its left side if it fell right — re-dropping can crack the fairing further. Leave it where it is.",
      "If keys are in the ignition, leave them. Dispatcher will confirm whether the driver wants neutral selected for loading.",
      "Confirm drop: your home, your shop, a dealer service bay, or a storage facility.",
    ],
    dos: [
      "Remove saddlebags, tank bag, and any loose gear before loading.",
      "Take photos of the bike, the bars, and any fairings or cowls that could get scuffed.",
      "Tell the driver about any aftermarket parts (frame sliders, highway pegs) — they change strap points.",
      "Mention if the bike has been down on one side — some dealers require that disclosure to re-sell.",
    ],
    donts: [
      "Don't let anyone strap through the handlebars — that bends the triple tree and ruins steering.",
      "Don't allow a wheel-lift on a motorcycle. Ever. Flatbed only.",
      "Don't drain the gas tank preemptively; a quarter tank is fine for transport.",
      "Don't push a leaking bike — if it's weeping oil or gas, park and wait for pickup.",
    ],
    cost:
      "Motorcycle transport is flat-rate {link:/services/flatbed-towing|flatbed} pricing — $175 base hook-up and the first five miles. Per-mile after that runs $5. Scooters are the same rate. Heavy touring bikes (GoldWings, K1600s) may bump to heavy-duty flatbed if the combined weight exceeds standard chock ratings — dispatch will quote on the call. For ongoing event or track-day transport, commercial accounts get volume pricing.",
    causes: [
      "Dropped in traffic or a parking lot — low-side, foot slip, stopped-at-a-light tip-over.",
      "Stator or regulator-rectifier failure — bike runs fine then dies and won't restart.",
      "Dead battery — especially after winter storage without a tender.",
      "Blown fuse or failed ignition switch — the no-crank, no-click pattern.",
      "Post-crash recovery — the rider is fine but the bike isn't rideable home.",
    ],
    faq: [
      {
        q: "Can you pick up a bike from a second-floor garage or a rooftop parking deck?",
        a: "Usually yes — we roll it out on its own wheels and load on the street or loading dock. Tell dispatch the location so we can check clearance.",
      },
      {
        q: "I have a Harley bagger — extra-wide bars and fairing. Special handling?",
        a: "Yes, we use wider strap-across points and don't put any pressure on the bat-wing fairing. Let the driver know before they start.",
      },
      {
        q: "Track-day or racing bike — no lights, no plate — can you still transport?",
        a: "Yes, private property to private property or trackside is fine. On public roads we handle it as non-registered transport; insurance on-hook covers the bike in transit.",
      },
    ],
  },

  // ---------- HEAVY-DUTY ----------
  "heavy-duty-towing": {
    intro:
      "Heavy-duty is for anything over about 10,000 lbs GVWR — box trucks, sprinter vans, large pickups, oversized SUVs, and commercial vehicles. Stalled on the Cross Bronx or Gowanus, a heavy truck is a traffic event, not just a breakdown. For collision-involved heavy vehicles, cross-reference {link:/services/accident-recovery|accident recovery}; for commercial-fleet context, {link:/services/commercial-towing|commercial towing} covers the DOT side.",
    rightNow: [
      "Get on a shoulder or breakdown lane if the vehicle is still moving under its own power. Parking brake, hazards, cones if you have them.",
      "Call 911 if you're blocking traffic on the BQE, Cross Bronx, LIE, or any bridge/tunnel deck — NYPD and DOT manage that scene before tow.",
      "Call dispatch and say 'heavy-duty' up front so we send the right wrecker on the first dispatch.",
      "Share GVWR, length, whether it's loaded, and what the cargo is (no hazmat — that's a separate licensed carrier).",
      "Remove ignition keys and keep paperwork (registration, DOT card, BOL) with you.",
      "If it's a commercial driver in an HOS log, note the time of breakdown — your dispatcher will want it.",
      "Stay clear of the rear of the vehicle during hookup — the winch cables are under tons of tension.",
    ],
    dos: [
      "Know your GVWR before calling — it lives on the door jamb sticker.",
      "Have your DOT number, MC number, and insurance card ready for commercial rigs.",
      "Photograph the vehicle, the cargo area, and any visible damage.",
      "Confirm the destination shop can accept a heavy-duty rig — height, width, and weight all matter.",
    ],
    donts: [
      "Don't let a light-duty truck hook your heavy rig to 'just get it off the road' — it will strand both trucks.",
      "Don't move hazmat cargo with anyone but a licensed hazmat recovery operator. Call dispatch and we'll route you.",
      "Don't leave cargo accessible during recovery — broken shipments go missing on NYC shoulders.",
      "Don't try to winch a stuck trailer with a pickup and a strap. Heavy recovery gear exists for a reason.",
    ],
    cost:
      "Heavy-duty pricing is quoted per job — vehicle weight, distance, and recovery complexity all matter. No flat rate on the phone for a class 7/8 wrecker call. Typical range for a straightforward NYC heavy-duty tow runs $400–$900 depending on those variables. For fleet customers, {link:/services/fleet-towing|fleet accounts} get priority pricing and net-30 billing. See {link:/pricing|pricing} for light-duty comparisons.",
    causes: [
      "Blown air brake line or dropped air on the BQE or LIE.",
      "Transmission failure on Prospect Expressway or Gowanus grades.",
      "DEF system lockout on diesels — the truck won't exceed 5 mph.",
      "Engine overheating in summer gridlock, especially on uphill segments.",
      "Flat on dual-wheel drive axles where a single-tire change won't solve the problem.",
    ],
    faq: [
      {
        q: "Can you tow a 26' box truck loaded?",
        a: "Yes, with a proper heavy wrecker. If the cargo is hazardous or needs transloading first, we coordinate. Tell dispatch what you're hauling.",
      },
      {
        q: "Where do you tow commercial rigs?",
        a: "To your nominated shop, your terminal, or a truck-capable lot. We verify clearance and access before dispatch.",
      },
      {
        q: "Do you carry commercial on-hook insurance for cargo?",
        a: "On-hook covers the tractor/trailer in transit. Cargo coverage is typically on the carrier's policy — confirm with your dispatcher. COI available in 24 hours for fleet partners.",
      },
    ],
  },

  "flatbed-towing": {
    intro:
      "Flatbed keeps all four wheels off the ground — mandatory for AWD, 4WD, most EVs, low-clearance sports and luxury cars, and any tow going more than about 20 miles. If you're not sure whether your car needs flatbed, ask dispatch before they roll. For in-depth {link:/services/ev-tesla-towing|EV transport} and {link:/services/luxury-exotic-towing|exotic} scenarios, those guides cover the specific handling.",
    rightNow: [
      "Don't let anyone put a wheel-lift on an AWD or EV. Damage to the transfer case or motor costs more than the car.",
      "Move to a spot with at least 40 ft of straight curb — flatbeds need room to angle the deck.",
      "Call dispatch and say 'flatbed' so we don't send a wheel-lift by mistake.",
      "Share make/model/year so the driver knows tie-down points (tow hooks, subframe, never control arms).",
      "If it's a sports car or exotic, mention low clearance — we bring ramp extensions.",
      "Shift to neutral if the car rolls; if brakes are locked, tell dispatch so we bring skates.",
      "Stay clear of the deck during loading — the winch cable is under tension.",
    ],
    dos: [
      "Know your vehicle's tow mode if it has one (Tesla, Mercedes air suspension, Audi A8 air, etc.).",
      "Confirm the driver uses factory tow hooks or subframe pads only.",
      "Photograph tie-down points before the truck leaves.",
      "Disable or raise air suspension before loading if the service manual requires it.",
    ],
    donts: [
      "Don't let hooks touch sheet metal, control arms, or plastic body panels.",
      "Don't assume 'AWD' means 'it's fine on a dolly.' Even a 4-wheel dolly is the wrong answer for most modern AWD.",
      "Don't let the driver rush the approach angle on a low car — scraping the splitter is avoidable.",
      "Don't drive off the deck at destination without checking the ramp contact first.",
    ],
    cost:
      "Flatbed is $175 base plus $5/mile past the first five — see {link:/pricing|full pricing}. Required equipment, not an upsell — if your car is AWD, EV, or low-clearance, this is the correct service. For cross-state moves, {link:/services/long-distance-towing|long distance towing} quotes a flat destination rate. Exotic and six-figure vehicles may route to {link:/services/luxury-exotic-towing|luxury and exotic} for elevated cargo insurance.",
    causes: [
      "AWD or EV needing tow after any breakdown — drivetrain requirements, not optional.",
      "Low-clearance Porsches, Ferraris, McLarens — wheel-lift will scrape the splitter.",
      "Long-distance moves beyond the five boroughs — wheel-lift wear is unacceptable past ~20 miles.",
      "Post-accident vehicles where axles or wheels are compromised.",
      "Motorcycles and ATVs — always flatbed with proper chocks.",
    ],
    faq: [
      {
        q: "How do I know if my car is AWD?",
        a: "Door jamb sticker lists drivetrain, or check the trim badge. All Subarus (except BRZ), most Audis, many SUVs, and every EV are AWD-class for tow purposes. Dispatch can confirm by year/make/model.",
      },
      {
        q: "My Tesla is in 'Tow Mode' — can you roll it?",
        a: "Tow Mode is for loading onto a flatbed with the parking brake released. We still flatbed it — Teslas never wheel-lift. See {link:/services/ev-tesla-towing|EV and Tesla towing} for Tesla-specific steps.",
      },
      {
        q: "Can you flatbed a vehicle that's stuck in a tight parking garage?",
        a: "Depends on ceiling clearance — most garage ramps and decks are too low. We may need to push it out first, or bring in a wheel-lift to extract then transfer to flatbed at street level.",
      },
    ],
  },

  "accident-recovery": {
    intro:
      "After a collision, the tow is half the job — scene cleanup, documentation, and a clean handoff to your body shop is the other half. If there are injuries, 911 first. For the tow side, we coordinate with your insurance and drop directly at the shop your adjuster specifies. See {link:/services/insurance-claim-towing|insurance claim towing} for direct-bill details and {link:/services/auto-body-collision-delivery|auto body delivery} for post-scene shop handoff.",
    rightNow: [
      "Check yourself and your passengers first. 911 if anyone is hurt — FDNY and NYPD respond before any tow operator is allowed to the scene.",
      "If vehicles are still in a travel lane and drivable, move to the shoulder if it's safe. If not, stay in the vehicle with seatbelts on until help arrives.",
      "Photograph everything — license plates, damage, debris pattern, traffic signs, street signs, weather conditions. Time-stamped.",
      "Exchange info: name, insurance carrier, policy number, phone, license, plate. Don't admit fault on scene.",
      "Call your insurance carrier to open the claim — get a claim number while you're still on scene.",
      "Call dispatch for the tow. Share your claim number and carrier — we bill direct in most cases.",
      "Tell the driver if airbags deployed or fluids are leaking — it changes the loading procedure.",
    ],
    dos: [
      "Get the NYPD accident report number before you leave the scene.",
      "Photograph the cargo area and any valuables before the tow truck leaves.",
      "Let the driver do the cleanup — glass, plastic, fluid absorbent.",
      "Forward the tow driver's contact to your adjuster — they may want the photos.",
    ],
    donts: [
      "Don't drive a vehicle with airbag deployment — even if it's 'rolling.'",
      "Don't let the other party's insurance dictate where your car goes. You pick the body shop.",
      "Don't accept a cash settlement at the scene — once the tow happens, hidden damage can emerge.",
      "Don't leave valuables in the car when it goes to the impound or shop.",
    ],
    cost:
      "Accident recovery starts at {link:/services/flatbed-towing|flatbed rates} plus scene-cleanup labor if needed. We bill most major carriers (Geico, Progressive, State Farm, Allstate, USAA, Liberty Mutual, Farmers) directly when coverage applies — you pay nothing out of pocket in those cases. See {link:/services/insurance-claim-towing|insurance claim billing} for details. For at-fault or uncovered situations, pay on scene and submit the itemized receipt for reimbursement.",
    causes: [
      "Rear-end collisions at stop-and-go on the BQE, FDR, and LIE.",
      "Parking-lot scrapes that somehow become structural — airbag deployment from minor-looking impacts.",
      "Pothole-induced suspension damage that strands the vehicle.",
      "Deer strikes on Hylan Boulevard and in the Bronx near Pelham Bay Park.",
      "Hit-and-run in residential parking — more common than drivers expect.",
    ],
    faq: [
      {
        q: "The other driver is insisting on their tow company. Can I refuse?",
        a: "Yes. Your policy gives you choice of tow operator and body shop in almost all cases. Call dispatch directly.",
      },
      {
        q: "My car is blocking traffic on the BQE — what first?",
        a: "911. NYPD and Port Authority (if on a bridge) coordinate emergency removal. Once cleared, we take over.",
      },
      {
        q: "Do you provide photos for my insurance claim?",
        a: "Yes — the driver takes timestamped photos at load and drop. We email the file within minutes of completing the tow.",
      },
      {
        q: "Can you store the vehicle if the shop can't take it immediately?",
        a: "Yes, short-term storage is available. Storage fees apply after the first 24 hours — dispatch will quote before we move it.",
      },
    ],
  },

  "long-distance-towing": {
    intro:
      "Long distance means flatbed — the only safe way to move a vehicle more than about 20 miles. Upstate, Jersey, Connecticut, PA, Boston, DC corridor. Quoted flat-rate per destination, no meter-running. For in-city transfers, {link:/services/flatbed-towing|flatbed towing} is the right service; for moves involving classics or exotics, route to {link:/services/classic-antique-car-transport|classic transport} or {link:/services/luxury-exotic-towing|luxury transport} for the right equipment.",
    rightNow: [
      "Call dispatch at least 24 hours ahead for non-emergency long-distance — we schedule a route, not just a truck.",
      "Confirm the destination address, the drop contact, and whether anyone will be there to receive.",
      "Tell dispatch the vehicle state — running, non-running, wheels turn freely or not.",
      "Remove valuables and any loose items inside the car. Long-distance transit is the wrong time to leave things behind.",
      "Photograph the car before loading — all four corners, interior, wheels, any existing damage.",
      "Provide keys. For non-running vehicles that won't roll, we bring wheel skates.",
      "Confirm payment method before loading — flat-rate quoted, full amount due at drop (or 50% up front on runs over 300 miles).",
    ],
    dos: [
      "Schedule 24-72 hours ahead for best availability and pricing.",
      "Mention fuel level — we prefer a quarter tank for transit.",
      "Provide an alternate drop contact if the primary might be unavailable.",
      "Get the truck's live GPS link to share with the receiving party.",
    ],
    donts: [
      "Don't attempt long-distance on a wheel-lift — AWD or not, it wears tires and strains the drivetrain.",
      "Don't assume bad weather means delay — we plan routes around conditions.",
      "Don't leave personal items in glove compartments or trunks during transit.",
      "Don't skip the pre-load photo set — it's your only record if transit damage occurs.",
    ],
    cost:
      "Flat-rate per destination — no meter. A sample: NYC to Boston runs roughly $800–$1,100, NYC to Philadelphia $500–$700, NYC to DC $1,100–$1,500. Factors: vehicle size (standard car vs. truck/SUV), drivability, and round-trip vs. one-way. See {link:/pricing|pricing} for intra-city flatbed rates. Overnight transport with sealed driver is available on request. {link:/services/dealer-auto-transport|Dealer accounts} get volume pricing on regular inter-state runs.",
    causes: [
      "Out-of-state move with a non-running vehicle or second car.",
      "Restoration shop in upstate NY or PA that specializes in your make.",
      "Dealer trade between franchise locations across the tri-state.",
      "College student driving home for break with a car that just quit.",
      "Snowbird moves — NYC to Florida, Florida to NYC, seasonal.",
    ],
    faq: [
      {
        q: "How far do you tow?",
        a: "Northeast corridor regularly — NY, NJ, CT, MA, PA, DE, MD, DC, VA. Longer distances by quote. Anything beyond roughly 500 miles, we coordinate with a partner auto-transport carrier.",
      },
      {
        q: "What if I need to track the truck in transit?",
        a: "We send a live GPS link at dispatch — you and the receiving party can both watch the route.",
      },
      {
        q: "Overnight transport — is the vehicle secure?",
        a: "Yes. Sealed-truck option available. Locked compound overnight where a driver stops. Rates include security-grade staging.",
      },
    ],
  },

  // ---------- ROADSIDE ----------
  "roadside-assistance": {
    intro:
      "Roadside covers everything that isn't a tow — {link:/services/jump-start|jump starts}, {link:/services/flat-tire-change|flat tires}, {link:/services/lockout-service|lockouts}, {link:/services/gas-delivery|gas delivery}, and {link:/services/winch-out-recovery|winch-outs}. Flat-rate call-out, dispatched from trucks already in your borough. If the issue turns out to need a tow instead, the roadside fee credits toward it.",
    rightNow: [
      "Pull to a safe spot with hazards on. Don't work on the car in a travel lane.",
      "Call dispatch and describe the symptom in plain language — 'won't start, clicking,' 'flat front driver,' 'keys inside,' 'ran dry.'",
      "Share year/make/model — it dictates tools (key codes for lockouts, battery group sizes for replacement, lug patterns for tires).",
      "Stay with the vehicle if it's safe. If you have to step away, text dispatch so the driver can call you on arrival.",
      "Collect your ID and keys (if applicable). Driver will want visual confirmation the vehicle is yours.",
      "If you're not sure whether it's a roadside fix or a tow, describe the symptom — dispatch calls it on the phone.",
      "Don't try to diagnose beyond what's visible — let the driver do it on scene with real tools.",
    ],
    dos: [
      "Keep dispatch's text thread open — we push truck numbers, ETAs, and driver names there.",
      "Watch for the truck number — dispatcher gives it to you on the call.",
      "Have payment ready at completion — card, Apple Pay, Google Pay, or cash.",
      "Ask for the receipt by email on scene.",
    ],
    donts: [
      "Don't flag a passing tow truck off the street.",
      "Don't use credit-card 'free roadside' without checking the coverage cap — overages surprise people.",
      "Don't ignore a warning light that comes back on right after a jump — something else is draining the battery.",
      "Don't refuse the alternator test — it's a 30-second check that saves a second call.",
    ],
    cost:
      "Roadside calls are $85 flat — {link:/services/jump-start|jump}, {link:/services/flat-tire-change|tire}, {link:/services/lockout-service|lockout}, or {link:/services/gas-delivery|gas}. Fuel delivered is billed at cost plus a small handling fee. {link:/services/winch-out-recovery|Winch-outs} start at $125 depending on difficulty. If the fix turns into a tow, the $85 credits against the tow fee. See {link:/pricing|full pricing} for tow rates.",
    causes: [
      "Cold-morning dead batteries, peak January through March.",
      "Pothole-punctured tires on the FDR, BQE, Cross Bronx.",
      "Keys locked inside while running into a bodega or garage.",
      "Ran dry between Holland Tunnel and the nearest Manhattan station.",
      "Stuck in a snowbank on a plowed-in alternate-side street.",
    ],
    faq: [
      {
        q: "Is roadside faster than a tow?",
        a: "Usually yes — roadside is simpler to dispatch and typically 20-35 min. Tow arrival is 20-40 min depending on traffic and equipment.",
      },
      {
        q: "My AAA card — should I call them or you?",
        a: "Either works, but AAA subcontracts to whoever's cheapest. Calling us directly is usually faster and you avoid the coverage cap.",
      },
      {
        q: "What if the fix isn't covered by my symptom description?",
        a: "The driver assesses on scene. If it's a tow, the $85 credits. If it's a simple add-on (replace a cable terminal, swap a fuse), we quote before doing it.",
      },
    ],
  },

  "jump-start": {
    intro:
      "Dead batteries spike November through March — NYC overnight temps kill marginal batteries that were fine in July. A jump gets you going, but we test the alternator before leaving so you don't strand again two blocks later. If the battery itself is toast, {link:/services/battery-replacement|battery replacement} swaps it on scene.",
    rightNow: [
      "Key off. Don't keep cranking a dead battery — starter motors don't love it.",
      "Turn off everything electrical: climate, lights, radio, seat heaters.",
      "Call dispatch. Tell us year/make/model — European cars (BMW, Audi, Mercedes) often need the battery registered after a jump.",
      "Do NOT try to jump from a hybrid or EV — their 12V auxiliary systems aren't designed to donate amps.",
      "If you smell rotten eggs or see white crust around the battery terminals, don't attempt a jump — call dispatch and describe it, it could be a venting battery.",
      "Stay in the vehicle during the jump; we do the work outside.",
      "Let the car run 10-15 minutes after the jump before shutting it off — alternator needs to recharge.",
    ],
    dos: [
      "Ask for a load test on the battery itself — good batteries pass, dying batteries don't.",
      "Ask for an alternator voltage check at idle — should read 13.8-14.4V.",
      "Note how old the battery is. 5+ years old in NYC is on borrowed time.",
      "Drive for 20+ minutes after the jump to recharge — a 3-block trip to a bodega is not enough.",
    ],
    donts: [
      "Don't accept a jump without the alternator check — you'll be dead again at the next stop.",
      "Don't jump from another vehicle on your own with janky cables — arcing on door handles and bumpers is real.",
      "Don't park and leave the car off immediately after a jump — charge time matters.",
      "Don't ignore a clicking-only sound — that's the starter relay, not a jumpable symptom.",
    ],
    cost:
      "Jump-start is $85 flat, arrival 20-30 min typical. Includes the jump plus battery load test and alternator voltage check. If the battery needs replacement, {link:/services/battery-replacement|battery replacement} is quoted on scene — common group sizes in stock on every truck. If the alternator is bad, a jump won't hold, and we recommend a tow to a shop — the $85 credits against the tow. See {link:/pricing|full pricing} for tow rates.",
    causes: [
      "Cold overnight temps — below 20°F kills marginal batteries.",
      "Left interior lights on after parking. Classic.",
      "Short-trip-only driving — battery never fully recharges.",
      "Parasitic draw from aftermarket alarms, dashcams, or USB chargers.",
      "Battery at end of life — 4-6 years is typical in NYC.",
    ],
    faq: [
      {
        q: "How long should a jump last?",
        a: "Long enough to get you to a charge cycle if the battery is good. If the battery is bad, it dies again within hours — which is why we test before leaving.",
      },
      {
        q: "My BMW dash says 'register new battery' after the jump — is that you or the car?",
        a: "That's the car. European makes (BMW, Audi, Mercedes, Volvo) log charging patterns to the BCM. If the battery gets replaced, we re-register it with our scan tool. If it's just a jump, no registration needed.",
      },
      {
        q: "Can you jump-start a hybrid 12V?",
        a: "Yes — hybrids have a 12V auxiliary battery separate from the drive battery. We jump the 12V exactly like any ICE car.",
      },
    ],
  },

  "battery-replacement": {
    intro:
      "When the battery is done, a jump is a waste of your $85. We carry common group sizes on every truck (24F, 34, 35, 48, 49, 65, 75, 78, 94R, and the European DIN sizes) and swap on the spot. For European cars that need {link:/services/mobile-mechanic-on-site-repairs|BCM registration}, we carry the scan tools. Combines neatly with a {link:/services/jump-start|jump start} when the diagnostic doesn't go the way you hoped.",
    rightNow: [
      "Call dispatch before you try to drive to a shop — a dying battery that barely starts once probably won't start twice.",
      "Share year/make/model/trim — that's what dictates the group size and whether the battery needs registration.",
      "If you have the build sheet or old receipt, mention the battery group size — it speeds things up.",
      "Don't disconnect the battery yourself before we arrive — you'll lose radio codes, some car's ECU adaptations, and any telematics session.",
      "Note where the battery is — most are under the hood, but BMW 5/7 series are in the trunk, some Fords are under the back seat.",
      "Have the owner's manual handy if possible — tells us exact group size and any quirks.",
      "Stay with the vehicle. The install itself takes 15-20 minutes on most cars, longer on European platforms that need scan-tool registration.",
    ],
    dos: [
      "Keep the old battery paperwork — warranty on a dying 3-year-old unit may still apply.",
      "Ask for the new battery's manufacturer date code — fresh batteries start the warranty clock right.",
      "Confirm any start/stop function re-activates after install.",
      "Test your trunk release and power accessories before the truck leaves.",
    ],
    donts: [
      "Don't buy a battery at AutoZone and try DIY in a parking garage — torque specs and registration matter.",
      "Don't reuse old corroded terminals — new ones are cheap and they don't arc.",
      "Don't skip the BCM registration on European makes. Car will drain the new battery in 3 months without it.",
      "Don't leave the old battery in the trunk — it's hazardous waste. We take it.",
    ],
    cost:
      "Battery replacement is the $85 roadside call-out plus the battery itself at retail price. Standard group sizes run $150-$250 for a quality battery; European AGM or EFB run $250-$400. BCM registration on German makes is included — no upcharge. Old battery goes with us for recycling. See {link:/pricing|full pricing}. If scan-tool diagnosis reveals an alternator issue, the $85 credits toward a tow via {link:/services/jump-start|jump-start service escalation}.",
    causes: [
      "Battery age — 4-6 years is the NYC lifespan given heat, cold cycles, and short trips.",
      "Repeated deep discharges from interior lights or parasitic draw.",
      "Failed internal cell — a 3-year-old battery that suddenly won't hold a charge.",
      "Salt-water exposure on coastal (Rockaway, Coney, Gerritsen) streets.",
      "Start/stop systems wearing AGM batteries faster than expected.",
    ],
    faq: [
      {
        q: "Will you have my exact battery in stock?",
        a: "Common group sizes are on every truck. For rare or AGM-specific sizes, dispatch confirms stock before roll — if we don't have yours, we source locally and install same-day.",
      },
      {
        q: "Do you dispose of the old battery?",
        a: "Yes — we take it to licensed recyclers. You don't handle it.",
      },
      {
        q: "What warranty do I get?",
        a: "Manufacturer warranty on the battery (typically 2-4 years free replacement), plus our install warranty. Paperwork emailed with the receipt.",
      },
    ],
  },

  "gas-delivery": {
    intro:
      "Ran dry between the Holland Tunnel and the nearest Manhattan station, or on the Cross Bronx with nothing in sight for miles — we bring gas or diesel to you. Standard delivery is 2 gallons, which is more than enough to reach a pump. Works on bridges, tunnels, highways, and anywhere in the five boroughs. If the tank's been dry for a while and the fuel pump strained, add a {link:/services/jump-start|jump start} check to the call.",
    rightNow: [
      "Get to a shoulder or parking spot. Don't coast in a travel lane if you can avoid it.",
      "Hazards on. If you're on a bridge or tunnel with no shoulder, call 911 first — authority needs to manage the scene.",
      "Call dispatch. Confirm gas or diesel (NEVER guess — wrong fuel in a diesel is a $3,000+ fix).",
      "Stay in the vehicle. Walking to a station on the Cross Bronx or the FDR is genuinely dangerous.",
      "Tell dispatch whether it's a short pulse of fuel you need or if you want a full fill — we carry up to 5 gallons.",
      "After fuel is in, crank for 3-5 seconds, stop, wait 10 seconds, crank again. Fuel lines need to prime.",
      "If it won't start after 2-3 prime cycles, the fuel pump may be heat-soaked — wait 10 min and try again, or we tow.",
    ],
    dos: [
      "Drive directly to the nearest station after the delivery — 2 gallons gets you there, not across the city.",
      "Fill up completely at the station — running low repeatedly stresses the pump.",
      "Keep the delivery receipt if your insurance or employer reimburses roadside.",
      "Ask the driver about fuel quality — we source from major chains.",
    ],
    donts: [
      "Don't 'just make it' past an exit with a station visible — gauges lie below 20 miles remaining.",
      "Don't accept gas in a diesel or vice versa. Ever. If in doubt, check the filler cap.",
      "Don't use lawn-mower gas cans from your trunk — they're not vented right and can leak into the cabin.",
      "Don't shut the car off right after refuel — let the fuel system build pressure by running a few minutes.",
    ],
    cost:
      "Gas delivery is $85 flat call-out plus fuel at cost plus a small handling fee. Standard delivery is 2 gallons, usually under $15 in fuel cost. Up to 5 gallons available on request. See {link:/pricing|full pricing}. If the vehicle won't restart after fueling — fuel pump damage from running dry is possible — the $85 credits toward a {link:/services/roadside-assistance|roadside diagnosis} or tow.",
    causes: [
      "Range estimator miscalculation on highway vs. city driving.",
      "Forgetting to fill before leaving a long bridge or tunnel approach.",
      "Fuel gauge sender failure — tank shows quarter but it's empty.",
      "Running on 'E' repeatedly and finally miscalculating by a mile.",
      "Cold-weather gas-line condensation dropping usable fuel below the pickup.",
    ],
    faq: [
      {
        q: "Can you deliver diesel?",
        a: "Yes. Specify diesel on the call — we bring diesel from our dedicated fuel supply.",
      },
      {
        q: "What if my car still won't start after the fuel delivery?",
        a: "Could be the pump heat-soaked from running dry. We diagnose on scene. If it's a tow, the $85 credits.",
      },
      {
        q: "Can I pay for the fuel separately from the service call?",
        a: "Line-itemized on the receipt — service + fuel + handling. You see the breakdown before paying.",
      },
    ],
  },

  "flat-tire-change": {
    intro:
      "Flats on a narrow NYC shoulder or a bridge lane are where people get hurt changing their own tires. We come to you with a proper impact gun, chocks, and a torque wrench — not the bouncing scissor jack that came with the car. If the damage is a nail in the tread, we can plug on scene; sidewall damage means {link:/services/flatbed-towing|flatbed to a tire shop}.",
    rightNow: [
      "Get fully off the road. On the BQE or FDR, keep going to the next exit if the tire is only low-pressure, not shredded — speed makes a low-pressure tire less dangerous than being on a highway shoulder.",
      "Hazards on. Don't stand between the vehicle and traffic.",
      "Call dispatch. Share year/make/model — it tells us lug pattern, spare type, and whether you have run-flats.",
      "Check if you have a spare. Many newer cars (Tesla, most German luxury, many EVs) have no spare — that's a tow, not a change.",
      "Locate the wheel lock key if your car has wheel locks — usually in the glovebox or trunk.",
      "If the puncture is in the sidewall, don't let anyone try to plug it. That's a tow to a tire shop.",
      "Stay clear of the vehicle during jack-up — we use stable chocks and rated jacks, but traffic is the danger.",
    ],
    dos: [
      "Replace a patched/plugged tire with a new one within 48 hours — plugs are a move-you-home fix, not permanent.",
      "Check spare pressure before you drive away — donut spares often sit at 60 PSI, most run low over time.",
      "Torque lug nuts to spec once you're at a shop — our roadside tool is accurate, but verify at service.",
      "Buy a replacement tire that matches the other three in tread depth if possible.",
    ],
    donts: [
      "Don't drive more than 50 miles on a donut spare or above 50 mph.",
      "Don't reuse a plugged tire on the front — plug tires go on the rear only if at all.",
      "Don't drive on a sidewall puncture. It will blow out.",
      "Don't keep using run-flats beyond their design distance — typically 50 miles at 50 mph, then they're done.",
    ],
    cost:
      "Tire change is $85 flat. Plug-and-patch on scene is included when damage is in the tread. If you have no spare, we tow to a tire shop — that's {link:/services/flatbed-towing|flatbed pricing}. See {link:/pricing|pricing}. If the damage is a sidewall tear, a bent rim, or multiple tires affected (common after a pothole strike), {link:/services/flatbed-towing|flatbed} is the right call.",
    causes: [
      "Pothole strike on the FDR, BQE, or Cross Bronx — especially after winter freeze-thaw.",
      "Nail or screw picked up in construction zones.",
      "Curb strike at a tight NYC parking spot — sidewall damage not visible until it fails.",
      "Slow leak from a valve-stem crack, common on aging rubber stems.",
      "Run-flat tire 'gone flat' — still ridable short distance but needs replacement.",
    ],
    faq: [
      {
        q: "I have no spare. What now?",
        a: "Most new cars don't include one. We either tow you to a tire shop ({link:/services/flatbed-towing|flatbed}) or, if you have roadside tire coverage with your automaker, we coordinate with their network.",
      },
      {
        q: "Can you fix a run-flat?",
        a: "Usually no — run-flats that have been driven on are compromised. Most manufacturers (BMW, Mercedes, Mini) require replacement. We flatbed you to the dealer or tire shop.",
      },
      {
        q: "Do you carry tires?",
        a: "We don't carry replacement tires on the truck (too many sizes). We plug-and-patch on scene or tow to a shop that stocks your size.",
      },
    ],
  },

  "lockout-service": {
    intro:
      "Keys locked inside — or still in the ignition. Modern cars have side-impact airbags in the door; a slim jim fries the airbag module and that's a $2,000+ fix. We use air wedges, long-reach tools, and decoded-entry methods that don't touch anything they shouldn't. For lost keys entirely, we can coordinate with a {link:/services/mobile-mechanic-on-site-repairs|locksmith for key cutting and programming}.",
    rightNow: [
      "Don't panic-break a window. Windows are cheaper than cosmetic body damage from forced entry, but still expensive and a last resort.",
      "Check every door (including rear hatch and fuel door release) — people miss obvious unlocked access all the time.",
      "Call dispatch. Share year/make/model — some modern cars are 'dealer only' unlock and we'll tell you before sending a truck.",
      "Be ready to show ID and registration. We verify you own the car.",
      "If a child or pet is in the car in hot or cold weather, tell dispatch immediately — that's a 911 first, then tow second situation.",
      "If the keys are in the ignition (not just inside), stay calm. Our tools handle that cleanly.",
      "Have payment ready — $85 flat, most cars unlocked in under 10 minutes.",
    ],
    dos: [
      "Keep a spare key at home or with a trusted person for next time.",
      "Consider a Tile or AirTag on the keys — it won't unlock the car but it helps find them.",
      "If your car has a phone-as-key feature, set it up — Tesla, Audi, newer BMW all support it.",
      "Note which side the driver's door opens most cleanly — some sedans are noticeably easier from passenger side.",
    ],
    donts: [
      "Don't let a friend try a coat hanger. Period. That's how paint jobs get destroyed.",
      "Don't call a random locksmith off the street — scam pricing is common.",
      "Don't forget to check whether the trunk or hatch is unlocked before we show up.",
      "Don't panic if the car has no visible access point — we have tools for that.",
    ],
    cost:
      "$85 flat, same as all roadside. See {link:/pricing|pricing}. If the keys are lost entirely (not just locked inside) and you need new keys programmed, that's a dealer or locksmith scope. We can {link:/services/flatbed-towing|flatbed you to the dealer} if needed. If the vehicle is an exotic or has anti-theft coding that requires dealer-only access, we tell you before sending.",
    causes: [
      "Keys on the driver's seat, door closed with automatic lock engagement.",
      "Running into a bodega with the car running — child safety lock engages inside.",
      "Keys in the trunk after unloading groceries.",
      "Keys fell out of a jacket pocket onto the floor mat unnoticed.",
      "Valet stand closed for the night with the keys inside.",
    ],
    faq: [
      {
        q: "Can you unlock any car?",
        a: "Almost — the rare exception is some modern supercars and a few European imports with coded anti-theft that require dealer access. Dispatch tells you on the call.",
      },
      {
        q: "What if the keys are in the ignition and the car is running?",
        a: "Standard situation for us. We unlock with air wedges and a long-reach. No damage.",
      },
      {
        q: "Do you cut or program keys?",
        a: "We don't on-scene, but we can tow you to the dealer or a locksmith that does. That's {link:/services/flatbed-towing|flatbed} scope.",
      },
    ],
  },

  "winch-out-recovery": {
    intro:
      "Stuck in a snowbank after a storm, half off the pavement on a narrow Queens side street, or hung up on a median after a bad merge. Winch-out uses proper rigging — snatch blocks, tree savers, chain hooks — not some bumper-hook pull that warps your frame. For deep-snow extraction specifically, {link:/services/winter-snow-extraction|winter snow extraction} has season-specific gear; for everything else, this is the right call.",
    rightNow: [
      "Don't keep spinning wheels — you're digging in, not getting out. Stop as soon as you realize you're stuck.",
      "Turn off traction control if you're in snow or mud (owner's manual will show the button). Traction control cuts throttle when wheels spin, which means you can't even rock the car.",
      "Call dispatch. Describe the scene — 'snowbank, front end in,' 'off the shoulder, nose-down in a ditch,' 'on a curb, high-centered.'",
      "Set hazards. If you're on a highway, set a triangle or flare 50 ft back.",
      "Don't let anyone try to push the vehicle out manually unless it's inches from free — you'll get hurt.",
      "Share the drivetrain — FWD, RWD, AWD. Determines winch angle and where we attach.",
      "Stay in the vehicle during the pull — we cone the area and you stay clear of the cable zone.",
    ],
    dos: [
      "Ask the driver to hook to factory tow points or subframe — never control arms, bumpers, or body panels.",
      "Move any loose items off the floor — the pull can jar them around.",
      "Photograph the stuck position before we start — useful for insurance if underbody damage is discovered.",
      "Let the driver inspect before driving away — stuck vehicles sometimes have tweaked wheels or bent tie-rods.",
    ],
    donts: [
      "Don't let anyone pull from a trailer hitch on a car that isn't rated for tow receivers.",
      "Don't spin the drive wheels while we're attaching — ruins strap angles.",
      "Don't stand between the vehicle and the winch line — a cable failure is violent.",
      "Don't try to 'just pull it' from a passerby with a rope on a bumper. Plastic bumpers aren't structural.",
    ],
    cost:
      "Winch-out starts at $125. Difficulty factors: depth, angle, drivetrain, and whether a second truck is needed. Deep snow recovery: see {link:/services/winter-snow-extraction|winter snow extraction}. Off-road or severe ditch recoveries can go higher and are quoted on scene. See {link:/pricing|pricing}. If the vehicle can't drive after extraction (bent control arm, flat tire, bent rim), we can {link:/services/flatbed-towing|flatbed it to a shop}.",
    causes: [
      "Plowed-in on an alternate-side street after a storm.",
      "Slid off a shoulder in rain or ice — typical on the LIE and Cross Bronx shoulders.",
      "Got stuck in mud at a job site or a soft lot.",
      "High-centered on a curb or median after a bad turn.",
      "Rolled into a ditch at low speed after a brake failure or distracted-driving incident.",
    ],
    faq: [
      {
        q: "Can you pull a car out of a flooded street?",
        a: "Yes, if the water isn't above the door sills. Deeper than that and the engine has likely hydro-locked — we flatbed, not winch.",
      },
      {
        q: "Will the pull damage my vehicle?",
        a: "Not if we rig right. Factory tow points and subframe attachments only. Pull angles kept shallow. If anything goes wrong, on-hook insurance covers it.",
      },
      {
        q: "Can you winch in Central Park or Prospect Park?",
        a: "We can access most park interiors with permission from Parks Enforcement. Dispatch coordinates with them.",
      },
    ],
  },

  // ---------- SPECIALTY ----------
  "junk-car-removal": {
    intro:
      "Dead cars on residential streets are ticket magnets and eyesores. We pick up non-running vehicles from driveways, curbs, and private lots, handle the title transfer, and pay cash when scrap value supports it. For newer or drivable but unwanted vehicles, see {link:/services/abandoned-vehicle-removal|abandoned vehicle removal} or coordinate with {link:/services/dealer-auto-transport|dealer transport} for trade value.",
    rightNow: [
      "Locate the title. If you don't have it, call your state DMV — some states issue a salvage title on the spot.",
      "Check the plates. Return them to DMV separately if you don't want ongoing registration obligations.",
      "Remove personal items — glovebox, console, trunk. Even old junk cars hide surprising things.",
      "Call dispatch with year/make/model/condition and whether it rolls, steers, and has all four wheels.",
      "Take photos — catalytic converter presence, wheels, interior. They affect the cash offer.",
      "Confirm whether you want cash-at-pickup or an emailed receipt. Titled scrap runs cash-on-scene for most cars.",
      "If no title, mention that up front — some states require DMV affidavit, which adds a day.",
    ],
    dos: [
      "Get any remaining registration refund from DMV if plates are returned intact.",
      "Document the transfer with a bill of sale — we provide one on pickup.",
      "Cancel the insurance policy on the vehicle the day it's picked up.",
      "Keep a copy of the title transfer and bill of sale for tax purposes.",
    ],
    donts: [
      "Don't leave plates attached — they can be reported stolen and tied to your name.",
      "Don't accept a cash offer that's dramatically below scrap value — weight matters and prices are public.",
      "Don't let someone tow it without documentation — you stay liable until title transfers.",
      "Don't forget to cancel insurance — premiums keep running on an abandoned VIN.",
    ],
    cost:
      "Junk car removal is free pickup with a cash payout when scrap value applies. Typical cars pay $150-$500 depending on weight, cat converter presence, aluminum wheels, and current scrap prices. Newer cars with resale value bring more — some offers run $1,000+. No-title pickups are possible in most cases but may carry a small fee for the DMV work. See {link:/pricing|pricing} for comparison tow rates. For {link:/services/classic-antique-car-transport|classic or collector} dead cars, value is often far higher — get a second opinion.",
    causes: [
      "Car sat for years and won't start. Battery dead, fuel gone bad, probably rodent damage.",
      "Accident totaled the vehicle and insurance paid out — they want the car gone.",
      "Inherited a car from a deceased family member and nobody wants it.",
      "Moved apartments and street-parked car got a boot, then got towed, then became someone else's problem.",
      "Mechanical failure exceeded the car's value — cheaper to scrap than repair.",
    ],
    faq: [
      {
        q: "I don't have the title. Can you still take it?",
        a: "Most of the time yes. We help with DMV affidavit for lost-title cases in NY, NJ, CT. Takes about a day extra.",
      },
      {
        q: "How much will I get paid?",
        a: "Scrap weight sets the floor. Resellable parts (catalytic converter, aluminum wheels, recent tires) raise the offer. We quote before loading.",
      },
      {
        q: "What if the car is on the street, not my driveway?",
        a: "Legal in most cases if you have the title. If it's been sitting long enough to be flagged as abandoned, that's {link:/services/abandoned-vehicle-removal|abandoned vehicle removal} scope and the process is different.",
      },
    ],
  },

  "illegally-parked-towing": {
    intro:
      "Private-property tows in NYC are heavily regulated — signage, photos, posted rates, and impound release hours are all DCWP-monitored. Landlords and property managers who try to DIY tow illegally parked vehicles get sued. We handle it by the book. For vehicles abandoned over time (not just illegally parked today), see {link:/services/abandoned-vehicle-removal|abandoned vehicle removal}.",
    rightNow: [
      "Verify your signage meets DCWP requirements — posted at every entrance, legible from the street, stating tow rates and release location.",
      "Photograph the violation — the vehicle, the sign, the time, the plate.",
      "Call dispatch with the address, the plate, and a description of the violation (fire lane, tenant-only, expired permit, etc.).",
      "Verify who authorizes the tow — property manager, landlord, HOA board member.",
      "Do NOT block the vehicle in or damage it — liability hits you, not the driver.",
      "Confirm the impound destination before we roll — DCWP-licensed yard is mandatory.",
      "Document chain of custody from tow to impound.",
    ],
    dos: [
      "Keep a running photo log of unauthorized parking — patterns help with enforcement.",
      "Verify the tenant or permit status before authorizing — occasional mistakes happen.",
      "Post signage at every entrance, not just the main one.",
      "Post the impound yard name, address, and phone per DCWP rules.",
    ],
    donts: [
      "Don't tow without the required signage in place for the required duration.",
      "Don't authorize a tow on personal vendetta — DCWP investigates retaliatory tows.",
      "Don't block in or boot vehicles — neither is legal in NYC for private property.",
      "Don't use a non-licensed tow operator — the vehicle owner can sue you and the operator.",
    ],
    cost:
      "Private-property tows are typically paid by the vehicle owner on release from impound — rates are DCWP-posted and non-negotiable. Property managers may negotiate service agreements with volume. If the vehicle owner abandons the car at impound, the property may absorb some cost. See {link:/pricing|standard tow pricing} for comparison. For {link:/services/fleet-towing|fleet or commercial lot enforcement} on a recurring basis, we set up retainer agreements with priority response.",
    causes: [
      "Tenant-only spaces taken by delivery drivers during peak hours.",
      "Fire lanes blocked at apartment buildings and shopping centers.",
      "Expired-permit vehicles parking beyond their allowed term.",
      "Loading zones used as long-term parking.",
      "Visitor parking occupied by long-term residents or unauthorized guests.",
    ],
    faq: [
      {
        q: "What signage do I need on private property in NYC?",
        a: "DCWP-compliant signage at every entrance, visible from the street, stating 'tow away zone,' the impound yard name and address, and the tow rate. Exact specs are on NYC DCWP's website.",
      },
      {
        q: "Can I tow a vehicle I just saw parked there, or does it need to sit for a while?",
        a: "Immediate on fire lanes, handicap spaces, and clearly-marked no-parking zones. Tenant-only spaces can be immediate if signage is correct. Abandoned-vehicle process has a waiting period — see {link:/services/abandoned-vehicle-removal|abandoned vehicle removal}.",
      },
      {
        q: "What if the tenant disputes the tow?",
        a: "Documentation is your defense. Photos of the violation, timestamp, signage in frame. DCWP adjudicates disputes.",
      },
    ],
  },

  "impound-recovery": {
    intro:
      "Car got towed by NYPD or a private operator? Recovering it from the pound is a half-day of paperwork, fees, and lines — unless we do it for you. We bring the documents, pay the release fees on your behalf, and deliver the vehicle to your home or shop. For cars towed from {link:/services/illegally-parked-towing|private property}, the process differs slightly but we handle both.",
    rightNow: [
      "Find the pound. NYPD pounds: Brooklyn Navy Yard, Queens College Point, Manhattan Pier 76 (W 36th St). Private: check the sign at the original parking location.",
      "Gather documents: registration, driver's license, insurance card, and the tow receipt or notice if you have it.",
      "Check for outstanding tickets — NYPD holds vehicles until all paid summonses clear. Pay online before going to save time.",
      "Call dispatch. Share the pound location and the plate. We quote the recovery service fee + pound fees separately.",
      "If the pound is closing for the night, wait until morning — we recover during open hours, not through the fence.",
      "Make sure your registration is current — expired registration can block release.",
      "Confirm the drop destination — your home, a shop, or a dealer.",
    ],
    dos: [
      "Pay outstanding tickets online before we arrive at the pound.",
      "Bring original documents, not photos on your phone (some pounds require originals).",
      "Confirm the VIN on paperwork matches the vehicle — mistakes happen.",
      "Keep all receipts — pound fees are sometimes reimbursable by insurance.",
    ],
    donts: [
      "Don't go to the pound without documents — wasted trip, lost day.",
      "Don't assume NYPD holds vehicles at the closest pound — they use all three regardless of where they picked you up.",
      "Don't leave valuables in the vehicle once you know it's been towed — pounds aren't high-security.",
      "Don't dispute the ticket at the pound window — that's a separate administrative process.",
    ],
    cost:
      "Impound recovery service fee is typically $150-$250 depending on pound location and traffic. That's separate from the pound's own release fees (NYPD pounds: $185 base plus $20/day storage; private pounds vary). We itemize everything on the invoice so there are no surprises. See {link:/pricing|pricing} for intra-city tow rates. For {link:/services/insurance-claim-towing|insurance-covered tows}, some policies reimburse the recovery service.",
    causes: [
      "Parked in a no-parking zone, alternate-side day, or bus stop.",
      "Private property enforcement — towed from a lot with posted signage.",
      "Registration or insurance lapse discovered during a traffic stop.",
      "Accident scene removal by NYPD or Port Authority.",
      "Abandoned vehicle pickup after the waiting period expired.",
    ],
    faq: [
      {
        q: "Can you recover from any NYC pound?",
        a: "Yes — NYPD Brooklyn Navy Yard, Queens College Point, Manhattan Pier 76, and most private DCWP-licensed pounds. Some upstate or out-of-borough pounds add travel time.",
      },
      {
        q: "What if I can't find my title or registration?",
        a: "Temporary DMV printouts work. We help you get one if needed. The process adds about 2 hours.",
      },
      {
        q: "How long does recovery take?",
        a: "Typically 2-4 hours from dispatch to vehicle delivery at your destination. Longer if outstanding tickets need clearance.",
      },
    ],
  },

  "abandoned-vehicle-removal": {
    intro:
      "Abandoned vehicles on private property are a liability (fluids leaking, fire risk, insurance exposure). On public streets, they're a NYC DOT matter with a specific removal process. We work both — private removal with owner authorization and public-street removal following NYC DOT's posting and waiting period. For fresh illegal parking, see {link:/services/illegally-parked-towing|illegal parking removal}.",
    rightNow: [
      "On private property: verify ownership of the lot or authorization from the property manager.",
      "Document the vehicle — photos, plate, timestamp. Multiple dates showing it hasn't moved help establish abandonment.",
      "On public streets: report to NYC DOT via 311. They inspect, post, and initiate the legal waiting period.",
      "Call dispatch only after DOT clears the vehicle for removal (public streets) or owner authorization is verified (private).",
      "If the vehicle has plates, we run the VIN and attempt owner contact first — due diligence.",
      "Document any damage the vehicle has caused (fluid leaks, impact to landscaping) for insurance.",
      "Confirm destination — scrap yard, impound, or owner-requested location.",
    ],
    dos: [
      "Keep dated photographs of the vehicle for the full waiting period.",
      "Retain records of any attempts to contact the owner.",
      "Verify your insurance covers any liability during removal.",
      "Keep receipts — scrap value credits against removal costs.",
    ],
    donts: [
      "Don't skip the NYC DOT process on public streets — you can be sued by the owner.",
      "Don't tow a vehicle that has a current registration without due diligence first.",
      "Don't authorize removal based solely on 'it looks abandoned' — the owner's timeline may differ.",
      "Don't store the vehicle at your own property — liability shifts to you.",
    ],
    cost:
      "Abandoned vehicle removal is typically $200-$400 for the removal itself, minus any scrap value recovered. If scrap value exceeds the removal cost, the property owner may receive a credit. NYC DOT handles public-street abandoned removals at no cost to residents — call 311. For {link:/services/fleet-towing|fleet yards or commercial lots} with recurring abandoned-vehicle issues, we set up retainer agreements. See {link:/pricing|standard pricing}.",
    causes: [
      "Tenant moved out and left a dead car at the building.",
      "Stolen vehicle dumped on a side street after joyride.",
      "Accident-totaled vehicle where the owner skipped claim filing.",
      "Inherited car with no family willing to handle disposal.",
      "Business closure left fleet vehicles on a lot.",
    ],
    faq: [
      {
        q: "How long does the public-street abandonment process take?",
        a: "NYC DOT typically posts the vehicle for 3-7 days, then removes if no owner response. Call 311 to initiate.",
      },
      {
        q: "What if the vehicle has a plate but no registration?",
        a: "We run the VIN. If the registered owner can be contacted, we give them the opportunity to move it first.",
      },
      {
        q: "Can I keep the scrap value?",
        a: "If you own the property and the vehicle is on it, generally yes. We itemize scrap proceeds on the invoice.",
      },
    ],
  },

  "ev-tesla-towing": {
    intro:
      "Every major EV — Tesla, Rivian, Lucid, Ford Lightning, Ioniq, EV6 — requires flatbed transport. Drive wheels touching pavement while the car is in motion generates current that fries the inverter and motor controllers. That's a $10,000+ mistake. Our EV protocol uses flatbed with winch and optional wheel skates for brick-level unresponsive vehicles. See also {link:/services/flatbed-towing|flatbed towing} for the general rationale.",
    rightNow: [
      "Do NOT let anyone put a wheel-lift or dollies on an EV. Ever.",
      "Check if the car has Tow Mode (Tesla, Rivian, Lucid all do). If it's responsive, engage it — releases the parking brake for safe loading.",
      "Share battery state of charge if known — very low charge may require temperature-controlled transport.",
      "If the car is unresponsive (brick), tell dispatch — we bring wheel skates.",
      "Locate the tow eye (in the frunk or a trunk compartment, often wrapped in foam).",
      "Note whether the battery has been in a recent thermal event (fire, submersion) — that changes the handling protocol significantly.",
      "Stay clear of the battery tray during loading. Tie-downs go on chassis only, never battery.",
    ],
    dos: [
      "Engage Tow Mode if available and the car is responsive.",
      "Let the driver locate and use the factory tow eye.",
      "Share the car's service center of choice — Tesla, Rivian, and Lucid all have specific authorized facilities.",
      "If you have the manufacturer's roadside coverage, call them to coordinate payment — we can invoice directly.",
    ],
    donts: [
      "Don't roll an EV on its own wheels for more than a few feet.",
      "Don't put straps on plastic body panels or the rear diffuser on a performance model.",
      "Don't ignore thermal warnings — a battery that's been submerged or impacted may be unsafe.",
      "Don't tow a damaged EV with an unrated flatbed — our EV-spec rigs have fire suppression equipment.",
    ],
    cost:
      "EV transport is {link:/services/flatbed-towing|flatbed pricing} — $175 base plus $5/mile past five miles. For damaged or brick-level EVs that need skates and extended loading time, small additional fees may apply. See {link:/pricing|full pricing}. Authorized service center transport — Tesla Service, Rivian Service, Lucid Service — is the standard destination. Manufacturer roadside coverage (Tesla Roadside, etc.) reimburses most tows; we can bill them directly in many cases.",
    causes: [
      "Battery state-of-charge hit zero (brick) — most common cause.",
      "12V auxiliary battery dead — the high-voltage battery is fine but the car won't wake.",
      "Software lockout after a failed update.",
      "Thermal warning triggered a protective shutdown.",
      "Post-accident vehicle with battery integrity concerns.",
    ],
    faq: [
      {
        q: "My Tesla is bricked — can I Tow Mode it?",
        a: "If it's responsive to the 12V, yes — there's a sequence to engage Tow Mode via the touchscreen or phone app. If truly bricked, we bring skates.",
      },
      {
        q: "What about Rivian or Lucid?",
        a: "Same rules. Flatbed only. Authorized service center destinations. We know both manufacturers' protocols.",
      },
      {
        q: "Can you transport after a fire?",
        a: "With caution and the right rigging. Some battery fires require DOT clearance before transport. Dispatch assesses on the call.",
      },
      {
        q: "Does manufacturer roadside cover this?",
        a: "Tesla Roadside, Rivian Roadside, and most OEM programs cover flatbed transport. We can invoice direct.",
      },
    ],
  },

  "luxury-exotic-towing": {
    intro:
      "Ferraris, Lamborghinis, Porsches, Rolls-Royces, Bentleys — these cars sit 3-4 inches off the ground and have splitters that shear off on standard tow-truck ramps. Our exotic transport uses low-angle hydraulic flatbeds, wooden ramp extensions, factory tow hook points, and drivers cleared specifically for high-value work. Discretion is standard. For post-accident exotics, see {link:/services/accident-recovery|accident recovery} and {link:/services/insurance-claim-towing|insurance-claim billing}.",
    rightNow: [
      "Don't move the car. Low-clearance splitters can be damaged by something as small as an uneven driveway slope.",
      "Call dispatch and specify 'exotic, low-clearance' so we send the right truck on the first dispatch.",
      "Locate the factory tow hook and the specific thread adapter (often in the trunk or frunk, sometimes in the owner's manual).",
      "Note the car's exact year, make, model, and trim — many exotics have drivetrain-specific handling.",
      "If it has lift mode (R8, 911, Murcielago), engage it before loading.",
      "Share the destination — authorized service center, specialty shop, collection storage.",
      "Valuables: nothing should be left loose in the cabin during transport.",
    ],
    dos: [
      "Ask for the driver's exotic-transport clearance credentials.",
      "Verify on-hook insurance covers the vehicle's appraised value (not just book).",
      "Photograph every panel, every wheel, every tie-down point before the truck leaves.",
      "Confirm enclosed transport if the car is show-quality or concours-level.",
    ],
    donts: [
      "Don't let straps touch any painted surface, chrome, or carbon component.",
      "Don't allow standard-angle ramps — wooden extensions are required for most exotics.",
      "Don't use factory lanyards on production-grade tow straps — they're only rated for light-duty situations.",
      "Don't leave keys in the car during transport unless specifically requested.",
    ],
    cost:
      "Exotic transport is {link:/services/flatbed-towing|flatbed pricing} with elevated cargo insurance available. Low-angle ramps, specialty tie-downs, and cleared drivers are included in the service — not up-sells. For show cars or concours transport, enclosed trailers are available at a premium. See {link:/pricing|full pricing}. For {link:/services/classic-antique-car-transport|classic car transport} with period-correct soft straps, that's the appropriate service.",
    causes: [
      "Battery dead after long storage (common in seasonal drivers).",
      "Flat tire with no spare (most exotics don't carry one).",
      "Minor contact scrape that requires body shop inspection.",
      "Fuel system issue after long sit.",
      "Moving between collection storage and driving season.",
    ],
    faq: [
      {
        q: "Will the driver be discreet at pickup and drop?",
        a: "Yes. No logos on enclosed trailer options. Neutral communication. Our exotic-cleared drivers understand privacy concerns.",
      },
      {
        q: "What's your on-hook insurance limit?",
        a: "Standard is $100K, elevated to $500K or $1M by request 24 hours ahead. Provide appraisal documentation.",
      },
      {
        q: "Can you move a car to an event outside NYC?",
        a: "Yes — to auctions, concours, shows. Coordinated with event organizers if paddock access is needed.",
      },
    ],
  },

  "insurance-claim-towing": {
    intro:
      "After an accident or covered breakdown, insurance tow coverage usually reimburses the operator directly — you never pay out of pocket. We bill Geico, State Farm, Allstate, Progressive, USAA, Liberty Mutual, Farmers, and the major NYC carriers. For scene recovery, see {link:/services/accident-recovery|accident recovery}; for the shop handoff, {link:/services/auto-body-collision-delivery|auto body delivery}.",
    rightNow: [
      "Open the claim before we arrive — call your carrier, get a claim number, confirm tow coverage.",
      "Write down the claim number, adjuster name, and carrier phone.",
      "Call dispatch. Share claim number and carrier — we bill direct in most cases.",
      "Photograph the vehicle damage — even if the adjuster will take their own photos later.",
      "Confirm the drop destination — either an insurance-preferred shop or one of your choice. It's your choice by law.",
      "Give the driver the claim number for the invoice.",
      "Get the NYPD accident report number if applicable — some carriers require it before paying.",
    ],
    dos: [
      "Verify the tow is covered under your policy — rental coverage sometimes excludes tow.",
      "Get the adjuster's direct number before the scene clears.",
      "Keep copies of all invoices and photos.",
      "Check that the shop bills in-network to avoid coverage issues.",
    ],
    donts: [
      "Don't let the other driver's insurance dictate where your car goes.",
      "Don't pay out of pocket if direct bill is available — it complicates reimbursement.",
      "Don't skip the claim number collection — carriers won't pay without it.",
      "Don't assume your credit-card roadside covers this — most caps kick in fast.",
    ],
    cost:
      "Insurance direct-bill: $0 out of pocket when coverage applies. We invoice the carrier directly and you never see the bill. For at-fault scenarios without full coverage, you pay up front at the quoted {link:/pricing|flat-rate} and submit the itemized receipt for reimbursement. For {link:/services/flatbed-towing|flatbed-required} vehicles, billing works identically — the service type doesn't affect direct-bill eligibility. See also {link:/services/accident-recovery|accident recovery} for scene-cleanup labor.",
    causes: [
      "Two-car collision where liability is being sorted.",
      "Single-vehicle incident with comprehensive coverage (pothole, deer strike, tree fall).",
      "Theft or vandalism recovery under comp coverage.",
      "Weather-related damage — flooding, ice, hail.",
      "Fire or fluid-leak related tow under comp.",
    ],
    faq: [
      {
        q: "Which insurance carriers do you bill directly?",
        a: "Geico, State Farm, Allstate, Progressive, USAA, Liberty Mutual, Farmers, Travelers, Nationwide, AAA, and most NYC specialty carriers. If yours isn't listed, we can still coordinate.",
      },
      {
        q: "Do I need to pay anything on scene?",
        a: "Usually no if direct bill is confirmed. Rare cases: deductible-applied tows where carrier requires upfront payment.",
      },
      {
        q: "What if the other driver's insurance is at fault?",
        a: "We can bill them via subrogation. Your carrier handles the recovery; you're held harmless.",
      },
    ],
  },

  "auto-body-collision-delivery": {
    intro:
      "Post-accident vehicles need specific handling — no steering, loose panels, deployed airbags, leaking fluids. We load without adding damage, confirm the shop is open or ready for drop, and deliver with full photo documentation. Ties closely to {link:/services/accident-recovery|accident recovery} on the pickup side and {link:/services/insurance-claim-towing|insurance-claim billing} on the payment side.",
    rightNow: [
      "Confirm the shop is expecting the vehicle — some shops don't accept after-hours drop without prior arrangement.",
      "Give dispatch the shop name, address, and drop contact.",
      "Describe the vehicle condition: steering intact, brakes working, fluids leaking, airbags deployed, structural panel damage.",
      "Photograph everything before load — all four corners, interior, cargo area, dashboard warning lights if visible.",
      "Note any parts in the trunk from the accident — bumpers, trim, broken glass — so they travel with the car.",
      "If the shop can start immediately, arrival time matters — share the truck ETA with them.",
      "Bring claim number and insurance info to hand off with the vehicle.",
    ],
    dos: [
      "Verify the shop has space for the vehicle before dispatch.",
      "Confirm the adjuster knows which shop the car is going to.",
      "Get the shop's key-drop procedure for after-hours delivery.",
      "Request load and drop photos from the driver for your records.",
    ],
    donts: [
      "Don't drive a vehicle with airbag deployment, fluid leaks, or structural damage.",
      "Don't let the other party's insurance select your shop — it's your choice.",
      "Don't leave valuables in the car during transit.",
      "Don't skip the handshake with the shop — they sign a receipt confirming condition.",
    ],
    cost:
      "Collision delivery is {link:/services/flatbed-towing|flatbed pricing} — post-accident vehicles almost always require flatbed. Most work is {link:/services/insurance-claim-towing|direct-billed to insurance}. For scene work beyond the tow (cleanup, document handoff), those are included in the {link:/services/accident-recovery|accident recovery} scope. See {link:/pricing|pricing} for non-insurance situations.",
    causes: [
      "Rear-end collision with airbag deployment.",
      "Parking-lot hit-and-run with door damage.",
      "Fender-bender with structural concerns noticed post-impact.",
      "Flood or fire damage requiring body shop inspection.",
      "Insurance-directed second-opinion move between shops.",
    ],
    faq: [
      {
        q: "Can you drop after hours?",
        a: "With shop authorization — we coordinate key drop, gate codes, or lot staging. Always confirm first.",
      },
      {
        q: "My shop's backed up. Can you store short term?",
        a: "Yes, storage up to 5 days is available. Fees after day 1. Dispatch quotes on the call.",
      },
      {
        q: "What if the shop disputes the condition at drop?",
        a: "Our timestamped photos and signed release cover the condition at load and drop. Disputes resolved with documentation.",
      },
    ],
  },

  "boat-trailer-towing": {
    intro:
      "Boat trailers break down in predictable ways — seized bearings, blown tires, failed couplers, locked brakes. We recover boat trailers, jet ski trailers, utility trailers, enclosed cargo trailers, and car-hauler trailers. If the boat is still on the trailer and combined weight exceeds light-duty, we dispatch {link:/services/heavy-duty-towing|heavy-duty}. For trailer tire problems specifically, see {link:/services/flat-tire-change|tire service}.",
    rightNow: [
      "Pull to a safe shoulder or rest area. Trailers stranded in travel lanes are dangerous.",
      "Chock the trailer wheels if you have chocks. Hazards on the tow vehicle.",
      "Call dispatch. Share: trailer type, combined weight (or empty/loaded), axle count, tire condition, and which component failed.",
      "Don't disconnect the trailer from your tow vehicle until dispatch advises — sometimes it's safer to leave hitched.",
      "Photograph the failure — blown tire, broken coupler, locked brake — for reference.",
      "Note destination: marina, storage lot, home driveway, or repair shop.",
      "If the boat is on the trailer, confirm weight — a loaded 25'+ boat trailer can exceed light-duty capacity.",
    ],
    dos: [
      "Carry a spare trailer tire and the right lug wrench.",
      "Grease bearings annually before boating season.",
      "Check tire pressure before every trip — trailer tires drop pressure fast.",
      "Verify brake actuator fluid (surge brakes) before long hauls.",
    ],
    donts: [
      "Don't try to drive a trailer with a locked brake — you'll damage the drum.",
      "Don't overload beyond rated capacity — blown tires and bearing failures trace back to overload.",
      "Don't store trailers outdoors all winter without bearing protection.",
      "Don't drive a trailer with a failing coupler — uncoupled trailers at highway speed kill people.",
    ],
    cost:
      "Boat and trailer towing is case-by-case quoted — the variables are too broad for a flat rate. Basic trailer tow (empty trailer, intact) starts at light-duty {link:/pricing|flat-rate pricing}. Loaded boat trailers, multi-axle utility trailers, or trailers with damage that requires winching start at heavy-duty. For {link:/services/heavy-duty-towing|heavy-duty trailer recovery}, expect $400-$900 depending on weight and distance. Flat tires only? {link:/services/flat-tire-change|Roadside tire service} may solve it at $85.",
    causes: [
      "Bearing seizure — the grease gave up and the bearing welded itself.",
      "Tire blowout — trailer tires age out faster than they wear.",
      "Coupler failure — rust, overload, or improper installation.",
      "Electric/surge brake lockup — actuator failure.",
      "Axle damage from a pothole strike or curb hit.",
    ],
    faq: [
      {
        q: "Can you tow my boat trailer with the boat on it?",
        a: "Yes, depending on combined weight. Most recreational boats under 25 feet plus trailer stay under heavy-duty threshold. Larger boats: heavy-duty wrecker.",
      },
      {
        q: "What about jet ski trailers?",
        a: "Light-duty territory. Flat-rate flatbed gets the trailer (and jet skis on it) back to your marina or home.",
      },
      {
        q: "Utility trailer with a bent axle — can you move it?",
        a: "Yes. Flatbed with the trailer loaded, straps at the frame. Destination shop handles the repair.",
      },
    ],
  },

  "rv-motorhome-towing": {
    intro:
      "RVs are heavy, tall, and long. A 40-foot Class A diesel pusher can weigh 30,000+ pounds and doesn't fit most repair shops. We dispatch heavy-duty wreckers with the right axle capacity and the local knowledge to route around bridge and tunnel clearance restrictions. For Class B camper vans, standard {link:/services/heavy-duty-towing|heavy-duty towing} applies.",
    rightNow: [
      "Get to the widest, safest shoulder possible. RVs blocking a lane create major traffic events on NYC highways.",
      "Hazards on, triangles out (RVs usually carry proper ones).",
      "Call 911 if you're on a bridge, tunnel approach, or narrow shoulder — NYPD manages the scene first.",
      "Call dispatch and specify 'Class A/B/C' — each class has different recovery equipment.",
      "Share approximate length, GVWR, and whether it's on wheels or has a failure that prevents rolling (dropped air bag, locked brakes).",
      "Check for height restriction routes to your destination — tunnels and parkways don't accept most Class A.",
      "Stay with the RV. Passengers should exit to the far side away from traffic.",
    ],
    dos: [
      "Know your RV's GVWR, length, and height before calling.",
      "Share slide-out status — deployed slides affect loading.",
      "Note any auxiliary vehicle being towed behind (dinghy tow).",
      "Confirm destination accepts RV height and length.",
    ],
    donts: [
      "Don't route an RV through a parkway — trucks, buses, and RVs aren't permitted.",
      "Don't try to drive a Class A with a dropped air bag — suspension damage escalates fast.",
      "Don't skip the destination accessibility check — some dealers can't accept Class A.",
      "Don't disconnect the dinghy tow without dispatch guidance.",
    ],
    cost:
      "RV recovery is quoted per job — no flat rate. Variables: class (A, B, or C), length, weight, recovery complexity, and destination distance. Typical NYC-area Class A recovery runs $800-$1,800. Class C runs $500-$1,200. Class B (camper vans) fits in {link:/services/heavy-duty-towing|heavy-duty} range, $400-$900. Compare to {link:/pricing|standard tow pricing} and note RVs are always a custom quote. {link:/services/fleet-towing|Rental fleet accounts} get priority dispatch.",
    causes: [
      "Blown air suspension bag — most common Class A failure.",
      "Transmission or engine failure on a grade (Verrazzano, Outerbridge).",
      "Tire blowout on dual rear wheels.",
      "Fuel system or DEF lockout.",
      "Leveling jack failure on a driveway or lot.",
    ],
    faq: [
      {
        q: "Where do you tow an RV in NYC?",
        a: "To the RV dealer, a heavy-duty truck shop that can work on it, or a storage facility with the right clearance. We verify destination accessibility before dispatch.",
      },
      {
        q: "Can you move an RV with slides extended?",
        a: "Slides should be retracted for transport. If the slide motor failed, we work around it — but it affects loading time and cost.",
      },
      {
        q: "What about towing a Class A with a car behind it?",
        a: "We disconnect the dinghy tow first, load the RV, and coordinate a separate light-duty tow for the car if needed.",
      },
    ],
  },

  "classic-antique-car-transport": {
    intro:
      "Classic cars need specific handling — no metal hooks on frames that weren't built for modern tow lifts, no winches on original paint, no dollies under wire wheels. For show-quality vehicles, enclosed transport with climate protection. For drivers and survivors, open low-angle flatbeds with wooden ramp extensions. Ties to {link:/services/luxury-exotic-towing|exotic transport} for elevated cargo insurance and {link:/services/long-distance-towing|long distance} for cross-state moves.",
    rightNow: [
      "Don't let the car move on standard tow-truck ramps — lip scrapes on pre-war and muscle cars ruin paint and chrome.",
      "Call dispatch and specify 'classic' with year, make, model, and whether original or restored.",
      "Locate soft tie-down points — frame rails, never body panels or fragile chrome.",
      "If the car has wire wheels, mention it — no dollies, no straps through spokes.",
      "For enclosed transport requests, schedule 24-48 hours ahead.",
      "Provide appraisal value if elevated on-hook insurance is needed.",
      "Photograph every panel, every wheel, and every chrome piece before load.",
    ],
    dos: [
      "Schedule enclosed transport for shows, auctions, and concours events.",
      "Use period-correct soft straps — cotton or nylon, never metal hooks on the body.",
      "Empty the car of loose items — classic interiors are fragile.",
      "Confirm fuel level appropriate for stored or driven status.",
    ],
    donts: [
      "Don't allow modern tow hooks on pre-war frames — the leverage point wasn't designed for it.",
      "Don't let the winch line touch paint or chrome.",
      "Don't transport a classic with marginal cooling in summer on an open truck — radiator plugs happen.",
      "Don't skip the pre-load photo set. Period.",
    ],
    cost:
      "Classic transport ranges from standard {link:/services/flatbed-towing|flatbed pricing} for daily-driver survivors to premium enclosed rates for concours vehicles. Enclosed trailer transport is typically 2-3x open flatbed. Elevated on-hook insurance (up to $1M) available with appraisal documentation. For cross-state moves, see {link:/services/long-distance-towing|long distance towing} with classic-car handling requested. For {link:/services/dealer-auto-transport|dealer-to-auction runs}, volume pricing applies.",
    causes: [
      "Transport to or from restoration shop.",
      "Show or auction event transport.",
      "Movement between collection storage and display.",
      "Post-purchase delivery from a seller.",
      "Evacuation from a garage being vacated or sold.",
    ],
    faq: [
      {
        q: "What's the difference between open flatbed and enclosed transport?",
        a: "Open flatbed is weatherexposed but faster to schedule and cheaper. Enclosed transport protects paint and chrome from road debris, weather, and public view. Concours cars always go enclosed.",
      },
      {
        q: "Can you transport a non-running pre-war car?",
        a: "Yes. Wooden ramp extensions for clearance, cotton straps at frame points, wheel chocks. We bring the right rigging.",
      },
      {
        q: "Do you handle international shipping coordination?",
        a: "We transport to and from ports of entry (Newark, Red Hook, Linden). Actual ocean or air freight is coordinated separately.",
      },
    ],
  },

  "mobile-mechanic-on-site-repairs": {
    intro:
      "Sometimes the problem isn't a tow — it's a corroded battery terminal, a blown fuse, a loose cable, a stuck thermostat, or a sensor you can swap on the curb. We'd rather sell you the fix than sell you the tow. If the diagnosis reveals something bigger, the {link:/services/roadside-assistance|roadside call-out} credits toward a tow via {link:/services/flatbed-towing|flatbed} or appropriate service.",
    rightNow: [
      "Describe the symptom to dispatch in plain language — 'clicks but won't crank,' 'runs rough,' 'overheats on grade,' 'warning light.'",
      "Share year/make/model so dispatch matches the right tech and parts.",
      "Try not to accumulate damage — overheating kept running ruins head gaskets, bad battery drained repeatedly kills the alternator.",
      "Have your OBD-II port accessible if possible.",
      "Don't start disassembling things yourself — diagnostics first.",
      "If you hear unusual noises (grinding, clunking, loud exhaust), note when they started and under what conditions.",
      "Stay with the vehicle — the tech may need you to start it or describe the issue while they diagnose.",
    ],
    dos: [
      "Keep basic maintenance records — it speeds diagnosis.",
      "Let the tech do a scan before committing to repairs.",
      "Confirm parts availability on scene — common items are stocked on the truck.",
      "Get a quote before approving work.",
    ],
    donts: [
      "Don't expect full shop diagnostics on the curb — some issues need a lift.",
      "Don't skip the tow if the tech recommends it — on-curb limits exist for safety.",
      "Don't authorize open-ended 'diagnose and repair' — get a cap.",
      "Don't DIY while waiting — you may hide symptoms the tech needs.",
    ],
    cost:
      "Mobile mechanic service is the $85 {link:/services/roadside-assistance|roadside call-out} plus parts at retail plus labor at posted rates (typically $125-$175/hr). Common parts stocked: batteries, fuses, relays, hose clamps, coolant, brake fluid, washer fluid, belts. For bigger repairs, we quote before starting. If the diagnosis reveals a tow-needed issue, the $85 credits toward {link:/services/flatbed-towing|flatbed} or appropriate tow. See {link:/pricing|pricing}.",
    causes: [
      "Corroded battery terminals disguised as a dead battery.",
      "Blown fuse or relay — cheap fix if you know which one.",
      "Stuck thermostat causing overheating — curb-replaceable on many cars.",
      "Loose serpentine belt or idler pulley.",
      "Coolant hose split — replaceable on scene with proper tools.",
    ],
    faq: [
      {
        q: "Can you do oil changes and routine maintenance?",
        a: "Not typically — oil changes need a lift and disposal coordination. We handle roadside repairs, not shop work.",
      },
      {
        q: "What about brake jobs?",
        a: "Pad swaps on some vehicles are possible curbside in good weather. Rotors and calipers usually need a shop.",
      },
      {
        q: "Will your repair void my warranty?",
        a: "We use OE or equivalent parts. Documentation provided. Warranty-safe for most repair scopes.",
      },
    ],
  },

  "winter-snow-extraction": {
    intro:
      "After an NYC snowstorm, plowed-in cars, stuck-at-the-curb residents, and ice-encased side-street vehicles create a specific extraction category. We bring winches, chains, snatch blocks, shovels, and traction aids. For non-winter stuck situations, {link:/services/winch-out-recovery|winch-out recovery} is the general-purpose service; for routine roadside help in winter, {link:/services/roadside-assistance|roadside assistance} covers it.",
    rightNow: [
      "Stop spinning your wheels. Digging in is faster than getting out.",
      "Turn off traction control — NYC owner's manuals usually show which button.",
      "Call dispatch early. Post-storm demand spikes; arrival times stretch.",
      "Describe the stuck scenario: plowed-in at the curb, snowbank at the corner, iced into a parking spot, high-centered on a plowed ridge.",
      "Don't rock the car if you're already high-centered — more damage to drivetrain.",
      "Clear as much snow as you can from around the vehicle with a shovel if you have one — reduces winch-out time.",
      "Stay in the vehicle during extraction unless the driver asks you to steer.",
    ],
    dos: [
      "Keep cat litter or sand in the trunk during winter.",
      "Keep a folding shovel in the car.",
      "Have a set of chains ready if you drive pre-storm.",
      "Let the driver do the pull — standing in the cable zone is genuinely dangerous.",
    ],
    donts: [
      "Don't continue spinning wheels — overheats transmissions and digs you deeper.",
      "Don't rely on AWD — AWD gets you stuck further from help, not out of trouble.",
      "Don't attach straps to plastic bumpers.",
      "Don't leave the vehicle running unattended to 'warm up' — theft and carbon monoxide risk.",
    ],
    cost:
      "Winter extraction starts at $150 — more than standard {link:/services/winch-out-recovery|winch-out} because of snow-specific gear and time. Deep snow, multiple vehicles blocked in, or ice-bound extractions quote higher. Post-storm surge pricing applies during declared weather events when demand triples. If the vehicle can't move after extraction (flat tire, bent control arm, dead battery), add {link:/services/roadside-assistance|roadside} or {link:/services/flatbed-towing|flatbed}. See {link:/pricing|pricing}.",
    causes: [
      "Plowed-in on an alternate-side-suspended street.",
      "Ice locked the car to the curb overnight.",
      "Snowbank at the corner left by plow trucks.",
      "Slid into a ditch or snowbank on a residential side street.",
      "Stuck in a snow-covered parking lot.",
    ],
    faq: [
      {
        q: "How long until you can reach me after a big storm?",
        a: "During active storms we prioritize life-safety calls first (blocking travel lanes, stranded in dangerous conditions). Residential plowed-in extractions typically 1-3 hours. Dispatch is honest about current wait.",
      },
      {
        q: "Can you extract a car that's buried completely?",
        a: "Yes. We shovel first, then winch. Extraction takes longer; price adjusts for the labor.",
      },
      {
        q: "What about cars parked during a snow emergency?",
        a: "Vehicles that get towed by NYPD during snow emergencies go to {link:/services/impound-recovery|impound recovery} scope — different service.",
      },
    ],
  },

  // ---------- COMMERCIAL ----------
  "fleet-towing": {
    intro:
      "Fleet accounts skip the retail queue entirely. Dedicated dispatch, priority over walk-up calls, consistent drivers who learn your vehicles and yards, COI on file for every property, and net-30 invoicing. Built for DSPs, rideshare operations, rental companies, and contractor fleets. For one-off commercial tows, see {link:/services/commercial-towing|commercial towing}; for scheduled dealer moves, {link:/services/dealer-auto-transport|dealer transport}.",
    rightNow: [
      "For a new fleet account: email or call with fleet size, vehicle types, and typical dispatch volume.",
      "Provide COI requirements for your properties — we match.",
      "Share dispatch protocol — who can authorize a tow, what info goes on the invoice.",
      "Set up a single phone number or account code for all drivers to use.",
      "Confirm net-30 or other billing terms.",
      "Schedule a review call monthly or quarterly — volume and needs shift over time.",
      "If it's an active breakdown, call the fleet line — priority routing kicks in immediately.",
    ],
    dos: [
      "Distribute the fleet dispatch number to every driver.",
      "Pre-authorize specific users for tow approvals.",
      "Review consolidated invoices monthly — patterns reveal fleet health issues.",
      "Keep COI current — expired COI suspends the account.",
    ],
    donts: [
      "Don't let individual drivers negotiate tow rates — consistency matters for accounting.",
      "Don't skip the monthly review — volume grows or shrinks, dispatch adjusts.",
      "Don't pay retail for routine fleet work — the account pricing exists for a reason.",
      "Don't authorize tows via unverified channels — scammers target fleet operators.",
    ],
    cost:
      "Fleet pricing is volume-based — discount off retail for consistent monthly volume. Net-30 billing with consolidated monthly invoices. COI on file. Priority dispatch is included, not a surcharge. For {link:/services/commercial-towing|heavy-duty commercial vehicles}, separate fleet pricing applies. See {link:/pricing|standard rates} for comparison. Custom fleet agreements run based on volume; typical fleet accounts save 15-30% vs. retail.",
    causes: [
      "Delivery fleet with daily roadside needs — batteries, tires, lockouts.",
      "Rideshare operations with 24/7 breakdown exposure.",
      "Rental company recovering vehicles from renters.",
      "DSP running 50+ vans with predictable service demand.",
      "Contractor fleet with work trucks that break down on job sites.",
    ],
    faq: [
      {
        q: "What's the minimum volume for a fleet account?",
        a: "Typically 5+ tows or roadside calls per month. Smaller volumes still get priority but at retail rates.",
      },
      {
        q: "Do you handle after-hours fleet dispatch?",
        a: "24/7. The fleet line is staffed around the clock with priority routing.",
      },
      {
        q: "Can we set up approval hierarchies?",
        a: "Yes. Driver-level, manager-level, and escalation contacts. We only dispatch on authorized approval.",
      },
    ],
  },

  "commercial-towing": {
    intro:
      "Commercial towing overlaps heavy-duty but layers on the logistics side — DOT documentation, driver HOS coordination, cargo preservation, and direct contact with your trucking company's dispatcher. We run heavy wreckers rated for Class 6, 7, and 8 vehicles. No hazmat — that's a separate licensed carrier. For fleet-account setup, see {link:/services/fleet-towing|fleet towing}.",
    rightNow: [
      "Get the rig off the travel lanes if possible. If on a shoulder, set triangles or flares at 50/100/150 ft.",
      "Call 911 if in a live lane on a bridge, tunnel, or highway — Port Authority / NYPD / DOT manage first.",
      "Call dispatch. Share: GVWR, length, loaded status, cargo type (no hazmat), DOT and MC numbers.",
      "Confirm your company's dispatcher has authorized the tow — we can invoice direct with DOT numbers.",
      "For HOS-sensitive drivers, note current time-remaining on the log — receiver may need an alternate driver.",
      "Don't move cargo without company authorization — theft and liability risks.",
      "Share destination — shop, terminal, or yard with heavy-duty clearance.",
    ],
    dos: [
      "Keep DOT and MC numbers, insurance card, and registration easily accessible.",
      "Photograph cargo before tow if possible.",
      "Provide the dispatcher's number at the trucking company for direct coordination.",
      "Confirm destination accepts the vehicle size and weight before dispatch.",
    ],
    donts: [
      "Don't tow hazmat with standard commercial operators — use licensed hazmat recovery.",
      "Don't leave cargo accessible during transit — NYC shoulders attract opportunistic theft.",
      "Don't move a DEF-locked diesel beyond limp-home mode.",
      "Don't skip the pre-tow photos — cargo disputes resolve with documentation.",
    ],
    cost:
      "Commercial towing is quoted per job — vehicle class, weight, distance, recovery complexity. Typical NYC-area class 7/8 tow: $500-$1,200. {link:/services/fleet-towing|Fleet accounts} with consistent volume get discount pricing. See {link:/pricing|standard rates} for light-duty comparison. On-hook insurance covers tractor and trailer in transit; cargo coverage is typically on the carrier's policy. COI available within 24 hours.",
    causes: [
      "Engine failure on the BQE or Cross Bronx during a delivery run.",
      "Brake system failure — air system dropped below operable pressure.",
      "DEF or emissions system lockout on a diesel.",
      "Transmission failure on a grade (Gowanus, Prospect, Verrazzano).",
      "Flat on a dual-wheel axle that can't be changed roadside.",
    ],
    faq: [
      {
        q: "Can you tow a loaded tractor-trailer?",
        a: "Yes, with a heavy wrecker. We verify combined weight and destination clearance first.",
      },
      {
        q: "What about reefer trailers with temperature-sensitive cargo?",
        a: "We coordinate with shippers on time-critical cargo. Reefer units stay running during tow when possible.",
      },
      {
        q: "Do you handle DOT inspections or compliance work?",
        a: "Transport only. DOT inspections and compliance are separate. We can tow to a certified shop for those.",
      },
    ],
  },

  "emergency-247-towing": {
    intro:
      "24/7 means 24/7 — overnight, holidays, snowstorms, same flat rate. The only surcharge is when a job genuinely costs more to execute (heavy-duty in a blizzard, out-of-state at 3 AM), and dispatch tells you before we start. For life-safety scenes (active travel lane, bridge or tunnel deck), call 911 first. For urgent-but-not-emergency breakdowns, see {link:/services/roadside-assistance|roadside assistance}.",
    rightNow: [
      "If anyone is injured or in immediate danger — 911 first, us second.",
      "If the vehicle is in an active travel lane on a highway, bridge, or tunnel — 911 first. NYPD / Port Authority secures before tow.",
      "Call dispatch. Overnight and holiday staffing is full — you get a live NYC dispatcher, not an answering service.",
      "Share location, vehicle condition, and drop destination.",
      "Stay calm — overnight calls feel worse than they are, and we handle them daily.",
      "Have ID and payment ready — nothing changes at 3 AM.",
      "If you're in an unsafe spot and can't move the car, stay in the vehicle with doors locked.",
    ],
    dos: [
      "Know which pound your car might go to if you're in NYC overnight — NYPD uses three main pounds (Brooklyn Navy Yard, Queens College Point, Manhattan Pier 76).",
      "Keep insurance and registration in the car at all times.",
      "Have a backup plan for transportation home overnight.",
      "Save our number in your phone before you need it.",
    ],
    donts: [
      "Don't sleep in the car on a highway shoulder — NYPD will move you or us will move you.",
      "Don't try to walk to a gas station or shop from a dangerous location.",
      "Don't flag random tow trucks off the street at night.",
      "Don't assume your carrier's roadside is open 24/7 — many have reduced overnight capacity.",
    ],
    cost:
      "24/7 calls run at our standard {link:/pricing|flat-rate pricing} — $125 light-duty, $175 flatbed, $85 roadside. No overnight or holiday surcharge. The only higher-cost scenarios are inherently complex jobs (heavy-duty in bad conditions, long-distance in the middle of the night), which are quoted on the call. See also {link:/services/accident-recovery|accident recovery} and {link:/services/heavy-duty-towing|heavy-duty} for scenario-specific pricing.",
    causes: [
      "Dead battery on a cold overnight after a double shift.",
      "Blown tire on the Cross Bronx at 2 AM.",
      "Lockout at a closed garage with no valet on duty.",
      "Accident with the shop closed — tow to overnight storage.",
      "DUI stop — need the car moved before morning.",
    ],
    faq: [
      {
        q: "Is dispatch really live at 3 AM?",
        a: "Yes. NYC dispatcher, not a call center in another state. We staff overnight the same as daytime.",
      },
      {
        q: "What about Christmas, Thanksgiving, New Year's?",
        a: "Operating. Same rate, same staffing. Some drivers trade holidays but coverage is continuous.",
      },
      {
        q: "Snowstorm policy?",
        a: "Operating when roads are safe. Arrival times stretch during heavy snow. If conditions are unsafe, dispatch advises wait time or alternative.",
      },
    ],
  },

  "dealer-auto-transport": {
    intro:
      "Dealer-to-dealer trades, auction pickups, customer deliveries, and inventory rebalancing — B2B scope across NYC and the tri-state. Volume pricing, dedicated dispatch, condition reports at pickup and drop, and integration with dealer management systems. For retail-facing long-haul, see {link:/services/long-distance-towing|long distance towing}; for fleet operations, {link:/services/fleet-towing|fleet towing}.",
    rightNow: [
      "For a new dealer account: call or email with retail group, monthly volume, and typical origin/destination pairs.",
      "Set up dedicated dispatch line and account manager for 20+ moves/month.",
      "Provide key handling procedures — who hands off, where, key boxes or lockboxes.",
      "Share title package procedures — delivered with vehicle or separately.",
      "Set up condition-report photo expectations (pre-pickup and pre-drop).",
      "Confirm insurance requirements — on-hook coverage matches vehicle MSRP.",
      "For auction pickups, provide the lot number, location, and release authorization.",
    ],
    dos: [
      "Use key boxes for after-hours pickups at closed dealerships.",
      "Maintain a master destination list with notes on dock heights, hours, contacts.",
      "Review monthly volume reports — patterns drive pricing tiers.",
      "Confirm every condition photo at each transfer point.",
    ],
    donts: [
      "Don't skip the pre-pickup condition photo — disputes become the driver's word vs. the dealer's.",
      "Don't hand title packages to drivers unless the move specifically includes it.",
      "Don't mix retail tow orders with dealer volume — invoicing gets confused.",
      "Don't forget to update destination dealer contacts when staff changes.",
    ],
    cost:
      "Dealer volume pricing is discount off retail for consistent monthly moves. Flat-rate per destination for common pairs (Manhattan to Long Island, NYC to North Jersey, Queens to Connecticut). Auction pickups coordinated with volume rates. For inter-state inventory moves, see {link:/services/long-distance-towing|long-distance pricing}. {link:/services/classic-antique-car-transport|Classic transport} and {link:/services/luxury-exotic-towing|exotic transport} are available for specialty inventory at appropriate rates. See {link:/pricing|retail rates} for comparison.",
    causes: [
      "Inventory rebalancing between franchise locations.",
      "Auction pickup — Manheim, Adesa, local NYC auto auctions.",
      "Customer delivery — sold vehicle going to the buyer.",
      "Trade-in removal from customer home.",
      "Loaner or service-vehicle swap.",
    ],
    faq: [
      {
        q: "What's the typical turnaround for a dealer move?",
        a: "Same-day for in-state moves, 24-48 hours for auction pickups with release coordination. Longer for out-of-state.",
      },
      {
        q: "Do you handle title packages?",
        a: "Yes — when included in the move. Chain-of-custody documented. Pre-authorized recipients only at drop.",
      },
      {
        q: "What about damaged inventory?",
        a: "Flatbed with full condition photos. Insurance claims coordinated if damage occurred pre-pickup.",
      },
    ],
  },
};

/**
 * Get tips content for a slug. Falls back to a generic set if an unexpected
 * slug is passed (shouldn't happen given generateStaticParams covers SERVICES).
 */
export function getServiceTips(slug: string): Tips {
  return SERVICE_TIPS[slug] ?? GENERIC_FALLBACK;
}

const GENERIC_FALLBACK: Tips = {
  intro:
    "Follow the general protocol below. For service-specific guidance, {link:/services|browse our full service catalog} or call dispatch.",
  rightNow: [
    "Move to a safe location off travel lanes.",
    "Turn on hazards.",
    "Call dispatch with cross-streets, symptom, and vehicle year/make/model.",
    "Stay with the vehicle until help arrives.",
  ],
  dos: ["Document with photos.", "Keep ID and insurance handy.", "Confirm the quoted rate on the phone.", "Get the truck number."],
  donts: ["Don't flag trucks off the street.", "Don't sign blank invoices.", "Don't move a vehicle that shouldn't be moved.", "Don't skip photo documentation."],
  cost: "See {link:/pricing|our flat-rate pricing} page.",
  causes: ["Vehicle-specific — dispatch can explain on the call."],
  faq: [
    { q: "How fast can you arrive?", a: "Typical arrival 20-40 minutes across the five boroughs." },
    { q: "How do I pay?", a: "Card, Apple Pay, Google Pay, or cash. Receipt emailed immediately." },
  ],
};

// ============================================================
// NEIGHBORHOOD-TIPS HELPER for /locations/[state]/[city]/[service]
// ============================================================

export type NeighborhoodArchetype =
  | "dense-manhattan"
  | "brownstone-brooklyn"
  | "bridge-approach"
  | "outer-residential"
  | "coastal"
  | "highway-adjacent"
  | "default";

function archetypeForCity(stateSlug: string, citySlug: string, cityName: string): NeighborhoodArchetype {
  const c = citySlug.toLowerCase();
  const n = cityName.toLowerCase();

  // Manhattan core
  if (stateSlug === "manhattan") {
    if (/(midtown|times-square|hudson-yards|financial-district|soho|tribeca|chelsea|flatiron|hells-kitchen|upper-east|upper-west)/.test(c)) {
      return "dense-manhattan";
    }
    return "dense-manhattan";
  }

  // Brooklyn / Queens brownstone belt
  if (/(park-slope|brooklyn-heights|dumbo|carroll-gardens|cobble-hill|fort-greene|clinton-hill|prospect-heights|boerum-hill|greenpoint|williamsburg|astoria|long-island-city|sunnyside)/.test(c)) {
    return "brownstone-brooklyn";
  }

  // Bridge / tunnel approaches
  if (/(long-island-city|dumbo|red-hook|sunset-park|bay-ridge|bronx|mott-haven|hunts-point|fordham|east-new-york)/.test(c)) {
    return "bridge-approach";
  }

  // Coastal
  if (/(rockaway|coney|gerritsen|sheepshead|bay-ridge|breezy|arverne|seagate|brighton|far-rockaway|howard-beach)/.test(n) || /(coney|rockaway|gerritsen|sheepshead|breezy)/.test(c)) {
    return "coastal";
  }

  // Staten Island, deep Queens / Bronx = outer residential
  if (stateSlug === "staten-island") return "outer-residential";

  // Highway-adjacent (Cross Bronx, LIE, BQE)
  if (/(fordham|morris-park|riverdale|kingsbridge|throgs-neck|pelham-bay|queens-village|jamaica-estates|rego-park|forest-hills)/.test(c)) {
    return "highway-adjacent";
  }

  return "default";
}

/**
 * Generate 2-3 neighborhood-specific tips for a service + city combination.
 * Returns short one-sentence tips.
 */
export function getNeighborhoodTips(
  stateSlug: string,
  citySlug: string,
  cityName: string,
  serviceSlug: string,
): string[] {
  const arch = archetypeForCity(stateSlug, citySlug, cityName);

  const archTips: Record<NeighborhoodArchetype, string[]> = {
    "dense-manhattan": [
      `In ${cityName}, flatbed is the default — most streets are too narrow for wheel-lift to maneuver.`,
      `Tell dispatch the nearest cross-streets rather than an address; ${cityName} blocks change numbers fast.`,
      `Valet stands and luxury-building garages in ${cityName} mean we stage at the curb — have the doorman expect us.`,
    ],
    "brownstone-brooklyn": [
      `${cityName}'s brownstone streets often restrict full flatbeds; dispatch can send a wheel-lift or stage around the corner.`,
      `Alternate-side parking enforcement is tight in ${cityName} — time the tow outside of sweep hours to avoid tickets on other vehicles.`,
      `Stoops and tree pits in ${cityName} make loading angles matter; give the driver room at the curb.`,
    ],
    "bridge-approach": [
      `${cityName} sits near a bridge or tunnel approach — expect longer ETAs during rush hour.`,
      `If the breakdown is on the approach ramps or the bridge itself, call 911 first; Port Authority clears the scene before any tow.`,
      `Dispatch routes around bridge backups in real time — share your direction of travel so we pick the right truck staging.`,
    ],
    "outer-residential": [
      `In ${cityName}, destinations to shops or dealers may be outside the borough — confirm the flat-rate covers the distance.`,
      `Snow extraction and winch-out calls are common in ${cityName} during winter; dispatch has seasonal gear ready.`,
      `${cityName} streets can have low driveway entries and tight yards — give the driver directions beyond just the address.`,
    ],
    coastal: [
      `${cityName}'s coastal humidity corrodes battery terminals and electrical connectors — ask the driver for a connector check on any roadside call.`,
      `Post-storm calls in ${cityName} often involve salt-water corrosion and flooded streets; flatbed protects the drivetrain.`,
      `Beach-season volume spikes ETAs in ${cityName} — book scheduled tows 24 hours ahead when possible.`,
    ],
    "highway-adjacent": [
      `${cityName} breakdowns on shoulders (Cross Bronx, LIE, BQE, Belt) require NYPD coordination — 911 first if you're in a live lane.`,
      `Pothole-induced tire and suspension damage is common in ${cityName} — flatbed is the safe answer for anything past a flat.`,
      `Dispatch knows which direction of the ${cityName}-adjacent highway is backed up right now — share your exit to route faster.`,
    ],
    default: [
      `In ${cityName}, share cross-streets and nearest landmark for fastest dispatch.`,
      `Flat-rate quoted before the truck rolls — ${cityName} residents see the same pricing as any other borough.`,
      `24/7 staffing means ${cityName} overnight and holiday calls are full-price retail, not a surcharge.`,
    ],
  };

  const base = archTips[arch];

  // Service-specific tweak: prepend one service-flavored tip
  const byService: Record<string, string> = {
    "flatbed-towing": `${cityName} drivers call flatbed for AWD, EVs, and low-clearance cars — ask for it explicitly.`,
    "jump-start": `Cold snaps in ${cityName} kill marginal batteries — ask for a load test and alternator check, not just a jump.`,
    "flat-tire-change": `Pothole damage is the top ${cityName} flat-tire cause — sidewall punctures mean flatbed to a tire shop, not a plug.`,
    "lockout-service": `Modern cars in ${cityName} can have airbag modules in the doors — make sure the operator uses air wedges, not a slim jim.`,
    "gas-delivery": `Running dry on a ${cityName} bridge or tunnel approach is more common than drivers admit — 2 gallons gets you to the nearest station.`,
    "winch-out-recovery": `Stuck on a ${cityName} side street or parked-in by a plow? Proper rigging matters — no pulls from plastic bumpers.`,
    "accident-recovery": `After a ${cityName} collision, your choice of tow operator and body shop is protected by law — don't let the other insurance choose.`,
    "ev-tesla-towing": `${cityName} has growing EV volume — always flatbed, never wheel-lift. Tell dispatch it's an EV up front.`,
    "luxury-exotic-towing": `${cityName} exotic owners: specify low-clearance on the call; our drivers bring wooden ramp extensions.`,
    "junk-car-removal": `${cityName} residents: scrap value depends on weight, cat converter, and wheels — ask for the itemized offer.`,
    "illegally-parked-towing": `${cityName} property managers: DCWP-compliant signage is the difference between a legal tow and a lawsuit.`,
    "impound-recovery": `If NYPD towed from ${cityName}, the vehicle can go to any of the three main pounds regardless of neighborhood — check all three.`,
    "heavy-duty-towing": `${cityName} heavy-duty calls need route planning around bridge and tunnel clearance — share GVWR and length on the call.`,
    "long-distance-towing": `From ${cityName} to out-of-state destinations, schedule 24-48 hours ahead for best pricing.`,
    "roadside-assistance": `${cityName} roadside calls dispatch from trucks already in the borough — typical arrival 20-30 minutes.`,
    "battery-replacement": `${cityName} winter battery failures: we stock common group sizes on the truck, including European AGM.`,
    "motorcycle-towing": `${cityName} bike pickups: specify sport, cruiser, or tourer so the right strap and chock combination arrives.`,
    "emergency-247-towing": `${cityName} overnight and holiday rates match daytime — no surcharge, no premium.`,
    "fleet-towing": `${cityName} fleet operators: priority dispatch, consistent drivers, and net-30 invoicing — set up a dedicated line.`,
    "commercial-towing": `${cityName} commercial breakdowns on highways often need NYPD coordination first — dispatch advises.`,
    "winter-snow-extraction": `${cityName} post-storm plowed-in extractions spike demand; call early for priority.`,
    "dealer-auto-transport": `${cityName} dealer moves: volume pricing on consistent monthly runs to North Jersey, Long Island, and Connecticut.`,
    "rv-motorhome-towing": `${cityName} RV recovery requires height and length routing — share class and dimensions on the call.`,
    "classic-antique-car-transport": `${cityName} classic transport: soft straps, wooden ramp extensions, and enclosed options for concours-level vehicles.`,
    "abandoned-vehicle-removal": `${cityName} street-abandoned vehicles require NYC DOT 311 process before removal — the timeline is 3-7 days.`,
    "boat-trailer-towing": `${cityName} boat trailer recovery: combined weight determines light-duty vs. heavy-duty dispatch.`,
    "auto-body-collision-delivery": `${cityName} shop drop: confirm the body shop is expecting the car before we roll — after-hours drop requires arrangement.`,
    "insurance-claim-towing": `${cityName} insurance tows: direct-bill to most major carriers means zero out-of-pocket when coverage applies.`,
    "mobile-mechanic-on-site-repairs": `${cityName} curbside repairs save a shop trip when the problem is a cable, fuse, or stuck thermostat.`,
    "gas-delivery-diesel": "",
    "light-duty-towing": `${cityName} light-duty tows use wheel-lift trucks that fit narrow one-ways — share cross-streets for fast routing.`,
  };

  const serviceTip = byService[serviceSlug];
  const tips = serviceTip ? [serviceTip, ...base.slice(0, 2)] : base.slice(0, 3);
  return tips;
}
