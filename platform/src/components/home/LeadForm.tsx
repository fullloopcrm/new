"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { C, display, mono, body } from "./editorial";
import { industries } from "@/lib/marketing/combos";

type Stage = "form" | "denied" | "review" | "submitted";

type FormState = {
  name: string;
  company: string;
  email: string;
  phone: string;
  trade: string;
  city: string;
  isOwner: string;
  operating: string;
  teamSize: string;
  revenue: string;
  priority: string;
  investment: string;
  goal: string;
};

const initial: FormState = {
  name: "", company: "", email: "", phone: "", trade: "", city: "",
  isOwner: "", operating: "", teamSize: "", revenue: "", priority: "", investment: "", goal: "",
};

const OWNER = ["Yes — I own or run it", "No — I'm not the decision-maker"];
const OPERATING = ["Operating now, taking jobs", "Launching within 90 days", "Just an idea — not operating yet"];
const TEAM = ["Just me", "2–5", "6–15", "16+"];
const REVENUE = ["Pre-revenue / startup", "Under $10k/mo", "$10k–$50k/mo", "$50k–$150k/mo", "$150k+/mo (7-figure)"];
const PRIORITY = ["Aggressive growth", "Steady, sustainable growth", "Cutting costs / cheapest option", "Just exploring"];
const INVEST = [
  "Yes — I can cover the $25k setup + monthly",
  "Yes, with the right terms",
  "No — I'm looking for something cheap",
];

// Real two-step application: qualifying questions -> instant pre-screen that
// approves (then they confirm & submit) or denies with specific reasons.
function qualify(f: FormState): string[] {
  const reasons: string[] = [];
  const owner = f.isOwner || "";
  const operating = f.operating || "";
  const trade = f.trade || "";
  const investment = f.investment || "";
  const priority = f.priority || "";
  if (owner.startsWith("No")) {
    reasons.push("Full Loop partners directly with the owner or decision-maker. Please have the owner apply.");
  }
  if (operating.startsWith("Just an idea")) {
    reasons.push("Full Loop is built for operating home service businesses, not pre-launch ideas. Reapply once you're taking jobs.");
  }
  if (trade === "Other (not a home service trade)") {
    reasons.push("Full Loop is exclusively for home & field service trades. Your business doesn't appear to fit that category.");
  }
  if (investment.startsWith("No")) {
    reasons.push("Full Loop is a premium, growth platform — $25,000 setup plus monthly. It isn't the cheapest option, by design. If budget is the deciding factor, we're not the right fit.");
  }
  if (priority.startsWith("Cutting costs") || priority.startsWith("Just exploring")) {
    reasons.push("We partner with operators focused on growth — not the lowest price or tire-kicking. Reapply when scaling is the goal.");
  }
  return reasons;
}

