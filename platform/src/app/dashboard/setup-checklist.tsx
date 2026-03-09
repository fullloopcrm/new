'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type ChecklistItem = {
  key: string
  label: string
  description: string
  done: boolean
  href: string
}

type ChecklistSection = {
  id: string
  title: string
  icon: string
  items: ChecklistItem[]
}

export default function SetupChecklist() {
  const [sections, setSections] = useState<ChecklistSection[]>([])
  const [completed, setCompleted] = useState(0)
  const [total, setTotal] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  function fetchChecklist() {
    fetch('/api/setup-checklist')
      .then((r) => r.json())
      .then((data) => {
        setSections(data.sections || [])
        setCompleted(data.completed || 0)
        setTotal(data.total || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchChecklist() }, [])

  async function dismiss() {
    setDismissed(true)
    await fetch('/api/setup-checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dismissed: true }),
    })
  }

  async function markDone(key: string) {
    await fetch('/api/setup-checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complete_key: key }),
    })
    fetchChecklist()
  }

  async function markUndone(key: string) {
    await fetch('/api/setup-checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uncomplete_key: key }),
    })
    fetchChecklist()
  }

  if (loading || dismissed || total === 0) return null
  if (completed === total) return null

  const pct = Math.round((completed / total) * 100)

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-3">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Getting Started</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              {completed} of {total} complete &mdash; {completed === 0 ? "Let's set up your business" : pct >= 75 ? 'Almost there!' : 'Keep going!'}
            </p>
          </div>
          <button onClick={dismiss} className="text-xs text-slate-400 hover:text-white transition-colors">
            Dismiss
          </button>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-teal-600' : 'bg-orange-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {sections.map((section) => {
          const sectionDone = section.items.filter((i) => i.done).length
          const sectionTotal = section.items.length
          const allDone = sectionDone === sectionTotal

          return (
            <div key={section.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{section.icon}</span>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-400">{section.title}</h4>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  allDone ? 'bg-green-500/20 text-green-400' : sectionDone > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-600 text-slate-400'
                }`}>{sectionDone}/{sectionTotal}</span>
              </div>

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  // Items that are manually completable (stored in setup_progress)
                  const isManual = [
                    'explore_dashboard', 'review_services', 'try_portal',
                    'share_booking_link', 'test_team_portal', 'share_team_portal',
                    'setup_referrals', 'read_docs',
                  ].includes(item.key)

                  // Map item keys to the setup_progress keys used in the API
                  const progressKey = item.key === 'explore_dashboard' ? 'explored_dashboard' : item.key === 'review_services' ? 'reviewed_services' : item.key === 'try_portal' ? 'tried_portal' : item.key === 'share_booking_link' ? 'shared_booking_link' : item.key === 'test_team_portal' ? 'tested_team_portal' : item.key === 'share_team_portal' ? 'shared_team_portal' : item.key === 'setup_referrals' ? 'setup_referrals' : item.key === 'read_docs' ? 'read_docs' : item.key

                  return (
                    <div key={item.key} className="flex items-start gap-3 py-2 group">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (!isManual) return
                          if (item.done) {
                            markUndone(progressKey)
                          } else {
                            markDone(progressKey)
                          }
                        }}
                        className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center mt-0.5 transition-colors ${
                          item.done
                            ? isManual
                              ? 'bg-green-500/20 border border-green-400 hover:border-red-400 cursor-pointer'
                              : 'bg-green-500/20 border border-green-400'
                            : isManual
                              ? 'border border-slate-600 hover:border-blue-400 cursor-pointer'
                              : 'border border-slate-600'
                        }`}
                      >
                        {item.done && (
                          <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <Link href={item.href} className="min-w-0 flex-1">
                        <p className={`text-sm ${item.done ? 'line-through text-slate-400' : 'text-white font-medium group-hover:text-teal-400'}`}>
                          {item.label}
                        </p>
                        {!item.done && (
                          <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                        )}
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
