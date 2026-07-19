'use client'

export interface ConversationSummary {
  team_member_id: string
  name: string
  role: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function Initials({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
  return (
    <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 text-xs font-semibold flex items-center justify-center shrink-0">
      {initials || '?'}
    </div>
  )
}

export default function ConversationSidebar({
  conversations,
  loading,
  activeId,
  onSelect,
}: {
  conversations: ConversationSummary[]
  loading: boolean
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="w-[260px] shrink-0 border-r border-slate-200 flex flex-col min-h-0">
      <div className="px-3 pt-3 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-2">Pinned</p>
      </div>
      <button
        onClick={() => onSelect('fullloop')}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
          activeId === 'fullloop' ? 'bg-slate-100' : 'hover:bg-slate-50'
        }`}
      >
        <div className="w-9 h-9 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
          FL
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">Full Loop</p>
          <p className="text-xs text-slate-400 truncate">Support &amp; platform admin</p>
        </div>
      </button>

      <div className="px-3 pt-4 pb-1 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-2">Team</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <p className="px-5 py-2 text-xs text-slate-400">Loading…</p>}
        {!loading && conversations.length === 0 && (
          <p className="px-5 py-2 text-xs text-slate-400">No other team members yet.</p>
        )}
        {conversations.map((c) => (
          <button
            key={c.team_member_id}
            onClick={() => onSelect(c.team_member_id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
              activeId === c.team_member_id ? 'bg-slate-100' : 'hover:bg-slate-50'
            }`}
          >
            <Initials name={c.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                {c.last_message_at && (
                  <span className="text-[10px] text-slate-400 shrink-0">{fmtDay(c.last_message_at)}</span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">{c.last_message || 'No messages yet'}</p>
            </div>
            {c.unread_count > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-slate-900 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                {c.unread_count > 9 ? '9+' : c.unread_count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
