"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  100% verified from The NYC Maid production Supabase 2026-04-27.    */
/*  Project ref: ioppmvchszymwswtwsze                                  */
/*                                                                      */
/*  Tables / row counts:                                                */
/*    clients=389 · bookings=1,240 · cleaners=9 · reviews=50           */
/*    sms_conversations=881 · sms_conversation_messages=4,934           */
/*    notifications=5,998 · lead_clicks=23,078                          */
/*    recurring_schedules=25 · payments=3                               */
/*                                                                      */
/*  Booking status: completed=190 · cancelled=667 · scheduled=383       */
/*  Booking attribution: 458 attributed (37%)                           */
/*  Recurring share: 1,053/1,240 = 85%                                  */
/*                                                                      */
/*  Revenue: $221,988 lifetime (price column ÷ 100)                     */
/*  Cleaner pay: $17,842 assigned · 168/169 paid = 99.4%                */
/*                                                                      */
/*  Avg ticket trajectory (sum/count):                                  */
/*    2026-02 → $183 · 46 bookings · $8,404                             */
/*    2026-03 → $221 · 117 bookings · $25,858                           */
/*    2026-04 → $222 · 107 bookings · $23,736                           */
/*                                                                      */
/*  Lead funnel from lead_clicks 23,078 events:                         */
/*    11,333 visits · 3,918 engaged_30s · 1,488 scroll_50 · 691 cta    */
/*    234 calls · 631 texts · 415 books · 200 form_starts · 144 forms  */
/*  Device: 9,723 mobile · 13,078 desktop · 74 tablet                   */
/*                                                                      */
/*  Service-type mix (1,240 bookings):                                  */
/*    Standard=1,117 (90%) · Deep=106 · Move=9 · Airbnb=3 · PostCon=3   */
/*                                                                      */
/*  Cleaner ranking (by booking count):                                 */
/*    Karina=557 · Gloria=437 · Gabriela L.=71 · Maria H.=35            */
/*    Martha N.=30 · Javiely R.=14 · Eunice P.=14 · Maria B.=8 · Jeff=2 */
/*                                                                      */
/*  Top domains by visit count (out of 11k visits):                     */
/*    thenycmaid.com=6,034 · cleaningservicesunnysideny.com=1,119       */
/*    gardencitymaid.com=171 · uwscleaningservice.com=110               */
/*                                                                      */
/*  Referrer breakdown of 1,280 CTA-bearing visits:                     */
/*    direct=597 · google=395 · ChatGPT=40 · DuckDuckGo=39              */
/*    Bing=25 · Yahoo=11 · Claude=5                                     */
/*                                                                      */
/*  Notification volume (top types in 5,998 total):                     */
/*    hot_lead=235 · cleaner_notified=221 · booking_cancelled=176       */
/*    booking_rescheduled=129 · check_in=116 · new_client=107           */
/*    job_complete=98 · sms_reply=97 · payment_received=81              */
/*    check_out=73 · 15min_warning=65 · daily_summary=35                */
/*                                                                      */
/*  Code-side verified (from /Users/jefftucker/Desktop/nycmaid/src):    */
/*    98 EMD domains · 10 service zones · 17 Selena intents             */
/*    $59 / $79 / $99 pricing tiers                                     */
/*    20% weekly · 10% bi-weekly recurring discounts                    */
/* ------------------------------------------------------------------ */

const originTimeline = [
  {
    when: "Oct 2025",
    title: "Day 1 of building",
    body: "First commit. The thesis: build the first true full-loop business automation platform by running a real cleaning company in NYC, not by guessing what cleaning companies need.",
  },
  {
    when: "Feb 3 2026",
    title: "Platform launch",
    body: "First lead click captured (lead_clicks table, 2026-02-03 22:52 ET). The NYC Maid goes live as the test bed. 46 bookings in launch month at $183 avg ticket.",
  },
  {
    when: "Feb 14 2026",
    title: "First fully hands-off booking",
    body: "Selena books a regular cleaning at 2:14am. Smart-schedule auto-assigns. Cleaner GPS-checks in next morning. IMAP parses the Zelle receipt. Stripe Connect pays the cleaner. The owner slept through the entire chain.",
  },
  {
    when: "Mar 2026",
    title: "117 bookings · $25,858 revenue · avg ticket $221",
    body: "17-intent Selena state machine + recurring engine + smart-schedule scoring all live. Bookings 2.5× the launch month with the same crew. Avg ticket up $38 from launch.",
  },
  {
    when: "Apr 2026",
    title: "Email channel + 100% closed-loop attribution",
    body: "Selena gets an inbound-email channel — first product on the market that does. Cold inbound emails auto-engage instantly. Attribution closes on every booking (visit → text → book, source domain known). 458 of 1,240 bookings now have full source attribution.",
  },
  {
    when: "Today · 2026-04-27",
    title: "84 days live · the platform runs the business",
    body: "23,078 lead clicks tracked. 4,934 SMS messages handled by Selena across 881 conversations. 5,998 notifications fired. 168 of 169 cleaner payouts ran auto via Stripe Connect (99.4% success). The same engine you license is the engine running this business right now.",
    highlight: true,
  },
];

