import { PHONE } from "./content";
import { Service, SERVICES, SERVICE_CATEGORIES } from "./services";

// ============================================================
// STATE PAGE CONTENT — 3k+ words
// ============================================================
export function statePageContent(stateName: string, stateAbbr: string, cities: { name: string; slug: string }[]) {
  const topCities = cities.slice(0, 10);
  const sc = SERVICES.length;

  return {
    title: `Junk Removal in ${stateName} — We Pay You for Your Stuff`,
    metaDescription: `Professional junk removal in ${cities.length}+ cities across ${stateName}. starting at $100/hr with dump fees included. We credit you 50% (when applicable) of resale value (when applicable) on items worth something. Same-day available.`,
    heroSubtitle: `${cities.length} Cities Served in ${stateAbbr}`,
    sections: [
      {
        heading: `Junk Removal in ${stateName} — The Only Service That Pays You`,
        paragraphs: [
          `We Pay You Junk Removal is the only junk hauling company in ${stateName} that values your items. Every other junk removal service in ${stateAbbr} charges you a flat fee to take everything — then turns around and resells the good stuff, keeping 100% of the profit. You pay full price, they pocket the upside, and your valuable furniture, appliances, and electronics disappear into their resale pipeline without you seeing a dime. This has been the standard model in the junk removal industry for decades, and residents of ${stateName} have been paying the price for it.`,
          `We operate differently in ${stateName}. You book your pickup (1, 2, or 3 people), pay a simple hourly rate Starting at $100/hr with dump fees included, and as we load your items, we appraise anything with resale value. You get 50% of the fair market resale value credited directly to your bill. If the credits exceed the total? We cut you a check. We serve ${cities.length} cities across ${stateName} with same-day appointments available 7 days a week, from ${topCities[0]?.name || "major metros"} to ${topCities[Math.min(4, topCities.length - 1)]?.name || "smaller communities"} and everywhere in between.`,
          `Whether you're in ${topCities[0]?.name || "the capital"}, ${topCities[1]?.name || "a suburb"}, ${topCities[2]?.name || "a growing city"}, or anywhere else in ${stateAbbr} — our crews are local, licensed, insured, and ready to work. We handle everything from single-item pickups to full estate cleanouts, construction debris to office furniture. ${sc} specialized service types, all backed by our 50% Resale Credit (when applicable) guarantee. No other junk removal company in ${stateName} comes close to this level of service, transparency, or fairness.`,
          `Our mission is simple: treat your stuff like it has value, because it does. That vintage dresser in your garage, the working refrigerator you're replacing, the set of power tools you no longer need — these items have active resale markets, and the money from those markets should go to you, not to the junk removal company. We built our entire business around this principle, and ${stateName} residents are saving hundreds of dollars on every job because of it.`,
        ],
      },
      {
        heading: `How Junk Removal Works in ${stateName}`,
        paragraphs: [
          `The process is simple no matter where you are in ${stateName}. Call us at ${PHONE} and describe what you need removed. We'll confirm pricing based on the volume and type of items. You pick your crew size — 1-person at $100/hr, 2-person at $250/hr, or emergency same-day at $200/person/hr — and we schedule a time that works for you. Same-day appointments are available in most ${stateAbbr} cities when you call before noon. We operate 7AM-8PM daily, 7 days a week including weekends and holidays.`,
          `When our crew arrives at your ${stateName} location, they get to work immediately. As they load items onto the truck, they identify anything with resale value — furniture in good condition, working appliances, electronics, tools, exercise equipment, musical instruments, designer goods, antiques, and more. Each valuable item gets a fair market appraisal right there on the spot. Our crews are trained in fair market valuation using real-time resale data from major secondhand marketplaces, auction houses, and dealer networks.`,
          `You get 50% (when applicable) of the appraised resale value credited toward your bill. If you have a $300 job and $400 worth of resale credits, we don't just zero out your balance — we pay you the $100 difference. This happens regularly on estate cleanouts, garage cleanouts, and office cleanouts throughout ${stateName}. Your junk has value, and we make sure you benefit from it. Every appraisal is transparent — you see what we value, what we base it on, and you approve before any credit is applied.`,
          `All dump fees, transfer station costs, and disposal charges are included in your hourly rate. There are no hidden fees, no surprise charges, and no volume-based pricing games. What we quote per hour is what you pay per hour — minus whatever resale credits your items earn you. The truck, the labor, the fuel, the disposal — it's all in the hourly rate. Period.`,
          `After the job is complete, we do a final walkthrough with you to make sure everything you wanted removed is gone. We sweep up any debris left behind, and your space is left clean and ready for whatever comes next. If you had resale credits that exceeded your bill, we process your payment on the spot — either by check or digital transfer, your choice.`,
        ],
      },
      {
        heading: `${sc} Junk Removal Services Available in ${stateName}`,
        paragraphs: [
          `We offer ${sc} specialized junk removal service types across ${stateName}. Every service is available in all ${cities.length} cities we serve in ${stateAbbr}, and every service includes our hourly rate with dump fees and 50% Resale Credit (when applicable) on valuable items. No matter what you need removed, we have a service designed specifically for it.`,
          `Our residential services include full-service junk removal, garage cleanouts, basement cleanouts, attic cleanouts, estate cleanouts, hoarder cleanouts, and storage unit cleanouts. These cover every scenario a ${stateName} homeowner might face — from decluttering a single room to clearing an entire property. Each residential service is tailored to the specific challenges of that space, whether it's navigating narrow basement stairs or carefully clearing a sensitive estate.`,
          `For individual items, we handle furniture removal, appliance removal, mattress removal, refrigerator and freezer removal, TV and electronics removal, exercise equipment removal, piano removal, tire removal, hot tub and spa removal, and pool table removal. These services are perfect for ${stateName} residents who need one or a few specific items removed without the cost of a full cleanout. And because these items often have the highest resale value, customers using item-specific services frequently see the biggest percentage savings on their bills.`,
          `We also provide structure removal services throughout ${stateName} — sheds, playhouses, fences, decks, and trampolines. These include full demolition, loading, hauling, and disposal, all within the hourly rate. Our construction and specialty services cover construction debris, renovation waste, yard waste, carpet and flooring removal, and scrap metal removal — essential for contractors, renovators, and DIYers across ${stateAbbr}.`,
          `For businesses in ${stateAbbr}, we offer office and commercial cleanouts, foreclosure and eviction cleanouts, retail and store cleanouts, warehouse cleanouts, hotel and hospitality cleanouts, property management cleanouts, church and nonprofit cleanouts, and school and university cleanouts. Commercial furniture and electronics have some of the strongest resale markets, so business customers in ${stateName} often see the largest credits — with many commercial jobs resulting in payouts to the customer.`,
        ],
      },
      {
        heading: `Why ${stateName} Residents Choose We Pay You Junk Removal`,
        paragraphs: [
          `${stateName} residents are tired of overpaying for junk removal. Traditional companies charge $300-$800+ for a single truckload and pocket the resale value of your items. That's money that should be in your pocket, not theirs. When you add up what traditional companies earn from the removal fee plus the resale profit, they're making 2-3x what they charge you — and you see none of the upside.`,
          `Our transparent hourly pricing means you always know what you're paying. Our crew for 2 hours is $300 — but if your items have $200 in resale value, you only pay $200. If they have $400 in resale value, we pay you $100. No other junk removal company in ${stateName} offers this. We've served thousands of customers across ${stateAbbr} and the average customer saves 25-40% off what they would have paid with a traditional flat-rate company.`,
          `We're fully licensed, bonded, and insured to operate in ${stateName}. Our crews are background-checked, trained in safe item handling, and experienced in fair market appraisal. We carry full liability coverage so your property is protected throughout the entire removal process. Every crew member carries identification and arrives in a branded vehicle so you always know who's at your door.`,
          `Same-day service is available in most ${stateAbbr} cities. Call before noon and we can typically have a crew at your location within 2-4 hours. We operate 7AM-8PM daily, 7 days a week, including weekends and holidays. No contracts, no minimums, no recurring charges — just straightforward junk removal that actually pays you back. Book when you need us and never worry about subscription fees or cancellation penalties.`,
          `Our commitment to eco-friendly disposal sets us apart in ${stateName}. We divert approximately 60% of all items from landfills through resale, recycling, and donation. Items with value get resold. Recyclable materials go to certified recycling facilities. Usable goods that don't meet resale thresholds get donated to local ${stateName} charities. Only items with truly zero remaining value go to the landfill — and even then, we use licensed, environmentally compliant disposal facilities.`,
        ],
      },
      {
        heading: `Junk Removal Pricing in ${stateName}`,
        paragraphs: [
          `Our pricing is the same across all ${cities.length} cities in ${stateName}: $100/hr for a 1-person crew, $250/hr for a 2-person crew, and $200/person/hr for emergency same-day. Dump fees, transfer station costs, and disposal charges are all included (an industry first). There are no hidden fees, no volume-based pricing, and no surge pricing. The rate you're quoted is the rate you pay.`,
          `The 1-person crew at $100/hr is ideal for small jobs — a few pieces of furniture, some electronics, a light cleanout, or single-item pickups like a mattress or refrigerator. Most 1-person jobs in ${stateName} take 1-2 hours. The 2-person crew at $250/hr is our most popular option for ${stateName} customers — it handles full garage cleanouts, basement clearing, furniture removal, appliance hauling, estate work, and anything heavy. Most 2-person jobs take 1.5-3 hours. Emergency same-day at $200/person/hr guarantees arrival within 2 hours for last-minute deadlines.`,
          `Our crew is built for large-scale jobs: full estate cleanouts, office cleanouts, warehouse clearing, multi-room residential cleanouts, and structure demolition (sheds, decks, fences). This crew moves fast and handles heavy items that would slow a smaller team. Most jobs in ${stateName} take 2-5 hours depending on scope.`,
          `On top of the hourly rate, you earn 50% Resale Credit (when applicable) on every item with market value. The average ${stateName} customer saves 20-40% off their final bill through resale credits. Estate cleanouts and office cleanouts frequently result in the customer getting paid — credits exceed the bill and we cut a check for the difference. We've paid out thousands of dollars to ${stateName} customers whose items had more value than their removal bill.`,
        ],
      },
      {
        heading: `What Items Earn You Credit in ${stateName}`,
        paragraphs: [
          `Not everything has resale value, but you'd be surprised how much of your "junk" is actually worth money. Across ${stateName}, the most common credit-earning items include: furniture in good condition (dining sets, dressers, desks, bookshelves, couches), working appliances (refrigerators, washers, dryers, dishwashers, ovens), electronics (flat screen TVs, computers, monitors, gaming consoles, audio equipment), and tools (power tools, hand tools, shop equipment, lawn equipment).`,
          `Other high-value categories include exercise equipment (treadmills, ellipticals, weight sets, Peloton bikes), musical instruments (pianos, guitars, drums, amplifiers), outdoor furniture and equipment (grills, patio sets, power washers), and antiques or collectibles. Brand names consistently command higher resale values — a Pottery Barn dining table is worth significantly more than a generic one, and our crews know the difference.`,
          `Items that typically don't earn credit include broken furniture, stained mattresses, damaged appliances, construction debris, yard waste, and general household trash. These items are still removed as part of your hourly rate with dump fees included — you just don't receive a credit for them. Our crew will clearly explain which items qualify for credit and which don't, so there are never any surprises.`,
          `Seasonal trends affect resale values in ${stateName}. Outdoor furniture and equipment commands higher prices in spring and summer. Exercise equipment peaks in January and February. Holiday items have narrow windows. Our appraisals account for these trends to ensure you're getting current, fair market values — not outdated estimates.`,
        ],
      },
      {
        heading: `Same-Day Junk Removal Across ${stateName}`,
        paragraphs: [
          `We offer same-day junk removal in most ${stateName} cities for calls placed before noon. Our dispatch system routes the nearest available crew to your location, typically arriving within 2-4 hours of your call. For ${topCities[0]?.name || "major metros"} and other high-demand areas in ${stateAbbr}, same-day availability is nearly always guaranteed due to the number of crews we have operating in those markets.`,
          `If same-day isn't critical, you can schedule your appointment for any date and time that works for you — including weekends and holidays. We operate 7AM-8PM daily, 7 days a week, 365 days a year in ${stateName}. Many customers prefer to schedule 24-48 hours in advance to lock in a specific time window. We offer 2-hour arrival windows so you're not waiting around all day.`,
          `For large-scale projects in ${stateName} — estate cleanouts, office clearing, warehouse jobs — we recommend scheduling 48-72 hours in advance so we can assign the right crew and equipment. These jobs may require multiple trucks or specialized tools, and advance scheduling ensures we come prepared to complete the job in a single visit whenever possible.`,
        ],
      },
    ],
  };
}

