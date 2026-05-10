// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { parks, cities, services, getCityUrl, getParkUrl, getServiceUrl, SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

export const metadata: Metadata = {
  title: "Hotel Stretch Service | We Come to Your Room Nationwide | $99/hr",
  description: "Hotel stretch service nationwide. Certified therapists come to your room or meet you at iconic locations. $99/hr, 10% off weekly. Same-day available 7AM-10PM.",
  alternates: { canonical: `${SITE_URL}/hotel-stretching` },
};

const touristParks = parks.filter((p) => p.touristRating >= 4).slice(0, 12);

const topTouristCities = cities.filter((c) =>
  ["new-york-city", "los-angeles", "chicago", "miami", "san-francisco", "las-vegas", "nashville", "austin", "boston", "seattle", "denver", "new-orleans", "san-diego", "phoenix", "atlanta", "portland", "washington-dc", "honolulu", "charleston", "savannah"].includes(c.slug)
).slice(0, 20);

const hotelFaqs = [
  { question: "Do you really come to my hotel room?", answer: "Yes! Our therapists bring a professional massage table, mats, and all necessary equipment directly to your hotel room. We set up in minutes and leave no trace. Works in any hotel room with a flat 8x6ft space." },
  { question: "Can you meet me at a park or tourist location instead?", answer: "Absolutely! We have 315+ iconic locations where we stretch across the United States including Central Park in NYC, Golden Gate Park in SF, Millennium Park in Chicago, and more. You can also split — start at a park and finish at your hotel." },
  { question: "How do I book?", answer: "Just text (888) 734-7274 with your hotel name, city, preferred date/time, and number of people. We will confirm availability instantly. Same-day appointments are usually available." },
  { question: "I am with a group — can you stretch all of us?", answer: "Yes! Group rates are available. Whether it is a family, friends, or business group, we can arrange multiple therapists. Text us with your group size for a custom quote." },
  { question: "What should I wear?", answer: "Comfortable, flexible clothing — athletic wear, yoga pants, or shorts. No jeans or restrictive clothing. We will handle everything else." },
  { question: "Is this safe?", answer: "All our therapists are certified, background-checked, and experienced professionals. We carry insurance and our therapists are vetted extensively." },
  { question: "What cities do you serve?", answer: "We serve 902+ cities across all 50 states. Our most popular tourist destinations include New York, Los Angeles, Miami, Chicago, San Francisco, Las Vegas, Nashville, Austin, Boston, Seattle, Denver, and New Orleans. Text us your hotel and city and we will confirm availability." },
  { question: "What are the best things to do after getting stretched?", answer: "Everything! After a professional stretch service session, your body feels years younger. Hit the town again, go for a run, explore more attractions, or just enjoy the best night of sleep you have had in weeks. That is the beauty of stretch service — it makes everything else better." },
  { question: "How long is a hotel stretch service session?", answer: "Our standard hotel stretch service session is 60 minutes. This includes a brief mobility assessment and a full 50-55 minutes of professional stretching therapy. Sixty minutes is the perfect amount of time to address every major muscle group and leave you feeling completely recovered." },
  { question: "Can I book for multiple days during my trip?", answer: "Absolutely! Multi-day bookings qualify for our 10% weekly discount at $89/session. Many travelers book a session every evening of their trip — it is the ultimate recovery strategy for a vacation packed with things to do. Same therapist for every session." },
  { question: "Do you serve Airbnbs and vacation rentals?", answer: "Yes! We come to any accommodation — hotels, motels, Airbnbs, VRBOs, vacation rentals, condos, or any temporary lodging. As long as there is a flat 6x8 foot area, we can set up and deliver a professional stretch service session." },
  { question: "What time of day is best for a hotel stretch service?", answer: "Most hotel stretch service clients book between 5pm and 9pm — right after returning from a full day of sightseeing or business meetings. However, morning sessions are also popular for travelers who want to start their day feeling limber and ready. We are available 7AM to 10PM daily." },
];

