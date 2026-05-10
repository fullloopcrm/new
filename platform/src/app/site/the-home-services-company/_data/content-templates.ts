// @ts-nocheck
import { PHONE } from "./content";
import { Service, SERVICES, SERVICE_CATEGORIES } from "./services";

// ============================================================
// STATE PAGE CONTENT
// ============================================================
export function statePageContent(stateName: string, stateAbbr: string, cities: { name: string; slug: string }[]) {
  const topCities = cities.slice(0, 10);
  const sc = SERVICES.length;

  return {
    title: `Home Services in ${stateName} — Home Services Co`,
    metaDescription: `Professional home services across ${cities.length}+ cities in ${stateName}. ${sc} services starting at $99/hour — licensed, insured, same-day availability. Call ${PHONE}.`,
    heroSubtitle: `${cities.length} Cities Served in ${stateAbbr}`,
    sections: [
      {
        heading: `Home Services in ${stateName} — One Company, 40 Trades`,
        paragraphs: [
          `Home Services Co serves ${cities.length} cities across ${stateName} with ${sc} home services under one roof — from HVAC and plumbing to painting, flooring, landscaping, cleaning, and handyman work. Every service starts at $99/hour, every technician is licensed and insured, and every job comes with upfront pricing so you know exactly what you're paying before any work begins.`,
          `We built this company to solve a real problem: finding trustworthy tradespeople for ordinary home jobs in ${stateName} is harder than it should be. You spend hours calling three different HVAC guys, two painters, and a handyman who ghosts you. We consolidated all of it. One phone number, one company, one standard — starting at $99/hour across ${sc} services.`,
          `Whether you're in ${topCities[0]?.name || "the capital"}, ${topCities[1]?.name || "a suburb"}, ${topCities[2]?.name || "a growing city"}, or anywhere else in ${stateAbbr} — our local teams are licensed, insured, and ready to work. Same-day availability is real. Weekends and holidays are the same rate. And upfront pricing means the invoice matches the estimate.`,
          `This page covers everything ${stateName} residents need to know about our ${sc} home services — what we do, how we price, when we're available, and why consolidating your home service vendors to one reliable company saves time, money, and headaches. For a specific service, use our services page or call ${PHONE} to speak with a scheduler.`,
        ],
      },
      {
        heading: `How Booking Works in ${stateName}`,
        paragraphs: [
          `The process is simple no matter where you are in ${stateName}. Call us at ${PHONE}, text the same number, or book online. Describe the issue or the service you need. Our scheduler will confirm pricing, ask a few clarifying questions, and book a technician — same-day when possible, or a scheduled appointment with a real 2-hour arrival window.`,
          `On arrival, your ${stateName} technician walks through the job with you, confirms the scope, and gives you the final price before any work begins. Starting at $99/hour with upfront pricing on parts and materials when those are involved. There are no surprise shop fees, no mystery disposal charges, no "while we were here" add-ons after the fact.`,
          `When the work is done, you get a clean workspace, a clear explanation of what was completed, and an invoice that matches the estimate. Payment on completion — credit card, debit, check, or digital transfer. We email you a copy of the invoice for your records. Property managers and commercial accounts get consolidated monthly invoicing.`,
          `Same-day service in ${stateName} is available for calls placed before noon in most markets. For emergencies — active leaks, no heat, no AC, lockouts — we dispatch priority. Evenings, weekends, and holidays are all available at the same starting rate of $99/hour.`,
        ],
      },
      {
        heading: `${sc} Home Services Available in ${stateName}`,
        paragraphs: [
          `We offer ${sc} home services across ${stateName}. Every service is available in all ${cities.length} cities we serve, and every service is priced the same way: starting at $99/hour with upfront pricing. Licensed, insured, and consistent from ${topCities[0]?.name || "the largest metro"} to the smallest town we cover.`,
          `Our core home services include HVAC (heating, cooling, ductwork), plumbing (leaks, drains, water heaters, fixtures), electrical (outlets, panels, wiring, fixtures), roofing, painting (interior and exterior), flooring installation, and drywall repair. These are the trades most ${stateName} homeowners need at some point, and consolidating them under one reliable company is the entire point of Home Services Co.`,
          `For outdoor work in ${stateName}, we offer landscaping, lawn care, tree services, pressure washing, gutter cleaning, fence installation, deck building, concrete services, and masonry. Seasonal work like snow removal, holiday light installation, and pool services is available in applicable markets.`,
          `For indoor cleaning and air quality, we provide house cleaning, carpet cleaning, window cleaning, and air duct cleaning. For installs and small projects, we handle furniture assembly, appliance repair, home security installation, and general handyman work. And for larger projects, we take on kitchen and bathroom remodeling, siding installation, solar installation, insulation, and full carpentry work.`,
          `Specialty services include garage door repair, locksmith services, chimney sweep, water damage restoration, moving services, junk removal, and pest control. Every one of these ${sc} services is staffed by licensed and insured technicians who specialize in that trade — not a generalist handyman pretending to know everything.`,
        ],
      },
      {
        heading: `Why ${stateName} Residents Choose Home Services Co`,
        paragraphs: [
          `${stateName} residents are tired of vendor juggling. You shouldn't need a different company for HVAC, plumbing, painting, and cleaning — and then hope all four show up on time, charge fairly, and do the work properly. One company, one standard, 40 services. That's the pitch, and it's the operating model.`,
          `Our transparent hourly pricing starts at $99/hour. Before any work begins, you get a clear written estimate. For jobs involving parts, fixtures, or materials, those costs are itemized up front. The invoice at the end matches the estimate at the start. No mystery fees, no "while we were here" additions, no surprise disposal charges.`,
          `We're fully licensed, bonded, and insured to operate in ${stateName}. Our technicians are background-checked, trained in their specific trades, and experienced. We carry general liability, commercial auto, and workers' compensation in every state — the kind of coverage that actually matters if something goes wrong.`,
          `Same-day service is available in most ${stateAbbr} cities for calls placed before noon. We operate 7AM-8PM daily, 7 days a week, including weekends and holidays. No contracts, no minimums, no recurring charges unless you want them. Book when you need us, pay for the work, and move on with your day.`,
          `Licensed and insured is our baseline. Upfront pricing is standard. Same-day availability is real. Across ${cities.length} cities in ${stateName}, the combination is rare enough that once customers use us, they tend to call back for the next ${sc - 1} services they need.`,
        ],
      },
      {
        heading: `Home Services Pricing in ${stateName}`,
        paragraphs: [
          `Pricing is the same across all ${cities.length} cities in ${stateName}: starting at $99/hour for standard home services. Recurring accounts, priority scheduling, and emergency same-day are all available at the same starting rate — no premium for weekends, holidays, or after-hours.`,
          `For jobs requiring parts, fixtures, or materials — a new water heater, a replacement appliance, paint and supplies for a repaint — those costs are itemized up front. You approve the final number before any work begins. This is the part that matters: the invoice at the end matches what you approved at the start. Scope changes only happen with your explicit approval.`,
          `Most small jobs in ${stateName} — a plumbing repair, a ceiling fan install, a drywall patch, a garage door fix — run 1-2 hours at $99/hour plus any required parts. Medium jobs (painting a few rooms, installing flooring in a single space, deep cleaning a larger home) typically run half a day to a full day. Large projects (kitchen remodels, roof replacements, full paint jobs) are quoted as written project scopes.`,
          `The $99/hour starting rate is not a teaser. It's the honest hourly rate for most of our ${sc} services, and you'll see it on the estimate before any technician lifts a tool. If a specific job requires a specialized rate because of the trade involved, we tell you that up front — not after the work is done.`,
        ],
      },
      {
        heading: `${stateName} Home Maintenance Through the Seasons`,
        paragraphs: [
          `${stateName} home service demand follows a predictable seasonal calendar, and scheduling appointments around that calendar saves both money and frustration. The first genuinely hot week of summer triggers a surge in AC service calls across ${stateName} — every HVAC company in the state gets booked at once, waits stretch to a week or longer, and emergency premiums show up at companies that use them. Our pricing never adds an emergency premium, but scheduling still tightens during peaks, which is why we recommend booking spring HVAC tune-ups for ${stateName} homes in March or April rather than waiting until July.`,
          `Winter heating work is the mirror of summer cooling in ${stateName}. The first cold week of the season produces a wave of furnace and heating system calls. Systems that have been idle all summer wake up and reveal problems that would have been caught by a fall tune-up. Pipes freeze in unheated spaces. Chimney inspections become urgent. Scheduling heating work for ${stateName} homes in October or November, before temperatures fall, catches problems before they become emergencies and skips the December scheduling queue.`,
          `Spring is the peak season in ${stateName} for exterior trades. Roofing inspections and repairs after winter damage, gutter cleaning before the spring rains, siding repairs, pressure washing, deck repair, fence installation, landscaping installs, and the start of lawn care cycles all compete for crew capacity from March through early summer. ${stateName} homeowners who book exterior work in February or very early March for an April or May appointment consistently get better scheduling than those who wait.`,
          `Fall across ${stateName} is preventive maintenance season. Gutter cleaning to clear leaves before winter, chimney sweeps before fireplace use, tree services to handle storm-damage risk, pre-holiday interior services like deep cleaning and painting. This is the season when recurring maintenance accounts pay the most obvious dividends — our existing account customers get priority scheduling during these peak windows because the recurring relationship earns that priority. For new customers, call ${PHONE} in August or September to book fall work before the rush.`,
        ],
      },
      {
        heading: `Licensed and Insured in ${stateName}`,
        paragraphs: [
          `"Licensed and insured" is a phrase that appears on nearly every home services website. At Home Services Co in ${stateName}, we treat it as a specific, verifiable standard rather than a marketing line. For each trade we operate in ${stateName}, we verify that our technicians hold the licenses the state requires for that work — state HVAC licenses with EPA 608 refrigerant certification, state plumbing licenses in jurisdictions that require them, state electrical licenses at journeyman or master level, roofing licenses where ${stateName} requires them, and appropriate certifications for specialty work. Verification happens directly with the issuing authority, not by trusting paperwork a candidate brings in.`,
          `Insurance coverage in ${stateName} includes general liability, workers' compensation, and commercial auto on every technician and vehicle we dispatch. Coverage levels meet or exceed what ${stateName} property managers, homeowner associations, and commercial clients require in vendor agreements. Certificates of insurance with specific properties or clients listed as additional insured are available within 24 hours of request, renewed automatically before expiration, and issued in the format ${stateName} compliance teams actually want.`,
          `Workers' compensation is the element most small contractors skip, and it matters for a specific reason: if a technician is injured on a ${stateName} property, workers' comp covers the medical costs and lost wages. Without it, an injured worker can sue the property owner directly in some jurisdictions. Our workers' comp coverage is maintained in every ${stateName} county we serve, and is documented in our COI package for property managers who need to confirm it.`,
          `For ${stateName} property managers managing multi-state portfolios, the same licensing and insurance standards apply in every state we operate in — 50 states with consistent coverage. Documentation requests for compliance files are handled centrally so the response time is the same whether the inquiry comes from ${stateName} or any other state in the portfolio. The consolidation benefits that apply to the service itself apply equally to the compliance paperwork behind it.`,
        ],
      },
      {
        heading: `How ${stateName} Property Managers and Businesses Use Us`,
        paragraphs: [
          `${stateName} property managers, real estate operators, and small businesses make up a meaningful share of our ${stateName} work, and the account structure we offer them differs in useful ways from single-appointment residential service. Commercial and multi-property accounts get a dedicated account coordinator as the single point of contact for scheduling, escalations, and invoice questions. The coordinator is not a salesperson with a quota — they are an operational partner whose job is to make the vendor relationship run smoothly across many properties and many appointments.`,
          `Recurring maintenance programs are common for ${stateName} property managers. Scheduled HVAC preventive maintenance across a portfolio, quarterly plumbing inspections on shared systems, ongoing janitorial programs, seasonal landscaping and snow removal, pest control on recurring cycles. The benefit of recurring accounts is consistent technician assignments — the same team learns the ${stateName} buildings, the access protocols, and the quirks of the equipment, which compounds into faster, better service over time.`,
          `Emergency response for ${stateName} property managers is integrated into the main dispatch channel. Tenant-reported issues flow through to the property manager's account with full work-order documentation, photo records, and invoices that match the estimates. Lockouts, leaks, heating failures, electrical issues, and other urgent situations get priority dispatch just like residential emergencies — with the tenant or property manager coordinating access as your protocol requires.`,
          `Billing formats in ${stateName} support per-property invoicing, consolidated portfolio invoicing, and custom splits that match your accounting structure. Payment terms for approved accounts are net-15 or net-30. Documentation packages with COIs, W-9s, tax IDs, and business registration are available within one business day of request. For ${stateName} property managers accustomed to juggling 15-20 separate trade vendors across a portfolio, consolidating to one account across 40 services typically saves meaningful admin time in addition to saving on the work itself.`,
        ],
      },
    ],
  };
}