// ============================================================
// CITY PAGE CONTENT — 3k+ words
// ============================================================
export function cityPageContent(cityName: string, stateName: string, stateAbbr: string, stateSlug: string, otherCities: { name: string; slug: string }[]) {
  const sc = SERVICES.length;
  const nearbyCities = otherCities.slice(0, 8);

  return {
    title: `Junk Removal in ${cityName}, ${stateAbbr} — We Pay You for Your Stuff`,
    metaDescription: `Professional junk removal in ${cityName}, ${stateAbbr}. starting at $100/hr with dump fees included. We credit you 50% (when applicable) of resale value (when applicable). Same-day available. Call ${PHONE}.`,
    heroSubtitle: `Same-Day Junk Removal in ${cityName}`,
    sections: [
      {
        heading: `Junk Removal in ${cityName}, ${stateName} — The Only Company That Pays You`,
        paragraphs: [
          `Looking for junk removal in ${cityName}, ${stateAbbr}? We Pay You Junk Removal is the only junk hauling company in ${cityName} that values your items. Every other junk removal service in ${cityName} charges you a flat fee to haul everything away — then resells your valuable furniture, appliances, and electronics for their own profit. You pay full price and get nothing back. That model has been standard in the junk removal industry for decades, and ${cityName} residents have been overpaying because of it.`,
          `We flip that model in ${cityName}. You book your pickup, pay a simple hourly rate Starting at $100/hr with dump fees included, and as we load your items, we appraise anything with resale value. You get 50% of the fair market resale value credited directly to your bill. If the credits exceed the total, we pay you the difference. Same-day appointments available in ${cityName} when you call before noon. It's a completely different experience from any other junk removal service you've used.`,
          `Our ${cityName} crews are local, licensed, bonded, and insured. They know the area, the neighborhoods, the dump and transfer station locations, and the fastest routes to get your job done efficiently. Every crew member is background-checked and trained in both safe item handling and fair market appraisal. We serve all of ${cityName} and surrounding areas in ${stateName}, 7 days a week, 7AM-8PM, including weekends and holidays.`,
          `Whether you're cleaning out a garage in ${cityName}, clearing an estate, removing old furniture, hauling construction debris, or emptying an office — we have ${sc} specialized services designed for every situation. And on every single job, your valuable items earn you money back. No other junk removal company in ${cityName} offers anything like this.`,
        ],
      },
      {
        heading: `How Junk Removal Works in ${cityName}`,
        paragraphs: [
          `Step 1: Call us at ${PHONE} and tell us what you need removed from your ${cityName} property. Describe the items, the quantity, and any access considerations (stairs, narrow hallways, heavy items, etc.). Our team will ask a few quick questions to understand the scope and confirm pricing for your job.`,
          `Step 2: Pick your crew — 1-person crew at $100/hr for small jobs, 2-person crew at $250/hr for most residential work, or emergency same-day at $200/person/hr for urgent deadlines. Schedule a time that works for you. Same-day slots are available in ${cityName} for calls placed before noon. We offer 2-hour arrival windows so you're not stuck waiting all day.`,
          `Step 3: Our ${cityName} crew arrives and gets to work immediately. As they load items onto the truck, they identify anything with resale value — furniture, appliances, electronics, tools, sporting goods, musical instruments, antiques, designer goods, and more. Every valuable item gets a fair market appraisal on the spot. You see every valuation and approve it before any credit is applied. There are no behind-the-scenes calculations — everything is transparent.`,
          `Step 4: You get 50% (when applicable) of the appraised resale value credited toward your bill. A $300 job with $400 in credits means we pay you $100. A $150 job with $80 in credits means you pay $70. Either way, you pay less — or get paid — compared to every other junk removal company in ${cityName}. After the job, we do a walkthrough to make sure everything you wanted removed is gone and your space is clean.`,
        ],
      },
      {
        heading: `${sc} Junk Removal Services in ${cityName}, ${stateAbbr}`,
        paragraphs: [
          `We offer all ${sc} of our specialized junk removal services in ${cityName}. Whether you need a single piece of furniture picked up or an entire estate cleared, we have a service designed for your specific situation. Every service includes the same simple pricing: hourly rate with dump fees, 50% Resale Credit (when applicable) on valuable items.`,
          `Popular residential services in ${cityName} include full-service junk removal, garage cleanouts, basement cleanouts, attic cleanouts, estate cleanouts, and storage unit cleanouts. For individual items, ${cityName} customers frequently request furniture removal, appliance removal, mattress removal, electronics removal, exercise equipment removal, and hot tub removal. Each of these item-specific services is optimized for the particular challenges of that item type.`,
          `For construction and renovation projects in ${cityName}, we provide construction debris removal, renovation waste removal, yard waste removal, carpet and flooring removal, and scrap metal removal. These services keep jobsites clean and code-compliant without the hassle of renting a dumpster. And for businesses in ${cityName}, we offer office cleanouts, retail store clearing, warehouse cleanouts, property management services, and more.`,
          `Every service links to a dedicated page with full details, pricing, and booking information specific to ${cityName}. Browse the full list below to find exactly what you need.`,
        ],
      },
      {
        heading: `Why ${cityName} Residents Choose Us Over Other Junk Removal Companies`,
        paragraphs: [
          `${cityName} has plenty of junk removal options — 1-800-GOT-JUNK, Junk King, College Hunks Hauling Junk, local haulers, and more. But none of them pay you. Traditional companies charge you $300-$800+ per truckload and keep 100% of the resale value. That old dining set, working refrigerator, and set of power tools? They charge you to take them and then sell them for profit. You're paying to give them inventory.`,
          `With We Pay You Junk Removal in ${cityName}, those same items earn you credits. A dining set worth $500 on the resale market credits you $250. A working refrigerator worth $300 credits you $150. Power tools worth $200 credit you $100. That's $500 in credits on items that other companies would charge you to remove. On a typical ${cityName} garage cleanout, customers save 30-50% off their bill through resale credits alone.`,
          `We're transparent, fast, and fair. No estimates that balloon on arrival. No hidden fees for stairs, distance, or weight. No minimum charges. No volume-based pricing that punishes you for having more stuff. Just a clear hourly rate, honest appraisals, and money back in your pocket. That's why ${cityName} residents who try us once become customers for life.`,
          `We're also committed to responsible disposal in ${cityName}. We divert approximately 60% of items from landfills through resale, recycling, and donation to local charities. When you choose us, you're not just saving money — you're making the environmentally responsible choice for ${cityName} and ${stateName}.`,
        ],
      },
      {
        heading: `${cityName} Junk Removal Pricing`,
        paragraphs: [
          `Pricing in ${cityName} is straightforward: $100/hr for 1-person crew, $250/hr for 2-person crew, $200/person/hr emergency same-day. All dump fees included (an industry first). All valuable items credited at 50% resale value (when applicable). No hidden fees, no volume pricing, no minimum charges, no contracts.`,
          `Most residential jobs in ${cityName} use our crew and take 1.5-3 hours. That's $150-$300 before credits. With average resale credits of 20-40%, most ${cityName} customers pay $100-$250 for a full cleanout that would cost $400-$700+ with a traditional flat-rate company. Estate cleanouts and office jobs with high-value items frequently result in payouts to the customer — where we actually cut them a check at the end of the job.`,
          `For smaller jobs in ${cityName} — a single item pickup, a few boxes, light furniture — a 1-person crew at $100/hr usually handles it in under an hour, putting your total at $100 before any credits. For full cleanouts and heavy items, the 2-person crew at $250/hr is our most popular option. For large-scale projects — full estate clearing, warehouse jobs, multi-day office cleanouts — the 2-person crew offers the best value per hour of work completed.`,
        ],
      },
      {
        heading: `What Items Earn You Credit in ${cityName}`,
        paragraphs: [
          `Across ${cityName}, the most common credit-earning items include furniture in good condition (dining sets, dressers, desks, couches, bed frames), working appliances (refrigerators, washers, dryers, ovens, dishwashers, microwaves), electronics (flat screen TVs, computers, monitors, gaming systems, audio equipment, cameras), and tools (power drills, saws, compressors, hand tools, shop equipment, lawn mowers).`,
          `High-value categories also include exercise equipment (treadmills, Peloton bikes, ellipticals, free weights, weight benches), musical instruments (pianos, guitars, drums, keyboards, amplifiers), outdoor items (grills, patio furniture, power washers, bicycles, kayaks), and collectibles or antiques (vintage furniture, mid-century pieces, art, signed items, rare books). Brand names always command higher values — ${cityName} customers with Restoration Hardware, West Elm, Herman Miller, or similar brands in their cleanout consistently receive the highest credits.`,
          `Items that typically don't earn credit include broken or heavily damaged furniture, stained mattresses without usable frames, non-working appliances past repair value, general household trash, food waste, and construction debris like drywall, lumber, and concrete. These items are still removed as part of your hourly rate — they just don't generate credit. Our crew will be upfront about what qualifies and what doesn't.`,
        ],
      },
      {
        heading: `Same-Day Junk Removal in ${cityName}`,
        paragraphs: [
          `Same-day junk removal is available in ${cityName} for calls placed before noon. Our dispatch system routes the nearest available crew to your ${cityName} location, with typical arrival within 2-4 hours of your call. For urgent situations — eviction cleanouts, next-day closings, or time-sensitive renovations — we prioritize scheduling to meet your deadline.`,
          `If same-day isn't necessary, you can book any date and time up to 4 weeks out. We offer 2-hour arrival windows for all scheduled appointments in ${cityName}. Weekend and holiday appointments are available at no extra charge. Evening appointments (after 5PM) are available by request for commercial customers who need after-hours service in ${cityName}.`,
        ],
      },
      {
        heading: `The Industry Secret Every ${cityName} Resident Should Know`,
        paragraphs: [
          `Here is what every junk removal company in ${cityName} hopes you never find out: they charge you $300-$800 to haul your items away, then sort through everything at their facility and resell 35% or more of your stuff for their own profit. That working refrigerator, your solid wood dining table, the power tools in the garage — they charged you to take these items and then flipped them for hundreds of dollars. You paid to give them free inventory. This is the standard model for 1-800-GOT-JUNK, Junk King, College Hunks, and every local hauler in ${cityName}. It has been this way for decades.`,
          `We Pay You Junk Removal exists because this model is fundamentally unfair to ${cityName} residents. We charge a transparent hourly rate starting at $100/hr — you watch the clock, there is nothing to estimate or manipulate. We appraise your valuable items in front of you with real comparable sales data. And we credit you 50% (when applicable) of what they are worth. The same items that other ${cityName} companies profit from without sharing — we split the value with you 50/50. There is no trick, no fine print, no catch. Just a better model that ${cityName} residents are choosing every single day.`,
          `The math always works in your favor in ${cityName}. In the best case, your credits exceed the bill and you walk away with a check. In the average case, you save 25-40% compared to flat-rate competitors. In the worst case — zero valuable items, all pure junk — our hourly rate is still competitive with volume-based pricing for the same amount of stuff. There is literally no scenario where calling the other guys saves you money in ${cityName}.`,
        ],
      },
      {
        heading: `Eco-Friendly Junk Removal in ${cityName}, ${stateAbbr}`,
        paragraphs: [
          `Choosing junk removal in ${cityName} is not just a financial decision — it is an environmental one. Traditional companies dump 70-80% of what they collect in ${stateAbbr} landfills, including perfectly functional items. When you choose us in ${cityName}, approximately 60% of your items are diverted from landfills through our resale, donation, and recycling network. Your working appliances go to ${stateAbbr} families who need affordable used appliances. Your quality furniture gets a second life in another ${cityName} home. Your electronics get properly recycled instead of leaching toxins into ${stateName} groundwater.`,
          `We work with local ${cityName} and ${stateName} charities for donation, certified recycling facilities for metals and e-waste, and our national resale network for items with market value. Only items with truly zero remaining value in any category reach the landfill — and even then, we use licensed, environmentally compliant disposal facilities in ${stateAbbr}. When you book junk removal with us in ${cityName}, you are making the most environmentally responsible choice available.`,
        ],
      },
    ],
    nearbyCities,
  };
}

