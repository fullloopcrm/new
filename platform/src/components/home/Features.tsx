import Link from "next/link";
import { C, display, mono, proseStyle } from "./editorial";
import SectionHead from "./SectionHead";
import SectionCloser from "./SectionCloser";

const link = { color: C.good, textDecoration: "underline", textUnderlineOffset: "2px" };

interface Stage {
  num: string;
  title: string;
  body: React.ReactNode;
}

const stages: Stage[] = [
  {
    num: "01",
    title: "Home Service Lead Generation: Organic SEO Leads You Own, Not Rented",
    body: (
      <>
        <p>
          Most home service CRMs assume the lead already exists and just help you file
          it. Full Loop generates the lead in the first place. A network of organic,
          SEO-optimized websites and local landing pages ranks for the exact searches
          your customers already make &mdash; &ldquo;house cleaning near me,&rdquo; &ldquo;emergency plumber
          24/7,&rdquo; &ldquo;HVAC repair&rdquo; in your city &mdash; and routes every inquiry straight into
          your pipeline. No ad budget required, no lead-reseller skimming 25% off the
          top, and no &ldquo;exclusive&rdquo; lead that gets sold to four of your competitors the
          same afternoon.
        </p>
        <p className="mt-4">
          This is the difference between renting demand and owning it. Paid ads stop the
          minute you stop paying; organic rankings compound month over month and keep
          producing while you sleep. The{" "}
          <Link href="/case-study/the-nyc-maid" style={link}>NYC Maid case study</Link>{" "}
          documents tens of thousands of organic lead clicks with a UTM audit showing
          zero paid sources &mdash; every booking earned, not bought. And because you hold
          the only Full Loop license for your trade in your city, that lead engine works
          for you and is locked out for every competitor in your market.
        </p>
      </>
    ),
  },
  {
    num: "02",
    title: "AI Phone & Sales Agent: Instant Speed-to-Lead Follow-Up That Answers Live and Books Jobs 24/7",
    body: (
      <>
        <p>
          Speed-to-lead decides who wins the job. Study after study shows the operator
          who replies within five minutes is many times more likely to close than the one
          who replies an hour later &mdash; and at 9&nbsp;p.m. on a Sunday, nobody on your team
          is replying at all. Full Loop&apos;s AI sales agent answers every inquiry the
          instant it lands &mdash; picking up the phone on the first ring and replying by text
          and web chat &mdash; twenty-four hours a day, seven days a week. A caller reaches a
          real voice agent, not voicemail.
        </p>
        <p className="mt-4">
          It does not just auto-reply with &ldquo;thanks, we&apos;ll get back to you.&rdquo; It actually
          sells: it qualifies the customer, pulls from your real pricing to give a quote,
          answers questions about your services, handles the usual objections, checks your
          live calendar for real open slots, and books the job &mdash; all in natural, on-brand
          conversation, in English or Spanish. On the phone it recognizes returning callers
          by their number, pulls up their jobs and balance, takes notes to their record,
          and escalates genuine edge cases to you instead of guessing; every call is
          recorded and transcribed into one customer thread. It follows up with the leads
          who go quiet, on a cadence, without being told. The result is a sales team that
          never sleeps, never forgets, and never lets a lead go cold. See exactly how it
          converts in the{" "}
          <Link href="/why-you-should-choose-full-loop-crm-for-your-business" style={link}>
            breakdown of why operators switch
          </Link>.
        </p>
      </>
    ),
  },
  {
    num: "03",
    title: "Online Booking & Scheduling Software Built for Recurring Home Service Revenue",
    body: (
      <>
        <p>
          Once the customer says yes, the job lands on the calendar automatically &mdash; with
          the correct service, duration, price, and crew, slotted around your real
          availability and travel time. No double-bookings, no &ldquo;let me check and call you
          back,&rdquo; no whiteboard you reconstruct at midnight. The calendar becomes the
          single source of truth for the whole operation.
        </p>
        <p className="mt-4">
          Where this compounds is recurring work. Recurring clients are rebooked on their
          cadence automatically &mdash; weekly, biweekly, monthly &mdash; and one-time jobs get
          nudged toward becoming standing appointments. Cancellations and reschedules flow
          through the same engine and free the slot for someone else. For trades built on
          repeat visits &mdash;{" "}
          <Link href="/industry/crm-for-house-cleaning-businesses" style={link}>house cleaning</Link>,{" "}
          <Link href="/industry/crm-for-lawn-care-businesses" style={link}>lawn care</Link>,{" "}
          <Link href="/industry/crm-for-pest-control-businesses" style={link}>pest control</Link>,
          pool service &mdash; this is the engine that turns a busy month into a predictable,
          defensible book of business.
        </p>
      </>
    ),
  },
  {
    num: "04",
    title: "Crew Dispatch & GPS Field Service Management With Verified Check-In and Check-Out",
    body: (
      <>
        <p>
          The job is booked &mdash; now it has to get done, and you need to know it actually
          happened. Your crew works from a bilingual (English/Spanish) mobile portal:
          today&apos;s route, each job&apos;s details, customer notes, special instructions, and
          one tap to navigate to the next stop. They stop texting you &ldquo;where do I go
          next?&rdquo; because the system already told them.
        </p>
        <p className="mt-4">
          GPS-verified check-in and check-out confirm your team was on site and for how
          long, so payroll and customer billing are based on what actually happened rather
          than on memory or a timesheet filled out Friday afternoon. Before-and-after
          photos, completion notes, and live status updates flow back to the office and to
          the customer in real time. You stop being the dispatcher glued to your phone all
          morning and start being the owner who can see the whole field operation at a
          glance &mdash; even while you&apos;re on a job yourself.
        </p>
      </>
    ),
  },
  {
    num: "05",
    title: "Automated Payments, Invoicing & Stripe Crew Payouts for Home Service Businesses",
    body: (
      <>
        <p>
          When the work is done, the money should move on its own. Full Loop collects
          payment automatically &mdash; cards on file, deposits, balances due, and recurring
          billing &mdash; and reconciles it without you chasing a single invoice. Customers pay
          the way they expect to, receipts go out automatically, and your books stay
          current instead of becoming a weekend project.
        </p>
        <p className="mt-4">
          Crew payouts run the same way. On the NYC Maid, more than 99% of cleaner payouts
          went out automatically through Stripe Connect the moment a job closed &mdash; the
          right amount, to the right person, with no manual math. That means your
          technicians and cleaners get paid fast and correctly, which is one of the
          biggest drivers of crew retention, and you stop spending Fridays cutting checks
          and untangling who is owed what. Cash flow stops being a recurring fire drill
          and becomes a quiet background process.
        </p>
      </>
    ),
  },
  {
    num: "06",
    title: "Automated Review Generation & Local SEO Reputation Management",
    body: (
      <>
        <p>
          Reviews are the fuel that makes lead generation cheaper over time, so Full Loop
          treats them as a built-in stage of the loop instead of an afterthought you keep
          meaning to get to. The moment a job is marked complete and paid, the system asks
          the happy customer for a review at exactly the right moment and routes it to the
          platforms that move the needle for local search &mdash; Google first among them.
        </p>
        <p className="mt-4">
          Those reviews feed directly back into your local SEO and map-pack rankings,
          which generate the next wave of organic leads &mdash; closing the circle back to
          stage one. A steady, automated stream of fresh five-star reviews is one of the
          few competitive advantages a local service business can build that a deeper-
          pocketed rival cannot simply buy past overnight. Done consistently across every
          single job, it becomes a moat. Skipped, it becomes the reason a worse operator
          outranks you.
        </p>
      </>
    ),
  },
  {
    num: "07",
    title: "Customer Retention & Retargeting: Turn One-Time Jobs Into Recurring Revenue",
    body: (
      <>
        <p>
          The most profitable customer is the one you already have. Acquiring a new
          customer costs many times more than keeping an existing one, yet most home
          service businesses do almost nothing systematic to bring past customers back.
          Full Loop closes the loop with automated rebooking reminders, seasonal touches,
          win-back campaigns for clients who have gone quiet, and retargeting that pulls
          them back for the next job and the one after that.
        </p>
        <p className="mt-4">
          A one-time deep clean becomes a recurring account. A single furnace repair
          becomes a maintenance agreement. A spring cleanup becomes a year-round
          landscaping relationship. Acquisition cost falls, customer lifetime value
          climbs, and the machine starts feeding itself: the reviews from stage six and
          the retention from stage seven make stage one cheaper, which makes every stage
          after it more profitable. That is the full loop &mdash; lead to paid to repeat &mdash;
          and it is the reason the platform is named for it.
        </p>
      </>
    ),
  },
];

