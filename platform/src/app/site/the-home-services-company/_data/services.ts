export interface Service {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  longDescription: string;
  ideal: string[];
  category: "residential" | "commercial" | "specialty" | "item-specific" | "structure";
}

/** Generate extended SEO content for a service page (~5,000 words) */
export function getExtendedContent(service: Service): string[] {
  const t = service.title;
  const tl = service.title.toLowerCase();
  const cat = SERVICE_CATEGORIES[service.category];
  return [
    `${t} is one of the ${SERVICES.length} home services offered by Home Services Co, available starting at $99 per hour in 990 cities across all 50 states. As part of our ${cat.label.toLowerCase()} category, ${tl} is handled by licensed and insured professionals who show up on time, communicate clearly, and leave your home the way they found it — only better. One call, one company, one price: ${tl} done right. The fundamental promise we make for every ${tl} job is the same promise we make across every trade we operate: straightforward pricing, credentialed technicians, clear communication, and accountability when something goes wrong. That promise is why most of our ${tl} business comes from repeat customers and referrals, and it is the reason we have expanded from a handful of markets into a nationwide operation covering nearly one thousand cities.`,

    `The demand for professional ${tl} has grown significantly as homeowners recognize the difference between hiring a true trade professional and hiring a generalist who claims to do everything. At Home Services Co, our ${tl} technicians are specialists — trained in their trade, vetted through our onboarding process, and backed by our upfront pricing guarantee. You will know exactly what your ${tl} job costs before any work begins, and the rate is simple: starting at $99 per hour with no hidden surcharges, no dispatch fees on standard appointments, and no premium added for evenings or weekends. The combination of a specialist workforce and straightforward pricing is uncommon in this industry, and it is deliberately the default at our company rather than a premium offering reserved for high-end customers.`,

    `What sets our ${tl} service apart is the combination of specialized skill and operational reliability. Most home service experiences break down on the basics — showing up on time, returning calls, explaining what the work involves, and finishing the job cleanly. We built Home Services Co to solve those problems. Every ${tl} technician is licensed and insured. Every job is dispatched through our central scheduling system with real arrival windows rather than the vague "sometime between 8 and 5" windows that waste entire days. Every appointment has a confirmed technician assigned in advance, not a rotating pool that depends on who is available that morning. And every invoice matches the upfront estimate you approved, because that is how we agreed to do business with you when the appointment was booked.`,

    `The ${tl} process begins when you call, text, or book online. Our scheduling team will ask a handful of questions about your ${tl} job — the scope of what you need done, property access details, your timeline, and any specifics the technician should know before arriving. These questions are not sales probes. They exist so we can match you to the right technician, load the right tools on the truck, and set accurate expectations for arrival time and duration. You will get a confirmed appointment window, a clear description of what to expect, and the starting rate of $99 per hour. No surprises, no upsells from a dispatcher who earns commission on what they can squeeze into the ticket, just accurate information so you can plan your day around the appointment.`,

    `On arrival, your ${tl} technician walks through the job with you. This walkthrough is the single most important communication step in the entire appointment. It is the moment to ask questions, confirm scope, and adjust anything that has changed since booking. The technician will confirm the price, explain the approach, point out anything that might affect cost or timing, and then get started only after you have approved the plan. While the work is in progress, you are welcome to be present, work nearby, or go about your day entirely. Our technicians communicate at key milestones — before work begins, at any point where a decision is needed, and once the job is complete — so you always know where the job stands and nothing gets done without your sign-off.`,

    `Safety is a core priority on every ${tl} job. Our technicians follow the safety standards required for their trade, carry the correct tools and personal protective equipment, and respect your home as a working environment that contains people, pets, and belongings that matter to you. Drop cloths, floor protection, dust containment where appropriate, and end-of-job clean-up are built into how we work rather than afterthoughts tacked on for particular customers. When the job is done, you get a clean workspace, a clear explanation of what was completed and why, and an invoice that matches the estimate the technician presented at the start. If there is any debris or removed material, it leaves with us. If furniture was moved to access the work area, it goes back where it started.`,

    `Upfront pricing is non-negotiable at Home Services Co. Before any ${tl} work begins, you receive a written price you approve. The starting rate is $99 per hour for labor, and for jobs that require parts, fixtures, or materials, those costs are itemized up front with the supplier pricing visible rather than buried into a lump-sum number designed to obscure markup. There are no mystery "shop fees," no hidden disposal charges, no "while we were here" add-ons billed after the fact, and no inflated trip fees for the privilege of our technician driving to your home. If the scope of work changes during the job — because something unexpected comes up, such as a hidden problem behind a wall or an additional repair the initial scope did not catch — we stop, explain the change in plain language, present revised pricing, and continue only after you approve the revision.`,

    `The ideal customers for our ${tl} service are ${service.ideal.join(", ").toLowerCase()}. Each of these audiences has specific needs that shape how we handle the work. Homeowners generally want clear communication and upfront pricing along with a technician who treats their home with respect. Property managers need fast turnaround and consistent quality across multiple units with paperwork that their accounting systems can process cleanly. Small businesses want a reliable vendor who shows up when they say they will so a maintenance issue does not bleed into a second day of lost operations. Our ${tl} team is structured to serve all of these audiences without cutting corners on any of them, and the same technician who services a single-family home one hour is qualified to handle a twenty-unit apartment building the next.`,

    `Same-day availability is a real feature of our ${tl} service, not a marketing line we use in advertising and then fail to deliver on when customers actually call. Because we operate in 990 cities and dispatch from a central scheduling system with live technician availability, we can often get a technician to your home the same day you call, especially for requests placed before noon. For non-urgent ${tl} work that does not require same-day attention, we offer tight arrival windows on scheduled appointments, typically two hours, so you are not surrendering half a day waiting at home. Weekends and holidays are available at the same starting rate with no premium surcharge, because we see no reason to charge customers extra for a schedule that works for them.`,

    `We encourage anyone considering ${tl} to call us at (888) 700-4001 for a free, no-obligation consultation. Describe the situation in plain language, and we will give you an honest answer about what is likely involved, what it typically costs, and when we can be there. If it is a job we do not handle, we will tell you that directly rather than send a technician on a wasted trip that we will bill you for. If the job is something you could reasonably handle yourself with a short tutorial, we will tell you that too — not every ${tl} situation actually needs a professional, and the fastest way to lose a customer's trust is to oversell the work. That straight-talk approach is part of why our repeat and referral rates are strong in every market we operate in.`,

    `Licensed and insured is the baseline standard at Home Services Co, not the selling point. For ${tl} specifically, our technicians hold the licenses and certifications their trade requires in the state where they operate, and we maintain general liability and workers' compensation insurance in every state we serve. Certificates of insurance are available within twenty-four hours for property managers, homeowners associations, and commercial clients who need them for vendor-compliance files. This is table stakes in our book — every ${tl} provider you hire should be able to clear this bar, and a surprising number of them cannot, including large national brands that rely on subcontracted labor without verifying credentials.`,

    `Our ${tl} service is available in 990 cities across all 50 states. No matter where you are located in the United States, there is a strong chance we have a local technician ready to serve you and a dispatch office within reasonable driving distance for same-day calls. Local teams know the neighborhoods, the building codes, the permit processes, the inspection offices, and the local supply houses that keep jobs moving without unnecessary delays. This local expertise translates into faster scheduling, fewer surprise hold-ups, and cleaner completions. Meanwhile, the consistency and accountability of a national company means you get the same pricing, the same standards, and the same guarantees whether you are calling from a coastal metropolis or a rural county seat.`,

    `Scheduling flexibility is a practical advantage of our ${tl} service. We understand that most homeowners cannot meet a technician at 10 a.m. on a Tuesday without rearranging work, childcare, or other commitments that have nothing to do with whether their home is working properly. That is why we offer early-morning, evening, and weekend appointments at the same starting rate of $99 per hour. No surcharges, no premiums, no "after hours" rate that quietly doubles the bill. Emergency same-day ${tl} is available for urgent situations where waiting until Monday is not a reasonable option, such as an active leak, a failed heating system in winter, or an electrical problem that is cutting power to essential circuits. The scheduling system is built to meet customers where they are rather than forcing them into business hours that do not fit their lives.`,

    `For customers who need recurring ${tl} — property managers handling regular maintenance, homeowner associations with shared systems, businesses with ongoing facility needs — we offer dedicated accounts with priority scheduling and consistent technician assignments. Your recurring ${tl} technician learns your properties, your preferences, your building quirks, and the expectations of the people who hired them. They know how to access the building, who to call for approvals, which circuit breaker panels serve which sections, and what "done right" looks like to the specific person writing the check. This consistency shortens every future visit, reduces the time spent explaining the basics of the property, and keeps quality high across the entire portfolio rather than varying depending on which technician showed up that week.`,

    `Customer satisfaction drives everything we do in ${tl}. Home Services Co operates on a simple principle that every technician hears in onboarding: be the company you would want to call for your own home. That means answering the phone, showing up on time, doing the work correctly the first time, honoring the estimate, and cleaning up before leaving. It means hiring technicians who care about craftsmanship and training them in communication and customer service as much as technical skill. When we get any of that wrong — and we do sometimes, because the company is staffed by human beings working in real homes with real complications — we fix it. One call to (888) 700-4001 and we make it right, whether that means a return visit, a refund, a credit, or a direct conversation with a manager who has the authority to resolve the issue.`,

    `The history of ${tl} as a residential trade has shifted dramatically in the past twenty years. A generation ago, most customers found their ${tl} provider through a neighbor recommendation, a church directory, or the yellow pages. The quality bar was whatever the local tradesperson set for their own reputation, and the pricing was negotiated job by job based on the tradesperson's read of what a particular customer could pay. The internet changed that — and not for the better in many respects. Lead-generation marketplaces created an incentive structure where ${tl} providers competed on cost per lead rather than on quality of work. Review-platform manipulation became common. And large private-equity-backed roll-ups bought local shops, stripped them of their brand, and layered in aggressive sales scripts that turned diagnostic visits into upselling opportunities. Home Services Co is a deliberate counterweight to that industry evolution — local technicians, national accountability, and a pricing model that does not rely on squeezing every customer for every possible add-on.`,

    `Seasonality is a real factor in ${tl} demand, and we staff accordingly. Certain times of year bring predictable surges — the first hot week of summer, the first cold week of fall, the weekends after a major storm, and the holiday run-up when customers want their homes ready for guests. Other periods are slower, and we use those slower periods for technician continuing education, equipment updates, and process improvements. For customers, the practical impact is that our scheduling capacity scales with demand. In peak periods we extend hours, add dispatch capacity, and pull in technicians from adjacent markets rather than letting the queue stretch to unacceptable wait times. In off-peak periods our scheduling is fast enough that same-day service becomes the default rather than the exception, and we occasionally offer promotional rates to keep technicians busy during the slowest weeks.`,

    `Permit requirements vary significantly by jurisdiction for ${tl} work, and our technicians know the local rules for every market they operate in. In some municipalities, the permit process is a straightforward pull-and-file that adds a day to the job. In others, permits require specific drawings, engineer stamps, or inspections that add meaningful time to the project timeline. We pull permits when they are required, and we tell you in advance when the permit timeline will affect the overall schedule. Customers who are tempted to skip permits to save a few dollars should understand the downstream risk: unpermitted ${tl} work can create problems at the point of sale, cause insurance claims to be denied, and sometimes require tear-out and rework to bring the property back into compliance. We handle the permits correctly so these problems do not exist.`,

    `Warranty coverage on our ${tl} work is straightforward and documented in writing at the end of every job. Labor is warrantied against defects in workmanship for a period that varies by the nature of the work but is always disclosed in advance. Parts carry whatever warranty the manufacturer provides, which we register in your name and document with your invoice. If something we installed fails within the warranty period because of our workmanship or a manufacturing defect, we come back and fix it at no charge. This is not a marketing device — it is written policy, and we honor it even when the original technician has moved on or the original manager has changed roles. Customers keep their service records in our system and can pull a full history of work performed on their property any time they need it.`,

    `Common misconceptions about ${tl} cost customers real money. One of the most common is the assumption that the cheapest bid is the best deal. In practice, the cheapest bid often reflects a provider who is cutting corners somewhere — on the license, on the insurance, on the parts, on the labor time allocated to the job, or on the follow-up when something goes wrong. Another common misconception is that all providers are essentially equivalent and the only thing that matters is finding someone who can fit you in. The truth is that ${tl} quality varies enormously across providers, and the cost of having the job redone after a bad first attempt often exceeds what the better provider would have charged in the first place. Our customers learn quickly that the upfront investment in quality pays back across the life of the home.`,

    `Technicians we hire for ${tl} go through a multi-step onboarding process before they ever see a customer. We verify licensing directly with the state licensing authority rather than taking the candidate's word for it. We check insurance coverage and confirm the policy is active and meets our coverage minimums. We run background checks, driving records, and drug screens consistent with what a property manager or homeowner would reasonably expect. We conduct technical assessments specific to ${tl} to confirm the candidate's competence beyond what their resume claims. And finally, we pair new technicians with experienced lead technicians for a ride-along period before assigning solo routes. This process is slower than what our competitors do, and it means we sometimes turn away candidates who could have started tomorrow at another company. We think the trade-off is worth it.`,

    `Communication during a ${tl} job is built into the process rather than left to the technician's personal style. Customers receive a text with the technician's photo and name when they are dispatched. They receive an arrival update as the technician is on the way. They receive a walk-through summary before work begins, so the scope and price are documented in writing. They receive an in-job notification when any change is proposed. And they receive a completion summary with photos of the finished work and a digital invoice at the end. This structured communication exists because customers have told us, consistently, that the worst part of most home-service experiences is not the work quality — it is the feeling of being left in the dark during what is happening inside their own home.`,

    `The equipment and tools our ${tl} technicians carry have a direct effect on the quality and speed of the work. Our trucks are stocked for the common scenarios specific to ${tl} so that the majority of jobs can be completed in a single visit without requiring a return trip for parts. Specialized tools that are expensive enough that most individual contractors cannot justify buying them are available to our technicians through the company, which raises the floor on what they can accomplish during a single appointment. Modern diagnostic equipment for trades where diagnostics matter is kept current. This equipment investment shows up for customers as faster completions, more accurate diagnoses, and fewer "we need to come back with the right tool" moments that waste everyone's time.`,

    `Pricing transparency deserves a fuller explanation because it is the single biggest difference customers notice between us and their previous ${tl} provider. The $99-per-hour starting rate is the labor rate, which means you pay for the technician's time at a clearly stated rate and you can see how long the job actually takes. For jobs that need parts, fixtures, or materials, those costs are itemized on the invoice at the price we pay plus a reasonable markup that is itself disclosed rather than hidden. Customers sometimes ask why we do not use a "flat rate book" like some competitors — the answer is that flat-rate pricing tends to penalize straightforward jobs that should cost less and reward providers for jobs that should take longer than the book allows. Hourly billing with honest estimates is simpler, fairer, and more respectful of the customer's intelligence.`,

    `Property managers handling multi-family buildings or commercial portfolios have specific operational needs that our ${tl} service is built to meet. Consolidated billing across multiple units or properties eliminates the paperwork of tracking twenty separate invoices. Dedicated account managers provide a single point of contact for scheduling, escalations, and reporting. Recurring service agreements at negotiated rates stabilize budgets and guarantee priority response. Certificates of insurance with the property owner named as additional insured are provided on demand. And reporting tools give property managers visibility into service history, costs by property, and recurring issues that might indicate a deeper problem worth investigating. These features exist because running a real estate portfolio requires more than a consumer-grade service relationship, and we built the account structure accordingly.`,

    `Real-estate agents, home inspectors, and home-buying services are among our most frequent referral sources because of how ${tl} interacts with the transaction lifecycle. An inspection report that flags a ${tl} problem usually needs a contractor estimate before the buyer and seller can negotiate repairs. Our technicians provide those estimates promptly, at no charge when the estimate is standalone, and in writing that holds up during negotiations. Closing-table emergencies — the last-minute discovery of a problem that will block the closing unless it is resolved quickly — are exactly the scenario our same-day dispatch was built for. Agents who work with us regularly know that we can turn a potentially deal-breaking ${tl} issue into a same-day resolution that keeps the closing on schedule.`,

    `Homeowners with older properties face a different set of ${tl} considerations than owners of newer construction. Older homes often have mixed eras of work done by different generations of owners with varying skill levels, which means the "standard" ${tl} job can run into non-standard conditions behind a wall, under a floor, or inside a utility panel. Our technicians are trained to expect and adapt to these conditions rather than surprise a homeowner with a change order halfway through. When unusual conditions are discovered, the technician pauses, explains what they found, and works through options with the homeowner before continuing. This approach costs a little more time on individual jobs, and it prevents the kind of after-the-fact conflict that damages both trust and outcomes.`,

    `Our approach to ${tl} for rental properties, vacation rentals, and investment homes differs from single-family-owner-occupied work in useful ways. We can work directly with property managers and authorized representatives rather than requiring the owner to coordinate every visit. We document the scope and condition with photographs that are retained in the work history, so there is a clear record if the condition becomes relevant to a tenant disagreement or insurance claim later. Emergency responses to tenant-reported problems are a regular part of what we handle, and our dispatch system can coordinate access through property-manager lockboxes, smart locks, or tenant-scheduled appointments as the situation requires.`,

    `Commercial ${tl} work brings a different set of operational considerations than residential work, and we handle both. Business customers typically need service completed outside of operating hours to avoid disrupting their own customers or employees. They need invoices and documentation that their accounting systems can process without back-and-forth. They need single points of contact who can escalate internally when a problem exceeds the scope of a single ticket. And they often need capacity for larger-scale projects that span multiple buildings or require coordination with their internal facilities teams. Our commercial division handles these scenarios as a matter of routine, and we can scale from a single-location small business up to regional property portfolios with appropriate account management.`,

    `Do-it-yourself versus professional is a real question for ${tl} work, and we answer it honestly. For straightforward tasks where a motivated homeowner can watch a good tutorial and complete the work safely, we will tell you so. For tasks that require specialized tools, licensing, or the handling of systems where a mistake creates real danger or real damage, we recommend hiring a professional and we will explain why. The line between DIY and professional is not always where customers expect it to be — some tasks that look intimidating are simpler than they appear, and some tasks that look easy are surprisingly complex. Our customers appreciate straight answers on this question more than almost anything else, and the answers do not always route work to us.`,

    `Emergency ${tl} situations have specific handling that matters when you are in one. An active water leak, a gas smell, a sparking outlet, a tree on a roof, a heating system failure in freezing weather, or a plumbing backup that is threatening to damage the floor are all scenarios where fast response matters more than lowest-cost response. Our emergency dispatch operates around the clock in most markets and prioritizes calls based on the actual urgency of the situation rather than the order they came in. Customers with true emergencies get a technician on the way as quickly as logistically possible. Customers whose situation is urgent but not an emergency — meaning it can wait a few hours but not a few days — get placed into the same-day queue with a realistic arrival estimate rather than a hopeful one.`,

    `Preventive maintenance on ${tl}-adjacent systems typically saves homeowners meaningful money over the life of the home. The specific maintenance schedule depends on the system, the climate, and the age of the equipment, but the general principle is consistent: routine inspection and small corrective work cost a fraction of the reactive repair or replacement that happens when a deferred problem finally fails. For customers interested in preventive maintenance on any system we service, our technicians can put together a maintenance plan with scheduled visits that fit the actual needs of your home rather than a generic schedule that sells more appointments than you need. The goal is to extend equipment life and catch problems early, not to create recurring revenue for us.`,

    `Environmental responsibility in ${tl} is something our technicians take seriously even on jobs where it is not visible to the customer. Waste from our jobs is disposed of correctly through licensed disposal facilities. Recyclable materials are separated and sent to appropriate recyclers rather than landfilled. Hazardous materials are handled under the applicable regulatory framework for the material and jurisdiction. Refrigerants and other regulated substances are captured and managed by technicians with the appropriate EPA certifications. This behind-the-scenes work is not visible on most invoices, and it is part of what separates a legitimate national service company from the low-bid contractors whose waste management strategy is "whatever the dumpster accepts." We do it correctly because it is the correct thing to do.`,

    `Our customer app and online portal give ${tl} customers a central place to manage their account, schedule appointments, review work history, pay invoices, and access service records. Customers who prefer to pick up the phone and talk to a human are always welcome to do that at (888) 700-4001 — the phone team is staffed during regular business hours and has on-call coverage overnight for emergencies. The goal of the app is to make self-service easy for customers who want it while preserving the human-to-human phone option for customers who prefer it. Technology that forces customers into channels they do not want is not good technology, and we do not require app usage to get service.`,

    `The relationship between ${tl} and other services we provide is worth understanding if you own a home. Home systems rarely fail in isolation. A roof leak eventually becomes an interior paint and drywall problem. A plumbing failure often becomes a flooring problem. A heating system issue frequently ties to electrical or ductwork work. Our 40-service structure exists specifically so that when a ${tl} issue is really part of a larger system problem, we can bring in the right trades under the same company and the same accountability structure. You do not have to manage the handoffs between separate vendors. You do not have to coordinate schedules across three different companies. One phone number, one project manager for multi-trade work, and one accountable party when something needs follow-up.`,

    `Warranty claims, callbacks, and follow-ups are handled by the same company that did the original ${tl} work. This sounds obvious, and it is not how many of our competitors operate. Lead-generation marketplaces and franchise networks frequently obscure who is ultimately responsible when something goes wrong after a job is complete, and customers end up caught between a local operator and a national brand that both claim the issue is the other party's responsibility. Home Services Co is the responsible party. If a ${tl} job we completed develops an issue within the warranty period, we handle it directly and at no additional cost. The responsibility does not get passed along, deflected, or buried in a subcontractor agreement.`,

    `Accessibility considerations matter for ${tl} work in homes occupied by older adults, people with disabilities, and anyone who needs the work approach adapted to their situation. Our technicians are trained to communicate clearly, work at a pace that matches the customer, and coordinate with family members or care providers when that is helpful. If a ${tl} job needs to be scheduled around medical appointments, oxygen deliveries, home health visits, or other routines, we can work with those constraints rather than fighting them. The goal is to get the work done in a way that respects the customer's life, not to impose our preferred scheduling on customers whose circumstances make our preferred scheduling difficult.`,

    `Language and communication accessibility is something we take seriously. Our phone team has Spanish-speaking staff in most markets, and we can accommodate other languages through interpretation services when necessary. Our technicians come from the communities they serve, which in most markets means they reflect the linguistic diversity of those communities naturally. Customers who are more comfortable in a language other than English should feel free to ask for that accommodation when they book — we will make it work, and the language accommodation does not change the price, the timing, or the standard of service in any way.`,

    `Returning customers receive practical advantages that reflect the value of an ongoing relationship. Service history is already in our system, which means the technician arriving at your home already knows the work that has been done previously, the equipment you have installed, the preferences you have expressed, and any account-specific notes that help them deliver the job faster. Repeat customers get priority in scheduling during peak periods because the relationship is bidirectional — customers who trust us and return for repeat work get a matching level of trust and priority from us. This is the reason most of our ${tl} business comes from existing customers and referrals, and it is the reason we invest heavily in making every first-time interaction one that earns a second appointment.`,

    `Our long-term vision for ${tl} and the broader home services category is straightforward: make it normal for homeowners to have one trusted company they call for every service need, rather than the current norm of juggling a different vendor for every trade. The fragmented market we serve exists because the category has never been consolidated under a single accountable brand. We are building that brand — 40 services, 990 cities, upfront pricing, and licensed technicians. If you have a ${tl} question, a scheduling need, or an emergency, call (888) 700-4001 and we will help. The invitation is simple: try us once on a real job and see how the experience compares to what you are used to. Most customers, once they try us, do not go back to the vendor-juggling approach they came from.`,
  ];
}