// ============================================================
// CITY + SERVICE PAGE CONTENT — 5k+ words
// ============================================================
export function cityServicePageContent(cityName: string, stateName: string, stateAbbr: string, service: Service) {
  const category = SERVICE_CATEGORIES[service.category];
  const relatedServices = SERVICES.filter((s) => s.category === service.category && s.slug !== service.slug);
  const svcLower = service.title.toLowerCase();

  return {
    title: `${service.title} in ${cityName}, ${stateAbbr} — We Pay You`,
    metaDescription: `${service.title} in ${cityName}, ${stateAbbr}. starting at $100/hr, dump fees included. 50% Resale Credit (when applicable) on valuable items. Same-day available. Call ${PHONE}.`,
    heroSubtitle: `Professional ${service.title} in ${cityName}`,
    sections: [
      {
        heading: `${service.title} in ${cityName}, ${stateName}`,
        paragraphs: [
          `Need ${svcLower} in ${cityName}, ${stateAbbr}? We Pay You Junk Removal is the only company in ${cityName} that credits you for items with resale value. Every other ${svcLower} service in ${cityName} charges you a flat fee and keeps 100% of the resale profit. We charge a simple hourly rate and give you 50% back. It's a fundamentally different model — one that puts money back in your pocket instead of taking it all.`,
          `${service.longDescription}`,
          `Our ${cityName} crews specialize in ${svcLower} and handle jobs of every size. Whether you're dealing with a small pickup or a large-scale project, we bring the right crew, the right equipment, and the right attitude. Same-day ${svcLower} appointments are available in ${cityName} when you call before noon. We operate 7AM-8PM daily, 7 days a week, including weekends and holidays — because junk doesn't wait for business hours.`,
          `We've completed thousands of ${svcLower} jobs across ${stateName} and the ${cityName} area. Our crews know the local disposal facilities, recycling centers, and donation drop-off points. They know which items command the best resale prices in the ${cityName} market and how to accurately appraise your items on the spot. This local expertise means faster service, better appraisals, and more money back in your pocket.`,
        ],
      },
      {
        heading: `The Complete Guide to ${service.title} in ${cityName}`,
        paragraphs: [
          `${service.title} is one of the most requested services in ${cityName}, and for good reason. ${cityName} residents and businesses generate a constant stream of items that need to be removed — whether it's from a move, renovation, seasonal cleaning, downsizing, estate settlement, or business transition. Traditional disposal options in ${cityName} are limited: you can rent a dumpster (expensive and takes up driveway space), haul items to the dump yourself (time-consuming and physically demanding), or hire a flat-rate junk company (overpriced and they keep your items' value).`,
          `Our ${svcLower} service in ${cityName} eliminates all of those headaches. We come to you, we do all the heavy lifting, we handle all transportation and disposal, and we pay you for items worth something. The hourly rate covers everything — labor, truck, fuel, dump fees, transfer station costs, and disposal. There are no add-on charges for heavy items, stairs, long carries, or distance to the disposal facility.`,
          `What makes our ${svcLower} service unique in ${cityName} is the appraisal-as-we-go approach. As our crew loads items, they simultaneously assess each piece for resale value. This isn't a casual glance — our team is trained to evaluate condition, brand, age, market demand, and comparable sales. Items that meet our resale threshold (generally $20+ estimated resale value) get appraised and you receive 50% as a credit. The process adds minimal time to the job but can save you hundreds of dollars.`,
          `Common scenarios for ${svcLower} in ${cityName} include: homeowners decluttering before a move or sale, families clearing a loved one's estate, landlords cleaning between tenants, businesses relocating or downsizing, contractors clearing renovation debris, and property managers preparing units for new occupants. No matter your situation, the process is the same — call, schedule, we show up, you save.`,
        ],
      },
      {
        heading: `How ${service.title} Works in ${cityName}`,
        paragraphs: [
          `Step 1 — Call and Describe: Call us at ${PHONE} and describe your ${svcLower} job in ${cityName}. Tell us what items need to go, approximately how many, whether there are any access challenges (stairs, narrow doorways, long driveways, gated communities), and your preferred timing. Our booking team will confirm pricing based on your description and lock in your appointment.`,
          `Step 2 — Choose Your Crew: Pick the crew size that fits your ${svcLower} job. Our crew handles light ${svcLower} work — a few items, small spaces, simple access. Our crew starting at $100/hr is our most popular for ${svcLower} in ${cityName} — it handles most residential jobs efficiently with one person loading while the other sorts and appraises. Our crew starting at $100/hr tackles large ${svcLower} projects fast — full property clears, heavy items, and time-sensitive work.`,
          `Step 3 — We Arrive and Work: Your ${cityName} crew arrives in a branded truck within your 2-hour window. They introduce themselves, walk through the job with you, and confirm the scope. Then they get to work. As items are loaded, valuable pieces are set aside, photographed if needed, and appraised. You're welcome to watch the process or go about your day — either way, every appraisal is documented and presented to you for approval.`,
          `Step 4 — Credits and Payment: Once loading is complete, your crew presents a final invoice showing total hours worked, the hourly rate, all item appraisals, and total resale credit. The credit is subtracted from the bill. If the credit exceeds the bill, we process your payout immediately. If the bill exceeds the credit (the more common scenario on smaller jobs), you pay the reduced amount. Payment is accepted via card, check, or digital transfer. We also provide a detailed receipt showing exactly what was removed and what was credited.`,
          `Step 5 — Cleanup: Before leaving your ${cityName} property, the crew does a final sweep of the work area. Any debris, dust, or small items left behind are cleaned up. We do a walkthrough with you to confirm the job is complete to your satisfaction. Your space is left clean, clear, and ready for whatever comes next.`,
        ],
      },
      {
        heading: `What ${service.title} Includes in ${cityName}`,
        paragraphs: [
          `Every ${svcLower} job in ${cityName} includes the following at no extra charge: all labor including loading, carrying, lifting, stacking, and disassembly when needed; a full-size junk removal truck with capacity for large loads; all transportation from your ${cityName} property to the appropriate disposal or resale facility; all dump fees, transfer station fees, and disposal costs; eco-friendly sorting with recyclable materials separated from landfill waste; donation drop-off for usable items that don't meet resale value thresholds; and our signature 50% Resale Credit (when applicable) on every item with fair market value.`,
          `There are zero hidden fees for ${svcLower} in ${cityName}. No charges for stairs — whether it's a walkup apartment or a multi-story home. No charges for long carries — whether items are at the back of a property or in a remote storage area. No charges for heavy items — pianos, safes, hot tubs, whatever. No charges for distance to the dump — even if the nearest facility is 30 miles from your ${cityName} location. The hourly rate is the hourly rate. Period.`,
          `${service.subtitle}: ${service.description} This service is specifically designed for the types of items and situations that ${cityName} residents and businesses encounter most frequently. Our crews carry the right tools and equipment for ${svcLower} specifically, ensuring efficient, safe removal every time.`,
          `After removal, items follow one of four paths: resale (items with market value are cleaned and listed through our resale network — you already received 50% (when applicable) of this value as credit), donation (usable items below our resale threshold are donated to local ${cityName} and ${stateName} charities), recycling (metals, electronics, and other recyclable materials go to certified facilities), or disposal (only items with zero remaining value in any category go to the landfill). Approximately 60% of all items we remove are diverted from landfills through this process.`,
        ],
      },
      {
        heading: `${service.title} Pricing in ${cityName}, ${stateAbbr}`,
        paragraphs: [
          `${service.title} pricing in ${cityName} follows our standard transparent structure: $100/hr for 1-person crew, $250/hr for 2-person crew, $200/person/hr emergency same-day. All dump fees, disposal costs, and transfer station fees are included (an industry first). All items with resale value are credited to you at 50% of fair market value (when applicable). There are no hidden charges, minimums, or volume-based fees.`,
          `The right crew size for your ${svcLower} job in ${cityName} depends on the volume, weight, and complexity of the project. Our booking team will recommend the best option when you call, but here are general guidelines: our crew for 1-5 small to medium items or light cleanout work (1-2 hours typical); our crew for medium jobs like partial room clears, multiple large items, or standard ${svcLower} projects (1.5-3 hours typical); our crew for large-scale ${svcLower} jobs, full property clears, or heavy/bulky item removal (2-5 hours typical).`,
          `Common items that earn resale credit during ${svcLower} in ${cityName} include furniture in good condition, working appliances of any type, electronics less than 8 years old, power tools and hand tools, exercise and fitness equipment, musical instruments, outdoor recreation equipment, designer or brand-name household goods, antiques and vintage items, and commercial/office equipment. The more valuable items in your ${svcLower} project, the less you pay — or the more we pay you.`,
          `To give you a sense of real-world pricing: a typical ${svcLower} job in ${cityName} using our crew for 2 hours costs $200 before credits. With average resale credits of $60-$150, most customers pay $150-$240 out of pocket. Large ${svcLower} jobs with high-value items (estate work, office cleanouts) regularly see credits of $300-$800+, frequently covering the entire bill or resulting in a payout to the customer.`,
        ],
      },
      {
        heading: `${service.title} vs. DIY in ${cityName}`,
        paragraphs: [
          `Many ${cityName} residents consider handling ${svcLower} themselves before calling a professional service. While DIY can seem cheaper on the surface, the hidden costs add up fast. Renting a pickup truck or trailer in ${cityName} costs $50-$150 per day. Dump fees at local transfer stations run $30-$100+ per load depending on weight and material type. Gas to haul items across ${cityName} to the dump adds another $10-$30. And then there's the most expensive cost of all: your time.`,
          `A DIY ${svcLower} project in ${cityName} typically takes an entire day when you factor in loading, driving, waiting in line at the dump, unloading, and repeating for multiple loads. That's 6-10 hours of hard physical labor for a project our crew handles in 2-3 hours. And with DIY, you get zero resale credit — your valuable items go straight to the dump alongside the actual junk.`,
          `There's also the injury risk. ${service.title} involves heavy lifting, awkward carrying, and maneuvering bulky items through tight spaces. Back injuries, pulled muscles, and property damage (scratched floors, dented walls, damaged doorframes) are common when untrained individuals attempt ${svcLower} without proper equipment and technique. Our insured crews are trained to handle these challenges safely.`,
          `When you add up truck rental, dump fees, gas, an entire day of your time, and the risk of injury or property damage — DIY ${svcLower} in ${cityName} often costs more than hiring us, especially when you factor in the resale credits you'd miss out on. With our service, you save time, avoid physical risk, and actually get money back for your valuable items. It's not even close.`,
        ],
      },
      {
        heading: `When to Book ${service.title} in ${cityName}`,
        paragraphs: [
          `Same-day ${svcLower} is available in ${cityName} for calls placed before noon. Our dispatch routes the nearest available crew to your location, with typical arrival within 2-4 hours. This is ideal for urgent situations — last-minute moves, time-sensitive renovations, or sudden cleanout needs that can't wait.`,
          `For scheduled appointments, we recommend booking 24-48 hours in advance to lock in your preferred date and time. We offer 2-hour arrival windows for all scheduled ${svcLower} jobs in ${cityName}. Weekend and holiday appointments are available at no extra charge. Evening service (after 5PM) is available by request for commercial ${svcLower} customers who need after-hours work.`,
          `Seasonal considerations for ${svcLower} in ${cityName}: spring and early summer are the busiest seasons as residents do spring cleaning and prepare homes for sale. If you're planning a ${svcLower} project during March-June, booking a few days ahead ensures availability. Fall and winter tend to have more open scheduling. Holiday weekends (Memorial Day, July 4th, Labor Day) are popular for home projects, so book early for those weekends.`,
          `For large-scale ${svcLower} projects in ${cityName} — full estate cleanouts, entire office moves, warehouse clearing — we recommend scheduling 3-5 days in advance. This allows us to assign the optimal crew size, ensure truck availability, and potentially coordinate multi-truck service if the volume warrants it. Large projects may qualify for multi-hour discounts — ask when you call.`,
        ],
      },
      {
        heading: `Why Choose Us for ${service.title} in ${cityName}?`,
        paragraphs: [
          `${cityName} has multiple options for ${svcLower} — national chains, local haulers, and everything in between. But only one company gives you money back for your valuable items. Traditional companies treat everything the same: your $500 dining table and your broken folding chair both cost you money to remove. We see the value in that dining table and credit you $250 while still hauling the broken chair at no extra cost.`,
          `Our ${cityName} ${svcLower} crews are licensed, bonded, and insured with full liability coverage. They're experienced in safe handling of all item types, trained in fair market appraisal using real-time market data, and committed to eco-friendly disposal practices. We recycle and donate wherever possible — only items with truly zero remaining value go to the landfill. Approximately 60% of everything we remove is diverted from landfills.`,
          `Same-day ${svcLower} is available in ${cityName} for calls placed before noon. We operate 7AM-8PM daily, 7 days a week, 365 days a year. No contracts, no minimums, no recurring charges, no subscription fees. Book when you need us, pay for the time we work, and get credited for everything worth something. It's the way ${svcLower} should work — and in ${cityName}, it finally does.`,
          `Don't overpay for ${svcLower} in ${cityName}. Don't let another company profit from your valuable items without giving you a cut. Call ${PHONE} today and experience the only junk removal service in ${cityName} that actually values your stuff — and values you as a customer.`,
        ],
      },
    ],
    relatedServices,
    category,
  };
}