// ============================================================
// CITY PAGE CONTENT
// ============================================================
export function cityPageContent(cityName: string, stateName: string, stateAbbr: string, stateSlug: string, otherCities: { name: string; slug: string }[]) {
  const sc = SERVICES.length;
  const nearbyCities = otherCities.slice(0, 8);

  return {
    title: `Home Services in ${cityName}, ${stateAbbr} — Home Services Co`,
    metaDescription: `Professional home services in ${cityName}, ${stateAbbr}. ${sc} services starting at $99/hour — licensed, insured, same-day availability. Call ${PHONE}.`,
    heroSubtitle: `Same-Day Home Services in ${cityName}`,
    sections: [
      {
        heading: `Home Services in ${cityName}, ${stateName}`,
        paragraphs: [
          `Looking for a reliable home services company in ${cityName}, ${stateAbbr}? Home Services Co offers ${sc} home services under one roof — HVAC, plumbing, electrical, painting, flooring, landscaping, cleaning, handyman, remodeling, and more. Every service starts at $99/hour with upfront pricing. Licensed, insured, and available same-day.`,
          `We built this company to solve a problem ${cityName} homeowners know well: finding good tradespeople for ordinary home jobs is harder than it should be. You call three different HVAC companies, two painters, and a handyman who never calls back. We consolidated all of it. One number, one company, one standard — across ${sc} home services in ${cityName}.`,
          `Our ${cityName} teams are local, licensed, bonded, and insured. They know the area, the building codes, the permit processes, and the supply houses. Every technician is background-checked and trained in their specific trade. We serve all of ${cityName} and surrounding areas in ${stateName}, 7 days a week, 7AM-8PM, weekends and holidays included.`,
          `Whether you need a plumber, an electrician, a painter, a cleaner, a landscaper, or someone to hang a ceiling fan — we have ${sc} specialized home services designed to cover every ordinary home need. And because it's one company, you get one account, one invoice, and one standard of service across every trade.`,
        ],
      },
      {
        heading: `How to Book Home Services in ${cityName}`,
        paragraphs: [
          `Step 1: Call us at ${PHONE}, text the same number, or book online. Describe the service you need in ${cityName} and any relevant details — the property type, access considerations, timing preferences. Our scheduler will confirm pricing and ask any clarifying questions up front.`,
          `Step 2: Pick a time. Same-day slots are available in ${cityName} for calls placed before noon in most cases. For scheduled work, we offer 2-hour arrival windows — no all-day waiting. Weekends, holidays, and evenings are all available at the same starting rate of $99/hour.`,
          `Step 3: Your ${cityName} technician arrives, walks through the job with you, and confirms the final price before any work begins. For jobs requiring parts or materials, those are itemized up front. You approve the estimate, and work starts. If anything changes during the job, we stop and get your approval before continuing.`,
          `Step 4: The work gets completed to the agreed scope. You get a clean workspace, a clear explanation of what was done, and an invoice that matches the estimate. Payment on completion — credit card, debit, check, or digital transfer. We email a copy of the invoice for your records.`,
        ],
      },
      {
        heading: `${sc} Home Services in ${cityName}, ${stateAbbr}`,
        paragraphs: [
          `All ${sc} of our home services are available in ${cityName}. Whether you need a one-time repair or recurring maintenance, we have a service designed for your specific situation. Every service follows the same pricing model: starting at $99/hour with upfront pricing on parts and materials.`,
          `Popular services in ${cityName} include HVAC repair and maintenance, plumbing repairs, electrical work, house cleaning (one-time and recurring), handyman service for small repairs, painting (interior and exterior), landscaping and lawn care, and appliance repair. Each of these is handled by a licensed specialist in that trade — not a generalist pretending to cover everything.`,
          `For home projects in ${cityName}, we handle flooring installation, kitchen and bathroom remodeling, deck building, fence installation, siding, roofing, and full carpentry work. Project managers coordinate larger builds end-to-end so you have a single point of contact from start to finish.`,
          `For specialty needs in ${cityName}, we offer tree services, pool services, snow removal, pest control, garage door repair, locksmith services, chimney sweep, water damage restoration, and more. Every service links to a dedicated page with full details, pricing, and booking information specific to ${cityName}.`,
        ],
      },
      {
        heading: `Why ${cityName} Residents Choose Home Services Co`,
        paragraphs: [
          `${cityName} has plenty of home service options, but finding consistently good ones is the hard part. Most vendors are fine until they're not — the handyman who stops returning calls, the plumber who adds mystery charges, the painter who disappears mid-job. We built this company to be the one you call and keep calling, across every trade.`,
          `Upfront pricing starting at $99/hour is the simple version. The actual operating model is more careful than that: every estimate is written, every parts cost is itemized, every scope change requires your approval. What you approve is what you pay. This is how home services should work, and it's rare enough in ${cityName} that it's become our core differentiator.`,
          `Licensed and insured technicians, same-day availability, and consistent service across all ${sc} trades. No contracts, no minimums, no recurring charges unless you want them. One phone number for every home service need you have in ${cityName}. That's the offer, and it holds up under real use.`,
          `We're also committed to responsible service in ${cityName}. We divert reusable materials to donation and recycling where appropriate, follow all permit requirements, and use licensed disposal facilities for waste. Good for the environment, and required for doing this work the right way.`,
        ],
      },
      {
        heading: `${cityName} Home Services Pricing`,
        paragraphs: [
          `Pricing in ${cityName} is straightforward: starting at $99/hour across all ${sc} services. Upfront estimates on every job. Itemized parts and materials when applicable. No weekend or holiday surcharges. No emergency premiums beyond a clear dispatch line item when one applies.`,
          `Most residential jobs in ${cityName} fall into one of three buckets. Small jobs (a plumbing repair, a fixture install, a drywall patch, a garage door fix) typically run 1-2 hours. Medium jobs (room painting, flooring in a single space, deep house cleaning) run a few hours to a full day. Large projects (kitchen remodels, full paint jobs, roof replacements) are quoted as written project scopes with clear milestones.`,
          `For recurring services in ${cityName} — weekly cleaning, lawn care, pool service, pest control — we offer seasonal or ongoing packages with a consistent technician and priority scheduling. Property managers and HOAs get consolidated invoicing and dedicated account management.`,
          `The $99/hour starting rate is an honest number. The invoice at the end matches the estimate at the start. That's the entire model.`,
        ],
      },
      {
        heading: `Common Home Service Scenarios in ${cityName}`,
        paragraphs: [
          `The most frequent calls we get from ${cityName} homeowners fall into predictable patterns, and knowing what they are can help you decide when to book. The single most common scenario is an appliance or system that has stopped working — a furnace that won't start on the first cold morning, an AC that stopped cooling at the beginning of summer, a water heater that is leaking or no longer producing hot water, a garage door that will not open, a refrigerator that is no longer keeping food cold. These are urgent but rarely true emergencies, and same-day service in ${cityName} resolves the vast majority of them within a single visit.`,
          `The second most common scenario is preventive maintenance that a ${cityName} homeowner has been deferring. Gutters that need cleaning before the next storm, an HVAC system that has not been tuned up in a few years, a chimney that needs inspection and cleaning before fireplace season, dryer vents that are backing up lint, a roof that needs inspection after a windy season. These are the jobs that cost a small amount to do proactively and a large amount to ignore until they fail. We offer maintenance packages for most of these in ${cityName} at honest hourly rates.`,
          `The third common scenario is project work — a ${cityName} homeowner who has decided to upgrade, renovate, or refinish some part of their home. Kitchen remodels, bathroom remodels, flooring replacement, interior or exterior painting, deck construction or repair, fence installation, landscaping overhauls. These are planned projects with a clear scope, and we quote them as written project estimates rather than hourly billing because that is how most homeowners prefer to think about larger projects.`,
          `The fourth scenario is recurring service — ${cityName} homeowners who have decided they would rather outsource something permanently than handle it themselves. Weekly or biweekly house cleaning, monthly pest control, seasonal lawn care, year-round pool service. These recurring relationships are some of the most satisfying work we do because the same technician learns the property, the preferences, and the rhythm of the home. Call ${PHONE} to discuss any scenario and we will tell you honestly which bucket fits, how we would handle it, and what it will cost.`,
        ],
      },
      {
        heading: `The ${cityName} Home Services Seasonal Calendar`,
        paragraphs: [
          `Home service demand in ${cityName} follows the seasons, and planning appointments around that calendar saves both money and frustration. In ${cityName}'s climate, the first hot week of summer triggers a surge in AC service calls across every provider in the market — waits stretch to a week or more and scheduling tightens across the board. Spring maintenance appointments, scheduled in March or April before the heat arrives, almost always produce faster scheduling and better technician attention than waiting until July to call during peak demand.`,
          `Winter heating work is the mirror image. The first cold week of the season produces a flood of furnace and heating system calls in ${cityName}. Systems that have been idle all summer wake up and reveal problems that would have been caught by a fall tune-up. Scheduling heating system work in October or early November, before temperatures actually fall, catches problems before they become emergencies and sidesteps the December scheduling queue that hits every heating provider in ${cityName}.`,
          `Spring is the busy season in ${cityName} for exterior work. Roofing inspections and repairs, gutter cleaning, siding work, pressure washing, deck repair, fence installation, landscaping work, and lawn care all start as soon as the weather permits. Booking this work in February or March for an April or May appointment produces significantly better scheduling than calling in May when every crew is already booked weeks out.`,
          `Fall in ${cityName} is the preventive maintenance season across nearly every trade. HVAC tune-ups, chimney sweeps, gutter cleaning before leaves and winter, roof inspections before winter weather, tree services to handle storm-damage risks before snow loads, and pre-holiday interior services (deep cleaning, carpet cleaning, painting) all peak in October and November. Booking these services in late summer or very early fall produces the best scheduling availability.`,
        ],
      },
      {
        heading: `Working With a Home Services Professional in ${cityName}`,
        paragraphs: [
          `Getting the most out of any home services appointment in ${cityName} comes down to preparation and communication. Before the technician arrives, clearing the work area, securing pets in a separate room, and noting any access considerations in advance makes the appointment run faster and produces a better outcome. Our scheduling team will walk through these considerations with you when you book, but small preparation steps on your end turn an ordinary appointment into a smooth one.`,
          `During the appointment, the walkthrough at the start is where most communication problems get solved before they can start. This is the moment to ask every question you have about the scope, the approach, the pricing, the materials, the timeline, and anything else. Our ${cityName} technicians are trained to welcome questions rather than rush through the walkthrough, because a five-minute conversation at the front of the job saves the back-and-forth that typically causes problems at the invoice stage.`,
          `If scope changes during the job — because something unexpected comes up, a hidden problem is discovered, or a better approach becomes obvious — the technician stops and talks to you before continuing. This is written into our operating protocol precisely because the industry-standard approach of "quote low, pile on change orders later" destroys customer trust. In ${cityName}, the customer always sees the change, understands why it is being proposed, and approves (or declines) before additional work begins.`,
          `After the appointment, documentation matters more than most homeowners realize. Our ${cityName} technicians log photos, notes, and completion details into the service record. When you call back for related work six months later, the next technician pulls up the full history and picks up where the last one left off. For property managers, real estate transactions, and insurance claims, this documentation is often the difference between a smooth resolution and a protracted dispute.`,
        ],
      },
    ],
    nearbyCities,
  };
}