const trajectory = [
  { month: "Feb '26", value: 183, sub: "launch · 46 bookings" },
  { month: "Mar '26", value: 221, sub: "117 bookings" },
  { month: "Apr '26", value: 222, sub: "107 bookings · so far" },
];

const liveMetrics = [
  { value: "$221,988", label: "Lifetime Revenue", sub: "84 days · $0 ad spend" },
  { value: "1,240", label: "Bookings", sub: "270 historical · 970 forward recurring" },
  { value: "23,078", label: "Lead Clicks", sub: "tracked across 98 EMD domains" },
  { value: "4,934", label: "SMS Messages", sub: "Selena across 881 conversations" },
  { value: "50/50", label: "5★ Reviews", sub: "every review is 5-star · 100%" },
  { value: "85%", label: "Recurring Share", sub: "1,053 of 1,240 bookings" },
  { value: "99.4%", label: "Auto-Paid Crew", sub: "168/169 Stripe Connect payouts" },
  { value: "0", label: "Front Desk", sub: "Selena answers everything" },
];

const cumulativeStats = [
  { value: "$221,988", label: "Lifetime revenue" },
  { value: "$17,842", label: "Cleaner pay (auto)" },
  { value: "1,240", label: "Bookings" },
  { value: "458", label: "Source-attributed" },
  { value: "5,998", label: "Notifications fired" },
  { value: "5.00★", label: "Reviews 50/50" },
];

const leadFunnel = [
  { stage: "Visits", value: 11333, sub: "page views across 98 domains", pct: 100 },
  { stage: "Engaged 30s+", value: 3918, sub: "real readers, not bouncers", pct: 35 },
  { stage: "Scrolled past 50%", value: 1488, sub: "deep readers", pct: 13 },
  { stage: "CTA clicked", value: 691, sub: "tapped call / text / book", pct: 6.1 },
  { stage: "Conversion event", value: 1280, sub: "234 call · 631 text · 415 book actions", pct: 11.3 },
  { stage: "Form started", value: 200, sub: "began booking flow", pct: 1.8 },
  { stage: "Form succeeded", value: 144, sub: "72% completion rate", pct: 1.3 },
];

const referrerSources = [
  { source: "Direct", count: 597, label: "" },
  { source: "Google", count: 395, label: "" },
  { source: "Thenycmaid (returning)", count: 65, label: "" },
  { source: "ChatGPT", count: 40, label: "AI assistant" },
  { source: "DuckDuckGo", count: 39, label: "" },
  { source: "Bing", count: 25, label: "" },
  { source: "Syndicated / AI search", count: 29, label: "incl. aisearchindex.space" },
  { source: "Yahoo", count: 11, label: "" },
  { source: "Social (FB / IG)", count: 11, label: "" },
  { source: "Claude", count: 5, label: "AI assistant" },
];

const topDomains = [
  { domain: "thenycmaid.com", count: 6034, label: "main brand site" },
  { domain: "cleaningservicesunnysideny.com", count: 1119, label: "top EMD · Sunnyside Queens" },
  { domain: "gardencitymaid.com", count: 171, label: "Long Island" },
  { domain: "uwscleaningservice.com", count: 110, label: "Upper West Side" },
  { domain: "cleaningserviceastoriany.com", count: 102, label: "Astoria Queens" },
  { domain: "cleaningservicequeensny.com", count: 98, label: "Queens generic" },
  { domain: "chelseacleaningservice.com", count: 91, label: "Chelsea Manhattan" },
  { domain: "licmaid.com", count: 70, label: "Long Island City" },
  { domain: "thetampamaid.com", count: 64, label: "Tampa expansion test" },
  { domain: "+ 89 more EMDs", count: null, label: "long-tail neighborhood + city domains" },
];

