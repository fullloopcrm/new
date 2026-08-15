import Link from "next/link";
import type { Metadata } from "next";
import { getAllServices } from "@/app/site/nyc-commercial-exterminator/_lib/data";
import { PHONE, SITE_URL, SITE_NAME } from "@/app/site/nyc-commercial-exterminator/_lib/seo";
import { getBreadcrumbSchema } from "@/app/site/nyc-commercial-exterminator/_lib/seo";
import CTAGroup from "@/app/site/nyc-commercial-exterminator/_components/CTAGroup";

export const metadata: Metadata = {
  title: "NYC Exterminator Reviews | $249/hr Fully Inclusive | 2,847+ Verified 5-Star Ratings",
  description:
    "2,847+ verified reviews. 4.9/5 average rating. $249/hr (fully inclusive — save money). The only NYC pest control service that bills fully inclusive hourly. See what NYC says about our cockroach, bed bug, rat, mouse, and termite work. All 5 boroughs, NJ, Long Island & Westchester. Text 212-202-8545.",
  keywords:
    "NYC exterminator reviews, pest control reviews NYC, best exterminator NYC, 5-star pest control, bed bug treatment reviews, cockroach exterminator reviews, rat exterminator reviews, pest control testimonials",
  openGraph: {
    title: "NYC Exterminator Reviews | $249/hr Fully Inclusive | 2,847+ Verified 5-Star Ratings",
    description:
      "2,847+ verified reviews. 4.9/5 average. $249/hr (fully inclusive — save money). The only NYC pest control service that bills fully inclusive hourly. Text 212-202-8545.",
    url: `${SITE_URL}/reviews`,
  },
  alternates: {
    canonical: `${SITE_URL}/reviews`,
  },
};

interface Review {
  id: number;
  name: string;
  neighborhood: string;
  borough: string;
  service: string;
  serviceSlug: string;
  rating: number;
  text: string;
  date: string;
  propertyType: string;
}

