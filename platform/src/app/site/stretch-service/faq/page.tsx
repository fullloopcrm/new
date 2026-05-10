// @ts-nocheck
import Link from "next/link";
import Logo from "@/app/site/stretch-service/_components/Logo";
import type { Metadata } from "next";
import { SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";

export const metadata: Metadata = {
  title: "Stretch Service FAQ | Mobile Stretching Questions Answered | $99/hr",
  description: "Frequently asked questions about Stretch Service mobile stretch service. Pricing, booking, locations, safety, certifications & more. $99/hr, same-day available.",
  alternates: { canonical: `${SITE_URL}/faq` },
};

const faqs = [
  {
    question: "How much does a stretch service session cost?",
    answer: "A single 60-minute mobile stretch service session is $99. Weekly program members pay $89 per session, which is a 10% discount applied automatically. All prices include professional equipment, travel to your location, a full-body mobility assessment, and a personalized treatment plan. There are no hidden fees, no surcharges for specific locations, and no extra charges for equipment. The $99/hr price is the same whether your session takes place at your home, office, hotel, park, or any other location across all 50 states.",
  },
  {
    question: "How do I book a stretch service session?",
    answer: "The easiest and fastest way to book a stretch service session is to text (888) 734-7274. You can also call (888) 734-7274 during our operating hours of 7AM to 10PM daily. Simply let us know your preferred date, time, and location, and we will match you with an available certified stretch therapist in your area. Same-day appointments are often available, especially on weekday mornings and afternoons. You can also email hello@stretchservice.com for non-urgent booking requests or questions.",
  },
  {
    question: "Where does Stretch Service provide sessions?",
    answer: "Stretch Service operates across all 50 states with certified therapists in 902+ cities nationwide. We come to your location — your home, apartment, office, hotel, Airbnb, gym, park, or any private or semi-private space. Our mobile stretch service model means you never have to travel to a studio. We bring all professional equipment and transform any space into a therapy environment. If you are unsure whether we cover your area, text (888) 734-7274 and we will confirm availability.",
  },
  {
    question: "What should I wear to a stretch service session?",
    answer: "Wear comfortable, stretchy clothing that allows full range of motion — athletic wear, yoga clothes, or anything with good flexibility. Avoid jeans, belts, buttons, zippers, or restrictive clothing that limits movement. You do not need special shoes, and you will likely remove your shoes during the session. If your session is outdoors at a park, we also recommend sunscreen and bringing water. Our therapists bring all professional equipment, so you do not need to provide anything except comfortable clothing and your body.",
  },
  {
    question: "How long is each stretch service session?",
    answer: "Standard stretch service sessions are 60 minutes. This includes a mobility assessment at the beginning of your session (approximately 5-10 minutes), followed by 50-55 minutes of hands-on professional stretching therapy. The full hour is dedicated to your treatment — there is no time wasted on setup delays, sales pitches, or unnecessary transitions. Your therapist arrives ready to work and maximizes every minute of your session for results.",
  },
  {
    question: "Does Stretch Service bring all the equipment?",
    answer: "Yes. Our stretch service therapists bring everything needed for a professional session: high-quality stretching mats, resistance straps, bolsters, and any accessories required for your specific session. We transform any space — even a small apartment or hotel room — into a professional therapy environment. You do not need to provide anything except comfortable clothing and enough floor space for a mat (approximately 6 feet by 3 feet). We handle the rest.",
  },
  {
    question: "Are Stretch Service therapists certified?",
    answer: "Yes, all Stretch Service therapists are certified in assisted stretching, PNF (Proprioceptive Neuromuscular Facilitation), and myofascial release techniques. Many have additional credentials including Licensed Massage Therapist (LMT), NASM or ACE personal training certifications, NSCA credentials, or physical therapy degrees. Every therapist undergoes our vetting and orientation process before joining the team. We do not hire beginners — our clients expect and receive experienced, knowledgeable professionals.",
  },
  {
    question: "Is assisted stretching safe?",
    answer: "Yes. Assisted stretching performed by a certified stretch service therapist is very safe. Our therapists use controlled, gradual movements and maintain constant communication to ensure your comfort throughout every stretch. Every stretch is adjusted to your current flexibility level, pain tolerance, and any medical conditions you disclose. We never force a stretch beyond what your body is ready for. If you have specific injuries, surgeries, or medical conditions, your therapist will modify techniques accordingly. Safety is our top priority.",
  },
  {
    question: "Can stretch service help with chronic pain?",
    answer: "Yes, professional assisted stretching is highly effective for chronic pain including lower back pain, neck tension, sciatica, shoulder tightness, hip pain, tension headaches, and fibromyalgia. Many stretch service clients experience significant pain relief after their very first session. Consistent weekly sessions produce cumulative benefits — reduced pain, improved range of motion, better posture, and enhanced quality of life. While stretch service is not a replacement for medical treatment, it is an excellent complementary therapy that many healthcare providers recommend.",
  },
  {
    question: "What is PNF stretching?",
    answer: "PNF stands for Proprioceptive Neuromuscular Facilitation — the most effective stretching technique in sports science. It combines passive stretching with isometric contractions to achieve 2-3x greater flexibility gains than static stretching alone. During a PNF stretch, your therapist moves your muscle into a stretched position, then asks you to contract against their resistance for a few seconds, then relaxes you into a deeper stretch. This technique activates your nervous system to allow greater range of motion. All Stretch Service therapists are PNF certified.",
  },
  {
    question: "How often should I get a stretch service session?",
    answer: "For the best results, we recommend weekly stretch service sessions. Consistent stretching produces cumulative benefits that single sessions cannot match — improved flexibility, reduced pain, better posture, enhanced athletic performance, and faster recovery. Many clients start with a single session, feel the dramatic results, and immediately sign up for our weekly program at $89/session (10% off). Some clients with specific goals or acute issues benefit from twice-weekly sessions initially, then transition to weekly maintenance.",
  },
  {
    question: "Can I book a same-day stretch service appointment?",
    answer: "Yes. Stretch Service offers same-day appointments subject to therapist availability in your area. Text or call (888) 734-7274 to check availability. Morning and evening slots tend to fill fastest, so we recommend booking as early in the day as possible for same-day requests. Weekday midday and afternoon slots are most commonly available for same-day bookings. We serve clients 7AM to 10PM, seven days a week, 365 days a year.",
  },
  {
    question: "Does Stretch Service offer corporate wellness programs?",
    answer: "Yes. Stretch Service provides on-site corporate wellness programs for offices and teams across all 50 states. Our corporate stretch service programs reduce workplace injuries, improve employee productivity, reduce healthcare costs, and boost team morale. We bring therapists directly to your office for individual sessions, team stretching events, or ongoing weekly wellness programs. Corporate pricing is customized based on frequency, group size, and program scope. Contact us to learn more about corporate stretch service programs.",
  },
  {
    question: "What is the cancellation policy for stretch service sessions?",
    answer: "We ask for at least 4 hours notice for cancellations or rescheduling. Same-day cancellations with less than 4 hours notice may be subject to a cancellation fee, as our therapist has already reserved the time slot and traveled to your area. We understand that schedules change — just give us as much notice as possible and we will always do our best to accommodate you. Rescheduling is always free with adequate notice.",
  },
  {
    question: "Can seniors benefit from stretch service sessions?",
    answer: "Absolutely. Assisted stretching is excellent for seniors and one of the most requested specialties in our stretch service network. Professional stretching improves mobility, reduces fall risk, relieves joint stiffness, enhances circulation, and supports independent living. Our therapists are experienced with senior clients and use gentle, modified techniques that prioritize comfort and safety. We offer a specialized Gentle Stretch program designed specifically for seniors and those with limited mobility. Many seniors become weekly clients because the mobility improvements are so significant.",
  },
  {
    question: "Does Stretch Service work with athletes?",
    answer: "Yes. Stretch Service works with professional athletes, college athletes, weekend warriors, runners, CrossFitters, gym-goers, and anyone who trains regularly. Assisted stretching improves athletic performance, speeds recovery by 40-60%, prevents injuries, breaks through flexibility plateaus, and corrects muscle imbalances. Many athletes use stretch service as a regular part of their training routine — booking sessions before competitions for mobility prep and after hard training sessions for recovery. PNF stretching is particularly effective for athletes seeking measurable flexibility gains.",
  },
  {
    question: "What areas of the body does stretch service target?",
    answer: "Stretch Service provides comprehensive full-body stretching covering neck, shoulders, upper back, lower back, chest, hips, hip flexors, glutes, hamstrings, quadriceps, calves, ankles, and more. Each session is customized to target your specific problem areas while maintaining overall flexibility balance. If you have a particular area of concern — for example, chronic lower back tightness from desk work — your therapist will spend extra time on that area while still addressing supporting muscle groups that contribute to the issue.",
  },
  {
    question: "Does Stretch Service come to hotels for tourists?",
    answer: "Yes. Hotel stretch service sessions are one of our most popular offerings. We come directly to your hotel room anywhere nationwide. It is perfect for tourists who have been walking all day exploring a city, business travelers dealing with jet lag and sitting stiffness, conference attendees who need recovery after long days of meetings, or anyone visiting a new city who wants to feel their best. Hotel sessions use the same professional equipment and techniques as all other sessions, and the $99/hr price is the same. Many hotels in major cities have our clients requesting stretch service sessions regularly.",
  },
  {
    question: "How much space do I need for a stretch service session?",
    answer: "You need approximately 6 feet by 3 feet of open floor space — enough room for a professional stretching mat. Our therapists work in small apartments, hotel rooms, office conference rooms, and all kinds of spaces. If you can fit a yoga mat on the floor, you have enough space for a stretch service session. For outdoor sessions at parks, the space requirement is even more flexible since there is typically ample room. Your therapist will quickly assess the space when they arrive and set up accordingly.",
  },
  {
    question: "Is tipping expected for stretch service therapists?",
    answer: "Tipping is not required but is always appreciated. Our $99/hr rate is designed to be all-inclusive, and our therapists are compensated fairly for their expertise. That said, many clients do choose to tip their stretch service therapist, especially for exceptional sessions. Tips typically range from $10-$40 per session. If your therapist delivers a session that makes you feel dramatically better — which happens frequently — a tip is a great way to show appreciation. But there is absolutely no obligation or pressure.",
  },
  {
    question: "Can I book group stretch service sessions?",
    answer: "Yes. Group stretch service sessions are available for friends, couples, families, corporate teams, sports teams, bridal parties, and any group that wants to experience professional stretching together. For group sessions, we arrange multiple therapists to work simultaneously so everyone gets a full individual session. Group sessions are popular for team-building events, wellness retreats, post-race recovery, and birthday celebrations. Contact us for group pricing based on the number of participants and session format.",
  },
  {
    question: "Can I give a stretch service session as a gift?",
    answer: "Yes. Stretch service sessions make an incredible gift for birthdays, holidays, Mother&apos;s Day, Father&apos;s Day, Valentine&apos;s Day, anniversaries, or any occasion. Contact us to purchase a gift session at the standard $99 rate. We will help coordinate scheduling with the recipient at their convenience. Gift sessions are especially popular for people who have everything — because a professional stretch service session is an experience they will never forget and genuinely benefits their health.",
  },
  {
    question: "What is the difference between stretch service and massage?",
    answer: "Stretch service and massage are complementary but different modalities. Massage focuses on manipulating soft tissue to relieve tension and promote relaxation. Stretch service focuses on actively moving your joints and muscles through their full range of motion to improve flexibility, reduce pain, and enhance mobility. During a stretch service session, your therapist guides your body through targeted positions using PNF, passive, and active stretching techniques. Many clients find that stretch service produces more dramatic and lasting mobility improvements than massage alone.",
  },
  {
    question: "Does insurance cover stretch service sessions?",
    answer: "Currently, most health insurance plans do not directly cover assisted stretching sessions. However, some FSA (Flexible Spending Account) and HSA (Health Savings Account) plans may reimburse stretch therapy sessions with proper documentation. Additionally, some corporate wellness programs cover stretch service as a preventive health benefit for employees. We recommend checking with your specific insurance provider, FSA/HSA administrator, or employer wellness program to determine your coverage options. We can provide session documentation for reimbursement purposes upon request.",
  },
  {
    question: "What results can I expect from my first stretch service session?",
    answer: "Most clients experience noticeable results from their very first stretch service session. Common immediate benefits include increased range of motion, reduced muscle tension, pain relief in problem areas (back, neck, hips, shoulders), improved posture, enhanced relaxation, and a general feeling of lightness and ease of movement. Many clients are genuinely surprised by how different their body feels after just 60 minutes of professional assisted stretching. Long-term benefits — including sustained flexibility improvement, chronic pain reduction, and athletic performance gains — develop over multiple weekly sessions.",
  },
  {
    question: "What equipment do Stretch Service therapists use?",
    answer: "Our stretch service therapists bring professional-grade equipment to every session including high-quality stretching mats, PNF resistance straps, bolsters for positioning support, and any accessories needed for your specific session. Some therapists also bring foam rollers for myofascial release work. All equipment is clean, sanitized, and maintained to professional standards. You do not need to provide any equipment — we bring everything needed to transform your space into a professional stretch therapy environment.",
  },
];

export default function FAQPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Stretch Service FAQ", "Frequently asked questions about mobile assisted stretching nationwide.", `${SITE_URL}/faq`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "FAQ", url: `${SITE_URL}/faq` },
      ])} />
      <JsonLd data={faqSchema(faqs)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Questions &amp; Answers</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Stretch Service FAQ
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Everything you need to know about Stretch Service&apos;s mobile assisted stretching service. {faqs.length} questions answered — pricing, booking, services, locations, and more.
          </p>
          <p className="mx-auto mt-2 text-base text-teal-200 font-semibold">$99/hr &middot; 50 States &middot; 902+ Cities &middot; 7AM-10PM Daily</p>
        </div>
      </section>

      {/* FAQ List */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-bold text-slate-900 font-heading">{faq.question}</h2>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Still Have Questions About Stretch Service?</h2>
          <p className="mt-4 text-base text-slate-600">
            We&apos;re happy to answer any questions about our mobile stretch service. Text or call us anytime between 7AM and 10PM. Our team responds quickly and can help you understand exactly how stretch service works, what to expect from your first session, and which service type is best for your needs.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK} className="inline-block rounded-lg bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-teal-700 font-cta">
              Text {SITE_PHONE}
            </a>
            <a href={SITE_PHONE_LINK} className="inline-block rounded-lg border-2 border-teal-600 px-8 py-3.5 text-base font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Call {SITE_PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Ready to Feel the Difference?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Book your first mobile stretch service session today. $99/hr for 60 minutes of professional assisted stretching at your location. 10% off weekly.
          </p>
          <a href={SITE_SMS_LINK} className="mt-6 inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
            Text {SITE_PHONE} — Book Now
          </a>
        </div>
      </section>

      {/* Explore Links */}
      <section className="bg-section-teal py-12">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-semibold text-slate-500 mb-4">Explore Our Assisted Stretch Service</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/services" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">All Services</Link>
            <Link href="/locations" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">902+ Cities</Link>
            <Link href="/parks" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Parks</Link>
            <Link href="/pricing" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Pricing</Link>
            <Link href="/hotel-stretching" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Hotel Stretch</Link>
            <Link href="/corporate-wellness" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Corporate</Link>
            <Link href="/stretching-101" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Stretching 101</Link>
            <Link href="/about" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">About</Link>
            <Link href="/jobs" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Careers</Link>
            <Link href="/discounts" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Discounts</Link>
            <Link href="/contact" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Contact</Link>
            <Link href="/services/assisted-stretch-service" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Assisted Stretch</Link>
            <Link href="/services/pnf-stretch-service" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">PNF Stretching</Link>
          </div>
        </div>
      </section>
    </>
  );
}