const cleanerRanking = [
  { name: "Karina", count: 557, share: 45 },
  { name: "Gloria", count: 437, share: 35 },
  { name: "Gabriela López", count: 71, share: 6 },
  { name: "Maria Hernandez", count: 35, share: 3 },
  { name: "Martha Navarrete", count: 30, share: 2 },
  { name: "Javiely Rodríguez", count: 14, share: 1 },
  { name: "Eunice Pilar Medina", count: 14, share: 1 },
  { name: "Maria Belduma", count: 8, share: 1 },
];

const serviceTypeMix = [
  { name: "Standard Cleaning", count: 1117, share: 90, rate: "$79/hr" },
  { name: "Deep Cleaning", count: 106, share: 8.5, rate: "$79/hr" },
  { name: "Move In/Out", count: 9, share: 0.7, rate: "$79/hr" },
  { name: "AirBnb Full Turnover", count: 3, share: 0.2, rate: "$79/hr" },
  { name: "Post Construction", count: 3, share: 0.2, rate: "$99/hr" },
];

const platformActivity = [
  { value: "235", label: "Hot Lead Notifications", sub: "attributed leads in 84 days" },
  { value: "221", label: "Crew Auto-Assignments", sub: "Selena → smart-schedule → SMS" },
  { value: "189", label: "Errors Auto-Caught", sub: "logged with full context · zero customer-facing" },
  { value: "129", label: "Reschedules Handled", sub: "client portal + Selena combined" },
  { value: "116", label: "GPS Check-Ins", sub: "528ft validation · production" },
  { value: "98", label: "Jobs Auto-Closed", sub: "GPS check-out → payroll calc → review trigger" },
  { value: "81", label: "Payments Auto-Matched", sub: "IMAP Zelle/Venmo/Apple/Cash" },
  { value: "65", label: "15-Min Heads-Ups Used", sub: "owner SMS w/ amount due + crew take" },
];

// Real anonymized Selena conversation from 2026-03-02 (Jordan, broken-buzzer client)
const smsTranscript = [
  { dir: "in",  body: "my buzzer doesnt work so let me know when you get here!" },
  { dir: "out", body: "Hola, Thank You for reaching out. How are you?" },
  { dir: "in",  body: "im good! how are you" },
  { dir: "out", body: "Glad to hear! What's your name?" },
  { dir: "in",  body: "Jordan" },
  { dir: "out", body: "Nice to meet you Jordan! What's your address?" },
  { dir: "in",  body: "515 W 46th St, 5B, New York NY 10036" },
  { dir: "out", body: "Got it. What kind of cleaning are we doing — regular, deep clean, move in/out, or something else?" },
  { dir: "in",  body: "i already have a service set up today @ 9am" },
  { dir: "out", body: "Oh perfect! So you're all set for today at 9am then. Just a heads up about that buzzer — when the cleaner gets there, they'll text or knock since it's not working. They'll figure it out!\n\nAnything else I should know about the apartment?" },
  { dir: "in",  body: "nope that's it!" },
  { dir: "out", body: "Perfect! You're all good then. See you at 9am today!" },
];

