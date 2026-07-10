import type { Metadata } from 'next'
import Link from 'next/link'
import { homepageContent } from '@/app/site/wash-and-fold-nyc/_lib/seo/content'
import { homepageSchemas, faqSchema } from '@/app/site/wash-and-fold-nyc/_lib/seo/schema'
import JsonLd from '@/app/site/wash-and-fold-nyc/_components/marketing/JsonLd'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'
import FAQSection from '@/app/site/wash-and-fold-nyc/_components/marketing/FAQSection'
import { SERVICES } from '@/app/site/wash-and-fold-nyc/_lib/seo/services'
import { AREAS } from '@/app/site/wash-and-fold-nyc/_lib/seo/data/areas'
import { getNeighborhoodsByArea } from '@/app/site/wash-and-fold-nyc/_lib/seo/locations'

const content = homepageContent()

export const metadata: Metadata = {
  title: { absolute: content.title },
  description: content.metaDescription,
  alternates: { canonical: 'https://www.washandfoldnyc.com' },
  openGraph: { title: content.title, description: content.metaDescription, url: 'https://www.washandfoldnyc.com', siteName: 'The NYC Wash and Fold Service Company', type: 'website', locale: 'en_US' },
}

const homepageFAQs = [
  { question: 'How much does wash and fold cost in NYC?', answer: 'Our wash and fold service is three dollars per pound with a thirty-nine dollar minimum order. This includes sorting every item by color and fabric type, pre-treating every stain individually, washing with premium commercial-grade detergent, tumble drying on the correct heat setting for each fabric, hand-folding every single item, organizing everything by garment type, and packaging your entire order in clean sealed bags. Pickup and delivery is always free on orders over the thirty-nine dollar minimum. If you need your laundry back the same day, rush service is available for an additional twenty dollar flat fee on orders received before ten in the morning. Weekly subscribers save ten percent off every pound, and biweekly subscribers save five percent. The price is the same whether you live on the Upper East Side, in Williamsburg, or in Astoria — no neighborhood surcharges, no zone fees, no surge pricing during busy periods. What you see on our website is exactly what appears on your bill.' },
  { question: 'How does pickup and delivery work?', answer: 'The process is simple. Text or call nine-one-seven, nine-seven-zero, six-zero-zero-two with your address and what you need. We will confirm your order and schedule a pickup time that works for you — most pickups are scheduled within a few hours of your first text. On pickup day, leave your laundry bag at your door, in your building lobby, or with your doorman. Our driver will grab it and send you a text confirmation. Your laundry is transported to our partner facility where it goes through our twelve-step processing system: intake and inventory, sort by color, sort by fabric, stain pre-treatment, wash, dry, hand-fold, organize, package, quality check, and delivery. We deliver your clean, folded laundry back to the same location within twenty-four to forty-eight hours. You will receive text updates at pickup, during processing, and when your order is on its way back. Payment is collected after delivery — we never charge upfront or take deposits. The entire process requires zero effort on your part beyond sending a single text message.' },
  { question: 'What areas do you serve?', answer: 'We serve all of Manhattan, Brooklyn, and Queens — nearly two hundred neighborhoods in total. In Manhattan, this includes the Upper East Side, Upper West Side, Midtown, Chelsea, SoHo, Tribeca, the Financial District, West Village, East Village, Harlem, Washington Heights, Inwood, Murray Hill, Gramercy, and every neighborhood in between. In Brooklyn, we cover Williamsburg, Park Slope, Brooklyn Heights, DUMBO, Bushwick, Greenpoint, Fort Greene, Bed-Stuy, Crown Heights, Prospect Heights, Cobble Hill, Carroll Gardens, Bay Ridge, Sunset Park, and dozens more. In Queens, we serve Astoria, Long Island City, Forest Hills, Jackson Heights, Flushing, Sunnyside, Woodside, Rego Park, Bayside, and every neighborhood across the borough. The rate is three dollars per pound everywhere — no distance surcharges, no delivery zones, no different pricing based on location. A customer in the Financial District pays the exact same rate as a customer in Far Rockaway. You can view our complete neighborhood directory on our locations page.' },
  { question: 'Do you offer dry cleaning?', answer: 'Yes. We offer premium dry cleaning with free pickup and delivery included on every order. Our dry cleaning is handled by trusted local partner cleaners who specialize in professional garment care. We are the pickup and delivery layer — we bring your garments to the cleaners and return them to your door pressed, finished, and in garment bags. Pricing is per item: dress shirts are ten dollars, blouses fourteen dollars, two-piece suits thirty-four dollars, dresses twenty-eight dollars, pants and trousers eighteen dollars, blazers and sport coats twenty-two dollars, winter coats forty-five dollars, down jackets forty-five dollars, sweaters eighteen dollars, ties twelve dollars, skirts eighteen dollars, evening gowns sixty dollars, and wedding dresses three hundred fifty dollars. Every dry cleaning order includes garment bags for protection, a button and minor repair check, and professional pressing and finishing. We offer same-week turnaround on all standard dry cleaning items. Wedding dresses and specialty items may require additional time. You can combine dry cleaning pickup with your regular wash and fold order — we handle it all in one trip.' },
  { question: 'How much are comforters and bulky items?', answer: 'Comforters and bulky items are priced at a flat rate rather than by the pound. Twin comforters are thirty-five dollars, full or queen comforters are forty-five dollars, and king comforters are fifty-five dollars. Duvet covers are twenty dollars, individual pillows are twelve dollars each, mattress pads are twenty-five dollars, and sleeping bags are thirty dollars. All bulky items are washed in commercial-grade oversized machines that most home washers and laundromat machines cannot accommodate, dried with proper airflow to restore maximum loft and fluffiness, and sealed in clean packaging for delivery. We recommend washing comforters and bedding at least twice per year — once in spring and once in fall — to remove dust mites, allergens, pet dander, and accumulated body oils. Pickup and delivery is free on all comforter and bulky item orders, and you can add them to your regular wash and fold pickup at no extra charge.' },
  { question: 'Do you offer subscription plans?', answer: 'Yes, and subscriptions are the best value we offer. Weekly subscribers save ten percent off the standard three-dollar-per-pound rate. The Weekly fifteen pound plan costs one hundred sixty-two dollars per month, which works out to about forty dollars and fifty cents per weekly pickup — a savings of eighteen dollars per month compared to one-time pricing. The Weekly twenty pound plan costs two hundred sixteen dollars per month, saving twenty-four dollars per month. For customers who do not generate enough laundry for weekly service, the Biweekly fifteen pound plan costs eighty-five dollars and fifty cents per month and saves five percent. All subscription plans include a consistent pickup schedule on the same day every week or every other week, the same route driver for every pickup so you build familiarity and trust, priority processing so your order is completed faster than one-time orders, and the ability to pause, skip, or cancel at any time with no fees, no penalties, and no contracts. Most single people find that the fifteen pound weekly plan covers their entire wardrobe plus towels and sheets. Couples typically need the twenty pound plan. Families with children should text us for a custom plan — we can accommodate any volume.' },
  { question: 'Is there a minimum order?', answer: 'Yes, the minimum order for pickup and delivery is thirty-nine dollars, which works out to about thirteen pounds at three dollars per pound. This minimum exists because we provide free pickup and delivery on every order — the driver comes to your door, picks up your bag, and returns it clean and folded. The thirty-nine dollar minimum ensures the economics work for everyone involved. The good news is that most individual orders easily exceed thirteen pounds. A typical week of laundry for a single person weighs ten to fifteen pounds — that is roughly four to five full outfits including underwear and socks, plus a couple of towels and a set of sheets. For couples, weekly laundry typically weighs twenty to twenty-five pounds. For families with children, thirty to fifty pounds or more is common. If you have a smaller load and want to avoid the minimum, you can save it up and schedule a pickup every two weeks instead of every week. Or you can add items like bedsheets, bath mats, dish towels, and throw blankets to push the weight over the threshold.' },
  { question: 'How fast is turnaround?', answer: 'Standard turnaround is twenty-four to forty-eight hours from the time we pick up your laundry. Most orders placed before noon are ready for delivery the following day. Orders placed in the afternoon are typically delivered within two days. If you need your laundry back faster, same-day rush service is available for a flat twenty dollar fee on orders that are picked up or dropped off before ten in the morning. Same-day rush orders are prioritized in our processing queue and delivered by evening the same day. For recurring weekly subscribers, turnaround is typically under twenty-four hours because your order is flagged as a priority from the moment we pick it up. We will always communicate your expected delivery window via text — you will never be left wondering when your laundry is coming back.' },
  { question: 'What payment methods do you accept?', answer: 'We accept credit cards, debit cards, Zelle at hi@washandfoldnyc.com, Venmo, Apple Pay, and cash. For subscription customers, we set up automatic weekly or biweekly billing so you never have to think about payment — it charges automatically after each delivery. For one-time orders, payment is collected upon delivery. We never charge before your laundry is complete. There are no deposits, no pre-authorization holds, and no surprise fees. The amount on your bill is based on the actual weight of your laundry multiplied by three dollars per pound, plus any add-on items like comforters or dry cleaning at their listed flat rates.' },
  { question: 'How do you handle delicates and special items?', answer: 'We sort every load by both color and fabric type before washing. Delicates — silk, lace, cashmere, lingerie, and anything with beading or embellishments — are washed separately in mesh laundry bags on a gentle or hand-wash cycle with cold water. We never put delicates in the dryer unless the care label specifically says tumble dry is safe. Instead, delicate items are laid flat or hung to air dry. If you have specific instructions for any item — cold wash only, no fabric softener, fragrance-free detergent, hang dry, low heat only — just let us know when you schedule your pickup and we will follow your preferences exactly. We also flag any items that appear to be dry-clean-only and set them aside rather than risking damage. If you want us to send those items to our dry cleaning partner, we will coordinate that for you at our standard dry cleaning rates.' },
  { question: 'What if something is damaged or lost?', answer: 'We carry full general liability insurance. In the extremely unlikely event that an item is damaged or lost during our service, contact us within forty-eight hours and we will work with you to resolve it. Our track record on lost items is excellent because we process every customer order in its own separate batch — your laundry never mixes with anyone else at any point in the process. We tag your bag with your name and order number at pickup, maintain that separation through washing, drying, and folding, and cross-check against the intake count before packaging for delivery. That said, we are human and mistakes can happen. If they do, we own them and make them right. Our insurance covers garment replacement at fair market value.' },
  { question: 'Can I request the same person each time?', answer: 'For weekly and biweekly subscription customers, we automatically assign a consistent route driver for every pickup and delivery. This means the same person shows up at your door on the same day every week. They learn your building, your doorman, your preferred drop-off spot, and your preferences. This consistency is one of the biggest benefits of subscribing — you are not dealing with a random stranger every time. For one-time orders, we assign the best available driver based on route efficiency and geography. If you have a strong preference for a specific driver from a previous order, let us know and we will do our best to accommodate.' },
  { question: 'Do you serve businesses?', answer: 'Yes. Our commercial laundry service handles restaurants, hair salons and spas, gyms and fitness studios, Airbnb and short-term rental hosts, medical offices, and corporate offices. Commercial pricing ranges from one dollar to two dollars per pound depending on volume and frequency. We offer daily or weekly pickup schedules, invoice-based billing for accounting convenience, and a dedicated account manager for businesses processing over one hundred pounds per week. Restaurant clients use us for tablecloths, napkins, chef coats, aprons, and kitchen towels. Salons use us for towels, robes, and capes. Gyms use us for member towels and staff uniforms. Airbnb hosts use us for between-guest linen turnovers — sheets, pillowcases, towels, and bath mats. If your business generates laundry, we can handle it at scale with reliable turnaround and consistent quality. Text nine-one-seven, nine-seven-zero, six-zero-zero-two for a custom business quote.' },
  { question: 'How is The NYC Wash and Fold Service Company different from a regular laundromat?', answer: 'Three fundamental differences: convenience, quality, and consistency. A laundromat requires you to physically carry your laundry there, wait for an available machine, load it, come back to switch it to the dryer, wait again, fold everything yourself on a communal table, and carry it all home. That process takes two to three hours of your time and costs two dollars fifty to four dollars per load in machine fees alone — before you buy detergent, fabric softener, and dryer sheets. With The NYC Wash and Fold Service Company, you text a number, leave a bag at your door, and get it back clean, folded, and organized within twenty-four to forty-eight hours. The quality difference is significant. At a laundromat, your clothes are washed in machines that just processed a stranger dirty laundry. You are sorting and folding on a table that hundreds of people have used. Nobody is pre-treating your stains or checking fabric care labels. With us, every order is processed in its own separate batch, stains are pre-treated individually, fabrics are sorted by type and washed on appropriate settings, and every item is hand-folded by a trained professional. The consistency difference matters most over time. With a laundromat, quality depends entirely on your own effort and attention that day. With us, every order goes through the same twelve-step standardized process — the result is identical whether it is your first order or your hundredth.' },
  { question: 'What detergent do you use?', answer: 'We use premium commercial-grade detergent that is more effective than consumer retail brands. It is designed for commercial washing machines that use higher water pressure and longer cycles, which means better cleaning results on every load. If you have a preference for fragrance-free, eco-friendly, plant-based, or hypoallergenic detergent, just tell us when you schedule your pickup. We stock multiple detergent options and accommodate all requests at no additional charge. Some customers with sensitive skin or allergies prefer fragrance-free detergent and no fabric softener — we are happy to follow those instructions on every order. Your preferences are saved in your account so you do not need to repeat them each time.' },
  { question: 'What happens if I am not home for delivery?', answer: 'You do not need to be home. Most customers are not present for either pickup or delivery. We can leave your clean laundry with your doorman or concierge, at your apartment door, inside a vestibule, or in any secure location you designate. Many customers hang a laundry bag on their door handle — we swap the clean bag for the dirty one without any interaction required. For buildings with doormen, we coordinate directly with the front desk. You will always receive a text notification when your laundry has been delivered, including a confirmation of where it was left. If you live in a building without a doorman and are concerned about leaving laundry at your door, we can schedule delivery within a specific time window so you can be there to receive it.' },
  { question: 'How do I get started?', answer: 'Text or call nine-one-seven, nine-seven-zero, six-zero-zero-two with your address and what you need — wash and fold, dry cleaning, comforter cleaning, or a subscription plan. We will confirm pricing, schedule your first pickup, and have a driver at your door as soon as same-day or next-day. There is no app to download, no account to create, no form to fill out, and no contract to sign. Your first order is processed at the same three-dollar-per-pound rate as every other order. If you love it and want to subscribe, we will set that up after your first order. Most customers text us, get a pickup scheduled within a few hours, and have clean folded laundry back at their door within twenty-four to forty-eight hours. The whole thing starts with a single text message.' },
  { question: 'Are you licensed and insured?', answer: 'Yes. The NYC Wash and Fold Service Company is a fully licensed, bonded, and insured business registered in the state of New York. We carry general liability insurance that protects your garments and property on every order. Every team member — drivers, laundry attendants, and route managers — undergoes a comprehensive background check before handling any customer laundry. Our business address is one hundred fifty West Forty-Seventh Street in Midtown Manhattan. We are a real company with a real address, real insurance, and real accountability. We can provide proof of insurance documentation upon request for building managers, landlords, or anyone who requires it.' },
  { question: 'Do you offer gift cards or prepaid packages?', answer: 'Not currently, but we are developing a gift card system. In the meantime, if you want to gift laundry service to someone — a new parent, a college student, someone who just moved to the city — text us the recipient address and we will schedule a pickup for them and bill your payment method. We can also set up a prepaid subscription on someone else behalf. Laundry service is one of the most practical and appreciated gifts you can give to someone living in New York City.' },
  { question: 'What are your hours?', answer: 'We accept pickup and delivery requests seven days a week. Typical pickup windows are seven in the morning to nine in the evening. Same-day rush orders must be scheduled before ten in the morning to guarantee same-day return. Text us at any time — we respond within minutes during operating hours and typically within an hour outside of them. Our processing facilities operate on extended hours to accommodate same-day rush orders and high-volume commercial accounts.' },
]

