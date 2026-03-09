'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'

type PageSettingsProps = {
  page: string
  title: string
  tips: string[]
  children: (props: {
    config: Record<string, unknown>
    updateConfig: (key: string, value: unknown) => void
    saving: boolean
  }) => ReactNode
}

export function usePageSettings(page: string) {
  const [open, setOpen] = useState(false)
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

export function PageSettingsGear({
  open,
  setOpen,
  title,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  title: string
}) {
  return (
    <button
      onClick={() => setOpen(!open)}
      className={`p-2 rounded-lg transition-colors ${
        open ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-800'
      }`}
      title={`${title} Settings`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </button>
  )
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
  children: (props: {
    config: Record<string, unknown>
    updateConfig: (key: string, value: unknown) => void
    saving: boolean
  }) => ReactNode
}) {
  if (!open || !loaded) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h3 className="font-semibold text-white">{title} Settings</h3>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span
              className={`text-xs ${saveMsg === 'Saved' ? 'text-green-400' : 'text-red-400'}`}
            >
              {saveMsg}
            </span>
          )}
          {saving && <span className="text-xs text-gray-500">Saving...</span>}
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-white text-lg leading-none"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Tips section */}
      {tips.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-800/30">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
              />
            </svg>
            <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">
              Tips
            </span>
          </div>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                <span className="text-gray-600 mt-0.5">&#8226;</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Settings content */}
      <div className="p-6">{children({ config, updateConfig, saving })}</div>
    </div>
  )
}

// Convenience default export for simple cases
export default function PageSettings({ page, title, tips, children }: PageSettingsProps) {
  const settings = usePageSettings(page)

  return (
    <>
      <PageSettingsGear open={settings.open} setOpen={settings.setOpen} title={title} />
      <PageSettingsPanel {...settings} title={title} tips={tips}>
        {children}
      </PageSettingsPanel>
    </>
  )
}
