import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from "next";
import Link from "next/link";
import { neighborhoods, boroughNames } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title: "Join Our Team — Licensed Beauty Pros Wanted | The NYC Mobile Salon",
  description:
    "Join The NYC Mobile Salon team. Licensed hairstylists, barbers, nail techs, makeup artists, and estheticians wanted. Set your own schedule, keep more of what you earn, work across all 5 NYC boroughs. Apply today.",
  alternates: { canonical: "https://thenycmobilesalon.com/join" },
  openGraph: {
    title: "Join Our Team — Licensed Beauty Pros Wanted | The NYC Mobile Salon",
    description:
      "Join The NYC Mobile Salon team. Licensed hairstylists, barbers, nail techs, makeup artists, and estheticians wanted. Set your own schedule, keep more of what you earn, work across all 5 NYC boroughs. Apply today.",
    url: "https://thenycmobilesalon.com/join",
  },
};

/* ── data ─────────────────────────────────────────────────────────── */

const roles = [
  {
    title: "Hairstylists",
    description:
      "Blowouts, precision cuts, color treatments, braids, extensions, and updos. Whether your specialty is natural hair, balayage, keratin treatments, or bridal updos, we have clients looking for exactly what you do. Our hairstylists are booked for everything from quick blowouts before a night out to full color transformations in the comfort of a client's home.",
    requirements: "Must hold a valid NYS cosmetology license.",
  },
  {
    title: "Barbers",
    description:
      "Fades, tapers, haircuts, beard shaping, hot towel shaves, and full grooming packages. NYC's busiest professionals rely on mobile barbers who can come to their apartment, office, or hotel before a big meeting or event. If you can deliver a clean fade and a sharp line-up every single time, our clients are waiting for you.",
    requirements: "Must hold a valid NYS barber license.",
  },
  {
    title: "Nail Technicians",
    description:
      "Manicures, pedicures, gel polish, dip powder, acrylic sets, nail art, and spa-quality hand and foot treatments. From bridal parties that need ten matching sets to busy moms who just want a quiet gel mani at home, nail techs are among our most-requested professionals. If you have a steady hand and an eye for detail, we want to hear from you.",
    requirements: "Must hold a valid NYS nail specialty or cosmetology license.",
  },
  {
    title: "Makeup Artists",
    description:
      "Everyday glam, bridal makeup, event looks, editorial styling, and special-effects artistry. Our makeup artists are booked for weddings, galas, photo shoots, proms, and corporate headshot sessions across all five boroughs. If you can work with every skin tone and create looks that last from morning to midnight, you belong on our roster.",
    requirements: "Must hold a valid NYS cosmetology license. Portfolio required.",
  },
  {
    title: "Estheticians",
    description:
      "Facials, chemical peels, microdermabrasion, extractions, LED therapy, and customized skincare consultations. New Yorkers are investing more than ever in their skin, and they want professional-grade treatments without the commute. Our estheticians bring the spa experience to apartments, offices, and event venues across the city.",
    requirements: "Must hold a valid NYS esthetics license.",
  },
  {
    title: "Waxing Specialists",
    description:
      "Full-body waxing, brow shaping, facial waxing, and Brazilian waxing services. Speed, precision, and client comfort are everything in this category. If you can deliver a virtually painless experience and keep clients coming back every four to six weeks, there is a full book of appointments waiting for you on our platform.",
    requirements: "Must hold a valid NYS esthetics or cosmetology license.",
  },
];

