'use client'

import { useEffect, useState } from 'react'
import { usePageSettings, PageSettingsGear, PageSettingsPanel } from '@/components/page-settings'

type Tenant = {
  website_published?: boolean
  enable_legacy_seo_pages?: boolean
  domain?: string | null
  domain_name?: string | null
}

export default function WebsitesSettings() {
  const settings = usePageSettings('websites')
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [draft, setDraft] = useState<Tenant>({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!settings.open || tenant) return
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const t = (data.tenant?.tenant || data.tenant) as Tenant | null
        setTenant(t || {})
      })
      .catch((e) => setError(String(e?.message || e)))
  }, [settings.open, tenant])

  function get<K extends keyof Tenant>(k: K): Tenant[K] {
    return (k in draft ? draft[k] : tenant?.[k]) as Tenant[K]
  }
  function set<K extends keyof Tenant>(k: K, v: Tenant[K]) {
    setDraft((d) => ({ ...d, [k]: v }))
  }

  async function save() {
    if (Object.keys(draft).length === 0) {
      settings.setOpen(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Save failed')
      } else {
        setTenant({ ...tenant, ...draft })
        setDraft({})
        setSavedAt(Date.now())
        setTimeout(() => setSavedAt(null), 1500)
      }
    } catch (e) {
      setError(String((e as Error)?.message || e))
    } finally {
      setSaving(false)
    }
  }

  function Toggle({ label, helper, k }: { label: string; helper?: string; k: keyof Tenant }) {
    const v = !!get(k)
    return (
      <label className="flex items-start justify-between cursor-pointer gap-4">
        <span className="flex-1">
          <span className="block text-sm font-medium text-gray-200">{label}</span>
          {helper && <span className="block text-xs text-gray-500 mt-0.5">{helper}</span>}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={v}
          onClick={() => set(k, !v as Tenant[typeof k])}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${v ? 'bg-emerald-500' : 'bg-gray-600'}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${v ? 'translate-x-5' : 'translate-x-0.5'} translate-y-0.5`} />
        </button>
      </label>
    )
  }

  return (
    <>
      <PageSettingsGear open={settings.open} setOpen={settings.setOpen} title="Websites" />
      <PageSettingsPanel
        {...settings}
        title="Websites"
        tips={[
          'Toggle whether your tenant site is publicly served.',
          'Legacy SEO pages render the long-form area + service combo pages copied from a source maid site.',
        ]}
      >
        {() => (
          <div className="space-y-5">
            {error && <p className="text-sm text-red-400">{error}</p>}
            {!tenant && <p className="text-sm text-gray-400">Loading…</p>}
            {tenant && (
              <>
                <Toggle k="website_published" label="Site published" helper="When off, public visits to your domain return a placeholder." />
                <Toggle k="enable_legacy_seo_pages" label="Legacy SEO pages enabled" helper="Renders the area × service long-tail pages copied from your source site." />
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-800">
                  {savedAt && <span className="text-xs text-emerald-400 mr-auto">Saved.</span>}
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || Object.keys(draft).length === 0}
                    className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </PageSettingsPanel>
    </>
  )
}
