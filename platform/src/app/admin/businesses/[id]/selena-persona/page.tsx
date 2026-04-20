'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Objection = { trigger: string; response: string }
type Addon = { label: string; price: string }
type CustomField = { category: string; label: string; value: string }

interface Persona {
  // identity
  business_description: string
  business_story: string
  opening_lines: string[]
  sign_off: string[]
  banned_phrases: string[]
  // sales
  value_props: string[]
  usps: string[]
  social_proof: string
  guarantees: string[]
  sales_approach: string
  objection_handlers: Objection[]
  // policies
  refund_policy: string
  first_time_restrictions: string
  liability_statement: string
  // operations
  never_do: string[]
  always_ask: string[]
  team_intro: string
  // lead qual
  qualifying_questions: string[]
  disqualifiers: string[]
  // upsell
  addons: Addon[]
  upsell_triggers: string[]
  recurring_incentive: string
  referral_program_pitch: string
  // custom
  custom_fields: CustomField[]
}

const EMPTY: Persona = {
  business_description: '',
  business_story: '',
  opening_lines: [],
  sign_off: [],
  banned_phrases: [],
  value_props: [],
  usps: [],
  social_proof: '',
  guarantees: [],
  sales_approach: '',
  objection_handlers: [],
  refund_policy: '',
  first_time_restrictions: '',
  liability_statement: '',
  never_do: [],
  always_ask: [],
  team_intro: '',
  qualifying_questions: [],
  disqualifiers: [],
  addons: [],
  upsell_triggers: [],
  recurring_incentive: '',
  referral_program_pitch: '',
  custom_fields: [],
}

const CATEGORIES = ['identity', 'sales', 'policies', 'operations', 'lead_qualification', 'upsell'] as const

