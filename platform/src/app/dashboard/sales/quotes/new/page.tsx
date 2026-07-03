'use client'

/**
 * New proposal — rendered as a route-level modal over the sales surface. The
 * three "Build Proposal" links still navigate here; this route paints a modal
 * shell (dim backdrop that does NOT close — only X / Cancel / Escape) around the
 * shared QuoteBuilder, which autosaves a draft as you type.
 */
import { Suspense, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import QuoteBuilder from '../_QuoteBuilder'

function NewQuoteModal() {
  const router = useRouter()
  const sp = useSearchParams()
  const dealId = sp.get('deal')
  const clientId = sp.get('client_id')

  // Close → back to wherever the builder was opened from; the autosaved draft
  // persists. Falls back to the quotes list if there's no history.
  const close = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/dashboard/sales/quotes')
  }, [router])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm" aria-modal="true" role="dialog">
      {/* Backdrop is intentionally inert — clicking it does not close the modal. */}
      <div className="min-h-full flex items-start justify-center p-3 md:p-6">
        <div className="w-full max-w-4xl my-2 bg-slate-50 rounded-2xl shadow-2xl border border-slate-200">
          <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-slate-50 rounded-t-2xl z-10">
            <h1 className="font-heading text-lg font-bold text-slate-900">New Proposal</h1>
            <button onClick={close} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200">✕</button>
          </header>
          <div className="p-5">
            <QuoteBuilder
              dealId={dealId}
              clientIdInit={clientId}
              onCancel={close}
              onSaved={(id) => router.push(`/dashboard/sales/quotes/${id}`)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewQuotePage() {
  return (
    <Suspense fallback={null}>
      <NewQuoteModal />
    </Suspense>
  )
}
