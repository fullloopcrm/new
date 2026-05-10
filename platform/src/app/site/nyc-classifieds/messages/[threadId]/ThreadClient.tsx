// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PreLaunchGate from '@/app/site//_components/PreLaunchGate'

interface Message {
  id: number
  sender_id: number
  content: string
  read: boolean
  created_at: string
}

export default function ThreadClient({ threadId }: { threadId: string }) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [listing, setListing] = useState<{ id: number; title: string; images: string[] } | null>(null)
  const [otherUser, setOtherUser] = useState<{ id: number; name: string; verified: boolean } | null>(null)
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Get current user
    fetch('/api/auth')
      .then(r => r.json())
      .then(d => { if (d.authenticated) setCurrentUserId(d.user.id) })

    // Load thread
    fetch(`/api/messages/${threadId}`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages || [])
        setListing(data.listing)
        setOtherUser(data.otherUser)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [threadId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const send = async () => {
    if (!newMsg.trim() || !listing || !otherUser) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
          recipient_id: otherUser.id,
          content: newMsg,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setMessages(prev => [...prev, {
        id: data.id,
        sender_id: currentUserId!,
        content: newMsg.trim(),
        read: false,
        created_at: new Date().toISOString(),
      }])
      setNewMsg('')
    } catch {
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleReport = async () => {
    if (!reportReason.trim() || !otherUser) return
    setReportSending(true)
    try {
      const res = await fetch('/api/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: 'message',
          content_id: otherUser.id,
          reason: reportReason,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to report')
        return
      }
      alert('Report submitted. Thank you.')
      setShowReport(false)
      setReportReason('')
    } catch {
      alert('Failed to submit report')
    } finally {
      setReportSending(false)
    }
  }

  const handleBlock = async () => {
    if (!otherUser) return
    if (!confirm(`Block ${otherUser.name || 'this user'}? You won't see their messages anymore.`)) return
    try {
      const res = await fetch('/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: otherUser.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to block user')
        return
      }
      router.push('/messages')
    } catch {
      alert('Failed to block user')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this conversation? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/messages/${threadId}`, { method: 'DELETE' })
      if (!res.ok) {
        alert('Failed to delete conversation')
        return
      }
      router.push('/messages')
    } catch {
      alert('Failed to delete conversation')
    }
  }

  if (loading) return <main style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</main>

  return (
    <PreLaunchGate>
    <main style={{ maxWidth: '700px', margin: '0 auto', padding: '0', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        backgroundColor: '#fff',
      }}>
        <Link href="/messages" style={{ color: '#2563eb', fontSize: '1.25rem' }}>&larr;</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
            {otherUser?.name || 'Anonymous'}
            {otherUser?.verified && <span style={{ color: '#2563eb', marginLeft: '0.25rem' }}>&#10003;</span>}
          </div>
          {listing && (
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {listing.title}
            </span>
          )}
        </div>

        {/* Actions menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              color: '#64748b',
              borderRadius: '0.25rem',
            }}
            aria-label="Thread actions"
          >
            &#8943;
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              minWidth: '180px',
              zIndex: 50,
              overflow: 'hidden',
            }}>
              <button
                onClick={() => { setMenuOpen(false); setShowReport(true) }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.625rem 1rem',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  color: '#0f172a',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Report
              </button>
              <button
                onClick={() => { setMenuOpen(false); handleBlock() }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.625rem 1rem',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  color: '#0f172a',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Block User
              </button>
              <button
                onClick={() => { setMenuOpen(false); handleDelete() }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.625rem 1rem',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  color: '#dc2626',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Delete Conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Report modal */}
      {showReport && (
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#fefce8',
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Report this conversation</div>
          <textarea
            value={reportReason}
            onChange={e => setReportReason(e.target.value)}
            placeholder="Describe the issue..."
            rows={3}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #e2e8f0',
              fontSize: '0.875rem',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={handleReport}
              disabled={reportSending || !reportReason.trim()}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: '#dc2626',
                color: '#fff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {reportSending ? 'Submitting...' : 'Submit Report'}
            </button>
            <button
              onClick={() => { setShowReport(false); setReportReason('') }}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #e2e8f0',
                background: '#fff',
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
        {messages.map(msg => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div key={msg.id} style={{
              display: 'flex',
              justifyContent: isMe ? 'flex-end' : 'flex-start',
              marginBottom: '0.75rem',
            }}>
              <div style={{
                maxWidth: '70%',
                padding: '0.625rem 0.875rem',
                borderRadius: '1rem',
                backgroundColor: isMe ? '#2563eb' : '#f1f5f9',
                color: isMe ? '#fff' : '#0f172a',
                fontSize: '0.875rem',
                lineHeight: 1.5,
              }}>
                {msg.content}
                <div style={{
                  fontSize: '0.65rem',
                  opacity: 0.7,
                  marginTop: '0.25rem',
                  textAlign: 'right',
                }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '0.75rem 1.5rem',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        gap: '0.5rem',
        backgroundColor: '#fff',
      }}>
        <input
          type="text"
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          maxLength={2000}
          style={{
            flex: 1,
            padding: '0.625rem 1rem',
            borderRadius: '1.5rem',
            border: '1px solid #e2e8f0',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={sending || !newMsg.trim()}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '1.5rem',
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          Send
        </button>
      </div>
    </main>
    </PreLaunchGate>
  )
}