const benefits = [
  {
    title: "Set Your Own Schedule",
    description:
      "You decide when you work. Morning, evening, weekdays, weekends — accept only the appointments that fit your life. Whether you want to work five days a week or just pick up extra clients on Saturdays, the flexibility is entirely in your hands. No shift assignments, no mandatory hours.",
  },
  {
    title: "$49/hr — Paid Instantly",
    description:
      "We pay $49 per hour via Zelle or Apple Cash within 30 minutes of job completion — usually within 5 minutes of client payment. No waiting for Friday. No invoicing. No hidden fees, no product charges, and no surprise deductions. Tips are additional and 100% yours.",
  },
  {
    title: "We Supply the Clients",
    description:
      "No more spending your evenings on Instagram trying to drum up bookings. We invest heavily in marketing, SEO, and partnerships so that a steady stream of clients is always flowing to our platform. You focus on your craft — we focus on filling your calendar.",
  },
  {
    title: "All 5 Boroughs",
    description:
      "Work in the neighborhoods you already know and love. Manhattan, Brooklyn, Queens, the Bronx, Staten Island — you choose your service area and we match you with clients nearby. No long commutes across the city unless you want them.",
  },
  {
    title: "Liability Insurance Included",
    description:
      "Every professional on our roster is covered by our comprehensive general liability insurance policy at no cost to you. That means you can focus entirely on delivering great service without worrying about costly coverage on your own.",
  },
  {
    title: "No Booth Rental Fees",
    description:
      "Forget paying $300 to $500 a week just for a chair. With The NYC Mobile Salon, you never pay booth rent, station fees, or any kind of fixed overhead. Your only investment is your time, your talent, and your tools.",
  },
  {
    title: "Ongoing Training & Support",
    description:
      "We host quarterly workshops, connect you with product educators, and provide business coaching to help you grow. Whether you want to master a new balayage technique or learn how to upsell add-on services, we invest in your development.",
  },
  {
    title: "Growth Opportunities",
    description:
      "Top-performing professionals earn priority access to high-value bookings, VIP client lists, and special event opportunities. As our platform grows, the best talent gets rewarded first — with more bookings, higher-ticket clients, and leadership roles on our team.",
  },
];

const steps = [
  {
    number: "1",
    title: "Apply",
    description:
      "Fill out the application form with your name, specialty, availability, Instagram handle, and a quick video selfie. Upload your resume if you have one. It takes less than five minutes to get started.",
  },
  {
    number: "2",
    title: "We Verify",
    description:
      "Our team checks your New York State license, contacts your references, reviews your portfolio, and conducts a brief phone interview to make sure we are a great fit for each other.",
  },
  {
    number: "3",
    title: "Get Matched",
    description:
      "Once you are approved, you start receiving client bookings in your preferred service area. Our matching algorithm connects you with clients who need exactly what you offer, when you are available.",
  },
  {
    number: "4",
    title: "Do What You Love",
    description:
      "Show up, deliver an incredible experience, and get paid. We handle scheduling, payments, and customer support so you can focus entirely on your craft and your clients.",
  },
];

const testimonials = [
  {
    name: "Jasmine T.",
    role: "Hairstylist — Brooklyn",
    quote:
      "I used to spend half my week worrying about where my next client was coming from. Since joining The NYC Mobile Salon, my calendar stays full and I actually get to choose when I work. Last month I took three days off to visit my family and I still earned more than I did working six days at my old salon. The flexibility alone changed my life, but the consistent bookings are what really sold me. I wish I had made this move years ago.",
  },
  {
    name: "Marcus D.",
    role: "Barber — Queens",
    quote:
      "I was paying $400 a week in booth rent and still hustling for every client. Now I keep way more of what I earn and the clients just come to me through the app. I work in Astoria, Jackson Heights, and Long Island City — all neighborhoods I grew up in. The best part is I have regulars now who book me every two weeks like clockwork. Steady income, no overhead, and I get to be my own boss.",
  },
  {
    name: "Priya K.",
    role: "Nail Technician — Manhattan",
    quote:
      "I specialize in gel extensions and nail art, and The NYC Mobile Salon connected me with clients who actually value that artistry. I have done bridal parties in Tribeca, press-on consultations in the Upper East Side, and gel sets for fashion editors in SoHo. I am earning about 40 percent more than I was at the nail salon, and I never have to split tips or pay for someone else's overhead.",
  },
  {
    name: "Danielle R.",
    role: "Makeup Artist — Bronx & Manhattan",
    quote:
      "Event bookings used to be feast or famine. Some months I would have five weddings and the next month nothing. The NYC Mobile Salon gives me a mix of everyday clients and big events so my income stays consistent year-round. I did three holiday parties last December, a New Year's Eve gala, and a dozen regular glam appointments — all through the platform. They really take care of their artists.",
  },
];