// ============================================================
// CITY + SERVICE PAGE CONTENT
// ============================================================
export function cityServicePageContent(cityName: string, stateName: string, stateAbbr: string, service: Service) {
  const category = SERVICE_CATEGORIES[service.category];
  const relatedServices = SERVICES.filter((s) => s.category === service.category && s.slug !== service.slug);
  const svcLower = service.title.toLowerCase();

  return {
    title: `${service.title} in ${cityName}, ${stateAbbr} — Home Services Co`,
    metaDescription: `${service.title} in ${cityName}, ${stateAbbr}. Starting at $99/hour, licensed and insured. Same-day availability. Call ${PHONE}.`,
    heroSubtitle: `Professional ${service.title} in ${cityName}`,
    sections: [
      {
        heading: `${service.title} in ${cityName}, ${stateName}`,
        paragraphs: [
          `Need ${svcLower} in ${cityName}, ${stateAbbr}? Home Services Co has licensed and insured ${svcLower} technicians serving ${cityName} starting at $99/hour with upfront pricing. Same-day availability on most calls. Part of our ${SERVICES.length} home services under one roof — one phone number, consistent quality, and honest billing across every trade.`,
          `${service.longDescription}`,
          `Our ${cityName} ${svcLower} technicians know the local building codes, the permit processes when required, and the supply houses that keep jobs moving. Same-day ${svcLower} appointments are available in ${cityName} when you call before noon in most cases. We operate 7AM-8PM daily, 7 days a week, including weekends and holidays — at the same starting rate.`,
          `Every ${svcLower} job in ${cityName} begins with upfront pricing. You see the estimate, you approve it, work begins. Parts and materials are itemized. Scope changes require your explicit approval. The invoice at the end matches the estimate at the start. This is the core of how Home Services Co operates — it's rare enough in the home services industry that it's our primary differentiator.`,
        ],
      },
      {
        heading: `What ${service.title} Includes in ${cityName}`,
        paragraphs: [
          `Every ${svcLower} job in ${cityName} includes licensed and insured technicians, upfront written estimates, itemized parts and materials, clean and careful work on your property, and a final walkthrough to confirm the job is done right. The starting rate of $99/hour covers labor for most standard ${svcLower} work.`,
          `${service.subtitle}: ${service.description}`,
          `There are no hidden fees for ${svcLower} in ${cityName}. No mystery shop fees, no "fuel surcharges," no weekend or holiday premiums, no "while we were here" add-ons added after the fact. If the scope changes during the job because something unexpected comes up, we stop and get your approval before continuing. This is the most important part of the operating model, and it's why customers in ${cityName} tend to call us back for their next ${svcLower} job and the next service they need.`,
          `After the work is done, you get a clean workspace, a clear explanation of what was completed, and an invoice that matches the estimate. Payment is on completion — credit card, debit, check, or digital transfer. We email a copy of the invoice for your records. For property managers and commercial accounts, we offer consolidated monthly invoicing.`,
        ],
      },
      {
        heading: `How to Book ${service.title} in ${cityName}`,
        paragraphs: [
          `Step 1 — Call or book online: Call us at ${PHONE}, text the same number, or book through our online form. Describe your ${svcLower} needs in ${cityName} — the property, the scope, any access considerations, and your preferred timing. Our scheduler will confirm pricing and lock in your appointment.`,
          `Step 2 — Schedule: Pick a time that works. Same-day slots are available in ${cityName} for calls placed before noon in most cases. We offer 2-hour arrival windows on scheduled appointments — no waiting around all day. Weekends, holidays, and evenings are all available at the same starting rate of $99/hour.`,
          `Step 3 — Arrival and estimate: Your ${cityName} ${svcLower} technician arrives within the scheduled window in a branded vehicle. They walk the job with you, confirm scope, and give you the final price before any work begins. You approve the estimate, and the work starts. If anything changes during the job, we stop and get your approval before continuing.`,
          `Step 4 — Work and cleanup: The ${svcLower} work gets completed to the agreed scope. Drop cloths, floor protection, and clean-up are built into how we work — not afterthoughts. At the end, a walkthrough confirms everything is done right, and the workspace is left clean.`,
          `Step 5 — Payment and invoice: Payment is processed on completion — credit card, debit card, check, or digital transfer. You get an emailed invoice that matches the estimate you approved, itemized down to parts and labor. For property managers and commercial accounts, consolidated monthly invoicing is available.`,
        ],
      },
      {
        heading: `${service.title} Pricing in ${cityName}, ${stateAbbr}`,
        paragraphs: [
          `${service.title} in ${cityName} starts at $99/hour with upfront pricing. Parts, materials, and any specialty equipment are itemized before work begins. The total you see on the estimate is the total on the final invoice — no mystery fees, no "shop charges," no weekend or holiday surcharges beyond what was clearly priced up front.`,
          `Most ${svcLower} jobs in ${cityName} take 1-4 hours depending on scope. Small jobs often finish within an hour. Larger ${svcLower} projects are quoted as written project scopes rather than strictly hourly — we give you a clear total based on the full scope before any work begins. Either way, you know exactly what the job costs before the first hour is billed.`,
          `For ${svcLower} emergencies in ${cityName} — situations where waiting isn't an option — we offer priority same-day dispatch. The rate is still starting at $99/hour, with the dispatch fee itemized separately so you can see exactly what emergency coverage costs. This is straightforward, not a bundled "emergency rate" that obscures what you're actually paying for.`,
          `Recurring ${svcLower} needs (when applicable for this service) can be set up as dedicated accounts with priority scheduling and consolidated invoicing. Property managers, HOAs, and commercial clients in ${cityName} use this to standardize vendor costs across their portfolios.`,
        ],
      },
      {
        heading: `Why Choose Home Services Co for ${service.title} in ${cityName}?`,
        paragraphs: [
          `${cityName} has multiple options for ${svcLower} — national chains, local operators, and everything in between. What makes Home Services Co different is the combination of one-company convenience, upfront pricing, and the consistency of ${SERVICES.length} services under a single standard. You're not just hiring a ${svcLower} technician — you're starting a relationship with a company that handles every home service you need.`,
          `Our ${cityName} ${svcLower} technicians are licensed, bonded, and insured with full liability coverage. They're trained specifically in ${svcLower}, not general handyman work. And because they're backed by a central scheduling system, you get the benefits of a national company — same-day availability, consistent pricing, consolidated billing — combined with the expertise of local technicians who know your area.`,
          `Same-day ${svcLower} is available in ${cityName} for calls placed before noon in most cases. We operate 7AM-8PM daily, 7 days a week, 365 days a year. No contracts, no minimums, no recurring charges unless you want them. Book when you need us, pay for the work, and move on with your day.`,
          `Don't juggle vendors for ${svcLower} in ${cityName}. Call ${PHONE} and talk to a scheduler who can book your ${svcLower} job today — and who can also handle the next ${SERVICES.length - 1} home services on your list.`,
        ],
      },
      {
        heading: `Common ${service.title} Scenarios in ${cityName}`,
        paragraphs: [
          `Most ${svcLower} calls in ${cityName} fall into a handful of predictable patterns. Understanding those patterns helps you know what to expect when you call us and what questions the scheduler is likely to ask. The most common scenario is a problem that has already started — equipment failing, damage occurring, a system not working correctly. Same-day service is the standard response for these scenarios in ${cityName}, especially for morning calls. The second scenario is preventive or planned work — routine maintenance, upgrades, or projects the homeowner has been thinking about for a while. These book into scheduled appointments with tight 2-hour arrival windows.`,
          `The third scenario for ${svcLower} in ${cityName} is urgent-but-not-emergency — situations where waiting a couple of days is tolerable but waiting a week is not. Our scheduling prioritizes these into the same-day or next-day queue based on the specifics. The fourth scenario is recurring service where the ${svcLower} need is ongoing rather than one-time. For recurring accounts, you get a consistent technician assigned to your property, which turns into faster service and better continuity over time. We offer recurring arrangements for most of our ${SERVICES.length} services in ${cityName}.`,
          `The fifth scenario is project work — larger ${svcLower} scopes that need to be planned, budgeted, and executed over multiple visits or days. Projects get written estimates with milestones rather than strict hourly billing, because that is how most homeowners prefer to think about larger projects. Whatever category your ${svcLower} need falls into, the same core operating model applies — upfront pricing, licensed and insured technicians, transparent communication, and an invoice at the end that matches the estimate at the start.`,
          `One scenario that deserves special mention is the combined-scope job — where the ${cityName} customer needs ${svcLower} plus one or more additional services on the same property. A single dispatch covering multiple trades is often more efficient than three separate vendor visits, and we can coordinate cross-trade scopes centrally. If your project involves ${svcLower} alongside another trade, mention it when you call and the scheduler will arrange the right crew combination.`,
        ],
      },
      {
        heading: `${service.title} vs the Alternatives in ${cityName}`,
        paragraphs: [
          `${cityName} homeowners shopping for ${svcLower} typically compare a few categories of providers. The most common are independent local contractors, handyman marketplaces, national franchise networks in the trade, and the handful of local shops still operating as family businesses after generations in the area. Each of these has real trade-offs, and understanding them helps you decide where to spend your money.`,
          `Independent local ${svcLower} contractors in ${cityName} can be excellent when you have a personal relationship with one who delivers consistently. The trade-off is hit-or-miss quality across the population of independents, no accountability chain if the contractor disappears or quits the trade, and the need to start a new vendor search for each additional home service. For recurring needs across multiple trades, managing a stable of trusted independents becomes a job in itself.`,
          `Handyman marketplaces that route your ${svcLower} request to a rotating pool of contractors solve the discovery problem but rarely enforce quality. Licensing, insurance, and skill verification vary widely by platform. Reviews help but can be gamed. For unlicensed or minor work the model works fine. For licensed ${svcLower} where credentials matter, it introduces real risk.`,
          `National franchise ${svcLower} networks offer brand consistency and reliable dispatch, which are real improvements over independent contractors. The trade-off is flat-rate pricing engineered to maximize per-ticket revenue. For simple ${svcLower} jobs in ${cityName} the markup over honest hourly billing is the most visible, and for straightforward work our pricing model is significantly better. For complex work the pricing gap narrows but the consolidation benefit — one company for 40 trades — is where we consistently outperform.`,
          `Private-equity-backed ${svcLower} roll-ups in ${cityName} typically operate under a familiar local brand name but have centralized sales scripts and aggressive upsell training layered on top. Customers who used the shop for years sometimes notice the change — prices rise, sales pitches lengthen, and the local feel fades. For customers who want straightforward pricing without commission-driven add-ons, these roll-ups feel like a downgrade from the original shop. We built Home Services Co as a deliberate alternative to that model.`,
        ],
      },
      {
        heading: `Preparing for Your ${service.title} Appointment in ${cityName}`,
        paragraphs: [
          `A short preparation routine before your ${svcLower} appointment in ${cityName} makes the visit run faster and produces a better outcome. The scheduling team will walk through the basics when you book, but a few small steps on your end turn an ordinary appointment into a smooth one. Clear the work area of any movable items before the technician arrives. Secure pets in a separate room or outside. Note anything unusual about property access — gate codes, dogs, narrow driveways, parking considerations, or signage that is easy to miss.`,
          `If the ${svcLower} work involves a specific piece of equipment — a furnace, a water heater, a breaker panel, an appliance — locate the manual or have the make and model number handy. Technicians can diagnose and repair without this information, but having it available makes the diagnosis faster and sometimes allows a single-visit fix on equipment that would otherwise need a follow-up for parts. For ${cityName} homeowners who have had previous ${svcLower} work done, a copy of the prior invoice or scope helps the technician understand the history.`,
          `During the walkthrough at the start of the appointment, this is the moment to ask every question you have. Questions about scope, approach, pricing, materials, timing, warranty, or anything else you want to understand before work begins. Our ${cityName} technicians are trained to welcome questions rather than rush through the walkthrough, because a five-minute conversation at the start saves the back-and-forth that typically causes problems at the invoice stage.`,
          `After the ${svcLower} work is complete, the technician does a final walkthrough with you to confirm the job meets expectations and to answer any remaining questions. This is also the point to note anything that needs follow-up — a part that is on order, a scope adjustment that requires a return visit, or a recommendation for preventive maintenance that is worth discussing. The completion walkthrough is where you confirm the work is done to your standard before payment closes the job.`,
        ],
      },
    ],
    relatedServices,
    category,
  };
}
