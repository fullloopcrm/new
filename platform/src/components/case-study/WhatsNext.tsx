// Part VIII — Where This Goes Next. The forward roadmap: AI HR, automated
// accounting, franchisable businesses, licensing/sales. Framed honestly as
// direction, not shipped features.
import { Band, Column, ChapterHead, P, H3, H4, Quote, Callout, Source } from "./Primitives";
import { C, codeToken } from "./cs";

export default function WhatsNext() {
  return (
    <Band id="whats-next" tone="ink">
      <Column className="py-20 sm:py-28">
        <ChapterHead
          dark
          part="Part VIII"
          title="Where This Goes Next"
          standfirst={<>Everything before this chapter is built and running. Everything in this chapter is direction — where the same architecture goes once a business can already run itself. We&apos;re labeling it honestly: this is the roadmap, not the changelog.</>}
        />

        <P dark>The thing worth understanding about Yinez and the tool system in Part V is that it&apos;s a <em>pattern</em>, not a one-off. An agent bound by hard rules, forbidden to invent facts, given governed tools that read and write the real business — that same pattern applies to every back-office function that&apos;s currently a human job. Sales and scheduling were just the first to fall. Here&apos;s what the same machine is built to absorb next.</P>

        <H3 dark>AI HR — hiring and managing the crew</H3>
        <P dark>The crew lifecycle is already half-automated: applications come in, get reviewed, and approval auto-provisions a cleaner. The next step is an HR agent that owns that lifecycle end to end — screening applicants, running structured intake, scheduling and tracking onboarding, watching performance signals the system already collects (on-time check-ins, ratings, reliability), surfacing who&apos;s thriving and who needs attention, and handling the routine back-and-forth of managing a distributed workforce. The data to do it is already flowing through the platform; what&apos;s next is the agent that acts on it.</P>

        <H3 dark>Autonomous accounting</H3>
        <P dark>The business already tracks every payment, payout, tip, and refund in structured tables — the <span style={codeToken}>payments</span> and <span style={codeToken}>cleaner_payouts</span> schema from April is the foundation. Accounting is the natural next agent: continuous reconciliation, categorization, owner/operator financial summaries, tax-ready exports, and anomaly flags — the bookkeeper role, run the same way the front office is run, from the same single source of financial truth instead of a shoebox of receipts and a year-end scramble.</P>

        <P dark>Consider what an HR agent changes about scaling a crew. Today, growing from eleven cleaners to fifty means a human reviewing fifty times the applications, running fifty times the onboarding, and tracking fifty times the performance signals — the point at which most owners hire an office manager. An agent that owns that lifecycle removes the hire and the ceiling at once. It can screen against the criteria that actually predict a good cleaner, run consistent onboarding so the fiftieth hire gets the same quality of start as the first, and flag the early warning signs — slipping check-in times, dropping ratings — before they become a lost client. The crew can grow faster than a human manager could supervise, without the supervision degrading.</P>

        <H4 dark>The pattern holds</H4>
        <P dark>HR and accounting aren&apos;t new products bolted on. They&apos;re the same idea as Yinez pointed at a different department: a governed agent, real tools, real data, strict rules, human escalation when uncertain. Each one removes another role from the payroll line and folds it into software — which pushes the &ldquo;one person, an hour a day&rdquo; number toward businesses far larger than a single cleaning company.</P>

        <P dark>Accounting is also where autonomy gets its proof of trustworthiness. Money that&apos;s automatically collected, split, and paid out generates a stream of financial events that has to reconcile to the penny — and an agent that watches that stream can catch what humans miss: the payout that didn&apos;t match the billed hours, the refund that never cleared, the tip that was miscategorized, the month where costs crept. Rather than a year-end scramble to make sense of a shoebox, the books stay continuously closed, and the owner gets the one thing small businesses almost never have in real time: an honest, current picture of whether the business is actually making money, by job, by cleaner, by week.</P>

        <H3 dark>Franchisable businesses, on tap</H3>
        <P dark>Once a business is genuinely a system rather than a person, it becomes <em>copyable</em>. A new operator in a new city doesn&apos;t inherit advice and a binder — they inherit the running machine: the booking engine, the AI front office, the dispatch logic, the payment rails, the acquisition playbook, pre-built and proven. That&apos;s a franchise without the franchise overhead — the operational consistency a franchise promises, delivered as software instead of as a manual nobody follows. The multi-tenant foundation in Part VII is the substrate for exactly this.</P>

        <P dark>The franchise comparison is worth taking seriously, because franchising exists precisely to solve the problem this platform solves a different way. A franchise sells an operator a proven system, a brand, and a playbook — in exchange for hefty fees and rigid control, and with consistency that still depends on humans following a manual. An operating platform offers the proven system as software: the consistency is enforced by the code, not by compliance audits, and the operator keeps their independence and most of their margin. It&apos;s the upside of a franchise — start with something that works — without the franchise tax or the franchise leash.</P>

        <H3 dark>Licensing &amp; selling the machine</H3>
        <P dark>And the machine itself is the product. The same platform can be licensed to operators who want to run their own business on it, sold as turnkey businesses-in-a-box, or extended into territories one trade and one city at a time. The asset Full Loop built isn&apos;t a cleaning company — it&apos;s a repeatable, proven, mostly-autonomous way to run a home service company, and that asset can be packaged and sold in more than one shape.</P>

        <Callout dark title="Said plainly, so no one's misled">
          AI HR, autonomous accounting, and franchise-in-a-box are the roadmap — the direction the architecture is built to grow. The booking, dispatch, payments, payouts, AI front office, crons, and acquisition engine described in Part V are live today. We&apos;re keeping that line bright on purpose: this whole case study is built on not overstating what&apos;s real.
        </Callout>

        <H3 dark>Why these four, and why now</H3>
        <P dark>HR, accounting, franchising, and licensing aren&apos;t a random wishlist — they&apos;re the four things still standing between &ldquo;a business that runs itself&rdquo; and &ldquo;a company you can multiply.&rdquo; The front office, dispatch, money movement, and growth are already automated; what&apos;s left of running a company is hiring and managing people, keeping the books, and replicating the whole thing elsewhere. Each is a department that today still needs a human, and each is a department whose inputs the platform already captures as structured data. That&apos;s the precondition that makes them tractable now and wasn&apos;t true a year ago: the data exists, the agent pattern is proven, and the only remaining work is pointing it at the next function with the same discipline that made Yinez safe.</P>

        <P dark>The order matters too. You don&apos;t automate accounting before you have clean payment data; you don&apos;t franchise before you have a system worth copying; you don&apos;t license a machine you haven&apos;t run yourself. Everything in this roadmap is sequenced behind something that&apos;s already done — which is exactly how the whole project has been run from the first commit: earn the next step by finishing the last one, in public, on a real business.</P>

        <Quote dark attribution="The trajectory">
          First we proved software could run the front office of a business. Then the dispatch, the money, and the growth. What&apos;s left of &ldquo;running a company&rdquo; is HR, accounting, and replication — and those are the next departments in line.
        </Quote>

        <P dark>Put the whole trajectory on one line and it&apos;s easy to see the slope. February: a business can be built as software. April: its money and its front office can run without a person. The present: one person can oversee the result in an hour a day, and it can be made to run as any operator, not just one. Next: the remaining human departments — hiring, books — become agents too, and the proven machine gets copied, licensed, and sold. Each step was earned by the one before it, in public, on a real company. None of it required a leap of faith; it required finishing the previous thing and being honest about where the line currently is. The line is drawn exactly where this chapter started: everything above it, shipped; everything in this chapter, next.</P>

        <Source>This chapter describes intended direction grounded in the existing architecture (the agent/tool pattern, the financial schema, the multi-tenant foundation). It is explicitly not a claim that these capabilities are shipped.</Source>
      </Column>
    </Band>
  );
}
