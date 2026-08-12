'use client'

import { useEffect, useState, useCallback } from 'react'
import BoardCell from './BoardCell'
import UpdateComposer from './UpdateComposer'
import UpdateItem from './UpdateItem'
import { boardsFetch } from './boardsFetch'
import type { BoardColumn, BoardItem, BoardItemNote, BoardAttachment } from './types'

interface BoardItemDrawerProps {
  apiBase: string
  boardId: string
  item: BoardItem
  columns: BoardColumn[]
  onClose: () => void
  onItemChange: (item: BoardItem) => void
  onDelete: () => void
  /**
   * Tenant dashboard boards get the full rich-text composer: mentions
   * (/api/boards/team-mentions is tenant-session-scoped) and file
   * attachments (/api/uploads needs a tenant session too). Platform-level
   * admin boards (tenant_id NULL, admin_token auth) have neither, so they
   * keep the plain-text composer instead of a half-working rich one.
   */
  richUpdates?: boolean
}

type Tab = 'updates' | 'files' | 'activity'

export default function BoardItemDrawer({ apiBase, boardId, item, columns, onClose, onItemChange, onDelete, richUpdates = true }: BoardItemDrawerProps) {
  const [name, setName] = useState(item.name)
  const [notes, setNotes] = useState<BoardItemNote[] | null>(null)
  const [draftNote, setDraftNote] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<Tab>('updates')

  const loadNotes = useCallback(() => {
    boardsFetch<{ notes: BoardItemNote[] }>(`${apiBase}/${boardId}/items/${item.id}/notes`).then((r) => {
      if (r.ok) setNotes(r.data.notes || [])
      else setErr(r.error)
    })
  }, [apiBase, boardId, item.id])

  // Parent remounts this component (key={item.id}) on item switch, so `name`
  // only needs to track edits within one open item — no sync-from-props effect.
  useEffect(() => { loadNotes() }, [loadNotes])

  async function saveName() {
    if (name === item.name) return
    const r = await boardsFetch<{ item: BoardItem }>(`${apiBase}/${boardId}/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (r.ok) { onItemChange(r.data.item); loadNotes() } else setErr(r.error)
  }

  async function setValue(columnId: string, value: unknown) {
    const r = await boardsFetch<{ item: BoardItem }>(`${apiBase}/${boardId}/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { [columnId]: value } }),
    })
    if (r.ok) { onItemChange(r.data.item); loadNotes() } else setErr(r.error)
  }

  async function sendNote() {
    if (!draftNote.trim() || sending) return
    setSending(true)
    const r = await boardsFetch(`${apiBase}/${boardId}/items/${item.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: draftNote.trim() }),
    })
    setSending(false)
    if (r.ok) { setDraftNote(''); loadNotes() } else setErr(r.error)
  }

  async function postUpdate(payload: { body: string; attachments: BoardAttachment[] }) {
    const r = await boardsFetch(`${apiBase}/${boardId}/items/${item.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (r.ok) loadNotes()
    else throw new Error(r.error)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            className="flex-1 text-lg font-semibold text-slate-900 border-0 focus:ring-1 focus:ring-teal-400 rounded px-1"
          />
          <button onClick={onDelete} className="text-slate-400 hover:text-red-500 shrink-0" title="Delete item">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
            </svg>
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1">×</button>
        </div>

        {err && <div className="mx-4 mt-2 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs">{err}</div>}

        <div className="p-4 border-b border-slate-200 space-y-3 overflow-y-auto max-h-[40%]">
          {columns.map((col) => (
            <div key={col.id}>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">{col.name}</label>
              <BoardCell column={col} value={item.values?.[col.id]} onChange={(v) => setValue(col.id, v)} />
            </div>
          ))}
          {columns.length === 0 && <p className="text-xs text-slate-400">No columns yet — add one from the board view.</p>}
        </div>

        {!richUpdates ? (
          <div className="flex-1 flex flex-col min-h-0">
            <p className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-500 uppercase">Updates</p>
            <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-3">
              {notes === null && <p className="text-xs text-slate-400">Loading…</p>}
              {notes?.length === 0 && <p className="text-xs text-slate-400">No activity yet.</p>}
              {notes?.map((n) => <UpdateItem key={n.id} note={n} />)}
            </div>
            <div className="p-3 border-t border-slate-200 flex gap-2">
              <textarea
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendNote() }
                }}
                placeholder="Write an update…"
                rows={2}
                className="flex-1 text-sm border border-slate-300 rounded px-2 py-1.5 resize-none"
              />
              <button
                onClick={sendNote}
                disabled={sending || !draftNote.trim()}
                className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded hover:bg-teal-700 disabled:opacity-50 self-end"
              >
                Post
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-100">
              {([
                ['updates', 'Updates'],
                ['files', 'Files'],
                ['activity', 'Activity Log'],
              ] as [Tab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-2.5 py-1.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                    tab === key ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'updates' && (
              <>
                <div className="flex-1 overflow-y-auto px-4 pt-3 space-y-2 pb-3">
                  {notes === null && <p className="text-xs text-slate-400">Loading…</p>}
                  {notes?.filter((n) => n.kind === 'note').length === 0 && <p className="text-xs text-slate-400">No updates yet.</p>}
                  {notes?.filter((n) => n.kind === 'note').map((n) => <UpdateItem key={n.id} note={n} />)}
                </div>
                <div className="p-3 border-t border-slate-200">
                  <UpdateComposer onSubmit={postUpdate} />
                </div>
              </>
            )}

            {tab === 'files' && (
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                {(() => {
                  const files = (notes || []).filter((n) => n.kind === 'note').flatMap((n) => n.attachments || [])
                  if (notes === null) return <p className="text-xs text-slate-400">Loading…</p>
                  if (files.length === 0) return <p className="text-xs text-slate-400">No files yet.</p>
                  return files.map((a) => (
                    <a
                      key={a.url}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2 hover:border-teal-300 hover:bg-teal-50/40"
                    >
                      <span>{a.content_type?.startsWith('image/') ? '🖼️' : '📎'}</span>
                      <span className="truncate flex-1">{a.name}</span>
                    </a>
                  ))
                })()}
              </div>
            )}

            {tab === 'activity' && (
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                {notes === null && <p className="text-xs text-slate-400">Loading…</p>}
                {notes?.filter((n) => n.kind === 'activity').length === 0 && <p className="text-xs text-slate-400">No activity yet.</p>}
                {notes?.filter((n) => n.kind === 'activity').map((n) => <UpdateItem key={n.id} note={n} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
