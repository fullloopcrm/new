import Link from "next/link";
import type { Metadata } from "next";
import { PHONE, SITE_URL, SITE_NAME, EMAIL, ADDRESS } from "@/app/site/the-nyc-exterminator/_lib/seo";
import { getFAQPageSchema, getBreadcrumbSchema } from "@/app/site/the-nyc-exterminator/_lib/seo";
import CTAGroup from "@/app/site/the-nyc-exterminator/_components/CTAGroup";

export const metadata: Metadata = {
  title:
    "NYC Pest Control FAQ | 40+ Exterminator Questions Answered by Licensed Pros",
  description:
    "Get answers to 40+ frequently asked pest control and exterminator questions from licensed NYC professionals. Learn about cockroach, bed bug, rat, mouse, and termite treatment costs, timelines, preparation, guarantees, and more. Pricing from $49. Free inspections. Text us.",
  keywords:
    "pest control FAQ NYC, exterminator questions, how much does pest control cost NYC, bed bug treatment FAQ, cockroach extermination questions, rat exterminator FAQ, pest control preparation, exterminator guarantee NYC",
  openGraph: {
    title: "NYC Pest Control FAQ | 40+ Exterminator Questions Answered by Licensed Pros",
    description:
      "40+ pest control FAQs answered by licensed NYC exterminators. Pricing, timelines, preparation, guarantees & more. Text us.",
    url: `${SITE_URL}/faq`,
  },
  alternates: {
    canonical: `${SITE_URL}/faq`,
  },
};

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  title: string;
  id: string;
  items: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    title: "General Pest Control Questions",
    id: "general",
    items: [
      {
        q: "What types of pest control services does The NYC Exterminator offer?",
        a: "The NYC Exterminator provides a full spectrum of professional pest control and exterminator services designed for every type of urban pest found in the New York City metropolitan area. Our licensed exterminators handle cockroach extermination, bed bug treatment, rat and mouse extermination, termite treatment, ant control, spider removal, flea and tick treatment, mosquito abatement, wildlife removal, and general pest control for both residential and commercial properties. We serve apartments, brownstones, townhouses, single-family homes, co-ops, condominiums, commercial kitchens, restaurants, hotels, office buildings, warehouses, retail spaces, and healthcare facilities across all five boroughs, Northern New Jersey, Long Island, and Westchester County. Whether you are dealing with a minor ant problem in your Manhattan studio or a severe German cockroach infestation in a Brooklyn restaurant, our team has the training, tools, licensing, and field experience to eliminate the issue and implement lasting prevention measures.",
      },
      {
        q: "Are your pest control technicians licensed and insured in New York?",
        a: "Yes, every exterminator and pest control technician on our team is fully licensed by the New York State Department of Environmental Conservation (NYS DEC), which is the governing body that regulates commercial pesticide applicators in the state. Each technician holds the appropriate certification categories for the services they perform, including categories 7A (general pest control), 7F (fumigation), and 8 (public health pest control) as required. We also maintain comprehensive general liability insurance, commercial auto insurance, and workers' compensation coverage, which means you and your property are fully protected in the unlikely event of any incident during an extermination treatment. Our technicians undergo rigorous initial training and participate in ongoing continuing education programs to stay current with the latest pest control techniques, products, integrated pest management protocols, and safety standards mandated by the EPA and NYS DEC.",
      },
      {
        q: "How quickly can an exterminator come to my NYC home or business?",
        a: "We understand that pest problems are urgent, which is why The NYC Exterminator offers same-day and next-day pest control service for most calls across our entire service area. For emergency situations involving health-threatening pests such as bed bugs, rats, or severe cockroach infestations, we often dispatch a licensed exterminator within hours of your initial call. Our scheduling team operates seven days a week — weekdays from 7 AM to 8 PM, Saturdays from 8 AM to 6 PM, and Sundays from 9 AM to 5 PM — to coordinate pest control appointments that fit your schedule. Simply text us or submit a request through our online quote request form to get started immediately. If you are a commercial client such as a restaurant facing a Department of Health inspection, we offer priority emergency scheduling to protect your business.",
      },
      {
        q: "Do you offer free pest inspections in New York City?",
        a: "Yes, The NYC Exterminator provides complimentary initial pest control inspections for residential and commercial properties throughout our entire service area, including all five NYC boroughs, New Jersey, Long Island, and Westchester. During a free inspection, one of our licensed pest control technicians will thoroughly examine your property from top to bottom, identify the type and severity of any infestation, locate entry points and nesting areas, assess contributing environmental factors, and provide you with an honest assessment along with a detailed treatment plan and written cost estimate. There is absolutely no obligation to proceed after the inspection, and we will never pressure you into unnecessary services or upsell treatments you do not need. Our goal is to give you the information you need to make the best decision for your property and budget. Request your free inspection today through our quote request page or by texting us.",
      },
      {
        q: "What areas does The NYC Exterminator serve?",
        a: "The NYC Exterminator provides professional pest control and extermination services across the entire NYC metropolitan area. Our primary service area includes all five boroughs of New York City — Manhattan, Brooklyn, Queens, the Bronx, and Staten Island — covering more than 280 neighborhoods. We also serve communities throughout Northern New Jersey (including Hoboken, Jersey City, Newark, and Bergen County), Long Island (both Nassau and Suffolk Counties), and Westchester County (including White Plains, Yonkers, and New Rochelle). Our service network ensures that wherever you are in the greater metro area, a licensed exterminator is just a few taps away. Visit our areas page to find pest control services specific to your neighborhood and see which exterminator teams operate in your area.",
      },
      {
        q: "What should I do to prepare my apartment for a pest control treatment?",
        a: "Proper preparation is essential for ensuring that your pest control treatment achieves maximum effectiveness, especially in NYC apartments where space is limited and pests can hide in countless crevices. Before your exterminator arrives, we recommend removing all food items from countertops, open shelves, and cabinets that will be treated. Clear clutter from under sinks, behind appliances, and around baseboards to give your technician full access to critical treatment zones. Vacuum thoroughly, especially along baseboards, under furniture, and in corners. Ensure that pets and small children have a safe place to stay during treatment if necessary. For specific treatments like bed bug extermination, our technicians will provide detailed, step-by-step preparation instructions tailored to the treatment method being used — heat treatment preparation differs significantly from chemical treatment preparation. Our team will walk you through everything during your initial consultation so there are no surprises on treatment day. For more details on preparation for specific pest treatments, visit our services page.",
      },
      {
        q: "How long does a typical pest control treatment take?",
        a: "The duration of a pest control treatment depends on several factors including the type of pest being targeted, the severity of the infestation, the size and layout of the property being treated, and the specific treatment methodology employed. A standard cockroach extermination treatment for a one-bedroom NYC apartment typically takes 30 to 60 minutes. Bed bug heat treatments for a full apartment can take four to eight hours because the entire space must reach and maintain lethal temperatures. Rat extermination involving comprehensive exclusion work and baiting systems may require multiple visits over several weeks to fully resolve. A general pest control maintenance visit for a commercial restaurant typically takes one to two hours. During your free inspection, your exterminator will provide a clear timeline so you know exactly what to expect and can plan accordingly. We always prioritize thoroughness over speed because a complete, well-executed treatment saves you time and money in the long run.",
      },
      {
        q: "Does The NYC Exterminator offer pest control guarantees or warranties?",
        a: "Absolutely. The NYC Exterminator stands behind every treatment we perform with a satisfaction guarantee because we are confident in the quality of our extermination work. Most of our pest control services include a warranty period during which we will return at no additional cost if the pests reappear. For example, our bed bug treatment program includes follow-up inspections and re-treatment if necessary within the warranty window. Our cockroach extermination and rat extermination services also come with guarantee periods that vary depending on the treatment plan selected and the severity of the original infestation. Ongoing pest control maintenance plan clients enjoy the strongest guarantees, including unlimited re-treatments between scheduled visits. We believe in building long-term relationships with our clients, and our guarantees reflect our commitment to delivering results, not just applying products. Contact us to learn about the specific warranty terms for the pest control service you need.",
      },
      {
        q: "Can I stay in my home during a pest control treatment?",
        a: "In most cases, you can remain in your home during standard pest control treatments, though our exterminator may ask you to vacate specific rooms while products are being applied and for a short period afterward while treatments dry. For certain intensive treatments — such as whole-unit bed bug heat treatment or large-scale fumigation — you will need to leave the premises entirely for a specified period, typically several hours to a full day. Our technicians will clearly communicate all requirements before starting any work, and you will never be surprised by the need to vacate. We always use the least disruptive methods that are effective for your particular pest problem, and your comfort and safety are our top priorities throughout the entire pest control process. If you have specific concerns about occupancy during treatment — for example, if you work from home or have a family member with health sensitivities — let us know during your initial consultation and we will plan accordingly.",
      },
    ],
  },
  {
    title: "Pricing & Payment",
    id: "pricing",
    items: [
      {
        q: "How much does pest control cost in NYC?",
        a: "Pest control pricing in New York City varies depending on the type of pest, the severity of the infestation, the size and type of your property, and the treatment method required. At The NYC Exterminator, our services typically range from $125 for a basic general pest control treatment to $3,000 or more for comprehensive multi-room bed bug heat treatments or full-building rat exclusion programs. A standard cockroach extermination for a one-bedroom apartment generally falls between $150 and $400. Bed bug treatment ranges from $300 to $1,500 per room depending on the method used. Rat and mouse extermination typically costs $200 to $600, and termite treatment ranges from $500 to $2,500 depending on the scope. We always provide free, no-obligation quotes after inspecting your property so you know exactly what to expect before any work begins. Visit our pricing page for detailed breakdowns by service type and property size, or text us for an immediate estimate.",
      },
      {
        q: "Do you offer payment plans or financing for extermination services?",
        a: "Yes, we understand that some pest control treatments — particularly extensive bed bug treatment programs or building-wide rat extermination projects — represent a significant financial investment. The NYC Exterminator offers flexible payment options including all major credit cards (Visa, Mastercard, American Express, Discover), debit cards, personal and business checks, and bank transfers. For larger projects, we can arrange payment plans that split the cost over multiple installments to make treatment more manageable. Commercial pest control clients with ongoing service contracts benefit from monthly billing arrangements with net-30 terms that spread costs over time and simplify accounting. Contact our team or email hello@thenycexterminator.com to discuss payment options tailored to your specific situation and budget.",
      },
      {
        q: "Are there any hidden fees with your pest control services?",
        a: "No. The NYC Exterminator is committed to transparent, upfront pricing for all of our pest control and extermination services. The written quote you receive after your free inspection is the price you pay — period. We do not charge hidden travel fees, emergency surcharges, equipment rental fees, or surprise material costs. There are no fuel surcharges and no administrative fees added after the fact. If during treatment our technicians discover additional issues that require expanded service — for example, a cockroach infestation that extends into an adjacent room — we will discuss the findings with you and provide a revised quote before proceeding with any additional work. Our reputation as one of the most trusted exterminator companies in NYC is built on honesty and transparency, which is why thousands of NYC residents and businesses choose us year after year. See our pricing page for full details on what each service includes.",
      },
      {
        q: "Do you offer discounts for ongoing pest control maintenance plans?",
        a: "Yes, The NYC Exterminator offers significant savings through our ongoing pest control maintenance plans, which are the most cost-effective way to keep your property pest-free year-round. Clients who sign up for quarterly, bi-monthly, or monthly service plans receive discounted per-visit rates compared to one-time treatments, plus they benefit from priority scheduling, routine preventive inspections, and unlimited re-treatments between visits if pests return. Monthly residential plans start at $50 to $125 per month depending on property size and location. These recurring pest control plans are especially popular with commercial clients such as restaurants, hotels, and property management companies that need consistent, documented protection against pests to satisfy health department requirements. Check our pricing page or text us for details on our current maintenance plan options and promotional discounts.",
      },
      {
        q: "Is pest control covered by renters or homeowners insurance in NYC?",
        a: "In most cases, standard renters and homeowners insurance policies do not cover pest control or extermination costs because infestations are generally classified as a maintenance issue rather than a covered peril. However, there are important exceptions — if a pest infestation causes sudden structural damage (such as termites compromising load-bearing beams) or if damage results from a covered event, some policies may provide partial reimbursement for remediation costs. In New York City specifically, landlords are legally responsible for pest control in multi-unit residential buildings under the NYC Housing Maintenance Code and Local Law 55, which holds building owners accountable for maintaining pest-free conditions. If you are a tenant dealing with pests, your landlord is generally obligated to pay for extermination services. We recommend reviewing your lease and insurance policy carefully, and our team can provide detailed service documentation to help you file any applicable insurance claims or formal pest complaints with your landlord or NYC 311.",
      },
      {
        q: "What is included in a one-time pest control treatment?",
        a: "A one-time pest control treatment from The NYC Exterminator includes a thorough property inspection, precise identification of pest species and infestation severity, targeted treatment using professional-grade EPA-registered products applied by a licensed exterminator, sealing of common entry points when applicable, and a comprehensive follow-up plan with specific prevention recommendations. We also provide a detailed service report documenting what was found, what was treated, and what products were used — which is especially important for commercial clients who need records for health department compliance. A follow-up inspection within two to four weeks is included to verify treatment effectiveness. Many clients who start with a one-time extermination treatment choose to upgrade to a recurring maintenance plan after seeing the results and understanding the long-term value of prevention. One-time treatments are ideal for addressing isolated pest issues, for tenants whose landlords cover the cost, or for clients moving into a new NYC apartment who want a clean start.",
      },
    ],
  },
  {
    title: "Service & Scheduling",
    id: "scheduling",
    items: [
      {
        q: "Do you provide pest control in all five NYC boroughs?",
        a: "Yes, The NYC Exterminator provides full-service pest control and extermination in all five boroughs of New York City: Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. Our exterminator teams are strategically positioned throughout the city to ensure rapid response times regardless of your location. We serve every neighborhood from the Upper East Side to Coney Island, from Astoria to Riverdale, from the Financial District to Tottenville. Each borough presents unique pest challenges — from cockroach-prone pre-war walkups in the East Village to rat activity in subway-adjacent Midtown buildings to bed bug introductions in high-turnover rental units across Brooklyn and Queens. Our technicians are experienced with the specific pest pressures found in every type of NYC building, including pre-war apartments, post-war high-rises, brownstones, townhouses, new construction, commercial lofts, and mixed-use properties. Check our areas page for detailed pest control information specific to your neighborhood.",
      },
      {
        q: "Do you offer weekend and evening pest control appointments?",
        a: "Yes, The NYC Exterminator understands that your schedule is busy and that pest problems do not conveniently limit themselves to business hours. That is why we offer flexible pest control appointment times including evenings and weekends throughout our entire service area. Saturday service is available from 8 AM to 6 PM, and Sunday service is available from 9 AM to 5 PM. Weekday appointments run from 7 AM to 8 PM, with evening slots available for clients who work standard business hours. For urgent pest control emergencies — such as a rat sighting in a restaurant before a health inspection or bed bugs discovered in a hotel room with guests checking in — we also provide after-hours emergency exterminator service. Simply text us to discuss scheduling options that work best for you, or use our online quote request form to request your preferred date and time.",
      },
      {
        q: "How far in advance do I need to book a pest control appointment?",
        a: "For standard pest control appointments, we recommend booking two to three days in advance to secure your preferred date and time slot. However, The NYC Exterminator maintains availability for same-day and next-day exterminator service for urgent situations because we know that pest problems do not wait for a convenient time. Emergency pest control calls for bed bugs, rats, or severe cockroach infestations can often be addressed within hours of your initial contact. For non-emergency scheduled maintenance visits or routine quarterly pest control treatments, booking a week in advance ensures maximum scheduling flexibility. Our online booking system and scheduling team are available seven days a week to help you find the earliest available appointment. Contact us through our contact page or text us to schedule.",
      },
      {
        q: "Do you serve areas outside of New York City for pest control?",
        a: "Absolutely. In addition to serving all five boroughs of NYC, The NYC Exterminator provides professional pest control and extermination services throughout Northern New Jersey, Long Island (both Nassau and Suffolk Counties), and Westchester County. Our service area extends well beyond city limits to cover the broader NYC metropolitan region because pests do not respect municipal boundaries and many of our clients own properties in multiple locations. Whether you need a cockroach exterminator in Hoboken, bed bug treatment in Garden City, rat extermination in White Plains, or general pest control anywhere in between, our licensed technicians can reach you. Visit our areas page to confirm service availability in your specific town or neighborhood and connect with the exterminator team that covers your area.",
      },
      {
        q: "Can I schedule recurring pest control visits for my property?",
        a: "Yes, and we highly recommend recurring pest control service as the most effective strategy for long-term pest prevention. The NYC Exterminator offers monthly, bi-monthly, and quarterly pest control maintenance plans for both residential and commercial properties throughout the NYC metro area. Each recurring visit includes a thorough inspection, targeted treatment of any emerging pest issues, monitoring station checks, preventive barrier applications, and a detailed service report. Recurring pest control clients enjoy priority scheduling, discounted rates, satisfaction guarantees with unlimited re-treatments between visits, and the peace of mind that comes with knowing a licensed exterminator is actively monitoring and protecting your property. Recurring plans are especially valuable in NYC apartment buildings where pests can reinfest from neighboring units. Learn more about our service options on our services page or contact us to build a custom plan.",
      },
      {
        q: "What happens if pests come back after my exterminator treatment?",
        a: "If pests return after your initial treatment, The NYC Exterminator will come back and re-treat your property at no additional charge during your warranty or guarantee period. This is part of our commitment to delivering results, not just applying products. Most of our pest control treatments include a follow-up inspection within two to four weeks to verify effectiveness, and our warranty periods typically range from 30 to 90 days depending on the service. For clients on recurring pest control maintenance plans, re-treatments between scheduled visits are always included at no extra cost. If a re-treatment is needed, our exterminator will also reassess the situation to determine why the pests returned — whether it is a new entry point, activity from a neighboring unit, or an environmental factor — and adjust the treatment plan accordingly. Our goal is complete elimination, and we do not consider the job done until you are satisfied.",
      },
    ],
  },
  {
    title: "Safety & Health",
    id: "safety",
    items: [
      {
        q: "Are the pest control products you use safe for children and pets?",
        a: "The safety of your family, pets, and home is our highest priority at The NYC Exterminator. We use only EPA-registered, professional-grade pest control products that are applied by licensed technicians trained in proper dosage, placement, and application techniques that minimize exposure to building occupants. Many of our treatments rely on gel baits, tamper-resistant bait stations, and targeted crack-and-crevice applications that deliver product precisely where pests live and travel while keeping it away from children and pets. For households with young children, pregnant individuals, elderly family members, or pets with sensitivities, our exterminators will specifically recommend the safest treatment options available and provide detailed re-entry instructions. We always prioritize integrated pest management (IPM) approaches that reduce reliance on chemical treatments. If you have concerns about specific products or ingredients, our technicians are happy to share Safety Data Sheets and discuss alternatives before treatment begins.",
      },
      {
        q: "Do you offer eco-friendly or green pest control options?",
        a: "Yes, The NYC Exterminator offers a comprehensive range of eco-friendly, low-toxicity, and green pest control solutions for clients who prefer environmentally responsible treatment methods. Our integrated pest management (IPM) approach inherently emphasizes prevention, habitat modification, exclusion, and monitoring before resorting to chemical intervention. When chemical treatments are necessary, we use botanical-based products, reduced-risk formulations approved by the EPA, and targeted application methods that minimize environmental impact and non-target exposure. Our bed bug heat treatment program is a completely chemical-free option that eliminates all life stages of bed bugs — adults, nymphs, and eggs — using controlled thermal technology without any pesticides whatsoever. Green pest control does not mean less effective pest control; modern eco-friendly products and techniques can be just as thorough as conventional methods when applied by trained professionals. Ask your exterminator about green pest control options during your free inspection.",
      },
      {
        q: "What is Integrated Pest Management (IPM) and do you practice it?",
        a: "Integrated Pest Management, commonly known as IPM, is a science-based, holistic approach to pest control that focuses on long-term prevention and uses a strategic combination of techniques including biological controls, habitat modification, physical exclusion, environmental monitoring, sanitation improvements, and targeted chemical treatments applied only as a last resort and in the most precise manner possible. The NYC Exterminator practices IPM principles across every service we offer because it delivers the most sustainable, effective, and safest results for our clients and the environment. In New York City, IPM is actually mandated by law for public housing (NYCHA) and many commercial food service establishments, and the NYC Department of Health actively promotes IPM adoption in schools, daycares, and healthcare facilities. Our licensed exterminators are fully trained in IPM methodology and will design a pest management plan that addresses the root causes of your infestation — such as moisture issues, sanitation gaps, and structural entry points — rather than just treating symptoms.",
      },
      {
        q: "How do you handle pest control in food service establishments safely?",
        a: "The NYC Exterminator has extensive experience providing pest control for restaurants, commercial kitchens, cafeterias, bakeries, food trucks, commissary kitchens, school cafeterias, and other food service establishments throughout the NYC metro area. We use only food-safe, USDA-approved treatment methods and application techniques that comply fully with NYC Department of Health (DOH) regulations, the FDA Food Safety Modernization Act (FSMA), and local health code requirements. Our commercial exterminator programs include regular scheduled treatments timed around your operating hours, tamper-proof monitoring stations, sanitation consultations, comprehensive service documentation that satisfies health department auditors, and rapid-response emergency service for any between-visit issues. We understand that a single pest sighting or a failed DOH inspection can result in violations, public health risks, negative reviews, and significant revenue loss. Protecting your health code rating and your customers is always our top priority. Learn more about our commercial pest control offerings on our services page.",
      },
      {
        q: "Will pest control treatments leave a smell or residue in my home?",
        a: "Modern professional pest control products are specifically formulated to be low-odor and leave minimal visible residue, which is a significant improvement over the strong-smelling products associated with pest control decades ago. Most of the treatments applied by The NYC Exterminator are virtually undetectable once they have dried, which typically takes 30 minutes to two hours depending on the product, application method, and ventilation in your space. Gel baits and bait stations, which we use frequently for cockroach extermination and ant control, have no odor at all and are placed discreetly in cracks, crevices, and behind appliances. Dust applications in wall voids and enclosed spaces are completely invisible and odorless from the living space. In rare cases where a treatment may produce a temporary scent — such as certain liquid residual sprays used for heavy infestations — your exterminator will inform you beforehand and provide ventilation recommendations to dissipate any trace of odor quickly.",
      },
      {
        q: "Is it safe to be in an adjacent apartment during pest control treatment?",
        a: "Yes, in the vast majority of cases, occupants in adjacent apartments are perfectly safe during pest control treatment in a neighboring unit. Professional pest control products applied by The NYC Exterminator are targeted and contained to the treatment area. Our technicians use precise application methods — gel baits, crack-and-crevice injections, and tamper-resistant bait stations — that keep products confined to the areas where pests live and travel. For standard cockroach, ant, or rodent treatments, there is no risk to adjacent units whatsoever. The only scenario where adjacent units might be impacted is during fumigation, which is extremely rare in NYC residential settings and would involve advance notification of all affected parties and coordination with building management. If your building is undergoing a coordinated building-wide pest control treatment, your exterminator will communicate specific instructions for each unit involved.",
      },
    ],
  },
  {
    title: "Cockroach Extermination",
    id: "cockroaches",
    items: [
      {
        q: "How do you treat cockroach infestations in NYC apartments?",
        a: "Cockroach extermination in NYC apartments requires a targeted, multi-step approach because cockroaches — particularly German cockroaches, which are the most common species in NYC buildings — are incredibly resilient and reproduce at an alarming rate. A single female German cockroach can produce up to 400 offspring in her lifetime. The NYC Exterminator uses a proven combination of professional gel baits, insect growth regulators (IGRs) that prevent immature roaches from reaching reproductive maturity, residual crack-and-crevice treatments, and dust applications in wall voids and behind electrical outlet covers to eliminate all life stages. We also identify and seal entry points — cracks around pipes, gaps under doors, openings around electrical penetrations, and spaces behind backsplashes — to prevent reinfestation from neighboring units, which is critical in multi-unit NYC buildings. For severe infestations in apartment buildings, we coordinate with property managers to treat multiple units simultaneously for the best results. Visit our cockroach extermination page for detailed information about our proven approach and pricing.",
      },
      {
        q: "Why do I keep seeing cockroaches even after pest control treatment?",
        a: "Seeing some cockroach activity in the days immediately following a pest control treatment is actually normal and can be a sign that the treatment is working. Gel baits and residual treatments take time to spread through the entire cockroach population via a process called secondary transfer, where poisoned roaches contaminate others in the colony through contact and ingestion. You may notice more roaches in the open during the first week after treatment because the products disrupt their normal hiding behavior, flushing them out from wall voids and crevices. This activity should decrease noticeably within one to two weeks and cease almost entirely within three to four weeks. If you are still seeing significant cockroach activity after four weeks, contact The NYC Exterminator immediately for a follow-up visit, which is included in your treatment warranty. Persistent cockroach problems in NYC apartments often require addressing neighboring units as well, and our cockroach extermination programs account for this common challenge.",
      },
      {
        q: "What types of cockroaches are most common in New York City?",
        a: "The two most common cockroach species encountered by our exterminators in New York City are the German cockroach (Blattella germanica) and the American cockroach (Periplaneta americana). German cockroaches are small (about half an inch), light brown with two dark stripes behind the head, and are the primary cockroach pest in NYC apartments, restaurants, and commercial kitchens. They thrive indoors, reproduce rapidly, and are strongly associated with kitchens and bathrooms where moisture and food are available. American cockroaches are much larger (up to two inches), reddish-brown, and are often called 'water bugs' by New Yorkers. They typically inhabit basements, boiler rooms, sewer lines, and building sub-basements, and occasionally make their way into apartments through drains and pipe chases. Each species requires different extermination strategies, which is why proper identification by a licensed exterminator is crucial. Our cockroach extermination specialists can identify the species during your free inspection and recommend the most effective treatment plan.",
      },
      {
        q: "Can cockroaches spread from one apartment to another in NYC buildings?",
        a: "Yes, and this is one of the most significant pest control challenges in New York City's multi-unit residential buildings. Cockroaches — especially German cockroaches — readily travel between apartments through shared wall voids, plumbing chases, electrical conduit pathways, gaps around pipes under sinks, spaces behind baseboards, and even through small cracks in walls and ceilings. In many NYC buildings, the plumbing and electrical infrastructure creates continuous pathways that connect every unit in a vertical stack. This means that even if you maintain an immaculate apartment, cockroaches can migrate from a neighboring unit with less rigorous sanitation practices. Effective cockroach control in NYC apartment buildings often requires a coordinated approach where multiple units — and ideally the entire building — are treated simultaneously. The NYC Exterminator works with property managers and landlords to implement building-wide cockroach extermination programs that address the root cause rather than just chasing roaches from unit to unit. Under NYC housing law, landlords are required to provide pest control for tenants.",
      },
    ],
  },
  {
    title: "Bed Bug Treatment",
    id: "bedbugs",
    items: [
      {
        q: "What is the most effective bed bug treatment method?",
        a: "The most effective bed bug treatment available today is whole-room heat treatment, which The NYC Exterminator specializes in. Heat treatment raises the temperature of the infested space to 130 to 140 degrees Fahrenheit and maintains it for several hours, which kills all bed bugs at every life stage — adults, nymphs, and eggs — in a single treatment session without any chemicals whatsoever. Unlike chemical treatments that require multiple visits over several weeks and may miss hidden eggs that are resistant to many pesticides, professional heat penetrates deep into mattresses, box springs, upholstered furniture, wall cavities, carpet edges, and every microscopic hiding spot that bed bugs exploit. We also offer targeted chemical bed bug treatments and combination approaches for situations where heat alone may not be practical, such as units with heat-sensitive electronics or structural limitations. Each situation is unique, and our bed bug treatment specialists will recommend the optimal approach during your free inspection. Learn more on our bed bug treatment page about our proven elimination methods and success rates.",
      },
      {
        q: "How do I know if I have bed bugs in my NYC apartment?",
        a: "Bed bugs are notoriously stealthy pests, but there are several telltale signs that indicate their presence in your NYC apartment. The most common early sign is waking up with small, itchy, red bite marks arranged in clusters or lines on exposed skin — though not everyone reacts visibly to bed bug bites. Look for small dark spots (fecal stains) on your mattress, box spring, sheets, and pillowcases, particularly along seams and piping. You may find tiny, translucent shed skins near sleeping areas, or small blood spots on sheets from crushed bugs. In more advanced infestations, you may notice a sweet, musty odor. Check mattress seams, the underside of box springs, behind headboards, along baseboards near the bed, inside nightstand drawers, and behind electrical outlet covers. If you suspect bed bugs, do not panic, do not throw away furniture, and do not attempt DIY treatments with over-the-counter sprays — these products are largely ineffective against bed bugs and can actually scatter them to other rooms. Text The NYC Exterminator immediately for a professional bed bug inspection.",
      },
      {
        q: "How much does bed bug treatment cost in NYC?",
        a: "Bed bug treatment costs in NYC vary depending on the treatment method, the number of rooms affected, the severity of the infestation, and the size of your apartment or property. At The NYC Exterminator, chemical bed bug treatments typically range from $300 to $800 per room, while whole-room heat treatment — which is the most effective single-visit solution — ranges from $800 to $1,500 per room. A typical one-bedroom apartment heat treatment costs between $1,200 and $2,000. Multi-room and whole-apartment treatments are priced on a sliding scale that provides better per-room value for larger treatment areas. We always provide a detailed written quote after your free inspection so there are no surprises. It is important to invest in professional bed bug extermination rather than attempting DIY methods, which almost universally fail and allow the infestation to worsen and spread. Visit our pricing page for detailed bed bug treatment pricing or our bed bug treatment page for a full overview of our methods and what is included in each treatment package.",
      },
      {
        q: "What should I do if I find bed bugs in my hotel room or Airbnb in NYC?",
        a: "If you discover bed bugs in a New York City hotel room or Airbnb rental, take the following steps immediately. First, document the evidence with clear photographs — capture images of the bugs, stains, shed skins, or bite marks. Notify the front desk or Airbnb host right away and request a different room (not an adjacent one, as bed bugs can travel through walls) or a full refund. Do not move your luggage to other rooms, as this can spread the infestation. When you return home, inspect your luggage carefully in a bathtub or on a light-colored hard surface outside your bedroom, wash all clothing and fabric items in hot water (at least 130 degrees Fahrenheit), and dry everything on high heat for at least 45 minutes. Seal any items that cannot be washed in plastic bags for later treatment. If you suspect you may have brought bed bugs home — even if you have not seen them yet — contact The NYC Exterminator immediately for a preventive inspection. Early detection is absolutely critical because a small bed bug introduction of just a few bugs can become a full-blown infestation within weeks. Our bed bug treatment programs specialize in catching and eliminating these pests before they establish themselves in your home.",
      },
    ],
  },
  {
    title: "Rat & Mouse Extermination",
    id: "rodents",
    items: [
      {
        q: "How do you get rid of rats in a New York City building?",
        a: "Rat extermination in NYC buildings is one of our core specialties at The NYC Exterminator, and we approach it with the systematic, multi-phase methodology that these intelligent, adaptive pests demand. Our program begins with a comprehensive inspection to identify all entry points (rats can enter through openings as small as half an inch), active burrow locations, runways, nesting sites, food sources, and contributing environmental conditions. We then implement our proven three-phase strategy: Phase 1 is exclusion — sealing every identified opening with gnaw-proof materials including steel wool, copper mesh, metal flashing, hardware cloth, or hydraulic cement. Phase 2 is population reduction through strategically placed professional-grade tamper-resistant bait stations, snap traps in high-activity zones, and in some cases burrow treatment for outdoor rat populations. Phase 3 is ongoing monitoring, maintenance, and environmental recommendations to ensure the problem is fully and permanently resolved. NYC rat control often requires addressing exterior conditions as well, including garbage management, landscaping, building facade maintenance, and coordination with neighboring properties. Visit our rat extermination page for a detailed overview of our proven NYC rat control program.",
      },
      {
        q: "How do you handle mouse infestations differently from rats?",
        a: "While mice and rats are both rodents, they have distinctly different behaviors, capabilities, and biology that require our exterminators to use different strategies for effective control. Mice are smaller, more curious and exploratory by nature, and can squeeze through openings as small as a quarter inch (about the diameter of a pencil), whereas rats are larger, considerably more cautious and neophobic (they fear new objects), and need openings of at least half an inch. The NYC Exterminator tailors our rodent extermination approach accordingly. For mouse control, we use smaller bait stations, snap traps baited with high-attractant materials, and focus extensively on sealing micro-openings around pipes, wires, utility penetrations, door sweeps, and weep holes. Mice tend to nest close to food sources and may have multiple nesting sites within a small area. For rats, we deploy heavier-duty commercial bait stations, focus on larger-scale exclusion work including foundation repairs and sewer line inspections, and often need to address exterior conditions and neighboring properties. Both species require a systematic IPM approach combining exclusion, trapping, baiting, sanitation improvements, and ongoing monitoring. Our mouse extermination and rat extermination pages cover each approach in detail.",
      },
      {
        q: "Are there really more rats than people in New York City?",
        a: "The popular claim that there are more rats than people in NYC is actually a persistent urban myth, though the city certainly has a substantial rat population. A 2023 study by a Columbia University statistician estimated approximately two million rats in the city, which is roughly one rat for every four residents — still a staggering number, but well below the often-cited one-to-one ratio. What is true is that New York City's dense urban environment, extensive subway system, aging infrastructure with countless entry points, abundant food waste, and 24/7 activity patterns create near-ideal conditions for Norway rats (Rattus norvegicus), which are the dominant rat species in the city. The NYC government has invested hundreds of millions of dollars in rat mitigation programs, including rat-proof garbage containers, dry ice treatment of burrows, and the appointment of a dedicated city rat czar. Despite these efforts, individual property owners and managers must still take proactive measures to protect their buildings. The NYC Exterminator's rat extermination program works alongside city efforts to create a comprehensive defense for your specific property. Contact us or visit our about page to learn about our approach to NYC's ongoing rodent challenges.",
      },
      {
        q: "My building has rats coming from the sewer — can you help?",
        a: "Absolutely, and this is a very common scenario in New York City buildings, particularly in older structures with aging plumbing systems. Rats are strong swimmers and can enter buildings through broken or deteriorated sewer lines, missing cleanout caps, damaged toilet seals, and compromised connections between building plumbing and the municipal sewer system. The NYC Exterminator's rat extermination program includes thorough plumbing infrastructure inspection to identify sewer-related entry points. We install one-way rat valves (also called rat blockers or non-return valves) in sewer cleanouts and floor drains that allow wastewater to flow out but prevent rats from traveling up through the plumbing system. We also seal gaps around pipe penetrations through foundation walls and basement floors, repair or recommend repairs for damaged sewer lines, and install monitoring stations to verify that the exclusion work is effective. Sewer rat intrusion is particularly prevalent in neighborhoods near waterfront areas, older sections of Manhattan, and areas with combined sewer systems. If you are dealing with rats in your basement, bathroom, or kitchen that seem to appear from drains, text us immediately for a specialized sewer rat assessment.",
      },
    ],
  },
  {
    title: "Termite Treatment",
    id: "termites",
    items: [
      {
        q: "Do you treat for termites in the New York City area?",
        a: "Yes, The NYC Exterminator provides comprehensive termite treatment and prevention services for properties throughout the NYC metro area, including all five boroughs, Northern New Jersey, Long Island, and Westchester County. While many people associate termites with southern and tropical climates, both subterranean termites and drywood termites are found in the New York City region and can cause devastating, costly structural damage if left untreated. Subterranean termites are the more common and destructive species in our area, building mud tubes from the soil to reach wood structures and consuming cellulose material 24 hours a day, 365 days a year. Our termite control services include thorough inspections using moisture meters, thermal imaging cameras, and visual assessment; liquid barrier treatments applied around the foundation perimeter; Sentricon and Advance bait monitoring systems for ongoing protection; and localized wood treatment for active infestations. We also provide official Wood Destroying Insect (WDI) inspection reports required for real estate transactions in New York and New Jersey. Learn more on our termite treatment page.",
      },
      {
        q: "How do I know if I have termites in my NYC home?",
        a: "Termite infestations are often called the silent destroyer because significant damage can occur before any visible signs appear to the untrained eye. However, there are several warning signs that NYC homeowners and property managers should watch for. The most common indicator of subterranean termites is the presence of mud tubes — pencil-width tunnels made of soil, wood particles, and termite saliva — running along foundation walls, piers, floor joists, or basement walls. You may notice wood that sounds hollow when tapped, has a honeycomb-like internal pattern, or crumbles easily along the grain. Buckling paint, uneven or bubbling surfaces on walls, and unexplained cracks in drywall can indicate termite activity behind finished surfaces. During spring and early summer, you may see swarms of winged termites (alates) emerging from the soil near your foundation or even inside your home, often near windows and light sources. Discarded wings near windowsills are another classic indicator. If you notice any of these signs, contact The NYC Exterminator immediately for a professional termite inspection. Early detection can save thousands of dollars in structural repair costs. Visit our termite treatment page for photos of common termite damage signs.",
      },
      {
        q: "How much damage can termites really cause to a New York property?",
        a: "Termites cause an estimated five billion dollars in property damage across the United States every year, and properties in the New York City metro area are far from immune. A mature subterranean termite colony can contain hundreds of thousands to over a million individual workers, and they consume wood continuously — a large colony can eat approximately one pound of wood per day. Over months and years of undetected activity, termites can seriously compromise structural elements including floor joists, subfloor sheathing, wall studs, window and door frames, roof rafters, and support beams. In severe cases, termite damage can render structural components unsafe and require costly replacement, with repair bills ranging from $3,000 to $50,000 or more depending on the extent of damage. NYC brownstones, townhouses, and frame houses with wood structural elements are particularly vulnerable. The best defense against termite damage is proactive monitoring and early professional intervention. The NYC Exterminator offers both one-time termite inspections and ongoing monitoring programs through our termite treatment services that detect activity before significant damage occurs.",
      },
      {
        q: "What is the difference between termite baiting systems and liquid treatments?",
        a: "The two primary professional termite treatment approaches are liquid barrier treatments (termiticides) and baiting systems, and The NYC Exterminator offers both options depending on the specific situation. Liquid barrier treatments involve applying a professional-grade termiticide — such as Termidor (fipronil) — to the soil around and beneath the foundation of your property, creating a continuous treated zone that kills termites on contact and through secondary transfer as they pass through the treated soil. This method provides immediate protection and typically remains effective for five to ten years. Baiting systems, such as the Sentricon and Advance systems, use strategically placed in-ground stations containing cellulose material laced with slow-acting insect growth regulators. Foraging termites find the bait, consume it, and share it throughout the colony, eventually eliminating the entire colony including the queen. Baiting systems are ideal for properties where liquid treatment is impractical, near water features, or as a long-term monitoring solution. Many of our termite treatment programs combine both approaches for maximum protection. Your exterminator will recommend the best strategy during your inspection.",
      },
    ],
  },
  {
    title: "Commercial Pest Control",
    id: "commercial",
    items: [
      {
        q: "Do you provide pest control for restaurants and food businesses in NYC?",
        a: "Yes, restaurant and food service pest control is one of our largest and most established service categories at The NYC Exterminator. We work with hundreds of restaurants, cafes, bakeries, delis, food halls, food trucks, commissary kitchens, catering operations, grocery stores, and bars across the NYC metro area. Our commercial pest management programs are specifically designed to meet and exceed NYC Department of Health and Mental Hygiene (DOHMH) requirements, helping you maintain a clean bill of health during inspections and protecting your establishment's reputation. Services include regularly scheduled treatments timed around your operating hours, tamper-proof monitoring stations, comprehensive sanitation consulting, detailed service documentation and logbooks that satisfy health department auditors, staff training on pest prevention best practices, and 24/7 emergency response for any between-visit issues. A pest sighting in a food establishment can lead to DOH violations, forced closures, devastating online reviews, and lost revenue — our job is to make sure that never happens. Learn more on our services page or request a commercial pest control assessment through our contact page.",
      },
      {
        q: "Can you handle pest control for an entire apartment building or co-op?",
        a: "Absolutely. The NYC Exterminator provides building-wide pest control programs for apartment complexes, co-ops, condominiums, HDFC buildings, and property management portfolios of all sizes across the NYC metro area. Building-wide pest control is exponentially more effective than treating individual units in isolation because pests — especially cockroaches, bed bugs, and mice — travel freely between units through shared walls, plumbing chases, electrical conduits, and HVAC ductwork. Our building programs include comprehensive inspections of all units and common areas (lobbies, hallways, laundry rooms, trash compactor areas, basements, and roof spaces), coordinated treatment schedules that address the entire building systematically, ongoing monitoring with detailed reporting for building management, and direct communication channels with property managers and superintendents. We work with some of the largest property management companies in NYC and understand the unique operational, legal, and logistical challenges of multi-unit pest control. Under NYC Housing Maintenance Code, building owners are required to maintain pest-free conditions — we help you meet that obligation efficiently and effectively.",
      },
      {
        q: "Do you offer pest control contracts for commercial properties?",
        a: "Yes, The NYC Exterminator offers fully customized commercial pest control contracts tailored to the specific needs, industry requirements, regulatory environment, and budget of your business. Our commercial contracts typically include a defined service frequency (weekly, bi-weekly, monthly, or quarterly), specified pest types covered, guaranteed response times for emergency calls, detailed reporting and documentation for regulatory compliance and audit purposes, and a dedicated account manager who serves as your single point of contact. Industries we serve with commercial exterminator contracts include hospitality (hotels, hostels, short-term rentals), food service (restaurants, bakeries, catering), healthcare (hospitals, clinics, nursing homes, assisted living), education (schools, universities, daycare centers), retail (stores, shopping centers, warehouses), office (corporate offices, co-working spaces), and residential property management. Commercial contracts provide the best value, most consistent protection, and strongest guarantees against pest intrusion. Contact us or email hello@thenycexterminator.com to request a custom commercial proposal.",
      },
      {
        q: "What industries do you serve with commercial extermination services?",
        a: "The NYC Exterminator provides commercial pest control and extermination services to a wide and diverse range of industries across the NYC metro area. Our commercial exterminator clients span virtually every sector including restaurants, bars, and food service operations; hotels, boutique hotels, and hospitality properties; hospitals, urgent care centers, and healthcare facilities; public and private schools, colleges, and universities; corporate offices, co-working spaces, and financial institutions; retail stores, boutiques, and shopping centers; warehouses, distribution centers, and logistics facilities; manufacturing plants and production facilities; government buildings and municipal properties; religious institutions and community centers; gyms, spas, and wellness facilities; and residential property management companies overseeing portfolios ranging from a handful of units to thousands. Each industry has unique pest pressures, regulatory requirements, and operational constraints, and our commercial pest management team has deep experience designing programs that address industry-specific challenges while working within your operational schedule. Visit our services page for an overview of our commercial capabilities or contact us for a free commercial property assessment.",
      },
    ],
  },
  {
    title: "Licensing & Insurance",
    id: "licensing",
    items: [
      {
        q: "What licensing is required for pest control companies in New York?",
        a: "In New York State, all commercial pest control companies and individual pesticide applicators must be licensed by the New York State Department of Environmental Conservation (NYS DEC) under the Environmental Conservation Law Article 33. Companies must hold a valid Commercial Pesticide Applicator Business Registration, and each individual technician who applies pesticides must hold a Commercial Pesticide Applicator or Technician certification in the appropriate categories for the work they perform. Category 7A covers general pest control, Category 7F covers fumigation, and Category 8 covers public health pest control. These certifications require passing rigorous examinations administered by the NYS DEC and completing continuing education credits to maintain active status. The NYC Exterminator and every member of our exterminator team maintains all required NYS DEC certifications, and we are happy to provide proof of licensing to any client upon request. When hiring any pest control company in NYC, always verify their NYS DEC registration — it is the single most important credential that separates legitimate, trained professionals from unlicensed operators.",
      },
      {
        q: "How can I verify that my exterminator is properly licensed in NYC?",
        a: "Verifying your pest control company's licensing is one of the most important steps you can take to protect yourself, your property, and your family. In New York State, you can verify a commercial pesticide applicator business registration through the NYS DEC's Pesticide Product, Ingredient, and Business Information database, which is publicly accessible online at the NYS DEC website. You can search by business name or registration number. You can also call the NYS DEC Pesticide Compliance and Enforcement section directly to confirm a company's status. Additionally, you should ask your pest control provider to show you their individual technician's NYS DEC Pesticide Applicator certification card, which every certified technician is required to carry while performing pest control work. The NYC Exterminator proactively provides licensing information to clients and posts our NYS DEC registration details on our about page. We encourage every NYC resident and business to verify licensing before allowing any exterminator to treat their property — an unlicensed applicator puts your health, your property, and your legal standing at risk.",
      },
      {
        q: "What kind of insurance should a pest control company carry?",
        a: "A reputable, professional pest control company should carry several types of insurance to protect both the company and its clients. At minimum, look for general liability insurance (which covers property damage and bodily injury that may occur during service), commercial auto insurance (covering company vehicles), and workers' compensation insurance (which protects you from liability if a technician is injured on your property). Many commercial clients and property management companies also require pest control providers to carry professional liability (errors and omissions) insurance and umbrella or excess liability policies. The NYC Exterminator maintains comprehensive coverage across all of these categories, with general liability limits that exceed industry standards. We provide certificates of insurance (COIs) to any client upon request and can name your building, management company, or landlord as an additional insured party at no extra charge. Never hire a pest control company that cannot provide proof of insurance — if an uninsured exterminator causes property damage or a worker is injured in your building, you could be held financially liable. Contact us through our contact page to request our insurance credentials.",
      },
      {
        q: "What regulations govern pesticide use in New York City specifically?",
        a: "New York City has some of the most stringent pesticide regulations in the United States, layered on top of federal EPA rules and New York State DEC requirements. NYC Local Law 37 (the NYC Pesticide Use Reporting Law) requires commercial pesticide applicators to report all pesticide applications to the NYC Department of Health. The NYC Department of Health and Mental Hygiene enforces pest control standards in food establishments, childcare centers, and healthcare facilities through its Health Code (Article 151). NYCHA (NYC Housing Authority) properties are governed by strict IPM protocols that mandate non-chemical approaches as a first line of defense. In NYC public schools, pesticide use is regulated under New York State Education Law and the DEC's Neighbor Notification Law, which requires advance notice of pesticide applications near schools and daycare centers. NYC's Right to Know Law also gives tenants and building occupants the right to be notified about pesticide applications in their buildings. The NYC Exterminator is fully compliant with every applicable federal, state, and city regulation governing pest control and pesticide use. Our technicians are trained specifically on NYC regulatory requirements, and our service documentation satisfies all reporting and notification obligations. Visit our about page or contact us to learn more about our compliance practices.",
      },
    ],
  },
];