export default function SelenaPersonaPage() {
  const params = useParams()
  const id = params.id as string
  const [p, setP] = useState<Persona>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/businesses/${id}`)
    if (res.ok) {
      const data = await res.json()
      const sc = (data.business?.selena_config || {}) as Partial<Persona>
      setP({ ...EMPTY, ...sc, custom_fields: sc.custom_fields || [] })
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true); setSaved(false)
    const res = await fetch(`/api/admin/businesses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selena_config: p }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  // Array helpers
  const addArr = <K extends keyof Persona>(k: K, v: Persona[K] extends Array<infer U> ? U : never) => {
    setP(prev => ({ ...prev, [k]: [...(prev[k] as unknown as unknown[]), v] as Persona[K] }))
  }
  const removeArr = <K extends keyof Persona>(k: K, i: number) => {
    setP(prev => ({ ...prev, [k]: (prev[k] as unknown as unknown[]).filter((_, idx) => idx !== i) as Persona[K] }))
  }
  const updateArr = <K extends keyof Persona>(k: K, i: number, v: Persona[K] extends Array<infer U> ? U : never) => {
    setP(prev => ({ ...prev, [k]: (prev[k] as unknown as unknown[]).map((x, idx) => (idx === i ? v : x)) as Persona[K] }))
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>

  return (
    <div className="max-w-4xl">
      <Link href={`/admin/businesses/${id}`} className="text-sm text-teal-600 hover:text-teal-700 mb-4 inline-block">&larr; Back to business</Link>
      <h1 className="text-slate-900 font-heading text-2xl font-bold mb-2">Selena Persona</h1>
      <p className="text-sm text-slate-500 mb-8">Everything Selena needs to sound like this business. All fields feed directly into her system prompt.</p>

      {/* ── Identity & Voice ── */}
      <Section title="Identity & Voice">
        <LargeField label="Business description (1-2 sentences)" value={p.business_description} onChange={v => setP({ ...p, business_description: v })} rows={3} placeholder="Who you are, what you do, for whom." />
        <LargeField label="Business story (origin, why you started)" value={p.business_story} onChange={v => setP({ ...p, business_story: v })} rows={6} placeholder="Builds trust with skeptical buyers. 1 paragraph max." />
        <ListField label="Opening lines (rotate)" values={p.opening_lines} onAdd={() => addArr('opening_lines', '')} onRemove={i => removeArr('opening_lines', i)} onChange={(i, v) => updateArr('opening_lines', i, v)} placeholder='e.g. "Hi! How can we help?"' />
        <ListField label="Sign-offs (rotate)" values={p.sign_off} onAdd={() => addArr('sign_off', '')} onRemove={i => removeArr('sign_off', i)} onChange={(i, v) => updateArr('sign_off', i, v)} placeholder='e.g. "Talk soon!"' />
        <ListField label="Banned phrases (never use)" values={p.banned_phrases} onAdd={() => addArr('banned_phrases', '')} onRemove={i => removeArr('banned_phrases', i)} onChange={(i, v) => updateArr('banned_phrases', i, v)} placeholder='e.g. "absolutely", "great question"' />
        <CustomFields p={p} setP={setP} category="identity" />
      </Section>

      {/* ── Sales & Persuasion ── */}
      <Section title="Sales & Persuasion">
        <ListField label="Value props (licensed, insured, 5yr experience...)" values={p.value_props} onAdd={() => addArr('value_props', '')} onRemove={i => removeArr('value_props', i)} onChange={(i, v) => updateArr('value_props', i, v)} placeholder="e.g. Licensed & insured" />
        <ListField label="USPs (why us vs competitors)" values={p.usps} onAdd={() => addArr('usps', '')} onRemove={i => removeArr('usps', i)} onChange={(i, v) => updateArr('usps', i, v)} placeholder="e.g. 100% satisfaction guarantee" />
        <TextField label="Social proof (review count, rating, notable clients)" value={p.social_proof} onChange={v => setP({ ...p, social_proof: v })} placeholder="e.g. 500+ 5-star reviews, featured in NY Post" />
        <ListField label="Guarantees" values={p.guarantees} onAdd={() => addArr('guarantees', '')} onRemove={i => removeArr('guarantees', i)} onChange={(i, v) => updateArr('guarantees', i, v)} placeholder="e.g. Free re-do within 24 hours" />
        <SelectField label="Sales approach" value={p.sales_approach} onChange={v => setP({ ...p, sales_approach: v })} options={['', 'consultative', 'direct', 'educational', 'relationship-first']} />
        <ObjectionsField objections={p.objection_handlers} onAdd={() => setP({ ...p, objection_handlers: [...p.objection_handlers, { trigger: '', response: '' }] })} onRemove={i => setP({ ...p, objection_handlers: p.objection_handlers.filter((_, idx) => idx !== i) })} onChange={(i, o) => setP({ ...p, objection_handlers: p.objection_handlers.map((x, idx) => (idx === i ? o : x)) })} />
        <CustomFields p={p} setP={setP} category="sales" />
      </Section>

      {/* ── Policies ── */}
      <Section title="Policies">
        <LargeField label="Refund policy" value={p.refund_policy} onChange={v => setP({ ...p, refund_policy: v })} rows={3} />
        <LargeField label="First-time client restrictions" value={p.first_time_restrictions} onChange={v => setP({ ...p, first_time_restrictions: v })} rows={3} placeholder="e.g. First-time bookings cannot cancel or reschedule." />
        <LargeField label="Liability / insurance statement" value={p.liability_statement} onChange={v => setP({ ...p, liability_statement: v })} rows={3} placeholder="e.g. Insured up to $1M, bonded." />
        <CustomFields p={p} setP={setP} category="policies" />
      </Section>

      {/* ── Operations ── */}
      <Section title="Operational Rules">
        <ListField label="Never do" values={p.never_do} onAdd={() => addArr('never_do', '')} onRemove={i => removeArr('never_do', i)} onChange={(i, v) => updateArr('never_do', i, v)} placeholder="e.g. Never offer refund without manager approval" />
        <ListField label="Always ask before booking" values={p.always_ask} onAdd={() => addArr('always_ask', '')} onRemove={i => removeArr('always_ask', i)} onChange={(i, v) => updateArr('always_ask', i, v)} placeholder="e.g. How many bedrooms / bathrooms?" />
        <TextField label="Team intro" value={p.team_intro} onChange={v => setP({ ...p, team_intro: v })} placeholder="e.g. Our team is bilingual (EN/ES), background-checked, 3+ years avg experience." />
        <CustomFields p={p} setP={setP} category="operations" />
      </Section>

      {/* ── Lead Qualification ── */}
      <Section title="Lead Qualification">
        <ListField label="Qualifying questions" values={p.qualifying_questions} onAdd={() => addArr('qualifying_questions', '')} onRemove={i => removeArr('qualifying_questions', i)} onChange={(i, v) => updateArr('qualifying_questions', i, v)} />
        <ListField label="Disqualifiers (decline politely)" values={p.disqualifiers} onAdd={() => addArr('disqualifiers', '')} onRemove={i => removeArr('disqualifiers', i)} onChange={(i, v) => updateArr('disqualifiers', i, v)} placeholder="e.g. Outside service area" />
        <CustomFields p={p} setP={setP} category="lead_qualification" />
      </Section>

      {/* ── Upsell ── */}
      <Section title="Upsell & Cross-sell">
        <AddonsField addons={p.addons} onAdd={() => setP({ ...p, addons: [...p.addons, { label: '', price: '' }] })} onRemove={i => setP({ ...p, addons: p.addons.filter((_, idx) => idx !== i) })} onChange={(i, a) => setP({ ...p, addons: p.addons.map((x, idx) => (idx === i ? a : x)) })} />
        <ListField label="Upsell triggers (when to suggest deeper service)" values={p.upsell_triggers} onAdd={() => addArr('upsell_triggers', '')} onRemove={i => removeArr('upsell_triggers', i)} onChange={(i, v) => updateArr('upsell_triggers', i, v)} />
        <TextField label="Recurring client incentive" value={p.recurring_incentive} onChange={v => setP({ ...p, recurring_incentive: v })} placeholder="e.g. 10% off for weekly/biweekly clients" />
        <LargeField label="Referral program pitch (how Selena mentions it)" value={p.referral_program_pitch} onChange={v => setP({ ...p, referral_program_pitch: v })} rows={3} />
        <CustomFields p={p} setP={setP} category="upsell" />
      </Section>

      <div className="sticky bottom-0 bg-white border-t border-slate-200 py-4 -mx-4 px-4 mt-8 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-2.5 rounded-lg text-sm font-cta font-bold disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Persona'}
        </button>
        <span className="text-xs text-slate-500">All fields feed Selena&apos;s system prompt on her next message.</span>
      </div>
    </div>
  )
}

