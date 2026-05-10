// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PreLaunchGate from '@/app/site//_components/PreLaunchGate'

interface Thread {
  threadId: string
  listing_id: number
  listing_title: string
  listing_image: string | null
  other_user_id: number
  other_user: { name: string; verified: boolean }
  last_message: string
  last_message_at: string
  unread: number
}

export default function InboxClient() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/messages')
      .then(r => r.json())
      .then(data => setThreads(data.threads || []))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <main style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</main>

  return (
    <PreLaunchGate>
    <main style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Link href="/account" style={{ color: '#2563eb', fontSize: '1.25rem' }}>&larr;</Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Messages</h1>
      </div>

      {threads.length === 0 ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#94a3b8',
          border: '1px dashed #e2e8f0',
          borderRadius: '0.75rem',
        }}>
          No messages yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {threads.map(thread => (
            <Link
              key={thread.threadId}
              href={`/messages/${thread.threadId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                backgroundColor: thread.unread > 0 ? '#f8fafc' : '#fff',
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '0.5rem',
                backgroundColor: '#f1f5f9',
                flexShrink: 0,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {thread.listing_image ? (
                  <img src={thread.listing_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: '#94a3b8' }}>&#128247;</span>
                )}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.125rem' }}>
                  <span style={{ fontWeight: thread.unread > 0 ? 700 : 500, fontSize: '0.875rem' }}>
                    {thread.other_user.name || 'Anonymous'}
                    {thread.other_user.verified && <span style={{ color: '#2563eb', marginLeft: '0.25rem' }}>&#10003;</span>}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {getTimeAgo(thread.last_message_at)}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#2563eb', marginBottom: '0.25rem' }}>
                  {thread.listing_title}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#64748b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {thread.last_message}
                </div>
              </div>
              {thread.unread > 0 && (
                <span style={{
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {thread.unread > 9 ? '9+' : thread.unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
    </PreLaunchGate>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}