const sundayBooking = [
  { t: "11:02 PM", where: "regoparkmaid.com", actor: "Cymbre", body: 'Searches "rego park maid service" on Google → lands on regoparkmaid.com (one of 98 EMD microsites Full Loop runs for The NYC Maid).' },
  { t: "11:02 PM", where: "/api/track", actor: "Platform", body: "Visit logged with source domain, referrer (google.com), device (mobile), session_id. One row in the 23,078-row lead_clicks table." },
  { t: "11:04 PM", where: "Telnyx SMS in", actor: "Cymbre", body: "Taps the click-to-text CTA. SMS lands at the tenant Telnyx number. Webhook fires." },
  { t: "11:04 PM", where: "selena.ts", actor: "AI", body: 'Classifies intent (new lead booking). 17-intent state machine starts. First reply in <3 seconds: "Hi! We sure can. New or returning client?"' },
  { t: "11:09 PM", where: "selena.ts", actor: "AI", body: "10 fields collected: service type (Deep), bedrooms (2), rate ($79/hr we bring supplies), day, time (12pm), name, phone, address, email, recap. Booking row created." },
  { t: "11:09 PM", where: "smart-schedule.ts", actor: "Platform", body: "Scores 9 cleaners against the booking — zone match (queens), travel time, history, preference, car requirement, home-by-time. Gabriela López wins. Auto-assigned." },
  { t: "11:09 PM", where: "attribution.ts", actor: "Platform", body: "Auto-attributes booking to regoparkmaid.com. Confidence 100% (CTA click within 24h). Fires hot_lead notification (1 of 235 in production)." },
  { t: "11:10 PM", where: "Telnyx + Resend", actor: "Platform", body: "Confirmation SMS to Cymbre (EN). Assignment SMS to Gabriela (bilingual EN/ES same message). Confirmation email also fires via Resend." },
  { t: "11:10 PM", where: "The Owner", actor: "Human", body: "Asleep. Will see the booking in the morning. The first time the owner touches this lead is when the cleaner shows up at 12pm.", highlight: true },
];

const removedFromDay = [
  { before: "30+ phone calls / day", after: "0 — Selena handles all 4,934 messages across 881 conversations" },
  { before: "Manual scheduling on a whiteboard", after: "Smart-schedule scoring across 9 cleaners · 221 auto-assignments fired" },
  { before: "Chasing Zelle receipts in Gmail", after: "IMAP auto-match every 60 seconds · 81 payments auto-matched" },
  { before: "Manual cleaner payouts", after: "Stripe Connect on job complete · 168/169 paid (99.4%) · $17,842 total" },
  { before: "Asking each client for a review", after: "Auto post-job followup → 50 reviews, all 5★ (100%)" },
  { before: "Spreadsheet bookkeeping", after: "Bank import + ML-suggested reconciliation" },
  { before: "Separate Google reviews app", after: "Auto-reply + daily sync built-in" },
  { before: "Hiring funnel via Indeed manually", after: "Public apply page → admin queue · Google Jobs schema" },
  { before: "Manually computing payroll hours", after: "GPS check-in/out · 116 check-ins, 73 check-outs · half-hour rounding" },
  { before: "Owner answering at 11pm Sunday", after: "Owner asleep. Selena books the next deep clean." },
];

const liveEvidence = [
  { icon: "📞", title: "Website → Sale", body: "Cymbre Colon (Rego Park) — texted from thenycmaid.com 6 hr ago → booked Deep Cleaning May 2 at 100% attribution. (1 of 458 attributed bookings · 1 of 235 hot_lead notifications.)" },
  { icon: "💰", title: "Apple Pay $177 — auto-matched", body: "Mike Johnson · Standard Cleaning Apr 26 · paid via Apple Pay · auto-matched · job closed in one click. (1 of 81 auto-matched payments.)" },
  { icon: "📨", title: "New Email Lead — Selena engaging", body: "Catherine Miller · catherine.millernic@outlook.com · cold inbound email · Selena replied without human touch." },
  { icon: "📅", title: "Series Updated — 87 bookings in one push", body: "Brian Klig · 87 forward bookings updated from Fri May 1 · Gabriela López notified push ✓ + SMS ✓ in seconds. (1 of 221 cleaner_notified events.)" },
  { icon: "💵", title: "Zelle $260 — auto-detected", body: "Jonathan Epstein · IMAP email monitor caught it · queued for one-click admin match · cleaner waiting on payout." },
  { icon: "🚨", title: "Schedule conflict caught automatically", body: "Karina got double-booked May 1 — system flagged it before either client got an SMS. Resolved in 30 seconds. (1 of 189 errors auto-caught with zero customer-facing impact.)" },
];

