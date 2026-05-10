// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { neighborhoods, boroughNames } from "@/app/site/nyc-mobile-salon/_lib/constants";
import {
  getAllBoroughParams,
  getBoroughName,
  localBusinessSchema,
  breadcrumbSchema,
  faqSchema,
} from "@/app/site/nyc-mobile-salon/_lib/seo";

export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ borough: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough } = await params;
  const name = getBoroughName(borough);
  if (!name) return {};
  return {
    title: `Mobile Salon Services in ${name}, NYC | Hair, Nails, Makeup & Grooming`,
    description: `The NYC Mobile Salon serves every neighborhood in ${name}. Licensed stylists for hair, nails, makeup, skincare, waxing & men's grooming — delivered to your door. $99/hour, no travel fees.`,
    alternates: { canonical: `https://thenycmobilesalon.com/locations/${borough}` },
  };
}

/* ─── Sparkle SVG ─────────────────────────────────────────────────── */

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z" />
    </svg>
  );
}

/* ─── Borough-specific copy ───────────────────────────────────────── */

const boroughCopy: Record<
  string,
  {
    introP1: string;
    introP2: string;
    introP3: string;
    introP4: string;
    introP5: string;
    whyP1: string;
    whyP2: string;
    whyP3: string;
  }
> = {
  manhattan: {
    introP1:
      "Manhattan is the beating heart of New York City, and its residents deserve beauty services that match the pace and prestige of the borough itself. The NYC Mobile Salon brings professional hair styling, nail services, makeup artistry, skincare treatments, waxing, and men's grooming directly to apartments, offices, hotels, and event venues across every Manhattan neighborhood. Whether you live on the Upper East Side, work in Midtown, or are hosting a gathering in Tribeca, our licensed beauty professionals arrive at your door with everything needed to deliver a full salon experience — no commute, no waiting room, no hassle.",
    introP2:
      "Finding time for self-care in Manhattan can feel impossible. Between demanding work schedules, social commitments, and the sheer density of daily life, carving out hours to travel to a salon, wait for your appointment, and travel back is a luxury most people simply cannot afford. That is exactly why mobile beauty services have become so popular across the borough. Instead of battling crosstown traffic or squeezing onto a packed subway just to get a blowout, you can book a licensed stylist to come to you. Our team serves every corner of Manhattan — from Washington Heights and Inwood at the northern tip all the way down to the Financial District and Battery Park City at the southern end.",
    introP3:
      "Our full menu of services starts at just $99 per hour with a one-hour minimum for individual appointments and a two-hour minimum for groups of three or more. There are absolutely no travel fees anywhere in Manhattan. That means you get the same professional-grade service you would find at a top Manhattan salon, delivered to the comfort of your own space, at a price that makes sense. Browse our complete service list, learn about our event packages, explore our hands-on beauty classes, or see exactly how the booking process works on our how it works page.",
    introP4:
      "Manhattan is home to some of the most iconic neighborhoods in the world, and each one has its own personality and rhythm. We understand that a client in the West Village may have very different needs and preferences than someone in East Harlem or Murray Hill. Our stylists are experienced with every hair type, skin tone, and style preference. Whether you want a silk press in Harlem, a bridal updo in SoHo, gel nails in Chelsea, or a fresh fade in the East Village, we bring the talent and the tools directly to your address.",
    introP5:
      "Beyond individual appointments, we are a go-to choice for Manhattan events of every size. Corporate wellness days in Midtown offices, bridal parties in boutique hotels, birthday celebrations in downtown lofts, and film production styling on sets across the borough — our team handles it all. We also offer interactive beauty classes and workshops that are perfect for team-building events, bachelorette parties, and private group lessons. Check our pricing page for a complete breakdown of rates and packages.",
    whyP1:
      "Manhattan residents know better than anyone that time is the most valuable currency in New York City. Every minute spent traveling to a salon is a minute you could be spending on work, family, fitness, or simply relaxing. Mobile beauty eliminates the commute entirely. Our professionals arrive at your apartment, office, hotel room, or any private space you choose, fully equipped with professional-grade tools and products. You do not need to step outside your door.",
    whyP2:
      "The density of Manhattan means that parking is nearly impossible, subway delays are unpredictable, and walking across the borough in summer heat or winter cold is nobody's idea of a good time. With mobile beauty, none of that matters. Our stylists navigate the city so you do not have to. Whether you are in a high-rise on the Upper West Side, a walk-up in the Lower East Side, or a penthouse in Hudson Yards, we come to you with the same level of service and professionalism you would expect from any top-tier Manhattan salon.",
    whyP3:
      "Mobile beauty is also the ideal solution for Manhattan's thriving events scene. Instead of coordinating transportation for an entire bridal party to a single salon, or trying to find a venue that can accommodate both a corporate event and beauty stations, you can simply book us to come to your location. We set up wherever you need us and handle everything from hair and makeup to nails and grooming, all on-site and on your schedule.",
  },
  brooklyn: {
    introP1:
      "Brooklyn is a borough defined by creativity, diversity, and an independent spirit — and its beauty scene is no different. The NYC Mobile Salon brings professional hair, nail, makeup, skincare, waxing, and grooming services directly to homes, studios, offices, and event spaces across every Brooklyn neighborhood. From the brownstones of Park Slope to the waterfront lofts of Williamsburg, from the vibrant streets of Crown Heights to the family homes of Bay Ridge, our licensed beauty professionals arrive at your door ready to deliver a complete salon experience.",
    introP2:
      "Brooklyn is the most populous borough in New York City, and its neighborhoods are spread across a vast geographic area. Getting from Greenpoint to Sheepshead Bay can easily take over an hour by public transit. Traveling to a salon across the borough — or worse, into Manhattan — eats into your day in a way that simply is not sustainable for busy professionals, parents, creatives, and everyone in between. Mobile beauty eliminates that problem entirely. Our team comes to you, wherever you are in Brooklyn, with all the tools, products, and expertise needed to deliver exceptional results.",
    introP3:
      "Our services start at $99 per hour with a one-hour minimum for individuals and a two-hour minimum for groups of three or more. We never charge travel fees anywhere in Brooklyn. That means whether you are in DUMBO or Ditmas Park, Cobble Hill or Canarsie, you pay the same fair rate for the same outstanding service. Explore our full service menu, check out our event packages, browse our beauty classes, or learn how the process works from start to finish.",
    introP4:
      "Brooklyn's incredible diversity means our stylists work with every hair texture, skin type, and style aesthetic imaginable. Whether you need box braids in Bed-Stuy, a balayage in Brooklyn Heights, a full glam makeup look for a Fort Greene wedding, or a crisp fade in Bushwick, our team has the range and experience to deliver exactly what you are looking for. We pride ourselves on matching clients with stylists who specialize in the specific services they need.",
    introP5:
      "The borough's booming events scene also makes Brooklyn one of our busiest markets for group bookings. Warehouse weddings in Red Hook, rooftop parties in Williamsburg, creative agency wellness days in Gowanus, and birthday brunches in Prospect Heights — we bring the beauty to your venue so your guests can focus on having a great time. We also run hands-on beauty workshops and classes that are perfect for bachelorette parties, team outings, and private group lessons. Visit our pricing page for details.",
    whyP1:
      "Brooklyn's geography makes it one of the boroughs where mobile beauty makes the biggest difference. The borough stretches from the East River waterfront all the way south to Coney Island and east to East New York. Depending on where you live, the nearest quality salon could be a 30-minute bus ride or a subway trip requiring multiple transfers. Mobile beauty cuts all of that out. Our professionals come to your apartment, brownstone, loft, or studio — wherever you are most comfortable.",
    whyP2:
      "For Brooklyn's massive creative community — artists, freelancers, musicians, content creators, and entrepreneurs — mobile beauty fits seamlessly into the way you already work. Instead of blocking out half a day for a salon visit, you can book a stylist to come to your home office or studio while you continue working. Need camera-ready hair and makeup for a shoot in Bushwick? We arrive on set. Hosting a launch party at your Williamsburg space? We set up beauty stations right there.",
    whyP3:
      "Brooklyn families also love mobile beauty because it eliminates the logistical nightmare of getting everyone to a salon. Parents can get a blowout while their kids nap in the next room. Bridal parties can get ready together in the same Airbnb. Groups of friends can turn a lazy Sunday into a spa day without leaving the apartment. It is beauty on your terms, in your space, on your schedule.",
  },
  queens: {
    introP1:
      "Queens is the most ethnically diverse urban area in the entire world, and The NYC Mobile Salon is proud to serve every one of its neighborhoods. Our licensed beauty professionals bring hair styling, nail services, makeup artistry, skincare treatments, waxing, and men's grooming directly to homes, apartments, offices, and event venues across the borough. From the high-rises of Long Island City to the tree-lined streets of Forest Hills, from the bustling avenues of Jackson Heights to the beachfront communities of the Rockaways, we deliver a full salon experience to your door.",
    introP2:
      "Queens is the largest borough by area in New York City, and its sheer size means that traveling to a salon can be a serious time commitment. A trip from Bayside to Astoria can take well over an hour, and getting to Manhattan for a quality salon appointment can feel like a day trip. Mobile beauty solves that problem completely. Our team comes to your location with professional-grade equipment, premium products, and the skills to deliver any service on our extensive menu. You save time, avoid traffic, and get pampered in the comfort of your own space.",
    introP3:
      "All of our services are priced at $99 per hour with a one-hour minimum for individual clients and a two-hour minimum for groups of three or more. There are no travel fees anywhere in Queens — whether you are in Astoria or Auburndale, Long Island City or Laurelton. Browse our complete services page, explore event packages for weddings and corporate gatherings, check out our interactive beauty classes, or read through our step-by-step how it works guide to see just how easy booking is.",
    introP4:
      "The extraordinary cultural diversity of Queens means our stylists must be — and are — experts in an incredibly wide range of beauty traditions and techniques. Whether you need intricate South Asian bridal styling in Jackson Heights, Dominican blowouts in Corona, Korean skincare facials in Flushing, or classic American cuts and color in Bayside, our team has specialists who understand the techniques and products that deliver the best results for every client.",
    introP5:
      "Queens is also home to a rapidly growing events and entertainment scene. From weddings at waterfront venues in Long Island City to community celebrations in Jamaica, corporate events near the airports, and content creator shoots in Astoria studios, our team is ready to bring professional beauty services to any event, anywhere in the borough. We also offer group beauty workshops and classes ideal for parties, team-building, and private instruction. See our pricing page for complete rate information.",
    whyP1:
      "Queens covers more than 100 square miles, making it by far the largest borough geographically. For residents in neighborhoods like Fresh Meadows, Bellerose, or the Rockaways, finding a quality salon nearby can be genuinely difficult — and traveling to one in Manhattan or even central Queens can take over an hour each way. Mobile beauty eliminates distance as a factor entirely. Our professionals come to your exact address, whether it is a co-op in Rego Park, a house in Bayside, or a high-rise in Long Island City.",
    whyP2:
      "The diversity of Queens also means that residents often struggle to find salons that truly specialize in their specific hair type or beauty preferences. By going mobile, we are able to match every client with a stylist who has deep expertise in exactly the services they need. You are not limited to whatever salon happens to be on your block — you get access to our full roster of specialists, all of whom come to you.",
    whyP3:
      "For families, busy professionals, seniors, and anyone who values their time, mobile beauty in Queens is transformative. No more planning your entire Saturday around a salon trip. No more dragging kids along or paying for parking at a strip mall. Our stylists arrive on time, set up efficiently, and deliver beautiful results in your own home. It is the way salon services should work in a borough as vast and dynamic as Queens.",
  },
  bronx: {
    introP1:
      "The Bronx is a borough with deep roots, rich culture, and a community that deserves world-class beauty services delivered right to their doorstep. The NYC Mobile Salon brings professional hair, nail, makeup, skincare, waxing, and men's grooming services to homes, apartments, offices, and event spaces across every Bronx neighborhood. From the elegant homes of Riverdale to the vibrant streets of Mott Haven, from the family communities of Pelham Bay to the bustling avenues of Fordham, our licensed beauty professionals come to you.",
    introP2:
      "For too long, Bronx residents have been underserved by the beauty industry. Many high-quality salons are concentrated in Manhattan or Brooklyn, forcing Bronx residents to spend hours commuting for the level of service they deserve. Mobile beauty changes that equation entirely. Our team travels to every neighborhood in the Bronx — no exceptions. Whether you are in Riverdale, Kingsbridge, Tremont, Soundview, City Island, or Co-op City, we arrive at your door with everything needed to deliver an exceptional salon experience.",
    introP3:
      "Our pricing is straightforward and fair: $99 per hour with a one-hour minimum for individuals and a two-hour minimum for groups of three or more. We never charge travel fees anywhere in the Bronx. Explore our full range of services, learn about our event packages for weddings and celebrations, browse our hands-on beauty classes, or see exactly how the booking process works on our how it works page. We also have a detailed pricing page with a complete breakdown of rates.",
    introP4:
      "The Bronx is home to a beautifully diverse population, and our stylists reflect that diversity in their expertise. Whether you need a Dominican blowout in University Heights, braids and protective styles in Concourse, a silk press in Wakefield, a fresh fade in Mott Haven, or bridal makeup in Pelham Bay, we have specialists who understand the techniques, products, and cultural traditions that matter to you. Every stylist on our team is fully licensed and experienced.",
    introP5:
      "Beyond individual appointments, the Bronx has a thriving events and community scene that we are proud to support. Church celebrations, quinceañeras, birthday parties, corporate events, community wellness days, and bridal showers — our team brings professional beauty services to gatherings of every size and style. We also offer interactive beauty workshops and classes that are perfect for team-building, parties, and private group instruction. Check our pricing page for all the details.",
    whyP1:
      "The Bronx is a borough where community matters, and mobile beauty fits perfectly into that ethos. Instead of leaving your neighborhood to find a quality salon, we bring the salon to your home, your block, your building. Our professionals set up in your living room, your kitchen, or wherever you are most comfortable. There is no need to fight traffic on the Cross Bronx Expressway, hunt for parking, or spend an hour on the BX bus just to get your hair done.",
    whyP2:
      "For Bronx families, mobile beauty is a game-changer. Parents can get their hair styled while their kids play nearby. Grandparents who have difficulty traveling can enjoy professional grooming and nail services without leaving the house. Groups of friends and family can book a shared session and turn a regular afternoon into a pampering experience. We bring the tools, the talent, and the products — you just relax and enjoy.",
    whyP3:
      "Mobile beauty also makes sense for the Bronx's growing professional and creative communities. Whether you need headshot-ready hair and makeup for a career opportunity, on-set styling for a content shoot, or a polished look for a networking event, our team delivers professional results in your space. No travel time, no stress, no compromise on quality.",
  },
  "staten-island": {
    introP1:
      "Staten Island stands apart from the rest of New York City in many ways — its suburban character, its tight-knit communities, its beautiful parks and shoreline — and it deserves beauty services that are as convenient and personal as the borough itself. The NYC Mobile Salon brings professional hair styling, nail services, makeup artistry, skincare treatments, waxing, and men's grooming directly to homes, offices, and event venues across every Staten Island neighborhood. From St. George to Tottenville, from Todt Hill to Travis, our licensed beauty professionals drive to your door.",
    introP2:
      "Staten Island residents know the challenge better than anyone: getting to a quality salon often means driving across the borough or even taking the ferry to Manhattan. Round-trip, that can eat up half a day — and that is before you factor in the actual appointment time. Mobile beauty eliminates the commute entirely. Our team serves every neighborhood on Staten Island with the same level of professionalism and quality you would find at any top-tier salon in the city, all without you having to leave your home.",
    introP3:
      "Our services are priced at $99 per hour with a one-hour minimum for individuals and a two-hour minimum for groups of three or more. We never charge travel fees anywhere on Staten Island. That simple, transparent pricing applies whether you are in Great Kills, Eltingville, New Dorp, or any other neighborhood on the island. Explore our full service menu, learn about event packages, browse our beauty classes, or visit our how it works page to see the booking process. Our pricing page has a complete breakdown.",
    introP4:
      "Staten Island has a diverse population with a wide range of beauty preferences and needs, and our stylists are equipped to serve every client. Whether you need a precision haircut in Todt Hill, gel nails in Great Kills, bridal makeup in Annadale, or a hot towel shave in St. George, our team brings the skill and the supplies to deliver outstanding results. Every stylist on our roster is fully licensed, insured, and experienced with a wide range of hair types and skin tones.",
    introP5:
      "The borough's strong community and family orientation also makes it one of our best markets for group bookings and events. Sweet 16 celebrations, bridal showers, birthday parties, communion and confirmation prep, and holiday gatherings — Staten Island families love bringing the salon into their homes for special occasions. We also offer hands-on beauty workshops and classes that are perfect for girls' nights, team outings, and private lessons. See our pricing page for complete details.",
    whyP1:
      "Staten Island is the most car-dependent borough in New York City, and even with a car, getting to a quality salon can mean navigating the Staten Island Expressway, searching for parking, and dealing with wait times. Mobile beauty takes all of that off your plate. Our professionals come directly to your house, apartment, or any private location you choose. You can relax at home, keep an eye on the kids, or even continue working while you get pampered.",
    whyP2:
      "For Staten Island's many families, mobile beauty is an especially practical choice. Parents with young children know how difficult it can be to arrange childcare just to get a haircut. With mobile beauty, there is no need. Our stylists come to your home and work around your family's schedule. Multiple family members can book back-to-back sessions, making it easy for everyone to get taken care of in a single visit.",
    whyP3:
      "Staten Island's event scene — from waterfront weddings to backyard parties to community celebrations — also benefits enormously from mobile beauty. Instead of coordinating salon appointments for an entire bridal party at a location that may be far from the venue, you can have our team come to your getting-ready space and handle everything on-site. It saves time, reduces stress, and means everyone can be together during the preparations.",
  },
};

