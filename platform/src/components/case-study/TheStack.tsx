// Part V appendix — the technology choices and why each was made. Grounded in
// the real dependency list (Next 16, React 19, Supabase, Stripe, Telnyx,
// Anthropic, Resend, Leaflet, web-push).
import { Band, Column, P, H3, Quote, Callout, DataTable, Source } from "./Primitives";
import { C, codeToken, sectionTitle, partLabel } from "./cs";

export default function TheStack() {
  return (
    <Band tone="cream">
      <Column className="py-20 sm:py-24">
        <span style={{ ...partLabel }}>Part V · under the hood</span>
        <h3 style={{ ...sectionTitle, fontSize: "clamp(24px, 3vw, 40px)" }} className="mt-4">The stack, and why it was chosen</h3>
        <P>A one-person business that runs five hundred clients can&apos;t afford a stack that needs a DevOps team to keep alive. Every technology choice here was made under the same constraint that shaped everything else: it has to work, hard, with nobody minding it. The result is a deliberately boring, deliberately modern stack — boring where reliability matters, modern where leverage matters.</P>

        <DataTable rows={[
          ["framework", "Next.js 16 — one codebase for marketing, portals, admin, and API"],
          ["runtime / UI", "React 19, server components by default, client JS only where needed"],
          ["data", "Supabase (Postgres) with row-level security enforced at the database"],
          ["payments", "Stripe + Stripe Connect for collection and automatic crew payouts"],
          ["comms", "Telnyx (SMS + programmable voice), Resend (email), web-push"],
          ["AI", "Anthropic SDK — the brain behind Yinez"],
          ["maps / geo", "Leaflet + geocoding for dispatch and GPS check-in"],
          ["scheduling", "Vercel cron — 24 jobs, no separate worker fleet to babysit"],
        ]}/>

        <H3>Boring where it counts</H3>
        <P>Postgres, not a fashionable database. Stripe, not a hand-rolled payment integration. Managed hosting with built-in cron, not a self-managed server with a queue the owner has to watch. Every one of those choices trades a little theoretical flexibility for a lot of operational calm. When the business runs itself, the last thing it can tolerate is infrastructure that needs a human on call — so the infrastructure was chosen to not need one. Row-level security at the database means a bug in the application layer can&apos;t leak one client&apos;s data to another; the guarantee lives below the code, where it can&apos;t be forgotten.</P>

        <P>One codebase is itself a deliberate choice with outsized consequences. The marketing site, the client portal, the cleaner portal, the admin, and the 232 API routes all live in a single Next.js application rather than a constellation of separate apps and services. For a one-person operation that&apos;s decisive: there&apos;s one thing to deploy, one thing to reason about, one place a change ripples through predictably. The complexity that would normally be spread across a frontend team, a backend team, and a mobile team is collapsed into a single, coherent system that one person can actually hold in their head — which is the only way one person can actually maintain it.</P>

        <H3>Modern where it creates leverage</H3>
        <P>The places the stack reaches for the new — React server components, an LLM with tool-use as the front office, serverless cron as the autonomic nervous system — are exactly the places where the leverage is enormous. A server-rendered marketing surface is part of why the SEO works. An AI that can call 56 real tools is the only reason one person can skip hiring a front office. Twenty-four scheduled functions are the night shift. The modernity isn&apos;t for its own sake; each modern piece is load-bearing for the &ldquo;one person, an hour a day&rdquo; result.</P>

        <Callout title="The through-line">
          Notice there is no microservice sprawl, no Kubernetes, no message-broker zoo. A single Next.js application, a managed database, a handful of best-in-class APIs, and scheduled functions. Complexity was spent on the business logic — billing rules, dispatch scoring, the AI&apos;s guardrails — not on the plumbing. That&apos;s the right place to spend it when one person has to understand the whole thing.
        </Callout>

        <P>There&apos;s an operational-cost story hiding in these choices too. A serverless, managed stack means the business pays for infrastructure roughly in proportion to use, with no idle servers and no ops salary to keep the lights on. The expensive line items in most software businesses — a platform team, a 24/7 on-call rotation, a sprawl of services to monitor — simply aren&apos;t here, which is part of how the economics in Part VI stay so lean. The same discipline that keeps the org chart at one person keeps the infrastructure bill and the operational burden small. It all comes from the same place: refuse to add anything that needs a human to babysit it.</P>

        <Quote attribution="The architecture, in a sentence">
          Make the plumbing so dull it never asks for attention, and spend every ounce of cleverness on the parts that actually decide whether the business makes money.
        </Quote>

        <Source>Stack from the production <span style={codeToken}>package.json</span> dependencies and the deployed build output (232 routes, 24 cron jobs, Next.js 16, React 19).</Source>
      </Column>
    </Band>
  );
}