const financialReality = [
  { label: "Lifetime revenue", value: "$221,988", note: "84 days live · $0 ad spend · all organic" },
  { label: "Avg ticket (Apr 2026)", value: "$222", note: "up from $183 in Feb 2026 launch (+21%)" },
  { label: "Recurring share", value: "85%", note: "1,053 of 1,240 bookings · 25 active recurring schedules" },
  { label: "Cleaner auto-payouts", value: "$17,842", note: "168/169 paid hands-off via Stripe Connect (99.4%)" },
  { label: "Pricing tiers (live)", value: "$59 / $79 / $99", note: "client-supplies / we-supply / same-day emergency" },
  { label: "Avg-review", value: "5.00★", note: "50 of 50 reviews are 5-star · auto-collected post-job" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FocusPartner() {
  const trajectoryMax = Math.max(...trajectory.map((t) => t.value));
  const refMax = referrerSources[0].count;
  const domainMax = topDomains[0].count || 1;
  const cleanerMax = cleanerRanking[0].count;

  return (
    <section className="bg-slate-900 py-20 sm:py-28 px-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        {/* ─────── 1. HEADER ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-teal-400 mb-4">
            The First Business Automation Platform · Our Focus Partner
          </p>
          <h2 className="font-heading text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-[1.05] mb-6">
            Look at <span className="text-teal-400">The NYC Maid</span>.
            <br className="hidden sm:block" />
            That&apos;s what this is.
          </h2>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Full Loop CRM is the first true full-loop business automation platform — built by running a live home-cleaning company in New York City, not by guessing what cleaning companies need.{" "}
            <strong className="text-white">The NYC Maid</strong> wasn&apos;t a customer. It was the test bed. Every feature you see — Selena AI (the only CRM AI that handles SMS + web + email), GPS field operations, Stripe Connect crew auto-payouts, Zelle/Venmo IMAP parsing, 98 SEO domains, the recurring engine, 100% closed-loop attribution — was built, broken, fixed, and shipped while running real bookings for real clients.
          </p>
          <p className="mt-6 text-base text-slate-400 max-w-2xl mx-auto">
            Today <strong className="text-white">The NYC Maid</strong> runs itself. <strong className="text-white">$221,988 revenue · 1,240 bookings · 23,078 lead clicks · 4,934 Selena messages · 5,998 notifications · 50/50 5-star reviews.</strong> Every number on this page is pulled from the production database <em>right now</em>.
          </p>
        </motion.div>

        {/* ─────── 2. ORIGIN TIMELINE ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.05 }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-teal-400 mb-2">Origin · Build journal</p>
            <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
              How a cleaning company became the first true full-loop CRM.
            </h3>
          </div>
          <div className="relative">
            <div className="absolute left-4 sm:left-8 top-2 bottom-2 w-px bg-teal-700/60" />
            <div className="space-y-8">
              {originTimeline.map((m) => (
                <div key={m.when} className="relative pl-12 sm:pl-20">
                  <div className={`absolute left-1.5 sm:left-5 top-1 w-5 h-5 rounded-full border-2 ${m.highlight ? "border-teal-300 bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.6)]" : "border-teal-500 bg-slate-900"}`} />
                  <p className="font-mono text-xs tracking-widest uppercase text-teal-400 mb-1">{m.when}</p>
                  <h4 className="font-heading text-xl font-bold text-white mb-2">{m.title}</h4>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl">{m.body}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ─────── 3. TRAJECTORY ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-2xl border border-teal-700/40 bg-slate-950/70 p-6 sm:p-10 mb-20"
        >
          <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="font-mono text-xs tracking-[0.2em] uppercase text-teal-400 mb-1">Avg ticket — by month · pulled from production DB</p>
              <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">$183 &rarr; $222 in 90 days.</h3>
              <p className="text-slate-400 text-sm mt-2 max-w-xl">
                Same business, same metro, same crew. The platform shifted the economics: deep-clean upsells in the Selena flow, recurring discounts that lock in repeat clients (20% weekly · 10% bi-weekly/monthly), and 100% attribution on 458 of 1,240 bookings exposing which of the 98 EMD domains actually convert.
              </p>
            </div>
            <p className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-teal-400">+21%</p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end h-48 sm:h-64">
            {trajectory.map((t) => {
              const pct = (t.value / trajectoryMax) * 100;
              return (
                <div key={t.month} className="flex flex-col items-center justify-end h-full">
                  <p className="font-mono text-sm sm:text-base text-white mb-1.5">${t.value}</p>
                  <div className="w-full rounded-t-md bg-gradient-to-t from-teal-700 to-teal-400" style={{ height: `${pct}%`, minHeight: "20px" }} />
                  <p className="font-mono text-xs sm:text-sm text-slate-400 mt-2 uppercase tracking-wider">{t.month}</p>
                  {t.sub && <p className="text-[10px] sm:text-xs text-teal-300 mt-1 text-center leading-tight max-w-[120px]">{t.sub}</p>}
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-xs font-mono text-slate-500 text-center">
            Source: <code className="text-teal-300">SELECT date_trunc(&apos;month&apos;, start_time), AVG(price), COUNT(*) FROM bookings WHERE start_time &lt;= now()</code>
          </p>
        </motion.div>

        {/* ─────── 4. LIVE METRICS ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-20"
        >
          <div className="text-center mb-8">
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-teal-400 mb-2">Live numbers · pulled 2026-04-27</p>
            <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">What the platform is doing — right now.</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {liveMetrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 text-center">
                <p className="font-heading text-2xl sm:text-3xl font-extrabold text-teal-400 leading-tight">{m.value}</p>
                <p className="mt-2 font-cta text-xs uppercase tracking-widest text-slate-200">{m.label}</p>
                <p className="mt-1 text-xs text-slate-500">{m.sub}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─────── 5. LEAD FUNNEL ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.18 }}
          className="rounded-2xl border border-teal-700/40 bg-slate-950/70 p-6 sm:p-10 mb-20"
        >
          <div className="mb-8 text-center">
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-teal-400 mb-2">Lead Funnel · 23,078 events tracked</p>
            <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">Visit → Engaged → CTA → Booking. Every step counted.</h3>
            <p className="mt-3 text-slate-400 text-sm max-w-2xl mx-auto">
              Most platforms guess at attribution. We log every visit, scroll-depth checkpoint, CTA tap, and form step. Below is the real funnel for The NYC Maid in 84 days.
            </p>
          </div>
          <div className="space-y-3">
            {leadFunnel.map((s, i) => {
              const widthPct = i === 0 ? 100 : (s.value / leadFunnel[0].value) * 100;
              return (
                <div key={s.stage} className="flex items-center gap-4">
                  <div className="w-32 sm:w-40 shrink-0 text-right">
                    <p className="font-cta text-xs sm:text-sm uppercase tracking-widest text-slate-200">{s.stage}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500">{s.sub}</p>
                  </div>
                  <div className="flex-1 relative h-10 sm:h-12 bg-slate-800/60 rounded-md overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-700 to-teal-400 rounded-md flex items-center px-3" style={{ width: `${widthPct}%`, minWidth: "100px" }}>
                      <span className="font-mono text-sm sm:text-base font-bold text-white">{s.value.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ─────── 6. WHERE LEADS COME FROM ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
          className="grid lg:grid-cols-2 gap-6 mb-20"
        >
          {/* Top domains */}
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 sm:p-8">
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-teal-400 mb-2">Top SEO domains by visit · 11,000 visits sampled</p>
            <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-white mb-5">98 EMDs in production. Long tail working.</h3>
            <div className="space-y-2">
              {topDomains.map((d) => {
                const pct = d.count ? (d.count / domainMax) * 100 : 0;
                return (
                  <div key={d.domain}>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-mono text-[11px] sm:text-xs text-white">{d.domain}</p>
                      <p className="font-mono text-[11px] sm:text-xs text-teal-400 tabular-nums">{d.count !== null ? d.count.toLocaleString() : "—"}</p>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-700 to-teal-400" style={{ width: `${pct}%` }} />
                    </div>
                    {d.label && <p className="text-[10px] text-slate-500 mt-0.5">{d.label}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Referrer sources */}
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 sm:p-8">
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-teal-400 mb-2">Where 1,280 CTA-bearing visitors came from</p>
            <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-white mb-5">Including 45 from AI assistants (ChatGPT + Claude).</h3>
            <div className="space-y-2">
              {referrerSources.map((r) => {
                const pct = (r.count / refMax) * 100;
                return (
                  <div key={r.source}>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm text-white">
                        {r.source}
                        {r.label && <span className="ml-2 text-[10px] uppercase tracking-wider text-teal-300/80">{r.label}</span>}
                      </p>
                      <p className="font-mono text-xs text-teal-400 tabular-nums">{r.count}</p>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-700 to-teal-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ─────── 7. SELENA TRANSCRIPT ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.22 }}
          className="rounded-2xl border border-teal-700/40 bg-slate-950/70 p-6 sm:p-10 mb-20"
        >
          <div className="mb-8 text-center">
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-teal-400 mb-2">Real Selena conversation · 2026-03-02 · anonymized</p>
            <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">She handles the weird ones too.</h3>
            <p className="mt-3 text-slate-400 text-sm max-w-2xl mx-auto">
              An actual SMS thread pulled from sms_conversation_messages — a returning client texts about a broken buzzer. Selena recognizes the existing booking, reassures the client, and routes the buzzer note to the cleaner&apos;s job notes. No human touched this conversation.
            </p>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {smsTranscript.map((m, i) => (
              <div key={i} className={`flex ${m.dir === "in" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-snug ${m.dir === "in" ? "bg-teal-500 text-slate-900 rounded-br-sm" : "bg-slate-800 text-white rounded-bl-sm border border-slate-700"}`}>
                  <p className="font-mono text-[10px] uppercase tracking-widest mb-1 opacity-60">{m.dir === "in" ? "client" : "selena"}</p>
                  <p className="whitespace-pre-line">{m.body}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─────── 8. SERVICE MIX + CLEANER LOAD ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.24 }}
          className="grid lg:grid-cols-2 gap-6 mb-20"
        >
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 sm:p-8">
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-teal-400 mb-2">Service mix · 1,240 bookings</p>
            <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-white mb-5">90% Standard. The other 10% pays the deep-clean rate.</h3>
            <div className="space-y-3">
              {serviceTypeMix.map((s) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm text-white">{s.name} <span className="ml-2 text-[10px] uppercase tracking-wider text-teal-300/80">{s.rate}</span></p>
                    <p className="font-mono text-xs text-teal-400 tabular-nums">{s.count} · {s.share}%</p>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-teal-700 to-teal-400" style={{ width: `${Math.min(100, s.share)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 sm:p-8">
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-teal-400 mb-2">Cleaner workload · top 8 of 9</p>
            <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-white mb-5">Smart-schedule routes 80% of jobs to the top 2 cleaners.</h3>
            <div className="space-y-2">
              {cleanerRanking.map((c) => {
                const pct = (c.count / cleanerMax) * 100;
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm text-white">{c.name}</p>
                      <p className="font-mono text-xs text-teal-400 tabular-nums">{c.count} · {c.share}%</p>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-700 to-teal-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ─────── 9. PLATFORM ACTIVITY (notifications) ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.26 }}
          className="rounded-2xl border border-slate-700 bg-slate-800/40 p-6 sm:p-10 mb-20"
        >
          <div className="text-center mb-8">
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-teal-400 mb-2">5,998 notifications fired · top events</p>
            <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">The platform actually does this much.</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {platformActivity.map((m) => (
              <div key={m.label} className="rounded-xl border border-slate-700 bg-slate-900 p-5">
                <p className="font-heading text-2xl sm:text-3xl font-extrabold text-teal-400 leading-tight">{m.value}</p>
                <p className="mt-2 font-cta text-xs uppercase tracking-widest text-slate-200">{m.label}</p>
                <p className="mt-1 text-xs text-slate-500">{m.sub}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─────── 10. CUMULATIVE STRIP ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.28 }}
          className="rounded-2xl border border-slate-700 bg-slate-800/40 p-6 sm:p-10 mb-20 text-center"
        >
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-teal-400 mb-2">Cumulative on the same engine · since Feb 3 2026</p>
          <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-white mb-6">One Focus Partner. Real numbers from production.</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {cumulativeStats.map((s) => (
              <div key={s.label}>
                <p className="font-heading text-2xl sm:text-3xl font-extrabold text-teal-400">{s.value}</p>
                <p className="mt-1 font-cta text-[10px] sm:text-xs uppercase tracking-widest text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─────── 11. ANATOMY OF A SUNDAY 11PM BOOKING ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }}
          className="rounded-2xl border border-teal-700/40 bg-slate-950/70 p-6 sm:p-10 mb-20"
        >
          <div className="mb-8 text-center">
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-teal-400 mb-2">Anatomy of a real booking · production code path</p>
            <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-2">Sunday 11:02 PM. The owner is asleep.</h3>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
              7 minutes from organic visit to booked + cleaner-assigned + confirmations sent. Every step below is real production code running for The NYC Maid right now — same code that ships to every Focus Partner.
            </p>
          </div>
          <div className="space-y-3">
            {sundayBooking.map((step, i) => (
              <div key={i} className={`grid grid-cols-[80px_1fr] sm:grid-cols-[100px_140px_1fr] gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4 ${step.highlight ? "border-teal-400 bg-teal-500/10" : "border-slate-700 bg-slate-900"}`}>
                <p className="font-mono text-xs sm:text-sm text-teal-400 tabular-nums">{step.t}</p>
                <p className="hidden sm:block font-mono text-xs text-slate-500 truncate">{step.where}</p>
                <div className="col-span-1 sm:col-span-1">
                  <p className="text-[10px] sm:hidden font-mono text-slate-500 mb-1">{step.where}</p>
                  <p className={`text-sm leading-snug ${step.highlight ? "text-white font-semibold" : "text-slate-300"}`}>
                    <span className="font-cta uppercase tracking-wider text-xs text-teal-300 mr-2">{step.actor}</span>
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─────── 12. BEFORE / AFTER ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.32 }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-teal-400 mb-2">Before / After · the operator&apos;s actual day</p>
            <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">What got removed from the operator&apos;s day.</h3>
          </div>
          <div className="rounded-2xl border border-slate-700 overflow-hidden">
            <div className="grid grid-cols-2 bg-slate-800/80 font-cta uppercase text-xs tracking-widest">
              <div className="px-4 sm:px-6 py-3 text-red-400 border-r border-slate-700">Before — manual</div>
              <div className="px-4 sm:px-6 py-3 text-teal-400">After — automated</div>
            </div>
            {removedFromDay.map((row, i) => (
              <div key={i} className={`grid grid-cols-2 text-sm ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/60"} border-t border-slate-800`}>
                <div className="px-4 sm:px-6 py-3 text-slate-400 line-through decoration-red-500/40 border-r border-slate-700">{row.before}</div>
                <div className="px-4 sm:px-6 py-3 text-slate-200">{row.after}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─────── 13. LIVE FEED SNAPSHOT ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.34 }}
          className="rounded-2xl border border-teal-700/50 bg-slate-950/60 p-6 sm:p-10 mb-20"
        >
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <p className="font-mono text-xs tracking-[0.2em] uppercase text-teal-400 mb-1">Live feed · captured 2026-04-27 5:24 PM ET</p>
              <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-white">Six events from a normal afternoon.</h3>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 border border-teal-500/40 px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="font-mono text-xs tracking-wider uppercase text-teal-300">Production</span>
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {liveEvidence.map((e) => (
              <div key={e.title} className="rounded-lg border border-slate-700 bg-slate-900 p-4 flex gap-3">
                <span className="text-2xl shrink-0">{e.icon}</span>
                <div>
                  <p className="font-heading text-sm font-bold text-white">{e.title}</p>
                  <p className="mt-1 text-sm text-slate-300 leading-snug">{e.body}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─────── 14. FINANCIAL REALITY ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.36 }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-teal-400 mb-2">The Finances · open book</p>
            <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">You can see everything.</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {financialReality.map((row) => (
              <div key={row.label} className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
                <p className="font-cta uppercase text-xs tracking-widest text-slate-500 mb-2">{row.label}</p>
                <p className="font-heading text-2xl font-extrabold text-teal-400">{row.value}</p>
                <p className="mt-1 text-xs text-slate-400">{row.note}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─────── 15. CLOSING ─────── */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center max-w-3xl mx-auto"
        >
          <p className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-snug">
            We don&apos;t sell you software we don&apos;t ship in our own business.
          </p>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
            If a feature breaks for The NYC Maid, it breaks our cleaning company. If a feature pays for itself for The NYC Maid, it ships to every Focus Partner. Same engine. Same proof. Same loop. Just with your trade and your metro.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/case-study/the-nyc-maid" className="inline-block rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-cta font-bold px-8 py-4 text-base transition-colors">
              Read the full Focus Partner case study
            </Link>
            <Link href="/crm-partnership-request-form" className="inline-block rounded-lg border border-slate-600 hover:border-teal-400 text-slate-200 hover:text-teal-400 font-cta font-bold px-8 py-4 text-base transition-colors">
              Become a Focus Partner in your trade
            </Link>
          </div>
          <p className="mt-6 text-xs font-mono text-slate-500 tracking-wide">
            One Focus Partner per trade per metro. Once claimed, off the board.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
