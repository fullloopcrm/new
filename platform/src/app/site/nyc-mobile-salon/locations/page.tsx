import type { Metadata } from "next";
import Link from "next/link";
import { neighborhoods, boroughNames } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { faqSchema, breadcrumbSchema, localBusinessSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title:
    "Service Locations — Mobile Beauty Across All 5 NYC Boroughs | The NYC Mobile Salon",
  description:
    "The NYC Mobile Salon serves 200+ neighborhoods across Manhattan, Brooklyn, Queens, The Bronx, and Staten Island. Licensed beauty pros delivered to your door — hair, nails, makeup, grooming, events, and classes. No travel fees.",
  alternates: { canonical: "https://thenycmobilesalon.com/locations" },
  openGraph: {
    title:
      "Service Locations — Mobile Beauty Across All 5 NYC Boroughs | The NYC Mobile Salon",
    description:
      "The NYC Mobile Salon serves 200+ neighborhoods across Manhattan, Brooklyn, Queens, The Bronx, and Staten Island. Licensed beauty pros delivered to your door — hair, nails, makeup, grooming, events, and classes. No travel fees.",
    url: "https://thenycmobilesalon.com/locations",
  },
};

/* ── Sparkle SVG ─────────────────────────────────────────────────────── */
function Sparkle({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ── Static data ─────────────────────────────────────────────────────── */
const totalCount = Object.values(neighborhoods).reduce(
  (s, h) => s + h.length,
  0,
);

const boroughMeta: Record<
  string,
  {
    tagline: string;
    landmarks: string;
    popular: string[];
    description: string;
    longDescription: string;
  }
> = {
  manhattan: {
    tagline: "The heart of New York — and the heart of our service area.",
    landmarks:
      "From Central Park penthouses to Financial District high-rises, SoHo lofts to Harlem brownstones",
    popular: [
      "Upper East Side",
      "Chelsea",
      "SoHo",
      "Tribeca",
      "Greenwich Village",
      "Midtown",
    ],
    description:
      "Manhattan is where the pace of life moves fastest, and that is exactly why mobile beauty makes so much sense here. Whether you are getting ready for a Broadway opening night in Midtown, prepping for a gallery event in Chelsea, or simply want a blowout before brunch in the West Village, our licensed professionals come directly to your Manhattan apartment, hotel room, or office. We serve every neighborhood on the island, from the tree-lined streets of the Upper West Side all the way down to the waterfront at Battery Park City.",
    longDescription:
      "Manhattan is the borough that never sleeps, and neither does the demand for looking and feeling your best. Our stylists know the island inside and out. They navigate the grid with ease, arriving at your door with everything needed for a flawless appointment. Residents of Harlem and Washington Heights love our braiding and protective styling services, while clients in Murray Hill and Gramercy frequently book blowouts and gel manicures for after-work events. In the Financial District, we regularly visit offices for corporate wellness days and headshot prep. No matter which Manhattan neighborhood you call home, The NYC Mobile Salon delivers the same exceptional quality without the hassle of fighting for a reservation at an overbooked salon.",
  },
  brooklyn: {
    tagline: "Creative energy meets effortless beauty — right at your door.",
    landmarks:
      "From Williamsburg studios to Park Slope brownstones, DUMBO waterfront lofts to Bay Ridge family homes",
    popular: [
      "Williamsburg",
      "Park Slope",
      "DUMBO",
      "Brooklyn Heights",
      "Crown Heights",
      "Greenpoint",
    ],
    description:
      "Brooklyn is the most populous borough in New York City and one of our busiest service areas. The creative energy here is unmatched, and our clients reflect that diversity. We bring hair, nail, makeup, and grooming services to Williamsburg artists, Park Slope families, DUMBO professionals, and Crown Heights creatives alike. Whether you are in a converted warehouse loft or a classic brownstone, our team arrives ready to work.",
    longDescription:
      "Brooklyn spans an incredible range of neighborhoods and vibes, from the hipster cafes of Bushwick to the seaside boardwalk at Coney Island. Our Brooklyn clients book everything from bridal party styling in Brooklyn Heights to fresh fades in Bed-Stuy, group nail art sessions in Greenpoint to deep conditioning treatments in Flatbush. We know the borough well and plan our routes to serve every corner efficiently. Families in Bay Ridge and Dyker Heights love our at-home kids haircut services, while professionals in Downtown Brooklyn book us for pre-meeting touch-ups. No neighborhood is too far, and no request is too creative for our Brooklyn team.",
  },
  queens: {
    tagline:
      "The most diverse borough on Earth deserves beauty pros who get it.",
    landmarks:
      "From Astoria rooftops to Forest Hills Gardens, Long Island City towers to the Rockaways beachfront",
    popular: [
      "Astoria",
      "Long Island City",
      "Forest Hills",
      "Flushing",
      "Jackson Heights",
      "Sunnyside",
    ],
    description:
      "Queens is the most ethnically diverse urban area in the world, and our team proudly serves every community within it. From Astoria to the Rockaways, Flushing to Forest Hills, we bring licensed beauty professionals to your door no matter where in Queens you live. Our stylists are experienced with every hair texture, skin tone, and beauty tradition, making Queens one of our most rewarding boroughs to serve.",
    longDescription:
      "The beauty needs of Queens are as varied as its population, and that is something we celebrate. In Jackson Heights and Elmhurst, our makeup artists are well-versed in South Asian bridal traditions. In Flushing and Bayside, clients book everything from silk presses to classic manicures. Astoria and Long Island City are among our most-booked neighborhoods in the city, with young professionals requesting blowouts, gel nails, and men's grooming on a weekly basis. Out in the Rockaways, we bring beach-day-ready styling right to your door. Queens is geographically the largest borough, and we cover every square mile of it with the same commitment to quality and punctuality.",
  },
  bronx: {
    tagline: "Uptown pride, downtown quality — mobile beauty for the BX.",
    landmarks:
      "From Riverdale estates to Mott Haven studios, City Island cottages to Grand Concourse apartments",
    popular: [
      "Riverdale",
      "Fordham",
      "Pelham Bay",
      "Mott Haven",
      "Kingsbridge",
      "Throgs Neck",
    ],
    description:
      "The Bronx is experiencing a renaissance, and The NYC Mobile Salon is proud to be part of it. From the leafy streets of Riverdale to the bustling avenues of Fordham, the waterfront emerging scene in Mott Haven to the quiet charm of City Island, we bring full-service mobile beauty to every Bronx neighborhood. Our Bronx clients deserve the same level of professionalism and artistry as anywhere else in the city, and that is exactly what they get.",
    longDescription:
      "The Bronx holds a special place in New York City culture, and our stylists bring that same energy to every appointment. Clients in Riverdale and Spuyten Duyvil frequently book us for at-home blowouts and color services, while families in Parkchester and Co-op City love our group booking options for events and celebrations. In Mott Haven and Port Morris, the growing creative community keeps us busy with content creator styling and headshot prep. Belmont, home to Arthur Avenue and some of the best food in the city, is also home to clients who appreciate old-school quality in their grooming. We serve the entire borough with zero travel fees and the same flat-rate pricing you will find everywhere else in NYC.",
  },
  "staten-island": {
    tagline: "The forgotten borough? Not by us. Never by us.",
    landmarks:
      "From St. George waterfront to Tottenville shoreline, Todt Hill estates to Snug Harbor Cultural Center",
    popular: [
      "St. George",
      "Tottenville",
      "Great Kills",
      "New Dorp",
      "Todt Hill",
      "West Brighton",
    ],
    description:
      "Staten Island is often overlooked by city-based service providers, but not by The NYC Mobile Salon. We serve every neighborhood on the island, from the ferry terminal at St. George to the southern tip at Tottenville. Staten Island families, professionals, and event hosts deserve the same access to premium mobile beauty that the rest of the city enjoys, and we are here to deliver it.",
    longDescription:
      "Staten Island has a suburban feel with an urban heartbeat, and our clients here love the convenience of not having to cross the bridge or take the ferry for a quality beauty appointment. Residents of Todt Hill and Grymes Hill book us for at-home facials and bridal prep, while families in Great Kills and Eltingville schedule regular kids haircuts and family grooming sessions. The waterfront neighborhoods around St. George and Stapleton are growing fast, and so is our client base there. We also serve the south shore communities of Tottenville, Pleasant Plains, and Princes Bay, where finding a nearby salon can be a real challenge. With The NYC Mobile Salon, the salon comes to you, no matter where on Staten Island you are.",
  },
};

const faqs = [
  {
    q: "What neighborhoods do you serve?",
    a: `We serve over ${totalCount} neighborhoods across all five NYC boroughs — Manhattan, Brooklyn, Queens, The Bronx, and Staten Island. If you have a New York City address, we can come to you. Browse the full list of neighborhoods on this page or search for your specific area.`,
  },
  {
    q: "Is there a travel fee for any neighborhood?",
    a: "No. There is never a travel fee, regardless of which borough or neighborhood you are in. Our pricing is the same whether you are in Midtown Manhattan or Tottenville, Staten Island. Every appointment starts at $99 per hour with no hidden surcharges for location.",
  },
  {
    q: "Can you come to my office, hotel, or event venue?",
    a: "Absolutely. We regularly visit offices for corporate wellness days, hotels for bridal prep and special occasions, event venues for on-site styling, and even film sets for production hair and makeup. Anywhere in NYC with a power outlet and a mirror, we can set up and get to work.",
  },
  {
    q: "What if I live outside New York City?",
    a: "Our standard service area covers all five boroughs of New York City. For locations in Westchester, Long Island, or New Jersey, please contact us directly at hey@thenycmobilesalon.com and we will do our best to accommodate your request. Additional travel charges may apply for out-of-city bookings.",
  },
  {
    q: "Do you serve all boroughs equally?",
    a: "Yes. We have stylists, nail techs, makeup artists, and barbers distributed across all five boroughs. We do not prioritize one area over another. Whether you are booking from the Upper East Side or the Rockaways, you will receive the same quality of service, the same pricing, and the same professionalism.",
  },
  {
    q: "How do I find services available in my neighborhood?",
    a: "You can browse this page to find your borough and neighborhood, then click through to see all available services in your area. Every service we offer — hair, nails, makeup, skincare, waxing, men's grooming, events, and classes — is available in every neighborhood we serve.",
  },
];

const services = [
  {
    title: "Hair Services",
    href: "/services/womens",
    description:
      "Blowouts, cuts, color, highlights, silk presses, braids, extensions, and formal updos. Every hair service you would find in a top NYC salon, delivered to your living room.",
  },
  {
    title: "Nail Services",
    href: "/services/womens",
    description:
      "Classic and gel manicures, pedicures, nail art, acrylics, press-ons, and dip powder. Our nail techs bring a full mobile station with UV lamps, sanitized tools, and premium polish brands.",
  },
  {
    title: "Makeup",
    href: "/services/womens",
    description:
      "Full glam, natural everyday looks, and professional lash application. Our makeup artists work with all skin tones and styles, using top-tier products for a flawless, long-lasting finish.",
  },
  {
    title: "Skincare & Waxing",
    href: "/services/womens",
    description:
      "Express facials, deep cleansing facials, microdermabrasion, chemical peels, brow shaping, full body waxing, and more. Licensed estheticians bring clinical-grade products to your home.",
  },
  {
    title: "Men's Grooming",
    href: "/services/mens",
    description:
      "Haircuts, fades, line-ups, beard trims, hot towel shaves, scalp treatments, and men's mani/pedis. Our barbers and groomers deliver barbershop quality without the wait.",
  },
  {
    title: "Events & Classes",
    href: "/events",
    description:
      "Bridal parties, birthday celebrations, corporate wellness days, content shoots, and hands-on beauty workshops. We bring the full experience to your venue, home, or office.",
  },
];

/* ── Page Component ──────────────────────────────────────────────────── */
export default function LocationsPage() {
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            faqSchema(faqs.map((f) => ({ q: f.q, a: f.a }))),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Locations", url: "/locations" },
            ]),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema()) }}
      />

      {/* ─── 1. Hero ────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 py-24 text-white md:py-32"
        style={{
          background:
            "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)",
        }}
      >
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 text-sm font-semibold backdrop-blur-sm">
            <Sparkle className="h-4 w-4" />
            All 5 Boroughs &middot; {totalCount}+ Neighborhoods &middot; Zero
            Travel Fees
          </span>
          <h1 className="font-display mb-6 text-5xl font-black tracking-tight md:text-6xl lg:text-7xl">
            Mobile Beauty Across
            <br />
            All 5 NYC Boroughs
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/90 md:text-xl">
            Licensed beauty professionals serving over {totalCount}{" "}
            neighborhoods across Manhattan, Brooklyn, Queens, The Bronx, and
            Staten Island. Same quality. Same pricing. No travel fees. Just
            tell us where, and we will be there.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/book"
              className="rounded-full bg-white px-8 py-3.5 text-base font-bold text-purple-700 shadow-lg transition-all hover:bg-purple-50 hover:shadow-xl"
            >
              Book Now
            </Link>
            <Link
              href="/how-it-works"
              className="rounded-full border-2 border-white/40 px-8 py-3.5 text-base font-bold text-white transition-all hover:border-white hover:bg-white/10"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 2. Intro ───────────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl space-y-6 text-lg leading-relaxed text-gray-700">
          <h2 className="font-display text-3xl font-black text-gray-900 md:text-4xl">
            Mobile Beauty That Covers Every Corner of New York City
          </h2>
          <p>
            The NYC Mobile Salon was built on a simple idea: every New Yorker
            deserves access to professional beauty services without the hassle of
            commuting to a salon, fighting for an appointment, or paying extra
            just because of where they live. We send licensed, vetted beauty
            professionals directly to your home, apartment, office, hotel, or
            event venue — anywhere in all five boroughs of New York City.
          </p>
          <p>
            Whether you are on the Upper East Side preparing for a gala, in Bay
            Ridge getting the family ready for a wedding, in Astoria squeezing
            in a blowout before a date, or in Riverdale treating yourself to a
            spa day at home, our team is ready to come to you. We offer the full
            range of{" "}
            <Link href="/services" className="text-purple-600 hover:underline">
              beauty services
            </Link>{" "}
            — hair, nails, makeup, skincare, waxing, and men&apos;s grooming —
            plus{" "}
            <Link href="/events" className="text-purple-600 hover:underline">
              event styling
            </Link>{" "}
            and hands-on{" "}
            <Link href="/classes" className="text-purple-600 hover:underline">
              beauty classes
            </Link>
            .
          </p>
          <p>
            There are no travel fees. No borough surcharges. No minimum booking
            requirements based on location. Every appointment starts at{" "}
            <strong>$99 per hour</strong>, whether your address is in Tribeca or
            Tottenville. Our{" "}
            <Link
              href="/how-it-works"
              className="text-purple-600 hover:underline"
            >
              booking process
            </Link>{" "}
            is simple: tell us what you need, tell us where you are, and we will
            match you with a professional who can be at your door ready to work.
          </p>
          <p>
            We currently serve over <strong>{totalCount} neighborhoods</strong>{" "}
            across Manhattan, Brooklyn, Queens, The Bronx, and Staten Island.
            Below you will find a complete guide to our service areas, organized
            by borough, along with information about the services available in
            every neighborhood.
          </p>
        </div>
      </section>

      {/* ─── 3. Borough Cards ───────────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-black text-gray-900 md:text-4xl">
              <Sparkle className="mr-2 inline h-6 w-6 text-purple-500" />
              Five Boroughs. One Standard of Excellence.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
              Every borough gets the same level of talent, professionalism, and
              care. Click into your borough to explore neighborhoods and
              services.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(boroughMeta).map(([slug, meta]) => {
              const hoods = neighborhoods[slug] ?? [];
              return (
                <div
                  key={slug}
                  className="rounded-xl border border-purple-100 bg-white p-6 transition-shadow hover:shadow-lg"
                >
                  <h2 className="font-display mb-2 text-2xl font-black text-gray-900">
                    {boroughNames[slug]}
                  </h2>
                  <p className="mb-4 text-sm text-gray-600">{meta.tagline}</p>
                  <p className="mb-4 text-gray-700">{meta.landmarks}.</p>
                  <p className="mb-4 text-sm font-semibold text-purple-600">
                    {hoods.length} neighborhoods served
                  </p>
                  <p className="mb-5 text-sm text-gray-500">
                    <span className="font-medium text-gray-700">Popular: </span>
                    {meta.popular.join(", ")}
                  </p>
                  <Link
                    href={`/locations/${slug}`}
                    className="inline-block rounded-full bg-purple-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-purple-700"
                  >
                    Explore {boroughNames[slug]}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 4. All Neighborhoods by Borough ────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-6xl space-y-16">
          <div className="text-center">
            <h2 className="font-display text-3xl font-black text-gray-900 md:text-4xl">
              Every Neighborhood We Serve
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
              Click any neighborhood to see the full menu of services available
              at your doorstep.
            </p>
          </div>

          {Object.entries(neighborhoods).map(([boroughSlug, hoods]) => {
            const meta = boroughMeta[boroughSlug];
            return (
              <div key={boroughSlug}>
                <h2 className="font-display mb-3 text-2xl font-black text-gray-900">
                  {boroughNames[boroughSlug]}
                </h2>
                <p className="mb-6 max-w-3xl text-gray-700">
                  {meta?.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {hoods.map((hood) => (
                    <Link
                      key={hood.slug}
                      href={`/locations/${boroughSlug}/${hood.slug}`}
                      className="rounded-full border border-purple-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700"
                    >
                      {hood.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 5. Services Available Everywhere ───────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-black text-gray-900 md:text-4xl">
              <Sparkle className="mr-2 inline h-6 w-6 text-purple-500" />
              Services Available in Every Neighborhood
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
              No matter your borough or block, the full menu of mobile beauty
              services is available at your address.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <div
                key={svc.title}
                className="rounded-xl border border-purple-100 bg-white p-6"
              >
                <h3 className="font-display mb-3 text-xl font-bold text-gray-900">
                  {svc.title}
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-600">
                  {svc.description}
                </p>
                <Link
                  href={svc.href}
                  className="text-sm font-semibold text-purple-600 hover:underline"
                >
                  View {svc.title} &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. Why Location Doesn't Matter ─────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl space-y-6 text-lg leading-relaxed text-gray-700">
          <h2 className="font-display text-3xl font-black text-gray-900 md:text-4xl">
            Why Location Does Not Matter with Mobile Beauty
          </h2>
          <p>
            In a city where your neighborhood can define so much of your daily
            experience, beauty services should not be one more thing limited by
            geography. Traditional salons are fixed in place. They serve a
            handful of surrounding blocks, and if you do not live nearby, you are
            looking at a subway ride, a cab fare, and a chunk of your day just
            to get a haircut or a manicure. Mobile beauty eliminates all of
            that.
          </p>
          <p>
            With The NYC Mobile Salon, there are no borough boundaries. A client
            in Tottenville gets the same caliber of stylist as a client in
            Tribeca. A family in the Bronx has access to the same bridal party
            packages as someone booking from a Manhattan penthouse. We built our
            network of professionals specifically to cover the entire city
            evenly, with stylists, nail techs, makeup artists, barbers, and
            estheticians positioned across all five boroughs.
          </p>
          <p>
            This model is not just more convenient — it is more equitable. Many
            neighborhoods in the outer boroughs have fewer high-quality salon
            options than Manhattan. Mobile beauty fills that gap. It brings
            top-tier talent to areas that have historically been underserved by
            the beauty industry. And it does so at a flat rate, with no
            surcharges for distance, no minimum orders based on location, and
            no compromises on quality.
          </p>
          <p>
            The result is a city where your address determines nothing about the
            quality of your beauty experience. Whether you are preparing for a
            job interview in Jamaica, Queens, hosting a sweet sixteen in Bay
            Ridge, Brooklyn, or recovering from surgery in Riverdale, The Bronx,
            we come to you with the same professionalism, the same products, and
            the same dedication to making you look and feel your best.
          </p>
        </div>
      </section>

      {/* ─── 7. Borough Deep Dives ──────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-3xl space-y-12">
          <div className="text-center">
            <h2 className="font-display text-3xl font-black text-gray-900 md:text-4xl">
              A Closer Look at Each Borough
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
              Every borough has its own character, its own rhythm, and its own
              beauty needs. Here is how we serve each one.
            </p>
          </div>

          {Object.entries(boroughMeta).map(([slug, meta]) => (
            <div key={slug}>
              <h3 className="font-display mb-3 text-2xl font-bold text-gray-900">
                Mobile Beauty in {boroughNames[slug]}
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-gray-700">
                {meta.longDescription}
              </p>
              <Link
                href={`/locations/${slug}`}
                className="text-sm font-semibold text-purple-600 hover:underline"
              >
                Browse all {boroughNames[slug]} neighborhoods &rarr;
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 8. FAQ ─────────────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-10 text-center text-3xl font-black text-gray-900 md:text-4xl">
            Frequently Asked Questions About Our Service Area
          </h2>

          <dl className="space-y-8">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <dt className="font-display mb-2 text-lg font-bold text-gray-900">
                  {faq.q}
                </dt>
                <dd className="leading-relaxed text-gray-600">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─── 9. CTA ─────────────────────────────────────────────────────── */}
      <section
        className="px-4 py-24 text-center text-white"
        style={{
          background:
            "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)",
        }}
      >
        <div className="mx-auto max-w-2xl">
          <Sparkle className="mx-auto mb-4 h-8 w-8 text-white/80" />
          <h2 className="font-display mb-4 text-4xl font-black md:text-5xl">
            Book Mobile Beauty in Your Neighborhood
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-white/90">
            Over {totalCount} neighborhoods. Five boroughs. Zero travel fees.
            Licensed professionals at your door — for hair, nails, makeup,
            grooming, events, and classes.
          </p>
          <Link
            href="/book"
            className="inline-block rounded-full bg-white px-10 py-4 text-lg font-bold text-purple-700 shadow-lg transition-all hover:bg-purple-50 hover:shadow-xl"
          >
            Book Your Appointment
          </Link>
          <p className="mt-6 text-sm text-white/70">
            Questions?{" "}
            <Link href="/faq" className="underline hover:text-white">
              Check our FAQ
            </Link>{" "}
            or email{" "}
            <a
              href="mailto:hey@thenycmobilesalon.com"
              className="underline hover:text-white"
            >
              hey@thenycmobilesalon.com
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