export default function LeadForm() {
  const [form, setForm] = useState<FormState>(initial);
  const [stage, setStage] = useState<Stage>("form");
  const [reasons, setReasons] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<FormState[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  function handleReview(e: FormEvent) {
    e.preventDefault();
    setAttempts((a) => [...a, form]); // snapshot every pre-screen attempt
    const r = qualify(form);
    if (r.length) { setReasons(r); setStage("denied"); }
    else setStage("review");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    const snap = (f: FormState) =>
      `trade=${f.trade}; city=${f.city}; owner=${f.isOwner}; status=${f.operating}; team=${f.teamSize}; revenue=${f.revenue}; priority=${f.priority}; investment=${f.investment}`;
    // Earlier pre-screen attempts that differ from the final answers (flags gaming).
    const earlier = attempts.filter((a) => snap(a) !== snap(form));
    const message = [
      `Trade: ${form.trade}`, `City: ${form.city}`,
      `Owner: ${form.isOwner}`, `Status: ${form.operating}`,
      `Team: ${form.teamSize}`, `Revenue: ${form.revenue}`,
      `Priority: ${form.priority}`, `Investment: ${form.investment}`,
      form.goal && `Goal: ${form.goal}`,
      earlier.length
        ? `⚠️ CHANGED ANSWERS AFTER PRE-SCREEN — earlier attempt(s): ${earlier.map((a, i) => `[try ${i + 1}] ${snap(a)}`).join(" || ")}`
        : "",
    ].filter(Boolean).join(" — ");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, company: form.company, phone: form.phone, email: form.email, message }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setStage("submitted");
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  // ---- styles ----
  const input = "w-full px-4 py-3 text-sm focus:outline-none";
  const iStyle: React.CSSProperties = { fontFamily: body, color: C.ink, background: C.canvas, border: `1px solid ${C.line}`, borderRadius: "2px" };
  const lStyle: React.CSSProperties = { fontFamily: mono, fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted, marginBottom: "6px", display: "block" };
  const loud: React.CSSProperties = { fontFamily: mono, fontSize: "16px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.cream, background: C.good, padding: "18px 28px", borderRadius: "2px", fontWeight: 700, boxShadow: "0 2px 0 rgba(0,0,0,0.18)", width: "100%" };

  // ---- submitted ----
  if (stage === "submitted") {
    return (
      <div className="p-10 text-center" style={{ border: `1px solid ${C.good}`, background: "rgba(31,77,44,0.05)", borderRadius: "2px" }}>
        <div style={{ ...lStyle, color: C.good, marginBottom: "12px" }}>Application submitted</div>
        <h3 style={{ fontFamily: display, fontWeight: 500, fontSize: "28px", color: C.ink, letterSpacing: "-0.02em", marginBottom: "10px" }}>
          You&apos;re pre-qualified — application is in.
        </h3>
        <p style={{ fontFamily: body, fontSize: "15px", color: C.graphite, lineHeight: 1.6 }}>
          We confirm one operator per trade per city by hand. If {form.trade || "your trade"} in{" "}
          {form.city || "your market"} is still open, we&apos;ll reach out within one business day.
        </p>
      </div>
    );
  }

  // ---- denied ----
  if (stage === "denied") {
    return (
      <div className="p-8" style={{ border: `1px solid ${C.warn}`, background: "rgba(139,69,19,0.05)", borderRadius: "2px" }}>
        <div style={{ ...lStyle, color: C.warn, marginBottom: "12px" }}>Not a fit yet</div>
        <h3 style={{ fontFamily: display, fontWeight: 500, fontSize: "24px", color: C.ink, letterSpacing: "-0.02em", marginBottom: "14px" }}>
          We can&apos;t move your application forward right now.
        </h3>
        <ul className="space-y-3 mb-7">
          {reasons.map((r) => (
            <li key={r} style={{ fontFamily: body, fontSize: "14px", color: C.graphite, lineHeight: 1.55, paddingLeft: "18px", position: "relative" }}>
              <span style={{ position: "absolute", left: 0, color: C.warn }}>—</span>{r}
            </li>
          ))}
        </ul>
        <button onClick={() => setStage("form")} style={{ fontFamily: mono, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink, background: "transparent", border: `1px solid ${C.ink}`, padding: "14px 24px", borderRadius: "2px", fontWeight: 500 }}>
          ← Edit my answers
        </button>
      </div>
    );
  }

  // ---- review (approved, confirm to submit) ----
  if (stage === "review") {
    const rows: [string, string][] = [
      ["Trade", form.trade], ["City", form.city], ["Owner", form.isOwner],
      ["Status", form.operating], ["Team", form.teamSize], ["Revenue", form.revenue],
      ["Priority", form.priority], ["Investment", form.investment],
    ];
    return (
      <div className="p-8" style={{ border: `1px solid ${C.good}`, background: "rgba(31,77,44,0.04)", borderRadius: "2px" }}>
        <div style={{ ...lStyle, color: C.good, marginBottom: "12px" }}>Pre-qualified ✓</div>
        <h3 style={{ fontFamily: display, fontWeight: 500, fontSize: "24px", color: C.ink, letterSpacing: "-0.02em", marginBottom: "16px" }}>
          You qualify. Review and submit your application.
        </h3>
        <div className="mb-7" style={{ border: `1px solid ${C.line}` }}>
          {rows.map(([k, v], i) => (
            <div key={k} className="flex justify-between px-4 py-2.5" style={{ borderTop: i ? `1px solid ${C.lineSoft}` : "none" }}>
              <span style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted }}>{k}</span>
              <span style={{ fontFamily: body, fontSize: "13px", color: C.ink, textAlign: "right" }}>{v || "—"}</span>
            </div>
          ))}
        </div>
        {error && <p style={{ fontFamily: mono, fontSize: "12px", color: C.warn, marginBottom: "10px" }}>{error}</p>}
        <button onClick={handleSubmit} disabled={submitting} className="transition-transform hover:-translate-y-0.5 disabled:opacity-50" style={loud}>
          {submitting ? "Submitting…" : "Submit My Application →"}
        </button>
        <button onClick={() => setStage("form")} className="mt-3 w-full" style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, background: "transparent" }}>
          ← Edit answers
        </button>
      </div>
    );
  }

  // ---- form ----
  return (
    <form onSubmit={handleReview} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div><label htmlFor="lf-name" style={lStyle}>Your name</label><input id="lf-name" name="name" required maxLength={120} value={form.name} onChange={handleChange} className={input} style={iStyle} placeholder="Jane Smith" /></div>
        <div><label htmlFor="lf-company" style={lStyle}>Business name</label><input id="lf-company" name="company" required maxLength={160} value={form.company} onChange={handleChange} className={input} style={iStyle} placeholder="Smith Home Services" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div><label htmlFor="lf-email" style={lStyle}>Email</label><input id="lf-email" name="email" type="email" required maxLength={200} value={form.email} onChange={handleChange} className={input} style={iStyle} placeholder="jane@example.com" /></div>
        <div><label htmlFor="lf-phone" style={lStyle}>Phone</label><input id="lf-phone" name="phone" type="tel" required maxLength={40} value={form.phone} onChange={handleChange} className={input} style={iStyle} placeholder="(555) 123-4567" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="lf-trade" style={lStyle}>Your trade</label>
          <select id="lf-trade" name="trade" required value={form.trade} onChange={handleChange} className={input} style={iStyle}>
            <option value="" disabled>Select…</option>
            {industries.map((i) => <option key={i.slug} value={i.name}>{i.name}</option>)}
            <option value="Other (not a home service trade)">Other (not a home service trade)</option>
          </select>
        </div>
        <div><label htmlFor="lf-city" style={lStyle}>City / market</label><input id="lf-city" name="city" required maxLength={80} value={form.city} onChange={handleChange} className={input} style={iStyle} placeholder="Where you operate" /></div>
      </div>
      <div>
        <label htmlFor="lf-owner" style={lStyle}>Are you the owner / decision-maker?</label>
        <select id="lf-owner" name="isOwner" required value={form.isOwner} onChange={handleChange} className={input} style={iStyle}>
          <option value="" disabled>Select…</option>
          {OWNER.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="lf-op" style={lStyle}>Business status</label>
        <select id="lf-op" name="operating" required value={form.operating} onChange={handleChange} className={input} style={iStyle}>
          <option value="" disabled>Select…</option>
          {OPERATING.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="lf-team" style={lStyle}>Team size</label>
          <select id="lf-team" name="teamSize" required value={form.teamSize} onChange={handleChange} className={input} style={iStyle}>
            <option value="" disabled>Select…</option>
            {TEAM.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="lf-rev" style={lStyle}>Monthly revenue</label>
          <select id="lf-rev" name="revenue" required value={form.revenue} onChange={handleChange} className={input} style={iStyle}>
            <option value="" disabled>Select…</option>
            {REVENUE.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="lf-priority" style={lStyle}>Your #1 priority right now</label>
        <select id="lf-priority" name="priority" required value={form.priority} onChange={handleChange} className={input} style={iStyle}>
          <option value="" disabled>Select…</option>
          {PRIORITY.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Pricing disclosure — so applicants self-select */}
      <div style={{ border: `1px solid ${C.line}`, background: C.cream, borderRadius: "2px", padding: "16px 18px" }}>
        <div style={{ ...lStyle, color: C.good, marginBottom: "6px" }}>What it costs</div>
        <p style={{ fontFamily: body, fontSize: "13px", color: C.graphite, lineHeight: 1.55 }}>
          Full Loop is built for operators investing in growth:{" "}
          <strong style={{ color: C.ink }}>$25,000 one-time setup</strong>, then{" "}
          <strong style={{ color: C.ink }}>$1,000/mo per admin + $100/mo per team member</strong>.
          It is not the cheapest option &mdash; by design.
        </p>
      </div>

      <div>
        <label htmlFor="lf-invest" style={lStyle}>Can you cover the $25k setup + monthly?</label>
        <select id="lf-invest" name="investment" required value={form.investment} onChange={handleChange} className={input} style={iStyle}>
          <option value="" disabled>Select…</option>
          {INVEST.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="lf-goal" style={lStyle}>What do you want Full Loop to do for you? <span style={{ textTransform: "none", color: C.muted2 }}>(optional)</span></label>
        <textarea id="lf-goal" name="goal" rows={3} maxLength={1000} value={form.goal} onChange={handleChange} className={input + " resize-y"} style={iStyle} placeholder="One line is fine." />
      </div>
      <button type="submit" className="transition-transform hover:-translate-y-0.5" style={loud}>
        Review My Application →
      </button>
      <p style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.08em", color: C.muted, textAlign: "center" }}>
        We pre-screen instantly, then qualify one operator per trade per city by hand.
      </p>
    </form>
  );
}