export default function HomePage() {
  const schemas = [...homepageSchemas(), faqSchema(homepageFAQs)]

  return (
    <>
      <JsonLd data={schemas} />

      {/* ============ HERO ============ */}
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-14 md:pt-20 pb-0">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="text-sky-200/70 text-sm font-medium">5.0 Google Rating</span>
            <span className="text-white/20 hidden sm:inline">|</span>
            <span className="text-sky-200/70 text-sm font-medium">Manhattan &middot; Brooklyn &middot; Queens</span>
          </div>

          <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl lg:text-8xl text-white tracking-wide leading-[0.95] mb-4">
            {content.h1}
          </h1>

          <p className="text-sky-200/70 text-lg max-w-3xl mb-4">
            We pick up your dirty laundry from your door, wash it with premium detergent, dry it on the correct settings, hand-fold every single item, organize it by garment type, package it in sealed clean bags, and deliver it back to your door — fresh, clean, and ready to put away. Nearly two hundred neighborhoods served across <Link href="/boroughs/manhattan" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white transition-colors">Manhattan</Link>, <Link href="/boroughs/brooklyn" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white transition-colors">Brooklyn</Link>, and <Link href="/boroughs/queens" className="text-[#7EC8E3] underline underline-offset-2 hover:text-white transition-colors">Queens</Link>. Three dollars per pound, thirty-nine dollar minimum, free pickup and delivery on every order. Same-day rush available for twenty dollars. Weekly subscribers save ten percent. No contracts, no app, no hassle — just text us your address and we handle the rest.
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6">
            <span className="text-[#7EC8E3] text-sm font-medium">&#10003; $3/lb — every neighborhood, same rate</span>
            <span className="text-[#7EC8E3] text-sm font-medium">&#10003; Free pickup & delivery on all orders</span>
            <span className="text-[#7EC8E3] text-sm font-medium">&#10003; $39 minimum order</span>
            <span className="text-[#7EC8E3] text-sm font-medium">&#10003; Same-day rush +$20</span>
            <span className="text-[#7EC8E3] text-sm font-medium">&#10003; 10% off weekly subscriptions</span>
            <span className="text-[#7EC8E3] text-sm font-medium">&#10003; 24–48 hour standard turnaround</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
            <a href="sms:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">Text (917) 970-6002</a>
            <a href="tel:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">Call (917) 970-6002</a>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div><p className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide">$3/lb</p><p className="text-sky-200/40 text-xs">Wash & Fold</p></div>
              <div><p className="font-[family-name:var(--font-bebas)] text-2xl text-[#7EC8E3] tracking-wide">FREE</p><p className="text-sky-200/40 text-xs">Pickup & Delivery</p></div>
              <div><p className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide">24–48 hrs</p><p className="text-sky-200/40 text-xs">Turnaround</p></div>
              <div className="flex items-start gap-2"><span className="text-yellow-400 text-sm mt-1">&#9733;&#9733;&#9733;&#9733;&#9733;</span><div><p className="font-[family-name:var(--font-bebas)] text-2xl text-white tracking-wide">5.0</p><p className="text-sky-200/40 text-xs">Google Rating</p></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ THE NYC LAUNDRY PROBLEM ============ */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1a3a5c] tracking-wide mb-6">The NYC Laundry Problem — And Why It Costs You More Than You Think</h2>
          <div className="prose prose-lg text-gray-600 leading-relaxed space-y-5">
            <p>If you live in New York City, you already know the laundry situation is broken. Most apartments in Manhattan, Brooklyn, and Queens do not have in-unit washers and dryers. Your building might have a shared laundry room in the basement — if you are lucky — with two machines that are perpetually occupied, out of order, or both. The alternative is hauling your laundry to the nearest laundromat, which in many neighborhoods means carrying forty pounds of dirty clothes several blocks through rain, snow, or ninety-degree heat.</p>
            <p>The laundromat itself is rarely a pleasant experience. You compete for available machines with everyone else in the neighborhood. You feed quarters into machines that may or may not work properly. You wait through a wash cycle, switch everything to a dryer, wait again, then fold on a communal table that has been used by hundreds of strangers that week. The whole process takes two to three hours — and that assumes you do not have to wait for a free machine. On weekends, which is when most people do laundry, the wait can stretch even longer.</p>
            <p>Then there is the cost. A typical laundromat load costs two fifty to four dollars in machine fees — wash and dry combined. Add detergent, fabric softener, and dryer sheets, and you are looking at three to five dollars per load. A single person doing four loads per week spends twelve to twenty dollars on machine fees alone, plus another five to ten on supplies. Over a month, that is sixty-five to one hundred twenty dollars — and you are spending eight to twelve hours of your own time doing the work. When you factor in your time at even a modest hourly value, the true cost of doing your own laundry in NYC is significantly higher than most people realize.</p>
            <p>This is the problem The NYC Wash and Fold Service Company was built to solve. For three dollars per pound with free pickup and delivery, we eliminate every part of the laundry process you hate — the carrying, the waiting, the folding, the wasted time. You text us, we pick up from your door, and we deliver it back clean, folded, and organized. The math works out to roughly the same cost as the laundromat when you include your supplies and time — except you get your evenings and weekends back entirely. That is not a luxury. In a city where time is the most valuable thing you have, it is a practical decision.</p>
          </div>
        </div>
      </section>

      {/* ============ SERVICES ============ */}
      <section className="py-20 bg-[#F0F8FF]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Our Services</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1a3a5c] tracking-wide text-center mb-4">Seven Laundry Services Covering Every Need</p>
          <p className="text-gray-500 text-center max-w-3xl mx-auto mb-12">From everyday <Link href="/services/nyc-wash-and-fold" className="text-[#4BA3D4] underline underline-offset-2">wash and fold</Link> to <Link href="/services/nyc-dry-cleaning" className="text-[#4BA3D4] underline underline-offset-2">professional dry cleaning</Link>, <Link href="/services/nyc-comforter-cleaning" className="text-[#4BA3D4] underline underline-offset-2">comforter cleaning</Link>, and <Link href="/services/nyc-commercial-laundry" className="text-[#4BA3D4] underline underline-offset-2">commercial laundry for businesses</Link> — we handle every type of fabric and every size of order with the same attention to detail. All services include free pickup and delivery across Manhattan, Brooklyn, and Queens. No minimums on dry cleaning or comforter orders when combined with a wash and fold pickup.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map(service => (
              <Link key={service.slug} href={`/services/${service.urlSlug}`} className="group border border-gray-200 rounded-2xl p-7 hover:border-[#4BA3D4] hover:shadow-lg transition-all bg-white">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] tracking-wide mb-2 group-hover:text-[#4BA3D4] transition-colors">{service.name}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{service.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#1a3a5c]">{service.priceRange}</span>
                  <span className="text-sm text-[#4BA3D4]">Details &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="py-20 bg-[#1a3a5c]">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-xs font-semibold text-[#7EC8E3]/60 tracking-[0.25em] uppercase mb-3 text-center">How It Works</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-4">Three Steps From Dirty Laundry to Fresh, Folded Clothes at Your Door</p>
          <p className="text-sky-200/60 text-center max-w-2xl mx-auto mb-12">No app to download, no account to create, no contract to sign. You text us your address and we take it from there. The entire process — from a bag of dirty laundry at your door to clean, perfectly folded clothes delivered back — takes twenty-four to forty-eight hours. Here is exactly how it works, step by step.</p>
          <div className="space-y-8">
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-7">
              <div className="flex items-start gap-5">
                <span className="font-[family-name:var(--font-bebas)] text-5xl text-[#4BA3D4]/30">01</span>
                <div>
                  <p className="font-[family-name:var(--font-bebas)] text-xl text-white mb-2">Text or Call (917) 970-6002</p>
                  <p className="text-sky-200/60 text-sm leading-relaxed">Send us a text with your address and tell us what you need — wash and fold, dry cleaning, comforters, or all of the above. We respond within minutes during business hours. We will confirm your pricing, which is always three dollars per pound for wash and fold with a thirty-nine dollar minimum, and schedule a pickup time that works for your schedule. Most pickups are scheduled within a few hours of your first text. If you are a first-time customer, we will walk you through exactly what to expect so there are no surprises. If you are a returning customer, we already have your address and preferences on file — just say the word and we schedule it.</p>
                </div>
              </div>
            </div>
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-7">
              <div className="flex items-start gap-5">
                <span className="font-[family-name:var(--font-bebas)] text-5xl text-[#4BA3D4]/30">02</span>
                <div>
                  <p className="font-[family-name:var(--font-bebas)] text-xl text-white mb-2">We Pick Up From Your Door — Free</p>
                  <p className="text-sky-200/60 text-sm leading-relaxed">On your scheduled pickup day, leave your laundry bag at your door, in your building lobby, or with your doorman. Our driver arrives during your pickup window, grabs your bag, and sends you a text confirmation that the pickup is complete. You do not need to be home — in fact, most of our customers are at work or out for the day when we pick up. For buildings with doormen, we coordinate directly with the front desk. For walkups, we pick up from your apartment door on any floor. For buildings with package rooms or mail rooms, we can use those as well. The pickup is always free on orders over the thirty-nine dollar minimum. There is no delivery fee, no fuel surcharge, no tip required. Free means free.</p>
                </div>
              </div>
            </div>
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-7">
              <div className="flex items-start gap-5">
                <span className="font-[family-name:var(--font-bebas)] text-5xl text-[#4BA3D4]/30">03</span>
                <div>
                  <p className="font-[family-name:var(--font-bebas)] text-xl text-white mb-2">Delivered Back Clean, Folded & Ready</p>
                  <p className="text-sky-200/60 text-sm leading-relaxed">Your laundry goes through our twelve-step processing system: intake and inventory tagging, color sorting, fabric sorting, individual stain pre-treatment, washing with premium detergent on the correct temperature and cycle for each fabric, drying on appropriate heat settings, hand-folding every item, organizing by garment type, packaging in sealed clean bags, quality checking against the pickup inventory, and delivering back to your door. You receive a text when your order is on its way and another when it has been delivered. Payment is collected after delivery — credit card, Zelle, Venmo, Apple Pay, or cash. We never charge upfront and we never take deposits. You pay only after you have your clean laundry in hand. If you subscribe to a weekly plan, billing happens automatically after each delivery.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-10">
            <a href="sms:9179706002" className="bg-white text-[#4BA3D4] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-sky-50 transition-colors shadow-lg">Text (917) 970-6002 to Start</a>
          </div>
        </div>
      </section>

      {/* ============ DETAILED PRICING ============ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">Transparent Pricing</h2>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1a3a5c] tracking-wide text-center mb-4">Every Price, Right Here — No Hidden Fees, No Surprises</p>
          <p className="text-gray-500 text-center max-w-3xl mx-auto mb-4">We publish every price because we believe you should know exactly what you are paying before you place an order. There are no hidden fees, no surge pricing during busy periods, no different rates for different neighborhoods, and no fine print. The prices below are the prices on your bill. Period. For the complete breakdown with cost comparisons, visit our <Link href="/pricing" className="text-[#4BA3D4] underline underline-offset-2">full pricing page</Link>.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mb-4">Standard Wash & Fold</h3>
              <div className="space-y-3">
                {[['Wash & fold', '$3/lb'], ['Minimum order', '$39'], ['Pickup & delivery', 'Free'], ['Turnaround', '24–48 hours'], ['Same-day rush', '+$20 flat fee']].map(([item, price]) => (
                  <div key={item} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600 text-sm">{item}</span>
                    <span className="font-bold text-[#1a3a5c] text-sm">{price}</span>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-xs mt-4">Includes sorting, stain pre-treatment, premium detergent, hand-folding, and sealed packaging.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mb-4">Subscription Plans — Save Up to 10%</h3>
              <div className="space-y-3">
                {[['Weekly 15 lb', '$162/mo', '10% off — save $18/mo'], ['Weekly 20 lb', '$216/mo', '10% off — save $24/mo'], ['Biweekly 15 lb', '$85.50/mo', '5% off — save $4.50/mo']].map(([plan, price, note]) => (
                  <div key={plan} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600 text-sm">{plan}</span>
                    <div className="text-right"><span className="font-bold text-[#1a3a5c] text-sm">{price}</span><br /><span className="text-[#4BA3D4] text-xs">{note}</span></div>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-xs mt-4">No contracts. Same driver every week. Pause, skip, or cancel anytime.</p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mb-4">Comforters & Bulky Items — Flat Rate</h3>
              <div className="space-y-3">
                {[['Twin comforter', '$35'], ['Full/Queen comforter', '$45'], ['King comforter', '$55'], ['Duvet cover', '$20'], ['Pillow (each)', '$12'], ['Mattress pad', '$25'], ['Sleeping bag', '$30']].map(([item, price]) => (
                  <div key={item} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600 text-sm">{item}</span>
                    <span className="font-bold text-[#1a3a5c] text-sm">{price}</span>
                  </div>
                ))}
              </div>
              <Link href="/services/nyc-comforter-cleaning" className="inline-block mt-4 text-[#4BA3D4] text-sm font-medium underline underline-offset-2">Comforter cleaning details &rarr;</Link>
            </div>

            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mb-4">Dry Cleaning — Premium Pickup & Delivery</h3>
              <div className="space-y-3">
                {[['Dress shirt', '$10'], ['Blouse', '$14'], ['Suit (2-piece)', '$34'], ['Dress', '$28'], ['Pants/trousers', '$18'], ['Blazer/sport coat', '$22'], ['Winter coat', '$45'], ['Down jacket', '$45'], ['Sweater', '$18'], ['Tie', '$12'], ['Skirt', '$18'], ['Evening gown', '$60'], ['Wedding dress', '$350']].map(([item, price]) => (
                  <div key={item} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600 text-sm">{item}</span>
                    <span className="font-bold text-[#1a3a5c] text-sm">{price}</span>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-xs mt-4">Free pickup & delivery. Garment bags included. Same-week turnaround.</p>
              <Link href="/services/nyc-dry-cleaning" className="inline-block mt-2 text-[#4BA3D4] text-sm font-medium underline underline-offset-2">Dry cleaning details &rarr;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ REAL COST BREAKDOWN ============ */}
      <section className="py-20 bg-[#1a3a5c]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide mb-6">What Laundry Actually Costs in NYC — The Real Math</h2>
          <div className="text-sky-100/70 text-sm leading-relaxed space-y-5">
            <p>Most New Yorkers underestimate what laundry costs them because they only count the machine fees. But the true cost includes your time, your supplies, and the opportunity cost of spending two to three hours every week on something a service can handle for you. Here is the honest math for three different scenarios.</p>
            <p><strong className="text-white">Scenario one: Doing it yourself at a laundromat.</strong> A typical single person does three to four loads per week. Each load costs about three dollars in machine fees — one fifty for the washer, one fifty for the dryer. That is nine to twelve dollars per week in machine fees. Add two to three dollars per week for detergent and fabric softener. Add the two to three hours of your time — carrying bags to the laundromat, waiting for machines, switching loads, folding, carrying bags home. At any reasonable value for your time, even fifteen dollars per hour, that is thirty to forty-five dollars of time cost per week. Total real cost: forty to sixty dollars per week. Over a month, that is one hundred sixty to two hundred forty dollars when you include your time.</p>
            <p><strong className="text-white">Scenario two: Using The NYC Wash and Fold Service Company.</strong> The same single person generates about ten to fifteen pounds of laundry per week. At three dollars per pound, that is thirty to forty-five dollars per week — with free pickup and delivery, zero time spent washing, drying, or folding, and every item hand-folded and organized. On a weekly subscription at ten percent off, a fifteen-pound plan costs one hundred sixty-two dollars per month. The total time investment on your end is approximately ninety seconds: sending one text message and leaving a bag at your door.</p>
            <p><strong className="text-white">Scenario three: The couple comparison.</strong> A couple typically generates twenty to twenty-five pounds of laundry per week. At the laundromat, that is five to six loads — fifteen to eighteen dollars in machine fees, three to four hours of combined time, and four to five dollars in supplies. Real cost: seventy to one hundred dollars per week including time value. With The NYC Wash and Fold Service Company, twenty to twenty-five pounds costs sixty to seventy-five dollars per week with zero time. On the weekly twenty-pound plan, you pay two hundred sixteen dollars per month — saving ten percent and eliminating twelve to sixteen hours of laundry time every month. That is three to four hours per week you get back. For most NYC couples, those hours are worth far more than the cost of the service.</p>
            <p><strong className="text-white">The bottom line:</strong> When you factor in your time, laundry service is not more expensive than doing it yourself — it is comparable or cheaper, and you get your entire weekend back. The thirty-nine dollar minimum means even a small order is worth the pickup. And if you subscribe weekly, the ten percent discount makes the math even more favorable. We built this pricing specifically so that the value proposition is obvious for anyone earning more than fifteen dollars an hour. If your time is worth more than that — and in New York City, it almost certainly is — using our service is not a luxury. It is a rational economic decision.</p>
          </div>
        </div>
      </section>

      {/* ============ THE 12-STEP PROCESS ============ */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-4">What Happens to Your Laundry — Our 12-Step Professional Process</h2>
          <p className="text-gray-500 max-w-3xl mb-8">Every order goes through the same twelve-step process from pickup to delivery. No shortcuts, no variations, no exceptions. This is how we deliver consistent results on every single order — your first or your hundredth. Here is each step in detail so you know exactly what happens to your clothes from the moment we pick them up to the moment they arrive back at your door.</p>
          <div className="space-y-4">
            {[
              { n: '01', t: 'Pickup & Intake', d: 'Our driver arrives at your door, lobby, or doorman during your scheduled window. Your bag is collected and immediately tagged with your name and a unique order number. This tag stays with your order through every step of the process. The driver sends you a text confirming the pickup is complete. Your laundry is transported to our processing facility in an insulated, clean vehicle — never in a personal car trunk or mixed with other pickups in a way that could cause cross-contamination.' },
              { n: '02', t: 'Inventory Count', d: 'At the facility, your bag is opened and every item is counted. This intake inventory serves as our baseline — we cross-check against it at delivery to ensure nothing is missing. If we notice any items that appear to be dry-clean-only based on the fabric or care label, we flag them and set them aside. We text you to ask whether you want those items sent to our dry cleaning partner or returned unwashed. This prevents accidental damage to delicate garments.' },
              { n: '03', t: 'Sort by Color', d: 'Your laundry is separated into four color groups: whites, darks, colors, and brights. This prevents color bleeding and ensures that your white shirts stay white, your dark jeans do not stain your light blouses, and your bright colors maintain their vibrancy. Each color group is washed as its own separate load. Yes, this means your fifteen-pound order might require three or four individual wash cycles — that is exactly why the results are better than what you get at a laundromat where everything goes into one machine together.' },
              { n: '04', t: 'Sort by Fabric', d: 'Within each color group, we further sort by fabric weight and care requirements. Delicates — silk, lace, cashmere, anything with beading or embellishments — go into mesh laundry bags for protection. Heavy items like jeans, sweatshirts, and towels are grouped together. Regular-weight items like t-shirts, dress shirts, and underwear are grouped separately. This ensures that every item is washed on the appropriate cycle and temperature for its fabric, extending the life of your clothes.' },
              { n: '05', t: 'Stain Pre-Treatment', d: 'Before any item goes into a machine, we inspect it for stains. Every stain we find is pre-treated individually with the appropriate stain removal solution — enzyme-based treatments for protein stains like food and blood, solvent-based treatments for oil and grease, and oxidizing treatments for tannin stains like coffee, wine, and tea. Pre-treatment happens before the wash cycle because heat from the dryer can permanently set a stain that was not addressed beforehand. This step alone makes a significant difference in results compared to a standard laundromat wash where stains are not inspected.' },
              { n: '06', t: 'Wash', d: 'Each sorted load is washed in a commercial-grade machine with premium detergent at the correct temperature for the fabric type — hot for whites and towels, warm for regular colors, cold for darks and delicates. Our commercial machines operate at higher water pressure and use longer cycles than consumer machines, which produces a deeper clean. If you have requested fragrance-free, eco-friendly, or hypoallergenic detergent, we use that for every load in your order. Your preferences are noted on your order tag so the attendant does not need to guess.' },
              { n: '07', t: 'Dry', d: 'Tumble drying is done on the appropriate heat setting for each fabric. Towels and heavy items go on high heat for maximum fluffiness and bacteria elimination. Regular items go on medium. Delicates go on low heat or are laid flat to air dry, depending on the care label. We never over-dry — that is what causes shrinkage, fading, and fabric damage. Our attendants check items before the end of the cycle and remove anything that is dry early rather than leaving it in to cook.' },
              { n: '08', t: 'Hand-Fold', d: 'This is where the difference between our service and a laundromat becomes most visible. Every single item is hand-folded by a trained professional. Shirts are folded flat into a uniform rectangle. Pants are folded with a crease. Towels are folded into precise thirds. Socks are paired and folded together — never balled. Underwear is folded flat, not rolled or bunched. The standard is the same for every order: when you open your bag, it should look like it came from a high-end retail store.' },
              { n: '09', t: 'Organize by Type', d: 'After folding, items are organized by garment type. Shirts go together, pants together, socks and underwear together, towels and linens separate. This makes putting your laundry away fast and effortless — you can grab the shirts stack and put it directly in a drawer, grab the towels and put them in the linen closet. We have had customers tell us this organization step alone is worth the price of the service because it saves them the twenty to thirty minutes of sorting they used to do after folding.' },
              { n: '10', t: 'Package', d: 'Your folded, organized laundry is placed in clean, sealed bags. The bags are labeled with your name and order number. For customers with multiple loads — a family with items sorted by household member, for example — we can package each person separately. The sealed bag protects your clean laundry during transport and delivery, ensuring it arrives at your door as clean as it was when it left our facility.' },
              { n: '11', t: 'Quality Check', d: 'Before your order goes out for delivery, a quality check is performed. The attendant verifies the item count against the intake inventory to ensure nothing is missing. They inspect the overall quality of the fold — anything that does not meet our standard is re-folded. They confirm that any special instructions on your order were followed. This checkpoint is the last line of defense before your laundry goes on the truck, and it is why our error rate is near zero.' },
              { n: '12', t: 'Delivery', d: 'Your sealed, labeled package is loaded onto a delivery vehicle and routed to your address. You receive a text when your order is on its way. The driver delivers to your door, lobby, doorman, or designated secure location — the same spot where it was picked up. You receive a final text confirming delivery and the exact location where your laundry was left. Payment is collected at this point — credit card, Zelle, Venmo, Apple Pay, or cash. The entire process from pickup to delivery takes twenty-four to forty-eight hours for standard orders, or same-day for rush orders placed before ten in the morning.' },
            ].map(step => (
              <div key={step.n} className="flex items-start gap-5 bg-[#F0F8FF] border border-[#4BA3D4]/10 rounded-xl p-5">
                <span className="font-[family-name:var(--font-bebas)] text-2xl text-[#4BA3D4]/40 leading-none mt-0.5 w-8 flex-shrink-0">{step.n}</span>
                <div>
                  <p className="font-semibold text-[#1a3a5c] text-sm">{step.t}</p>
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHY CHOOSE US ============ */}
      <section className="py-20 bg-[#F0F8FF]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1a3a5c] tracking-wide text-center mb-4">Why Thousands of New Yorkers Trust Us With Their Laundry</h2>
          <p className="text-gray-500 text-center max-w-3xl mx-auto mb-12">There are dozens of laundry services in New York City. Here is why our customers stay with us, why they refer their friends and neighbors, and why our Google rating has been five stars from day one with zero negative reviews.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { t: 'Transparent Pricing With Zero Hidden Fees', d: 'Three dollars per pound. That is the rate. It does not change based on your neighborhood, the time of year, how busy we are, or how much laundry you have. There are no fuel surcharges, no delivery fees, no tip expectations, no minimum that shifts depending on the day, and no extra charge for sorting, stain treatment, or premium detergent. The price on our website is the price on your bill. We also publish our dry cleaning and comforter rates in full — every item, every price — because we believe pricing should be transparent enough that you never need to ask.' },
              { t: 'Free Pickup and Free Delivery on Every Order', d: 'Every order over the thirty-nine dollar minimum includes free pickup and free delivery to any address in Manhattan, Brooklyn, or Queens. We come to your door, your lobby, or your doorman — wherever is most convenient. You never have to carry a laundry bag, hail a cab, wait for a machine, or fold a single shirt. We deliver back to the exact same location within twenty-four to forty-eight hours. For buildings with doormen or concierge services, we coordinate directly with the front desk. For walkups, we come to your floor. The pickup and delivery is genuinely free — it is not built into a higher per-pound price or recovered through hidden fees.' },
              { t: 'Your Laundry Is Processed Separately — Never Mixed', d: 'This is one of the most important things that sets us apart from laundromats and some competitors. Every single customer order is processed in its own separate batch from start to finish. Your clothes are never thrown into a machine with a stranger laundry. We tag your bag with your name and order number at pickup, maintain that separation through sorting, washing, drying, and folding, and cross-check the inventory before packaging. This is how we prevent lost items, cross-contamination, and the kind of quality inconsistency that happens when multiple orders are processed together. It takes longer and costs us more, but it is the right way to do it.' },
              { t: 'Premium Detergent and Professional Equipment', d: 'We use commercial-grade machines and premium detergent — not the cheap stuff from a vending machine dispenser. Every load is sorted by color and fabric type, stains are pre-treated individually with the appropriate solution, and items are dried on the correct heat setting for the fabric. We stock fragrance-free, eco-friendly, and hypoallergenic detergent options for customers with sensitive skin, allergies, or preferences — all at no extra charge. The machines we use operate at higher water pressure and longer cycles than consumer machines, which means deeper cleaning and better results on every load.' },
              { t: 'Hand-Folded by Trained Professionals', d: 'Every single item in your order is hand-folded by a trained team member. Shirts are folded flat and stacked. Pants are creased and laid flat. Towels are folded into uniform thirds. Socks are paired. Underwear is folded, not rolled. Everything is organized by garment type — shirts together, pants together, socks and underwear together, towels separate. When you open your bag, it looks like a display at a department store, not the bottom of a laundromat basket. This is the standard on every order, every time — your first order or your hundredth.' },
              { t: 'Real Human Communication — Not Bots, Not Forms', d: 'When you text nine-one-seven, nine-seven-zero, six-zero-zero-two, you are communicating with a real person. Not a chatbot, not an automated response system, not a form that goes into a queue. A real human reads your message and responds — typically within minutes during business hours. You get text updates at every stage: when your pickup is scheduled, when the driver picks up your bag, when your laundry is being processed, and when it is on its way back to your door. If anything is wrong or you have a question, you text the same number and a real person handles it. This is a deliberate choice. We believe that a service handling your personal belongings should be run by people you can actually talk to.' },
              { t: 'Consistent Quality on Every Single Order', d: 'We use the same twelve-step standardized process on every order: intake, color sort, fabric sort, stain pre-treatment, wash, dry, fold, organize, package, quality check, and deliver. There is no variation in this process from one order to the next, from one day to the next, from one team member to the next. The checklist is the checklist. This consistency is why our quality does not fluctuate — whether it is a Monday morning rush or a quiet Wednesday afternoon, the output is the same. It is also why our Google rating is five-point-zero with zero negative reviews. Consistency compounds over time, and our customers notice.' },
              { t: 'Licensed, Insured, and Background-Checked', d: 'The NYC Wash and Fold Service Company is a fully licensed business registered in New York State with general liability insurance that covers your garments and property on every order. Every team member — drivers, attendants, route managers — passes a background check before handling customer laundry. Our business address is one hundred fifty West Forty-Seventh Street in Midtown Manhattan. We can provide proof of insurance and licensing upon request. We are a real company with real accountability, not a gig-economy platform where anonymous contractors handle your belongings with no oversight or recourse if something goes wrong.' },
              { t: 'Subscription Savings That Actually Add Up', d: 'Weekly subscribers save ten percent on every pound. For a single person doing fifteen pounds per week, that saves eighteen dollars per month. For a couple doing twenty pounds per week, that saves twenty-four dollars per month. Over a year, a couple on the weekly twenty-pound plan saves two hundred eighty-eight dollars — more than a month of free laundry service. And the savings are not the only benefit. Subscribers get a consistent pickup schedule on the same day every week, the same route driver who knows their building and preferences, priority processing so orders are completed faster, and the ability to pause, skip, or cancel at any time with zero penalties. The subscription is the best way to use our service, and the vast majority of our long-term customers are on a plan.' },
            ].map(item => (
              <div key={item.t} className="bg-white border border-gray-200 rounded-2xl p-7">
                <h3 className="font-semibold text-[#1a3a5c] text-base mb-3">{item.t}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ US VS ALTERNATIVES ============ */}
      <section className="py-20 bg-[#1a3a5c]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide text-center mb-4">The NYC Wash and Fold Service Company vs. The Alternatives — An Honest Comparison</h2>
          <p className="text-sky-200/60 text-center max-w-2xl mx-auto mb-10">We are not going to pretend we are the only option. You can do laundry yourself, use a neighborhood laundromat, or try one of the delivery app services. Here is how we stack up on the things that actually matter — price, quality, convenience, and consistency. We will let the numbers speak for themselves.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#4BA3D4]">
                  <th className="text-left py-3 text-sky-200/60 font-medium">Factor</th>
                  <th className="text-center py-3 text-[#7EC8E3] font-bold">The NYC Wash and Fold Service Company</th>
                  <th className="text-center py-3 text-sky-200/40 font-medium">NYC Laundromat</th>
                  <th className="text-center py-3 text-sky-200/40 font-medium">Delivery Apps</th>
                </tr>
              </thead>
              <tbody className="text-sky-100/70">
                {[
                  ['Price (wash & fold)', '$3/lb', '$2.50–$4.00/load + your time', '$3.50–$5.00/lb'],
                  ['Pickup & delivery', 'Free on all orders', 'You carry it both ways', '$5–$10 delivery fee'],
                  ['Turnaround time', '24–48 hours', '2–3 hours of your time', '2–5 business days'],
                  ['Color sorting', 'Every load, always', 'Only if you do it yourself', 'Varies by provider'],
                  ['Stain pre-treatment', 'Included on every item', 'DIY if you remember', 'Varies — often skipped'],
                  ['Hand-folded', 'Every single item', 'You fold it yourself', 'Sometimes, often rolled'],
                  ['Your laundry separated', 'Always — never mixed', 'Communal machines', 'Varies — often batched'],
                  ['Communication', 'Real human via text', 'N/A', 'Chatbot or email queue'],
                  ['Subscription discounts', '10% weekly, 5% biweekly', 'None available', 'Varies — often locked in'],
                  ['Insurance coverage', 'Full general liability', 'None — use at own risk', 'Limited or none'],
                  ['Minimum order', '$39 (about 13 lbs)', 'None (but your time has value)', 'Often $20–$30'],
                  ['Cancel/pause anytime', 'Yes, no penalties', 'N/A', 'Often locked into plans'],
                ].map(([feature, us, laundromat, apps]) => (
                  <tr key={feature} className="border-b border-white/10">
                    <td className="py-3 font-medium text-white">{feature}</td>
                    <td className="py-3 text-center font-semibold text-[#7EC8E3]">{us}</td>
                    <td className="py-3 text-center text-sky-200/40">{laundromat}</td>
                    <td className="py-3 text-center text-sky-200/40">{apps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sky-200/50 text-xs text-center mt-6">Laundromat costs based on NYC average machine fees. Delivery app pricing based on publicly listed rates from major competitors. The NYC Wash and Fold Service Company pricing current as of April 2026.</p>
        </div>
      </section>

      {/* ============ WHO WE SERVE ============ */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-6">Who Uses The NYC Wash and Fold Service Company — And Why They Stay</h2>
          <div className="text-gray-600 leading-relaxed space-y-5">
            <p><strong className="text-[#1a3a5c]">Busy professionals who value their time.</strong> This is our largest customer segment. Lawyers, bankers, doctors, tech workers, consultants, teachers — people who work fifty to sixty hours a week and do not want to spend their limited free time at a laundromat. They text us on Sunday night, leave a bag at their door Monday morning, and have clean folded laundry back by Tuesday evening. The weekly subscription is the most popular option for this group because it automates something they used to dread. Many tell us it is the single best quality-of-life improvement they have made since moving to the city.</p>
            <p><strong className="text-[#1a3a5c]">Couples who split household responsibilities.</strong> Laundry is one of the most common sources of friction in shared living. Who does it, when, and how well. By outsourcing it entirely, couples eliminate the argument. At sixty to seventy-five dollars per week for two people, it costs roughly the same as doing it yourself when you factor in supplies and time — except neither person has to do it. The twenty-pound weekly plan at two hundred sixteen dollars per month is designed specifically for couples.</p>
            <p><strong className="text-[#1a3a5c]">Families with young children.</strong> Kids generate an absurd amount of laundry — stained onesies, school uniforms, sports clothes, bedsheets that need washing multiple times per week, towels, jackets, and the endless stream of socks that somehow lose their partners. Our family customers typically process thirty to fifty pounds per week. At three dollars per pound, that is ninety to one hundred fifty dollars per week. Expensive? Compare it to the eight to twelve hours per week that laundry consumes for a family of four and the math starts making sense. We also sort and package by family member on request, which makes putting laundry away significantly faster.</p>
            <p><strong className="text-[#1a3a5c]">New residents who just moved to NYC.</strong> If you just moved to New York from a city where you had your own washer and dryer, the adjustment to NYC laundry infrastructure is jarring. Most apartments do not have in-unit machines. The building laundry room — if it exists — is often a dungeon with two twenty-year-old machines. The nearest laundromat might be three blocks away. Our service eliminates this entire learning curve. You do not need to find a laundromat, figure out the quarter situation, or compete for machines. You just text us. Many of our new-to-NYC customers tell us they signed up within their first week in the city and never looked back.</p>
            <p><strong className="text-[#1a3a5c]">Airbnb hosts managing turnovers.</strong> Between-guest linen turnovers are time-critical and labor-intensive. Sheets, pillowcases, towels, bath mats, and kitchen linens all need to be washed, dried, folded, and restocked before the next guest checks in — often within a three to four hour window. Our Airbnb linen service is designed for exactly this scenario. We pick up dirty linens at checkout and deliver fresh ones before check-in. Same-day turnaround is available when scheduled in advance. Most hosts pass the laundry cost through as part of their cleaning fee and use our service as a reliable logistics partner rather than trying to do it themselves.</p>
            <p><strong className="text-[#1a3a5c]">Elderly or mobility-limited residents.</strong> For residents who have difficulty carrying laundry bags, navigating stairs, or standing at a folding table, our door-to-door service removes the physical burden entirely. We pick up and deliver to the apartment door — no stairs, no carrying, no trips to the basement or laundromat. Several of our customers are elderly residents whose children set up a weekly subscription so their parent always has clean laundry without the physical strain. The same-driver consistency of our subscription plans is especially valued by this group because it creates a familiar, trusted routine.</p>
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="py-20 bg-[#1a3a5c]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold text-[#7EC8E3]/60 tracking-[0.25em] uppercase mb-3 text-center">Customer Reviews</p>
          <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide text-center mb-12">Real Reviews From Real NYC Customers</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { text: 'Best wash and fold in the city. My clothes come back perfectly folded every single time. The free pickup and delivery is what sold me — I literally never have to leave my apartment. I used to waste entire Saturdays at the laundromat hauling bags down four flights of stairs. Now I text them, leave a bag at my door, and it comes back clean and folded the next day. The price is fair, the quality is consistent, and the communication is excellent. Five stars, no hesitation.', name: 'Rachel K.', location: 'Upper West Side' },
              { text: 'I switched from doing my own laundry and the difference is night and day. They actually separate colors, use quality detergent, and fold everything neatly. My shirts come back crisp, my towels are fluffy, and nothing has ever been damaged or lost. At three dollars a pound, it costs me about fifty bucks a week for two people. That is absolutely worth it when you factor in the time, quarters, detergent, and energy I used to spend. I have recommended them to everyone in my building.', name: 'David T.', location: 'Williamsburg' },
              { text: 'I run two Airbnb units in Park Slope and they handle all my linens and towels between guest turnovers. Fast turnaround, always spotless, and they fold the towels exactly how I need them for photos. Before I found them, I was doing six loads of laundry between every checkout and check-in. Now I just text, they pick up the dirty linens at checkout, and deliver fresh ones before the next guest arrives. They have never missed a turnaround.', name: 'Tyler B.', location: 'Park Slope' },
              { text: 'As a nurse working twelve-hour shifts, the last thing I want to do when I get home is laundry. Scrubs, sheets, towels — it all piles up fast. I signed up for the weekly fifteen-pound plan and it has genuinely changed my quality of life. Every Monday they pick up my bag and by Tuesday evening it is back at my door, clean, folded, and ready to put away. The subscription saves me ten percent and I never run out of clean scrubs.', name: 'Danielle F.', location: 'Murray Hill' },
              { text: 'We are a family of four with two kids under five. The amount of laundry we generate is absurd. We were spending every Sunday doing six or seven loads. Now we do the weekly twenty-pound plan and it covers almost everything. They handle the stains, they fold the tiny clothes, and they package everything by family member. The monthly cost is less than what we spent on detergent, dryer sheets, and machine time. Best decision we have made since moving to the city.', name: 'Kevin & Laura W.', location: 'Astoria' },
              { text: 'I moved to NYC from Austin last year and dreaded the laundromat situation. My building has a shared laundry room with two machines that are always broken or occupied. A coworker told me about The NYC Wash and Fold Service Company and it solved the problem completely. I leave my bag with the doorman on my way to work, and it is back by the time I get home. The first time I opened a bag of perfectly folded laundry that I did not have to wash, dry, or fold myself, I almost cried.', name: 'Olivia M.', location: 'Long Island City' },
            ].map(t => (
              <div key={t.name} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                <p className="text-sky-100/70 text-sm leading-relaxed mt-4 mb-6">&ldquo;{t.text}&rdquo;</p>
                <p className="font-semibold text-white text-sm">{t.name}</p>
                <p className="text-sky-200/40 text-xs">{t.location}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SERVICE AREAS ============ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-4">Serving Nearly 200 NYC Neighborhoods — Same Rate Everywhere</h2>
          <p className="text-gray-500 text-center max-w-3xl mx-auto mb-12">Three dollars per pound with free pickup and delivery to every neighborhood we serve. No distance surcharges, no zone fees, no different rates based on where you live. A customer on the Upper East Side pays exactly the same as a customer in Flushing. <Link href="/locations" className="text-[#4BA3D4] underline underline-offset-2">View all locations</Link>.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AREAS.map(area => {
              const neighborhoods = getNeighborhoodsByArea(area.slug)
              return (
                <Link key={area.slug} href={`/boroughs/${area.slug}`} className="group border border-gray-200 rounded-2xl p-8 hover:border-[#4BA3D4] hover:shadow-lg transition-all text-center">
                  <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide group-hover:text-[#4BA3D4] transition-colors">{area.name}</h3>
                  <p className="text-[#4BA3D4] font-bold text-lg mt-1">{neighborhoods.length} neighborhoods</p>
                  <p className="text-gray-500 text-sm mt-2">{area.description}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-1">
                    {neighborhoods.slice(0, 8).map((n, i) => (
                      <span key={n.slug} className="text-xs text-gray-400">{n.name}{i < 7 ? ',' : ''}</span>
                    ))}
                    {neighborhoods.length > 8 && <span className="text-xs text-[#4BA3D4]">+{neighborhoods.length - 8} more</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ COMMERCIAL ============ */}
      <section className="py-20 bg-[#F0F8FF]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-4">Commercial Laundry for NYC Businesses</h2>
          <p className="text-gray-500 text-center max-w-3xl mx-auto mb-12">Restaurants, salons, gyms, Airbnb hosts, and offices use our commercial laundry service for reliable, consistent, and affordable bulk laundering. Commercial pricing ranges from one dollar to two dollars per pound depending on volume and frequency. We handle everything from restaurant tablecloths to gym towels to Airbnb linen turnovers. <Link href="/services/nyc-commercial-laundry" className="text-[#4BA3D4] underline underline-offset-2">Learn more about commercial laundry</Link>.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { t: 'Restaurants & Cafes', d: 'Tablecloths, napkins, chef coats, aprons, kitchen towels, and bar rags. We handle grease stains and food residue with commercial-grade pre-treatment. Daily or weekly pickup schedules available. Your linens are always spotless and ready for the next service. Most restaurant clients process fifty to two hundred pounds per week at one dollar to one dollar fifty per pound.' },
              { t: 'Hair Salons & Spas', d: 'Towels, robes, capes, sheets, pillowcases, and uniforms. We remove product buildup, hair color stains, and oils that standard home washing cannot handle. Recurring weekly or biweekly schedules ensure you never run out of fresh towels in the middle of a busy day. Salon clients typically process thirty to one hundred pounds per week.' },
              { t: 'Gyms & Fitness Studios', d: 'Member towels, yoga mat covers, staff uniforms, shower mats, and cleaning cloths. High-volume capacity for studios that go through hundreds of towels per week. We sanitize gym towels with hot water commercial cycles and commercial detergent that eliminates bacteria and odor. Next-day turnaround available on all gym laundry.' },
              { t: 'Airbnb & Short-Term Rentals', d: 'Sheets, pillowcases, duvet covers, towels, bath mats, and kitchen linens turned over between guests. Same-day turnaround on linen packages when scheduled in advance. We fold towels to hotel standard and package everything by unit for easy restocking. Most hosts process twelve to twenty pounds per turnover at one dollar fifty to two dollars per pound.' },
            ].map(biz => (
              <div key={biz.t} className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold text-[#1a3a5c] text-sm mb-3">{biz.t}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{biz.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BUILDINGS ============ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-4">Laundry Service for Every NYC Building Type</h2>
          <p className="text-gray-500 text-center max-w-3xl mx-auto mb-12">Whether you live in a luxury high-rise with a concierge, a doorman building in Midtown, a walkup in the East Village, or student housing near NYU — we have a pickup and delivery solution that works with your building. We coordinate with doormen, concierges, building managers, and super staff to make laundry seamless for residents. <Link href="/buildings" className="text-[#4BA3D4] underline underline-offset-2">View building packages</Link>.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Luxury & Doorman Buildings', desc: 'White-glove service with concierge coordination and lobby pickup. Leave your bag with the front desk and we handle the rest. Volume discounts for buildings that sign up ten or more units. Perfect for buildings that want to offer laundry service as an amenity for residents.', href: '/buildings/luxury-buildings' },
              { name: 'Walkups & Low-Rises', desc: 'We come directly to your apartment door on any floor. No need to carry bags downstairs. Schedule a consistent weekly pickup time and your driver will know exactly where to go. Ideal for walkup residents who currently trek to a laundromat because their building has no machines.', href: '/buildings/doorman-buildings' },
              { name: 'Student Housing & Dorms', desc: 'Affordable three dollar per pound rate with flexible scheduling that works around class times and exam periods. Pickup from dorm lobbies, package rooms, or building entrances. End-of-semester deep clean packages available for move-out. Skip the crowded basement laundry room forever.', href: '/buildings/student-housing' },
            ].map(bt => (
              <Link key={bt.name} href={bt.href} className="group bg-[#F0F8FF] border border-gray-200 rounded-2xl p-8 hover:border-[#4BA3D4] hover:shadow-lg transition-all">
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] tracking-wide group-hover:text-[#4BA3D4] transition-colors">{bt.name}</h3>
                <p className="text-gray-500 text-sm mt-3 leading-relaxed">{bt.desc}</p>
                <p className="text-[#4BA3D4] text-sm font-medium mt-4">Learn more &rarr;</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CAREERS & PARTNERS ============ */}
      <section className="py-20 bg-[#F0F8FF]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mb-3">Join the NYC Wash and Fold Service Company Team — We Are Hiring</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">We are actively hiring pickup and delivery drivers, laundry attendants, and route managers across Manhattan, Brooklyn, and Queens. Pay ranges from eighteen to twenty-two dollars per hour depending on the position, with flexible scheduling, weekly pay, and growth opportunities. No prior laundry industry experience required — we train everyone who joins the team. If you are reliable, detail-oriented, and want a job with a growing company that values your time and treats you well, we want to hear from you.</p>
              <Link href="/careers" className="text-[#4BA3D4] font-medium text-sm underline underline-offset-2">View open positions &rarr;</Link>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mb-3">Laundromat Owners — Partner With Us</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">Own a laundromat in Manhattan, Brooklyn, or Queens? We are looking for processing partners. The model is straightforward: we send you customers, you wash the laundry at your facility, and we handle everything else — marketing, customer acquisition, pickup and delivery logistics, billing, and customer service. You process at your normal rate of one to one dollar fifty per pound. We charge customers three dollars per pound and handle the entire customer relationship. You focus on what you do best — running machines and producing clean laundry — while we bring you consistent, growing volume with zero marketing cost on your end.</p>
              <Link href="/partners" className="text-[#4BA3D4] font-medium text-sm underline underline-offset-2">Learn about partnership &rarr;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <FAQSection faqs={homepageFAQs} title="Frequently Asked Questions About NYC Wash and Fold Laundry Service" />

      {/* ============ FINAL CTA ============ */}
      <CTABlock title="Ready for Fresh, Folded Laundry at Your Door?" subtitle="Text or call (917) 970-6002 — $3/lb, free pickup & delivery, 24-48 hour turnaround across Manhattan, Brooklyn & Queens." />
    </>
  )
}
