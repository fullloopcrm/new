// Part VI — The Results. Live production numbers, the economics, and what
// "autonomous" measures out to. Reads from the live stats endpoint.
import { Band, Column, ChapterHead, P, H3, Quote, Callout, StatGrid, Source } from "./Primitives";
import { C, mono, codeToken } from "./cs";
import type { CaseStudyStats } from "@/lib/caseStudyStats";
import { formatGeneratedAt } from "@/lib/caseStudyStats";

export default function Results({ live }: { live: CaseStudyStats | null }) {
  const numbers = [
    { v: live ? live.clients.toLocaleString() : "686", l: "Clients", s: "in the live system" },
    { v: live ? live.bookingsCompleted.toLocaleString() : "453", l: "Jobs completed", s: "done & paid" },
    { v: live ? live.revenueRangeYtd : "$100k–$110k", l: "Revenue", s: "since launch (Feb 2026)" },
    { v: "4.9★", l: "Google rating", s: "73 Google reviews" },
    { v: live ? live.teamSize.toLocaleString() : "11", l: "Active cleaners", s: "on the platform" },
    { v: live ? live.conversations.toLocaleString() : "1,629", l: "AI conversations", s: "handled by Yinez" },
  ];

  return (
    <Band id="results" tone="canvas">
      <Column wide className="py-20 sm:py-28">
        <ChapterHead
          part="Part VI"
          title="The Results"
          standfirst={<>Here is where the story has to put up or shut up. These are the live production numbers — the same ones the page header reads from, pulled from the business&apos;s own public endpoint. The rating is the company&apos;s real, checkable Google score. No slides.</>}
        />

        {live && (
          <div className="mb-2 inline-flex items-center gap-2" style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.good }}>
            <span className="animate-pulse" style={{ width: 8, height: 8, borderRadius: 9999, background: C.good, display: "inline-block" }} />
            Live from The NYC Maid · pulled {formatGeneratedAt(live.generatedAt)}
          </div>
        )}
        <StatGrid cols={3} items={numbers} />
        <Source>Operational figures are live from <span style={codeToken}>thenycmaid.com/api/public/case-study-stats</span>, cached hourly. The 4.9★ / 73 figure is the Google Business rating — search &ldquo;nyc maid&rdquo; to confirm it.</Source>

        <H3>What &ldquo;autonomous&rdquo; actually measures</H3>
        <P>The headline isn&apos;t the client count. Plenty of cleaning companies have 700 clients. The headline is what it costs, in human attention, to run them.</P>
        <StatGrid cols={4} items={[
          { v: "1", l: "Person managing it" },
          { v: "~1 hr", l: "Per day, total" },
          { v: "~40", l: "Services / week & growing" },
          { v: "$0", l: "On ads or leads" },
        ]} />
        <P>Hold those two numbers next to each other — 686 clients, one operator — because their ratio is the whole argument. Conventional wisdom in the trade puts a single person&apos;s practical ceiling at a few dozen active clients before the coordination overwhelms them; past that, you hire. The NYC Maid is operating at an order of magnitude beyond that ceiling with no back-office headcount at all. That isn&apos;t a marginal efficiency gain to be celebrated with a percentage. It&apos;s a different relationship between the size of a business and the human cost of running it.</P>

        <P>One person. About an hour a day. No office, no dispatcher, no bookkeeper, no customer-service desk, no manager overseeing the crew, nobody chasing payments, nobody chasing reviews. Those roles still exist — they&apos;ve just been moved from payroll into software, where Part V described each of them.</P>

        <H3>The economics traditional operators can&apos;t match</H3>
        <P>Most home service companies bleed margin in three predictable places: paying for leads, paying office staff to chase the work, and losing money to slow or missed collections. The NYC Maid carries none of those lines.</P>
        <StatGrid cols={4} items={[
          { v: live ? live.revenueRangeYtd : "$100k–$110k", l: "Revenue since Feb 2026" },
          { v: "$0", l: "Ads / purchased leads" },
          { v: "99%+", l: "Crew payouts automated" },
          { v: "$0", l: "Admin / manager payroll" },
        ]} />
        <P>The result is a cost structure that inverts the usual trap: revenue scales with jobs, while the overhead that normally scales right alongside it — the people you hire to handle growth — simply doesn&apos;t. The marginal cost of the 700th client is close to the marginal cost of the 70th. That is the whole game, and it&apos;s why this is worth proving rather than asserting.</P>

        <P>It&apos;s worth being precise about what these numbers are and aren&apos;t. They are a real, mid-sized, profitable home service business — not a unicorn, not a viral hit, not a fluke of one lucky month. That&apos;s the point. The achievement isn&apos;t that the revenue is enormous; plenty of cleaning companies gross more. The achievement is the <em>ratio</em>: this much business, this rating, this growth, carried on this little human overhead and this little acquisition cost. A traditional operator producing the same top line would be carrying staff, an ad budget, and a full-time week of their own life to do it. The NYC Maid produces it on the margins of one person&apos;s day. Same output, a fraction of the input — that delta is the entire thesis, expressed as a P&amp;L.</P>

        <Quote attribution="The result, stated plainly">
          A real, competitive, five-hundred-plus-client New York City service business, grown to six figures on zero ad spend, run by one person in about an hour a day. Not a projection. A live system you can call right now.
        </Quote>

        <P>One more figure deserves emphasis because it&apos;s the one that compounds: 1,629 AI conversations handled by Yinez. Every one of those is an interaction that, in a traditional business, would have been the owner&apos;s phone buzzing or a paid rep&apos;s time — a quote, a question, a booking, a reschedule, a payment confirmation. Sixteen hundred-plus times, the front office did its job without a human picking up. That number climbs every day, and it&apos;s the clearest single measure of what &ldquo;the software is the staff&rdquo; actually means in practice: not a feature that was used once in a demo, but a colleague that has now had more customer conversations than most small-business owners have in a year.</P>

        <Callout title="An honest footnote on the numbers">
          Two review figures circulate, and both are real: the <strong>Google</strong> rating is 4.9★ across 73 reviews (what you&apos;ll see on the search result), while the business&apos;s all-sources feedback — including private post-job ratings — averages lower across a larger pool, as any business&apos;s does. We publish the Google number because it&apos;s the one you can independently verify. Revenue is shown as a range, from the live system, since exact figures move daily.
        </Callout>
      </Column>
    </Band>
  );
}
