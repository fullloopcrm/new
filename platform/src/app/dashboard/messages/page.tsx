'use client'

// Messages: a pinned Full Loop (admin) thread + real team-to-team direct
// messaging with every active team_members row on this tenant. Full Loop's
// own thread/table (tenant_owner_messages) is untouched -- this only adds a
// sidebar around it and a new, parallel team_direct_messages thread type.
import { useCallback, useEffect, useState } from 'react'
import FullLoopThread from './_FullLoopThread'
import TeamThread from './_TeamThread'
import ConversationSidebar, { type ConversationSummary } from './_ConversationSidebar'

export default function MessagesPage() {
  const [activeId, setActiveId] = useState('fullloop')
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [rosterLoading, setRosterLoading] = useState(true)

  const loadRoster = useCallback(async () => {
    const res = await fetch('/api/dashboard/team-messages')
    if (res.ok) setConversations((await res.json()).conversations || [])
    setRosterLoading(false)
  }, [])

  useEffect(() => { loadRoster() }, [loadRoster])
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') loadRoster() }, 15000)
    return () => clearInterval(id)
  }, [loadRoster])
  // Refresh the roster's last-message previews when switching into a thread
  // (marks it read server-side).
  useEffect(() => { if (activeId !== 'fullloop') loadRoster() }, [activeId, loadRoster])

  const activeTeamMember = conversations.find((c) => c.team_member_id === activeId)

  return (
    <div className="loop-scope">
      <div className="mb-6">
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '40px', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>
          Messages<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--color-loop-muted)' }}>.</em>
        </h1>
        <p className="mt-2" style={{ fontSize: '13px', color: 'var(--color-loop-muted)' }}>
          Full Loop support, pinned, plus direct messages with your team.
        </p>
      </div>

      <div className="border border-slate-200 rounded-lg bg-white flex" style={{ height: 'calc(100vh - 230px)', minHeight: '420px' }}>
        <ConversationSidebar
          conversations={conversations}
          loading={rosterLoading}
          activeId={activeId}
          onSelect={setActiveId}
        />
        {activeId === 'fullloop' && <FullLoopThread />}
        {activeId !== 'fullloop' && activeTeamMember && (
          <TeamThread
            key={activeTeamMember.team_member_id}
            teamMemberId={activeTeamMember.team_member_id}
            teamMemberName={activeTeamMember.name}
            onSent={loadRoster}
          />
        )}
        {activeId !== 'fullloop' && !activeTeamMember && !rosterLoading && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-slate-500">Select a conversation.</p>
          </div>
        )}
      </div>
    </div>
  )
}
