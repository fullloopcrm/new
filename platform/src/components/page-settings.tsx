'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

// One shared open/close boolean for the settings drawer, so every dashboard
// page shows exactly one gear (rendered once, in the topbar) instead of each
// page owning its own independent open state and its own inline gear button.
// targetKey carries which specific field (if any) to scroll to and highlight
// once the drawer opens — set by a SettingsHint click out on a page's content.
type PageSettingsOpenState = {
  open: boolean
  setOpen: (v: boolean) => void
  targetKey: string | null
  setTargetKey: (k: string | null) => void
}
const PageSettingsOpenContext = createContext<PageSettingsOpenState | null>(null)

export function PageSettingsOpenProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [targetKey, setTargetKey] = useState<string | null>(null)
  const pathname = usePathname()

  // Close the drawer on navigation so it never shows stale content for the
  // page you just left.
  useEffect(() => {
    setOpen(false)
    setTargetKey(null)
  }, [pathname])

  return (
    <PageSettingsOpenContext.Provider value={{ open, setOpen, targetKey, setTargetKey }}>
      {children}
    </PageSettingsOpenContext.Provider>
  )
}

export function usePageSettingsOpen(): PageSettingsOpenState {
  const ctx = useContext(PageSettingsOpenContext)
  if (!ctx) throw new Error('usePageSettingsOpen must be used within PageSettingsOpenProvider')
  return ctx
}

export function usePageSettings(page: string) {
  const { open, setOpen } = usePageSettingsOpen()
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/settings/page-config?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.config) setConfig(data.config)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [page])

  const saveConfig = useCallback(
    async (newConfig: Record<string, unknown>) => {
      setSaving(true)
      setSaveMsg('')
      try {
        const res = await fetch('/api/settings/page-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page, config: newConfig }),
        })
        if (res.ok) {
          setSaveMsg('Saved')
          setTimeout(() => setSaveMsg(''), 2000)
        } else {
          const data = await res.json()
          setSaveMsg(data.error || 'Failed to save')
        }
      } catch {
        setSaveMsg('Network error')
      }
      setSaving(false)
    },
    [page]
  )

  const updateConfig = useCallback(
    (key: string, value: unknown) => {
      setConfig((prev) => {
        const updated = { ...prev, [key]: value }
        saveConfig(updated)
        return updated
      })
    },
    [saveConfig]
  )

  return { open, setOpen, config, updateConfig, saving, saveMsg, loaded }
}

// Right-side slide-out drawer — mirrors the notifications panel already used
// in dashboard-shell.tsx (same dark loop-ink theme, same width formula, same
// click-outside-to-close behavior) so every overlay in the shell feels like
// one system.
// Drawer width grows with the column count so a page with many fields has
// room to actually lay them out 2 or 3 across instead of squeezing them.
const DRAWER_WIDTH_BY_COLUMNS: Record<1 | 2 | 3, { minWidth: number; maxWidth: number }> = {
  1: { minWidth: 320, maxWidth: 460 },
  2: { minWidth: 600, maxWidth: 720 },
  3: { minWidth: 860, maxWidth: 980 },
}

export function PageSettingsPanel({
  open,
  setOpen,
  loaded,
  title,
  tips,
  saving,
  saveMsg,
  config,
  updateConfig,
  columns = 1,
  children,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  loaded: boolean
  title: string
  tips: string[]
  saving: boolean
  saveMsg: string
  config: Record<string, unknown>
  updateConfig: (key: string, value: unknown) => void
  columns?: 1 | 2 | 3
  children?: (props: {
    config: Record<string, unknown>
    updateConfig: (key: string, value: unknown) => void
    saving: boolean
  }) => ReactNode
}) {
  if (!open) return null

  const width = DRAWER_WIDTH_BY_COLUMNS[columns]

  return (
    <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-y-0 right-0 flex flex-col shadow-2xl transition-[max-width,min-width] duration-200"
        style={{ background: 'var(--color-loop-ink)', color: 'var(--color-loop-muted-2)', borderLeft: '1px solid #2E2E2E', minWidth: width.minWidth, maxWidth: width.maxWidth, width: '100%' }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid #2A2A2A' }}>
          <div className="flex items-baseline gap-2">
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#F4F4F1', fontWeight: 600 }}>
              {title} Settings
            </span>
            {saveMsg && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', color: saveMsg === 'Saved' ? '#4ADE80' : '#E5484D' }}>
                {saveMsg}
              </span>
            )}
            {saving && <span style={{ fontSize: '9.5px', color: '#D5D5D0' }}>Saving&hellip;</span>}
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close settings" style={{ color: '#F4F4F1', fontSize: 20, lineHeight: 1 }}>&times;</button>
        </div>

        {/* Tips */}
        {tips.length > 0 && (
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #2A2A2A', background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 600, color: '#FFD60A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tips</span>
            <ul className="space-y-1.5 mt-2">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2" style={{ fontSize: '12.5px', color: '#E5E5E1' }}>
                  <span style={{ color: '#FFD60A' }}>&#8226;</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Content — pb-32 matches the bottom clearance every other dashboard
            page reserves for the fixed Selena/assistant bar (same z-50 as
            this drawer), which otherwise sits on top of the last items and
            blocks clicks on them. */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-32">
          {!loaded ? (
            <p style={{ fontSize: '12.5px', color: '#D5D5D0' }}>Loading&hellip;</p>
          ) : children ? (
            children({ config, updateConfig, saving })
          ) : (
            <p style={{ fontSize: '12.5px', color: '#D5D5D0' }}>No editable settings on this page yet.</p>
          )}
        </div>
      </aside>
    </div>
  )
}

// Small inline affordance for embedding next to a specific section/field out
// on a page's own content — distinct from the gray "?" info-tooltip already
// used elsewhere (that explains a concept; this means "this is configurable").
// Clicking it opens the settings drawer for whatever page it's placed on.
// Not wired into any page yet — placement happens page-by-page once we know
// what's actually configurable there.
export function SettingsHint({ label = 'Configurable in Settings', fieldKey }: { label?: string; fieldKey?: string }) {
  const { setOpen, setTargetKey } = usePageSettingsOpen()
  return (
    <button
      type="button"
      onClick={() => {
        setOpen(true)
        setTargetKey(fieldKey ?? null)
      }}
      title={`${label} — click to open Settings`}
      aria-label={`${label} — click to open Settings`}
      className="inline-flex items-center justify-center rounded-full transition-colors hover:brightness-110 align-middle"
      style={{ width: 16, height: 16, background: 'rgba(255,214,10,0.15)', border: '1px solid rgba(255,214,10,0.4)', color: '#FFD60A' }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>
  )
}