export const SERVICES: Service[] = [
  // CLIMATE & UTILITY SYSTEMS
  {
    slug: "hvac-services",
    title: "HVAC Services",
    subtitle: "Heating, Cooling & Air Quality",
    description: "Furnace, AC, heat pump, and ductwork service from licensed HVAC technicians. Starting at $99/hour with upfront pricing and same-day availability.",
    longDescription: "Our HVAC technicians handle everything from seasonal tune-ups and filter changes to full system diagnostics, repairs, and new installations. Whether your AC stopped cooling mid-summer, your furnace is cycling oddly in winter, or you're planning a system replacement, we'll give you a clear diagnosis, upfront pricing, and a real timeline. Licensed and insured, available across 990 cities.",
    ideal: ["Homeowners", "Landlords", "Property Managers", "Small Businesses"],
    category: "residential",
  },
  {
    slug: "plumbing",
    title: "Plumbing",
    subtitle: "Repairs, Drains & Fixture Installation",
    description: "Licensed plumbers for leaks, clogs, water heaters, fixtures, and repipes. Starting at $99/hour with same-day availability in 990 cities.",
    longDescription: "From dripping faucets and running toilets to slab leaks and full repipes, our licensed plumbers handle the full range of residential and light commercial plumbing work. We arrive with a truck stocked for common repairs, give you a firm price before any work starts, and clean up completely when we're done. Emergency service available for burst pipes, active leaks, and sewer backups.",
    ideal: ["Homeowners", "Renters", "Landlords", "Property Managers"],
    category: "residential",
  },
  {
    slug: "electrical",
    title: "Electrical",
    subtitle: "Wiring, Panels, Outlets & Fixtures",
    description: "Licensed electricians for outlets, fixtures, panels, and full wiring work. Starting at $99/hour with upfront pricing and same-day availability.",
    longDescription: "Our licensed electricians handle everything from installing a new ceiling fan to upgrading your service panel. Dedicated circuits for appliances, EV charger installation, whole-house surge protection, GFCI upgrades, code-compliance repairs — all done to current electrical code with permits pulled when required. Licensed and insured in every state we serve.",
    ideal: ["Homeowners", "Landlords", "Contractors", "Small Businesses"],
    category: "residential",
  },
  {
    slug: "roofing",
    title: "Roofing",
    subtitle: "Repairs, Replacement & Inspections",
    description: "Roof repairs, replacements, and inspections from licensed roofing contractors. Starting at $99/hour with upfront pricing.",
    longDescription: "Missing shingles after a storm, active leaks, flashing failures around chimneys and skylights, or a full tear-off and replacement — our roofing teams handle it all. We provide honest inspections (including insurance-claim documentation when relevant), upfront pricing on repairs, and detailed written estimates for replacements. Licensed, insured, and experienced across every common roofing material.",
    ideal: ["Homeowners", "Property Managers", "Realtors", "Insurance Clients"],
    category: "residential",
  },
  {
    slug: "painting",
    title: "Painting",
    subtitle: "Interior & Exterior Painting",
    description: "Interior and exterior painting by professional crews. Starting at $99/hour with upfront pricing on labor and materials.",
    longDescription: "Single rooms, full interior repaints, exterior siding and trim, cabinets, decks, and commercial spaces — our painting crews handle residential and light commercial work at the same level of prep and finish. Proper surface prep, clean lines, drop cloths on every surface that matters, and materials itemized up front so you never wonder what you're paying for.",
    ideal: ["Homeowners", "Landlords", "Realtors", "Small Businesses"],
    category: "residential",
  },
  {
    slug: "flooring-installation",
    title: "Flooring Installation",
    subtitle: "Hardwood, LVP, Tile & Carpet",
    description: "Professional flooring installation for hardwood, LVP, laminate, tile, and carpet. Starting at $99/hour with upfront pricing.",
    longDescription: "Our flooring installers handle tear-out, subfloor prep, underlayment, and finish installation across every common flooring type — hardwood, engineered wood, LVP, laminate, ceramic and porcelain tile, and carpet. Transitions, trim, and baseboards finished to match. We give you an itemized estimate before any materials are ordered so you know exactly what the full job costs.",
    ideal: ["Homeowners", "Renovators", "Landlords", "Property Flippers"],
    category: "residential",
  },
  {
    slug: "landscaping",
    title: "Landscaping",
    subtitle: "Design, Installation & Maintenance",
    description: "Landscape design, installation, and seasonal maintenance. Starting at $99/hour with upfront pricing.",
    longDescription: "From full landscape design and installation to ongoing seasonal maintenance, our landscaping teams handle planting, hardscaping, irrigation, mulching, grading, and everything in between. Whether you want a one-time transformation or a recurring maintenance schedule, we give you a real plan and real pricing up front.",
    ideal: ["Homeowners", "HOAs", "Property Managers", "Commercial Clients"],
    category: "residential",
  },
  {
    slug: "lawn-care",
    title: "Lawn Care",
    subtitle: "Mowing, Fertilization & Treatment",
    description: "Weekly mowing, fertilization, aeration, and lawn treatments. Starting at $99/hour with seasonal packages available.",
    longDescription: "Weekly and biweekly mowing, edging, and trimming, plus fertilization programs, aeration, overseeding, grub and weed treatments, and leaf cleanup. Our lawn care crews show up on a consistent schedule and leave your yard tight and clean every visit. Seasonal packages available for the full growing season.",
    ideal: ["Homeowners", "HOAs", "Property Managers", "Commercial Clients"],
    category: "residential",
  },
  {
    slug: "tree-services",
    title: "Tree Services",
    subtitle: "Trimming, Removal & Stump Grinding",
    description: "Tree trimming, removal, stump grinding, and storm damage work. Starting at $99/hour, licensed and insured.",
    longDescription: "Our tree teams handle pruning, canopy reduction, dead limb removal, full tree removal, stump grinding, and storm cleanup. Every crew is fully insured — this matters because tree work carries real property and personal risk, and you should never hire anyone to climb a tree on your property without verified insurance. We pull permits when required and dispose of debris cleanly.",
    ideal: ["Homeowners", "Property Managers", "Insurance Clients", "HOAs"],
    category: "specialty",
  },
  {
    slug: "pest-control",
    title: "Pest Control",
    subtitle: "General, Termite & Wildlife",
    description: "General pest control, termite treatment, rodent and wildlife removal. Starting at $99/hour with recurring service options.",
    longDescription: "General pest control for ants, roaches, spiders, and seasonal invaders. Targeted treatments for termites, bed bugs, and bees/wasps. Rodent and wildlife removal with humane exclusion. Our licensed pest control technicians use treatment products labeled for residential use and follow integrated pest management principles — meaning we solve the actual cause, not just the symptom.",
    ideal: ["Homeowners", "Landlords", "Property Managers", "Businesses"],
    category: "residential",
  },

  // CLEANING SERVICES
  {
    slug: "house-cleaning",
    title: "House Cleaning",
    subtitle: "Deep, Standard & Move-In/Out",
    description: "Standard cleaning, deep cleaning, and move-in/move-out cleans. Starting at $99/hour with recurring service options.",
    longDescription: "Weekly, biweekly, and monthly house cleaning on a consistent schedule, plus one-time deep cleans and move-in/move-out cleans. Our cleaners work from a documented checklist so you get the same level of service every visit, and recurring clients get the same cleaner when possible for consistency.",
    ideal: ["Homeowners", "Renters", "Landlords", "Busy Professionals"],
    category: "residential",
  },
  {
    slug: "carpet-cleaning",
    title: "Carpet Cleaning",
    subtitle: "Steam, Dry & Stain Removal",
    description: "Professional carpet cleaning with truck-mounted equipment. Starting at $99/hour with upfront per-room pricing.",
    longDescription: "Hot water extraction (steam) cleaning, low-moisture dry cleaning, pet stain and odor treatment, and high-traffic lane cleaning. Our carpet technicians use commercial-grade equipment, identify fiber type before treatment, and pre-condition spots for better results. Furniture moved and replaced on clean pads.",
    ideal: ["Homeowners", "Landlords", "Property Managers", "Businesses"],
    category: "residential",
  },
  {
    slug: "window-cleaning",
    title: "Window Cleaning",
    subtitle: "Interior & Exterior Windows",
    description: "Interior and exterior window cleaning for homes and businesses. Starting at $99/hour with per-window pricing on request.",
    longDescription: "Inside and out — single-story, two-story, and commercial storefront windows. We clean glass, sills, tracks, and screens. Hard water stain removal is available as an add-on. Proper ladder and rope-descent procedures used where required, with full insurance coverage on every job.",
    ideal: ["Homeowners", "Realtors", "Businesses", "Storefront Owners"],
    category: "residential",
  },
  {
    slug: "gutter-cleaning",
    title: "Gutter Cleaning",
    subtitle: "Cleaning, Repair & Guards",
    description: "Gutter cleaning, repairs, and gutter guard installation. Starting at $99/hour with flat-rate options on standard homes.",
    longDescription: "Full gutter and downspout clean-out, flushing to confirm flow, minor repairs on the spot (fasteners, seams, downspout reattachment), and gutter guard installation for homes where recurring cleaning is the wrong long-term answer. We photo-document before-and-after so you can see what came out.",
    ideal: ["Homeowners", "Property Managers", "Realtors"],
    category: "residential",
  },
  {
    slug: "pressure-washing",
    title: "Pressure Washing",
    subtitle: "Siding, Driveways, Decks & More",
    description: "Pressure and soft washing for siding, driveways, decks, and concrete. Starting at $99/hour with upfront pricing.",
    longDescription: "The right technique for the surface — soft washing for siding and roofs, pressure washing for driveways and concrete, and cleaning additives for organic growth. Our technicians know when high pressure will do damage and use the correct method for each surface, not one-size-fits-all blasting.",
    ideal: ["Homeowners", "HOAs", "Property Managers", "Businesses"],
    category: "residential",
  },
  {
    slug: "air-duct-cleaning",
    title: "Air Duct Cleaning",
    subtitle: "Ducts, Vents & Dryer Vents",
    description: "Air duct and dryer vent cleaning with professional equipment. Starting at $99/hour with upfront whole-home pricing.",
    longDescription: "HVAC duct and register cleaning using negative-pressure vacuum equipment and agitation tools, plus dryer vent cleaning to reduce fire risk. We inspect the system before quoting and give you honest advice on whether duct cleaning will actually help — some homes genuinely need it, others don't, and we'll tell you the difference.",
    ideal: ["Homeowners", "Landlords", "Allergy Sufferers", "Post-Renovation"],
    category: "residential",
  },

  // HANDYMAN & REPAIRS
  {
    slug: "handyman-services",
    title: "Handyman Services",
    subtitle: "Small Repairs & Home Fixes",
    description: "Professional handyman services for small repairs, installs, and general fixes. Starting at $99/hour with upfront pricing.",
    longDescription: "The \"punch list\" category — the mix of small jobs that don't need a specialist but do need someone competent, insured, and reliable. Door repairs, drywall patches, shelving, TV mounts, light fixture swaps, weatherstripping, caulking, and dozens of other small tasks. Insured, background-checked, and billed honestly by the hour.",
    ideal: ["Homeowners", "Renters", "Landlords", "Property Managers"],
    category: "residential",
  },
  {
    slug: "drywall-repair",
    title: "Drywall Repair",
    subtitle: "Patches, Texture & Finishing",
    description: "Drywall patches, cracks, and full texture matching. Starting at $99/hour with upfront pricing.",
    longDescription: "From small nail-hole touch-ups to full drywall replacement after water damage. We match texture, prime, and paint the repair to blend with the surrounding wall. Knockdown, orange peel, smooth, skip trowel — we match what's already there so the repair disappears.",
    ideal: ["Homeowners", "Landlords", "Renovators", "Property Managers"],
    category: "residential",
  },
  {
    slug: "fence-installation",
    title: "Fence Installation",
    subtitle: "Wood, Vinyl, Chain Link & Iron",
    description: "New fence installation and repair for wood, vinyl, chain link, and wrought iron. Starting at $99/hour with upfront pricing on materials.",
    longDescription: "New fence design and installation, full replacements, and repairs. Proper post depth, concrete footings, hardware that won't rust through in three years, and gates that swing and latch the way they should. We handle permit pulls and utility locates where required.",
    ideal: ["Homeowners", "HOAs", "Property Managers", "Commercial Clients"],
    category: "specialty",
  },
  {
    slug: "deck-building",
    title: "Deck Building",
    subtitle: "New Decks & Repairs",
    description: "Custom deck design and construction, plus board replacement and repair. Starting at $99/hour with upfront pricing.",
    longDescription: "New deck design and construction in pressure-treated, cedar, and composite materials. Board replacement, railing repairs, and structural assessments on older decks. We build to code, pull permits when required, and finish with proper sealing or staining on wood builds.",
    ideal: ["Homeowners", "Property Flippers", "Renovators"],
    category: "specialty",
  },

  // REMODELING
  {
    slug: "kitchen-remodeling",
    title: "Kitchen Remodeling",
    subtitle: "Full & Partial Kitchen Renovations",
    description: "Full kitchen remodels and targeted updates — cabinets, counters, backsplash, flooring, and appliances. Starting at $99/hour with upfront pricing.",
    longDescription: "Full-gut kitchen remodels and smaller targeted updates (cabinets only, countertops only, backsplash refresh). Our project managers coordinate trades, order materials, and keep the timeline moving. You get a detailed scope, a written schedule, and a single point of contact from demolition through final punch list.",
    ideal: ["Homeowners", "Renovators", "Property Flippers"],
    category: "residential",
  },
  {
    slug: "bathroom-remodeling",
    title: "Bathroom Remodeling",
    subtitle: "Full & Partial Bath Renovations",
    description: "Full bathroom remodels and targeted updates — tile, vanities, showers, and tubs. Starting at $99/hour with upfront pricing.",
    longDescription: "Full bathroom gut-and-rebuild plus targeted updates — new vanity, walk-in shower conversion, tub-to-shower, tile refresh, or fixture upgrade. We handle waterproofing correctly (not a cosmetic concern — this is where most cheap remodels fail three years later), and we coordinate plumbing and electrical under one project scope.",
    ideal: ["Homeowners", "Renovators", "Property Flippers"],
    category: "residential",
  },

  // SPECIALTY REPAIR
  {
    slug: "garage-door-repair",
    title: "Garage Door Repair",
    subtitle: "Springs, Openers & Panels",
    description: "Garage door spring, opener, roller, and panel repair. Starting at $99/hour with same-day emergency service.",
    longDescription: "Broken springs (the single most common garage door call — and the most dangerous to DIY), opener replacements and programming, roller and track repairs, panel replacements, and safety sensor alignment. Same-day emergency service for doors that won't open or close.",
    ideal: ["Homeowners", "Landlords", "Property Managers"],
    category: "residential",
  },
  {
    slug: "locksmith-services",
    title: "Locksmith Services",
    subtitle: "Rekey, Lockout & Installation",
    description: "Lock rekeying, lockout service, and new lock installation. Starting at $99/hour with 24/7 emergency availability.",
    longDescription: "Rekeying after a move or tenant turnover, lockout service when you're on the wrong side of a locked door, deadbolt and smart lock installation, and key duplication. Licensed locksmiths with verified identity checks before any unlock service — the kind of professionalism that matters when someone is accessing your home.",
    ideal: ["Homeowners", "New Tenants", "Landlords", "Property Managers"],
    category: "specialty",
  },
  {
    slug: "appliance-repair",
    title: "Appliance Repair",
    subtitle: "Fridge, Washer, Dryer & More",
    description: "Appliance repair for refrigerators, washers, dryers, dishwashers, and ovens. Starting at $99/hour with upfront diagnostic.",
    longDescription: "Diagnostic and repair for major home appliances — refrigerators (cooling, ice makers, leaks), washing machines (drain, spin, leak), dryers (no heat, no tumble, venting), dishwashers, ovens, and ranges. We tell you honestly when repair is worth it and when replacement is the better call — no commission to push you toward either choice.",
    ideal: ["Homeowners", "Renters", "Landlords", "Property Managers"],
    category: "residential",
  },
  {
    slug: "furniture-assembly",
    title: "Furniture Assembly",
    subtitle: "IKEA, Wayfair & Flat-Pack",
    description: "Professional furniture assembly for IKEA, Wayfair, and all flat-pack furniture. Starting at $99/hour with upfront pricing.",
    longDescription: "IKEA, Wayfair, Amazon, Target — whatever you ordered, we assemble it correctly the first time. Beds, dressers, desks, bookshelves, cribs, outdoor furniture, and full office fit-outs. We bring the right tools, follow the manufacturer instructions, and dispose of packaging. Mounting to walls when required for safety.",
    ideal: ["Homeowners", "Renters", "Movers", "New Parents"],
    category: "item-specific",
  },
  {
    slug: "moving-services",
    title: "Moving Services",
    subtitle: "Local Moves & Loading Help",
    description: "Local moves, loading and unloading, and in-home furniture moves. Starting at $99/hour with upfront pricing.",
    longDescription: "Local residential moves, labor-only loading and unloading (you rent the truck, we load it), in-home furniture moves, and single-item moves. Our movers come with blankets, straps, and dollies. Licensed and insured — which actually matters if someone drops your sofa down the stairs.",
    ideal: ["Homeowners", "Renters", "Students", "Seniors Downsizing"],
    category: "specialty",
  },
  {
    slug: "junk-removal",
    title: "Junk Removal",
    subtitle: "Hauling & Disposal",
    description: "Full-service junk hauling and cleanout — furniture, appliances, yard waste, and more. Starting at $99/hour with dump fees included.",
    longDescription: "Furniture, appliances, yard waste, construction debris, garage cleanouts, and single-item pickups. Starting at $99/hour with dump fees included — we load, haul, and dispose of everything. Donation and recycling routing when possible to keep usable items out of the landfill.",
    ideal: ["Homeowners", "Landlords", "Property Managers", "Movers"],
    category: "specialty",
  },
  {
    slug: "pool-services",
    title: "Pool Services",
    subtitle: "Cleaning, Maintenance & Repair",
    description: "Weekly pool cleaning, chemical balancing, equipment repair, and seasonal open/close. Starting at $99/hour with recurring service.",
    longDescription: "Weekly pool service (skim, vacuum, brush, chemical check, filter maintenance), equipment diagnosis and repair (pumps, filters, heaters, salt systems), and seasonal open/close for in-ground and above-ground pools. Recurring clients get the same technician and a consistent weekly schedule.",
    ideal: ["Homeowners", "HOAs", "Property Managers", "Vacation Rentals"],
    category: "specialty",
  },
  {
    slug: "snow-removal",
    title: "Snow Removal",
    subtitle: "Driveways, Walkways & Commercial",
    description: "Snow plowing, shoveling, and salting for homes, driveways, and commercial properties. Starting at $99/hour with seasonal contracts.",
    longDescription: "Residential driveway and walkway clearing, commercial lot plowing, and salt/sand application. Seasonal contracts available for automatic response on storms over a threshold you set — no need to call after every snowfall. Equipment sized appropriately for the job, from snowblowers for driveways to trucks for commercial lots.",
    ideal: ["Homeowners", "HOAs", "Property Managers", "Commercial Clients"],
    category: "specialty",
  },
  {
    slug: "holiday-light-installation",
    title: "Holiday Light Installation",
    subtitle: "Installation, Takedown & Storage",
    description: "Professional holiday light design, installation, and takedown. Starting at $99/hour with seasonal packages.",
    longDescription: "Design, installation, maintenance, and takedown of holiday lights on homes and commercial properties. Commercial-grade lights that last multiple seasons, proper attachment methods that don't damage your roof or siding, and storage at our facility between seasons if you want it.",
    ideal: ["Homeowners", "HOAs", "Businesses", "Property Managers"],
    category: "specialty",
  },

  // HOME SYSTEMS
  {
    slug: "home-security-installation",
    title: "Home Security Installation",
    subtitle: "Cameras, Alarms & Smart Home",
    description: "Installation of security cameras, alarm systems, smart locks, and doorbell cameras. Starting at $99/hour with upfront pricing.",
    longDescription: "Camera and DVR/NVR installation, smart doorbell setup, alarm system installation, smart lock integration, and whole-home security packages. We configure the apps, walk you through the controls, and make sure everything actually works with your existing WiFi before we leave.",
    ideal: ["Homeowners", "Landlords", "Businesses", "New Homeowners"],
    category: "specialty",
  },
  {
    slug: "solar-installation",
    title: "Solar Installation",
    subtitle: "Panels, Inverters & Battery",
    description: "Solar panel design, installation, and battery backup systems. Starting at $99/hour with detailed written proposals.",
    longDescription: "Residential solar design, panel installation, inverter and battery backup systems, and grid interconnection. Honest financial modeling — we tell you what the real payback period looks like based on your utility rates, not a glossed-up sales pitch. Permits, inspections, and utility coordination handled.",
    ideal: ["Homeowners", "Businesses", "Environmentally-Conscious Buyers"],
    category: "specialty",
  },
  {
    slug: "insulation-services",
    title: "Insulation Services",
    subtitle: "Attic, Wall & Crawlspace",
    description: "Attic, wall, and crawlspace insulation installation and upgrades. Starting at $99/hour with energy-audit-backed recommendations.",
    longDescription: "Blown-in attic insulation, batt installation in new construction, spray foam in specific applications, and crawlspace encapsulation. We pair this with honest air-sealing advice — insulation without air sealing is a partial fix, and we'll tell you when you need both to actually see the energy bill change.",
    ideal: ["Homeowners", "Renovators", "Energy-Conscious Buyers"],
    category: "residential",
  },

  // EXTERIOR
  {
    slug: "siding-installation",
    title: "Siding Installation",
    subtitle: "Vinyl, Fiber Cement & Wood",
    description: "New siding installation and repair for vinyl, fiber cement, and wood. Starting at $99/hour with upfront pricing.",
    longDescription: "New siding installation, full replacements, and targeted repair of damaged sections. Vinyl, fiber cement (Hardie), wood, and engineered composites. We handle the details other crews skip — proper flashing, weather-resistive barrier overlap, and trim that looks finished from ten feet away.",
    ideal: ["Homeowners", "Renovators", "Property Flippers"],
    category: "specialty",
  },
  {
    slug: "concrete-services",
    title: "Concrete Services",
    subtitle: "Driveways, Patios & Foundations",
    description: "Concrete driveways, patios, sidewalks, and foundation repair. Starting at $99/hour with upfront pricing.",
    longDescription: "New driveways, patios, sidewalks, and slab work, plus repair of cracked and spalling concrete. Proper base prep, reinforcement, expansion joints, and finishing technique — the boring stuff that determines whether concrete lasts 5 years or 40.",
    ideal: ["Homeowners", "Contractors", "Property Managers"],
    category: "specialty",
  },
  {
    slug: "masonry",
    title: "Masonry",
    subtitle: "Brick, Stone & Repointing",
    description: "Brick, stone, and block masonry — new builds, repairs, and repointing. Starting at $99/hour with upfront pricing.",
    longDescription: "Brick, stone, and block work — chimneys, retaining walls, patios, walkways, and repair of failing mortar (repointing). Stone veneer, thin brick, and traditional full-depth masonry. Matching existing materials on repairs so the fix isn't obvious.",
    ideal: ["Homeowners", "Property Managers", "Historical Homes"],
    category: "specialty",
  },
  {
    slug: "chimney-sweep",
    title: "Chimney Sweep",
    subtitle: "Cleaning, Inspection & Repair",
    description: "Chimney cleaning, Level 1 and 2 inspections, and cap/crown repair. Starting at $99/hour with certified sweeps.",
    longDescription: "Annual chimney cleaning, NFPA-standard inspections, cap and crown repair, flue liner assessment, and creosote removal. Certified chimney sweeps using camera inspection where appropriate. This is genuinely safety-critical — a failed chimney inspection is the difference between a cozy fire and a house fire.",
    ideal: ["Homeowners", "New Homeowners", "Property Managers"],
    category: "residential",
  },
  {
    slug: "water-damage-restoration",
    title: "Water Damage Restoration",
    subtitle: "Extraction, Drying & Restoration",
    description: "Water damage extraction, drying, and full restoration. Starting at $99/hour with 24/7 emergency response.",
    longDescription: "Emergency water extraction, structural drying with commercial dehumidifiers and air movers, mold assessment and remediation, and full restoration of affected drywall, flooring, and trim. We work with insurance adjusters and document damage properly for claims. 24/7 emergency response.",
    ideal: ["Homeowners", "Insurance Clients", "Property Managers"],
    category: "specialty",
  },
  {
    slug: "carpentry",
    title: "Carpentry",
    subtitle: "Trim, Framing & Custom Work",
    description: "Finish carpentry, framing, trim work, and custom built-ins. Starting at $99/hour with upfront pricing.",
    longDescription: "Finish carpentry (crown molding, baseboards, wainscoting, door casings), rough framing and structural repair, custom built-ins (bookshelves, window seats, closet systems), and general carpentry repair. Real measure-twice-cut-once work — the kind where the corners actually meet.",
    ideal: ["Homeowners", "Renovators", "Design Clients"],
    category: "residential",
  },
];

export const SERVICE_CATEGORIES = {
  residential: { label: "Home Services", description: "Core residential trades — HVAC, plumbing, electrical, cleaning, painting, and more" },
  "item-specific": { label: "Assembly & Installs", description: "Furniture assembly and single-item installation services" },
  structure: { label: "Structures & Outdoor Builds", description: "Decks, fences, and other outdoor structure work" },
  specialty: { label: "Specialty Services", description: "Tree, pool, snow, moving, security, and other specialty trades" },
  commercial: { label: "Commercial Services", description: "Services for offices, retail, property managers, and commercial clients" },
} as const;
