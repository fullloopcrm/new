'use client'

const roleBadgeStyles: Record<string, string> = {
  owner: 'bg-teal-100 text-teal-700',
  team: 'bg-blue-100 text-blue-700',
  client: 'bg-gray-100 text-gray-600',
}

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  team: 'Team',
  client: 'Client',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export type ChatMessage = {
  id: string
  sender_type: string
  sender_id: string
  sender_name: string
  body: string
  created_at: string
}

export function ChatBubble({ msg, variant = 'slack' }: { msg: ChatMessage; variant?: 'slack' | 'imessage-mine' | 'imessage-theirs' }) {
  if (variant === 'imessage-mine') {
    return (
      <div className="flex justify-end mb-2">
        <div className="bg-teal-500 text-white px-3 py-2 rounded-2xl rounded-br-sm max-w-[75%]">
          <p className="text-sm">{msg.body}</p>
          <p className="text-[10px] text-white/60 mt-0.5 text-right">{formatTime(msg.created_at)}</p>
        </div>
      </div>
    )
  }

  if (variant === 'imessage-theirs') {
    return (
      <div className="flex justify-start mb-2">
        <div className="bg-gray-200 text-slate-800 px-3 py-2 rounded-2xl rounded-bl-sm max-w-[75%]">
          <p className="text-xs font-medium text-slate-500 mb-0.5">{msg.sender_name}</p>
          <p className="text-sm">{msg.body}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{formatTime(msg.created_at)}</p>
        </div>
      </div>
    )
  }

  // Slack-style
  return (
    <div className="flex gap-2.5 mb-3 group">
      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 mt-0.5">
        {getInitials(msg.sender_name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-800">{msg.sender_name}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${roleBadgeStyles[msg.sender_type] || roleBadgeStyles.client}`}>
            {roleLabels[msg.sender_type] || msg.sender_type}
          </span>
          <span className="text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(msg.created_at)}
          </span>
        </div>
        <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap break-words">{msg.body}</p>
      </div>
    </div>
  )
}

export function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-xs font-medium text-slate-400">{date}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

export function NewMessagesDivider() {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-red-300" />
      <span className="text-xs font-medium text-red-500">New messages</span>
      <div className="flex-1 h-px bg-red-300" />
    </div>
  )
}

export function ChatInput({
  value,
  onChange,
  onSend,
  placeholder = 'Type a message...',
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div className="flex gap-2 items-end">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 disabled:opacity-50"
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      >
        Send
      </button>
    </div>
  )
}
