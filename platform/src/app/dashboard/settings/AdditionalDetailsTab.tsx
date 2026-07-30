'use client'

/**
 * Fields added to the tenant-profile registry (src/lib/tenant-profile.ts)
 * that don't have a home in any other Settings tab yet: secondary contact,
 * market context, social links, holidays, and licensing/insurance
 * (previously only reachable through the onboarding wizard, never Settings
 * at all). Reads/writes through /api/tenant-profile — the SAME endpoint
 * the public /onboard/[token] link uses — so a value set here shows up
 * there and vice versa; there is nowhere else for these fields to drift to.
 */
import { useEffect, useState } from 'react'
import { FieldRenderer, type ApiField, type FieldValue } from '@/components/tenant-profile/ProfileWizard'

// Keys this tab owns. Everything else in the registry already has a home in
// another tab (Business, Scheduling, Branding, …) or is admin-only.
const OWNED_KEYS = [
  'secondaryContactName', 'secondaryContactEmail', 'secondaryContactPhone', 'hasSecondaryLocations',
  'targetCustomer', 'competitors', 'differentiators', 'socialLinks',
  'holidayDates',
  'license', 'licenseState', 'licenseExpiry', 'insuranceCarrier', 'insurancePolicy', 'insuranceCoverage', 'bonded',
  'insuranceCertUrl', 'licenseDocUrl', 'w9Url',
]

const SECTION_TITLES: Record<string, string> = {
  contact: 'Secondary Contact & Locations',
  brand: 'Market Context & Social',
  scheduling: 'Holidays',
  compliance: 'Licensing & Insurance',
}

export function AdditionalDetailsTab() {
  const [fields, setFields] = useState<ApiField[]>([])
  const [form, setForm] = useState<Record<string, FieldValue>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/tenant-profile')
      .then((r) => r.json())
      .then((d) => {
        const owned = ((d.fields || []) as ApiField[]).filter((f) => OWNED_KEYS.includes(f.key))
        setFields(owned)
        const values: Record<string, FieldValue> = {}
        for (const f of owned) values[f.key] = f.value
        setForm(values)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const set = (k: string, v: FieldValue) => setForm((f) => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/tenant-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: form }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-slate-400">Loading…</p>

  const sections = [...new Set(fields.map((f) => f.section))]

  return (
    <div className="max-w-2xl space-y-8">
      {sections.map((section) => (
        <div key={section}>
          <h3 className="font-semibold text-slate-900 mb-3">{SECTION_TITLES[section] || section}</h3>
          <div className="space-y-4">
            {fields.filter((f) => f.section === section && !f.readonly).map((f) => (
              <FieldRenderer key={f.key} field={f} value={form[f.key]} onChange={(v) => set(f.key, v)} />
            ))}
            {section === 'contact' && fields.some((f) => f.key === 'hasSecondaryLocations' && f.value) && (
              <p className="text-xs text-slate-400">
                This business has additional locations beyond its primary address. Contact support to manage them.
              </p>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={save}
        disabled={saving}
        className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
      </button>
    </div>
  )
}
