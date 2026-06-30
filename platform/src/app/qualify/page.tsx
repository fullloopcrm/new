'use client'

import { useState } from 'react'
import { QUALIFY_OPTIONS } from '@/lib/lead-fit'

const O = QUALIFY_OPTIONS

export default function QualifyPage() {
  const [f, setF] = useState({
    // Identity (free text — can't be a dropdown)
    business_name: '', owner_name: '', owner_email: '', owner_phone: '',
    // Routing
    trade: '', primary_city: '', primary_state: '',
    // Scored intent signals (all dropdown / checkbox)
    annual_revenue: '', revenue_trajectory: '', growth_goal: '',
    automation_comfort: '', lead_gen_spend: '', pain_point: '',
    timeline: '', current_system: '',
    wants_automation: false, wants_growth: false, comparing_prices: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ slot_taken: boolean } | null>(null)
  const [err, setErr] = useState('')

  function up(k: string, v: string | boolean) { setF(prev => ({ ...prev, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setSubmitting(true)
    try {
      const res = await fetch('/api/prospects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f),
      })
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
          <p className="text-sm text-slate-600">Our team reviews every application and reaches out within 2 business days. Full Loop isn&apos;t a cheap CRM — it&apos;s automation that runs your business. If you&apos;re a fit, you&apos;ll get a setup link by email.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-heading text-3xl font-bold text-slate-900 mb-2">Apply to Run Your Business on Full Loop</h1>
        <p className="text-sm text-slate-500 mb-6">This isn&apos;t a CRM you shop on price — it&apos;s automation that changes how home-service businesses run. A few questions so we know you&apos;re a fit. Takes 60 seconds.</p>
        {err && <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}
        <form onSubmit={submit} className="space-y-6">
          <Section title="You & your business">
            <Row>
              <Field label="Business name *"><input required value={f.business_name} onChange={e => up('business_name', e.target.value)} className="input" /></Field>
              <Field label="Your name *"><input required value={f.owner_name} onChange={e => up('owner_name', e.target.value)} className="input" /></Field>
            </Row>
            <Row>
              <Field label="Email *"><input required type="email" value={f.owner_email} onChange={e => up('owner_email', e.target.value)} className="input" /></Field>
              <Field label="Phone"><input value={f.owner_phone} onChange={e => up('owner_phone', e.target.value)} className="input" /></Field>
            </Row>
            <Row>
              <Field label="Trade *"><Select v={f.trade} onChange={v => up('trade', v)} req>{O.trade.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</Select></Field>
              <Field label="City"><input value={f.primary_city} onChange={e => up('primary_city', e.target.value)} className="input" /></Field>
            </Row>
            <Field label="State"><input value={f.primary_state} onChange={e => up('primary_state', e.target.value)} className="input" maxLength={2} placeholder="NY" /></Field>
          </Section>

          <Section title="Where you're at">
            <Row>
              <Field label="Annual revenue"><Select v={f.annual_revenue} onChange={v => up('annual_revenue', v)}>{O.annual_revenue.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</Select></Field>
              <Field label="Revenue trend"><Select v={f.revenue_trajectory} onChange={v => up('revenue_trajectory', v)}>{O.revenue_trajectory.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</Select></Field>
            </Row>
            <Row>
              <Field label="What are you using now?"><Select v={f.current_system} onChange={v => up('current_system', v)}>{O.current_system.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</Select></Field>
              <Field label="Monthly lead-gen spend"><Select v={f.lead_gen_spend} onChange={v => up('lead_gen_spend', v)}>{O.lead_gen_spend.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</Select></Field>
            </Row>
            <Field label="Biggest pain right now"><Select v={f.pain_point} onChange={v => up('pain_point', v)}>{O.pain_point.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</Select></Field>
          </Section>

          <Section title="Where you're going">
            <Row>
              <Field label="Growth goal (12 mo)"><Select v={f.growth_goal} onChange={v => up('growth_goal', v)}>{O.growth_goal.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</Select></Field>
              <Field label="Comfort automating customer comms"><Select v={f.automation_comfort} onChange={v => up('automation_comfort', v)}>{O.automation_comfort.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</Select></Field>
            </Row>
            <Field label="When do you want to start?"><Select v={f.timeline} onChange={v => up('timeline', v)}>{O.timeline.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</Select></Field>
            <div className="space-y-2 pt-1">
              <Check checked={f.wants_automation} onChange={v => up('wants_automation', v)} label="I want to automate my customer communication" />
              <Check checked={f.wants_growth} onChange={v => up('wants_growth', v)} label="I want to grow / add crews" />
              <Check checked={f.comparing_prices} onChange={v => up('comparing_prices', v)} label="I'm comparing prices across several CRMs" />
            </div>
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

function Select({ v, onChange, children, req }: { v: string; onChange: (v: string) => void; children: React.ReactNode; req?: boolean }) {
  return (
    <select required={req} value={v} onChange={e => onChange(e.target.value)} className="input">
      <option value="">—</option>
      {children}
    </select>
  )
}
function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /> {label}</label>
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
