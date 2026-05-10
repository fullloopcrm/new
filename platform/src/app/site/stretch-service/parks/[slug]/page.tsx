// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { parks, findParkBySlug, getParkUrl, services, states, getCitiesByState, SITE_URL, SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema, parkSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

interface Props { params: Promise<{ slug: string }> }

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() {
  return parks.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const park = findParkBySlug(slug);
  if (!park) return {};
  return {
    title: `Stretch Service at ${park.name} | Outdoor ${park.city}, ${park.state} | $99/hr`,
    description: `Outdoor stretch service at ${park.name}, ${park.city}, ${park.state}. Meet our therapists at this iconic location. $99/hr, 10% off weekly. Same-day available.`,
    alternates: { canonical: `${SITE_URL}${getParkUrl(park)}` },
  };
}

export default async function ParkPage({ params }: Props) {
  const { slug } = await params;
  const park = findParkBySlug(slug);
  if (!park) notFound();

  const pageUrl = `${SITE_URL}${getParkUrl(park)}`;
  const otherParks = parks.filter((p) => p.slug !== slug && p.touristRating >= 3).slice(0, 12);
  const nearbyParks = parks.filter((p) => p.slug !== slug && p.stateSlug === park.stateSlug).slice(0, 6);
  const stateCities = getCitiesByState(park.stateSlug).slice(0, 12);

  const faqItems = [
    { question: `Can I really get a stretch at ${park.name}?`, answer: `Yes! Our certified stretch therapists meet you at ${park.name} in ${park.city}, ${park.state} with all necessary equipment. Best spot: ${park.bestSpot}. We recommend outdoor stretching sessions in good weather — it is an incredible experience. Our stretch service therapists bring professional mats, straps, resistance bands, and bolsters so you have everything needed for a world-class outdoor session. Just text us at (888) 734-7274 to book your session at this location.` },
    { question: `How much does outdoor stretching at ${park.name} cost?`, answer: `Same pricing as all our stretch service sessions: $99 for 60 minutes, or $89/session for weekly clients (10% discount). We bring everything — you just show up and stretch. There are no hidden fees, no surcharges for outdoor locations, and no extra charges for equipment. The $99/hr rate includes travel to ${park.name}, all professional equipment, a full mobility assessment, and a personalized 60-minute session.` },
    { question: `What if the weather is bad?`, answer: `If weather does not cooperate, we can easily move the session to your nearby home, office, or hotel. Just text us and we will adjust. We are flexible (pun intended). Many of our clients in ${park.city} keep a backup indoor location in mind when they book outdoor stretch service sessions. We can also reschedule for the next available slot at no charge if you give us at least 4 hours notice.` },
    { question: `Is stretching at ${park.name} good for tourists?`, answer: `Absolutely! ${park.name} is one of ${park.city}&apos;s most iconic locations. After walking all day exploring, a professional stretch session here is the perfect way to recover while enjoying the scenery. We also come to hotels. Tourists who have been walking 20,000+ steps exploring things to do in ${park.city} find that a 60-minute stretch service session completely revitalizes their legs, back, and feet. It is the best recovery activity for travelers.` },
    { question: `What are the best things to do near ${park.name}?`, answer: `${park.nearbyAttractions.length > 0 ? `Near ${park.name} you can visit ${park.nearbyAttractions.join(", ")}. After exploring all these things to do in ${park.city}, book a stretch service session to recover.` : `${park.city} is full of incredible things to do. After a day of exploring, book a stretch service session at ${park.name} or at your hotel to recover.`} Whether you are a first-time visitor or a local resident, combining sightseeing with professional stretching creates the perfect day. Explore in the morning, stretch in the afternoon, and feel amazing for dinner.` },
    { question: `What should I wear for an outdoor stretch service session?`, answer: `Wear comfortable, stretchy clothing — athletic wear, yoga clothes, or anything that allows full range of motion. Avoid jeans, belts, or restrictive clothing. For outdoor sessions at ${park.name}, we also recommend wearing sunscreen and bringing water. Sneakers or athletic shoes are fine, though you will likely remove your shoes during the session. Our therapists bring all equipment including professional mats, so you do not need to worry about the ground surface.` },
    { question: `How do I book a stretch service session at ${park.name}?`, answer: `The fastest way to book is to text us at (888) 734-7274. Just mention you want an outdoor session at ${park.name} in ${park.city}, ${park.state} and your preferred date and time. We will match you with an available stretch service therapist who knows this location well. Same-day appointments are often available, especially on weekday mornings and afternoons. You can also call (888) 734-7274 or email hello@stretchservice.com.` },
    { question: `Is outdoor stretching as effective as indoor stretching?`, answer: `Yes — and many clients say it is even better. The combination of fresh air, natural surroundings, and professional stretch therapy creates an enhanced experience. Studies show that outdoor physical activity reduces cortisol levels more effectively than indoor exercise. At ${park.name}, you get the mental health benefits of being in nature combined with the physical benefits of professional assisted stretching. The $99/hr rate is the same regardless of indoor or outdoor location.` },
    { question: `Can I bring a friend to my stretch service session at ${park.name}?`, answer: `Absolutely. If you want to bring a friend, we can schedule back-to-back sessions or arrange for two therapists to work simultaneously. Group sessions at ${park.name} are popular for couples, friends visiting ${park.city} together, and small corporate outings. Each person gets their own therapist and mat for a full 60-minute session. Group sessions at outdoor locations like ${park.name} are one of the most unique wellness experiences you can have.` },
    { question: `Do you offer stretch service sessions at ${park.name} year-round?`, answer: `We offer outdoor stretch service sessions at ${park.name} whenever weather permits. In ${park.city}, ${park.state}, this typically means spring through fall for the best outdoor conditions. During colder months or inclement weather, we recommend booking your session at a nearby hotel, home, or office instead. Our therapists are available 7AM to 10PM, seven days a week, 365 days a year — the location is flexible, even when the weather is not.` },
  ];

  return (
    <>
      <JsonLd data={webPageSchema(`Stretch at ${park.name}`, park.description, pageUrl)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Parks & Iconic Locations", url: `${SITE_URL}/parks` },
        { name: park.name, url: pageUrl },
      ])} />
      <JsonLd data={parkSchema(park.name, park.state, park.description, pageUrl)} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            <Link href="/parks" className="hover:text-white">Parks & Iconic Locations</Link>{" / "}{park.city}, {park.state}
          </p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Outdoor Stretch Service — {park.city}, {park.state} | $99/hr | {"★".repeat(park.touristRating)}</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Stretch Service at <span className="text-teal-200">{park.name}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">{park.description} Best stretch spot: {park.bestSpot}. Things to do in {park.city} — get stretched at this iconic location. $99/hr mobile stretch service.</p>
          <p className="mx-auto mt-2 text-base text-teal-200 font-semibold">$99/hr &middot; 10% Off Weekly &middot; Same-Day Available</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE} — Book This Spot</span></a>
            <Link href="/pricing"><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">View Pricing</span></Link>
          </div>
        </div>
      </section>

      {/* Deep Description */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">About Stretching at {park.name}</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              {park.name} in {park.city}, {park.state} is one of the best outdoor stretch service locations in the country. Our certified stretch therapists meet you right here with all professional equipment — mats, straps, resistance bands, and everything needed for a world-class outdoor stretching session. The combination of fresh air, natural surroundings, and professional stretch therapy creates an experience that is truly unmatched. When you book a stretch service session at {park.name}, you are choosing one of the most unique wellness experiences available anywhere in the United States.
            </p>
            <p>
              {park.description} This makes {park.name} an ideal location for outdoor assisted stretching. The natural beauty of this location adds a meditative quality to your session that you simply cannot replicate in a studio or gym. Our stretch service therapists know exactly where to set up at {park.name} for the best experience — flat ground, adequate shade when available, and enough space for a full range of stretching movements. Every detail is considered so you can focus entirely on your body and your stretch.
            </p>
            <p>
              Whether you are a tourist who just spent the day exploring things to do in {park.city} and your body is exhausted, or a local who wants to combine their park visit with professional stretching — this is the spot. After 20,000 steps of sightseeing, a 60-minute stretch service session at {park.name} will have you feeling completely refreshed and ready for more adventures. The recovery benefits of professional assisted stretching after a day of walking are extraordinary. Most clients report that their legs feel completely renewed, their back pain disappears, and they have energy for the rest of their evening.
            </p>
            <p>
              Our therapists know {park.name} inside and out. The best spot for stretch service sessions is: {park.bestSpot}. This area provides the ideal combination of flat ground, shade (when available), and a beautiful setting for your stretch. Of course, if you prefer, we can also come to your nearby hotel, Airbnb, or home instead. The flexibility of our mobile stretch service means you are never locked into one location. If the weather changes, if the park is too crowded, or if you simply change your mind — we adapt. Just text (888) 734-7274 and we will make it work.
            </p>
            <p>
              Professional outdoor stretching at {park.name} is popular with a wide range of clients. Tourists recovering from long days of sightseeing, athletes using the park for their training runs, office workers on lunch breaks, seniors enjoying the outdoors, and wellness enthusiasts who want to combine nature with professional bodywork. No matter your age, fitness level, or flexibility — our stretch service therapists customize every session to your specific body and goals. A session designed for a 25-year-old marathon runner looks completely different from a session designed for a 70-year-old retiree, and our therapists excel at both.
            </p>
            <p>
              The science behind outdoor stretching supports what our clients already know from experience. Research published in the International Journal of Environmental Research and Public Health shows that outdoor physical activity reduces cortisol (the stress hormone) by 12-15% more than equivalent indoor activity. When you combine this stress-reduction benefit with the proven flexibility and pain-relief benefits of professional assisted stretching, you get a wellness experience that addresses both your mental and physical health simultaneously. At $99/hr for a session at {park.name}, it is one of the best investments you can make in your overall wellbeing.
            </p>
          </div>
        </div>
      </section>

      {/* Things to Do / Tourist Angle */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Things to Do at {park.name} — Plus Recovery Stretching</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              {park.name} is one of the top destinations in {park.city}, {park.state} for both tourists and locals. {park.nearbyAttractions.length > 0 ? `Visitors flock here to explore nearby attractions like ${park.nearbyAttractions.slice(0, 4).join(", ")}${park.nearbyAttractions.length > 4 ? `, and more` : ""}.` : `Visitors come here for the natural beauty, outdoor recreation, and the unique atmosphere that makes this location a must-visit in ${park.city}.`} Whether you are spending a full day at {park.name} or combining it with other things to do in {park.city}, your body will thank you for booking a stretch service session to cap off your adventure.
            </p>
            <p>
              Most visitors to {park.name} spend hours on their feet — walking, hiking, exploring, and taking in the sights. By the time you have covered even half of what this incredible location has to offer, your calves are tight, your lower back is stiff, your shoulders are tense from carrying a bag, and your feet are aching. This is exactly where professional stretch service makes the biggest impact. A 60-minute assisted stretching session targets all of these problem areas and leaves you feeling like a completely new person. Tourists who book a stretch service session after exploring {park.name} consistently tell us it was the highlight of their trip.
            </p>
            <p>
              If you are visiting {park.city} for the first time, we recommend combining your {park.name} visit with a professional stretch service session. Explore the area in the morning, grab lunch at a nearby restaurant, and then meet your stretch therapist for an afternoon session right here at the park — or at your hotel if you prefer. This creates the perfect day: sightseeing, great food, and professional bodywork that leaves your muscles completely restored. You will sleep better that night and wake up ready for another full day of exploring things to do in {park.city}.
            </p>
            <p>
              For locals who visit {park.name} regularly, a weekly stretch service session at this location is the ultimate self-care ritual. Imagine ending your Saturday morning park walk with a professional 60-minute stretch under the trees. Weekly clients pay just $89/session (10% off the regular $99/hr rate) and get priority scheduling, same-therapist continuity, and the cumulative benefits of consistent professional stretching. It is the kind of routine that transforms how your body feels every single day.
            </p>
          </div>
          {park.nearbyAttractions.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Nearby Attractions — Things to Do</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {park.nearbyAttractions.map((a) => (
                  <span key={a} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 border border-teal-200/60">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* What a Session Looks Like */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">What a Stretch Service Session at {park.name} Looks Like</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              When you book a stretch service session at {park.name}, here is exactly what to expect. Your certified stretch therapist arrives at the designated meeting spot — {park.bestSpot} — with all professional equipment in tow. They carry a high-quality stretch mat, resistance straps, bolsters, and any accessories needed for your session. Setup takes about 2-3 minutes, and then your 60-minute session begins.
            </p>
            <p>
              The first 5-10 minutes of every session is a mobility assessment. Your therapist evaluates your current range of motion, identifies areas of tightness and restriction, asks about any pain or injuries, and discusses your goals for the session. This assessment ensures that every minute of hands-on stretching is targeted and effective. Whether you need lower back relief after hiking, leg recovery after walking all day, or a full-body stretch for general wellness — your therapist builds the session around your specific needs.
            </p>
            <p>
              The remaining 50-55 minutes are dedicated to professional assisted stretching. Your therapist uses a combination of PNF stretching, passive stretching, active stretching, and myofascial release techniques to systematically work through your entire body — or focus deeply on your problem areas. You will feel muscles release that you did not even know were tight. The outdoor setting at {park.name} adds an element of relaxation that enhances every stretch. Fresh air fills your lungs, natural sounds replace the noise of a gym, and the beauty of {park.city} surrounds you.
            </p>
            <p>
              At the end of your session, your therapist provides post-session recommendations — self-stretches you can do at your hotel or home, hydration tips, and suggestions for your next session. Many clients at {park.name} feel so good that they book their next appointment before they even leave the mat. And at $99/hr — with no hidden fees and no tipping required — it is one of the most affordable luxury wellness experiences in {park.city}.
            </p>
          </div>
          <div className="mt-8 rounded-xl border-l-4 border-teal-500 bg-teal-50 p-6">
            <h3 className="text-lg font-bold text-teal-800 font-heading">Best Stretch Spot at {park.name}</h3>
            <p className="mt-2 text-base text-teal-900/80">{park.bestSpot}</p>
          </div>
        </div>
      </section>

      {/* Tourist Rating */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Tourist Appeal</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">{"★".repeat(park.touristRating)}</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Location</p>
              <p className="mt-1 text-lg font-bold text-teal-700">{park.city}, {park.state}</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Price</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">$99/hr</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Hours</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">7-10</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Stretch Services Available at {park.name}</h2>
          <p className="mt-3 text-base text-slate-600">Every stretch service technique below can be performed outdoors at {park.name}. Our therapists are certified in all modalities and will recommend the best approach for your body and goals. All services are $99/hr with 10% off for weekly clients.</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`}>
                <div className="group rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{s.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">FAQ: Stretch Service at {park.name}</h2>
          <p className="mt-3 text-base text-slate-600">Everything you need to know about booking a professional stretch service session at {park.name} in {park.city}, {park.state}.</p>
          <div className="mt-8 space-y-3">
            {faqItems.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-teal-200/60 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-teal-700 font-heading">{faq.question}</summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Nearby City Links */}
      {stateCities.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Stretch Service in {park.state} Cities</h2>
            <p className="mt-3 text-center text-base text-slate-600">Book a stretch service session in any of these {park.state} cities. $99/hr, same-day available, 7AM-10PM daily.</p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {stateCities.map((c) => (
                <Link key={c.slug} href={`/locations/${c.stateSlug}/${c.slug}`}>
                  <div className="group rounded-lg border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{c.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{c.stateAbbr}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Other Parks */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Other Iconic Stretch Service Locations</h2>
          <p className="mt-3 text-center text-base text-slate-600">Outdoor stretch service sessions are available at parks and iconic locations across the country. $99/hr everywhere.</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {otherParks.map((p) => (
              <Link key={p.slug} href={getParkUrl(p)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{p.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{p.city}, {p.state}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/parks" className="text-teal-600 font-semibold underline hover:text-teal-700 font-cta">View All Parks &amp; Iconic Locations &rarr;</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Book Your Stretch Service Session at {park.name}</h2>
          <p className="mt-4 text-lg text-white/80">Text us to book an outdoor stretch session at {park.name} in {park.city}, {park.state}. $99/hr with all equipment included. Or we&apos;ll come to your hotel — your call.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE}</span></a>
            <Link href="/hotel-stretching"><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Hotel Stretching</span></Link>
          </div>
          <div className="mx-auto mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/services" className="rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 transition-colors">All Services</Link>
            <Link href="/pricing" className="rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 transition-colors">Pricing</Link>
            <Link href="/faq" className="rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 transition-colors">FAQ</Link>
            <Link href="/corporate-wellness" className="rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 transition-colors">Corporate</Link>
            <Link href="/discounts" className="rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 transition-colors">Discounts</Link>
            <Link href="/about" className="rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 transition-colors">About</Link>
          </div>
        </div>
      </section>
    </>
  );
}