// ─── Sub-components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10 border-b border-slate-100 pb-8">
      <h2 className="font-heading font-bold text-lg text-slate-900 mb-5 pb-2 border-b border-slate-100">{title}</h2>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[11px] text-slate-500 uppercase tracking-wide mb-1.5 block font-semibold">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
    </div>
  )
}

function LargeField({ label, value, onChange, rows = 4, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <div>
      <label className="text-[11px] text-slate-500 uppercase tracking-wide mb-1.5 block font-semibold">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-[11px] text-slate-500 uppercase tracking-wide mb-1.5 block font-semibold">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
        {options.map(o => <option key={o} value={o}>{o || '— not set —'}</option>)}
      </select>
    </div>
  )
}

function ListField({ label, values, onAdd, onRemove, onChange, placeholder }: { label: string; values: string[]; onAdd: () => void; onRemove: (i: number) => void; onChange: (i: number, v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[11px] text-slate-500 uppercase tracking-wide mb-1.5 block font-semibold">{label}</label>
      <div className="space-y-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input value={v} onChange={e => onChange(i, e.target.value)} placeholder={placeholder} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <button type="button" onClick={() => onRemove(i)} className="px-3 text-slate-400 hover:text-red-500" aria-label="Remove">×</button>
          </div>
        ))}
        <button type="button" onClick={onAdd} className="text-teal-600 hover:text-teal-700 text-xs font-semibold">+ Add</button>
      </div>
    </div>
  )
}