const faqs = [
  {
    q: "How much can I earn as a mobile beauty professional in NYC?",
    a: "We pay $49 per hour via Zelle or Apple Cash within 30 minutes of job completion — usually within 5 minutes of client payment. Part-time professionals working weekends typically earn $490 to $735 per week, while full-time pros working 30-40 hours take home $1,470 to $1,960. Event-heavy weeks can push earnings even higher. Because there are no booth rental fees or overhead costs, most professionals keep significantly more than they did in a traditional salon setting. Tips are additional and 100% yours.",
  },
  {
    q: "How do I get clients?",
    a: "We handle all marketing, advertising, search engine optimization, and client acquisition. When a client books a service in your area and specialty, you receive a notification and can accept the appointment. Our matching system prioritizes professionals based on location, availability, ratings, and expertise so that the right clients are always connected with the right pros.",
  },
  {
    q: "What is the application process?",
    a: "The process is straightforward. Fill out the application form on this page with your name, specialty, availability, Instagram handle, and a short video selfie (minimum 30 seconds). You can also upload your resume. Our team will verify your New York State license, check references, and schedule a brief phone interview. Most applicants hear back within 48 hours, and the entire onboarding process typically takes less than one week.",
  },
  {
    q: "Do I need my own tools and products?",
    a: "Yes. All professionals on our platform are expected to bring their own professional-grade tools, equipment, and products to every appointment. This includes everything from shears and clippers to nail lamps and makeup kits. You know your tools best, and your clients expect a professional setup from the moment you arrive.",
  },
  {
    q: "Is this full-time or part-time?",
    a: "That is entirely up to you. Many of our professionals work full-time and treat The NYC Mobile Salon as their primary source of income. Others use the platform to supplement an existing salon schedule or pick up extra clients on weekends. You set your own hours, your own availability, and your own service area — there are no minimum hour requirements.",
  },
  {
    q: "What areas of New York City can I work in?",
    a: "We serve all five boroughs: Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. During onboarding, you select the neighborhoods and boroughs where you are willing to travel. You can update your service area at any time. Most professionals choose neighborhoods close to where they live so they can minimize travel time between appointments.",
  },
  {
    q: "How and when do I get paid?",
    a: "You get paid $49 per hour via Zelle or Apple Cash within 30 minutes of job completion — in most cases, payment hits within 5 minutes of the client paying. No waiting for Friday. No invoicing. No chasing clients. You finish the appointment, and the money is in your account before you get to your next booking. It is that fast.",
  },
  {
    q: "Do you provide liability insurance?",
    a: "Yes. Every professional on our roster is covered by our comprehensive general liability insurance policy at no additional cost. This coverage protects you while you are performing services booked through The NYC Mobile Salon platform. We believe our team should be able to focus on their craft without worrying about costly insurance premiums.",
  },
];


/* ── component ────────────────────────────────────────────────────── */

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

