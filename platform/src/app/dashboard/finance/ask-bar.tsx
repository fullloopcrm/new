'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function AskBar() {
  const search = useSearchParams()
  const entityParam = search.get('entity_id') || ''
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    setBusy(true); setAnswer('')
    const url = `/api/finance/ai-ask${entityParam ? `?entity_id=${entityParam}` : ''}`
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    })
    const data = await res.json()
    setAnswer(res.ok ? data.answer : data.error || 'Failed')
    setBusy(false)
  }

  return (
    <div className="mb-6">
      <form onSubmit={ask} className="flex gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Ask your books — e.g., 'What's my gross margin YTD?'"
          className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm"
        />
        <button disabled={busy || !q.trim()}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
          {busy ? 'Thinking…' : 'Ask'}
        </button>
      </form>
      {answer && (
        <div className="mt-3 p-4 bg-violet-50 border border-violet-200 rounded-xl text-sm text-slate-800 whitespace-pre-wrap">
          {answer}
        </div>
      )}
    </div>
  )
}
