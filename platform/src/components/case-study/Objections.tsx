// Objections, answered honestly — the skeptic's section. Pre-empts the obvious
// "yeah, but…" questions without spin, in keeping with the document's premise.
import { Band, Column, P, Quote, Source } from "./Primitives";
import { C, display, partLabel, sectionTitle, codeToken, csLink } from "./cs";

type QA = { q: string; a: React.ReactNode; text: string };

const QAS: QA[] = [
  {
    q: "Has a company really been started just to be a case study? Is that a real thing?",
    a: <>As far as we can find, <strong>The NYC Maid is the first business built specifically to be its own case study</strong> — a real, licensed New York City cleaning company founded on Full Loop CRM for the express purpose of proving the platform in production, not describing it in a slide deck. The case study and the company are the same object: every number on this page comes straight from the business&apos;s live system, and you can verify it yourself.</>,
    text: "As far as we can find, The NYC Maid is the first business built specifically to be its own case study — a real, licensed New York City cleaning company founded on Full Loop CRM for the express purpose of proving the platform in production, not describing it in a slide deck. The case study and the company are the same object: every number on this page comes straight from the business's live system, and you can verify it yourself.",
  },
  {
    q: "“Autonomous” — really? Surely a human still does things.",
    a: <>Yes, and we&apos;ve been specific about which things. A person spends about an hour a day on judgment calls: an unusual booking, a complaint that needs a human voice, a hiring decision, an edge case the system escalates. What that person does <em>not</em> do is answer routine inquiries, dispatch crews, chase payments, cut payout checks, ask for reviews, or send reminders — those run without them. &ldquo;Almost autonomous&rdquo; is the honest phrase, and it&apos;s the one we use.</>,
    text: "Yes, and we've been specific about which things. A person spends about an hour a day on judgment calls: an unusual booking, a complaint that needs a human voice, a hiring decision, an edge case the system escalates. What that person does not do is answer routine inquiries, dispatch crews, chase payments, cut payout checks, ask for reviews, or send reminders — those run without them. “Almost autonomous” is the honest phrase, and it's the one we use.",
  },
  {
    q: "Isn't the AI going to hallucinate a price or a time eventually?",
    a: <>It&apos;s the risk we engineered hardest against. Yinez is forbidden by her core rules from stating any number, time, or fact she didn&apos;t just retrieve with a tool call against the live data — she looks everything up rather than recalling it. When she doesn&apos;t have the data, the required behavior is &ldquo;let me pull that up,&rdquo; not a guess. It&apos;s not perfect — no system is — but the architecture makes confident-wrong answers the exception the rules are built to prevent, not the default.</>,
    text: "It's the risk we engineered hardest against. Yinez is forbidden by her core rules from stating any number, time, or fact she didn't just retrieve with a tool call against the live data — she looks everything up rather than recalling it. When she doesn't have the data, the required behavior is 'let me pull that up,' not a guess. It's not perfect — no system is — but the architecture makes confident-wrong answers the exception the rules are built to prevent, not the default.",
  },
  {
    q: "$0 on ads is doing a lot of work. Define it.",
    a: <>It means no Google Ads, no paid lead marketplaces, no purchased lists, no boosted posts — verifiable in the attribution data, which shows no paid sources. It does <strong>not</strong> mean &ldquo;free.&rdquo; The cost was the build: five months and 1,491 commits of engineering to make organic acquisition work. We traded ad spend for software. That&apos;s the actual claim.</>,
    text: "It means no Google Ads, no paid lead marketplaces, no purchased lists, no boosted posts — verifiable in the attribution data, which shows no paid sources. It does not mean “free.” The cost was the build: five months and 1,491 commits of engineering to make organic acquisition work. We traded ad spend for software. That's the actual claim.",
  },
  {
    q: "Two review numbers showed up earlier. Which is real?",
    a: <>Both. The <strong>Google</strong> rating — 4.9★ across 73 reviews — is what you see on the search result and can verify yourself; it&apos;s the public number. The business&apos;s all-sources feedback, including private post-job ratings, averages lower across a larger pool, exactly as any honest business&apos;s internal data does. We lead with the Google figure precisely because it&apos;s the one you don&apos;t have to trust us on.</>,
    text: "Both. The Google rating — 4.9★ across 73 reviews — is what you see on the search result and can verify yourself; it's the public number. The business's all-sources feedback, including private post-job ratings, averages lower across a larger pool, exactly as any honest business's internal data does. We lead with the Google figure precisely because it's the one you don't have to trust us on.",
  },
  {
    q: "If it's this good, why tell everyone instead of just running businesses?",
    a: <>Because the leverage isn&apos;t in running one business — it&apos;s in the system that can run many. One autonomously-operated cleaning company is a nice income; a platform that lets a thousand operators each run one is a category. Publishing the proof and opening it to operators is the larger opportunity, not a smaller one. And the &ldquo;one operator per trade per city&rdquo; model means sharing it doesn&apos;t cannibalize anything — your market and a stranger&apos;s market in another city don&apos;t compete. The honest answer is that telling everyone <em>is</em> the business plan.</>,
    text: "Because the leverage isn't in running one business — it's in the system that can run many. One autonomously-operated cleaning company is a nice income; a platform that lets a thousand operators each run one is a category. Publishing the proof and opening it to operators is the larger opportunity, not a smaller one. And the “one operator per trade per city” model means sharing it doesn't cannibalize anything — your market and a stranger's market in another city don't compete. The honest answer is that telling everyone is the business plan.",
  },
  {
    q: "Cleaning is simple. Would this work for a harder trade?",
    a: <>The systems are deliberately about <em>operations</em> — acquisition, response, dispatch, billing, payouts, retention — not about cleaning. Towing, pest control, and landscaping have the same four leaks described in Part IV. The multi-tenant platform in Part VII exists to test exactly that, and other trades are already being brought onto it. We won&apos;t claim it&apos;s proven across every trade yet — it&apos;s proven on this one, and built to generalize.</>,
    text: "The systems are deliberately about operations — acquisition, response, dispatch, billing, payouts, retention — not about cleaning. Towing, pest control, and landscaping have the same four leaks described in Part IV. The multi-tenant platform in Part VII exists to test exactly that, and other trades are already being brought onto it. We won't claim it's proven across every trade yet — it's proven on this one, and built to generalize.",
  },
  {
    q: "Couldn't you just be cherry-picking flattering numbers?",
    a: <>That&apos;s why the whole thing is on the record and linkable. The operational stats come from a public endpoint that updates hourly — you can read the raw JSON. The ranking is a search you can run. The authority metrics are from Ahrefs, independent of us. Yinez will talk to you directly. We built it this way so the answer to &ldquo;are you cherry-picking?&rdquo; is &ldquo;go look.&rdquo;</>,
    text: "That's why the whole thing is on the record and linkable. The operational stats come from a public endpoint that updates hourly — you can read the raw JSON. The ranking is a search you can run. The authority metrics are from Ahrefs, independent of us. Yinez will talk to you directly. We built it this way so the answer to “are you cherry-picking?” is “go look.”",
  },
  {
    q: "Isn't a one-person business just fragile? What if that person is out?",
    a: <>It&apos;s a fair worry, and it cuts the opposite way from how it first sounds. In a traditional shop, if the owner is out, the dispatching, quoting, and collecting stop — because those live in the owner&apos;s head. Here they live in software that runs whether or not anyone logs in: the crons still send reminders, Yinez still books and answers, payments still process and pay out. The business is <em>less</em> dependent on a single person being available, not more, because the operation isn&apos;t the person — it&apos;s the system the person supervises. The bus-factor risk moved from &ldquo;the owner&rdquo; to &ldquo;the platform,&rdquo; and the platform doesn&apos;t take a day off.</>,
    text: "It's a fair worry, and it cuts the opposite way from how it first sounds. In a traditional shop, if the owner is out, the dispatching, quoting, and collecting stop — because those live in the owner's head. Here they live in software that runs whether or not anyone logs in: the crons still send reminders, Yinez still books and answers, payments still process and pay out. The business is less dependent on a single person being available, not more, because the operation isn't the person — it's the system the person supervises. The bus-factor risk moved from “the owner” to “the platform,” and the platform doesn't take a day off.",
  },
  {
    q: "What happens when something breaks at 3 AM?",
    a: <>It surfaces, it doesn&apos;t silently misfire. Health-monitor crons watch the system and the AI provider; uncertain payments are flagged partial rather than marked paid; low ratings open a callback rather than getting smoothed over. The design rule everywhere a human isn&apos;t watching is to fail toward &ldquo;flag a person,&rdquo; never toward an irreversible wrong action. That&apos;s what makes stepping away safe — not the absence of problems, but the handling of them.</>,
    text: "It surfaces, it doesn't silently misfire. Health-monitor crons watch the system and the AI provider; uncertain payments are flagged partial rather than marked paid; low ratings open a callback rather than getting smoothed over. The design rule everywhere a human isn't watching is to fail toward “flag a person,” never toward an irreversible wrong action. That's what makes stepping away safe — not the absence of problems, but the handling of them.",
  },
];

