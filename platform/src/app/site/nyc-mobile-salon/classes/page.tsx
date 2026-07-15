import type { Metadata } from "next";
import Link from "next/link";
import { classCategories, boroughNames, neighborhoods } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { classContent } from "@/app/site/nyc-mobile-salon/_lib/class-content";
import { faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title: "Mobile Beauty Classes & Workshops in NYC | Learn from the Pros — All 5 Boroughs",
  description:
    "Hands-on beauty workshops delivered to your door. DIY blowouts, braiding, makeup, skincare, nail art & men's grooming — taught by licensed pros in small groups. $99/hr with 2hr minimum for groups of 3+. Book a class anywhere in NYC.",
  alternates: { canonical: "https://thenycmobilesalon.com/classes" },
  openGraph: {
    title: "Mobile Beauty Classes & Workshops in NYC | Learn from the Pros — All 5 Boroughs",
    description:
      "Hands-on beauty workshops delivered to your door. DIY blowouts, braiding, makeup, skincare, nail art & men's grooming — taught by licensed pros in small groups. $99/hr with 2hr minimum for groups of 3+. Book a class anywhere in NYC.",
    url: "https://thenycmobilesalon.com/classes",
  },
};

const classFaqs = [
  {
    q: "How much do beauty classes cost?",
    a: "All of our mobile beauty classes and workshops are priced at $99 per hour with a two-hour minimum for groups of three or more. This flat hourly rate covers everything — the instructor, all tools, all products, all materials, and travel to your location anywhere in the five boroughs. There are no hidden fees, no per-person surcharges, and no extra charges for supplies. For private one-on-one lessons, pricing varies slightly depending on the workshop type, so contact us for a custom quote. Compared to what you would pay at a beauty school or workshop studio in Manhattan, our mobile classes deliver far more value because you get personalized attention in a comfortable setting without commuting anywhere.",
  },
  {
    q: "What skill level do I need for the classes?",
    a: "Absolutely no experience is required for any of our workshops. Every class we teach is designed to accommodate complete beginners as well as intermediate students who want to refine their technique. Our instructors start with the fundamentals and build from there, adapting the pace and depth of instruction to the group in real time. If someone in your group has never held a round brush or blending sponge before, that is completely fine. If someone else has been doing their own makeup for years and wants to learn professional tricks, they will get value too. We frequently teach mixed-skill groups — bridal parties where some attendees are beauty enthusiasts and others have never braided hair — and our instructors know how to keep everyone engaged and learning at their own level.",
  },
  {
    q: "How many people can attend a class?",
    a: "Our workshops are designed for small groups, typically ranging from 3 to 12 participants depending on the class type. Hair classes like the DIY Blowout Workshop and Braiding Basics work best with 4 to 10 people so the instructor can provide hands-on corrections to each participant. Makeup and skincare workshops can accommodate up to 10 to 12 people comfortably. Nail art classes work best with 4 to 8 people given the detail-oriented nature of the work. For larger groups — corporate events, big bridal parties, birthday celebrations with 15 or more guests — we bring additional instructors to maintain the small-group ratio that makes our classes effective. Contact us to discuss your group size and we will build a custom plan.",
  },
  {
    q: "Where do the classes take place?",
    a: "Anywhere you want in New York City. That is the entire point of a mobile beauty class — we come to you. We have taught workshops in living rooms in Brooklyn, penthouses in Manhattan, hotel suites in Midtown, Airbnbs in Queens, offices in the Financial District, backyards in the Bronx, and beach houses on Staten Island. All we need is enough space for your group to sit comfortably with a bit of elbow room and access to a bathroom with running water. We bring all the tools, products, mirrors, and materials. You provide the space and the people. If you are unsure whether your space works, send us photos and we will let you know.",
  },
  {
    q: "What do I need to provide?",
    a: "Just the space and the people. We bring absolutely everything else — all professional tools, all products, all materials, mirrors, capes, practice supplies, handouts, and take-home guides. For makeup and skincare classes, participants should come with clean, bare skin so they can work on their own faces during the workshop. For hair classes, participants should come with clean, dry hair (or slightly damp, depending on the workshop — we will let you know when you book). For nail art classes, we provide practice tips (fake nails) so participants can experiment freely. If you want to serve drinks, snacks, or make it a party, that is entirely up to you — many of our clients turn the class into a full event with food and cocktails.",
  },
  {
    q: "Can I book a private one-on-one lesson?",
    a: "Yes, absolutely. Private lessons are available for all six of our workshop types. A one-on-one session gives you the full, undivided attention of a licensed professional who can tailor every minute of instruction to your specific needs, skill level, hair type, skin concerns, or goals. Private lessons are especially popular for brides who want personalized blowout or makeup training before their wedding, professionals who want to refine their daily routine, and men who want a comfortable, no-pressure environment to learn grooming basics. Contact us for private lesson pricing — rates vary by workshop type and are slightly higher than the group rate to reflect the personalized instruction.",
  },
  {
    q: "Are materials and supplies included?",
    a: "Yes, every single thing you need is included. We bring professional-grade tools, high-quality products, practice materials, mirrors, capes, and anything else required for the class. For braiding classes, we bring practice hair and mannequin heads. For nail art classes, we bring practice tips, polishes, art tools, and design templates. For skincare workshops, we bring product samples for testing. Every participant also receives a take-home guide — a printed or digital reference sheet with step-by-step instructions for everything covered in the class, plus product recommendations tailored to their needs. You never need to buy, bring, or prepare anything.",
  },
  {
    q: "Do you offer corporate and team-building classes?",
    a: "Corporate workshops are one of our most popular bookings. Our beauty and grooming classes make exceptional team-building activities, wellness day programming, employee appreciation events, and client entertainment experiences. We have worked with companies across every industry — tech startups in SoHo, law firms in Midtown, media companies in Hudson Yards, and agencies in DUMBO. The classes are interactive, social, and genuinely fun in a way that most corporate team-building activities are not. Participants leave with real skills they will actually use. We can customize the workshop content, duration, and format to fit your company's goals and budget. We also provide branded materials and can coordinate with your events team on logistics. Contact us to discuss corporate packages.",
  },
  {
    q: "What ages are appropriate for your classes?",
    a: "Our classes are appropriate for teens and adults of all ages. We regularly teach participants ranging from 13 to 70-plus years old. For younger teens (13 to 15), we recommend the nail art class, braiding basics, or skincare routine workshop as great starting points — these are especially popular for birthday parties and mother-daughter bonding sessions. The makeup masterclass is suitable for ages 16 and up. The men's grooming workshop is designed for adults but works well for teens 16 and older who are starting to develop a grooming routine. We have no upper age limit and love teaching participants who are discovering beauty skills for the first time later in life. If you are booking for a group with a wide age range, let us know and we will tailor the content accordingly.",
  },
  {
    q: "Do I need any experience?",
    a: "No experience is needed for any of our classes. Every workshop is built from the ground up to be accessible to total beginners while still offering depth and value for people with some existing knowledge. Our instructors are trained to teach, not just perform — they break down every technique into clear, manageable steps and provide hands-on corrections so you build muscle memory, not just theoretical understanding. Many of our students tell us they learned more in a single two-hour class than they did from months of watching YouTube tutorials, because there is simply no substitute for a licensed professional watching you practice and giving you real-time feedback on what to adjust.",
  },
];

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

