// Part X — What This Proves. The synthesis.
import { Band, Column, ChapterHead, P, Quote } from "./Primitives";
import { C, codeToken } from "./cs";

export default function Proves() {
  return (
    <Band id="proves" tone="canvas">
      <Column className="py-20 sm:py-28">
        <ChapterHead
          part="Part X"
          title="What This Proves"
          standfirst={<>Strip away the systems, the commit counts, and the roadmap, and the case study reduces to a single claim — one we set out to make undeniable rather than persuasive.</>}
        />

        <P>We built a real company to avoid the oldest dishonesty in software: selling a tool to run a business when you&apos;ve never had to run one with it. The NYC Maid removes that gap entirely. It isn&apos;t a customer we convinced or a demo we staged. It&apos;s our own business, our own money, our own crew, our own reputation on the line — run on the exact platform we&apos;re offering, and left open for inspection down to the commit.</P>

        <P>What the record shows is consistent from the first commit to the live numbers: a business can be found organically instead of bought (<span style={codeToken}>#1 for &ldquo;nyc maid,&rdquo; $0 ads</span>), answered by an AI that&apos;s fenced strictly enough to be trusted with customers and money, dispatched by software that thinks like a good coordinator, paid and reconciled automatically, and kept growing by a review flywheel that feeds itself — all of it overseen by one person in about an hour a day.</P>

        <P>Step back to the question we opened with. The software industry&apos;s oldest tell is the vendor who has never run the business they&apos;re selling you the tools to run. We removed the tell by becoming the customer — the most demanding one, with the most to lose. Everything in this document flows from that single decision: the honesty of the numbers, because we had to live with them; the sharpness of the systems, because they were forged on real failures; the caution in the roadmap, because we know the difference between what we&apos;ve done and what we intend. A company that builds a real business to prove its product can&apos;t hide behind a slide, and we didn&apos;t want to.</P>

        <Quote attribution="The one-sentence version">
          A real, competitive New York City service business — 700+ clients, six figures, 4.9★, zero ad spend — run almost entirely by software, proven in production, and put on the public record so you don&apos;t have to take our word for any of it.
        </Quote>

        <P>If there&apos;s one idea to carry away from twenty thousand words, it&apos;s this: the constraint that everyone in home services treats as a law of nature — that a business can only grow as far as its owner&apos;s hours and overhead allow — turned out to be a constraint of <em>tooling</em>, not of reality. Remove the tooling constraint and the ceiling moves. The NYC Maid is the existence proof. It doesn&apos;t prove every business will do this, or that it&apos;s easy, or that adoption will be fast. It proves the thing was possible, which is the only claim that had to be made true before anything else could follow.</P>

        <P>That&apos;s the proof. Not a projection of what the platform might do, but a demonstration of what it already did — and a standing invitation to verify every part of it yourself. The business is live. The numbers update hourly. Yinez will answer if you text her. The search will show you the ranking. Nothing here is hidden, because the entire point was to build something that didn&apos;t need to be.</P>

        <P>There&apos;s a deeper reason we built it this way, beyond honesty in marketing. Building the business taught us things no amount of designing-in-the-abstract could have. The billing rule that drifted, the payment email that couldn&apos;t be trusted, the AI that needed three months of hard rules, the GPS check-in that failed in a basement — every one of those is a lesson that only a real customer and real money could teach, and every one is now baked into the platform an operator inherits. A case study written about a hypothetical business would have none of that scar tissue. This one is made of it.</P>

        <P>The next operator to run on this machine starts where The NYC Maid is now — not at Day Zero, but at the far end of five months of proven build history, with the hard problems already solved. The only open question left is whose business it runs next.</P>
      </Column>
    </Band>
  );
}