function ObjectionsField({ objections, onAdd, onRemove, onChange }: { objections: Objection[]; onAdd: () => void; onRemove: (i: number) => void; onChange: (i: number, o: Objection) => void }) {
  return (
    <div>
      <label className="text-[11px] text-slate-500 uppercase tracking-wide mb-1.5 block font-semibold">Objection handlers</label>
      <div className="space-y-3">
        {objections.map((o, i) => (
          <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
            <div className="flex gap-2">
              <input value={o.trigger} onChange={e => onChange(i, { ...o, trigger: e.target.value })} placeholder='Client says… (e.g. "too expensive")' className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <button type="button" onClick={() => onRemove(i)} className="px-3 text-slate-400 hover:text-red-500">×</button>
            </div>
            <textarea value={o.response} onChange={e => onChange(i, { ...o, response: e.target.value })} rows={2} placeholder="How Selena responds…" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        ))}
        <button type="button" onClick={onAdd} className="text-teal-600 hover:text-teal-700 text-xs font-semibold">+ Add objection</button>
      </div>
    </div>
  )
}

function AddonsField({ addons, onAdd, onRemove, onChange }: { addons: Addon[]; onAdd: () => void; onRemove: (i: number) => void; onChange: (i: number, a: Addon) => void }) {
  return (
    <div>
      <label className="text-[11px] text-slate-500 uppercase tracking-wide mb-1.5 block font-semibold">Add-on services</label>
      <div className="space-y-1.5">
        {addons.map((a, i) => (
          <div key={i} className="flex gap-2">
            <input value={a.label} onChange={e => onChange(i, { ...a, label: e.target.value })} placeholder="Label (e.g. Inside oven)" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input value={a.price} onChange={e => onChange(i, { ...a, price: e.target.value })} placeholder="Price (e.g. +$30)" className="w-36 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <button type="button" onClick={() => onRemove(i)} className="px-3 text-slate-400 hover:text-red-500">×</button>
          </div>
        ))}
        <button type="button" onClick={onAdd} className="text-teal-600 hover:text-teal-700 text-xs font-semibold">+ Add add-on</button>
      </div>
    </div>
  )
}

function CustomFields({ p, setP, category }: { p: Persona; setP: (p: Persona) => void; category: typeof CATEGORIES[number] }) {
  const fields = (p.custom_fields || []).map((f, i) => ({ ...f, _i: i })).filter(f => f.category === category)
  return (
    <div className="pt-3 border-t border-dashed border-slate-200">
      <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5 block">Custom fields</label>
      <div className="space-y-1.5">
        {fields.map(f => (
          <div key={f._i} className="flex gap-2">
            <input value={f.label} onChange={e => {
              const next = [...p.custom_fields]
              next[f._i] = { ...next[f._i], label: e.target.value }
              setP({ ...p, custom_fields: next })
            }} placeholder="Label" className="w-1/3 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input value={f.value} onChange={e => {
              const next = [...p.custom_fields]
              next[f._i] = { ...next[f._i], value: e.target.value }
              setP({ ...p, custom_fields: next })
            }} placeholder="Value" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <button type="button" onClick={() => setP({ ...p, custom_fields: p.custom_fields.filter((_, idx) => idx !== f._i) })} className="px-3 text-slate-400 hover:text-red-500">×</button>
          </div>
        ))}
        <button type="button" onClick={() => setP({ ...p, custom_fields: [...p.custom_fields, { category, label: '', value: '' }] })} className="text-teal-600 hover:text-teal-700 text-xs font-semibold">+ Add custom field</button>
      </div>
    </div>
  )
}
