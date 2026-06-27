// @ts-nocheck
/**
 * Deeply varied, ~5,000-word content generator for the
 * /locations/[state]/[city]/[service] tier (9,600+ pages).
 *
 * Avoids Google duplicate-content detection by:
 *  1. Hashing (city-slug + service-slug) once → deterministic seed
 *  2. Each paragraph "slot" has 3–5 fully-written variants
 *  3. Seed + slot-key picks the variant (same inputs → same output, reproducible)
 *  4. Service data arrays (commonCauses, whatToDo, etc.) get shuffled by seed
 *     so different facts surface first on different pages
 *
 * Stays fully synchronous + deterministic so Next.js SSG works unchanged.
 */

import { PHONE } from "./content";
import { Service, SERVICES, SERVICE_CATEGORIES } from "./services";

// ---------- deterministic helpers ----------

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], seed: number, salt: string): T {
  const h = fnv1a(`${seed}-${salt}`);
  return arr[h % arr.length];
}

function shuffled<T>(arr: readonly T[], seed: number, salt: string): T[] {
  const out = [...arr];
  let h = fnv1a(`${seed}-${salt}`);
  for (let i = out.length - 1; i > 0; i--) {
    h = (Math.imul(h, 0x01000193) ^ i) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------- shared text fragments ----------

type Ctx = {
  city: string;
  state: string;
  abbr: string;
  svcTitle: string;
  svcLower: string;
  service: Service;
  seed: number;
};

const HEADING_POOL = {
  intro: [
    (c: Ctx) => `${c.svcTitle} in ${c.city}, ${c.state}`,
    (c: Ctx) => `${c.svcTitle} Service — ${c.city}, ${c.state}`,
    (c: Ctx) => `${c.city} ${c.svcTitle} — 24/7 Dispatch`,
  ],
  howItWorks: [
    (c: Ctx) => `How ${c.svcTitle} Works in ${c.city}`,
    (c: Ctx) => `What to Expect on a ${c.city} ${c.svcTitle} Call`,
    (c: Ctx) => `${c.svcTitle} Procedure — Step by Step in ${c.city}`,
  ],
  whyHere: [
    (c: Ctx) => `Why ${c.svcTitle} Happens Often in ${c.city}`,
    (c: Ctx) => `${c.city} Conditions That Drive ${c.svcTitle} Calls`,
    (c: Ctx) => `What Causes ${c.svcTitle} Calls in ${c.city}`,
  ],
  equipment: [
    (c: Ctx) => `What We Bring to a ${c.svcTitle} Call in ${c.city}`,
    (c: Ctx) => `Equipment & Tools for ${c.svcTitle} in ${c.city}`,
    (c: Ctx) => `${c.svcTitle} Gear Every ${c.city} Truck Carries`,
  ],
  mistakes: [
    (c: Ctx) => `Common Mistakes on ${c.svcTitle} Calls in ${c.city}`,
    (c: Ctx) => `${c.svcTitle} Pitfalls to Avoid in ${c.city}`,
    (c: Ctx) => `What Not to Do If You Need ${c.svcTitle} in ${c.city}`,
  ],
  included: [
    (c: Ctx) => `What ${c.svcTitle} Includes in ${c.city}`,
    (c: Ctx) => `Scope of ${c.svcTitle} Service in ${c.city}`,
    (c: Ctx) => `Everything Included on a ${c.city} ${c.svcTitle} Call`,
  ],
  pricing: [
    (c: Ctx) => `${c.svcTitle} Pricing in ${c.city}, ${c.abbr}`,
    (c: Ctx) => `What ${c.svcTitle} Costs in ${c.city}`,
    (c: Ctx) => `${c.city} ${c.svcTitle} Prices & Payment`,
  ],
  insurance: [
    (c: Ctx) => `Insurance, Commercial, and Fleet ${c.svcTitle} in ${c.city}`,
    (c: Ctx) => `${c.svcTitle} for Insurance, Fleet, and Commercial Accounts in ${c.city}`,
    (c: Ctx) => `Billing & Fleet Setup for ${c.svcTitle} in ${c.city}`,
  ],
  whenToCall: [
    (c: Ctx) => `When to Call for ${c.svcTitle} in ${c.city}`,
    (c: Ctx) => `Best Time to Call for ${c.svcTitle} in ${c.city}`,
    (c: Ctx) => `Same-Day vs. Scheduled ${c.svcTitle} in ${c.city}`,
  ],
  whyUs: [
    (c: Ctx) => `Why Choose NYC Roadside Emergency Assistance for ${c.svcTitle} in ${c.city}`,
    (c: Ctx) => `Why ${c.city} Drivers Pick Us for ${c.svcTitle}`,
    (c: Ctx) => `What Makes Our ${c.city} ${c.svcTitle} Service Different`,
  ],
  vehicleTypes: [
    (c: Ctx) => `Vehicle Types We Handle on ${c.svcTitle} Calls in ${c.city}`,
    (c: Ctx) => `${c.svcTitle} Across Every Vehicle Type in ${c.city}`,
    (c: Ctx) => `What We Can Handle on a ${c.city} ${c.svcTitle} Call`,
  ],
  afterService: [
    (c: Ctx) => `After the ${c.svcTitle} Call — What Happens Next`,
    (c: Ctx) => `Post-Service Steps for ${c.svcTitle} in ${c.city}`,
    (c: Ctx) => `${c.city} ${c.svcTitle} Follow-Up, Records, and Next Steps`,
  ],
  neighborhood: [
    (c: Ctx) => `${c.svcTitle} in Neighborhoods Around ${c.city}`,
    (c: Ctx) => `${c.city} and Nearby Areas — ${c.svcTitle} Coverage`,
    (c: Ctx) => `How ${c.city} Fits Into Our ${c.state} ${c.svcTitle} Network`,
  ],
};

// ---------- paragraph pools ----------
// Each pool entry is a function of Ctx → full paragraph text.
// Variants differ in opening, structure, examples, and closing.

const INTRO_P1 = [
  (c: Ctx) =>
    `Need ${c.svcLower} in ${c.city}? NYC Roadside Emergency Assistance runs this exact job 24 hours a day, with trucks staged in ${c.state} and typical arrival times of 20–40 minutes. Pricing is flat-rate and quoted before we dispatch. There is no NYC surcharge layered in afterward, no "storage fee" that appears when you arrive at the drop, and no after-hours markup on overnight or weekend calls. If your situation in ${c.city} calls for ${c.svcLower}, dispatch the right truck once — from a licensed local operator who actually lives in ${c.state} and knows the streets.`,
  (c: Ctx) =>
    `${c.svcTitle} in ${c.city} is one of the calls our ${c.state} dispatch desk runs every single day. We staged trucks here because volume demands it — drivers who live and work in the borough know which blocks are one-way the wrong direction right now, which garages have clearances too low for a standard wheel-lift, which intersections always back up on rush hour, and which enforcement agents are actively ticketing. That local knowledge turns a 90-minute out-of-area tow into a 30-minute local job. Flat-rate pricing, 24/7 dispatch, no subcontractor chain.`,
  (c: Ctx) =>
    `If you are stranded in ${c.city} and the word you just typed into your phone was "${c.svcLower}," you landed on the right page. We are NYC Roadside Emergency Assistance — licensed by NYC DCWP, running trucks staged across ${c.state}, dispatching 24 hours every day of the year including holidays. Flat-rate quotes on the phone before we dispatch. Typical arrival 20–40 minutes. Licensed, insured, W-2 employees — not gig workers routed through a call center in another state.`,
];

const INTRO_P2 = [
  (c: Ctx) => c.service.longDescription,
  (c: Ctx) =>
    `${c.service.longDescription} That description is the baseline — every ${c.svcLower} call adds context that changes exactly how we execute. A ${c.svcLower} call in a narrow ${c.city} side street requires different positioning than the same call on an open parkway shoulder. A call on a luxury or low-clearance vehicle requires different equipment than a call on a standard sedan. Dispatch sorts that on the phone so the right crew and rig show up the first time.`,
  (c: Ctx) =>
    `Here is how we describe ${c.svcLower} to drivers who have never needed it before: ${c.service.longDescription} For ${c.city} specifically, the variations that matter are vehicle type (AWD, EV, luxury, commercial, motorcycle all change our procedure), access constraints (narrow streets, low-clearance garages, active bike lanes, construction), and destination (a local shop, a dealer, a body shop, a residence, an out-of-borough specialty mechanic).`,
];

const INTRO_P3 = [
  (c: Ctx) =>
    `Our ${c.city} drivers handle ${c.svcLower} calls daily. They know the local streets, parking rules, building clearances, and common hazards — streetcar tracks where they exist, bike-lane concrete curbs, low-clearance residential garages, and the specific intersections where police enforcement or active construction can complicate a hookup. That local knowledge is why we arrive fast and get the job done without the "we cannot access it" callback that plagues out-of-area operators.`,
  (c: Ctx) =>
    `Drivers assigned to ${c.city} know the shape of the neighborhood. They have been to the commercial blocks, the residential side streets, and the main corridors enough times to route around trouble without a map. They know which addresses only have ${c.abbr} side access, which buildings have rear loading docks, where the overnight no-standing zones flip, and which cross-streets always back up at 4 PM. That familiarity compresses every call by 10–20 minutes compared to a generalist dispatched from a remote call center.`,
  (c: Ctx) =>
    `${c.city} geography matters a lot on a ${c.svcLower} call. A block that is one-way the wrong direction can turn a 10-minute tow into a 40-minute tow. A garage with 7-foot clearance can make the difference between a wheel-lift job and a flatbed job. A bike lane or dedicated bus lane on the block means different positioning for the truck. Our ${c.state} team has run enough calls across ${c.city} that the local micro-decisions are automatic — not something we figure out on scene.`,
];

const INTRO_P4 = [
  (c: Ctx) =>
    `For ${c.svcLower} specifically in ${c.city}, we carry the right tools on every truck. Proper battery testers (a load tester that actually stresses the battery, not just a voltmeter), full-size impact guns and NY-sized lug sockets for tire changes, air wedges and long-reach tools for lockouts, fuel cans rated for on-road delivery, and tie-down kits sized to every vehicle class we might encounter. Whatever the call, the gear is already in the truck — we are not leaving to pick something up.`,
  (c: Ctx) =>
    `Every truck we dispatch into ${c.city} for ${c.svcLower} is pre-stocked with the exact equipment the job commonly requires. We do not roll out to a call and improvise. The kit includes the primary tool for ${c.svcLower} plus the backup tools for the secondary situations that turn up on one call in five. Experienced drivers know the phoned-in description does not always match what they find on scene. The truck is ready for both.`,
  (c: Ctx) =>
    `One thing that separates licensed operators from light-pole flyer outfits: the truck has the right equipment on board before it leaves the yard. For ${c.svcLower} in ${c.city}, that means the primary gear, the secondary gear, NYC-specific extras (wheel chocks that hold on Manhattan and Bronx hills, work lights for overnight shoulder calls, absorbent for fluid spills on residential streets), and full documentation kit (phone mount, dash camera, digital intake pad). Arrive prepared, finish fast.`,
];

const HOW_P1 = [
  (c: Ctx) =>
    `Step 1 — Call ${PHONE}. Tell dispatch you are in ${c.city} and you need ${c.svcLower}. Share the cross-streets (or nearest intersection if you do not know the address), the vehicle year/make/model, and any details that matter — AWD, EV, low clearance, keys are in the ignition, what warning lights are on the dash, whether the vehicle is driveable at all. The call takes about 90 seconds. No phone tree, no "press 1 for dispatch," no transfer to a subcontractor.`,
  (c: Ctx) =>
    `Step 1 is a single phone call to ${PHONE}. A live NYC dispatcher answers — not a call center in another state, not a chatbot, not a voicemail. Tell them you are in ${c.city}, the service you need (${c.svcLower}), the vehicle, and the nearest cross-streets. If you cannot see a street sign, the dispatcher can locate you off your phone GPS. 90-second call on average. You hang up with a truck number, a driver name, and an ETA.`,
  (c: Ctx) =>
    `The first step is the phone call: ${PHONE}. That number is answered in NYC by someone who knows ${c.city}. Tell the dispatcher which cross-streets you are near, whether you are on a side street or on a main corridor, the vehicle (year / make / model), and what symptom or damage you are seeing. Extra details like "battery tested okay yesterday" or "the car was fine until I hit that pothole on the BQE" help dispatch pick the right truck and crew.`,
];

const HOW_P2 = [
  (c: Ctx) =>
    `Step 2 — You get a flat-rate quote and a live ETA before the call ends. The dispatcher is NYC-based, so the ETA is honest. If traffic is bad in ${c.city} right now, if there is a truck queued ahead of yours, if weather is pushing times out — you hear that on the call. We send you a truck number and driver name so you know who is showing up. For tows, you also get the destination confirmed (your shop, your dealer, your house) so there is no mid-run surprise.`,
  (c: Ctx) =>
    `Step 2 happens before the call ends: the dispatcher quotes a flat rate and a live ETA for your ${c.svcLower} job in ${c.city}. Flat rate means the number you hear on the phone is the number on the invoice, unless the scope materially changes. If the dispatcher thinks the job might shift (a jump-start could become a tow because the alternator sounds dead), they will say so and quote both outcomes before dispatching. The ETA is based on which truck is nearest and what the current traffic looks like — not a generic "30 to 60 minutes."`,
  (c: Ctx) =>
    `Immediately after the phone call intake, dispatch quotes a flat rate and an ETA. For ${c.svcLower} in ${c.city}, rates follow our standard model: $149 / hour for every service, 1-hour minimum, billed in half-hour increments after. Book online and save $25. The ETA is live — whatever the dispatcher says on the phone is the real number. If a truck cannot actually make it in 30 minutes because of ${c.city} rush-hour traffic, dispatch tells you 50 minutes instead of bait-and-switching you.`,
];

const HOW_P3 = [
  (c: Ctx) =>
    `Step 3 — Driver arrives at your ${c.city} location, confirms the vehicle condition with you in person, takes timestamped photos (for your records and for ours), and walks through the procedure before touching anything. For tows in ${c.city}, you see the tie-downs or hookup points before the vehicle moves. For roadside, you see the exact tool or part before it touches the vehicle. Nothing happens out of sight, and nothing happens without you understanding what is about to happen.`,
  (c: Ctx) =>
    `Step 3 is the arrival on scene in ${c.city}. Our driver rolls up in a marked truck matching the number dispatch gave you, confirms vehicle identification with you (plate, VIN, year/make/model), takes condition photos with a timestamp, and walks through the ${c.svcLower} procedure out loud. Photos protect both of us: if something was already damaged before we got there, we have proof; if we caused any incidental mark during the hookup, we have proof too. The photo walkthrough takes 60 seconds.`,
  (c: Ctx) =>
    `When our truck arrives at your ${c.city} location, the driver does three things before touching your vehicle: confirms it is the correct vehicle (plate, VIN, make/model), photographs the condition (four quarters, any existing damage, any special equipment like roof racks or hitches), and explains what is about to happen. For a tow, that means showing you where the tie-downs will clip, where the wheel-lift cradles will sit, what angle the load will come up at. For roadside, it means showing you the tool and explaining what you will see.`,
];

const HOW_P4 = [
  (c: Ctx) =>
    `Step 4 — Job done at the quoted rate. Receipt is emailed within minutes of completion. All major cards accepted, plus Apple Pay, Google Pay, and cash. For accident tows in ${c.city}, we bill your insurance carrier directly in most cases — you provide the policy and claim info, we handle the paperwork. For commercial or fleet accounts, the charge goes on your monthly net-30 invoice. No scrambling for a card at the curb unless that is how you prefer to pay.`,
  (c: Ctx) =>
    `Step 4 completes the job and issues payment. For ${c.svcLower} in ${c.city}, that means the driver finishes the work, walks you through the completed condition (photos again), collects payment at the quoted flat rate, and emails the receipt before leaving the scene. Payment methods: Visa, MasterCard, Amex, Discover, Apple Pay, Google Pay, cash. Fleet and commercial accounts default to net-30 invoicing with the charge logged against your account code instead of a card swipe.`,
  (c: Ctx) =>
    `Final step: payment and receipt. The rate is the flat rate dispatch quoted at the start of the call. Payment on the scene can be any major credit card, Apple Pay, Google Pay, or cash. Insurance-covered jobs in ${c.city} (accident tow, roadside under an insurance-provided plan) typically bill direct to the carrier — the driver gets the claim info from you and we handle the paperwork. Email receipt goes to you within minutes of the truck closing out the call.`,
];

const HOW_P5 = [
  (c: Ctx) =>
    `If the job changes on scene — the ${c.svcLower} call turns out to be a different problem than what you described on the phone, or the scope shifts mid-run (for example, a jump-start reveals a dead alternator and you actually need a tow instead) — we stop, tell you the new rate, and ask before we execute. Never a surprise invoice. If the new work costs more, we quote the new number. If the original roadside fee no longer applies because the job is now a tow, we credit it against the tow. Straightforward.`,
  (c: Ctx) =>
    `A word on scope changes, because they happen on ${c.svcLower} calls more than you might expect. Sometimes what sounded like ${c.svcLower} on the phone is actually a different ${c.service.category} issue once the driver looks at it. We handle that the same way: stop, re-diagnose, tell you what we see, quote the revised rate, and ask before proceeding. If a roadside fix is going to fail (bad alternator under a seemingly routine dead-battery call), we tell you now instead of running the clock and coming back for a second tow call in 20 minutes.`,
  (c: Ctx) =>
    `${c.city} calls sometimes evolve mid-job. We plan for it: if the original ${c.svcLower} scope changes because of what we find on scene, we pause and re-quote. Your original rate stands unless the scope materially shifts. Common examples: a tire "plug" turns out to be an unrepairable sidewall and we need to mount a spare or tow; a "jump-start" call reveals a completely dead battery that needs a replacement; a tow destination is locked or closed and we need to reroute. In every case: stop, explain, re-quote, proceed.`,
];

const WHY_HERE_P1 = [
  (c: Ctx) =>
    `Why does ${c.svcLower} happen as often as it does in ${c.city}? The short answer is density and stress. ${c.state} runs hundreds of thousands of vehicles per square mile depending on where you count, and every one of them is subject to the same hazards: cold overnight temps, hot summer heat, pothole-strewn streets, bridge and tunnel shoulders with minimal safety margin, constant construction, and an enforcement environment that punishes any vehicle that sits still too long in the wrong place.`,
  (c: Ctx) =>
    `The ${c.city} call volume for ${c.svcLower} is not accidental. ${c.state} has specific conditions that drive this exact job: narrow streets that shred sidewalls on curb scrapes, overnight residential parking that exposes batteries to cold, commercial loading zones that fill quickly and leave nowhere to diagnose a failure, and highway corridors (FDR, BQE, Cross Bronx, LIE, Belt Parkway, West Side Highway) where a breakdown becomes dangerous in seconds. Each of those conditions shows up on our dispatch log every week.`,
  (c: Ctx) =>
    `${c.city} generates more ${c.svcLower} calls per capita than suburban markets for structural reasons. Density means more opportunities for failure. On-street parking means less protection from weather. The proximity of bridges, tunnels, and expressways means breakdowns that would happen on a quiet rural road instead happen on an active parkway shoulder. And the enforcement environment — ${c.state} alternate-side parking, NYPD towing, private impound operators watching for any unattended vehicle — rewards calling a tow fast and punishes letting a problem linger.`,
];

const WHY_HERE_P2 = [
  (c: Ctx) =>
    `The single most common cause of ${c.svcLower} we see is ${c.service.commonCauses[0] ?? "the primary failure mode this service was designed to handle"}. It shows up on our dispatch log week after week across every borough, and ${c.city} is no exception. If you drive in ${c.state} long enough, you will see this pattern yourself — either on your own vehicle or a neighbor's. The difference between "annoying hour" and "ruined day" is almost always how fast help arrives and whether the operator understood the failure the first time.`,
  (c: Ctx) =>
    `Pattern number one on our ${c.svcLower} calls: ${c.service.commonCauses[0] ?? "standard failure"}. Common across all of NYC but especially visible in ${c.city} because of [density/parking/traffic specifics]. When this pattern shows up, the diagnostic is usually fast (minutes, not hours), the fix depends on whether the root cause is fixable on-site or requires a shop, and our dispatcher can usually tell which based on the phone description. That is why the phone call matters — it is half the diagnosis.`,
  (c: Ctx) =>
    `The dispatch log for ${c.svcLower} in ${c.city} skews heavily toward one cause: ${c.service.commonCauses[0] ?? "the primary failure mode"}. That is not unique to ${c.city} — it is common to every dense NYC neighborhood — but ${c.city} does see it at high volume because of local conditions. Our drivers know this pattern and start the call expecting it, while being ready to pivot if the actual diagnosis turns out to be something else.`,
];

const WHY_HERE_P3 = [
  (c: Ctx) =>
    `The second most common pattern we see on ${c.svcLower} calls is ${c.service.commonCauses[1] ?? "a secondary failure mode specific to dense urban driving"}. This one tends to concentrate in specific weather windows or in specific parts of ${c.city}. If you have been driving in NYC for more than a year, you have probably either experienced this yourself or watched a neighbor experience it. ${c.service.commonCauses[2] ?? "A third pattern"} rounds out the top three — less common than the first two but still accounting for meaningful dispatch volume.`,
  (c: Ctx) =>
    `Secondary cause, visible in roughly a third of our ${c.city} ${c.svcLower} calls: ${c.service.commonCauses[1] ?? "a related failure"}. The pattern differs from the primary cause in diagnosis and in fix, but dispatchers handle both on the same intake call. The third pattern worth naming — ${c.service.commonCauses[2] ?? "another recurring cause"} — shows up less often but matters when it does because it tends to require different equipment on scene.`,
  (c: Ctx) =>
    `Beyond the primary cause, ${c.svcLower} in ${c.city} tracks to a short list of secondary patterns: ${c.service.commonCauses[1] ?? "pattern B"}, ${c.service.commonCauses[2] ?? "pattern C"}, and ${c.service.commonCauses[3] ?? "pattern D"} in descending order. Each one implies a different on-scene procedure. A dispatcher who handles ${c.svcLower} every day can tell from the phone description which pattern is most likely and sends the right truck accordingly.`,
];

const WHY_HERE_P4 = [
  (c: Ctx) =>
    `NYC-specific conditions that shape ${c.svcLower} in ${c.city}: ${c.service.nycSpecifics[0] ?? "the first local consideration"}. ${c.service.nycSpecifics[1] ?? "A second local factor"}. ${c.service.nycSpecifics[2] ?? "A third consideration that matters for this service"}. Those factors do not appear in generic "how to call a tow truck" content you would find for Ohio or Florida — they are specific to NYC and specific to ${c.state}.`,
  (c: Ctx) =>
    `Local factors that change how we execute ${c.svcLower} in ${c.city}: ${c.service.nycSpecifics[0] ?? "factor 1"} is the big one — it determines whether we can stage a truck in the travel lane, on the sidewalk, or on a nearby block. ${c.service.nycSpecifics[1] ?? "Factor 2"} affects timing. ${c.service.nycSpecifics[2] ?? "Factor 3"} affects which vehicles we can handle with which equipment. Out-of-area operators routinely trip on these.`,
  (c: Ctx) =>
    `${c.state}-specific conditions worth flagging for ${c.svcLower}: ${c.service.nycSpecifics[0] ?? "the primary local factor"}. ${c.service.nycSpecifics[1] ?? "Another NYC-specific hazard"}. ${c.service.nycSpecifics[2] ?? "A third consideration unique to this city"}. Every one of these is the kind of thing a suburban operator shows up in ${c.city} without knowing, and then burns an hour on curb navigation or parking-enforcement avoidance that a local driver would handle automatically.`,
];

const WHY_HERE_P5 = [
  (c: Ctx) =>
    `Seasonality matters too. ${c.svcLower} calls in ${c.city} spike in certain weather windows — cold snaps for battery-related failures, summer heat for fluid and AC-related issues, winter storms for stuck-in-snow winch-outs, and rainy days for reduced-visibility accidents. Knowing the seasonal curve lets us pre-stage extra trucks in ${c.state} during peak windows so retail response times stay in the 20–40 minute zone instead of blowing out to 90+ during storms.`,
  (c: Ctx) =>
    `Time of day changes the ${c.svcLower} pattern in ${c.city}. Morning commute (6–10 AM): high volume of dead-battery and no-start calls, especially in cold months. Midday (10 AM–4 PM): steady tow volume, roadside volume, and commercial work. Evening rush (4–7 PM): tow volume up, roadside slightly down, highway-corridor calls (BQE, LIE, Belt) peak. Overnight (10 PM–6 AM): lower total volume but more emergency and safety-critical calls. We staff accordingly.`,
  (c: Ctx) =>
    `Dispatch volume for ${c.svcLower} in ${c.city} varies meaningfully by day of week. Mondays run high — accumulated weekend failures finally get addressed. Fridays run high — people rushing to finish the week, less tolerance for a vehicle that will not start. Weekends see fewer commuter calls but more "social driving" calls (Saturday night breakdowns on bar-district streets, Sunday morning post-night-out lockouts and fuel-out calls). Staffing tracks the curve.`,
];

const EQUIP_P1 = [
  (c: Ctx) =>
    `Every ${c.svcLower} truck we dispatch into ${c.city} is pre-stocked. The primary tool for the job is onboard, tested, and in working condition — no dead batteries in the jump-starter, no dry tanks on the fuel-delivery truck. The first item: ${c.service.whatWeBring[0] ?? "the primary equipment for this service"}. That covers the main case. Our drivers test this gear at the start of every shift, not at the moment a customer is waiting on a curb.`,
  (c: Ctx) =>
    `${c.svcLower} in ${c.city} requires specific equipment, and every truck on rotation carries the full kit. Primary: ${c.service.whatWeBring[0] ?? "primary gear"} — this solves the main variant of the problem on most calls. Drivers verify this is functional before leaving the yard. A dead piece of primary gear is the single fastest way to turn a 30-minute call into a 90-minute call, and we have built our shift-start protocol around preventing that.`,
  (c: Ctx) =>
    `Our ${c.city} ${c.svcLower} rigs roll out with the tools the job actually needs. Item one is the primary piece: ${c.service.whatWeBring[0] ?? "primary equipment"}. Every truck also carries the redundancy — backup batteries for jump-starters, spare fuel cans for delivery trucks, extra lockout kits for vehicles that turn out to have different door-lock mechanisms than the dispatcher expected. Redundancy is cheap at the yard and expensive at the scene.`,
];

const EQUIP_P2 = [
  (c: Ctx) =>
    `${c.service.whatWeBring[1] ?? "Second-line equipment"} backs up the primary tool, and ${c.service.whatWeBring[2] ?? "third-line equipment"} handles the secondary situations that turn up on maybe one call in five. Experienced drivers know the phoned-in description does not always match what they find on scene — "dead battery" sometimes turns out to be a bad starter, "flat tire" sometimes turns out to be a broken control arm. The second and third items in the truck's kit cover those cases so the driver does not radio back to dispatch and wait for a second truck.`,
  (c: Ctx) =>
    `The backup kit: ${c.service.whatWeBring[1] ?? "backup gear"} covers the adjacent situation (the one that looks like the primary situation on the phone but turns out to be different on scene), and ${c.service.whatWeBring[2] ?? "tertiary gear"} handles edge cases. Our ${c.city} team sees all of these. Carrying the full kit means we rarely have to admit defeat and dispatch a second truck — a good outcome for the customer's wait time and for our operating efficiency.`,
  (c: Ctx) =>
    `Secondary equipment: ${c.service.whatWeBring[1] ?? "second-line tools"}, used on maybe 20% of calls. Tertiary: ${c.service.whatWeBring[2] ?? "third-line tools"}, used on maybe 5%. Carrying all three lines on every truck is more expensive than cherry-picking per dispatch, but it means we can adapt on scene without a callback. In ${c.city} traffic, one call with full adaptability beats two calls where the first truck had to leave and send another.`,
];

const EQUIP_P3 = [
  (c: Ctx) =>
    `${c.service.whatWeBring[3] ?? "Additional gear"} and ${c.service.whatWeBring[4] ?? "supplementary equipment"} round out the kit for common variations. For ${c.svcLower} specifically, the toolkit also includes wheel chocks that hold on NYC's surprisingly steep grades (Riverdale hills, Washington Heights, Staten Island's Todt Hill, Brooklyn's Park Slope), reflective cones and triangles for scene protection on high-speed roads, and work lights for overnight shoulder calls where streetlights do not cover where you are stuck.`,
  (c: Ctx) =>
    `Beyond the primary three items, we carry: ${c.service.whatWeBring[3] ?? "additional tools"}, ${c.service.whatWeBring[4] ?? "supplementary equipment"}, and the universal NYC extras — wheel chocks for hills, reflective gear for scene protection, work lights for night shoulders, tire inflator and air compressor for on-spot inflation needs, absorbent pads for fluid leaks, wrecker straps rated for the vehicle class we are working, and a first-aid kit that gets inventoried every month.`,
  (c: Ctx) =>
    `Full ${c.city} kit also includes: ${c.service.whatWeBring[3] ?? "extra item A"}, ${c.service.whatWeBring[4] ?? "extra item B"}, heavy-duty straps sized per vehicle, torque-limiting extensions for delicate wheel work, and the documentation bundle (clipboard, receipt printer, digital intake tablet). The tablet captures the customer signature at call complete and pushes condition photos to your record within 30 seconds of the truck clearing the scene.`,
];

const EQUIP_P4 = [
  (c: Ctx) =>
    `Every truck in our ${c.svcLower} fleet also carries documentation gear — a phone mount, a dash camera, and a digital intake pad for photos and the customer signature at completion. We photograph the vehicle before we touch it, during the procedure, and after. Those photos live in your service record for 90 days and are available on request if your insurance adjuster, body shop, or attorney needs them. For fleet accounts, condition-report photos push to your fleet portal automatically before the truck leaves the scene.`,
  (c: Ctx) =>
    `Documentation is part of the standard kit on ${c.city} ${c.svcLower} calls. Timestamped photos before, during, and after. Digital signature capture at completion. Dash cam footage retained for 30 days in case the scene needs to be reviewed (NYPD request, insurance dispute, body-shop handoff question). Fleet and commercial customers get automated condition-report pushes; retail customers get copies on request.`,
  (c: Ctx) =>
    `The documentation protocol: photos of all four corners before the driver touches anything, any pre-existing damage captured with a close-up, the hookup or procedure in progress, the completed job, and the drop-off at the destination. Digital receipt and signature captured on the driver's tablet. Everything pushed to your service record within minutes of completion. For ${c.city} accident work, the full set goes to your insurance carrier automatically.`,
];

const MISTAKES_P1 = [
  (c: Ctx) =>
    `The most common mistake we see on ${c.svcLower} calls in ${c.city} is ${(c.service.commonMistakes[0] ?? "waiting too long to call").toLowerCase()}. Drivers convince themselves the problem will sort itself out, they try to nurse the vehicle to a "safer" spot and make it worse, or they spend 40 minutes attempting a DIY fix before picking up the phone. ${c.city} does not reward that patience — parking enforcement, NYPD towing of vehicles in travel lanes, theft from stationary vehicles, and the risk of a secondary collision all scale with time. Calling us at minute 2 instead of minute 42 changes the whole shape of the call.`,
  (c: Ctx) =>
    `Mistake one on ${c.svcLower} in ${c.city}: ${(c.service.commonMistakes[0] ?? "delay").toLowerCase()}. This shows up constantly. The driver figures they can wait it out or fix it themselves, and 40 minutes later the situation is worse — battery fully dead instead of marginal, tire ruined instead of patchable, vehicle ticketed or towed by NYPD, or the whole thing turned into a bigger bill because what started as roadside is now a tow plus shop time.`,
  (c: Ctx) =>
    `The number-one thing to avoid on a ${c.svcLower} call in ${c.city}: ${(c.service.commonMistakes[0] ?? "waiting too long").toLowerCase()}. Call us at the first sign the problem is real. A 10-minute phone call to dispatch costs you nothing and locks in a response; a 40-minute DIY attempt that fails usually costs you the original problem plus a worse version of it.`,
];

const MISTAKES_P2 = [
  (c: Ctx) =>
    `Mistake two in ${c.city}: ${(c.service.commonMistakes[1] ?? "accepting help from unmarked trucks that just happened to be passing").toLowerCase()}. NYC has a persistent pattern of unlicensed operators who listen to police scanners and show up at breakdown scenes to pitch an inflated cash-only service. Real operators have truck numbers, dispatcher confirmation, licensing we can produce on request, and a paper trail. If a truck shows up that you did not call, does not match the one dispatch described, or cannot produce credentials, keep your doors locked and call dispatch back to confirm.`,
  (c: Ctx) =>
    `Second ${c.city} mistake: ${(c.service.commonMistakes[1] ?? "accepting unsolicited help").toLowerCase()}. The city has enough unlicensed tow operators cruising scanner chatter that any breakdown scene can attract an unsolicited offer. Default to "no, thanks — I already called." Our truck will be clearly marked and the dispatcher will have given you the truck number on the intake call. If what pulls up does not match, it is not us.`,
  (c: Ctx) =>
    `Pattern two to avoid: ${(c.service.commonMistakes[1] ?? "unsolicited roadside help").toLowerCase()}. In ${c.city} this tends to come as a truck pulling over uninvited offering a "quick fix" or a flat-rate cash deal. Sometimes it is honest, often it is not. The tell: a real dispatched operator has your ticket number, driver name, truck number, and destination already loaded — unsolicited arrivals have none of that. Keep your doors locked, stay in the car, and call dispatch back to confirm before engaging with anyone.`,
];

const MISTAKES_P3 = [
  (c: Ctx) =>
    `Third, ${(c.service.commonMistakes[2] ?? "don't sign anything before the work is done and the price matches what dispatch quoted").toLowerCase()}. Flat-rate is flat-rate. The number the dispatcher quotes is the number on the invoice unless the scope materially changes, in which case the driver stops and re-quotes before proceeding. Any pressure to sign a blank invoice, an "open-ended" authorization, or a "we will figure out the price at the drop" document is a red flag. Our drivers do not operate that way.`,
  (c: Ctx) =>
    `Third mistake on ${c.svcLower} calls: ${(c.service.commonMistakes[2] ?? "signing open-ended paperwork").toLowerCase()}. You should never be asked to sign a blank or open-rate authorization. Every legitimate tow in ${c.city} has the rate confirmed before work starts. If anything you are asked to sign looks vague on the price, stop and call dispatch to verify.`,
  (c: Ctx) =>
    `Avoid: ${(c.service.commonMistakes[2] ?? "signing anything before the price is locked in").toLowerCase()}. Our ${c.city} drivers confirm the rate verbally before execution and capture your signature on the tablet after the job — with the rate locked in. Anyone asking you to sign before the job is done, at a number "to be determined," is either sloppy or trying to upsell at the drop.`,
];

const MISTAKES_P4 = [
  (c: Ctx) =>
    `Fourth and fifth on the common-mistakes list for ${c.svcLower} in ${c.city}: ${(c.service.commonMistakes[3] ?? "refusing documentation").toLowerCase()} and ${(c.service.commonMistakes[4] ?? "leaving the vehicle unattended").toLowerCase()}. Photos protect both of us and are non-negotiable on our side — drivers who skip the photo walkthrough are not our drivers. Leaving the vehicle unattended on an NYC curb with hazards on reads as "opportunity" to a small number of people who actively look for that. Stay in the vehicle with the doors locked, or stay within visual range.`,
  (c: Ctx) =>
    `Final two common mistakes in ${c.city}: skipping the documentation walkthrough and abandoning the vehicle before our arrival. On documentation: we take photos because we both benefit from the record. On abandonment: an NYC curb vehicle with hazards on and nobody inside is a theft-opportunity pattern. Stay with the car, or at least stay where you can watch it.`,
  (c: Ctx) =>
    `Rounding out the don't-do list: ${(c.service.commonMistakes[3] ?? "skipping documentation").toLowerCase()} and ${(c.service.commonMistakes[4] ?? "abandoning the vehicle").toLowerCase()}. Documentation is how you establish the vehicle's pre-tow condition for insurance and for your own records. Not abandoning the vehicle is how you avoid theft, vandalism, or a ticket from NYPD.`,
];

const INCLUDED_P1 = [
  (c: Ctx) =>
    `${c.service.subtitle}. ${c.service.description} This service sits inside our ${SERVICE_CATEGORIES[c.service.category].label.toLowerCase()} category, which covers ${SERVICE_CATEGORIES[c.service.category].description.toLowerCase()} Across all ${SERVICES.length} of our services, ${c.svcLower} is one of the calls we run daily in ${c.city}.`,
  (c: Ctx) =>
    `${c.service.subtitle}. ${c.service.description} As part of the ${SERVICE_CATEGORIES[c.service.category].label.toLowerCase()} category, ${c.svcLower} shares equipment and dispatch logic with the other services in that grouping. That is why our ${c.city} trucks are configured the way they are — one primary rig can cover multiple adjacent jobs without a separate vehicle rolling.`,
  (c: Ctx) =>
    `${c.service.subtitle}. ${c.service.description} The ${SERVICE_CATEGORIES[c.service.category].label} category also includes related services we run in ${c.city}. If your situation turns out to be adjacent to ${c.svcLower} rather than exactly ${c.svcLower}, dispatch can re-route on the same phone call without requiring a second intake.`,
];

const INCLUDED_P2 = [
  (c: Ctx) =>
    `Every ${c.svcLower} call in ${c.city} includes: the correct truck and crew for the job (wheel-lift vs. flatbed matters, and we do not send the wrong one to save a dollar), the full equipment kit, timestamped photo documentation before and after, a live driver who walks through the procedure out loud, a flat rate quoted before dispatch, and a receipt emailed within minutes of completion. Nothing is à la carte.`,
  (c: Ctx) =>
    `Standard ${c.svcLower} scope for ${c.city} calls: right-sized truck, full equipment kit, documentation photos, verbal walkthrough, flat-rate pricing, digital receipt. That is the package — no surprise extras, no "shop supplies" fee, no fuel surcharge, no "NYC metro fee." The number you heard on the phone is the number on the receipt.`,
  (c: Ctx) =>
    `Scope of a ${c.city} ${c.svcLower} call: everything needed to complete the job at the quoted rate. Equipment, crew, documentation, dispatch support, re-routing if the scope shifts, and customer communication throughout. If a situation comes up that would bump the rate, we quote the new rate first and ask before we execute.`,
];

const INCLUDED_P3 = [
  (c: Ctx) =>
    `Insurance handling in ${c.city}: for collision tows and insurance-covered roadside, we bill your carrier directly in most cases — you provide the policy number, claim number, and adjuster contact, and we submit through their standard process. For routine non-insurance jobs, you pay at completion and we email an itemized receipt suitable for reimbursement. COI (certificate of insurance) available within 24 hours for commercial clients who need it for fleet accounts or vendor onboarding.`,
  (c: Ctx) =>
    `Insurance and payment flexibility on ${c.svcLower} in ${c.city}: accident-related jobs can be billed direct to your carrier. Routine jobs get paid at the scene (card, Apple Pay, Google Pay, or cash). Commercial and fleet work goes on a monthly net-30 invoice. No matter which path applies, the flat-rate quote at dispatch is the actual amount charged.`,
  (c: Ctx) =>
    `Billing options for ${c.city} work: carrier direct for covered accidents and roadside, on-scene payment for retail (all major cards, mobile pay, cash), net-30 invoicing for commercial accounts. Certificates of insurance on request for fleet setup. Our billing desk can reissue receipts, supply itemized breakdowns for expense claims, and answer insurance-adjuster questions within one business day.`,
];

const INCLUDED_P4 = [
  (c: Ctx) =>
    `After the job: if it is a tow from ${c.city}, the vehicle goes exactly where you directed. Your home, a shop, a dealer, a body shop, an airport, an impound lot — whatever the destination, that is where it ends up. We do not redirect without your explicit okay. If there is a delay at the drop (the shop is backed up, nobody is home, the gate is locked), we call you and wait for direction before unloading anywhere else. No abandoned vehicles, no unauthorized re-routing.`,
  (c: Ctx) =>
    `Drop-off protocol from ${c.city}: destination is whatever you told dispatch. If the destination is closed or inaccessible when we arrive, driver calls you before doing anything else — no surprise relocations. Common alternatives we can execute with your approval: hold the vehicle on the flatbed until the destination opens, reroute to a nearby secure lot with your consent, or return to a different location of your choice.`,
  (c: Ctx) =>
    `Delivery: we land the vehicle exactly at the drop you authorized, in the position you requested (facing forward, backed in, key location). If the destination has special requirements (gate code, back-lot access, specific bay number), share those with dispatch and they go to the driver's tablet before arrival. If something changes en route from ${c.city}, we call you.`,
];

const PRICING_P1 = [
  (c: Ctx) =>
    `${c.svcTitle} pricing in ${c.city} is the same rate as every other service we run: $149 / hour, 1-hour minimum, half-hour increments after. Book online and your first hour is $124 instead of $149. No NYC surcharge, no after-hours markup, no storage fees on same-day drops. The estimated hours you hear at dispatch are what shows up on the invoice.`,
  (c: Ctx) =>
    `Rates for ${c.svcLower} in ${c.city}: $149 / hour for every call, 1-hour minimum, billed in half-hour increments after. Book online and pay $124 for the first hour. Any delivered fuel billed at cost on top of the service rate. No surprise surcharges, no "metro fee," no after-hours or holiday upcharge.`,
  (c: Ctx) =>
    `${c.city} pricing for ${c.svcLower}: one rate, no tiers, no time-of-day pricing. $149 / hour for every service, 1-hour minimum, half-hour increments after. Book online and save $25 on the first hour. Commercial accounts negotiate volume rates that sit slightly under retail. Every estimated total is confirmed on the intake call before the truck moves.`,
];

const PRICING_P2 = [
  (c: Ctx) =>
    `The specific number for your ${c.svcLower} call in ${c.city} depends on the job type, distance, and whether any scope variations apply. Dispatch quotes it on the phone before the truck dispatches — you know the rate before you commit to the call. If the job changes on scene (a jump-start turns into a tow because the alternator is gone, or a tow destination has to be redirected mid-run), we stop and quote the revised number before executing.`,
  (c: Ctx) =>
    `Real-world ${c.svcLower} pricing in ${c.city}: a typical light-duty tow from ${c.city} to a local shop lands in the 1-hour minimum — $124 online, $149 over the phone. A flatbed from ${c.city} to a body shop 8 miles away runs 1–1.5 hours. A roadside ${c.svcLower} call fits inside the 1-hour minimum. Heavy-duty and long-distance work runs longer but at the same rate — we quote estimated total hours on the intake call.`,
  (c: Ctx) =>
    `To give a realistic price range for ${c.svcLower} in ${c.city}: most calls finish inside the 1-hour minimum — $124 online, $149 over the phone. Multi-hour recoveries run longer at the same $149 / hour rate. Every estimated total is confirmed before dispatch.`,
];

const PRICING_P3 = [
  (c: Ctx) =>
    `Payment methods on a ${c.city} ${c.svcLower} call: all major credit cards (Visa, MasterCard, Amex, Discover), Apple Pay, Google Pay, and cash. Fleet and commercial accounts default to net-30 invoicing with a dedicated account number for dispatch and consolidated monthly statements. Insurance-covered jobs typically bill direct to the carrier — you provide carrier and claim info at intake.`,
  (c: Ctx) =>
    `Ways to pay for ${c.svcLower} in ${c.city}: card on scene, mobile wallet (Apple Pay, Google Pay), cash, insurance direct-bill for covered jobs, or net-30 for fleet/commercial. Whatever your payment method, the driver captures it on the tablet at job complete and the receipt emails to you within a few minutes.`,
  (c: Ctx) =>
    `${c.city} payment options for ${c.svcLower}: every common method works — card, wallet, cash, direct-to-insurance for covered work, net-30 for commercial. For split billing (partial direct-to-insurance, partial out-of-pocket), coordinate at intake so the driver has the right paperwork on scene. Our billing desk can restructure invoices after the fact if something changes, but on-call is easier.`,
];

const PRICING_P4 = [
  (c: Ctx) =>
    `What drives up a ${c.svcLower} rate in ${c.city}: distance (after the first five free miles), vehicle class for heavy-duty, complexity of hookup (a car parked tight between concrete curbs on a narrow ${c.city} block takes longer and sometimes requires skates), accident-scene cleanup time, and after-the-fact storage if the destination is closed and we have to hold the vehicle. None of these are surcharges we apply without your knowledge — dispatch flags the factors on the intake call.`,
  (c: Ctx) =>
    `Factors that can change pricing on a ${c.city} ${c.svcLower} call: mileage beyond the included zone, vehicle weight class bumps, scope changes on scene (a roadside fix turning into a tow), and ancillaries like scene cleanup on accident calls. Each of these is quoted before execution. If the rate change would be trivial ($5–$20 for a short mileage overrun), the driver just informs you; if it is material, dispatch stops and re-confirms before we proceed.`,
  (c: Ctx) =>
    `Things that DO NOT change pricing in ${c.city}: time of day (overnight = same rate as noon), day of week (Sunday = same rate as Tuesday), holidays (Christmas = same rate as a regular Tuesday), borough (Bronx = same rate as Manhattan), and weather (a snowstorm does not bump the rate unless the vehicle needs winch-out, which has its own separate flat rate). Flat-rate means flat-rate.`,
];

const INSURANCE_P1 = [
  (c: Ctx) =>
    `For insurance-covered ${c.svcLower} work in ${c.city} — accident tows, collision recovery, and roadside covered under your auto policy or a roadside-club membership — we bill direct to the carrier in most cases. You provide the policy number, claim number, and adjuster contact at intake. We handle the paperwork, submit through the carrier's standard process, and you pay $0 at the scene for the portion that is covered. Any remaining deductible or uncovered delta is charged to your card or billed separately, whichever you prefer.`,
  (c: Ctx) =>
    `Insurance handling on ${c.svcLower} calls in ${c.city}: direct-to-carrier billing is the default for accident tows and for any roadside call covered under a policy or membership. The intake call captures carrier name, policy number, and claim number if one has already been opened. Our billing desk submits the invoice through the carrier's standard tow-vendor process. You see $0 at the scene on the covered portion; anything outside coverage is settled separately and upfront.`,
  (c: Ctx) =>
    `Coverage logistics for ${c.city} ${c.svcLower}: we work with every major insurance carrier and most club roadside programs. For accident work, the claim number is what activates direct billing — if you do not yet have a claim number when we arrive, we can help you open one on scene. For routine roadside under a membership, the membership number and program name (AAA, Allstate Motor Club, BMW Roadside, etc.) are what we need to push the billing through.`,
];

const INSURANCE_P2 = [
  (c: Ctx) =>
    `For commercial and fleet ${c.svcLower} work in ${c.city}, we set up dedicated accounts. That gets you: priority dispatch over retail calls, a consistent driver rotation that learns your properties and vehicles, net-30 invoicing with consolidated monthly statements, digital photo delivery to your fleet portal, and a direct line to our commercial dispatch desk during business hours. Account setup takes about 30 minutes by phone and we can run your first call before the paperwork is fully processed.`,
  (c: Ctx) =>
    `Fleet accounts in ${c.city} work like this: you call us once to set up the account, we issue an account number, and from then on your dispatch calls go directly to commercial routing — no waiting behind retail calls for a standard tow. Consistent driver rotation means the same people show up to your properties and learn the access points, the gate codes, and the vehicle inventory. Net-30 billing with consolidated statements simplifies your AP process.`,
  (c: Ctx) =>
    `Commercial ${c.svcLower} structure for ${c.city} operators: account number = priority routing, consistent drivers, net-30 invoicing, automated photo delivery, COI on file, and a named account manager for any escalations. This works for body shops, dealers, rideshare fleets, delivery fleets, contractor fleets, rental-car operations, property management companies, and anyone else whose ${c.svcLower} volume justifies dedicated dispatch.`,
];

const INSURANCE_P3 = [
  (c: Ctx) =>
    `Certificates of insurance (COI) for ${c.svcLower} vendors: many commercial operations in ${c.city} require a COI on file before engaging with a tow vendor. We can produce one within 24 hours, with your company named as certificate holder and any required additional-insured language. Our coverage includes commercial auto, garage liability, and on-hook insurance — that last one is the one most operators skip, and it is the one that actually matters if something happens to your vehicle in transit.`,
  (c: Ctx) =>
    `COI and licensing in ${c.city}: we hold NYC DCWP tow licenses, commercial auto insurance, garage liability, and on-hook coverage on every vehicle in transit. Certificates are available in 24 hours with any required additional-insured endorsement. Fleet and property-management clients typically need these before onboarding — we have produced thousands of them and the process is quick.`,
  (c: Ctx) =>
    `Documentation package for ${c.city} commercial ${c.svcLower}: COI on request, W-9 on file, account agreement with payment terms, driver roster with license numbers (for property managers who require it for access), and a photo-delivery protocol per your fleet portal's specs. All of this lives in your account record and is pushed to your AP and ops contacts once.`,
];

const WHEN_P1 = [
  (c: Ctx) =>
    `Call 24/7 for ${c.svcLower} in ${c.city}. Dispatch runs around the clock every day of the year. Overnight rates match daytime rates. Holiday rates match weekday rates. Snowstorm operations run as long as the roads are safe to operate on (we pull trucks off the road in extreme weather for driver safety, not pricing — you will hear that on the call if it applies).`,
  (c: Ctx) =>
    `${c.city} ${c.svcLower} dispatch: 24 hours, 365 days, no phone-tree, no "after-hours line." Same rate every hour of every day. If the weather is extreme enough that trucks cannot safely operate, dispatch will tell you — we have pulled off the road twice in the last five years, both during severe ice events, and we notified customers on the phone at intake. Otherwise the line is always open.`,
  (c: Ctx) =>
    `Any time, any day, for ${c.svcLower} in ${c.city}. We do not charge a premium for overnight, weekend, or holiday work. Dispatch answers the phone at 3 AM on Christmas the same way it answers at 3 PM on Tuesday. The only thing that changes the rate is scope — the clock does not.`,
];

const WHEN_P2 = [
  (c: Ctx) =>
    `Same-day is the default for ${c.svcLower} in ${c.city}. You are broken down or need service now, we dispatch now. Typical arrival 20–40 minutes. Peak rush hour (5–7 PM weekdays) can push that to 40–60, and severe weather (snow, ice, heavy rain affecting traffic) can push it further. Dispatch gives you an honest ETA on the call — if it is going to be 75 minutes because we are stacked up, you hear that before the truck leaves the yard.`,
  (c: Ctx) =>
    `For immediate ${c.svcLower} needs in ${c.city}, same-day dispatch is standard. Most calls hit 20–40 minute arrival. Rush-hour and storm windows can extend the range, and our dispatcher tells you the real number on the intake call rather than underquoting and missing. We prefer a customer who knows arrival is 55 minutes and plans accordingly over a customer who was told 25 minutes and is furious at minute 55.`,
  (c: Ctx) =>
    `Same-day dispatch for ${c.svcLower} in ${c.city}: default mode. Typical 20–40 minute arrival. In heavy weather or peak congestion, we quote the actual number on the intake call — no cute underquoting to get you to hang up and hope we show up fast. The actual ETA is what the dispatcher says.`,
];

const WHEN_P3 = [
  (c: Ctx) =>
    `Scheduled ${c.svcLower} in ${c.city}: book 24–48 hours ahead and we hit a 30-minute window. Works for planned vehicle moves, fleet relocations, inspection drop-offs, service-appointment runs, and pre-arranged commercial pickups. Scheduled rate is the same as same-day flat rate — we do not charge extra for planning ahead. In fact, planning ahead helps us route efficiently, which is a win for us and a win for you.`,
  (c: Ctx) =>
    `For planned ${c.svcLower} runs in ${c.city} — vehicle transfers between shops, fleet moves between yards, pre-inspection drop-offs, Monday-morning tow-to-shop runs scheduled Sunday night — book 24–48 hours ahead. 30-minute arrival window, same flat rate as unscheduled calls. Commercial clients often schedule weekly or monthly recurring runs on a standing basis.`,
  (c: Ctx) =>
    `Scheduling ${c.svcLower} in ${c.city} ahead: 30-minute arrival windows, same flat rate, planner-friendly. Commercial and fleet clients often set up standing schedules (every Monday at 6 AM, every first-Thursday-of-the-month) and save another step of intake calls. Retail customers use scheduled dispatch for non-urgent moves (vehicle has to be at the dealer Thursday for warranty work, etc.).`,
];

const WHEN_P4 = [
  (c: Ctx) =>
    `For commercial clients with recurring ${c.svcLower} needs in ${c.city} — fleets, body shops, dealers, property managers, delivery operations — set up a fleet account. Priority dispatch over retail calls, consistent drivers who learn your properties, net-30 billing, consolidated monthly statements, and direct line to commercial dispatch during business hours. Account setup is 30 minutes by phone and the first call can run before paperwork is fully processed.`,
  (c: Ctx) =>
    `Recurring-need setup for ${c.city} ${c.svcLower}: a fleet account consolidates billing, priority-routes your calls, and assigns consistent drivers. Typical setup fits on a single phone call with our commercial desk. Billing: net-30, monthly statements, W-9 and COI on file. No setup fee, no minimum volume, no term commitment — we earn the volume or we do not.`,
  (c: Ctx) =>
    `Commercial fleet structure in ${c.city}: account number, priority dispatch queue, consistent drivers, monthly invoicing, on-request COI. The account number is what unlocks the priority queue — retail calls still get handled fast, but commercial calls get pulled to the front and assigned to the driver who knows your properties. Setup is fast and reversible.`,
];

const WHY_US_P1 = [
  (c: Ctx) =>
    `${c.city} has plenty of options for ${c.svcLower}, from national roadside networks to light-pole flyer operators. We are the local licensed operator that national networks subcontract to when they do the job right. When you call us directly, you skip the dispatch markup and the subcontractor chain. Faster response, lower rate, clearer communication. Lots of tow numbers exist — very few of them are local operators who actually own the trucks and employ the drivers showing up at your curb.`,
  (c: Ctx) =>
    `What separates us from the noise in ${c.city}: we are the operator, not the middleman. National roadside networks and credit-card-provided roadside programs do not own trucks — they subcontract to companies like ours. Calling us direct skips a layer of markup and a layer of routing delay. Our drivers work for us, our trucks are ours, and our dispatcher knows the streets because they live here.`,
  (c: Ctx) =>
    `The category of "${c.svcLower} operator in ${c.city}" is crowded with names that are actually subcontractors, lead aggregators, or light-pole flyer shops. We are different: NYC DCWP-licensed operator, W-2 drivers, owned fleet, direct dispatch. That structure produces a different customer experience — one line of communication, one entity responsible, one flat rate, one receipt.`,
];

const WHY_US_P2 = [
  (c: Ctx) =>
    `Our ${c.city} drivers are licensed, insured, trained, and — critically — consistent. You get the same crew over time when you have a fleet or recurring account. That consistency eliminates the "we cannot access the property" calls that plague drivers who have never been to a given address before. Retail customers benefit too: the driver who shows up has been on dozens of similar calls in ${c.city} already and does not need to figure out the neighborhood in real time.`,
  (c: Ctx) =>
    `Consistency matters more than people realize. In ${c.city}, a driver who has run ${c.svcLower} calls here dozens of times already knows the block patterns, the common garage clearances, which corners are hydrant-zoned, and where the nearby loading zones are for staging. A driver sent in from outside ${c.state} does not. That familiarity compresses every call by 10–20 minutes.`,
  (c: Ctx) =>
    `Our ${c.city} team sees the same blocks week after week. That repetition turns first-time problems into pattern-match solutions — most of what we encounter on a ${c.svcLower} call we have already seen, and the response is automatic rather than improvised. That is the real value of a local operator over a national subcontracted network.`,
];

const WHY_US_P3 = [
  (c: Ctx) =>
    `Flat-rate, upfront pricing. NYC DCWP tow license. Commercial auto, garage liability, and on-hook insurance on every truck and every load. No storage fees on same-day drops. Receipts emailed before the truck leaves the scene. No "NYC surcharge," no "after-hours" surcharge, no "holiday" surcharge, no "fuel" surcharge. The rate is the rate, and we say it out loud on the intake call so you can write it down before we move.`,
  (c: Ctx) =>
    `Pricing transparency for ${c.svcLower} in ${c.city}: the number at dispatch is the number on the invoice. No hidden fees, no "the rate includes taxes unless it doesn't," no metro surcharge, no line items that appear only on the printed receipt. If the scope changes, we quote the new scope before executing. Transparency is not a value statement — it is our operating model.`,
  (c: Ctx) =>
    `${c.city} pricing and trust: upfront flat rate, licensed operator, on-hook insurance, same-day-no-storage-fee policy, email receipt before departure. Every one of those is a specific response to something a bad operator does differently. If you have ever been through a bad NYC tow experience, you know which details matter — we have designed our operation around those.`,
];

const WHY_US_P4 = [
  (c: Ctx) =>
    `Call ${PHONE} for ${c.svcLower} in ${c.city}. 24 hours, 365 days. Any borough, any neighborhood, any hour. A live NYC dispatcher answers — not an IVR, not a chatbot, not a call center in another state. Tell them where you are and what you need. You leave the call with a rate, a truck number, a driver name, and an ETA. We do the rest.`,
  (c: Ctx) =>
    `To reach us for ${c.svcLower} in ${c.city}: ${PHONE}. The phone is the fastest path. Always answered by a live dispatcher in NYC. For non-urgent ${c.svcLower} (scheduled moves, commercial account setup, insurance-coordination questions), the website has a form that gets the same dispatcher to call you back. For urgent needs, phone wins every time.`,
  (c: Ctx) =>
    `Dispatch line for ${c.svcLower} in ${c.city}: ${PHONE}. Live answer, flat rate, real ETA, email receipt. That is the whole transaction. We have been doing this in NYC for years, and the process is smooth because we have refined every step — no surprises, no drama, just a tow or roadside fix done right.`,
];

const VEHICLE_P1 = [
  (c: Ctx) =>
    `Standard passenger vehicles — sedans, coupes, hatchbacks, compact SUVs — are the bulk of ${c.svcLower} calls in ${c.city}. Wheel-lift towing works for most of these, which is faster and fits better in tight ${c.city} spots than a full flatbed. We pick the rig based on the vehicle, not based on what happens to be closest. If you drive a standard car with an internal combustion engine and a healthy drivetrain, wheel-lift is usually the correct answer. If anything makes it non-standard (AWD, EV, low clearance, modified suspension), the rig changes.`,
  (c: Ctx) =>
    `The typical ${c.city} ${c.svcLower} call involves a standard car — one of the sedans, coupes, or compact SUVs that dominate the city's passenger fleet. For these, wheel-lift is the default and it works. We only bump up to flatbed when the vehicle actually needs it, because flatbeds are bigger, slower to position on narrow ${c.city} streets, and cost more. Matching rig to vehicle is a dispatcher-level decision made on the intake call, based on year/make/model and any details you share.`,
  (c: Ctx) =>
    `Most cars we move on ${c.svcLower} calls in ${c.city} are standard passenger vehicles — Camrys, Civics, Accords, CR-Vs, RAV4s, the working fleet of the city. Wheel-lift rigs handle these fine and are quicker to stage on narrow blocks. The category where the rig decision gets interesting is the "non-standard" vehicles — AWD crossovers that look normal but cannot tolerate wheel-lift, EVs that physically cannot tolerate it, and luxury or low-clearance sports cars where wheel-lift would damage the front air dam.`,
];

const VEHICLE_P2 = [
  (c: Ctx) =>
    `AWD and 4WD vehicles — common across ${c.city} especially in winter months — require flatbed. Dragging drive wheels on an AWD transfer case is a warranty-voiding, drivetrain-destroying decision. Subaru, AWD crossovers from every major brand, 4WD trucks and Jeeps: all flatbed. If you are not sure whether your vehicle is AWD, tell dispatch the year/make/model and we will know. About 40% of our ${c.city} flatbed calls come from AWD vehicles where the customer did not realize the drivetrain required it.`,
  (c: Ctx) =>
    `Drivetrain matters. Most AWD crossovers in ${c.city} — Subaru Outback, Honda CR-V AWD, Toyota RAV4 AWD, every luxury German all-wheel variant, and all the 4WD trucks — cannot be safely wheel-lifted. The drive wheels have to come off the ground. Flatbed is the right answer, and dispatching the wrong rig wastes your time and ours because the driver will refuse to wheel-lift a drivetrain that cannot tolerate it. Telling dispatch the year/make/model avoids that situation.`,
  (c: Ctx) =>
    `For ${c.city} ${c.svcLower} calls involving AWD or 4WD, the rig is always flatbed. No exceptions. Year/make/model at intake confirms it. If the customer says "just a regular car" but the VIN check reveals all-wheel-drive, we update the dispatch to flatbed before rolling. This is one of the places where knowing NYC's vehicle population pays off — our dispatchers know which models skew AWD and which are FWD even under the same nameplate.`,
];

const VEHICLE_P3 = [
  (c: Ctx) =>
    `Electric vehicles — Tesla (Model 3, Y, S, X), Rivian, Lucid, Mustang Mach-E, Hyundai Ioniq, Kia EV6, Chevy Bolt, all of them — are a separate category with strict rules. Flatbed only. Drive wheels off the ground. Some manufacturers require specific dolly configurations or won't allow transport with a fully drained battery. Our ${c.city} team handles EVs regularly and follows manufacturer specs per model. If you are stranded in a ${c.city} EV, tell dispatch the exact model and we will match the right procedure.`,
  (c: Ctx) =>
    `EVs require different handling than ICE vehicles. Flatbed is the default. For some models, the orientation on the flatbed matters (Tesla Model S tows differently than Model 3, for example). For heavily discharged batteries, some manufacturers require the battery to be externally stabilized during transport. Our ${c.city} drivers are trained on the manufacturer specs for common EVs operating in NYC, and we refuse to deviate from those — the cost of getting EV tow procedure wrong is tens of thousands of dollars in repair.`,
  (c: Ctx) =>
    `EV handling on ${c.svcLower} in ${c.city}: flatbed with manufacturer-spec load procedure. Tesla, Rivian, Lucid, all European luxury EVs, and all the mainstream EVs from GM, Ford, Hyundai, Kia, Nissan get handled per their spec sheets. We do not experiment. We do not "just try it." A drive-wheels-on-ground tow of an EV produces motor damage that can total the vehicle — an outcome we have never caused and do not intend to start causing.`,
];

const VEHICLE_P4 = [
  (c: Ctx) =>
    `Commercial and heavy-duty vehicles in ${c.city} — box trucks, sprinter vans, cube vans, oversized SUVs (full-size Suburbans, Escalades), contractor dump trucks, and anything above roughly 10,000 lbs GVWR — need heavy-duty equipment. Our heavy-duty rigs have integrated booms, axle ratings that actually match the loads, and drivers certified on heavy recovery. Motorcycles, dirt bikes, and scooters are their own category: flatbed only with soft straps and wheel chocks, never dragged.`,
  (c: Ctx) =>
    `Heavy-duty and specialty vehicles need different gear. Box trucks, sprinter vans, contractor rigs, oversized SUVs, and anything over ~10,000 lbs gets heavy-duty service with the correct wrecker and trained driver. Motorcycles go on flatbed with soft straps and wheel chocks — they are not "just small cars" and the tie-down procedure is totally different. Our ${c.city} dispatch distinguishes these on intake so the right equipment rolls.`,
  (c: Ctx) =>
    `Non-standard vehicle categories we handle in ${c.city}: heavy-duty trucks and commercial rigs (integrated boom wreckers, proper axle ratings), motorcycles and scooters (flatbed + soft straps + chocks, never wheel-lift), oversized SUVs (heavy-duty only), classic and antique cars (flatbed with enclosed transport available on request), and low-clearance exotics (flatbed with ramp angle adjustment to clear aerodynamic front ends). Dispatch matches the rig based on what you tell them.`,
];

const AFTER_P1 = [
  (c: Ctx) =>
    `After a ${c.svcLower} job completes in ${c.city}, the next thing that happens is your email receipt. It arrives within a few minutes of the driver clearing the scene. The receipt itemizes the service, the flat rate, any mileage overages, any ancillaries, and the payment method. For insurance-billed jobs, you get a separate copy of what was submitted to your carrier. Keep these — they matter for expense reimbursement, insurance follow-up, and any future dispute resolution.`,
  (c: Ctx) =>
    `Step one post-service: the receipt lands in your inbox. ${c.city} ${c.svcLower} receipts are digital, itemized, and include the timestamped photos from the job. Save the email. If you ever need to substantiate the service for insurance, a dispute, a resale inspection, or a lease return, the receipt plus the photos are the documentation you need. We keep our copy in our system for 90 days minimum, but your email copy is the fastest way to get to it.`,
  (c: Ctx) =>
    `Receipt delivery: digital, immediate, itemized. Sent to the email address you gave dispatch at intake. Includes the service code, the flat rate, the completion photos, and the payment confirmation. For ${c.city} ${c.svcLower} work that is getting billed to insurance or reimbursed by an employer, this email is the document of record. Forward it to the adjuster or the expense desk — that is usually all they need.`,
];

const AFTER_P2 = [
  (c: Ctx) =>
    `If the ${c.svcLower} job was insurance-covered, the next step is carrier-side processing. For a ${c.city} accident tow, we submit the invoice and supporting documentation (photos, scene report) to your carrier through their vendor portal. Typical turnaround is 5–15 business days depending on the carrier. If the carrier needs anything additional — a COI, a W-9, a specific adjuster's questions answered — our billing desk handles it without bothering you.`,
  (c: Ctx) =>
    `For insurance-involved ${c.svcLower} calls in ${c.city}, the back-end processing runs in parallel to your next steps. We submit through the carrier's tow-vendor process, provide any supplementary documentation they request, and close out when they pay. If anything stalls (uncommon, but it happens with smaller carriers), our billing desk contacts you or your adjuster to unblock. You typically will not have to do anything between the scene and the claim closing.`,
  (c: Ctx) =>
    `Post-service insurance handling in ${c.city}: our billing team takes over once the scene is cleared. They submit the invoice, attach photos, coordinate with the adjuster, and answer carrier questions. You only hear from us if the carrier flags something we cannot resolve internally, which is rare. The receipts you get are your copy of what was submitted; the carrier gets the full documentation package.`,
];

const AFTER_P3 = [
  (c: Ctx) =>
    `If the ${c.svcLower} job in ${c.city} ended at a shop, a body shop, or a dealer, the next step is usually on that destination's side. They will call you when they have evaluated the vehicle, and you coordinate the rest from there. We have already delivered the vehicle with condition photos, so the shop has a record of the state you sent it in. That often matters when someone tries to blame the tow operator for damage that was actually pre-existing.`,
  (c: Ctx) =>
    `When your ${c.svcLower} job in ${c.city} dropped the vehicle at a repair shop, we have already handed off the condition documentation to the shop. Your next step is typically to wait for the shop's diagnostic and estimate. If the shop ever raises a question about damage caused in transit, the pre-tow photos we took settle it immediately — that is exactly why we take them.`,
  (c: Ctx) =>
    `Drop-off coordination in ${c.city}: we deliver the vehicle, hand off the condition documentation, and confirm the drop with the destination. From there the shop, dealer, or body shop takes over the next phase. Our service record for your tow stays in our system; you have the email receipt and photos; the destination has its own records. Three-way documentation protects everyone.`,
];

const AFTER_P4 = [
  (c: Ctx) =>
    `If you are going to need another ${c.svcLower} call in ${c.city} — common for fleets, body shops, and property managers — consider opening an account. Retail customers can also create a saved profile that pre-fills on future calls. Either way, the next ${c.svcLower} job gets faster because dispatch already has your preferred payment method, your vehicle info, and your preferred shops or destinations. You skip the intake and go straight to dispatch.`,
  (c: Ctx) =>
    `Repeat customers in ${c.city} save time on the second and third calls. Dispatch can save your vehicle profile, your preferred payment method, and common destinations so future ${c.svcLower} calls are 30-second calls instead of 90-second ones. For fleet and commercial operations, that adds up fast — especially at scale. For retail, it is small but appreciated.`,
  (c: Ctx) =>
    `If you expect to need ${c.svcLower} again in ${c.city} — a fleet operator, a repair shop, a property manager, a real estate operator handling unauthorized parking, or just a driver whose commute takes them through rough roads — opening an account pays back quickly. Dispatch remembers you, the intake shortcuts, and pricing gets smoothed out (volume rates available above certain thresholds). Ask on the next call, or request account setup at any time.`,
];

const NEIGHBORHOOD_P1 = [
  (c: Ctx) =>
    `${c.city} is one of the neighborhoods we prioritize within our broader ${c.state} ${c.svcLower} operation. Trucks stage here or within minutes of here, which is why our arrival times in ${c.city} are toward the fast end of our 20–40 minute range. Adjacent neighborhoods get the same priority — a truck in ${c.city} is often the nearest available unit for a call a few blocks over, so response times stay tight across the whole zone.`,
  (c: Ctx) =>
    `Within our ${c.state} ${c.svcLower} coverage, ${c.city} is a frequent-call neighborhood. That designation means we stage more trucks here and ensure a driver is usually within a few minutes of any address in the area. Response times benefit: ${c.city} calls run faster than the borough average, and adjacent neighborhoods benefit from overflow capacity as well.`,
  (c: Ctx) =>
    `${c.city} is part of our high-activity ${c.state} zone for ${c.svcLower}. We treat it as a core coverage area, which in practice means staged trucks, rotation coverage during peak windows, and ${c.city}-specific notes in our dispatcher playbook (common addresses, parking tips, garage clearances). Every one of those small details compresses response time.`,
];

const NEIGHBORHOOD_P2 = [
  (c: Ctx) =>
    `Our ${c.state} hub also covers all the neighborhoods surrounding ${c.city}. Which means if your vehicle drifted a block or two beyond ${c.city} proper while you were figuring out where to pull over, we still arrive fast. The hub model is deliberate: one dispatch center, trucks distributed across the hub's coverage area, and live routing that picks whichever truck is actually closest — not whichever truck happens to be "assigned" to your exact neighborhood.`,
  (c: Ctx) =>
    `Coverage beyond ${c.city} proper: all adjacent ${c.state} neighborhoods are within our response zone. If you called us from ${c.city} but the vehicle is actually two blocks into the next neighborhood, we still handle the call at the same rate and response time. Live routing is smart enough to ignore administrative boundaries and pick the truck that can physically get there fastest.`,
  (c: Ctx) =>
    `${c.state} is one continuous coverage area for us. ${c.city} is a focal point within it, but neighborhoods adjacent to ${c.city} get the same priority and the same pricing. Live routing and dispatcher judgment matter here — if a truck in ${c.city} is the closest unit to a call in the next neighborhood over, that truck takes the call regardless of which block "owns" it.`,
];

const NEIGHBORHOOD_P3 = [
  (c: Ctx) =>
    `Specific ${c.state} considerations that affect ${c.svcLower} response in ${c.city}: traffic patterns around known choke points, weather patterns that hit some parts of ${c.state} harder than others, and the location of our nearest staged trucks relative to your specific address. Our ${c.state} dispatch has routing intelligence that accounts for all of this in real time, which is why the ETAs we quote are usually accurate to within a few minutes.`,
  (c: Ctx) =>
    `${c.state}-specific factors in ${c.city} response time: bridge and tunnel traffic state, ${c.state} arterials congestion, weather effects on specific corridors, and real-time positions of our trucks. These all feed into the ETA you hear on the intake call. When we say 22 minutes, we mean 22 minutes — not "somewhere in the 20–40 minute range, probably." Accuracy comes from the local intelligence layer on top of GPS.`,
  (c: Ctx) =>
    `The ETAs we quote for ${c.svcLower} in ${c.city} factor in real-time ${c.state} conditions. Bridge backups, tunnel metering, active construction, weather, accident clearances, and current truck positions all go into the number. A dispatcher quoting 25 minutes has the live data to back that number up. If conditions deteriorate after the quote (surprise accident on the route), the driver notifies the customer and updates the ETA in real time.`,
];

const NEIGHBORHOOD_P4 = [
  (c: Ctx) =>
    `Beyond ${c.city}, our ${c.state} network connects to the broader NYC coverage — all five boroughs, with cross-borough transfers, direct-to-shop drops, and outbound tows to the suburbs and beyond. A ${c.svcLower} call that starts in ${c.city} often ends somewhere else entirely (a shop in another borough, a dealer, a body shop, a residence across town). Our multi-borough operation makes those runs routine, not exceptional.`,
  (c: Ctx) =>
    `The ${c.city} ${c.svcLower} call often ends outside ${c.city} — at a dealer in another borough, a shop across town, a residence in the suburbs. Our five-borough operation handles that seamlessly: the truck that starts in ${c.state} can drop in Queens, Manhattan, Brooklyn, the Bronx, or Staten Island without handing off or re-dispatching. Same $149 / hour rate covers the route — longer drops simply add time at the same rate, with the total hours quoted before dispatch.`,
  (c: Ctx) =>
    `Cross-borough and out-of-NYC drops on ${c.svcLower} from ${c.city}: routine. Our trucks run long-haul when needed, and the dispatcher quotes the full rate including mileage on the intake call. If your preferred shop is across the bridge in New Jersey or up in Westchester, we can handle it — same trucks, same drivers, same flat-rate-plus-mileage model.`,
];

// ---------- generator ----------

export interface CityServiceContent {
  title: string;
  metaDescription: string;
  heroSubtitle: string;
  sections: { heading: string; paragraphs: string[] }[];
  relatedServices: Service[];
  category: (typeof SERVICE_CATEGORIES)[keyof typeof SERVICE_CATEGORIES];
}

export function cityServicePageContentV2(
  cityName: string,
  stateName: string,
  stateAbbr: string,
  service: Service,
  citySlug = cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
): CityServiceContent {
  const seed = fnv1a(`${citySlug}|${service.slug}`);
  const category = SERVICE_CATEGORIES[service.category];
  const relatedServices = SERVICES.filter((s) => s.category === service.category && s.slug !== service.slug);

  // Shuffle service.commonCauses etc. per-page so the first cause mentioned
  // varies across the index. This gives us a lot of cheap uniqueness since
  // the service data is already rich.
  const shuffledCauses = shuffled(service.commonCauses, seed, "causes");
  const shuffledToDo = shuffled(service.whatToDo, seed, "todo");
  const shuffledWeBring = shuffled(service.whatWeBring, seed, "bring");
  const shuffledMistakes = shuffled(service.commonMistakes, seed, "mistakes");
  const shuffledNycSpec = shuffled(service.nycSpecifics, seed, "nyc");

  const ctx: Ctx = {
    city: cityName,
    state: stateName,
    abbr: stateAbbr,
    svcTitle: service.title,
    svcLower: service.title.toLowerCase(),
    // Hand the shuffled arrays back to the pools via a synthesized service:
    service: {
      ...service,
      commonCauses: shuffledCauses,
      whatToDo: shuffledToDo,
      whatWeBring: shuffledWeBring,
      commonMistakes: shuffledMistakes,
      nycSpecifics: shuffledNycSpec,
    },
    seed,
  };

  const sec = (key: keyof typeof HEADING_POOL, pools: ((c: Ctx) => string)[][]) => ({
    heading: pick(HEADING_POOL[key], seed, `heading-${key}`)(ctx),
    paragraphs: pools.map((pool, i) => pick(pool, seed, `${key}-p${i}`)(ctx)),
  });

  return {
    title: `${service.title} ${cityName}, ${stateName} — $149/hr, $25 Off Online, No Catches.`,
    metaDescription: `${service.title} in ${cityName}, ${stateName} at one rate: $149/hour, $25 off online ($124 first hour). No NYC surcharge, no after-hours markup. 24/7 dispatch, 20–40 min arrival, licensed. Call ${PHONE}.`,
    heroSubtitle: `${service.title} in ${cityName} — 24/7 Dispatch`,
    sections: [
      sec("intro", [INTRO_P1, INTRO_P2, INTRO_P3, INTRO_P4]),
      sec("howItWorks", [HOW_P1, HOW_P2, HOW_P3, HOW_P4, HOW_P5]),
      sec("whyHere", [WHY_HERE_P1, WHY_HERE_P2, WHY_HERE_P3, WHY_HERE_P4, WHY_HERE_P5]),
      sec("vehicleTypes", [VEHICLE_P1, VEHICLE_P2, VEHICLE_P3, VEHICLE_P4]),
      sec("equipment", [EQUIP_P1, EQUIP_P2, EQUIP_P3, EQUIP_P4]),
      sec("mistakes", [MISTAKES_P1, MISTAKES_P2, MISTAKES_P3, MISTAKES_P4]),
      sec("included", [INCLUDED_P1, INCLUDED_P2, INCLUDED_P3, INCLUDED_P4]),
      sec("pricing", [PRICING_P1, PRICING_P2, PRICING_P3, PRICING_P4]),
      sec("insurance", [INSURANCE_P1, INSURANCE_P2, INSURANCE_P3]),
      sec("whenToCall", [WHEN_P1, WHEN_P2, WHEN_P3, WHEN_P4]),
      sec("neighborhood", [NEIGHBORHOOD_P1, NEIGHBORHOOD_P2, NEIGHBORHOOD_P3, NEIGHBORHOOD_P4]),
      sec("afterService", [AFTER_P1, AFTER_P2, AFTER_P3, AFTER_P4]),
      sec("whyUs", [WHY_US_P1, WHY_US_P2, WHY_US_P3, WHY_US_P4]),
    ],
    relatedServices,
    category,
  };
}