const allFaqs: FAQItem[] = faqCategories.flatMap((cat) => cat.items);

const phonePlain = PHONE.replace(/-/g, "");

export default function FAQPage() {
  return (
    <div>
      {/* JSON-LD: FAQPage Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getFAQPageSchema(allFaqs)),
        }}
      />

      {/* JSON-LD: Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            getBreadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "FAQ", url: "/faq" },
            ])
          ),
        }}
      />

      {/* ───────────────── HERO ───────────────── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-sm text-zinc-400">
              <li>
                <Link href="/" className="hover:text-green-400">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li className="text-green-400">FAQ</li>
            </ol>
          </nav>

          <div className="mt-6 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
              Frequently Asked Questions
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              NYC Pest Control FAQ:{" "}
              <span className="text-green-500">
                Common Exterminator Questions Answered
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              Choosing the right{" "}
              <Link
                href="/services"
                className="text-green-400 hover:text-green-300"
              >
                pest control service
              </Link>{" "}
              is one of the most important decisions you can make for your NYC
              property. Whether you are a tenant dealing with cockroaches, a
              homeowner worried about termites, a restaurant owner preparing for
              a Department of Health inspection, or a property manager
              responsible for an entire building, the answers below will help you
              understand your options and make informed decisions. The NYC
              Exterminator is the trusted choice for professional pest control
              and extermination across{" "}
              <Link
                href="/areas"
                className="text-green-400 hover:text-green-300"
              >
                280+ neighborhoods
              </Link>{" "}
              in New York City, New Jersey, Long Island, and Westchester.
            </p>
            <p className="mt-4 text-lg leading-8 text-zinc-300">
              Below you will find more than 40 detailed answers to the most
              common questions our customers ask about our{" "}
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
                rat and mouse extermination
              </Link>
              ,{" "}
              <Link
                href="/termite-treatment"
                className="text-green-400 hover:text-green-300"
              >
                termite treatment
              </Link>
              ,{" "}
              <Link
                href="/general-pest-control"
                className="text-green-400 hover:text-green-300"
              >
                general pest control
              </Link>
              ,{" "}
              <Link
                href="/pricing"
                className="text-green-400 hover:text-green-300"
              >
                pricing
              </Link>
              , safety, scheduling, licensing, and more. If you do not see your
              question answered here, text{" "}
              <a
                href={`sms:${phonePlain}`}
                className="text-green-400 hover:text-green-300"
              >
                us
              </a>{" "}
              or{" "}
              <Link
                href="/contact"
                className="text-green-400 hover:text-green-300"
              >
                contact us online
              </Link>
              .
            </p>
          </div>

          {/* Quick Navigation */}
          <div className="mt-12 rounded-xl bg-[#2A2A2A] p-6">
            <h2 className="text-lg font-semibold text-white">
              Jump to a Category
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {faqCategories.map((cat) => (
                <a
                  key={cat.id}
                  href={`#${cat.id}`}
                  className="rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-600 hover:text-white"
                >
                  {cat.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── FAQ CATEGORIES ───────────────── */}
      {faqCategories.map((category, catIndex) => (
        <div key={category.id}>
          <section
            id={category.id}
            className={`${catIndex % 2 === 0 ? "bg-[#0A0A0A]" : "bg-[#2A2A2A]"} py-16 text-white`}
          >
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-white">
                <span className="text-green-500">{category.title}</span>
              </h2>
              <div className="mt-8 space-y-8">
                {category.items.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-zinc-800 bg-[#1A1A1A] p-6"
                  >
                    <h3 className="text-lg font-semibold text-white">
                      {item.q}
                    </h3>
                    <p className="mt-3 leading-7 text-zinc-300">{item.a}</p>
                  </div>
                ))}
              </div>

              {/* Contextual internal links per category */}
              {category.id === "general" && (
                <div className="mt-8 rounded-xl bg-[#2A2A2A] p-6">
                  <p className="text-sm text-zinc-400">
                    Related pages:{" "}
                    <Link
                      href="/services"
                      className="text-green-400 hover:text-green-300"
                    >
                      All Services
                    </Link>
                    {" | "}
                    <Link
                      href="/areas"
                      className="text-green-400 hover:text-green-300"
                    >
                      Service Areas
                    </Link>
                    {" | "}
                    <Link
                      href="/quote-request"
                      className="text-green-400 hover:text-green-300"
                    >
                      Request a Quote
                    </Link>
                    {" | "}
                    <Link
                      href="/about"
                      className="text-green-400 hover:text-green-300"
                    >
                      About Us
                    </Link>
                  </p>
                </div>
              )}
              {category.id === "pricing" && (
                <div className="mt-8 rounded-xl bg-[#2A2A2A] p-6">
                  <p className="text-sm text-zinc-400">
                    Related pages:{" "}
                    <Link
                      href="/pricing"
                      className="text-green-400 hover:text-green-300"
                    >
                      Full Pricing Guide
                    </Link>
                    {" | "}
                    <Link
                      href="/quote-request"
                      className="text-green-400 hover:text-green-300"
                    >
                      Get a Free Quote
                    </Link>
                    {" | "}
                    <Link
                      href="/services"
                      className="text-green-400 hover:text-green-300"
                    >
                      Browse Services
                    </Link>
                  </p>
                </div>
              )}
              {category.id === "cockroaches" && (
                <div className="mt-8 rounded-xl bg-[#2A2A2A] p-6">
                  <p className="text-sm text-zinc-400">
                    Learn more:{" "}
                    <Link
                      href="/cockroach-extermination"
                      className="text-green-400 hover:text-green-300"
                    >
                      Cockroach Extermination Services
                    </Link>
                    {" | "}
                    <Link
                      href="/pricing"
                      className="text-green-400 hover:text-green-300"
                    >
                      Cockroach Treatment Pricing
                    </Link>
                    {" | "}
                    <Link
                      href="/reviews"
                      className="text-green-400 hover:text-green-300"
                    >
                      Customer Reviews
                    </Link>
                  </p>
                </div>
              )}
              {category.id === "bedbugs" && (
                <div className="mt-8 rounded-xl bg-[#2A2A2A] p-6">
                  <p className="text-sm text-zinc-400">
                    Learn more:{" "}
                    <Link
                      href="/bed-bug-treatment"
                      className="text-green-400 hover:text-green-300"
                    >
                      Bed Bug Treatment Services
                    </Link>
                    {" | "}
                    <Link
                      href="/pricing"
                      className="text-green-400 hover:text-green-300"
                    >
                      Bed Bug Treatment Pricing
                    </Link>
                    {" | "}
                    <Link
                      href="/areas"
                      className="text-green-400 hover:text-green-300"
                    >
                      Service Areas
                    </Link>
                  </p>
                </div>
              )}
              {category.id === "rodents" && (
                <div className="mt-8 rounded-xl bg-[#2A2A2A] p-6">
                  <p className="text-sm text-zinc-400">
                    Learn more:{" "}
                    <Link
                      href="/rat-extermination"
                      className="text-green-400 hover:text-green-300"
                    >
                      Rat Extermination Services
                    </Link>
                    {" | "}
                    <Link
                      href="/mouse-extermination"
                      className="text-green-400 hover:text-green-300"
                    >
                      Mouse Extermination Services
                    </Link>
                    {" | "}
                    <Link
                      href="/reviews"
                      className="text-green-400 hover:text-green-300"
                    >
                      Customer Reviews
                    </Link>
                  </p>
                </div>
              )}
              {category.id === "termites" && (
                <div className="mt-8 rounded-xl bg-[#2A2A2A] p-6">
                  <p className="text-sm text-zinc-400">
                    Learn more:{" "}
                    <Link
                      href="/termite-treatment"
                      className="text-green-400 hover:text-green-300"
                    >
                      Termite Treatment Services
                    </Link>
                    {" | "}
                    <Link
                      href="/pricing"
                      className="text-green-400 hover:text-green-300"
                    >
                      Termite Treatment Pricing
                    </Link>
                    {" | "}
                    <Link
                      href="/quote-request"
                      className="text-green-400 hover:text-green-300"
                    >
                      Request an Inspection
                    </Link>
                  </p>
                </div>
              )}
              {category.id === "commercial" && (
                <div className="mt-8 rounded-xl bg-[#2A2A2A] p-6">
                  <p className="text-sm text-zinc-400">
                    Related pages:{" "}
                    <Link
                      href="/services"
                      className="text-green-400 hover:text-green-300"
                    >
                      Commercial Services
                    </Link>
                    {" | "}
                    <Link
                      href="/contact"
                      className="text-green-400 hover:text-green-300"
                    >
                      Contact Us
                    </Link>
                    {" | "}
                    <Link
                      href="/pricing"
                      className="text-green-400 hover:text-green-300"
                    >
                      Commercial Pricing
                    </Link>
                    {" | "}
                    <Link
                      href="/careers"
                      className="text-green-400 hover:text-green-300"
                    >
                      Careers
                    </Link>
                  </p>
                </div>
              )}
              {category.id === "licensing" && (
                <div className="mt-8 rounded-xl bg-[#2A2A2A] p-6">
                  <p className="text-sm text-zinc-400">
                    Related pages:{" "}
                    <Link
                      href="/about"
                      className="text-green-400 hover:text-green-300"
                    >
                      About The NYC Exterminator
                    </Link>
                    {" | "}
                    <Link
                      href="/contact"
                      className="text-green-400 hover:text-green-300"
                    >
                      Contact Us
                    </Link>
                    {" | "}
                    <Link
                      href="/reviews"
                      className="text-green-400 hover:text-green-300"
                    >
                      Customer Reviews
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* CTA after General Pest Control section (index 0) — variant mid */}
          {catIndex === 1 && <CTAGroup variant="mid" />}

          {/* CTA before last section — variant preFaq */}
          {catIndex === faqCategories.length - 2 && (
            <CTAGroup variant="preFaq" />
          )}
        </div>
      ))}

      {/* ───────────────── STILL HAVE QUESTIONS ───────────────── */}
      <section className="bg-[#0A0A0A] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-[#2A2A2A] p-8 text-center">
            <h2 className="text-3xl font-bold text-white">
              Still Have Questions About{" "}
              <span className="text-green-500">Pest Control</span> or Need an{" "}
              <span className="text-green-500">Exterminator</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-300">
              Our licensed pest control technicians and exterminators are
              standing by to answer any questions you may have about pest
              control, extermination services, pricing, scheduling, or anything
              else related to protecting your NYC property from pests. Whether
              you need help identifying a pest, understanding your treatment
              options, getting a quote for{" "}
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
              , or any other service, we are here to help.
            </p>
            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/book-exterminator-today"
                className="inline-flex items-center rounded-lg bg-green-600 px-6 py-3 text-lg font-semibold text-white hover:bg-green-700"
              >
                Self-Book — Save $10
              </Link>
              <a
                href={`sms:${phonePlain}`}
                className="inline-flex items-center rounded-lg border border-zinc-700 px-6 py-3 text-lg font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
              >
                Text Us With Questions
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-lg border border-zinc-700 px-6 py-3 text-lg font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
              >
                Contact Page
              </Link>
              <Link
                href="/quote-request"
                className="inline-flex items-center rounded-lg px-6 py-3 text-lg font-semibold text-green-400 hover:text-green-300"
              >
                Request a Quote &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── RELATED RESOURCES ───────────────── */}
      <section className="bg-[#2A2A2A] py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold">
            Explore Our{" "}
            <span className="text-green-500">Pest Control</span> &{" "}
            <span className="text-green-500">Exterminator</span> Resources
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-300">
            Learn more about our pest control and extermination services, read
            what our customers say, explore pricing, and find pest control
            information specific to your needs and neighborhood.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/cockroach-extermination"
              className="rounded-xl bg-[#1A1A1A] p-6 transition hover:bg-[#0A0A0A]"
            >
              <h3 className="font-semibold text-green-500">
                Cockroach Extermination
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Professional cockroach pest control and exterminator services for
                NYC homes and businesses.
              </p>
            </Link>
            <Link
              href="/bed-bug-treatment"
              className="rounded-xl bg-[#1A1A1A] p-6 transition hover:bg-[#0A0A0A]"
            >
              <h3 className="font-semibold text-green-500">
                Bed Bug Treatment
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Heat treatment and chemical extermination solutions for complete
                bed bug elimination.
              </p>
            </Link>
            <Link
              href="/rat-extermination"
              className="rounded-xl bg-[#1A1A1A] p-6 transition hover:bg-[#0A0A0A]"
            >
              <h3 className="font-semibold text-green-500">
                Rat Extermination
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Comprehensive rat and mouse pest control for NYC properties,
                including sewer rat exclusion.
              </p>
            </Link>
            <Link
              href="/mouse-extermination"
              className="rounded-xl bg-[#1A1A1A] p-6 transition hover:bg-[#0A0A0A]"
            >
              <h3 className="font-semibold text-green-500">
                Mouse Extermination
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Targeted mouse control and exterminator services for apartments,
                homes, and commercial spaces.
              </p>
            </Link>
            <Link
              href="/termite-treatment"
              className="rounded-xl bg-[#1A1A1A] p-6 transition hover:bg-[#0A0A0A]"
            >
              <h3 className="font-semibold text-green-500">
                Termite Treatment
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Protect your property from termite damage with professional pest
                control treatment and monitoring.
              </p>
            </Link>
            <Link
              href="/general-pest-control"
              className="rounded-xl bg-[#1A1A1A] p-6 transition hover:bg-[#0A0A0A]"
            >
              <h3 className="font-semibold text-green-500">
                General Pest Control
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                All-purpose pest control and exterminator services for ants,
                spiders, fleas, and more.
              </p>
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl bg-[#1A1A1A] p-6 transition hover:bg-[#0A0A0A]"
            >
              <h3 className="font-semibold text-green-500">Pricing</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Transparent pest control and exterminator pricing for every
                service and property type.
              </p>
            </Link>
            <Link
              href="/reviews"
              className="rounded-xl bg-[#1A1A1A] p-6 transition hover:bg-[#0A0A0A]"
            >
              <h3 className="font-semibold text-green-500">Reviews</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Read what our satisfied pest control and exterminator customers
                have to say.
              </p>
            </Link>
            <Link
              href="/services"
              className="rounded-xl bg-[#1A1A1A] p-6 transition hover:bg-[#0A0A0A]"
            >
              <h3 className="font-semibold text-green-500">All Services</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Browse our complete catalog of extermination and pest control
                services across NYC.
              </p>
            </Link>
            <Link
              href="/areas"
              className="rounded-xl bg-[#1A1A1A] p-6 transition hover:bg-[#0A0A0A]"
            >
              <h3 className="font-semibold text-green-500">Service Areas</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Find pest control and exterminator services in your specific NYC
                neighborhood.
              </p>
            </Link>
            <Link
              href="/about"
              className="rounded-xl bg-[#1A1A1A] p-6 transition hover:bg-[#0A0A0A]"
            >
              <h3 className="font-semibold text-green-500">About Us</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Learn about The NYC Exterminator, our licensing, team, and
                commitment to pest control excellence.
              </p>
            </Link>
            <Link
              href="/careers"
              className="rounded-xl bg-[#1A1A1A] p-6 transition hover:bg-[#0A0A0A]"
            >
              <h3 className="font-semibold text-green-500">Careers</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Join our team of licensed pest control technicians and
                exterminators serving NYC.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────── FINAL CTA ───────────────── */}
      <CTAGroup variant="final" />
    </div>
  );
}