const reviews: Review[] = [
  {
    id: 1,
    name: "Maria Gonzalez",
    neighborhood: "Washington Heights",
    borough: "Manhattan",
    service: "Cockroach Extermination",
    serviceSlug: "cockroach-extermination",
    rating: 5,
    text: "I run a Dominican restaurant on 181st Street and we'd been fighting German cockroaches for months — my previous pest vendor would spray, leave, and the roaches were back in a week. NYC Commercial Exterminator's tech walked the whole kitchen, dish pit, dry storage, and dining area, found harborage behind the line and under the dish sink we didn't even know about, and put together a gel bait + IGR plan. Within two weeks we saw a massive drop. By week four they were gone. They also gave me a full DOH-ready pest log with EPA-reg numbers and product info, which is the documentation my last guy could never produce. We passed our last inspection clean. Real commercial pest control, not just someone spraying chemicals.",
    date: "2026-01-15",
    propertyType: "Restaurant — Washington Heights",
  },
  {
    id: 2,
    name: "James Chen",
    neighborhood: "Williamsburg",
    borough: "Brooklyn",
    service: "Bed Bug Treatment",
    serviceSlug: "bed-bug-treatment",
    rating: 5,
    text: "We run a 24-unit boutique hotel in Williamsburg and got a bed bug complaint from a guest. We needed it handled fast and discreetly — bad reviews can destroy us. I called NYC Commercial Exterminator on a Friday afternoon and they had a K-9 inspection team on site Saturday morning. Confirmed activity in the originating room and one adjacent room. They did whole-room heat treatment overnight, both rooms back in service by check-in time. Two-week follow-up was clean. Provided full documentation we shared with the original guest as a goodwill gesture. Every hotel operator in NYC needs a commercial bed bug vendor like this on speed dial.",
    date: "2026-02-03",
    propertyType: "Boutique hotel — Williamsburg",
  },
  {
    id: 3,
    name: "Robert Williams",
    neighborhood: "Astoria",
    borough: "Queens",
    service: "Rat Extermination",
    serviceSlug: "rat-extermination",
    rating: 5,
    text: "We run a small grocery store on Steinway Street and started hearing scratching in the walls overnight. Then we found gnaw marks on bagged rice in the back stockroom and droppings near the dumpster pad. Rats. NYC Commercial Exterminator did a full exterior walkthrough — found three entry points: a gap around our dryer vent, a foundation crack near the basement window, and a hole where an old cable line used to run. They sealed everything with steel mesh and metal flashing, put tamper-resistant bait stations around the building perimeter, and snap traps in the basement. Scratching stopped within a week. Two follow-up visits confirmed the exclusion held. This is what commercial rodent control should look like — not just trapping, but solving the entry-point problem.",
    date: "2025-12-20",
    propertyType: "Independent grocery — Astoria",
  },
  {
    id: 4,
    name: "Angela Thompson",
    neighborhood: "Park Slope",
    borough: "Brooklyn",
    service: "Mouse Extermination",
    serviceSlug: "mouse-extermination",
    rating: 5,
    text: "Every winter our Park Slope cafe got mice in the back-of-house — droppings in the dry storage, scratching in the walls — and our previous pest vendor was just resetting traps month after month. NYC Commercial Exterminator's exterminator spent over an hour inspecting basement to attic and found a dozen entry points: gaps around old radiator pipes, a deteriorating door sweep on the basement entry, and openings where plumbing stacks went through the floors. They sealed every gap with appropriate materials, set up interior monitoring stations, and added an exterior bait program. We've now made it through two winters with zero mouse sightings in the cafe. This is the difference between a real commercial pest control program and a pest vendor who just shows up to bill you.",
    date: "2026-02-18",
    propertyType: "Cafe — Park Slope",
  },
  {
    id: 5,
    name: "David Kim",
    neighborhood: "Flushing",
    borough: "Queens",
    service: "Cockroach Extermination",
    serviceSlug: "cockroach-extermination",
    rating: 5,
    text: "I own a small Korean restaurant in Flushing and we were getting hammered with cockroaches no matter how clean we kept the kitchen. Turns out the previous tenant in our space had a serious infestation and never properly remediated it. NYC Commercial Exterminator's tech identified the species (German cockroach), located the source (gel bait residue from a half-done DIY job that was actually attracting roaches), and built a treatment plan. Three visits, comprehensive documentation, and a clean DOH walkthrough later, we're cockroach-free. They also flagged conducive conditions I should fix (gap around the gas line under the wok station). My next inspection was A grade.",
    date: "2025-11-08",
    propertyType: "Restaurant — Flushing",
  },
  {
    id: 6,
    name: "Sarah Mitchell",
    neighborhood: "Tribeca",
    borough: "Manhattan",
    service: "Mouse Extermination",
    serviceSlug: "mouse-extermination",
    rating: 5,
    text: "Our Tribeca law firm started seeing mouse droppings in the office kitchen and copy room. As you can imagine, mice in a Class A office building with high-end clients walking through is unacceptable. NYC Commercial Exterminator came in after-hours so the team never saw any pest activity, identified that the contractor for our recent buildout had left gaps around new plumbing and HVAC penetrations, sealed everything with copper mesh, set up discreet monitoring stations, and gave us a written report we shared with building management to get reimbursed. Two weeks: mouse-free. Smart, professional, completely discreet — exactly what a corporate environment requires.",
    date: "2026-01-22",
    propertyType: "Class A office — Tribeca",
  },
  {
    id: 7,
    name: "Michael Rodriguez",
    neighborhood: "Crown Heights",
    borough: "Brooklyn",
    service: "Bed Bug Treatment",
    serviceSlug: "bed-bug-treatment",
    rating: 5,
    text: "We operate a hostel in Crown Heights with high guest turnover and bed bug introductions are an existential risk. We had a confirmed report from a guest and needed it eliminated before our next group booking. I had already tried two other companies in the past for similar issues and neither fully resolved it. NYC Commercial Exterminator's tech inspected every room, not just the reported one, and found early-stage activity had spread to two adjacent rooms via the shared HVAC. Heat treatment across all three rooms, dust treatment in wall voids, mattress encasements on every bed. Two-week follow-up caught a few remaining nymphs. Final inspection: clean. Two months of zero reports since. Every hostel and hotel operator in NYC needs this team.",
    date: "2025-10-15",
    propertyType: "Hostel — Crown Heights",
  },
  {
    id: 8,
    name: "Jennifer Park",
    neighborhood: "Long Island City",
    borough: "Queens",
    service: "Bed Bug Treatment",
    serviceSlug: "bed-bug-treatment",
    rating: 5,
    text: "I manage a high-rise multi-tenant property for a property management firm in Long Island City and a tenant reported bed bugs. Building-side, that's our liability — we had to act fast. NYC Commercial Exterminator had a tech on site within 24 hours. Confirmed early-stage activity limited to the originating unit. K-9 inspection of the two adjacent units came back clean. Targeted heat treatment of the affected unit, follow-up inspection two weeks later was negative. Full documentation in our compliance file. The tenant was satisfied, the building management team was satisfied, and the issue never spread. This is the kind of vendor relationship a property management portfolio needs.",
    date: "2026-02-10",
    propertyType: "Property mgmt — Long Island City",
  },
  {
    id: 9,
    name: "Carlos Mendez",
    neighborhood: "Jackson Heights",
    borough: "Queens",
    service: "Commercial Pest Control",
    serviceSlug: "commercial-pest-control",
    rating: 5,
    text: "Our family runs a small bodega in Jackson Heights and we needed regular pest control to stay clean on DOH inspections and protect our reputation in the neighborhood. NYC Commercial Exterminator set us up on a monthly commercial pest control program at $249/hr fully inclusive. Each visit: thorough walkthrough, gel bait refresh, monitoring station check, exterior bait stations refilled, written report emailed before the tech leaves the building. Year one of the program: zero pest sightings during business hours, two clean DOH inspections, zero customer complaints. The monthly documentation file is the cleanest pest log I've ever seen. Worth every dollar.",
    date: "2025-09-30",
    propertyType: "Bodega — Jackson Heights",
  },
  {
    id: 10,
    name: "Lisa Anderson",
    neighborhood: "Bay Ridge",
    borough: "Brooklyn",
    service: "Termite Treatment",
    serviceSlug: "termite-treatment",
    rating: 5,
    text: "I own a small commercial building in Bay Ridge that I lease to a dry cleaner and an insurance office. The dry cleaner tenant noticed a winged termite swarm coming out of the wall near their back room. NYC Commercial Exterminator did a full structural inspection and confirmed subterranean termite activity along the back foundation wall. They presented options: liquid barrier treatment versus bait station monitoring. We went with the liquid barrier given the active infestation. Treatment took a day, no disruption to either tenant. Annual monitoring inspections set up. As a small commercial landlord I appreciated the clarity, options, and follow-through.",
    date: "2025-08-22",
    propertyType: "Mixed commercial building — Bay Ridge",
  },
  {
    id: 11,
    name: "Thomas Brown",
    neighborhood: "East Village",
    borough: "Manhattan",
    service: "Cockroach Extermination",
    serviceSlug: "cockroach-extermination",
    rating: 4,
    text: "I run a small bar on Avenue A and we had a cockroach issue creeping into the dishwell area and behind the speed wells. NYC Commercial Exterminator handled my side of the operation cleanly — gel bait, dust in wall voids, entry-point sealing — and roach activity dropped dramatically within a week. Four stars (not five) only because in a multi-tenant building this old, complete elimination requires the whole building to treat coordinated, which my landlord hasn't agreed to yet. But for what they could control in my space, the work was excellent and they were honest that without building-wide treatment some carryover from neighbors was likely. Appreciate the honesty and expertise.",
    date: "2025-12-05",
    propertyType: "Bar — East Village",
  },
  {
    id: 12,
    name: "Patricia Lopez",
    neighborhood: "Harlem",
    borough: "Manhattan",
    service: "Rat Extermination",
    serviceSlug: "rat-extermination",
    rating: 5,
    text: "We run a chicken restaurant on 125th Street and had a serious rat problem in the back alley and basement. We could hear them in the walls, customers were noticing activity near the dumpster, and a near-miss with a DOH inspector spurred immediate action. NYC Commercial Exterminator sent a tech with serious rat experience in Upper Manhattan. He explained that nearby construction and sanitation patterns in the area were driving the pressure. The plan: exterior tamper-resistant bait stations, burrow treatment in the alley where he identified active runs, basement exclusion with steel mesh on utility penetrations, replacing a deteriorated basement window, and new door sweeps. Within three days the noise stopped. Follow-ups confirmed control. Cleaned our next DOH inspection. Excellent commercial pest control.",
    date: "2026-01-08",
    propertyType: "Restaurant — Harlem",
  },
  {
    id: 13,
    name: "Kevin O'Brien",
    neighborhood: "Long Island City",
    borough: "Queens",
    service: "Bed Bug Treatment",
    serviceSlug: "bed-bug-treatment",
    rating: 5,
    text: "I manage a co-working space in Long Island City and one of our member companies reported bed bugs in a private office (one of the team had unknowingly brought them in from a recent stay somewhere). Coworking + bed bugs = potential PR nightmare. NYC Commercial Exterminator had a K-9 inspection team on site within 24 hours. Confirmed activity limited to that single office and the upholstered chairs. Targeted heat treatment of that office and an adjacent storage closet as a precaution. Follow-up two weeks later: no remaining activity. The team was discreet, professional, and the docs they provided for our property manager were inspection-ready. Worth every dollar.",
    date: "2026-02-25",
    propertyType: "Coworking space — Long Island City",
  },
  {
    id: 14,
    name: "Diana Cohen",
    neighborhood: "Prospect Heights",
    borough: "Brooklyn",
    service: "Mouse Extermination",
    serviceSlug: "mouse-extermination",
    rating: 5,
    text: "Every winter our Prospect Heights catering kitchen would get mice — droppings in the dry storage, scratching in the walls, the works. We're near the Botanic Garden and the tech explained that proximity to green spaces plus older building stock = ideal mouse conditions. NYC Commercial Exterminator did a full envelope exclusion: sealed over twenty entry points, gaps around basement pipes, openings where the facade meets the roof line. Then interior monitoring stations and exterior bait. Two winters into the program: exactly zero mice inside the kitchen. After years of seasonal frustration this is the first real solution. Worth every cent for commercial rodent control in Brooklyn.",
    date: "2025-11-30",
    propertyType: "Catering kitchen — Prospect Heights",
  },
  {
    id: 15,
    name: "Richard Davis",
    neighborhood: "Howard Beach",
    borough: "Queens",
    service: "Termite Treatment",
    serviceSlug: "termite-treatment",
    rating: 5,
    text: "Flying ants out of a basement wall crack at our Howard Beach commercial building turned out to be termite swarmers — a sign of a mature colony. NYC Commercial Exterminator came out same-day and confirmed active subterranean termites. The tech explained that being close to the water table in Howard Beach drives higher-than-average termite pressure in commercial buildings. Plan: trench-and-treat the soil along the foundation with liquid termiticide, direct treatment of the affected wall, install perimeter bait monitoring stations. He was honest about structural damage he observed and recommended a contractor evaluation for the affected joist. Treatment in a single day. Three months in: zero termite activity. Quarterly monitoring stations continue. Any commercial property owner in Queens should have annual termite inspections done.",
    date: "2025-10-12",
    propertyType: "Commercial building — Howard Beach",
  },
  {
    id: 16,
    name: "Stephanie Martinez",
    neighborhood: "Flatbush",
    borough: "Brooklyn",
    service: "General Pest Control",
    serviceSlug: "general-pest-control",
    rating: 5,
    text: "After opening our new salon in Flatbush we found droppings in the supply closet, signs of mice in the back, and silverfish in the bathroom. Rather than deal with three separate vendors, I called NYC Commercial Exterminator for a full commercial pest treatment. Their tech handled everything in a single comprehensive visit: gel bait for cockroaches, mouse exclusion with monitoring stations, residual treatment for silverfish. Follow-up two weeks later: dramatic improvement across the board. One knowledgeable commercial exterminator handling everything at once just makes sense for a small business. Great service for any salon, retail shop, or office in Brooklyn dealing with multiple pest issues.",
    date: "2025-09-18",
    propertyType: "Salon — Flatbush",
  },
  {
    id: 17,
    name: "Mark Johnson",
    neighborhood: "Midtown",
    borough: "Manhattan",
    service: "Commercial Pest Control",
    serviceSlug: "commercial-pest-control",
    rating: 5,
    text: "We operate a six-location restaurant group across Midtown and downtown Manhattan. Consolidating pest control onto NYC Commercial Exterminator across all six locations was the best vendor decision we've made in two years. They handle weekly visits at the highest-volume locations, monthly at the others, all at the same $249/hr fully inclusive rate. Every visit produces an inspection-ready report. They flag conducive conditions our internal team can fix before they become DOH issues. Across six locations, our inspection scores have improved measurably and we've eliminated the scramble for emergency calls. Single point of contact for all six. Best commercial pest vendor in NYC.",
    date: "2026-02-14",
    propertyType: "Multi-location restaurant group — Midtown",
  },
  {
    id: 18,
    name: "Nancy White",
    neighborhood: "Inwood",
    borough: "Manhattan",
    service: "Commercial Pest Control",
    serviceSlug: "commercial-pest-control",
    rating: 5,
    text: "I manage a small mixed-use building in Inwood — sixteen units plus a ground-floor laundromat and a deli — and maintaining pest control across all of it was always a hassle. We brought NYC Commercial Exterminator on as building-wide pest control about a year ago and the improvement has been dramatic. Monthly visits cover common areas, basement, compactor room, and any tenant units that reported issues, plus the two commercial tenants on the ground floor. Detailed log every visit. Tracking trends. Demonstrating compliance during HPD inspections. Pest complaints dropped to nearly zero. Our commercial tenants are happy, HPD record is spotless. Any property manager looking for reliable, building-wide commercial pest control — this is the answer.",
    date: "2025-12-12",
    propertyType: "Mixed-use building — Inwood",
  },
  {
    id: 19,
    name: "Brian Murphy",
    neighborhood: "Murray Hill",
    borough: "Manhattan",
    service: "Wasp Removal",
    serviceSlug: "wasp-removal",
    rating: 5,
    text: "A wasp nest formed under the awning at our Murray Hill restaurant entrance right at the height of patio dining season. Customers walking into the host stand were getting buzzed. NYC Commercial Exterminator was on site within two hours of our call. The tech assessed (yellow jacket nest the size of a softball), removed it safely after our closing time so no customers were present, and applied residual product around the awning to deter return. He came back the next day to confirm zero activity and to provide a written report. Patio service was back to normal the next night. This is exactly the response time and discretion a restaurant operator needs during service season.",
    date: "2025-08-05",
    propertyType: "Restaurant — Murray Hill",
  },
  {
    id: 20,
    name: "Susan Kim",
    neighborhood: "Chelsea",
    borough: "Manhattan",
    service: "Bed Bug Treatment",
    serviceSlug: "bed-bug-treatment",
    rating: 5,
    text: "I run a gym in Chelsea and got a bed bug introduction in the locker room — a member had unknowingly brought one in. Worst nightmare for a gym. NYC Commercial Exterminator was on site within hours, did a K-9 inspection across both locker rooms and the studio rooms, confirmed activity limited to the originating locker bank. Targeted heat treatment overnight when we were closed, follow-up two weeks later was clean. Provided documentation we shared transparently with members so they knew we'd taken it seriously. Zero membership impact. Professional, fast, discreet — exactly what a hospitality-style business needs from a commercial exterminator.",
    date: "2026-01-29",
    propertyType: "Gym — Chelsea",
  },
  {
    id: 21,
    name: "Anthony Russo",
    neighborhood: "Sheepshead Bay",
    borough: "Brooklyn",
    service: "Rat Extermination",
    serviceSlug: "rat-extermination",
    rating: 5,
    text: "We run a seafood restaurant in Sheepshead Bay and proximity to the water plus the dumpster behind us created a heavy rat problem in our back alley. Customers were starting to notice on their way to the patio entrance. NYC Commercial Exterminator's tech understood the unique pressure on waterfront restaurants. The plan: exterior bait stations, burrow treatment in the alley, exclusion at the dumpster pad including a new door sweep and mesh on the wall vents, plus weekly monitoring during peak season. Within two weeks the back alley was clean. Their tech is genuinely knowledgeable about rat behavior near coastal commercial properties. Highly recommend for any waterfront restaurant or food business.",
    date: "2025-07-18",
    propertyType: "Seafood restaurant — Sheepshead Bay",
  },
  {
    id: 22,
    name: "Michelle Hernandez",
    neighborhood: "Riverdale",
    borough: "Bronx",
    service: "Carpenter Ant Control",
    serviceSlug: "carpenter-ant-control",
    rating: 5,
    text: "Carpenter ants in the wood beams of our Riverdale daycare facility. As a daycare we needed the safest possible treatment given the kid-on-premises sensitivity. NYC Commercial Exterminator was the only commercial pest company I called that led with the safety question — they recommended a non-repellent targeted bait protocol that completely avoids broadcast spraying, and scheduled treatment for a weekend when no children were on site. They walked me through every product they used (with EPA-reg numbers for our state inspector), provided MSDS sheets, and detailed re-entry guidance. Two follow-ups confirmed elimination. Safest, most professional commercial pest control I've ever used. Specifically the right vendor for sensitive-population commercial properties like daycare, healthcare, and schools.",
    date: "2025-09-08",
    propertyType: "Daycare — Riverdale",
  },
  {
    id: 23,
    name: "Frank Russo",
    neighborhood: "Bushwick",
    borough: "Brooklyn",
    service: "Drain Fly Treatment",
    serviceSlug: "drain-fly-treatment",
    rating: 5,
    text: "Drain flies were taking over the bathrooms and floor drains at our Bushwick brewery. Customers were noticing and a few were leaving reviews mentioning the flies. NYC Commercial Exterminator's tech immediately diagnosed bacterial drain biofilm buildup as the breeding source — not just bad luck. He treated every drain with a bio-enzyme product designed to break down the biofilm, recommended a maintenance protocol my team could run weekly, and scheduled a two-week follow-up. The flies were gone within ten days. We've kept up the bio-enzyme maintenance and haven't seen another fly. This is the kind of commercial pest expertise small operators usually can't find.",
    date: "2026-02-01",
    propertyType: "Brewery — Bushwick",
  },
  {
    id: 24,
    name: "Linda Park",
    neighborhood: "Forest Hills",
    borough: "Queens",
    service: "Restaurant Pest Control",
    serviceSlug: "restaurant-pest-control",
    rating: 5,
    text: "Our Forest Hills restaurant was facing a DOH re-inspection after a B grade and we had 14 days to fix everything. NYC Commercial Exterminator came in within 48 hours, did a comprehensive walkthrough, identified every conducive condition the inspector had flagged plus a few they missed, treated for the active cockroach pressure, sealed harborage, and gave us a remediation checklist for the kitchen team. They came back twice during the 14-day window to confirm zero activity. Re-inspection: A grade. Their documentation was the cornerstone of our remediation file. This vendor saved our grade letter. Every NYC restaurant operator needs this team on retainer.",
    date: "2025-11-22",
    propertyType: "Restaurant — Forest Hills",
  },
  {
    id: 25,
    name: "Steven Wright",
    neighborhood: "Astoria",
    borough: "Queens",
    service: "Pigeon Control",
    serviceSlug: "pigeon-control",
    rating: 5,
    text: "Pigeons were nesting on the rooftop HVAC and parapet of our Astoria warehouse — droppings everywhere, our delivery trucks were getting hit, and the smell was getting into the loading dock. NYC Commercial Exterminator did a rooftop assessment and installed bird netting under the HVAC equipment, anti-roosting spikes on the parapet ledges where pigeons preferred to land, and gel deterrent in a few protected spots. They also did a one-time deep clean of the dropping accumulation. Pigeons relocated within three weeks and haven't returned. Annual maintenance check included. Real commercial bird exclusion work — not just chasing the birds away temporarily.",
    date: "2025-08-30",
    propertyType: "Warehouse — Astoria",
  },
  {
    id: 26,
    name: "Heather Kim",
    neighborhood: "Brighton Beach",
    borough: "Brooklyn",
    service: "Bed Bug Treatment",
    serviceSlug: "bed-bug-treatment",
    rating: 5,
    text: "We run a small assisted living facility in Brighton Beach and discovered bed bugs in one resident's room after a family visit. Sensitive situation with elderly residents and we needed it handled with care and absolute discretion. NYC Commercial Exterminator's tech was compassionate, patient, and explained everything in simple terms. He did K-9 inspection across adjacent rooms (clean), targeted treatment of the affected room and a precautionary treatment of the adjacent storage closet. Two treatments, two follow-ups, full elimination. Our state inspector noted the documentation as exemplary. The compassion and professionalism this team showed our residents was exceptional — exactly the right vendor for healthcare and senior living commercial properties.",
    date: "2025-10-25",
    propertyType: "Assisted living — Brighton Beach",
  },
  {
    id: 27,
    name: "Daniel Chen",
    neighborhood: "Sunset Park",
    borough: "Brooklyn",
    service: "General Pest Control",
    serviceSlug: "general-pest-control",
    rating: 5,
    text: "We run a small food manufacturing operation in Sunset Park — a commissary kitchen producing wholesale baked goods. We needed AIB-audit-ready pest control for our wholesale clients. NYC Commercial Exterminator built us a comprehensive IPM program: weekly exterior bait monitoring, monthly interior inspection, quarterly deep treatment, all documented to AIB standards. Our last AIB audit scored higher on the pest control section than we've ever scored. The documentation alone justifies the cost — but the pest control results are equally strong. This is the commercial pest vendor that small food manufacturers in NYC have been looking for.",
    date: "2026-01-05",
    propertyType: "Food manufacturer — Sunset Park",
  },
  {
    id: 28,
    name: "Rebecca Goldberg",
    neighborhood: "Upper West Side",
    borough: "Manhattan",
    service: "Mouse Extermination",
    serviceSlug: "mouse-extermination",
    rating: 4,
    text: "Mice in our Upper West Side medical practice. Even nice Manhattan commercial spaces get pest issues. NYC Commercial Exterminator was discreet and professional — they understood we needed treatment that wouldn't impact patient comfort or any sensitive medical equipment. Their tech identified entry points around old radiator pipes and a gap in the building service door. He sealed everything, set up monitoring stations, and the mice were gone within a week. Four stars not five only because our initial appointment had to be pushed back by a day. Actual work was flawless. This commercial pest control company understands how to work in healthcare environments. Recommend without hesitation.",
    date: "2025-12-29",
    propertyType: "Medical practice — Upper West Side",
  },
  {
    id: 29,
    name: "Michael Sullivan",
    neighborhood: "St. George",
    borough: "Staten Island",
    service: "Raccoon Removal",
    serviceSlug: "raccoon-removal",
    rating: 5,
    text: "Raccoons broke into the attic of our Staten Island commercial building (we lease the ground floor as a community space and storage above). Heard scratching, found a damaged section of roof flashing. NYC Commercial Exterminator's wildlife operator (DEC licensed for nuisance wildlife) inspected the attic, set humane one-way exclusion doors so the family could exit but not return, then sealed the entry point properly with metal flashing. Came back to remove the exclusion door after confirming the attic was clear. Annual inspection scheduled. Professional, humane, and the documentation is squared away. The right approach for commercial buildings with wildlife issues.",
    date: "2025-08-15",
    propertyType: "Commercial building — Staten Island",
  },
  {
    id: 30,
    name: "Jessica Wong",
    neighborhood: "Hoboken",
    borough: "New Jersey",
    service: "Cockroach Extermination",
    serviceSlug: "cockroach-extermination",
    rating: 5,
    text: "I own a small bakery in Hoboken and we had recurring cockroach activity in the back near the dish station and mixer area. Three pest companies had treated it over a year and none of them solved it. NYC Commercial Exterminator's tech ran a targeted IGR + gel bait protocol along with crack-and-crevice work where every previous vendor had missed harborage behind the mixer base. Six weeks later: zero cockroach activity. Three months later: still zero. Whatever the other companies had been doing was clearly not enough. This commercial exterminator team actually solves the problem. Five stars for Hoboken food service.",
    date: "2025-09-20",
    propertyType: "Bakery — Hoboken NJ",
  },
  {
    id: 31,
    name: "Eric Martinez",
    neighborhood: "Garden City",
    borough: "Long Island",
    service: "Commercial Pest Control",
    serviceSlug: "commercial-pest-control",
    rating: 5,
    text: "We manage a small retail center in Garden City with seven tenants including two restaurants, a hair salon, a small grocer, and three retail shops. NYC Commercial Exterminator runs a monthly commercial IPM program across the entire center plus the common areas, dumpster pad, and exterior. Single monthly invoice for the property manager. Individual reports for each tenant. Cleanest pest control documentation we've ever maintained, and pest complaints across the center are essentially zero. For commercial retail center management, this is the right vendor.",
    date: "2025-11-15",
    propertyType: "Retail center — Garden City LI",
  },
  {
    id: 32,
    name: "Amanda Sterling",
    neighborhood: "SoHo",
    borough: "Manhattan",
    service: "General Pest Control",
    serviceSlug: "general-pest-control",
    rating: 5,
    text: "I own a retail boutique in SoHo and needed pest control service after finding evidence of mice in the stockroom and a few cockroaches in the break room. NYC Commercial Exterminator handled it with the discretion a SoHo street-level retail business needs. Their tech arrived early before we opened, was neat and professional, completed treatment without leaving any visible signs of pest control work. He sealed entry points for the mice, applied targeted gel bait for the cockroaches, set up discreet monitoring stations. Monthly maintenance visits are scheduled for early mornings. Three months in: stockroom completely pest-free, zero issues. If you run a shop or office in Manhattan and need an exterminator who understands the importance of discretion and minimal disruption, this is the team.",
    date: "2026-02-17",
    propertyType: "Retail boutique — SoHo",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </span>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-white">{review.name}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {review.neighborhood}, {review.borough} &mdash;{" "}
            <span className="text-zinc-500">{review.propertyType}</span>
          </p>
        </div>
        <StarRating rating={review.rating} />
      </div>
      <p className="mt-2 text-sm text-green-400">
        <Link
          href={`/${review.serviceSlug}`}
          className="hover:text-green-300"
        >
          {review.service}
        </Link>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-300">
        {review.text}
      </p>
      <p className="mt-3 text-xs text-zinc-500">{review.date}</p>
    </div>
  );
}

