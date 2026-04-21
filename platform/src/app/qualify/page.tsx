'use client'

import { useState } from 'react'

const TRADES = ['cleaning','landscaping','hvac','plumbing','handyman','electrical','pest_control','roofing','painting','tree_service','moving','other']
const REVENUE = [
  { v: 'under_250k', l: 'Under $250k' },
  { v: '250k_1m', l: '$250k – $1M' },
  { v: '1m_3m', l: '$1M – $3M' },
  { v: '3m_plus', l: '$3M+' },
]
const TIERS = [
  { v: 'starter', l: 'Starter — $199/mo' },
  { v: 'growth', l: 'Growth — $499/mo' },
  { v: 'pro', l: 'Pro — $999/mo' },
  { v: 'enterprise', l: 'Enterprise — custom' },
]

export default function QualifyPage() {
  const [f, setF] = useState({
    business_name: '', legal_name: '', entity_type: '',
    owner_name: '', owner_email: '', owner_phone: '',
    trade: '', primary_city: '', primary_state: '', primary_zip: '',
    years_in_business: '', annual_revenue_bracket: '',
    revenue_trajectory: 'up',
    team_size_wtwo: '', team_size_contractor: '',
    current_tech_stack: '', growth_target_12mo: '',
    uses_ai_tools: false, ai_tools_list: '', ai_comfort_level: '7',
    has_crm: false, crm_name: '', day_to_day_operator: 'owner',
    launch_timeline: '30_90', territory_exclusive_ok: true,
    top_pain_point: '', heard_from: '', biggest_competitor: '',
    wants_call: true, tier_interest: 'growth',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ slot_taken: boolean } | null>(null)
  const [err, setErr] = useState('')

  function up(k: string, v: string | boolean) { setF(prev => ({ ...prev, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setSubmitting(true)
    try {
      const body = {
        ...f,
        years_in_business: f.years_in_business ? Number(f.years_in_business) : null,
        team_size_wtwo: f.team_size_wtwo ? Number(f.team_size_wtwo) : null,
        team_size_contractor: f.team_size_contractor ? Number(f.team_size_contractor) : null,
        ai_comfort_level: f.ai_comfort_level ? Number(f.ai_comfort_level) : null,
      }
      const res = await fetch('/api/prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submit failed')
      setDone({ slot_taken: !!data.slot_taken })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    }
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Thanks — we got your application</h1>
          {done.slot_taken ? (
            <p className="text-sm text-amber-700">Heads up: the territory slot for your trade in that ZIP appears taken. We&apos;ll reach out to discuss alternatives.</p>
          ) : (
            <p className="text-sm text-slate-600">Our team will review your application and reach out within 2 business days. If approved, you&apos;ll receive a checkout link by email to activate your account.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl font-bold text-slate-900 mb-2">Apply for Territory Access</h1>
        <p className="text-sm text-slate-500 mb-6">One business per trade, per city. Approvals happen within 2 business days.</p>
        {err && <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}
        <form onSubmit={submit} className="space-y-6">
          <Section title="Your Business">
            <Row>
              <Field label="Business name *"><input required value={f.business_name} onChange={e => up('business_name', e.target.value)} className="input" /></Field>
              <Field label="Legal name"><input value={f.legal_name} onChange={e => up('legal_name', e.target.value)} className="input" /></Field>
            </Row>
            <Row>
              <Field label="Entity type"><select value={f.entity_type} onChange={e => up('entity_type', e.target.value)} className="input"><option value="">—</option><option value="sole_prop">Sole prop</option><option value="llc">LLC</option><option value="s_corp">S-Corp</option><option value="c_corp">C-Corp</option><option value="partnership">Partnership</option></select></Field>
              <Field label="Years in business"><input type="number" value={f.years_in_business} onChange={e => up('years_in_business', e.target.value)} className="input" /></Field>
            </Row>
          </Section>

          <Section title="You (Owner)">
            <Row>
              <Field label="Your name *"><input required value={f.owner_name} onChange={e => up('owner_name', e.target.value)} className="input" /></Field>
              <Field label="Email *"><input required type="email" value={f.owner_email} onChange={e => up('owner_email', e.target.value)} className="input" /></Field>
            </Row>
            <Row>
              <Field label="Phone"><input value={f.owner_phone} onChange={e => up('owner_phone', e.target.value)} className="input" /></Field>
              <Field label="Day-to-day operator"><select value={f.day_to_day_operator} onChange={e => up('day_to_day_operator', e.target.value)} className="input"><option value="owner">Owner</option><option value="ops_manager">Ops manager</option><option value="other">Other / TBD</option></select></Field>
            </Row>
          </Section>

          <Section title="Trade & Territory">
            <Row>
              <Field label="Trade *"><select required value={f.trade} onChange={e => up('trade', e.target.value)} className="input"><option value="">—</option>{TRADES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select></Field>
              <Field label="Primary city"><input value={f.primary_city} onChange={e => up('primary_city', e.target.value)} className="input" /></Field>
            </Row>
            <Row>
              <Field label="State"><input value={f.primary_state} onChange={e => up('primary_state', e.target.value)} className="input" /></Field>
              <Field label="Primary ZIP"><input value={f.primary_zip} onChange={e => up('primary_zip', e.target.value)} className="input" /></Field>
            </Row>
          </Section>

          <Section title="Growth">
            <Row>
              <Field label="Annual revenue"><select value={f.annual_revenue_bracket} onChange={e => up('annual_revenue_bracket', e.target.value)} className="input"><option value="">—</option>{REVENUE.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}</select></Field>
              <Field label="Trajectory (3yr)"><select value={f.revenue_trajectory} onChange={e => up('revenue_trajectory', e.target.value)} className="input"><option value="up">Up</option><option value="flat">Flat</option><option value="down">Down</option></select></Field>
            </Row>
            <Row>
              <Field label="W-2 team size"><input type="number" value={f.team_size_wtwo} onChange={e => up('team_size_wtwo', e.target.value)} className="input" /></Field>
              <Field label="1099 team size"><input type="number" value={f.team_size_contractor} onChange={e => up('team_size_contractor', e.target.value)} className="input" /></Field>
            </Row>
            <Field label="Current tech stack (CRM, booking, invoicing)"><input value={f.current_tech_stack} onChange={e => up('current_tech_stack', e.target.value)} className="input" /></Field>
            <Field label="Growth target next 12 months"><input value={f.growth_target_12mo} onChange={e => up('growth_target_12mo', e.target.value)} placeholder="e.g., double revenue, add 2 crews" className="input" /></Field>
          </Section>

          <Section title="AI Fit">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.uses_ai_tools} onChange={e => up('uses_ai_tools', e.target.checked)} /> I currently use AI tools</label>
            {f.uses_ai_tools && <Field label="Which?"><input value={f.ai_tools_list} onChange={e => up('ai_tools_list', e.target.value)} className="input" /></Field>}
            <Field label="How comfortable letting AI handle 80% of customer comms? (1-10)"><input type="range" min={1} max={10} value={f.ai_comfort_level} onChange={e => up('ai_comfort_level', e.target.value)} className="w-full" /></Field>
          </Section>

          <Section title="Commitment">
            <Row>
              <Field label="Launch timeline"><select value={f.launch_timeline} onChange={e => up('launch_timeline', e.target.value)} className="input"><option value="lt_30">&lt; 30 days</option><option value="30_90">30-90 days</option><option value="90_plus">90+ days</option></select></Field>
              <Field label="Tier interest"><select value={f.tier_interest} onChange={e => up('tier_interest', e.target.value)} className="input">{TIERS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</select></Field>
            </Row>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.territory_exclusive_ok} onChange={e => up('territory_exclusive_ok', e.target.checked)} /> I understand my territory will be exclusive</label>
            <Field label="Top operational pain point"><textarea value={f.top_pain_point} onChange={e => up('top_pain_point', e.target.value)} rows={2} className="input" /></Field>
          </Section>

          <Section title="Context">
            <Row>
              <Field label="How'd you hear about us?"><input value={f.heard_from} onChange={e => up('heard_from', e.target.value)} className="input" /></Field>
              <Field label="Biggest competitor"><input value={f.biggest_competitor} onChange={e => up('biggest_competitor', e.target.value)} className="input" /></Field>
            </Row>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.wants_call} onChange={e => up('wants_call', e.target.checked)} /> I&apos;m open to a 30-min qualifying call</label>
          </Section>

          <div className="flex justify-end">
            <button disabled={submitting} type="submit" className="px-6 py-3 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`.input { width: 100%; background: #fff; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"><h2 className="font-heading font-semibold text-slate-900">{title}</h2>{children}</section>
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs text-slate-500 uppercase mb-1">{label}</span>{children}</label>
}