/* ─── Other boroughs helper ───────────────────────────────────────── */

const boroughSlugs = Object.keys(boroughNames);

/* ─── Service cards data ──────────────────────────────────────────── */

const serviceCards = [
  { title: "Women's Hair", count: 10, href: "/services/womens", description: "Blowouts, cuts, color, highlights, silk press, braids, extensions, updos, and more" },
  { title: "Nails", count: 7, href: "/services/womens", description: "Classic and gel manicures, pedicures, nail art, acrylics, and dip powder" },
  { title: "Makeup", count: 3, href: "/services/womens", description: "Full glam, natural everyday looks, and lash application" },
  { title: "Skincare", count: 4, href: "/services/womens", description: "Express and deep cleansing facials, microdermabrasion, and light chemical peels" },
  { title: "Waxing", count: 7, href: "/services/womens", description: "Brow, lip, chin, face, bikini, Brazilian, legs, and underarm waxing" },
  { title: "Men's Grooming", count: 6, href: "/services/mens", description: "Haircuts, fades, beard trims, hot towel shaves, and full grooming services" },
];

/* ─── Page component ──────────────────────────────────────────────── */

export default async function BoroughPage({ params }: Props) {
  const { borough } = await params;
  const name = getBoroughName(borough);
  const hoods = neighborhoods[borough];
  if (!name || !hoods) notFound();

  const copy = boroughCopy[borough];
  const otherBoroughs = boroughSlugs.filter((s) => s !== borough);

  const faqs = [
    {
      q: `What neighborhoods in ${name} do you serve?`,
      a: `We serve every neighborhood in ${name} — all ${hoods.length} of them. From ${hoods[0].name} to ${hoods[hoods.length - 1].name} and everywhere in between, our licensed beauty professionals travel to your exact address. There is no corner of ${name} we do not cover.`,
    },
    {
      q: `Is there a travel fee for ${name}?`,
      a: `No. We never charge travel fees anywhere in ${name} or any other NYC borough. Our rate is a flat $99 per hour with a one-hour minimum for individual appointments and a two-hour minimum for groups of three or more. The price you see is the price you pay.`,
    },
    {
      q: `How do I book a mobile beauty appointment in ${name}?`,
      a: `Booking is simple. Visit our booking page, select your services, choose your preferred date and time, and enter your ${name} address. We will confirm your appointment and match you with a licensed stylist who specializes in the services you need. You can also call or text us to book directly.`,
    },
    {
      q: `What services are available in ${name}?`,
      a: `Every service on our menu is available in ${name}. That includes women's hair (blowouts, cuts, color, braids, extensions, and more), nails (manicures, pedicures, gel, acrylics, nail art), makeup, skincare facials, waxing, and the full range of men's grooming services including haircuts, fades, beard trims, and hot towel shaves.`,
    },
    {
      q: `Can you do events and group bookings in ${name}?`,
      a: `Absolutely. We handle events of every size in ${name}, including bridal parties, corporate wellness days, birthday celebrations, bachelorette pampering, film and photo shoots, and community events. For groups of three or more, there is a two-hour minimum. Contact us to discuss your event needs and we will put together a custom package.`,
    },
    {
      q: `How quickly can you get to ${name}?`,
      a: `We serve ${name} every day and can often accommodate same-day or next-day appointments depending on availability. For the best selection of times and stylists, we recommend booking at least a few days in advance. Event and group bookings should be scheduled as early as possible to ensure availability.`,
    },
  ];

  return (
    <>
      {/* JSON-LD Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            localBusinessSchema({ areaServed: `${name}, New York City` }),
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Locations", url: "/locations" },
              { name, url: `/locations/${borough}` },
            ]),
            faqSchema(faqs),
          ]),
        }}
      />

      {/* ─── 1. Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 py-20 md:py-28"
        style={{
          background:
            "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)",
        }}
      >
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-white/70" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
              Mobile Beauty in {name}
            </span>
            <Sparkle className="h-4 w-4 text-white/70" />
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            Mobile Beauty Services in{" "}
            <span className="italic">{name}</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-white/85">
            Licensed hair stylists, nail technicians, makeup artists, skincare
            specialists, and groomers serving every neighborhood in {name}.
            Professional salon services delivered to your door — $99/hour, no
            travel fees.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/book"
              className="rounded-full bg-white px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-purple-700 shadow-lg shadow-purple-900/20 transition hover:-translate-y-0.5 hover:bg-purple-50 font-display"
            >
              Book Now
            </Link>
            <Link
              href="/services"
              className="rounded-full border-2 border-white/40 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:-translate-y-0.5 hover:border-white/70 font-display"
            >
              View Services
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 2. Borough Intro ────────────────────────────────────────── */}
      <section className="bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center gap-2">
            <Sparkle className="h-3 w-3 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-500">
              About Our {name} Services
            </span>
          </div>
          <h2 className="font-display mb-8 text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">
            Professional mobile beauty across all of {name}
          </h2>
          <div className="space-y-5 text-base leading-relaxed text-slate-600">
            <p>{copy.introP1}</p>
            <p>{copy.introP2}</p>
            <p>
              {copy.introP3.split("service list").map((part, i, arr) =>
                i < arr.length - 1 ? (
                  <span key={i}>
                    {part}
                    <Link href="/services" className="text-purple-600 hover:underline">
                      service list
                    </Link>
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </p>
            <p>{copy.introP4}</p>
            <p>{copy.introP5}</p>
          </div>
        </div>
      </section>

      {/* ─── 3. Neighborhoods Grid ───────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center gap-2">
            <Sparkle className="h-3 w-3 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-500">
              {hoods.length} Neighborhoods
            </span>
          </div>
          <h2 className="font-display mb-8 text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">
            Every neighborhood in {name}, covered
          </h2>
          <p className="mb-10 max-w-2xl text-base text-slate-600">
            We serve all {hoods.length} neighborhoods across {name}. Select a
            neighborhood below to learn more about the mobile beauty services
            available in your area.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {hoods.map((hood) => (
              <Link
                key={hood.slug}
                href={`/locations/${borough}/${hood.slug}`}
                className="rounded-xl border border-purple-100 bg-white p-4 text-center text-sm font-medium text-slate-700 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
              >
                {hood.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. Services Available ───────────────────────────────────── */}
      <section className="bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center gap-2">
            <Sparkle className="h-3 w-3 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-500">
              Full Service Menu
            </span>
          </div>
          <h2 className="font-display mb-4 text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">
            Services available in {name}
          </h2>
          <p className="mb-10 max-w-2xl text-base text-slate-600">
            Every service on our menu is available in every {name} neighborhood.
            All services are performed by licensed, insured professionals using
            professional-grade products and tools.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {serviceCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="rounded-xl border border-purple-100 bg-white p-6 transition hover:border-purple-300 hover:shadow-md"
              >
                <h3 className="font-display mb-1 text-lg font-semibold text-slate-800">
                  {card.title}
                </h3>
                <p className="mb-3 text-xs font-medium text-purple-500">
                  {card.count} services
                </p>
                <p className="text-sm leading-relaxed text-slate-500">
                  {card.description}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/services"
              className="text-purple-600 hover:underline"
            >
              View all services and pricing &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 5. Why Mobile Beauty in {name} ──────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center gap-2">
            <Sparkle className="h-3 w-3 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-500">
              Why Mobile
            </span>
          </div>
          <h2 className="font-display mb-8 text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">
            Why mobile beauty is perfect for {name}
          </h2>
          <div className="space-y-5 text-base leading-relaxed text-slate-600">
            <p>{copy.whyP1}</p>
            <p>{copy.whyP2}</p>
            <p>{copy.whyP3}</p>
          </div>
          <div className="mt-8">
            <Link
              href="/how-it-works"
              className="text-purple-600 hover:underline"
            >
              See how it works &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 6. Events & Classes ─────────────────────────────────────── */}
      <section className="bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center gap-2">
            <Sparkle className="h-3 w-3 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-500">
              Events &amp; Classes
            </span>
          </div>
          <h2 className="font-display mb-10 text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">
            Events and beauty classes in {name}
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            {/* Events column */}
            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <h3 className="font-display mb-4 text-xl font-semibold text-slate-800">
                Events
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-slate-500">
                We bring professional beauty services to events of every size
                and style across {name}. Our team handles setup, service, and
                cleanup so you can focus on your guests.
              </p>
              <ul className="mb-5 space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                  Bridal hair and makeup for the bride and entire wedding party
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                  Corporate wellness days with on-site beauty stations
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                  Birthday parties, bachelorettes, and celebrations
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                  Film, photo, and content creator on-set styling
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                  Community events, senior home salon days, and nonprofit glam
                </li>
              </ul>
              <Link
                href="/events"
                className="text-purple-600 hover:underline"
              >
                Explore all event packages &rarr;
              </Link>
            </div>

            {/* Classes column */}
            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <h3 className="font-display mb-4 text-xl font-semibold text-slate-800">
                Beauty Classes &amp; Workshops
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-slate-500">
                Learn professional beauty techniques in hands-on group workshops
                taught by licensed pros. Perfect for parties, team-building, and
                anyone who wants to level up their skills.
              </p>
              <ul className="mb-5 space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                  DIY Blowout Workshop — learn to blowout like a pro
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                  Braiding Basics — French braids, Dutch braids, fishtails
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                  Everyday Makeup Masterclass — polished daily routine
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                  Skincare Routine Workshop — cleanse, treat, protect
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                  Group Nail Art Class — designs, techniques, and basics
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                  Men&apos;s Grooming 101 — skincare, beard care, looking sharp
                </li>
              </ul>
              <Link
                href="/classes"
                className="text-purple-600 hover:underline"
              >
                Browse all classes &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. How It Works ─────────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center gap-2">
            <Sparkle className="h-3 w-3 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-500">
              Simple Process
            </span>
          </div>
          <h2 className="font-display mb-10 text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">
            How mobile beauty works in {name}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <div className="font-display mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-lg font-bold text-purple-600">
                1
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-slate-800">
                Book your appointment
              </h3>
              <p className="text-sm leading-relaxed text-slate-500">
                Choose your services, pick a date and time, and enter your{" "}
                {name} address. We will confirm your booking and match you with
                a specialist.
              </p>
            </div>
            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <div className="font-display mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-lg font-bold text-purple-600">
                2
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-slate-800">
                We come to you
              </h3>
              <p className="text-sm leading-relaxed text-slate-500">
                Your licensed beauty professional arrives at your door in {name}{" "}
                with all the tools, products, and equipment needed for a full
                salon experience. No setup on your part.
              </p>
            </div>
            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <div className="font-display mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-lg font-bold text-purple-600">
                3
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-slate-800">
                Enjoy the results
              </h3>
              <p className="text-sm leading-relaxed text-slate-500">
                Sit back, relax, and enjoy professional beauty services without
                ever leaving your space. We clean up after ourselves and leave
                you looking and feeling incredible.
              </p>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/how-it-works"
              className="text-purple-600 hover:underline"
            >
              Learn more about our process &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 8. Pricing ──────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkle className="h-3 w-3 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-500">
              Transparent Pricing
            </span>
            <Sparkle className="h-3 w-3 text-purple-400" />
          </div>
          <h2 className="font-display mb-6 text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">
            Simple, fair pricing for {name}
          </h2>
          <div className="mx-auto mb-6 max-w-xl rounded-xl border border-purple-100 bg-purple-50/50 p-8">
            <p className="font-display mb-1 text-5xl font-bold text-purple-600">
              $99
            </p>
            <p className="mb-4 text-sm font-medium text-purple-500">
              per hour
            </p>
            <div className="space-y-2 text-sm text-slate-600">
              <p>1-hour minimum for individual appointments</p>
              <p>2-hour minimum for groups of 3 or more</p>
              <p className="font-semibold text-purple-600">
                No travel fees — ever — anywhere in {name}
              </p>
            </div>
          </div>
          <p className="mb-6 text-base text-slate-500">
            Every service on our menu is included at this rate. No hidden fees,
            no surge pricing, no surprises. The same rate applies whether you
            are booking a single blowout or a full bridal party.
          </p>
          <Link
            href="/pricing"
            className="text-purple-600 hover:underline"
          >
            View full pricing details &rarr;
          </Link>
        </div>
      </section>

      {/* ─── 9. Other Boroughs ───────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center gap-2">
            <Sparkle className="h-3 w-3 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-500">
              All 5 Boroughs
            </span>
          </div>
          <h2 className="font-display mb-4 text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">
            We also serve these boroughs
          </h2>
          <p className="mb-10 text-base text-slate-600">
            The NYC Mobile Salon covers all five boroughs of New York City. No
            matter where you are, we bring the salon to you.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {otherBoroughs.map((slug) => (
              <Link
                key={slug}
                href={`/locations/${slug}`}
                className="rounded-xl border border-purple-100 bg-white p-6 text-center transition hover:border-purple-300 hover:shadow-md"
              >
                <h3 className="font-display text-lg font-semibold text-slate-800">
                  {boroughNames[slug]}
                </h3>
                <p className="mt-1 text-xs text-purple-500">
                  {neighborhoods[slug].length} neighborhoods
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 10. FAQ ─────────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center gap-2">
            <Sparkle className="h-3 w-3 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-500">
              FAQ
            </span>
          </div>
          <h2 className="font-display mb-10 text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">
            Frequently asked questions about mobile beauty in {name}
          </h2>
          <div className="space-y-8">
            {faqs.map((faq, i) => (
              <div key={i}>
                <h3 className="font-display mb-2 text-lg font-semibold text-slate-800">
                  {faq.q}
                </h3>
                <p className="text-base leading-relaxed text-slate-600">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 11. CTA ─────────────────────────────────────────────────── */}
      <section
        className="px-4 py-16 md:py-24 text-center"
        style={{
          background:
            "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)",
        }}
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display mb-4 text-3xl font-bold text-white md:text-4xl">
            Book mobile beauty in{" "}
            <span className="italic">{name}</span>
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-base text-white/80">
            Licensed professionals, $99 per hour, no travel fees. Hair, nails,
            makeup, skincare, waxing, and grooming — delivered to your door
            anywhere in {name}.
          </p>
          <Link
            href="/book"
            className="rounded-full bg-white px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-purple-700 shadow-lg shadow-purple-900/20 transition hover:-translate-y-0.5 hover:bg-purple-50 font-display"
          >
            Book Your Appointment
          </Link>
        </div>
      </section>
    </>
  );
}
