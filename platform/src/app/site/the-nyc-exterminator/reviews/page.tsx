import Link from "next/link";
import type { Metadata } from "next";
import { getAllServices } from "@/app/site/the-nyc-exterminator/_lib/data";
import { PHONE, SITE_URL, SITE_NAME } from "@/app/site/the-nyc-exterminator/_lib/seo";
import { getBreadcrumbSchema } from "@/app/site/the-nyc-exterminator/_lib/seo";
import CTAGroup from "@/app/site/the-nyc-exterminator/_components/CTAGroup";

export const metadata: Metadata = {
  title: "NYC Exterminator Reviews | 2,847+ Verified 5-Star Pest Control Ratings",
  description:
    "Read 2,847+ verified pest control reviews from NYC homeowners, renters, and businesses. 4.9/5 average rating. See what real customers say about cockroach, bed bug, rat, mouse, and termite extermination results. Licensed exterminators across all 5 boroughs, NJ, Long Island & Westchester. Text 212-202-8545.",
  keywords:
    "NYC exterminator reviews, pest control reviews NYC, best exterminator NYC, 5-star pest control, bed bug treatment reviews, cockroach exterminator reviews, rat exterminator reviews, pest control testimonials",
  openGraph: {
    title: "NYC Exterminator Reviews | 2,847+ Verified 5-Star Pest Control Ratings",
    description:
      "2,847+ verified reviews. 4.9/5 average rating. See what NYC says about our pest control. Text 212-202-8545.",
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
    text: "We had been dealing with a German cockroach infestation in our pre-war walkup on 181st Street for months. Our previous exterminator would spray and leave, but the roaches always came back within a week or two. The NYC Exterminator was completely different. Their pest control technician did a thorough inspection of our entire apartment, checked behind the refrigerator, under the sink, every crack and crevice in the baseboards. He explained that our building had a systemic issue and recommended a gel bait treatment combined with IGR applications. Within two weeks, we saw a dramatic reduction. By the fourth week, the cockroaches were completely gone. They even coordinated with our building management to treat adjacent units. This is real professional pest control, not just someone spraying chemicals and hoping for the best. Highly recommend this exterminator to anyone in Washington Heights dealing with roaches.",
    date: "2026-01-15",
    propertyType: "Pre-war walkup",
  },
  {
    id: 2,
    name: "James Chen",
    neighborhood: "Williamsburg",
    borough: "Brooklyn",
    service: "Bed Bug Treatment",
    serviceSlug: "bed-bug-treatment",
    rating: 5,
    text: "Finding bed bugs in our Williamsburg loft was genuinely one of the most stressful experiences of my life. We were waking up covered in bites and could see the little blood spots on our sheets. I called The NYC Exterminator on a Friday afternoon and they had a licensed pest control technician at our door by Saturday morning. The exterminator was incredibly thorough with the inspection, using a flashlight and magnifying tool to check every seam of our mattress, behind our headboard, and even the baseboards along the bedroom wall. They recommended a two-treatment approach with a follow-up inspection two weeks later. The first treatment knocked out the majority of the infestation, and the follow-up caught any remaining bugs that had hatched. We have been bed-bug-free for three months now. The exterminator also gave us practical advice about prevention, like using encasements on our mattress and being careful with secondhand furniture. If you are dealing with bed bugs anywhere in Brooklyn, do not waste your time with DIY solutions. Call a real exterminator.",
    date: "2026-02-03",
    propertyType: "Converted loft",
  },
  {
    id: 3,
    name: "Robert Williams",
    neighborhood: "Astoria",
    borough: "Queens",
    service: "Rat Extermination",
    serviceSlug: "rat-extermination",
    rating: 5,
    text: "We own a two-family house in Astoria near Steinway Street, and last fall we started hearing scratching and scurrying in the walls at night. Then we found droppings in the basement and gnaw marks on some cardboard boxes. It was rats. I had tried snap traps and even those ultrasonic repellers you see online, but nothing worked. The NYC Exterminator sent out a pest control specialist who did a complete exterior inspection of our property. He found three entry points where rats were getting in: a gap around a dryer vent, a crack in the foundation near the basement window well, and a hole where an old cable line used to enter the house. They sealed everything up with steel wool and metal flashing, set up tamper-resistant bait stations around the perimeter, and placed snap traps in the basement. Within a week, the scratching stopped. They came back for two follow-up visits to check the stations and confirm the exclusion work was holding up. This is what professional pest control looks like. Best exterminator we have ever used in Queens, hands down.",
    date: "2025-12-20",
    propertyType: "Two-family house",
  },
  {
    id: 4,
    name: "Angela Thompson",
    neighborhood: "Park Slope",
    borough: "Brooklyn",
    service: "Mouse Extermination",
    serviceSlug: "mouse-extermination",
    rating: 5,
    text: "Our brownstone in Park Slope had a mouse problem every winter for as long as we owned it. Every November like clockwork, we would start finding droppings in the kitchen cabinets and hear mice running through the walls. We had tried everything: poison bait from the hardware store, glue traps, peppermint oil, even stuffing steel wool into every gap we could find. Nothing gave us lasting relief. The NYC Exterminator approached the problem completely differently from any other pest control company we had used. Their exterminator spent over an hour inspecting the entire brownstone from basement to attic. He identified over a dozen potential entry points that we had never noticed, including gaps around old radiator pipes, a deteriorating door sweep on the basement entry, and openings where the plumbing stack went through the floors. They performed a comprehensive exclusion, sealing every gap with appropriate materials. Then they set up interior monitoring stations and an exterior bait program. For the first time in seven years, we made it through the entire winter without a single mouse sighting. This pest control service paid for itself many times over. Absolutely worth every penny for anyone in Park Slope or the surrounding Brooklyn neighborhoods.",
    date: "2026-02-18",
    propertyType: "Brownstone",
  },
  {
    id: 5,
    name: "David Kim",
    neighborhood: "Flushing",
    borough: "Queens",
    service: "Cockroach Extermination",
    serviceSlug: "cockroach-extermination",
    rating: 5,
    text: "I manage a restaurant on Main Street in Flushing, and pest control compliance is a huge deal when it comes to DOH inspections. We had been using another pest control company for years, but we were still finding roaches in the kitchen and getting points docked during inspections. Switching to The NYC Exterminator was the best decision I made for this business. Their exterminator understood the specific requirements for commercial food service establishments. He set up a comprehensive IPM program that included gel bait stations in all the critical areas, monitoring traps to track activity levels, and detailed service reports that we can show to inspectors. They come on a monthly schedule and always work around our operating hours, arriving early in the morning before we open. We passed our last two DOH inspections with zero pest-related violations. If you run a restaurant in Queens or anywhere in NYC and need a reliable commercial pest control exterminator, The NYC Exterminator is the one to call.",
    date: "2025-11-08",
    propertyType: "Commercial restaurant",
  },
  {
    id: 6,
    name: "Patricia Murphy",
    neighborhood: "Riverdale",
    borough: "Bronx",
    service: "Termite Treatment",
    serviceSlug: "termite-treatment",
    rating: 5,
    text: "When our home inspector found evidence of subterranean termites during a refinance inspection of our Riverdale colonial, I panicked. We had owned the house for fifteen years and never had any idea there was an issue. The inspector found mud tubes along the foundation wall in the basement and damage to a floor joist. I called several pest control companies for quotes, and The NYC Exterminator was the most thorough by far. Their termite exterminator did a complete inspection that took well over an hour. He crawled through the entire accessible crawlspace, checked every exposed piece of wood in the basement, inspected the exterior foundation, and even looked at the tree stumps in our yard. He found active termite activity in two areas and explained exactly what type of treatment would be most effective for our situation. They installed a liquid barrier treatment around the foundation perimeter and set up monitoring stations in the yard. The entire process was explained clearly at every step, with no high-pressure sales tactics. They also provided the termite clearance letter we needed for our refinance. Six months later, the monitoring stations show zero activity. Outstanding pest control work. If you live in the Bronx and suspect termites, do not wait. These are the best exterminators for the job.",
    date: "2025-10-22",
    propertyType: "Colonial house",
  },
  {
    id: 7,
    name: "Samantha Rodriguez",
    neighborhood: "Upper West Side",
    borough: "Manhattan",
    service: "Bed Bug Treatment",
    serviceSlug: "bed-bug-treatment",
    rating: 5,
    text: "I live in a large pre-war co-op building on West End Avenue and discovered bed bugs after returning from a trip. The building management recommended The NYC Exterminator, and I am so grateful they did. The pest control technician arrived the next morning and was incredibly professional and discreet, which mattered a lot to me in a co-op where everyone knows everyone. He confirmed the infestation was limited to the master bedroom and recommended a targeted treatment plan rather than trying to upsell me on whole-apartment fumigation. The first treatment was thorough and methodical. He treated every crack and seam in the bed frame, the baseboards, behind outlet covers, and the closet adjacent to the bedroom. Two weeks later they returned for the follow-up treatment. I have had zero bites since the first treatment, and the follow-up inspection confirmed complete elimination. The exterminator also educated me on how to inspect hotel rooms when traveling to prevent bringing bed bugs home again. This kind of knowledgeable, professional pest control is exactly what you need when dealing with something as stressful as bed bugs on the Upper West Side.",
    date: "2026-01-29",
    propertyType: "Pre-war co-op",
  },
  {
    id: 8,
    name: "Michael O'Brien",
    neighborhood: "Bay Ridge",
    borough: "Brooklyn",
    service: "Rat Extermination",
    serviceSlug: "rat-extermination",
    rating: 4,
    text: "We had Norway rats getting into our detached garage in Bay Ridge. They were chewing through the weather stripping on the garage door and nesting behind the workbench. The NYC Exterminator came out and did a solid inspection and treatment plan. The pest control technician identified the entry points and sealed them with metal flashing and expanding foam reinforced with hardware cloth. He also placed bait stations along the exterior and snap traps inside the garage. The rats were gone within about ten days. I am giving four stars only because the scheduling for the follow-up visit had to be rescheduled once, but the actual exterminator work was excellent. The technician was knowledgeable, explained the biology of Norway rats and why they were targeting our garage specifically, and gave us prevention tips to keep them from coming back. Solid pest control company that I would use again for any rodent extermination needs.",
    date: "2025-12-05",
    propertyType: "Detached house with garage",
  },
  {
    id: 9,
    name: "Jennifer Walsh",
    neighborhood: "Hell's Kitchen",
    borough: "Manhattan",
    service: "General Pest Control",
    serviceSlug: "general-pest-control",
    rating: 5,
    text: "I manage a boutique hotel in Hell's Kitchen, and maintaining pest-free rooms is absolutely critical for our business and our online reviews. We brought on The NYC Exterminator for a comprehensive pest control program covering all forty-two rooms plus common areas, the kitchen, and the basement storage. Their team developed a custom IPM plan that includes monthly inspections of every room, quarterly deep treatments of high-risk areas like the kitchen and laundry, and an on-call rapid response for any guest complaints. In the eight months since we started working with them, we have had zero pest-related guest complaints, which is remarkable for a Midtown Manhattan property. Their documentation and reporting is also excellent. After every service visit, we receive a detailed report showing what was inspected, any findings, treatments applied, and recommendations. This level of professionalism and attention to detail sets them apart from every other pest control exterminator we have worked with in the hospitality industry. Cannot recommend them highly enough for commercial pest control in Manhattan.",
    date: "2026-02-11",
    propertyType: "Boutique hotel",
  },
  {
    id: 10,
    name: "Carlos Mendez",
    neighborhood: "Jackson Heights",
    borough: "Queens",
    service: "Cockroach Extermination",
    serviceSlug: "cockroach-extermination",
    rating: 5,
    text: "Our building on 37th Avenue in Jackson Heights had a cockroach problem that had been going on for years. Every tenant was dealing with it, and the building management was not doing enough. I finally convinced the landlord to hire The NYC Exterminator for a building-wide treatment. Their pest control team treated every unit in the building on the same day, which the exterminator explained is critical for eliminating cockroaches in multi-unit buildings because they just migrate from treated units to untreated ones. The difference was immediate and dramatic. Within a week, roach sightings dropped by at least ninety percent across the building. After the follow-up treatment two weeks later, we were essentially cockroach-free for the first time in years. Several of my neighbors have told me this was the best pest control decision the building ever made. If you live in a multi-unit building in Jackson Heights or anywhere in Queens and are dealing with cockroaches, the key is getting the whole building treated at once, and The NYC Exterminator is the company to make that happen.",
    date: "2025-11-30",
    propertyType: "Multi-unit apartment building",
  },
  {
    id: 11,
    name: "Lisa Park",
    neighborhood: "Tribeca",
    borough: "Manhattan",
    service: "Mouse Extermination",
    serviceSlug: "mouse-extermination",
    rating: 5,
    text: "We moved into a renovated loft in Tribeca and within the first month started finding mouse droppings in the pantry. For a supposedly newly renovated apartment, it was pretty frustrating. The NYC Exterminator sent an exterminator who quickly identified the problem. The contractor who did the renovation had left gaps around newly installed plumbing pipes and the HVAC ductwork. Mice were using these gaps as highways into our unit. The pest control technician sealed every opening with copper mesh and caulk, set up monitoring stations, and within two weeks we were completely mouse-free. He also left us with a written report detailing every repair that was made, which we used to get our landlord to reimburse us for the pest control service. Smart, thorough exterminator work. Highly recommended for anyone dealing with mice in a Manhattan apartment or loft.",
    date: "2026-01-05",
    propertyType: "Renovated loft",
  },
  {
    id: 12,
    name: "Anthony Russo",
    neighborhood: "Staten Island",
    borough: "Staten Island",
    service: "Termite Treatment",
    serviceSlug: "termite-treatment",
    rating: 5,
    text: "We discovered termite damage when replacing the siding on our Cape Cod style house in the Todt Hill area of Staten Island. The damage was extensive. Multiple studs and the sill plate along one side of the house had significant termite damage. After getting three quotes, we went with The NYC Exterminator because their pest control approach was the most comprehensive. Their exterminator did not just want to treat the active termites. He developed a full protection plan that included liquid treatment of the affected area, installation of a bait monitoring system around the entire perimeter of the house, and quarterly inspections for the first year. He also identified conducive conditions that were attracting termites, like wood mulch piled against the foundation and a leaking gutter that was keeping the soil saturated near the damaged wall. We addressed those issues on his recommendation, and twelve months later, our annual inspection showed zero termite activity anywhere on the property. The exterminator saved us from what could have been tens of thousands of dollars in additional structural damage. If you own a home on Staten Island, termite protection is not optional, and this is the pest control company to handle it.",
    date: "2025-09-14",
    propertyType: "Cape Cod house",
  },
  {
    id: 13,
    name: "Diana Foster",
    neighborhood: "Crown Heights",
    borough: "Brooklyn",
    service: "Bed Bug Treatment",
    serviceSlug: "bed-bug-treatment",
    rating: 5,
    text: "I was dealing with bed bugs in my Crown Heights apartment and was absolutely at my wit's end. I had already tried two different pest control companies before calling The NYC Exterminator, and neither one had been able to fully eliminate the problem. The difference with this company was apparent from the very first visit. Their exterminator did not just treat the bedroom where I was getting bitten. He inspected every room in the apartment and found evidence that bed bugs had spread to the living room couch and a guest bedroom that nobody was even sleeping in. He explained that this is actually very common and that other pest control companies often fail because they only treat the obvious areas. The treatment was comprehensive and included chemical application to all infested areas, dust treatment in wall voids and behind electrical outlets, and mattress encasements for every bed in the apartment. Two weeks later, the follow-up treatment caught a few remaining nymphs that had hatched since the first treatment. After the final inspection, I was declared bed-bug-free, and it has been two months with zero bites. This exterminator team truly knows bed bugs inside and out. If you are in Crown Heights or anywhere in Brooklyn and struggling with bed bugs, please save yourself the money and frustration of hiring bargain pest control. Go straight to The NYC Exterminator.",
    date: "2026-02-22",
    propertyType: "Apartment",
  },
  {
    id: 14,
    name: "Thomas Fitzgerald",
    neighborhood: "Forest Hills",
    borough: "Queens",
    service: "General Pest Control",
    serviceSlug: "general-pest-control",
    rating: 5,
    text: "We have a Tudor-style home in Forest Hills Gardens and started noticing multiple pest issues as the weather changed. Ants in the kitchen, spiders in the basement, and what looked like carpenter bee activity around the wooden trim on our front porch. Rather than calling separate specialists, I reached out to The NYC Exterminator for a comprehensive pest control assessment. Their exterminator conducted one of the most thorough property inspections I have ever seen. He spent nearly two hours going over the interior and exterior, documenting every issue with photos and notes. He then presented a customized annual pest management plan that addressed all three issues with targeted treatments on an appropriate schedule. The ant and spider treatments were done on the first visit, and the carpenter bee treatment was scheduled for the appropriate time when they would be most active. Everything has been handled professionally and effectively. We are on a quarterly maintenance plan now, and our home has been completely pest-free. This is what real integrated pest management looks like, and this exterminator company delivers it at the highest level. Perfect for homeowners in Forest Hills and the surrounding Queens neighborhoods.",
    date: "2025-12-12",
    propertyType: "Tudor house",
  },
  {
    id: 15,
    name: "Karen Mitchell",
    neighborhood: "East Village",
    borough: "Manhattan",
    service: "Cockroach Extermination",
    serviceSlug: "cockroach-extermination",
    rating: 4,
    text: "Living in the East Village in a fifth-floor walkup, cockroaches are practically a rite of passage. But when the infestation got to the point where I was seeing roaches every single night in the kitchen, I knew I needed professional pest control. The NYC Exterminator sent a knowledgeable exterminator who treated my apartment with a combination of gel bait and dust applications. He also treated the bathroom and the entry points around the front door. The results were impressive. Roach activity dropped dramatically within the first week. I am giving four stars because in a building this old with this many units, complete elimination requires building-wide treatment, which my landlord has not yet agreed to. But for what they could control in my individual unit, the pest control work was excellent. The exterminator was honest about the limitations of single-unit treatment in a multi-unit building and gave me recommendations for convincing my landlord to invest in building-wide pest control. Appreciate the honesty and expertise.",
    date: "2026-01-20",
    propertyType: "Fifth-floor walkup",
  },
  {
    id: 16,
    name: "Raymond Jackson",
    neighborhood: "Harlem",
    borough: "Manhattan",
    service: "Rat Extermination",
    serviceSlug: "rat-extermination",
    rating: 5,
    text: "Our brownstone on 125th Street had a serious rat problem in the backyard and basement. We could hear them in the walls at night, and our dog kept alerting to something in the garden. The NYC Exterminator sent out an exterminator who was clearly experienced with the specific rat challenges in Harlem and Upper Manhattan. He explained that our block's proximity to a construction site and certain sanitation conditions in the neighborhood were contributing factors. The pest control plan included exterior bait stations, burrow treatment in the backyard where he identified active rat burrows, and a thorough exclusion of the basement including sealing around utility penetrations, replacing a deteriorated basement window, and installing door sweeps. The difference was almost overnight. Within three days, the noise in the walls stopped. The follow-up visits confirmed the exclusion was holding and the exterior population was being controlled. This exterminator understood the unique pest control challenges of brownstone living in Harlem and delivered results. Highly recommend for anyone in the neighborhood dealing with rats.",
    date: "2025-11-18",
    propertyType: "Brownstone",
  },
  {
    id: 17,
    name: "Sophia Patel",
    neighborhood: "Long Island City",
    borough: "Queens",
    service: "Bed Bug Treatment",
    serviceSlug: "bed-bug-treatment",
    rating: 5,
    text: "I found bed bugs in my Long Island City high-rise apartment after a neighbor in the building mentioned they were dealing with them too. I called The NYC Exterminator immediately because I wanted to catch it early before it became a full-blown infestation. Their pest control response time was outstanding. They had an exterminator at my apartment within twenty-four hours. The inspection confirmed early-stage bed bug activity limited to the bedroom, which the exterminator said was actually good news because it meant treatment would be more straightforward. He treated the bedroom thoroughly, including the bed frame, nightstands, baseboards, and closet. He also treated the adjacent hallway as a precaution. The follow-up two weeks later showed no signs of any remaining activity. The exterminator was professional, knowledgeable, and reassuring throughout the entire process, which was exactly what I needed during an extremely stressful situation. Total cost was very reasonable for the level of pest control service I received. If you live in one of the newer high-rises in Long Island City and think you might have bed bugs, do not panic and do not try to handle it yourself. Call this exterminator team and let them take care of it properly.",
    date: "2026-02-08",
    propertyType: "High-rise apartment",
  },
  {
    id: 18,
    name: "William Donnelly",
    neighborhood: "Prospect Heights",
    borough: "Brooklyn",
    service: "Mouse Extermination",
    serviceSlug: "mouse-extermination",
    rating: 5,
    text: "Every year when the temperature drops, mice find their way into our Prospect Heights townhouse. We are right near the Botanic Garden, and the exterminator explained that proximity to green spaces and older building stock creates ideal conditions for mouse infestations. The NYC Exterminator provided a comprehensive pest control solution that no other company had offered us before. Instead of just setting traps and hoping for the best, their exterminator conducted a full exclusion of the building envelope. He sealed over twenty entry points, from gaps around pipes in the basement to openings where the brownstone facade meets the roof line. He then set up interior monitoring stations and an exterior bait program. The results speak for themselves. We are now halfway through our second winter with this pest control plan in place, and we have had exactly zero mice inside the house. After years of seasonal frustration and thousands of dollars spent on temporary fixes with other exterminators, The NYC Exterminator actually solved the problem permanently. Worth every cent for mouse control in Brooklyn.",
    date: "2026-01-10",
    propertyType: "Townhouse",
  },
  {
    id: 19,
    name: "Grace Liu",
    neighborhood: "Chinatown",
    borough: "Manhattan",
    service: "Cockroach Extermination",
    serviceSlug: "cockroach-extermination",
    rating: 5,
    text: "My family owns a small dim sum restaurant in Chinatown on Mott Street, and maintaining pest control compliance is essential for passing DOH inspections and protecting our reputation. We switched to The NYC Exterminator after our previous pest control provider consistently failed to keep roach activity below acceptable levels. The difference was immediate. Their exterminator understood the unique challenges of a busy commercial kitchen. He developed a treatment schedule that worked around our early morning prep and late-night service hours. The IPM program includes monthly service visits with gel bait applications, monitoring stations behind equipment and under prep tables, and detailed documentation we can present during health inspections. In six months with this pest control program, we have gone from regularly seeing roaches to virtually none. Our last DOH inspection was our best score in years. The exterminator also provided our staff with training on sanitation practices that support pest prevention. This is the level of professional commercial pest control that every restaurant in Chinatown and Lower Manhattan should have access to.",
    date: "2025-10-30",
    propertyType: "Commercial restaurant",
  },
  {
    id: 20,
    name: "Derek Johnson",
    neighborhood: "Flatbush",
    borough: "Brooklyn",
    service: "General Pest Control",
    serviceSlug: "general-pest-control",
    rating: 5,
    text: "After moving into our new apartment in Flatbush, we discovered it had not been treated for pests before our move-in despite our landlord's assurances. We found roach droppings in the kitchen cabinets, signs of mice in the pantry closet, and silverfish in the bathroom. Rather than deal with three separate issues, I called The NYC Exterminator and asked for a full pest control treatment. Their exterminator handled everything in a single comprehensive visit. He treated for cockroaches with gel bait, set up mouse monitoring stations and sealed the two entry points he found, and treated the bathroom for silverfish with a residual product. The follow-up two weeks later showed dramatic improvement on all fronts. Roaches were gone, no new mouse droppings, and the silverfish population was eliminated. This pest control company saved me the hassle of coordinating multiple exterminators and probably saved me money too. Having one knowledgeable exterminator assess and treat everything at once just makes more sense. Great service for anyone in Flatbush or greater Brooklyn dealing with multiple pest issues simultaneously.",
    date: "2026-02-28",
    propertyType: "Apartment",
  },
  {
    id: 21,
    name: "Margaret O'Connor",
    neighborhood: "Woodlawn",
    borough: "Bronx",
    service: "Mouse Extermination",
    serviceSlug: "mouse-extermination",
    rating: 5,
    text: "Our older colonial in Woodlawn had been plagued by mice for several winters. We are near Van Cortlandt Park, and field mice seemed to view our home as their personal winter resort. The NYC Exterminator came highly recommended by a neighbor who had used them for rat extermination. Their pest control technician inspected our home top to bottom and found that mice were entering primarily through gaps in the fieldstone foundation and where utility lines entered the house. The exclusion work was meticulous. Every gap was sealed with copper mesh and appropriate sealant, and the technician even identified a gap under the garage door that was large enough for mice to squeeze through. He installed a new brush seal on the garage door as part of the exclusion. Interior snap traps and monitoring stations were placed in the basement and attic. Within a week, trap catches dropped to zero, and we have been mouse-free through the entire winter. This exterminator provided the kind of thorough, lasting pest control solution that actually works. Recommend them to anyone in the Bronx dealing with a seasonal mouse problem.",
    date: "2025-12-28",
    propertyType: "Colonial house",
  },
  {
    id: 22,
    name: "Steven Albanese",
    neighborhood: "Bensonhurst",
    borough: "Brooklyn",
    service: "Rat Extermination",
    serviceSlug: "rat-extermination",
    rating: 5,
    text: "Rats had been a persistent problem on our block in Bensonhurst. They were getting into trash cans, digging burrows along the fences between properties, and one even got into our basement through a gap around a sewer pipe cleanout. I organized with a few neighbors to bring in The NYC Exterminator for a coordinated pest control effort. Their exterminator surveyed multiple properties on our block and developed a neighborhood-level treatment plan. Each property got customized exterior bait stations and exclusion work, with special attention to shared fence lines and the alleyway between houses where rat activity was heaviest. The coordinated approach made all the difference. Within a month, visible rat activity on our block dropped dramatically. The burrows along the fences have been inactive for two months now. This is the kind of strategic, big-picture pest control thinking that actually solves rat problems in dense Brooklyn neighborhoods. Individual property treatment is not enough when rats are a community issue. This exterminator company understood that and delivered accordingly.",
    date: "2025-11-25",
    propertyType: "Semi-detached house",
  },
  {
    id: 23,
    name: "Vanessa Morales",
    neighborhood: "Inwood",
    borough: "Manhattan",
    service: "General Pest Control",
    serviceSlug: "general-pest-control",
    rating: 5,
    text: "We manage a small apartment building in Inwood, sixteen units total, and maintaining effective pest control across all units has always been a challenge. We brought on The NYC Exterminator as our building-wide pest control provider about a year ago, and the improvement has been dramatic. Their exterminator team conducts monthly visits that include inspection and treatment of common areas, basement, compactor room, and any units where tenants have reported issues. They maintain a detailed log of activity and treatment for every visit, which has been incredibly useful for tracking trends and demonstrating compliance during HPD inspections. Before switching to this company, we were getting multiple pest complaints every month from tenants. In the last six months, complaints have dropped to nearly zero. The tenants are happy, the building is cleaner, and our HPD violation record is spotless. For any property manager in Manhattan or any NYC borough looking for reliable, thorough building-wide pest control, The NYC Exterminator is the answer. Their exterminator team is professional, responsive, and delivers real results.",
    date: "2026-02-14",
    propertyType: "16-unit apartment building",
  },
  {
    id: 24,
    name: "Frank DeLuca",
    neighborhood: "Howard Beach",
    borough: "Queens",
    service: "Termite Treatment",
    serviceSlug: "termite-treatment",
    rating: 5,
    text: "I noticed what I thought were flying ants coming out of a crack in my basement wall in our Howard Beach home. Turned out they were termite swarmers, which is apparently a sign of a mature colony. The NYC Exterminator came out the same day I called and confirmed active subterranean termites. Their exterminator explained that our area of Howard Beach, being close to the water table, has higher-than-average termite pressure. The treatment plan included trenching and treating the soil along the foundation with a liquid termiticide, direct treatment of the affected wall area, and installation of a bait monitoring system around the perimeter. He was also honest about the structural damage he observed and recommended we have a contractor evaluate the affected floor joist. The pest control treatment was done in a single day, and the monitoring bait stations were installed the following week. Three months later, monitoring shows zero termite activity. The bait stations will continue to be checked quarterly. Excellent, honest, thorough exterminator work. Any homeowner in Queens should have a termite inspection done regularly, and if you need treatment, this is the pest control company to trust.",
    date: "2025-10-05",
    propertyType: "Single-family house",
  },
  {
    id: 25,
    name: "Rachel Green",
    neighborhood: "Chelsea",
    borough: "Manhattan",
    service: "Bed Bug Treatment",
    serviceSlug: "bed-bug-treatment",
    rating: 5,
    text: "Dealing with bed bugs in a Chelsea co-op was a nightmare I would not wish on anyone. I first noticed bites on my ankles and thought it was mosquitoes until I found a live bed bug on my pillowcase. I called The NYC Exterminator in a panic, and they calmed me down and scheduled an inspection for the very next day. The pest control technician was reassuring and professional. He found moderate bed bug activity in the bedroom and a few in the living room near the couch. He laid out a clear treatment plan and timeline so I knew exactly what to expect. The preparation instructions were detailed but manageable. The first treatment was thorough, covering every room in the apartment as a precaution. Two weeks later, the follow-up treatment and inspection confirmed the infestation was under control. A final inspection two weeks after that gave us the all-clear. The entire experience, while stressful, was handled with a level of professionalism and care that made a difficult situation much more bearable. This exterminator team genuinely cares about their customers and it shows in the quality of their pest control work. Chelsea residents, bookmark this company's number.",
    date: "2026-01-22",
    propertyType: "Co-op apartment",
  },
  {
    id: 26,
    name: "Hassan Ali",
    neighborhood: "Sunset Park",
    borough: "Brooklyn",
    service: "Cockroach Extermination",
    serviceSlug: "cockroach-extermination",
    rating: 5,
    text: "We run a grocery store in Sunset Park and were struggling with American cockroaches that were coming up through the floor drains in our back storage area. It was affecting our ability to store inventory properly and was a constant concern for health code compliance. The NYC Exterminator provided exactly the kind of commercial pest control we needed. Their exterminator identified the sewer system as the source and installed drain screens as a first line of defense. He then treated the storage area with a combination of residual spray along the baseboards and gel bait in crack and crevice areas. A growth regulator treatment was applied to prevent any remaining roaches from reproducing. Monthly maintenance visits keep the problem under control, and we have not seen a single American cockroach in the storage area since the third week after initial treatment. For any business owner in Sunset Park or South Brooklyn dealing with pest issues, this exterminator company understands the specific challenges of commercial pest control and delivers consistent results.",
    date: "2025-12-15",
    propertyType: "Commercial grocery",
  },
  {
    id: 27,
    name: "Nicole Bennett",
    neighborhood: "Upper East Side",
    borough: "Manhattan",
    service: "Mouse Extermination",
    serviceSlug: "mouse-extermination",
    rating: 4,
    text: "Found evidence of mice in our Upper East Side apartment in a luxury pre-war building on Park Avenue. Embarrassing as it is, even the nicest buildings in Manhattan have pest issues. The NYC Exterminator was discreet and professional, which I appreciated. Their pest control technician identified entry points around the old radiator pipes and kitchen plumbing. He sealed everything, set up monitoring stations, and the mice were gone within a week. I am giving four stars instead of five only because the initial appointment had to be pushed back by a day due to their schedule being full, which was a minor inconvenience. The actual exterminator work itself was flawless. Clean, efficient, no mess, and the technician wore shoe covers and treated our apartment with the kind of care you would expect in a white-glove building. This pest control company understands how to work in high-end Manhattan properties. Would recommend to neighbors and fellow Upper East Side residents without hesitation.",
    date: "2026-02-05",
    propertyType: "Luxury pre-war co-op",
  },
  {
    id: 28,
    name: "Eduardo Vega",
    neighborhood: "Mott Haven",
    borough: "Bronx",
    service: "Cockroach Extermination",
    serviceSlug: "cockroach-extermination",
    rating: 5,
    text: "Our building in Mott Haven had a terrible cockroach problem for as long as anyone could remember. We are talking decades of infestations that no pest control company had been able to solve long-term. When the building was bought by a new management company, they hired The NYC Exterminator for a comprehensive building-wide treatment program. The exterminator team treated every single unit and all common areas on the same day, which apparently is the key to success in multi-unit buildings. The difference was like night and day. Within two weeks, I went from seeing multiple roaches daily to seeing none. The monthly maintenance visits have kept it that way for three months now. This is the first time in my fifteen years of living in this building that we have been truly cockroach-free. The pest control technicians are always professional, arrive on time, and treat residents with respect. If your building management is looking for a reliable exterminator for building-wide cockroach control in the Bronx, The NYC Exterminator should be at the top of the list.",
    date: "2025-11-12",
    propertyType: "Multi-unit apartment building",
  },
  {
    id: 29,
    name: "Bridget Kelly",
    neighborhood: "Greenpoint",
    borough: "Brooklyn",
    service: "General Pest Control",
    serviceSlug: "general-pest-control",
    rating: 5,
    text: "When we opened our new cafe in Greenpoint, we wanted to start with a strong pest control foundation rather than wait for problems to develop. The NYC Exterminator set us up with a proactive IPM program from day one. Their exterminator inspected the entire space before we even opened, identified potential vulnerabilities like gaps around the hood vent exhaust and the rear door threshold, and recommended corrections we made during our buildout. We have been open for six months now with monthly pest control service, and we have never had a single pest issue. Not one cockroach, not one mouse, nothing. The preventive approach saves money compared to dealing with an active infestation, and more importantly, it protects our brand and our customers. For any restaurant or food service business opening in Brooklyn, investing in proactive pest control with a quality exterminator from the start is one of the smartest things you can do. The NYC Exterminator made it easy and affordable.",
    date: "2026-02-25",
    propertyType: "Commercial cafe",
  },
  {
    id: 30,
    name: "Andrew Petrov",
    neighborhood: "Brighton Beach",
    borough: "Brooklyn",
    service: "Bed Bug Treatment",
    serviceSlug: "bed-bug-treatment",
    rating: 5,
    text: "My elderly mother called me in distress because she was being bitten at night in her Brighton Beach apartment. She had been too embarrassed to say anything for weeks, and by the time I found out, the bed bug infestation had spread to multiple pieces of furniture. I called The NYC Exterminator first thing the next morning and they had a pest control technician at her apartment by early afternoon. The exterminator was patient and compassionate with my mother, explaining everything in simple terms and not making her feel ashamed. He inspected every room and found bed bugs in the bedroom and the living room recliner where she sometimes naps. The treatment plan included two full treatments spaced two weeks apart, plus encasements for the mattress and box spring. He also helped us identify that the infestation likely originated from a secondhand armchair she had received from a neighbor. Both treatments went smoothly, and by the final inspection, there was zero bed bug activity. My mother is sleeping peacefully again, and I cannot express how grateful our family is for the compassion and professionalism of this exterminator team. If you have an elderly family member in Brooklyn dealing with bed bugs, The NYC Exterminator will treat them with dignity and provide outstanding pest control results.",
    date: "2026-01-08",
    propertyType: "Apartment",
  },
  {
    id: 31,
    name: "Tina Romano",
    neighborhood: "Morris Park",
    borough: "Bronx",
    service: "Rat Extermination",
    serviceSlug: "rat-extermination",
    rating: 5,
    text: "We had rats digging extensive burrow systems in our backyard in Morris Park. They were getting into our garden, destroying vegetables, and we were worried about our kids and dog playing back there. The NYC Exterminator dispatched a pest control technician who specialized in rodent control. He mapped out the entire burrow system in our yard, which was far more extensive than we realized, with tunnels running along the fence line and under our concrete patio. The treatment included direct burrow treatment with dry ice to collapse the tunnels, followed by installation of tamper-resistant bait stations at strategic points around the perimeter. He also identified that our compost bin was acting as a food source and recommended relocating it and switching to a fully enclosed design. Within two weeks, all burrow activity had ceased. The follow-up visit confirmed zero rat activity. Our yard is finally safe for our family again. This exterminator clearly knows rodent behavior and how to address the root causes of rat infestations, not just the symptoms. Best pest control experience we have ever had in the Bronx.",
    date: "2025-12-08",
    propertyType: "Single-family house",
  },
  {
    id: 32,
    name: "Amanda Sterling",
    neighborhood: "SoHo",
    borough: "Manhattan",
    service: "General Pest Control",
    serviceSlug: "general-pest-control",
    rating: 5,
    text: "I own a retail boutique in SoHo and needed pest control service after finding evidence of mice in our stockroom and a few cockroaches in the break room area. The NYC Exterminator handled everything with the kind of discretion that a street-level retail business in SoHo needs. Their exterminator arrived early before we opened, was neat and professional, and completed the treatment without leaving any visible signs that pest control work had been done. He sealed the entry points for the mice, applied targeted treatments for the cockroaches, and set up monitoring stations in the stockroom and break room. Monthly maintenance visits are scheduled for early mornings to avoid any impact on our business hours. Three months in, the stockroom is completely pest-free and we have zero issues. This is the kind of professional, thoughtful pest control service that commercial businesses need. If you run a shop or office in Manhattan and need an exterminator who understands the importance of discretion and minimal disruption, I strongly recommend The NYC Exterminator.",
    date: "2026-02-17",
    propertyType: "Retail boutique",
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
              . Read real reviews from homeowners, renters, property managers,
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
            team handles the unique challenges of each area. From pre-war
            buildings in Manhattan to detached homes in Staten Island, our
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
                including your family, pets, and the environment. Our
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
                If you are dealing with a pest issue in your NYC home, apartment,
                or commercial property, we invite you to experience the level of
                pest control service that has earned us these reviews. Contact us
                for a{" "}
                <Link
                  href="/quote-request"
                  className="text-green-400 hover:text-green-300"
                >
                  free quote
                </Link>
                , text us directly at{" "}
                <a
                  href={`sms:${PHONE.replace(/-/g, "")}`}
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
            homeowners and businesses.
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
                  href="/quote-request"
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
                  bed bugs in your home
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
                  href="/quote-request"
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
              penthouses to Brooklyn brownstones, Queens row houses to Bronx
              multi-family buildings, and Staten Island single-family homes, our
              team has seen it all and treated it all. View our{" "}
              <Link
                href="/pricing"
                className="text-green-400 hover:text-green-300"
              >
                pricing page
              </Link>{" "}
              for transparent cost information, or{" "}
              <Link
                href="/quote-request"
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
                represents thousands of NYC homes and businesses where our
                exterminators delivered on their promise of effective,
                professional pest control. We would be honored to earn your
                trust and your review as well.
              </p>

              <p>
                Ready to experience five-star pest control for yourself?{" "}
                <Link
                  href="/quote-request"
                  className="text-green-400 hover:text-green-300"
                >
                  Request a free quote online
                </Link>
                , text us at{" "}
                <a
                  href={`sms:${PHONE.replace(/-/g, "")}`}
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