export default function JoinPage() {
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(faqSchema(faqs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Join Our Team", url: "/join" },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: "Licensed Mobile Beauty Professional — NYC",
            description: "Join The NYC Mobile Salon as a licensed mobile beauty professional. Hairstylists, barbers, nail technicians, makeup artists, estheticians, and waxing specialists wanted. $49/hour paid via Zelle or Apple Cash within 30 minutes of job completion. Flexible schedule, all 5 NYC boroughs. No booth rental fees. Liability insurance included.",
            identifier: {
              "@type": "PropertyValue",
              name: "The NYC Mobile Salon",
              value: "nycms-all-services",
            },
            datePosted: new Date().toISOString().split("T")[0],
            validThrough: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
            employmentType: ["FULL_TIME", "PART_TIME"],
            hiringOrganization: {
              "@type": "Organization",
              name: "The NYC Mobile Salon",
              sameAs: "https://thenycmobilesalon.com",
              logo: "https://thenycmobilesalon.com/logo.png",
            },
            jobLocation: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                streetAddress: "150 W 47th St",
                addressLocality: "New York",
                addressRegion: "NY",
                postalCode: "10036",
                addressCountry: "US",
              },
            },
            applicantLocationRequirements: {
              "@type": "City",
              name: "New York",
            },
            baseSalary: {
              "@type": "MonetaryAmount",
              currency: "USD",
              value: {
                "@type": "QuantitativeValue",
                value: 49,
                minValue: 49,
                maxValue: 100,
                unitText: "HOUR",
              },
            },
            directApply: true,
            experienceRequirements: {
              "@type": "OccupationalExperienceRequirements",
              monthsOfExperience: 24,
            },
            qualifications: "Valid New York State cosmetology, barbering, esthetics, or nail specialty license required",
            jobBenefits: "Flexible schedule, no booth rental fees, liability insurance included, weekly direct deposit, bonus programs, ongoing training",
          }),
        }}
      />

      {/* ── 1. Hero ──────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 py-24 text-white md:py-32"
        style={{
          background:
            "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)",
        }}
      >
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
            <Sparkle className="h-3.5 w-3.5 text-yellow-300" />
            Now Recruiting
          </span>
          <h1 className="mb-6 font-display text-5xl font-black tracking-tight md:text-6xl lg:text-7xl">
            Join NYC&rsquo;s Mobile Salon&nbsp;Team
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90 md:text-xl">
            Licensed hairstylists, barbers, nail technicians, makeup artists, estheticians, and waxing specialists — The NYC Mobile Salon is growing and we need talented professionals like you. Set your own schedule, keep more of what you earn, and work across all five boroughs.
          </p>
          <Link
            href="/join/application"
            className="inline-block rounded-full bg-white px-10 py-4 text-sm font-bold text-purple-600 shadow-lg transition hover:bg-purple-50"
          >
            Apply Now — $49/hr
          </Link>
        </div>
      </section>

      {/* ── Quick Stats Bar ──────────────────────────────────────── */}
      <section className="bg-charcoal px-4 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { value: "$49", label: "Per Hour" },
            { value: "Instant", label: "Zelle / Apple Cash" },
            { value: "0", label: "Booth Rental Fees" },
            { value: "5", label: "NYC Boroughs" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-3xl font-black text-purple-400 md:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. Intro ─────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            The Opportunity
          </h2>
          <h3 className="mb-8 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            A Better Way to Build Your Beauty Career
          </h3>
          <div className="space-y-5 text-slate-600 leading-relaxed">
            <p>
              The mobile beauty industry is booming, and New York City is at the center of it. More clients than ever are choosing the convenience of having a licensed professional come to their home, office, hotel, or event venue instead of traveling to a traditional salon. At The NYC Mobile Salon, we have been at the forefront of this shift since day one — and the demand is growing faster than we can keep up.
            </p>
            <p>
              That is where you come in. We are actively looking for experienced, licensed beauty professionals across every specialty to join our growing roster. Whether you are a hairstylist who specializes in blowouts and color, a barber known for clean fades, a nail technician with an eye for detail, a makeup artist who can create any look from natural to editorial, or an esthetician delivering spa-quality facials in living rooms across the city — there is a place for you on our team.
            </p>
            <p>
              We are not a staffing agency and we are not a franchise. We are a modern beauty platform that connects New York City&rsquo;s best independent professionals with thousands of clients who are ready to book. We handle the marketing, the scheduling, the payment processing, and the customer service. You handle what you do best: making people look and feel incredible.
            </p>
            <p>
              Our professionals earn more than they did in traditional salons because they keep a larger share of every appointment and pay zero booth rental fees. They work the hours they choose, in the boroughs they prefer, with the support of a team that genuinely cares about their success. If that sounds like the kind of career you have been looking for, keep reading.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Who We're Looking For ─────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            Open Roles
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Who We&rsquo;re Looking For
          </h3>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <div
                key={role.title}
                className="rounded-xl border border-purple-100 bg-white p-6"
              >
                <h4 className="mb-3 font-display text-xl font-bold text-slate-800">
                  {role.title}
                </h4>
                <p className="mb-4 text-sm leading-relaxed text-slate-600">
                  {role.description}
                </p>
                <p className="text-xs font-semibold text-purple-600">
                  {role.requirements}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Why Join Us ───────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            Benefits
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Why Beauty Professionals Choose Us
          </h3>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-xl border border-purple-100 bg-white p-6"
              >
                <h4 className="mb-3 font-display text-lg font-bold text-slate-800">
                  {benefit.title}
                </h4>
                <p className="text-sm leading-relaxed text-slate-500">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. How It Works ──────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            Process
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            How It Works
          </h3>
          <div className="grid gap-8 md:grid-cols-4">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-xl font-black text-white">
                  {step.number}
                </div>
                <h4 className="mb-2 font-display text-lg font-bold text-slate-800">
                  {step.title}
                </h4>
                <p className="text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Testimonials ──────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            From Our Team
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            What Our Professionals Say
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-purple-100 bg-white p-6"
              >
                <p className="mb-4 text-sm leading-relaxed text-slate-600 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="font-display font-bold text-slate-800">{t.name}</p>
                  <p className="text-xs text-purple-600">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Requirements ──────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            Before You Apply
          </h2>
          <h3 className="mb-8 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Requirements
          </h3>
          <div className="rounded-xl border border-purple-100 bg-white p-8">
            <p className="mb-6 text-sm leading-relaxed text-slate-600">
              To maintain the highest standard of service for our clients and protect the reputation of every professional on our platform, we require the following from all applicants. Please review these carefully before submitting your application.
            </p>
            <ul className="space-y-4">
              {[
                {
                  title: "Valid New York State License",
                  detail:
                    "You must hold a current, valid NYS cosmetology, barbering, esthetics, or nail specialty license. We verify every license before onboarding and conduct periodic checks to ensure ongoing compliance.",
                },
                {
                  title: "Own Professional Tools and Kit",
                  detail:
                    "You are expected to arrive at every appointment with your own professional-grade tools, products, and supplies. This includes shears, clippers, brushes, nail lamps, makeup kits, skincare devices, and any other equipment required for your specialty.",
                },
                {
                  title: "Reliable Transportation",
                  detail:
                    "As a mobile professional, you need reliable transportation to travel between appointments across your chosen service area. Whether you drive, use public transit, or ride-share is up to you — but punctuality is non-negotiable.",
                },
                {
                  title: "Professional Attitude and Appearance",
                  detail:
                    "You are representing The NYC Mobile Salon every time you walk through a client's door. We expect a polished, professional appearance and a warm, respectful attitude with every client, every time.",
                },
                {
                  title: "At Least 2 Years of Experience (Preferred)",
                  detail:
                    "While we welcome applications from professionals at all experience levels, we strongly prefer candidates with at least two years of hands-on experience in their specialty. This ensures you can handle a wide range of client requests confidently.",
                },
                {
                  title: "Smartphone for Booking Management",
                  detail:
                    "All bookings, client communication, and scheduling are managed through our platform. You will need a smartphone with a reliable internet connection to receive appointment notifications, confirm bookings, and communicate with clients.",
                },
              ].map((req) => (
                <li key={req.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">
                    &#10003;
                  </span>
                  <div>
                    <p className="font-display font-bold text-slate-800">
                      {req.title}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {req.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Earnings Breakdown ────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            Earning Potential
          </h2>
          <h3 className="mb-4 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Example Weekly Earnings
          </h3>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-slate-600 leading-relaxed">
            Your earnings depend on your specialty, experience, and how many hours you choose to work. Here is a realistic breakdown of what mobile beauty professionals earn through The NYC Mobile Salon. These figures are based on actual booking data from our platform — not projections.
          </p>

          <div className="overflow-hidden rounded-xl border border-purple-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50">
                  <th className="px-6 py-4 text-left font-display font-bold text-slate-800">Schedule</th>
                  <th className="px-6 py-4 text-left font-display font-bold text-slate-800">Hours/Week</th>
                  <th className="px-6 py-4 text-left font-display font-bold text-slate-800">Weekly Earnings</th>
                  <th className="hidden px-6 py-4 text-left font-display font-bold text-slate-800 md:table-cell">Monthly Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-700">Part-Time (Weekends Only)</td>
                  <td className="px-6 py-4 text-slate-600">10-15 hrs</td>
                  <td className="px-6 py-4 font-semibold text-purple-600">$490 - $735</td>
                  <td className="hidden px-6 py-4 text-slate-600 md:table-cell">$1,960 - $2,940</td>
                </tr>
                <tr className="bg-purple-50/30">
                  <td className="px-6 py-4 font-medium text-slate-700">Mid-Range (3-4 Days)</td>
                  <td className="px-6 py-4 text-slate-600">20-25 hrs</td>
                  <td className="px-6 py-4 font-semibold text-purple-600">$980 - $1,225</td>
                  <td className="hidden px-6 py-4 text-slate-600 md:table-cell">$3,920 - $4,900</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-700">Full-Time (5-6 Days)</td>
                  <td className="px-6 py-4 text-slate-600">30-40 hrs</td>
                  <td className="px-6 py-4 font-semibold text-purple-600">$1,470 - $1,960</td>
                  <td className="hidden px-6 py-4 text-slate-600 md:table-cell">$5,880 - $7,840</td>
                </tr>
                <tr className="bg-purple-50/30">
                  <td className="px-6 py-4 font-medium text-slate-700">Event-Heavy Weeks</td>
                  <td className="px-6 py-4 text-slate-600">35-45 hrs</td>
                  <td className="px-6 py-4 font-semibold text-purple-600">$1,715 - $2,205</td>
                  <td className="hidden px-6 py-4 text-slate-600 md:table-cell">$6,860 - $8,820</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Based on $49/hr rate. Paid via Zelle or Apple Cash within 30 minutes of job completion. Tips are additional and 100% yours. Event bookings and group sessions often run 2-4 hours per appointment.
          </p>
        </div>
      </section>

      {/* ── Bonus & Reward Programs ──────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            Earn More
          </h2>
          <h3 className="mb-4 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Bonus &amp; Reward Programs
          </h3>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-slate-600 leading-relaxed">
            On top of your per-appointment earnings, we run several bonus programs designed to reward excellence, consistency, and client loyalty. The better you perform, the more you earn — it is that simple.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-lg">&#x1F501;</div>
              <h4 className="mb-2 font-display text-lg font-bold text-slate-800">Client Retention Bonus</h4>
              <p className="text-sm leading-relaxed text-slate-600">
                When clients request you by name for repeat bookings, that is proof you are delivering exceptional service. Professionals with high retention rates earn bonus payouts on top of their standard rate. The more repeat clients you build, the more you earn — and the more consistent your income becomes.
              </p>
            </div>

            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-lg">&#x2B50;</div>
              <h4 className="mb-2 font-display text-lg font-bold text-slate-800">Review Milestone Rewards</h4>
              <p className="mb-4 text-sm leading-relaxed text-slate-600">
                Hit verified five-star review milestones and unlock reward tiers. Each tier comes with bonus payouts, priority booking access, and recognition on our platform.
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2">
                  <span className="font-semibold text-slate-700">10 Reviews — Rising Star</span>
                  <span className="text-purple-600">Tier 1 Bonus</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2">
                  <span className="font-semibold text-slate-700">25 Reviews — Trusted Pro</span>
                  <span className="text-purple-600">Tier 2 Bonus</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2">
                  <span className="font-semibold text-slate-700">50 Reviews — Elite Artist</span>
                  <span className="text-purple-600">Tier 3 Bonus</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2">
                  <span className="font-semibold text-slate-700">100+ Reviews — MVP</span>
                  <span className="text-purple-600">Tier 4 Bonus + VIP Access</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-lg">&#x1F91D;</div>
              <h4 className="mb-2 font-display text-lg font-bold text-slate-800">Referral Commission</h4>
              <p className="text-sm leading-relaxed text-slate-600">
                Know another talented beauty professional who would be a great fit? Refer them to The NYC Mobile Salon and earn a referral commission for every qualified professional you bring to the team. There is no cap on referral earnings — the more great people you bring in, the more you earn. Help us build the best mobile beauty team in New York City and get paid for it.
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            All bonus programs are paid monthly on top of your per-appointment rate. 100% of tips are always yours.
          </p>
        </div>
      </section>

      {/* ── 8. FAQ ───────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            FAQ
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Frequently Asked Questions
          </h3>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-purple-100 bg-white p-6">
                <h4 className="mb-2 font-display font-bold text-slate-800">
                  {faq.q}
                </h4>
                <p className="text-sm leading-relaxed text-slate-600">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. Coverage Map ──────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            Service Area
          </h2>
          <h3 className="mb-4 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Where We Need Professionals
          </h3>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-slate-600 leading-relaxed">
            We are actively recruiting licensed beauty professionals in every borough and nearly every neighborhood in New York City. Below is a snapshot of the areas with the highest client demand right now. If your neighborhood is not listed, apply anyway — we are expanding constantly and want to hear from talented pros everywhere.
          </p>
          <div className="space-y-8">
            {Object.entries(neighborhoods).map(([boroSlug, hoods]) => (
              <div key={boroSlug}>
                <h4 className="mb-3 font-display text-xl font-bold text-purple-600">
                  {boroughNames[boroSlug]}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {hoods.map((hood) => (
                    <Link
                      key={hood.slug}
                      href={`/locations/${boroSlug}/${hood.slug}`}
                      className="rounded-full border border-purple-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700"
                    >
                      {hood.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Know Someone? Referral ───────────────────────────────── */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-xl border border-purple-200 bg-purple-50/50 p-8 text-center">
          <h3 className="mb-3 font-display text-2xl font-black text-slate-800">
            Know a Great Beauty Professional?
          </h3>
          <p className="mb-6 text-sm leading-relaxed text-slate-600">
            If you know a licensed hairstylist, barber, nail tech, makeup artist, or esthetician who would be a great fit for The NYC Mobile Salon, send them our way. We offer referral commissions for every qualified professional you bring to the team — there is no cap on how many people you can refer or how much you can earn. Help us build the best mobile beauty team in New York City.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="mailto:hey@thenycmobilesalon.com?subject=Professional%20Referral" className="inline-block rounded-full bg-purple-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-700">
              Refer a Professional
            </a>
            <a href="sms:+12122029075" className="inline-block rounded-full border border-purple-200 bg-white px-8 py-3 text-sm font-bold text-purple-600 transition hover:-translate-y-0.5 hover:bg-purple-50">
              Text Us a Referral
            </a>
          </div>
        </div>
      </section>

      {/* ── 10. Apply CTA ────────────────────────────────────────── */}
      <section id="apply" className="bg-purple-50/50 px-4 py-24">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            Apply Now
          </h2>
          <h3 className="mb-4 font-display text-3xl font-black tracking-tight md:text-4xl">
            Ready to Join?
          </h3>
          <p className="mb-8 text-sm text-slate-600">
            It takes less than five minutes. Upload your info, a quick video selfie, and we&rsquo;ll be in touch within 48 hours.
          </p>
          <Link
            href="/join/application"
            className="inline-block rounded-full bg-purple-600 px-10 py-4 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-700"
          >
            Start Your Application
          </Link>

          <div className="mt-8">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">Or reach out directly</p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="sms:+12122029075"
                className="flex items-center gap-2 rounded-full border border-purple-200 bg-white px-6 py-3 text-sm font-bold text-purple-600 transition hover:-translate-y-0.5 hover:bg-purple-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Text Us
              </a>
            </div>
            <p className="mt-3 text-xs text-slate-400">Text us anytime: 212.202.9075</p>
          </div>
        </div>
      </section>

      {/* ── Operators / Leadership Callout ─────────────────────── */}
      <section className="bg-white px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-purple-600">
            For Operators &amp; Leaders
          </p>
          <h3 className="mb-3 font-display text-2xl font-black text-slate-800">
            Not a Beauty Pro — But You Run Things?
          </h3>
          <p className="mb-6 text-sm leading-relaxed text-slate-600">
            We&rsquo;re also hiring a <strong>Founding CEO / Head of Operations</strong> — ex-marketplace operators (Glamsquad, Soothe, StyleSeat, Priv, Urban Company, or similar) who&rsquo;ve scaled supply-constrained platforms. Sweat equity + $49/hr while building the team. Real ownership, no capital required.
          </p>
          <Link
            href="/founding-ceo-position-search"
            className="inline-block rounded-full bg-purple-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-700"
          >
            See the Founding CEO Role &rarr;
          </Link>
        </div>
      </section>

      {/* ── 11. Final CTA Banner ──────────────────────────────────── */}
      <section
        className="px-4 py-16 text-white"
        style={{
          background:
            "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)",
        }}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 font-display text-3xl font-black tracking-tight md:text-4xl">
            $49/hr. Paid Instantly. No Booth Rent.
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-white/90">
            Zelle or Apple Cash within 30 minutes of every job. Tips are 100% yours. Apply above or reach out — we review every application personally.
          </p>
          <Link
            href="/join/application"
            className="inline-block rounded-full bg-white px-10 py-4 text-sm font-bold text-purple-600 shadow-lg transition hover:bg-purple-50"
          >
            Apply Now
          </Link>
        </div>
      </section>
    </>
  );
}