export default function ClassesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        faqSchema(classFaqs)
      ).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Classes", url: "/classes" }])
      ).replace(/</g, '\\u003c') }} />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-white/60" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Classes & Workshops</span>
            <Sparkle className="h-4 w-4 text-white/60" />
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            Mobile Beauty Classes <span className="italic">& Workshops in NYC</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            Hands-on beauty workshops delivered to your door. DIY blowouts, braiding, makeup, skincare, nail art, and men&apos;s grooming — taught by licensed professionals in small groups. 6 workshops across all five NYC boroughs. $99/hour with a 2-hour minimum for groups of 3+.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className="inline-block rounded-full bg-white px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-purple-700 shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-50 font-display">Book a Class</Link>
            <Link href="/pricing" className="btn-outline-white">See Pricing</Link>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Beauty education that comes <span className="italic">to you</span>
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              The NYC Mobile Salon does not just do beauty services — we teach them too. Our mobile beauty classes bring licensed, working professionals directly to your living room, office, hotel suite, or any space in New York City where your group can gather comfortably. We offer six distinct workshops covering the full spectrum of beauty and grooming skills: a <Link href="/classes/diy-blowout-workshop" className="text-purple-600 hover:underline">DIY Blowout Workshop</Link> that teaches you salon-quality styling technique, a <Link href="/classes/braiding-basics-class" className="text-purple-600 hover:underline">Braiding Basics Class</Link> covering French braids, Dutch braids, fishtails and more, an <Link href="/classes/everyday-makeup-masterclass" className="text-purple-600 hover:underline">Everyday Makeup Masterclass</Link> for building a polished daily routine, a <Link href="/classes/skincare-routine-workshop" className="text-purple-600 hover:underline">Skincare Routine Workshop</Link> led by licensed estheticians, a <Link href="/classes/group-nail-art-class" className="text-purple-600 hover:underline">Group Nail Art Class</Link> that teaches real nail artist techniques, and a <Link href="/classes/mens-grooming-101" className="text-purple-600 hover:underline">Men&apos;s Grooming 101</Link> session covering skincare, beard care, and daily grooming fundamentals.
            </p>
            <p>
              Every class is priced at $99 per hour with a two-hour minimum for groups of three or more. That flat rate covers everything — the instructor, all professional tools, all products, all materials, and travel to your location anywhere in the five boroughs. There are no hidden fees, no per-person add-ons, and no supplies to buy in advance. We bring it all. You provide the space and the people, and we handle the rest. It is genuinely that simple. Most groups book a two-hour session, but you can extend to three or four hours if you want to cover more ground or combine elements from multiple workshops.
            </p>
            <p>
              What makes our approach to beauty education fundamentally different from watching tutorials on YouTube or scrolling through Instagram reels is the hands-on, real-time feedback loop. You are not passively watching a demonstration and hoping you can replicate it later on your own. You are actively practicing each technique under the direct supervision of a licensed professional who watches your hands, corrects your form, adjusts your angle, and gives you specific, personalized feedback that no video can ever provide. That is the difference between understanding a technique intellectually and actually being able to do it. Our students consistently tell us they learned more in a single two-hour workshop than in months of self-guided practice, because a professional can spot and correct the tiny mistakes that hold you back — mistakes you cannot see in yourself.
            </p>
            <p>
              Our instructors are not beauty influencers or hobbyists. They are licensed, insured professionals who work full-time in the beauty industry. Our hairstylists work in top NYC salons. Our makeup artists work on editorial shoots, weddings, and fashion shows. Our estheticians hold state licenses and continuing education certifications. Our nail artists work in high-end nail studios. Our barbers and grooming specialists work in established barbershops across the city. They teach because they love sharing their craft, and because they are genuinely skilled at breaking down professional techniques into learnable steps for non-professionals. Teaching is a skill in itself, and we select our instructors for both their professional ability and their ability to communicate and connect with students.
            </p>
            <p>
              Whether you are planning a girls&apos; night in Williamsburg, a bridal party workshop in Manhattan, a corporate team-building event in Midtown, a mother-daughter bonding session in Park Slope, a birthday celebration in Astoria, or you simply want to invest in your own skills with a private lesson — we have a class for you. Our workshops are designed to be social, engaging, and genuinely fun while delivering real, lasting skills that participants use long after the class ends. Most groups pair the workshop with drinks, snacks, and music to create a full experience, and we love that energy. Learning beauty skills should be fun, not intimidating.
            </p>
            <p>
              We serve all five boroughs — <Link href="/locations/manhattan" className="text-purple-600 hover:underline">Manhattan</Link>, <Link href="/locations/brooklyn" className="text-purple-600 hover:underline">Brooklyn</Link>, <Link href="/locations/queens" className="text-purple-600 hover:underline">Queens</Link>, <Link href="/locations/bronx" className="text-purple-600 hover:underline">the Bronx</Link>, and <Link href="/locations/staten-island" className="text-purple-600 hover:underline">Staten Island</Link> — with no travel surcharges within NYC. Our classes are available seven days a week, including evenings and weekends, so you can book at a time that works for your group. Most clients book one to two weeks in advance, though we can often accommodate shorter notice depending on availability.
            </p>
          </div>
        </div>
      </section>

      {/* Class Categories */}
      {classCategories.map((cat, catIdx) => {
        const isMens = cat.slug === "mens-classes";
        return (
          <section key={cat.slug} className={`px-4 py-16 md:py-20 ${catIdx % 2 === 0 ? "bg-purple-50/50" : "bg-white"}`}>
            <div className="mx-auto max-w-6xl">
              <div className="mb-6">
                <p className={`mb-2 text-xs font-semibold uppercase tracking-widest ${isMens ? "text-sky-500" : "text-purple-600"}`}>
                  <Sparkle className="mr-1 h-3 w-3" /> {cat.title}
                </p>
                <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
                  {cat.title} {cat.title === "Men's" ? "Grooming" : ""} Workshops
                </h2>
              </div>

              {/* Category intro paragraphs */}
              <div className="mb-10 max-w-4xl space-y-4 text-base leading-relaxed text-gray-600">
                {cat.slug === "hair-classes" && (
                  <>
                    <p>
                      Hair is the foundation of how most people present themselves to the world, yet the vast majority of us never received any formal training in how to style our own hair. We rely on salon visits for anything beyond a basic ponytail, spending hundreds or even thousands of dollars a year on blowouts and styling that we could learn to do ourselves with the right instruction. Our hair workshops change that equation entirely. Whether you want to master the art of the salon-quality blowout or learn to create beautiful braided styles for yourself, your friends, or your children, our licensed hairstylists break down professional techniques into clear, repeatable steps that anyone can learn.
                    </p>
                    <p>
                      Our hair classes are designed for all hair types and textures — fine, thick, curly, coily, wavy, and straight. Our instructors are experienced with the full range of hair types that New York City&apos;s diverse population brings, and they adapt their teaching to each participant&apos;s specific texture, length, and styling goals. The blowout workshop focuses on round brush technique, sectioning, tension control, and finishing, while the braiding class covers French braids, Dutch braids, fishtails, rope braids, and creative variations. Both classes include take-home guides with step-by-step instructions so you can practice and refine your skills after the workshop ends.
                    </p>
                  </>
                )}
                {cat.slug === "makeup-classes" && (
                  <>
                    <p>
                      Makeup is one of those skills that looks simple when a professional does it but feels overwhelming when you stand in front of your own mirror with a drawer full of products you are not sure how to use. The sheer volume of makeup content online — much of it contradictory, trend-driven, or created by people selling products — makes it harder, not easier, to figure out what actually works for your face. Our Everyday Makeup Masterclass cuts through the noise and teaches you the timeless fundamentals that professional makeup artists use every day: skin prep, foundation matching and application, concealer technique, brow shaping, eye basics, blush placement, and lip options.
                    </p>
                    <p>
                      This is not a class about dramatic, Instagram-worthy full glam. It is a practical workshop about building a quick, polished, everyday routine that takes 10 to 15 minutes and makes you look like the best version of yourself. You work on your own face throughout the class with a professional makeup artist guiding you step by step, correcting your technique, and helping you find the right products for your skin type, tone, and lifestyle. Every participant leaves with a personalized face chart showing exactly what products go where on their specific face. It is the kind of individualized instruction that would cost hundreds of dollars in a private consultation.
                    </p>
                  </>
                )}
                {cat.slug === "skincare-classes" && (
                  <>
                    <p>
                      The skincare industry generates billions of dollars by making routines seem complicated and selling you more products than you need. Our Skincare Routine Workshop, taught by licensed estheticians, strips away the marketing and teaches you the science-backed fundamentals of effective skincare: how to read your skin, how to choose products that actually work for your concerns, and how to build a simple, sustainable routine that delivers real results. Every participant receives a mini skin analysis at the start of the workshop, so the instruction is immediately relevant to their specific skin type and concerns.
                    </p>
                    <p>
                      We cover the core steps — cleansing, exfoliating, treating, moisturizing, and protecting — along with ingredient education that teaches you what retinol, niacinamide, hyaluronic acid, vitamin C, and other popular actives actually do, who they are right for, and how to layer them correctly. You will learn to read ingredient labels, identify marketing hype, and stop wasting money on products that are wrong for your skin. Whether you are dealing with acne, aging, hyperpigmentation, sensitivity, dryness, or oiliness, our estheticians have seen it all and can guide you toward a routine that works.
                    </p>
                  </>
                )}
                {cat.slug === "nail-classes" && (
                  <>
                    <p>
                      Nail art has exploded in popularity over the past decade, transforming from a niche hobby into a mainstream form of self-expression. But the gap between the stunning designs you see on social media and what you can actually create at home with no training can feel impossibly wide. Our Group Nail Art Class bridges that gap by teaching you the real techniques, tools, and tricks that professional nail artists use — starting with the basics and building up to designs that look genuinely impressive. You will learn dotting, striping, color blocking, gradient effects, florals, geometric patterns, and freehand art, all with guidance and real-time feedback from a working nail artist.
                    </p>
                    <p>
                      One of the best parts of our nail art class is that we provide practice tips — fake nails — so you can experiment freely without worrying about messing up your own manicure. This removes the pressure and lets you focus entirely on learning technique. By the end of the two-hour session, you will have mastered three to five new designs that you can recreate at home, and you will understand the fundamentals well enough to start creating your own original designs. This workshop is one of our most popular for birthday parties, bachelorette parties, and girls&apos; nights because it is inherently social and creative.
                    </p>
                  </>
                )}
                {cat.slug === "mens-classes" && (
                  <>
                    <p>
                      Most men never received any formal grooming education. The skincare routine, beard maintenance, brow cleanup, and daily grooming habits that make someone look polished and put-together are skills that are rarely taught in any structured way. Our Men&apos;s Grooming 101 workshop fills that gap with practical, no-nonsense instruction from licensed barbers and grooming specialists who work with men every day. This is not about vanity or trends — it is about learning the fundamental daily habits that make a real, visible difference in how you look and feel.
                    </p>
                    <p>
                      The workshop covers building a skincare routine that takes three minutes, beard trimming and shaping techniques, maintaining a clean neckline between barber visits, brow grooming basics, and product recommendations that actually work without requiring a 12-step routine. Every participant leaves with a personalized grooming plan tailored to their face shape, skin type, and lifestyle. This class is especially popular for grooms preparing for their wedding, groomsmen groups, and corporate teams looking for a unique, practical team-building experience that guys will actually enjoy.
                    </p>
                  </>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {cat.items.map((cls) => {
                  const content = classContent[cls.slug];
                  return (
                    <Link key={cls.slug} href={`/classes/${cls.slug}`} className={`group rounded-xl border bg-white p-6 transition-all hover:shadow-md ${isMens ? "border-sky-100 hover:shadow-sky-500/10" : "border-purple-100 hover:shadow-purple-500/10"}`}>
                      <h3 className={`font-display mb-2 text-xl font-semibold text-charcoal transition-colors ${isMens ? "group-hover:text-sky-600" : "group-hover:text-purple-600"}`}>{cls.name}</h3>
                      <p className="mb-3 text-sm text-gray-500">{cls.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{cls.duration}</span>
                        <span className="text-gray-300">|</span>
                        <span>{cls.groupSize} people</span>
                        {content && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span>From {content.price}</span>
                          </>
                        )}
                        <span className={`ml-auto font-semibold transition-transform group-hover:translate-x-1 ${isMens ? "text-sky-500" : "text-purple-600"}`}>&rarr;</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {/* What Makes Our Classes Different */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-purple-600">
              <Sparkle className="mr-1 h-3 w-3" /> The Difference
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
              What makes our classes <span className="italic">different</span>
            </h2>
          </div>
          <p className="mx-auto mb-12 max-w-3xl text-center text-lg text-gray-600">
            There are plenty of places to take a beauty class in New York City. Studios, schools, pop-up workshops, online courses. Here is why thousands of New Yorkers choose our mobile workshops instead.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Small Groups, Personalized Attention",
                description: "Our classes max out at 8 to 12 people, and most groups are even smaller. That means your instructor can watch your hands, correct your technique, and give you individualized feedback throughout the entire session. You are not one face in a crowd of 30 watching a demo on a stage — you are an active participant getting real coaching from a professional who is paying attention to you specifically.",
              },
              {
                title: "Hands-On Practice, Not Just Watching",
                description: "You spend the majority of every class actively practicing techniques on yourself, on practice materials, or on each other — with a professional guiding you in real time. This is not a lecture or a demonstration where you take notes and hope you remember later. You build actual muscle memory during the session, which is the only way to truly learn a physical skill like styling hair, applying makeup, or creating nail art.",
              },
              {
                title: "Licensed, Working Instructors",
                description: "Every instructor holds a valid New York State license in their specialty and works actively in the beauty industry. Our hairstylists work in top salons, our makeup artists work on editorial and bridal, our estheticians hold advanced certifications, our nail artists work in high-end studios, and our barbers work in established shops across the city. You are learning from people who do this professionally every single day — not hobbyists or social media influencers.",
              },
              {
                title: "We Come to You",
                description: "You do not need to commute to a studio, find parking, or navigate the subway with a group. We come directly to your apartment, house, office, hotel, Airbnb, or any space where your group can gather comfortably. This makes our workshops dramatically more convenient than any studio-based class, and it means you are learning in a relaxed, familiar environment where you can truly focus on the instruction without the stress of being in an unfamiliar place.",
              },
              {
                title: "All Materials Provided",
                description: "We bring every single thing needed for the class — professional-grade tools, high-quality products, practice materials, mirrors, capes, handouts, and reference guides. You never need to buy anything in advance or worry about whether you have the right supplies. Our instructors arrive fully equipped with everything the group needs, so all you have to do is show up in your own space and be ready to learn.",
              },
              {
                title: "Take-Home Reference Guides",
                description: "Every participant leaves with a detailed take-home guide — a printed or digital reference sheet with step-by-step instructions, product recommendations, and technique reminders for everything covered in the class. This means you can continue practicing and refining your skills long after the workshop ends. Many of our students tell us they still reference their guide months later when trying a technique they learned in class.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-purple-100 bg-purple-50/30 p-6">
                <h3 className="font-display mb-3 text-lg font-semibold text-charcoal">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Takes Our Classes */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-purple-600">
              <Sparkle className="mr-1 h-3 w-3" /> Who It&apos;s For
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
              Who takes our <span className="italic">classes</span>
            </h2>
          </div>
          <p className="mx-auto mb-12 max-w-3xl text-center text-lg text-gray-600">
            Our workshops are designed to be social, engaging, and genuinely fun. Here are some of the most popular ways people book our mobile beauty classes across New York City.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Girls' Nights",
                description: "Our most popular booking type. Get your friends together, open a bottle of wine, and spend two hours learning a new beauty skill with a licensed professional guiding every step. Blowout and braiding workshops are the top picks for girls' nights, followed closely by nail art and makeup. It is infinitely more fun and memorable than just going out to dinner.",
              },
              {
                title: "Bridal Parties",
                description: "Brides book our workshops as a unique, interactive bridal shower or bachelorette activity. The braiding class, makeup masterclass, and nail art workshop are the most popular choices for bridal groups. Bridesmaids learn skills they can actually use on the wedding day and beyond, and the whole experience makes for great photos and memories. We have hosted bridal workshops across all five boroughs.",
              },
              {
                title: "Corporate Team Building",
                description: "Companies book our workshops for team-building days, wellness programming, employee appreciation events, and client entertainment. Our classes are interactive and social in a way that builds genuine connection between colleagues — far more effective than trust falls or escape rooms. We work with companies of all sizes and can customize content, duration, and format to fit your goals.",
              },
              {
                title: "Mother-Daughter Bonding",
                description: "Moms and daughters of all ages book our classes as a special bonding experience. The braiding class is especially popular — moms learn to braid their daughters' hair, and older daughters learn techniques they can do on themselves. Skincare workshops are another great pick for mother-daughter pairs who want to build healthy routines together. A meaningful way to spend quality time.",
              },
              {
                title: "Birthday Parties",
                description: "Looking for a birthday party activity that is creative, interactive, and genuinely fun? Our nail art and makeup classes are the top choices for birthday celebrations, especially for teens and young adults. The entire group learns something new together, and everyone leaves with skills they will actually use. Far more memorable than a typical birthday dinner or bar outing.",
              },
              {
                title: "Self-Improvement",
                description: "Not every booking is a group event. Many clients book our classes simply because they want to invest in themselves — learning to do their own blowout to save money on weekly salon visits, building a proper skincare routine, mastering everyday makeup for a new job, or learning grooming skills they never picked up. Private and small-group lessons for personal skill-building are growing fast.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="font-display mb-3 text-lg font-semibold text-charcoal">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-purple-600">
              <Sparkle className="mr-1 h-3 w-3" /> How It Works
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
              Three steps to your <span className="italic">workshop</span>
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Choose Your Class & Date",
                description: "Pick from our six workshop types — blowouts, braiding, makeup, skincare, nail art, or men's grooming. Tell us your preferred date, time, group size, and location. We are available seven days a week, including evenings and weekends, across all five boroughs. Most clients book one to two weeks in advance, but we can often accommodate shorter notice.",
              },
              {
                step: "2",
                title: "We Come to You, Fully Equipped",
                description: "On the day of your workshop, your licensed instructor arrives at your location with everything needed — professional tools, products, materials, practice supplies, mirrors, and take-home guides. There is nothing for you to buy, prepare, or set up. Just make sure you have enough space for your group to sit comfortably and access to a bathroom with running water.",
              },
              {
                step: "3",
                title: "Learn, Practice & Have Fun",
                description: "Your instructor leads the group through hands-on instruction, demonstrating each technique and then guiding every participant through practicing it themselves. You get real-time feedback, personalized tips, and corrections that help you build genuine skills — not just theoretical understanding. Every participant leaves with new abilities and a take-home reference guide to keep practicing.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-lg font-bold text-white">
                  {item.step}
                </div>
                <h3 className="font-display mb-3 text-lg font-semibold text-charcoal">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/book" className="inline-block rounded-full bg-purple-600 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-700 font-display">
              Book Your Workshop
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> Pricing
          </p>
          <h2 className="font-display mb-6 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Simple, transparent <span className="italic">pricing</span>
          </h2>
          <div className="mx-auto max-w-2xl rounded-xl border border-purple-100 bg-white p-8 shadow-sm">
            <p className="font-display text-5xl font-bold text-purple-600">$99<span className="text-2xl text-gray-400">/hr</span></p>
            <p className="mt-2 text-lg font-medium text-charcoal">2-hour minimum for groups of 3+</p>
            <div className="mt-6 space-y-3 text-left text-gray-600">
              <p>
                All of our mobile beauty workshops are priced at a flat $99 per hour with a two-hour minimum for groups of three or more. This rate covers your licensed instructor, all professional tools and products, all practice materials, travel to your location anywhere in the five boroughs, and take-home reference guides for every participant. There are no per-person charges, no material fees, and no travel surcharges within NYC.
              </p>
              <p>
                For private one-on-one lessons or groups of two, pricing varies by workshop type. Corporate bookings, extended sessions, and multi-class packages may qualify for custom rates. <Link href="/pricing" className="text-purple-600 hover:underline">View our full pricing page</Link> for details, or <Link href="/book" className="text-purple-600 hover:underline">contact us</Link> to discuss your specific needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Available by Borough */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> By Location
          </p>
          <h2 className="font-display mb-4 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Workshops across all five boroughs
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-gray-600">
            We teach mobile beauty classes in every corner of New York City — from the Upper East Side to Bay Ridge, from Astoria to Riverdale. No matter which borough you call home, our instructors will come to you with everything needed for a professional workshop experience. No travel surcharges, no distance limits within NYC.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {Object.entries(boroughNames).map(([slug, name]) => (
              <Link key={slug} href={`/locations/${slug}`} className="card-hover rounded-xl border border-purple-100 bg-white p-6 text-center">
                <p className="text-lg font-semibold text-charcoal">{name}</p>
                <p className="mt-1 text-xs text-purple-600">{neighborhoods[slug]?.length} neighborhoods &rarr;</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-purple-50/50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-4 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Workshop <span className="italic">FAQ</span>
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-gray-600">
            Everything you need to know about booking a mobile beauty class in New York City. If your question is not answered here, reach out to us directly and we will get back to you within a few hours.
          </p>
          <div className="divide-y divide-purple-100">
            {classFaqs.map((faq) => (
              <div key={faq.q} className="py-6">
                <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">{faq.q}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-4 py-16 md:py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-4 text-3xl font-medium text-charcoal md:text-4xl">
            Ready to <span className="italic">learn?</span>
          </h2>
          <p className="mx-auto mb-4 max-w-2xl text-lg text-gray-600">
            Whether you are planning a girls&apos; night, bridal party, corporate team event, birthday celebration, or just want to invest in your own beauty skills, our mobile workshops bring professional instruction directly to your door. Six workshops, all five boroughs, $99 per hour.
          </p>
          <p className="mb-8 text-gray-500">
            Most clients book one to two weeks in advance. Choose your class, pick your date, and let us handle the rest. All tools, products, and materials included — you just provide the space and the enthusiasm.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className="inline-block rounded-full bg-purple-600 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-700 font-display">
              Book a Workshop
            </Link>
            <Link href="/pricing" className="inline-block rounded-full border-2 border-purple-200 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-purple-600 transition hover:-translate-y-0.5 hover:border-purple-300 hover:bg-purple-50 font-display">
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
