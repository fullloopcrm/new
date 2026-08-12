'use client'

import { sanitizeNoteHtml } from '@/lib/sanitize-html'
import type { BoardItemNote } from './types'

function formatSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface UpdateItemProps {
  note: BoardItemNote
}

// Renders one row of the Updates/Activity Log feed. `note.body` was already
// sanitized server-side on write (see /api/boards/[id]/items/[itemId]/notes),
// but sanitizing again here is defense in depth — a note written before a
// tighter allowlist shipped is still just a raw DB value by the time it
// reaches this render.
export default function UpdateItem({ note }: UpdateItemProps) {
  if (note.kind === 'activity') {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 py-0.5">
        <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
        <span className="truncate">
          <span className="font-medium text-slate-500">{note.author_name}</span> {note.body}
        </span>
        <span className="ml-auto shrink-0">{new Date(note.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
      </div>
    )
  }

  const html = sanitizeNoteHtml(note.body || '')
  const attachments = note.attachments || []

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-700">{note.author_name}</span>
        <span className="text-[10px] text-slate-400">{new Date(note.created_at).toLocaleString()}</span>
      </div>
      {html && <div className="tb-rich-text" dangerouslySetInnerHTML={{ __html: html }} />}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {attachments.map((a) => (
            <a
              key={a.url}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 rounded px-2 py-1 hover:border-teal-300 text-slate-700"
            >
              {a.content_type?.startsWith('image/') ? '🖼️' : '📎'} {a.name}
              {a.size ? <span className="text-slate-400">({formatSize(a.size)})</span> : null}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