export const objectionFaqs = QAS.map(({ q, text }) => ({ question: q, answer: text }));

export default function Objections() {
  return (
    <Band tone="cream">
      <Column className="py-20 sm:py-28">
        <span style={{ ...partLabel }}>Before you decide</span>
        <h3 style={{ ...sectionTitle, fontSize: "clamp(26px, 3.4vw, 46px)" }} className="mt-4">
          The skeptical questions, answered straight
        </h3>
        <P>A case study that only flatters itself isn&apos;t worth reading. So here are the objections a sharp reader should be raising, answered without spin — because the entire premise of this document is that it doesn&apos;t need any.</P>

        <div className="mt-10 space-y-9">
          {QAS.map((qa) => (
            <div key={qa.q} style={{ borderTop: `1px solid ${C.line}`, paddingTop: "20px" }}>
              <h4 style={{ fontFamily: display, fontWeight: 500, fontSize: "clamp(19px, 2vw, 25px)", letterSpacing: "-0.015em", color: C.ink, lineHeight: 1.25 }}>{qa.q}</h4>
              <p style={{ fontFamily: "var(--body, system-ui, sans-serif)", fontSize: "16.5px", lineHeight: 1.72, color: C.graphite, marginTop: "10px" }}>{qa.a}</p>
            </div>
          ))}
        </div>

        <p className="mt-10" style={{ fontFamily: "var(--body, system-ui, sans-serif)", fontSize: "15px", color: C.muted }}>
          More questions about the platform itself? See the full{" "}
          <a href="/full-loop-crm-frequently-asked-questions" style={csLink}>Full Loop CRM FAQ</a>.
        </p>

        <Quote attribution="The standard we held this to">
          The test for every number on this page was simple: could a stranger check it without asking us? If not, we either made it checkable or didn&apos;t claim it.
        </Quote>

        <Source>Every external claim referenced here is verifiable through the links in this document: the live site, the public stats endpoint, the Google search result, and third-party SEO tooling.</Source>
      </Column>
    </Band>
  );
}
