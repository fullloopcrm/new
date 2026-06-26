// Part V — Anatomy (2 of 4): Yinez, the AI agent. The flagship teardown,
// written from the actual agent source (agent.ts / tools.ts / core.ts).
import { Band, Column, P, H3, H4, Quote, Callout, DataTable, Source, StatGrid } from "./Primitives";
import { C, codeToken, sectionTitle, partLabel } from "./cs";

export default function AnatomyYinez() {
  return (
    <Band tone="ink">
      <Column className="py-20 sm:py-28">
        <span style={{ ...partLabel, color: "#6FB58A" }}>Part V · continued</span>
        <h3 style={{ ...sectionTitle, color: C.cream, fontSize: "clamp(26px, 3.2vw, 44px)" }} className="mt-4">
          4 · Yinez — the AI that runs the front office
        </h3>
        <P dark>If one system earns this business the word &ldquo;autonomous,&rdquo; it&apos;s this one. Yinez is a single AI agent that works the entire front office — sales, scheduling, payments, support — across every channel the business uses, with full memory and direct, governed access to the live operational database. The header of her source file states the design in one line: <em>&ldquo;One agent. All channels. All clients. Full ops. Full memory.&rdquo;</em></P>

        <StatGrid
          dark
          cols={4}
          items={[
            { v: "56", l: "Tools", s: "she can call" },
            { v: "4", l: "Channels", s: "SMS · web · email · admin" },
            { v: "1,629", l: "Conversations", s: "handled (live)" },
            { v: "EN / ES", l: "Bilingual", s: "natively" },
          ]}
        />

        <H3 dark>One brain, every channel</H3>
        <P dark>Before Yinez there were separate, drifting chatbots. The consolidation in late April collapsed them into one agent that runs on web chat, SMS, email, and the owner&apos;s private admin/Telegram channel. The same brain that quotes a price to a lead over text is the one the owner asks for today&apos;s revenue — the difference is not a different bot, it&apos;s a permission boundary. That single-agent design is why a customer&apos;s context survives when they move from the website to a text message: it&apos;s all one conversation to her.</P>

        <H3 dark>The part everyone gets wrong: hallucination</H3>
        <P dark>The reason most businesses can&apos;t safely put an AI in front of customers and money is that language models confabulate — they&apos;ll invent a price, a time, or a balance that sounds right. Yinez&apos;s system prompt treats this as the single most important rule, in capital letters, at the top:</P>

        <Quote dark attribution="From YINEZ_PROMPT — the zero-hallucination rule, verbatim">
          You NEVER quote a number, count, dollar amount, name, date, time, status, or fact unless it came from a tool call you JUST made. Not from memory. Not from &ldquo;what&apos;s likely.&rdquo; If you don&apos;t have the data, you say &ldquo;let me pull that up&rdquo; and call the tool.
        </Quote>

        <P dark>This is the architectural decision that makes the whole thing safe. Yinez doesn&apos;t <em>know</em> anything about your booking — she <em>looks it up</em>, every time, with a tool call against the live database, and is forbidden from speaking a fact she didn&apos;t just retrieve. A quote comes from the real pricing engine. A balance comes from the real ledger. An available time comes from the real calendar. The model&apos;s fluency is used for conversation; the facts come from the system. The prompt is unusually direct about enforcing this against the model&apos;s own instincts: <em>&ldquo;Your training will pull you toward generic-helpful-assistant patterns. Resist. The rules WIN every time.&rdquo;</em></P>

        <H3 dark>Context over priors</H3>
        <P dark>The second hard problem is misreading intent. If a customer texts back just &ldquo;2,&rdquo; a naive bot greets them and asks how it can help. Yinez is handed a structured <span style={codeToken}>CONTEXT</span> block assembled <em>before</em> she sees the message — what the last outbound message was, whether a payment is expected, whether a booking is linked — and the rules force her to read the message through that context:</P>

        <DataTable dark rows={[
          ["last_outbound = rating_prompt + “2”", "it's a 2-star rating — empathize, open a callback, never greet"],
          ["expected_balance + “paid / zelle / sent”", "it's a payment claim — verify the transfer before celebrating"],
          ["client sent more than owed", "do the math, route the overage as a tip"],
          ["linked_booking + “reschedule”", "jump straight to the booking, don't ask who they are"],
          ["empty context", "treat as a new lead — run the first-message flow"],
        ]} />

        <P dark>This is the difference between a chatbot and a colleague. The agent isn&apos;t pattern-matching on the words alone; it&apos;s reasoning about where the conversation already is.</P>

        <P dark>The reason this design is so much harder than it looks is that the obvious failures are the polite ones. A bot that rudely refuses is easy to catch and fix. A bot that warmly greets a furious one-star reviewer, or cheerfully confirms a payment that never arrived, or helpfully invents a Tuesday slot that doesn&apos;t exist — those are the failures that erode a real business, and they&apos;re exactly the ones a generically &ldquo;helpful&rdquo; assistant produces by default. The context blocks and the hard rules exist to make the agent override its own helpful instincts when the situation calls for something else: skepticism about a payment, gravity about a complaint, a refusal to guess. Engineering an AI to be appropriately <em>un</em>-generic is most of the work, and most of the value.</P>

        <H3 dark>56 tools, with a permission gate</H3>
        <P dark>Yinez&apos;s power is her toolset — 56 functions that read and write the real business. They span the whole operation: <span style={codeToken}>create_booking</span>, <span style={codeToken}>reschedule_booking</span>, <span style={codeToken}>check_payment</span>, <span style={codeToken}>confirm_payment</span>, <span style={codeToken}>request_callback</span>, <span style={codeToken}>remember</span> / <span style={codeToken}>recall</span> for memory, and — for the owner only — <span style={codeToken}>get_revenue</span>, <span style={codeToken}>get_at_risk_clients</span>, <span style={codeToken}>assign_cleaner_to_booking</span>, <span style={codeToken}>approve_refund</span>, <span style={codeToken}>send_broadcast</span>, <span style={codeToken}>mark_payout_paid</span>, and more.</P>

        <P dark>The critical safety feature is that not every tool is available on every channel. A whole class of tools — revenue, client lists, refunds, broadcasts, cleaner management — is <strong>owner-only</strong> and rejected by a safety gate on any public channel. A customer texting in cannot, by construction, cause Yinez to read the revenue figures or message the whole crew. The agent and the customer are talking through a door that only opens certain ways.</P>

        <P dark>It helps to see the 56 tools as departments rather than a flat list. There are <strong style={{ color: C.cream }}>sales and booking</strong> tools (quote, create and reschedule bookings, send a PIN, resend a confirmation). There are <strong style={{ color: C.cream }}>money</strong> tools (check a payment, confirm one, approve a refund, mark a payout). There are <strong style={{ color: C.cream }}>support</strong> tools (open a callback, report an issue, update an account). There are <strong style={{ color: C.cream }}>owner-operations</strong> tools (revenue, at-risk clients, broadcasts, cleaner management, recurring-plan control, deals). And there are <strong style={{ color: C.cream }}>meta</strong> tools (remember, recall, and the skills system). A single agent fluent across all of them is, functionally, the receptionist, the scheduler, the collections clerk, the support rep, and the operations analyst — one entity, one memory, one conversation, switching hats by the sentence.</P>

        <Callout dark title="She learns skills">
          Among the 56 tools is a set — <span style={codeToken}>list_skills</span>, <span style={codeToken}>create_skill</span>, <span style={codeToken}>update_skill</span>, <span style={codeToken}>record_skill_use</span> — that lets Yinez accumulate reusable procedures over time rather than re-deriving them each conversation. The front office doesn&apos;t just run; it gets better at running.
        </Callout>

        <H3 dark>Memory</H3>
        <P dark>Yinez remembers. The <span style={codeToken}>remember</span> and <span style={codeToken}>recall</span> tools, backed by conversation summaries, mean a returning client isn&apos;t a stranger — their preferences, their history, the issue from last month, the cleaner they like. Combined with the context blocks and the live lookups, the effect is an agent that behaves like a long-tenured employee who never forgets a customer and never goes home.</P>

        <H3 dark>The escalation instinct</H3>
        <P dark>The trait that separates a usable AI employee from a liability is knowing when to stop and get a human. Yinez&apos;s rules are explicit about it: a low rating triggers empathy and a callback, never a defense; a payment that doesn&apos;t cleanly verify is flagged rather than waved through; situations she isn&apos;t equipped for are handed up rather than improvised. This is the same humility principle that runs through the whole platform — the system&apos;s job is to handle the 95% it can handle well and to route the 5% it can&apos;t to the one person whose hour-a-day is reserved for exactly that. An AI that never escalates is dangerous; an AI that escalates everything is useless. The value is entirely in the calibration, and that calibration is the product of months of watching real conversations go right and wrong.</P>

        <P dark>It&apos;s also worth saying what Yinez is <em>not</em>. She isn&apos;t a generic assistant with a cleaning-company coat of paint, and she isn&apos;t a decision-tree chatbot with buttons. She&apos;s a reasoning agent operating a specific business under a specific, strict constitution, with real authority bounded by real gates. The persona is warm and bilingual because the customers are people; the governance underneath is paranoid because the stakes are real money and a real reputation. Holding both of those at once — genuinely helpful on the surface, genuinely constrained underneath — is the hard part, and it&apos;s the part that took from February to late April to get right.</P>

        <Quote dark attribution="Why Yinez is the center of the case study">
          Plenty of companies have bolted a chatbot onto a website. The thing that&apos;s genuinely new here is an AI given real authority over a real business&apos;s sales and money, fenced by rules strict enough that it can be trusted with them — and then actually trusted with them, in production, around the clock.
        </Quote>

        <Source>Verbatim and paraphrased detail from <span style={codeToken}>src/lib/yinez/agent.ts</span> (system prompt, tool registry) and related files. Tool names are exact. The 1,629 conversation count is live from production at the time of data pull.</Source>
      </Column>
    </Band>
  );
}