export default function HotelStretchingPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Nationwide Hotel Stretching Service", "Mobile stretching for tourists — we come to your hotel room anywhere in the US.", `${SITE_URL}/hotel-stretching`)} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: SITE_URL }, { name: "Hotel Stretching", url: `${SITE_URL}/hotel-stretching` }])} />
      <JsonLd data={faqSchema(hotelFaqs)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">TRAVELING? WE COME TO YOU</p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Hotel Room Stretch Service — 900+ Cities Nationwide | $99/hr | Same-Day</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Hotel Stretch Service — <span className="text-teal-200">We Come to You</span>
          </h1>
          <p className="mx-auto mt-2 text-3xl font-bold text-white font-heading">$99 PER HOUR | 10% OFF WEEKLY</p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Listen, we know the drill — you fly in, walk around the city all day, hit up all the iconic spots, and by the time you get back to your hotel room, your body is SCREAMING at you. We&apos;ve got you covered! Our certified stretch therapists come directly to your hotel room in {cities.length}+ cities across all 50 states.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE}</span></a>
            <a href={SITE_PHONE_LINK}><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Call {SITE_PHONE}</span></a>
          </div>
        </div>
      </section>

      {/* ═══ WHY TOURISTS NEED STRETCH SERVICE ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Why Every Tourist Needs Hotel Stretch Service</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Travel is one of the most physically punishing things you can do to your body — and most people do not realize it until they are halfway through their trip and can barely walk. The combination of cramped airplane seats, hours of walking on unfamiliar terrain, sleeping in hotel beds your body is not accustomed to, carrying luggage and bags all day, standing in lines for hours, and the general exhaustion of being on the go nonstop creates a perfect storm of muscle tightness, joint stiffness, and accumulated pain. By day three of a typical vacation, most travelers are operating at 50% capacity — limping through the rest of their trip instead of truly enjoying it.
            </p>
            <p>
              This is exactly why hotel stretch service exists. Our certified stretch therapists come directly to your hotel room — any hotel, any Airbnb, any vacation rental in {cities.length}+ cities across all 50 states — with a professional massage table, mats, and all equipment. They deliver 60 minutes of professional <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretch service</Link> that targets the exact pain patterns that travel creates: tight calves and feet from walking all day, compressed lower back from airplane and car seats, stiff neck from sleeping in strange beds, sore shoulders from carrying bags, and overall muscle fatigue from nonstop activity.
            </p>
            <p>
              The difference between a trip with stretch service and a trip without it is dramatic. Travelers who book a hotel stretch service session after their first big day of sightseeing report that they wake up feeling 80-90% recovered — compared to maybe 40-50% without professional stretching. That means day two feels almost as good as day one. And if you book sessions throughout your trip (multi-day bookings qualify for 10% off at $89/session), every single day of your vacation can feel like the first day. No limping, no wincing, no &quot;maybe we should just take it easy today.&quot;
            </p>
            <p>
              At $99 per session, hotel stretch service is one of the smartest investments you can make on any trip. Think about it: you spent hundreds or thousands on flights, hotels, and tickets. You have limited days to experience everything a city has to offer. Why spend half those days at 50% capacity because your body is destroyed? A single stretch service session can be the difference between a good trip and an incredible one. It is the travel hack that nobody talks about but every traveler needs.
            </p>
            <p>
              Our hotel stretch service is available same-day in most cities. Text {SITE_PHONE} with your hotel name, city, and preferred time. We confirm within 30 minutes. A certified therapist arrives at your room within 1-2 hours. They set up in under 5 minutes, deliver 60 minutes of professional stretching, pack up cleanly, and leave you feeling like a completely different person. It is that simple.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Hotel Stretch Service — How It Works Step by Step</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              <strong>Step 1: Text or Call.</strong> Text {SITE_PHONE} with your hotel name, city, preferred date and time, and number of people. You can also call us directly. We respond within minutes and confirm availability within 30 minutes. Same-day appointments are available in most cities.
            </p>
            <p>
              <strong>Step 2: We Assign a Therapist.</strong> We assign a certified stretch therapist in your city who specializes in tourist recovery. They are vetted, certified, insured, and experienced in delivering hotel stretch service sessions. Many of our therapists in popular tourist cities do 3-5 hotel sessions per day — they are experts at this.
            </p>
            <p>
              <strong>Step 3: Therapist Arrives.</strong> Your therapist arrives at your hotel room (or Airbnb, vacation rental, or park meeting point) with a professional massage table, mats, straps, and all necessary equipment. They set up in under 5 minutes. Works in any room with a flat 6x8 foot area.
            </p>
            <p>
              <strong>Step 4: Mobility Assessment.</strong> Your therapist begins with a brief assessment — checking your posture, asking about specific pain points from your day of travel and sightseeing, and identifying the areas that need the most attention. This ensures the session is 100% customized to your current state.
            </p>
            <p>
              <strong>Step 5: 60 Minutes of Recovery Stretching.</strong> For the next 50-55 minutes, your therapist guides your body through professional stretching techniques including <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-700">passive stretching</Link>, <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link>, and <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link>. You remain clothed and comfortable on the massage table. Most hotel clients describe this as the most relaxing 60 minutes of their trip.
            </p>
            <p>
              <strong>Step 6: Feel Amazing.</strong> When your therapist leaves, you feel like a different person. Your legs work again. Your back does not hurt. Your neck is loose. You can actually walk to dinner without wincing. And the next morning? You wake up feeling refreshed and ready for another full day of adventure.
            </p>
          </div>
        </div>
      </section>

      {/* Top Tourist Cities — EXPANDED */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Top 20 Tourist Cities — Hotel Stretch Service</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">These are our most-booked cities for hotel stretch service. After a day of things to do in any of these destinations, text {SITE_PHONE} and we are there.</p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {topTouristCities.map((c) => (
              <Link key={c.slug} href={getCityUrl(c)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{c.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{c.stateAbbr}</p>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{c.description}</p>
                  <p className="mt-2 text-xs text-teal-600 font-medium">Hotel stretch service &rarr;</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THINGS TO DO — EXPANDED ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Things to Do in America&apos;s Top Cities — Then Get Stretched</h2>
          <p className="mt-3 text-base text-slate-600">Every great city has incredible things to do — and every full day of things to do leaves your body wrecked. Here is what to expect in each city and why hotel stretch service is the essential recovery tool.</p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              { city: "New York", desc: "Walk the Brooklyn Bridge. Explore Central Park. Visit the Met, MoMA, and the Statue of Liberty. Shop in SoHo. Walk through Times Square. Eat your way through Chinatown and Little Italy. By 4pm your calves are on fire, your lower back is locked up, and your feet feel like they have been run over. Text us — we will be at your Manhattan, Brooklyn, or Queens hotel within 2 hours for a professional recovery stretch service." },
              { city: "Los Angeles", desc: "Hike to the Griffith Observatory. Walk Venice Beach and the Hollywood Walk of Fame. Explore Santa Monica Pier. Drive PCH. Visit Universal Studios. LA is deceptively physical — people think it is a car city but tourists walk 15,000+ steps per day. Your quads, feet, and lower back need professional stretch service attention." },
              { city: "Chicago", desc: "Navy Pier, Millennium Park, Art Institute, deep dish crawl through Lincoln Park, Magnificent Mile shopping, architectural boat tour. Chicago is a walking city that punishes tourists. Your feet, legs, and back are begging for relief by dinner time. Our Chicago hotel stretch service is one of our most-booked markets." },
              { city: "Miami", desc: "South Beach, Wynwood Walls, Little Havana walking tour, Everglades airboat, Vizcaya Museum. The heat plus the walking is a body-destroying combo. Miami stretch service clients often book multiple sessions because the humidity makes recovery harder without professional help." },
              { city: "San Francisco", desc: "Walk across the Golden Gate Bridge. Fisherman&apos;s Wharf. Cable cars. Lombard Street. Chinatown. Lands End hike. Those hills are no joke — your calves and quads will be screaming. San Francisco hotel stretch service is essential for any tourist navigating this beautiful, punishing city on foot." },
              { city: "Nashville", desc: "Broadway honky-tonks all night, Centennial Park, Country Music Hall of Fame, hot chicken crawl, Ryman Auditorium. Dancing and walking all day takes a serious toll on your body. Nashville is our fastest-growing tourist stretch service market." },
              { city: "Denver", desc: "Red Rocks Amphitheatre, Rocky Mountain National Park day trip, LoDo breweries, 16th Street Mall. The altitude alone makes everything harder — your muscles fatigue faster, you get dehydrated easier, and recovery takes longer. Denver hotel stretch service is a must, especially for visitors from sea level." },
              { city: "Austin", desc: "Sixth Street live music, Lady Bird Lake, Barton Springs, BBQ trails, South Congress shopping. The Texas heat combined with nonstop walking and standing at live music venues creates serious physical fatigue. Austin hotel stretch service is perfect for conference attendees and tourists." },
              { city: "Boston", desc: "Freedom Trail walk (2.5 miles of cobblestones), Fenway Park, Harvard Yard, whale watching from Long Wharf, North End Italian restaurants. Boston is a walker&apos;s city and your body will feel every brick and cobblestone by evening." },
              { city: "Seattle", desc: "Pike Place Market, Space Needle, Chihuly Garden, Pioneer Square, ferry to Bainbridge Island. Seattle&apos;s hills and waterfront boardwalks are beautiful but brutal on your legs. Our Seattle hotel stretch service therapists know exactly how to treat the Pacific Northwest tourist pain pattern." },
            ].map((item) => (
              <div key={item.city} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-teal-700 font-heading">Things to Do in {item.city}</h3>
                <p className="mt-3 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BUSINESS TRAVELER SECTION ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Hotel Stretch Service for Business Travelers</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Business travel is uniquely punishing on the body. You wake up early for a flight. You sit in a cramped airplane seat for hours. You rush to a hotel, change clothes, and spend the day in back-to-back meetings, conference sessions, or trade show floors. You stand for hours at a booth or sit in uncomfortable conference chairs. By evening, your back aches, your neck is stiff, your shoulders are tense, and your brain is fried. Sound familiar?
            </p>
            <p>
              Hotel stretch service is the ultimate recovery tool for business travelers. After your day of meetings, text {SITE_PHONE} and we will send a certified stretch therapist to your hotel room within 1-2 hours. Sixty minutes of professional stretching addresses the physical tension, activates your parasympathetic nervous system for stress relief, and sets you up for a dramatically better night of sleep. The result? You show up to your next day of meetings feeling sharp, energized, and pain-free — while your colleagues are stiff and groggy.
            </p>
            <p>
              Smart companies are now building hotel stretch service into their business travel budgets. The productivity gains from well-rested, pain-free employees more than justify the $99 investment. When an executive is traveling across the country to close a deal, pitch a client, or lead a conference session, being at peak physical and mental performance matters. Hotel stretch service makes that possible. Multi-day business trips qualify for 10% off at $89/session.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FAMILY/GROUP TRAVELERS ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Hotel Stretch Service for Families &amp; Groups</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Traveling with family or a group means everyone is pushing through long days of activity together — but not everyone&apos;s body handles it the same way. Parents are carrying kids and bags. Grandparents are dealing with joint stiffness and fatigue. Teenagers have sore legs from walking more than they are used to. Everyone is sleeping in unfamiliar beds. By day two or three, the group energy is low and tempers are short because everyone is physically miserable.
            </p>
            <p>
              Hotel stretch service for groups changes the dynamic entirely. We can arrange multiple therapists to stretch your entire family or group in one evening. While one person is getting stretched, the others can shower, relax, or get ready for dinner. By the time everyone has had their session, the entire group feels recovered, relaxed, and ready for another amazing day of things to do together. Group rates are available — text {SITE_PHONE} with your group size for a custom quote.
            </p>
          </div>
        </div>
      </section>

      {/* Iconic Park Locations — EXPANDED */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Top Parks &amp; Beaches for Outdoor Tourist Stretch Service</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">Don&apos;t want to stretch in your hotel? We meet you at {parks.length}+ iconic parks, beaches, and outdoor locations across the country. Fresh air and professional stretching is an unbeatable combination.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700 max-w-5xl mx-auto">
            <p>
              Outdoor stretch service is one of our most popular options for tourists. Instead of staying in your hotel room, you meet your therapist at an iconic park or beach where they set up with mats and equipment on a flat grassy area or sandy spot. The combination of fresh air, natural beauty, and professional stretching creates a uniquely restorative experience that hotel room sessions cannot quite match. Many of our tourist clients specifically request outdoor sessions at famous locations as part of their &quot;things to do&quot; itinerary.
            </p>
            <p>
              The most popular outdoor stretch service locations for tourists include Central Park in New York, Golden Gate Park in San Francisco, Millennium Park in Chicago, South Beach in Miami, Griffith Park in Los Angeles, and Zilker Park in Austin. But we serve {parks.length}+ parks and outdoor locations nationwide — from major urban parks to quiet beaches to scenic overlooks. If there is a flat, safe spot to set up, we can stretch you there.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {touristParks.map((p) => (
              <Link key={p.slug} href={getParkUrl(p)}>
                <div className="group rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{p.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{p.city}, {p.state} | {"★".repeat(p.touristRating)}</p>
                  <p className="mt-2 text-xs text-slate-600 line-clamp-2">{p.description}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/parks" className="text-teal-600 font-semibold underline hover:text-teal-700 font-cta">View All {parks.length}+ Parks &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Hotel Stretch Service Pricing</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 font-cta">Single Session</p>
              <p className="mt-4 text-5xl font-bold text-teal-700 font-heading">$99</p>
              <p className="mt-1 text-sm text-slate-500">per 60-minute session</p>
              <ul className="mt-6 space-y-2 text-left text-sm text-slate-600">
                <li>&#10003; We come to your hotel room</li>
                <li>&#10003; All equipment included</li>
                <li>&#10003; Full-body mobility assessment</li>
                <li>&#10003; Same-day available</li>
                <li>&#10003; Any hotel, Airbnb, or rental</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-teal-400 bg-teal-50 p-8 text-center shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-600 font-cta">Multi-Day Trip</p>
              <p className="mt-4 text-5xl font-bold text-teal-700 font-heading">$89</p>
              <p className="mt-1 text-sm text-teal-600 font-semibold">10% OFF for 2+ sessions</p>
              <ul className="mt-6 space-y-2 text-left text-sm text-slate-700">
                <li>&#10003; Everything in Single Session</li>
                <li>&#10003; Book multiple days for 10% off</li>
                <li>&#10003; Same therapist each session</li>
                <li>&#10003; Perfect for long trips</li>
                <li>&#10003; No contracts — cancel anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Hotel Stretch Service FAQ</h2>
          <div className="mt-8 space-y-3">
            {hotelFaqs.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-teal-200/60 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-teal-700 font-heading">{faq.question}</summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ALL SERVICES AVAILABLE ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">All {services.length} Stretch Service Types Available at Your Hotel</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">Our hotel stretch service therapists are trained in all {services.length} professional stretch service techniques. The most popular for tourists are recovery stretching and passive stretching, but your therapist customizes every session based on your assessment.</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link key={s.slug} href={getServiceUrl(s)}>
                <div className="group rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-1">{s.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Book Hotel Stretch Service — $99/hr Nationwide</h2>
          <p className="mt-4 text-lg text-white/80">We come to your hotel room in {cities.length}+ cities. Same-day available. 10% off for multi-day bookings. Your body will thank you.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE}</span></a>
            <a href={SITE_PHONE_LINK}><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Call {SITE_PHONE}</span></a>
          </div>
          <p className="mt-4 text-sm text-teal-200">$99/hr single session | $89/hr multi-day (10% off) | 7AM-10PM daily | Same-day available</p>
        </div>
      </section>
    </>
  );
}