// "Features" â the seven stages of the loop, in depth. Full detail lives on
// /full-loop-crm-service-features.
export default function Features() {
  return (
    <section style={{ background: C.canvas, color: C.ink }} className="border-t" >
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
        <SectionHead
          label="Home service CRM features"
          heading="The 7 Stages of a Full-Cycle Home Service CRM: From Lead Generation to Repeat Bookings"
          description={
            <>
              Every home service business runs the same loop &mdash; find, close, do the work,
              get paid, earn the review, win them back. Most home service software covers one
              or two stages; Full Loop is the only all-in-one, full-cycle home service CRM
              that runs all seven end to end.
            </>
          }
        />

        <div className="mt-10 space-y-6 max-w-3xl" style={proseStyle}>
          <p>
            Every home service company runs the same loop, whether or not they call it
            that: find the customer, close the customer, do the work, get paid, earn the
            review, win them back. The problem is that the typical operator runs each
            stage in a different tool &mdash; a website from one vendor, a scheduler from
            another, an invoicing app, a separate review service, a spreadsheet to tie it
            together &mdash; and spends their evenings being the integration layer that holds
            it all in place.
          </p>
          <p>
            That stitched-together stack is where money leaks. Leads fall through the gap
            between the website and the inbox. Quotes never get sent. Jobs get
            double-booked. Invoices go out late. Reviews never get asked for. Each tool is
            fine on its own; the seams between them are where the business bleeds. Full
            Loop is the only{" "}
            <Link href="/full-loop-crm-service-features" style={link}>full-cycle home service CRM</Link>{" "}
            that owns the whole loop end to end, so there are no seams to leak through.
            Here is each stage.
          </p>
        </div>

        <div className="mt-14 space-y-12">
          {stages.map((s) => (
            <div
              key={s.num}
              className="grid grid-cols-1 sm:grid-cols-[80px_1fr] gap-3 sm:gap-8 pb-12"
              style={{ borderBottom: `1px solid ${C.lineSoft}` }}
            >
              <div
                style={{ fontFamily: mono, fontSize: "13px", letterSpacing: "0.12em", color: C.good, paddingTop: "6px" }}
              >
                {s.num}
              </div>
              <div>
                <h3
                  style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(24px, 2.4vw, 32px)", letterSpacing: "-0.02em", color: C.ink, marginBottom: "12px" }}>
                  {s.title}
                </h3>
                <div style={proseStyle} className="max-w-2xl">{s.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 max-w-3xl" style={proseStyle}>
          <p>
            Notice what links the seven stages: each one hands off to the next without a
            human in the middle. The lead the website generates is the lead the AI closes;
            the job the AI books is the job the crew is dispatched to; the work the crew
            completes is what triggers the payment, which triggers the review, which feeds
            the next lead. One platform, one source of truth, one loop &mdash; instead of five
            tools and the hope that nothing falls between them.
          </p>
        </div>

        <SectionCloser
          href="/full-loop-crm-service-features"
          label="See the full feature breakdown" formLabel="Get the Full Loop — Apply"
        />
      </div>
    </section>
  );
}
