// Part I — The Premise. Why a software company would found a real cleaning
// business instead of writing a hypothetical case study.
import { Band, Column, ChapterHead, P, Quote, Callout, Source } from "./Primitives";
import { codeToken } from "./cs";

export default function Premise() {
  return (
    <Band id="premise" tone="cream">
      <Column className="py-20 sm:py-28">
        <ChapterHead
          part="Part I"
          kicker="Built to be its own case study"
          title="The Premise: A Business Built to Be Its Own Case Study"
          standfirst={<>Every CRM promises it can run your business. Almost none of them have ever run one. So instead of writing a case study, we started a real business to be one — the first company we know of founded for the sole purpose of being its own proof, in public, with real customers, real money, and a real crew.</>}
        />

        <P>The software industry has a tell. When a company sells you a tool to run your operation, the proof it offers is almost always borrowed: a customer logo it didn&apos;t earn, a testimonial it lightly edited, a &ldquo;47% productivity increase&rdquo; with no denominator. The vendor has never actually stood in your shoes. It has never had to make payroll with its own product, never watched its own revenue depend on whether the booking flow works at 11pm on a Saturday. It is selling a map of a country it has never visited.</P>

        <P>It&apos;s a tell you stop noticing once you know to look for it. The case studies that fill software marketing are almost always written from the outside: the vendor interviews a customer, extracts a flattering quote and a rounded-up metric, and assembles a narrative the customer would never have written themselves. The vendor&apos;s own skin is never in the game. They don&apos;t know what it feels like when the thing they built drops a job, because it has never dropped one of <em>their</em> jobs. The whole genre is testimony about a country the author has only flown over.</P>

        <P>Full Loop CRM was built for home service businesses — cleaning companies, towing operators, exterminators, landscapers, the trades that run on appointments, crews, and cash flow. The category is full of CRMs. What it is not full of is CRMs whose makers have ever run a home service business on them. So we asked a blunt question: instead of describing what the platform could do, what if we had to live it? What if the case study wasn&apos;t a document we wrote, but a company we had to keep alive?</P>

        <Quote attribution="The thesis behind The NYC Maid">
          If the platform is as good as we say, we should be able to start a real business on it, with no special treatment, and have it work. If it isn&apos;t, we&apos;ll find out before our customers do.
        </Quote>

        <P>So on the second of February, 2026, we started a cleaning company. Not a demo account. Not a sandbox with seeded data. A real New York City maid service — <strong>The NYC Maid</strong> — with a real phone number, a real domain, real Google Business Profile, real customers who found us through real searches, and real cleaners who expected to be paid correctly and on time. It would take bookings, dispatch crews, collect payment, handle complaints, issue refunds, chase reviews, and grow — or it would fail, visibly, and tell us exactly where the platform broke.</P>

        <P>And it had to be a hard business, not an easy one, or the proof would be worthless. Cleaning in New York City is about as competitive and unforgiving a market as home services offers: saturated with established players, price-sensitive, logistically brutal across five boroughs and the suburbs, dependent on trust to let a stranger into your home, and run on margins thin enough that a few points of waste sink you. If the platform could build a winner here, from nothing, the &ldquo;your market is different&rdquo; objection loses most of its force. Picking an easy market would have proved nothing. We picked one of the hardest on purpose.</P>

        <P>The constraints we set were deliberately unfair to ourselves. <strong>Zero advertising budget</strong> — not a dollar to Google Ads, not a purchased lead, nothing. If the platform&apos;s organic acquisition story was real, the business would have to be found, not bought. <strong>One operator</strong> — no office, no dispatcher, no bookkeeper, no customer service desk. If the automation story was real, one person should be able to run the whole thing in the time most owners spend on email before lunch. And <strong>everything on the record</strong> — every feature shipped as a dated commit, every customer interaction logged, every dollar reconciled, so that nothing in this case study would rest on a claim we couldn&apos;t point to.</P>

        <Callout title="What &ldquo;real&rdquo; means here">
          The NYC Maid is a licensed, operating cleaning company in New York City. It ranks #1 on Google for <span style={codeToken}>nyc maid</span>, holds a 4.9★ rating across 73 Google reviews, and serves clients across Manhattan, Brooklyn, Queens, the Bronx, Staten Island, Long Island, Westchester, and New Jersey. The numbers in this document are pulled from its live production system, not a marketing deck.
        </Callout>

        <P>There&apos;s a reason almost nobody does it this way, and it isn&apos;t modesty — it&apos;s risk. A demo can&apos;t embarrass you. A real business can. If the booking flow drops a job, a real customer is standing in a dirty apartment. If a payout miscalculates, a real cleaner is shorted on real rent. If the AI says something wrong, it said it to a paying stranger, not a QA tester. Choosing to prove the platform this way meant accepting that every weakness would show up as someone&apos;s bad day, in public, attached to our name. That exposure is exactly what makes the proof worth anything. A claim you can&apos;t be wrong about isn&apos;t a claim; it&apos;s a brochure.</P>

        <P>It also changed how the software got built. When the person writing the dispatch logic is the same person who gets the angry text if a cleaner shows up at the wrong address, the feedback loop between &ldquo;ship it&rdquo; and &ldquo;live with it&rdquo; collapses to zero. There was no product manager translating customer pain into tickets. The customer pain <em>was</em> the developer&apos;s pain, same day, same person. A great deal of what makes the systems in Part V feel sharp comes from that — they were each forged by getting something wrong with a real customer and fixing it before the next one arrived.</P>

        <P>This is, as far as we can find, a genuinely unusual thing to have done. Companies build demo environments. They run pilots with friendly customers. They occasionally dogfood an internal tool. But founding an entire real-world operating company — in a competitive, low-margin, logistics-heavy industry — purely so the company could serve as the live proof of a software platform, and then publishing the build record as the case study, is not a pattern we&apos;ve seen. The case study you are reading and the business it describes are the same object. One did not come after the other. They were built together, from the first commit.</P>

        <P>A note on how to read this document, because it&apos;s long on purpose. It is not a brochure that happens to have numbers; it&apos;s a teardown that happens to be persuasive. Every figure is sourced, most are linked, and the ones you can check yourself are flagged so you can. Where something is a future plan rather than a shipped fact, it says so plainly. The length is the point: a claim this unusual — that a real business was built to be a case study and runs itself — earns scrutiny, and we&apos;d rather give you everything than ask you to take a headline on faith. Skim the table of contents, jump to the numbers if you&apos;re impatient, or read it straight through. It holds up either way.</P>

        <P>What follows is the whole thing, in order: the day it was born, the five months of build history that turned it from an empty database into an autonomous operation, the anatomy of every system that makes it run, the results as they stand in the live system today, and where the same machine is headed next — beyond cleaning, beyond a single business, into the parts of running a company that software has barely touched.</P>

        <P>Read it however suits you — but read it knowing that the unusual thing about this case study is not how it&apos;s written. It&apos;s that the subject and the author are the same, the numbers and the source are the same, the proof and the product are the same. That collapse of distance is the entire point, and everything that follows is what it looks like when there&apos;s no gap left to hide in.</P>

        <Source>Founding date and all build statistics are drawn from the git history of the production repository, first commit 2026-02-02. Business and review data are from Google and the live production database.</Source>
      </Column>
    </Band>
  );
}