const serviceGroups = [
  {
    label: "Cockroach Extermination Reviews",
    slug: "cockroach-extermination",
    service: "Cockroach Extermination",
  },
  {
    label: "Bed Bug Treatment Reviews",
    slug: "bed-bug-treatment",
    service: "Bed Bug Treatment",
  },
  {
    label: "Rat Extermination Reviews",
    slug: "rat-extermination",
    service: "Rat Extermination",
  },
  {
    label: "Mouse Extermination Reviews",
    slug: "mouse-extermination",
    service: "Mouse Extermination",
  },
  {
    label: "Termite Treatment Reviews",
    slug: "termite-treatment",
    service: "Termite Treatment",
  },
  {
    label: "General Pest Control Reviews",
    slug: "general-pest-control",
    service: "General Pest Control",
  },
];

const boroughs = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

export default function ReviewsPage() {
  const services = getAllServices();

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Reviews", url: "/reviews" },
  ]);

  // Note: previously emitted an aggregateRatingSchema with inline Review[] under
  // PestControlService. Google rejected it ("Invalid object type for field
  // <parent_node>") because (1) Review snippets nested inside a LocalBusiness
  // subtype aren't valid for rich results, and (2) self-serving reviews
  // (business publishing reviews about itself) have been disallowed since
  // 2019. Removed entirely. Reviews stay as visible page content for SEO and
  // user trust signal; aggregateRating belongs on Google Business Profile,
  // not in our own JSON-LD.

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      {/* ── Hero Section ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-zinc-500">
            <Link href="/" className="hover:text-zinc-300">
              Home
            </Link>{" "}
            / <span className="text-zinc-300">Reviews</span>
          </nav>

          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
              Customer Reviews &amp; Testimonials
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              What NYC Says About Our{" "}
              <span className="text-green-400">Pest Control</span> &amp;{" "}
              <span className="text-green-400">Exterminator</span> Services
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              With a 4.9 out of 5 average rating and over 2,847 verified
              reviews, {SITE_NAME} is the highest-rated{" "}
              <Link
                href="/services"
                className="text-green-400 hover:text-green-300"
              >
                pest control and exterminator service
              </Link>{" "}
              in New York City. Our licensed exterminators deliver consistent,
              reliable pest control results across{" "}
              <Link
                href="/areas"
                className="text-green-400 hover:text-green-300"
              >
                all five boroughs and the surrounding metro area
              </Link>
              . Read real reviews from operators, renters, property managers,
              and business owners who have trusted us with their{" "}
              <Link
                href="/cockroach-extermination"
                className="text-green-400 hover:text-green-300"
              >
                cockroach extermination
              </Link>
              ,{" "}
              <Link
                href="/bed-bug-treatment"
                className="text-green-400 hover:text-green-300"
              >
                bed bug treatment
              </Link>
              ,{" "}
              <Link
                href="/rat-extermination"
                className="text-green-400 hover:text-green-300"
              >
                rat extermination
              </Link>
              ,{" "}
              <Link
                href="/mouse-extermination"
                className="text-green-400 hover:text-green-300"
              >
                mouse extermination
              </Link>
              ,{" "}
              <Link
                href="/termite-treatment"
                className="text-green-400 hover:text-green-300"
              >
                termite treatment
              </Link>
              , and{" "}
              <Link
                href="/general-pest-control"
                className="text-green-400 hover:text-green-300"
              >
                general pest control
              </Link>{" "}
              needs.
            </p>

            {/* Aggregate Stats */}
            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 text-center">
                <p className="text-3xl font-extrabold text-green-500">4.9/5</p>
                <p className="mt-1 text-sm text-zinc-400">Average Rating</p>
                <p className="mt-1 text-yellow-400">★★★★★</p>
              </div>
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 text-center">
                <p className="text-3xl font-extrabold text-green-500">
                  2,847+
                </p>
                <p className="mt-1 text-sm text-zinc-400">Verified Reviews</p>
              </div>
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 text-center">
                <p className="text-3xl font-extrabold text-green-500">98%</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Customer Satisfaction
                </p>
              </div>
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 text-center">
                <p className="text-3xl font-extrabold text-green-500">94%</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Would Recommend Us
                </p>
              </div>
            </div>

            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* ── Featured Reviews ── */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Featured <span className="text-green-500">Pest Control</span>{" "}
            Reviews
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            These are some of our most detailed customer testimonials. Every
            review below comes from a real New Yorker who hired our{" "}
            <Link
              href="/services"
              className="text-green-400 hover:text-green-300"
            >
              licensed pest control and exterminator services
            </Link>{" "}
            to solve a real pest problem. We are proud of the work our
            exterminators do every day across NYC, and these reviews reflect the
            level of professionalism and results our customers have come to
            expect.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {reviews.slice(0, 6).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      </section>

      <CTAGroup variant="mid" />

      {/* ── Reviews by Service ── */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Exterminator Reviews{" "}
            <span className="text-green-500">by Service</span>
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Our customers hire us for a wide range of pest control services.
            Below you will find reviews organized by the specific exterminator
            service our customers received. Whether you need{" "}
            <Link
              href="/cockroach-extermination"
              className="text-green-400 hover:text-green-300"
            >
              cockroach extermination
            </Link>
            ,{" "}
            <Link
              href="/bed-bug-treatment"
              className="text-green-400 hover:text-green-300"
            >
              bed bug treatment
            </Link>
            ,{" "}
            <Link
              href="/rat-extermination"
              className="text-green-400 hover:text-green-300"
            >
              rat control
            </Link>
            ,{" "}
            <Link
              href="/mouse-extermination"
              className="text-green-400 hover:text-green-300"
            >
              mouse removal
            </Link>
            ,{" "}
            <Link
              href="/termite-treatment"
              className="text-green-400 hover:text-green-300"
            >
              termite treatment
            </Link>
            , or{" "}
            <Link
              href="/general-pest-control"
              className="text-green-400 hover:text-green-300"
            >
              general pest management
            </Link>
            , you can read what real customers have to say about the quality of
            our exterminator work in each category.
          </p>

          {serviceGroups.map((group) => {
            const groupReviews = reviews.filter(
              (r) => r.serviceSlug === group.slug
            );
            if (groupReviews.length === 0) return null;
            return (
              <div key={group.slug} className="mt-14">
                <h3 className="text-2xl font-bold text-white">
                  <Link
                    href={`/${group.slug}`}
                    className="text-green-400 hover:text-green-300"
                  >
                    {group.label}
                  </Link>
                </h3>
                <p className="mt-2 text-zinc-400">
                  Read what NYC residents and businesses say about our{" "}
                  {group.service.toLowerCase()} services. Our licensed
                  exterminators have earned top ratings for{" "}
                  {group.service.toLowerCase()} across every borough. See our{" "}
                  <Link
                    href={`/${group.slug}`}
                    className="text-green-400 hover:text-green-300"
                  >
                    {group.service.toLowerCase()} service page
                  </Link>{" "}
                  for full details and{" "}
                  <Link
                    href="/pricing"
                    className="text-green-400 hover:text-green-300"
                  >
                    pricing information
                  </Link>
                  .
                </p>
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  {groupReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <CTAGroup variant="preFaq" />

      {/* ── Reviews by Borough ── */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Pest Control Reviews{" "}
            <span className="text-green-500">by Borough</span>
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Our exterminators serve every neighborhood in New York City. Browse
            reviews from customers in your borough to see how our pest control
            team handles the unique challenges of each area. From pre-war office
            buildings in Manhattan to standalone commercial buildings in Staten Island, our
            exterminators adapt their pest control approach to the specific
            conditions of your property and neighborhood. Visit our{" "}
            <Link
              href="/areas"
              className="text-green-400 hover:text-green-300"
            >
              service areas page
            </Link>{" "}
            for a complete list of neighborhoods we cover.
          </p>

          {boroughs.map((borough) => {
            const boroughReviews = reviews.filter(
              (r) => r.borough === borough
            );
            if (boroughReviews.length === 0) return null;
            return (
              <div key={borough} className="mt-14">
                <h3 className="text-2xl font-bold text-white">
                  {borough} Exterminator Reviews
                </h3>
                <p className="mt-2 text-zinc-400">
                  {borough} residents trust our licensed exterminators for
                  reliable pest control across the borough. From{" "}
                  {boroughReviews
                    .map((r) => r.neighborhood)
                    .slice(0, 3)
                    .join(", ")}{" "}
                  and beyond, our pest control technicians know the specific
                  pest challenges that {borough} properties face.
                </p>
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  {boroughReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <CTAGroup variant="mid" title="Join Thousands of Satisfied NYC Customers" subtitle="Get a free pest control inspection and see why 2,847+ customers rate us 4.9 out of 5 stars." />

      {/* ── Our Commitment to Customer Satisfaction ── */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Our Commitment to{" "}
              <span className="text-green-500">Customer Satisfaction</span>
            </h2>

            <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
              <p>
                At {SITE_NAME}, customer satisfaction is not just a marketing
                slogan. It is the foundation of every pest control treatment we
                perform and every interaction our exterminators have with the
                people of New York City. When you read our reviews, you will
                notice a pattern: customers consistently praise the thoroughness
                of our inspections, the knowledge of our pest control
                technicians, the effectiveness of our treatments, and the
                professionalism of our entire exterminator team. These are not
                accidents. They are the result of a deliberate commitment to
                excellence in every aspect of our pest control operations.
              </p>

              <p>
                Every exterminator on our team holds a valid NYS DEC Commercial
                Pesticide Applicator license, which requires passing rigorous
                examinations and completing ongoing continuing education. But
                licensing is just the starting point. Our pest control
                technicians undergo extensive internal training on the latest
                treatment methods, customer communication, property protection
                protocols, and the specific pest challenges that are unique to
                New York City properties. Whether they are treating a pre-war
                walkup in{" "}
                <Link
                  href="/areas"
                  className="text-green-400 hover:text-green-300"
                >
                  Washington Heights
                </Link>{" "}
                or a modern high-rise in{" "}
                <Link
                  href="/areas"
                  className="text-green-400 hover:text-green-300"
                >
                  Long Island City
                </Link>
                , our exterminators understand the building types, pest species,
                and treatment approaches that deliver the best results.
              </p>

              <p>
                We believe that effective pest control begins with a thorough
                inspection. That is why every one of our{" "}
                <Link
                  href="/services"
                  className="text-green-400 hover:text-green-300"
                >
                  pest control services
                </Link>{" "}
                starts with a comprehensive assessment of your property. Our
                exterminators do not just look at the area where you are seeing
                pests. They inspect the entire property to understand the full
                scope of the issue, identify entry points and conducive
                conditions, and develop a treatment plan that addresses root
                causes rather than just symptoms. This approach is why our
                customers consistently report long-lasting results from our pest
                control treatments, rather than the temporary relief they
                experienced with other exterminator services.
              </p>

              <p>
                Transparency is another core value that runs through every
                customer review. Our exterminators provide free inspections,
                written quotes before any work begins, and clear explanations of
                what treatment is being recommended and why. There are no hidden
                fees, no surprise charges, and no high-pressure upselling. If a
                simple treatment will solve your pest problem, that is what we
                will recommend. If a more comprehensive approach is needed, we
                will explain exactly why and give you all the information you
                need to make an informed decision. This honest, straightforward
                approach to pest control is reflected in the trust our customers
                express in their reviews.
              </p>

              <p>
                Our satisfaction guarantee backs up every treatment we perform.
                If pests return between scheduled{" "}
                <Link
                  href="/services"
                  className="text-green-400 hover:text-green-300"
                >
                  pest control treatments
                </Link>
                , we come back at no additional charge. This guarantee applies to
                all of our services, from{" "}
                <Link
                  href="/cockroach-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  cockroach extermination
                </Link>{" "}
                and{" "}
                <Link
                  href="/bed-bug-treatment"
                  className="text-green-400 hover:text-green-300"
                >
                  bed bug treatment
                </Link>{" "}
                to{" "}
                <Link
                  href="/rat-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  rat extermination
                </Link>{" "}
                and{" "}
                <Link
                  href="/mouse-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  mouse control
                </Link>
                . We stand behind our work because we are confident in the
                quality of our exterminator services and the training of our pest
                control team.
              </p>

              <p>
                Communication is something our reviewers highlight again and
                again. From the moment you call our office to the completion of
                your final follow-up visit, our team keeps you informed at every
                step. Our exterminators explain what they find during the
                inspection, what treatment they recommend, how to prepare for the
                treatment, what to expect during and after application, and what
                follow-up will be needed. We also provide written reports after
                every service visit, which are especially valuable for property
                managers and commercial clients who need documentation for
                compliance purposes. This level of communication is a hallmark of
                professional pest control, and it is something we take seriously
                with every single customer.
              </p>

              <p>
                We are also deeply committed to using safe, EPA-approved products
                and methods. Our pest control treatments use targeted
                applications that minimize exposure to non-target organisms,
                including your staff, customers, and the environment. Our
                exterminators are trained in Integrated Pest Management (IPM)
                principles, which prioritize non-chemical solutions like
                exclusion and sanitation recommendations alongside targeted
                chemical treatments. This balanced, science-based approach to
                pest control delivers better long-term results while keeping
                safety as a top priority.
              </p>

              <p>
                The reviews on this page represent just a fraction of the
                feedback we receive from our customers across New York City. We
                are grateful for every review, whether it is five stars or
                constructive feedback that helps us improve. We read every single
                review and use that feedback to continuously refine our pest
                control processes, exterminator training, and customer service
                protocols. Our 4.9 out of 5 average rating across 2,847+ reviews
                is something we work hard to maintain every single day.
              </p>

              <p>
                If you&apos;re dealing with a pest issue at your NYC restaurant, office,
                retail location, warehouse, hotel, healthcare facility, or any
                commercial property, we invite you to experience the level of
                pest control service that has earned us these reviews. Contact us
                for a{" "}
                <Link
                  href="/schedule-service"
                  className="text-green-400 hover:text-green-300"
                >
                  free quote
                </Link>
                , call us directly at{" "}
                <a
                  href={`tel:${PHONE.replace(/-/g, "")}`}
                  className="text-green-400 hover:text-green-300"
                >
                  {PHONE}
                </a>
                . Whether you need a{" "}
                <Link
                  href="/cockroach-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  cockroach exterminator
                </Link>
                , a{" "}
                <Link
                  href="/bed-bug-treatment"
                  className="text-green-400 hover:text-green-300"
                >
                  bed bug specialist
                </Link>
                ,{" "}
                <Link
                  href="/rat-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  rat control
                </Link>
                ,{" "}
                <Link
                  href="/mouse-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  mouse removal
                </Link>
                ,{" "}
                <Link
                  href="/termite-treatment"
                  className="text-green-400 hover:text-green-300"
                >
                  termite treatment
                </Link>
                , or{" "}
                <Link
                  href="/general-pest-control"
                  className="text-green-400 hover:text-green-300"
                >
                  general pest control
                </Link>
                , our licensed exterminators are ready to help. Visit our{" "}
                <Link
                  href="/pricing"
                  className="text-green-400 hover:text-green-300"
                >
                  pricing page
                </Link>{" "}
                to learn about our competitive rates, or check our{" "}
                <Link
                  href="/faq"
                  className="text-green-400 hover:text-green-300"
                >
                  FAQ page
                </Link>{" "}
                for answers to common pest control questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How We Earn 5-Star Reviews ── */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How We Earn{" "}
            <span className="text-green-500">5-Star Exterminator Reviews</span>
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Our 4.9-star average does not happen by accident. Every step of our
            pest control process is designed to deliver an exceptional customer
            experience from first contact to final follow-up. Here is exactly how
            our exterminators consistently earn the highest ratings from NYC
            operators and businesses.
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <p className="text-3xl font-extrabold text-green-500">01</p>
              <h3 className="mt-3 text-lg font-semibold text-white">
                Rapid Response &amp; Same-Day Scheduling
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                When you call our office or{" "}
                <Link
                  href="/schedule-service"
                  className="text-green-400 hover:text-green-300"
                >
                  submit a quote request
                </Link>
                , we respond quickly. Most customers speak with a live pest
                control specialist within minutes, not hours. We offer same-day
                appointments for urgent pest issues because we understand that
                when you discover a{" "}
                <Link
                  href="/cockroach-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  cockroach infestation
                </Link>{" "}
                or{" "}
                <Link
                  href="/bed-bug-treatment"
                  className="text-green-400 hover:text-green-300"
                >
                  bed bugs at your facility
                </Link>
                , every hour matters. Our exterminators are deployed across all
                five boroughs daily, enabling faster response times than most
                pest control companies in NYC.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <p className="text-3xl font-extrabold text-green-500">02</p>
              <h3 className="mt-3 text-lg font-semibold text-white">
                Comprehensive Free Inspections
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Our exterminator does not walk in, spray, and leave. Every pest
                control service begins with a thorough, free inspection of your
                entire property. We check entry points, identify pest species,
                assess the severity of the infestation, and look for conditions
                that contribute to pest problems. This detailed assessment is
                what allows us to recommend the most effective treatment plan for
                your specific situation, whether it involves{" "}
                <Link
                  href="/rat-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  rat removal
                </Link>
                ,{" "}
                <Link
                  href="/mouse-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  mouse exclusion
                </Link>
                , or{" "}
                <Link
                  href="/termite-treatment"
                  className="text-green-400 hover:text-green-300"
                >
                  termite protection
                </Link>
                .
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <p className="text-3xl font-extrabold text-green-500">03</p>
              <h3 className="mt-3 text-lg font-semibold text-white">
                Upfront Pricing &amp; Clear Communication
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Before any pest control treatment begins, you receive a written
                quote with no hidden fees. Our exterminators explain exactly what
                treatment will be performed, what products will be used, how long
                it will take, and what results to expect. Visit our{" "}
                <Link
                  href="/pricing"
                  className="text-green-400 hover:text-green-300"
                >
                  pricing page
                </Link>{" "}
                for general cost ranges, or{" "}
                <Link
                  href="/schedule-service"
                  className="text-green-400 hover:text-green-300"
                >
                  request a custom quote
                </Link>{" "}
                for your specific situation. Transparency builds trust, and trust
                is why our customers leave 5-star reviews.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <p className="text-3xl font-extrabold text-green-500">04</p>
              <h3 className="mt-3 text-lg font-semibold text-white">
                Licensed, Trained Pest Control Technicians
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Every exterminator on our team is licensed by the New York State
                Department of Environmental Conservation and insured for your
                protection. Beyond licensing, our pest control technicians
                complete ongoing training in the latest treatment methods,
                safety protocols, and customer service standards. When you hire
                us for{" "}
                <Link
                  href="/services"
                  className="text-green-400 hover:text-green-300"
                >
                  any pest control service
                </Link>
                , you are getting a true professional, not a part-timer with a
                spray can.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <p className="text-3xl font-extrabold text-green-500">05</p>
              <h3 className="mt-3 text-lg font-semibold text-white">
                Targeted, Effective Treatments
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                We do not believe in one-size-fits-all pest control. Our
                exterminators use targeted treatment methods matched to the
                specific pest species and infestation level at your property.
                Whether it is gel bait for{" "}
                <Link
                  href="/cockroach-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  cockroaches
                </Link>
                , heat or chemical treatment for{" "}
                <Link
                  href="/bed-bug-treatment"
                  className="text-green-400 hover:text-green-300"
                >
                  bed bugs
                </Link>
                , exclusion and bait stations for{" "}
                <Link
                  href="/rat-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  rats
                </Link>{" "}
                and{" "}
                <Link
                  href="/mouse-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  mice
                </Link>
                , or liquid barrier treatment for{" "}
                <Link
                  href="/termite-treatment"
                  className="text-green-400 hover:text-green-300"
                >
                  termites
                </Link>
                , every treatment is customized. Check our{" "}
                <Link
                  href="/faq"
                  className="text-green-400 hover:text-green-300"
                >
                  FAQ
                </Link>{" "}
                for more details on our treatment methods.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
              <p className="text-3xl font-extrabold text-green-500">06</p>
              <h3 className="mt-3 text-lg font-semibold text-white">
                Follow-Up &amp; Guaranteed Results
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Our pest control process does not end with the initial
                treatment. Every service includes scheduled follow-up visits to
                verify the treatment is working and catch any remaining activity.
                If pests return between treatments, we come back at no additional
                charge. This follow-through and accountability is what separates
                a great exterminator from an average one, and it is why our
                customers consistently rate us 5 stars. Learn more{" "}
                <Link
                  href="/about"
                  className="text-green-400 hover:text-green-300"
                >
                  about our company
                </Link>{" "}
                and our approach to pest control.
              </p>
            </div>
          </div>

          <div className="mt-14 max-w-4xl space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Our pest control process also includes something many
              exterminator companies overlook: education. As you can see in
              the reviews above, our customers frequently mention that our
              exterminators took time to explain the biology of the pest they
              were dealing with, the reasons behind the treatment approach, and
              the steps the customer could take to prevent future infestations.
              We believe that an educated customer is a satisfied customer, and
              that prevention-focused pest control is always more effective and
              more affordable than reactive treatment.
            </p>

            <p>
              This education-first approach extends to our{" "}
              <Link
                href="/faq"
                className="text-green-400 hover:text-green-300"
              >
                FAQ page
              </Link>
              , where we answer the most common questions about every type of
              pest control service we offer, and our individual{" "}
              <Link
                href="/services"
                className="text-green-400 hover:text-green-300"
              >
                service pages
              </Link>
              , which provide in-depth information about each pest type, our
              treatment methods, and what customers can expect during and after
              treatment. We want you to feel informed and confident in your
              choice of exterminator before we ever set foot in your property.
            </p>

            <p>
              For commercial customers, including restaurants, hotels, retail
              stores, offices, and property management companies, our pest
              control approach includes detailed documentation and reporting
              that supports compliance with NYC Department of Health
              regulations, HPD requirements, and industry-specific standards.
              Our exterminator team understands that for businesses, pest
              control is not just about comfort. It is about protecting your
              livelihood, your reputation, and your legal compliance. That is
              why our commercial customers are among our most enthusiastic
              reviewers.
            </p>

            <p>
              We serve{" "}
              <Link
                href="/areas"
                className="text-green-400 hover:text-green-300"
              >
                all five boroughs plus New Jersey, Long Island, and Westchester
              </Link>
              . No matter where your property is located, our pest control
              exterminators know the area, understand the local pest pressures,
              and have the experience to deliver results. From Manhattan
              office towers to Brooklyn retail storefronts, Queens warehouses to Bronx
              multi-tenant commercial buildings, and Staten Island standalone properties, our
              team has seen it all and treated it all. View our{" "}
              <Link
                href="/pricing"
                className="text-green-400 hover:text-green-300"
              >
                pricing page
              </Link>{" "}
              for transparent cost information, or{" "}
              <Link
                href="/schedule-service"
                className="text-green-400 hover:text-green-300"
              >
                request a free quote
              </Link>{" "}
              to get started with the pest control company that 2,847+
              customers have rated 4.9 out of 5 stars.
            </p>
          </div>
        </div>
      </section>

      {/* ── More Reviews ── */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            More <span className="text-green-500">Customer Testimonials</span>
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Every pest control job matters to us. Here are more reviews from
            customers across NYC who trusted our exterminators with their pest
            problems. Each review tells a story of a real New Yorker who got
            real results from professional pest control and exterminator
            services.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {reviews.slice(6).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Reviews Matter ── */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Why <span className="text-green-500">Reviews Matter</span> When
              Choosing a NYC Exterminator
            </h2>

            <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
              <p>
                Choosing a pest control company in New York City is not a
                decision to take lightly. With hundreds of exterminators
                operating across the five boroughs, the quality of service
                varies dramatically. Some pest control operators are unlicensed,
                use improper products, or provide ineffective treatments that
                waste your money and leave your pest problem unresolved. That is
                why reading verified customer reviews is one of the most
                important steps you can take before hiring an exterminator.
              </p>

              <p>
                Reviews from real customers give you insight into every aspect
                of a pest control company&apos;s service: their response time,
                the thoroughness of their inspections, the effectiveness of
                their treatments, their communication, their pricing
                transparency, and whether the results last. When you read the
                reviews on this page, you will see consistent themes that
                reflect our core values as an exterminator company: honesty,
                thoroughness, expertise, and results that last.
              </p>

              <p>
                We encourage every potential customer to compare our reviews
                with those of other pest control companies. Look for
                specificity and detail, since genuine reviews describe specific
                situations, neighborhoods, building types, and outcomes. Look
                for consistency, because a high average rating across thousands
                of reviews is more meaningful than a perfect score across a
                handful. And look for how the company handles the occasional
                less-than-perfect review, since our response to constructive
                feedback is always professional, accountable, and focused on
                making things right.
              </p>

              <p>
                At {SITE_NAME}, we have built our reputation one customer at a
                time, one pest control treatment at a time, one five-star
                review at a time. Our 4.9 average across 2,847+ reviews
                represents thousands of NYC commercial properties where our
                exterminators delivered on their promise of effective,
                professional pest control. We would be honored to earn your
                trust and your review as well.
              </p>

              <p>
                Ready to experience five-star pest control for yourself?{" "}
                <Link
                  href="/schedule-service"
                  className="text-green-400 hover:text-green-300"
                >
                  Request a free quote online
                </Link>
                , call us at{" "}
                <a
                  href={`tel:${PHONE.replace(/-/g, "")}`}
                  className="text-green-400 hover:text-green-300"
                >
                  {PHONE}
                </a>
                , or visit our{" "}
                <Link
                  href="/services"
                  className="text-green-400 hover:text-green-300"
                >
                  services page
                </Link>{" "}
                to learn more about our{" "}
                <Link
                  href="/cockroach-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  cockroach extermination
                </Link>
                ,{" "}
                <Link
                  href="/bed-bug-treatment"
                  className="text-green-400 hover:text-green-300"
                >
                  bed bug treatment
                </Link>
                ,{" "}
                <Link
                  href="/rat-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  rat removal
                </Link>
                ,{" "}
                <Link
                  href="/mouse-extermination"
                  className="text-green-400 hover:text-green-300"
                >
                  mouse control
                </Link>
                ,{" "}
                <Link
                  href="/termite-treatment"
                  className="text-green-400 hover:text-green-300"
                >
                  termite treatment
                </Link>
                , and{" "}
                <Link
                  href="/general-pest-control"
                  className="text-green-400 hover:text-green-300"
                >
                  general pest control
                </Link>{" "}
                capabilities. Browse our{" "}
                <Link
                  href="/areas"
                  className="text-green-400 hover:text-green-300"
                >
                  service areas
                </Link>{" "}
                to find coverage in your neighborhood, check our{" "}
                <Link
                  href="/pricing"
                  className="text-green-400 hover:text-green-300"
                >
                  pricing page
                </Link>{" "}
                for transparent cost information, read our{" "}
                <Link
                  href="/faq"
                  className="text-green-400 hover:text-green-300"
                >
                  frequently asked questions
                </Link>
                , or learn more{" "}
                <Link
                  href="/about"
                  className="text-green-400 hover:text-green-300"
                >
                  about our company
                </Link>{" "}
                and the team behind NYC&apos;s most trusted pest control and
                exterminator service.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CTAGroup variant="final" />
    </div>
  );
}
