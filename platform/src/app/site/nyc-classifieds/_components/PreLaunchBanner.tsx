'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const PRELAUNCH = false // disabled — site is open
const TARGET = 10000

export default function PreLaunchBanner() {
  const [count, setCount] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!PRELAUNCH) return
    fetch('/api/prelaunch')
      .then(r => r.json())
      .then(d => setCount(d.count || 0))
      .catch(() => {})
  }, [])

  if (!PRELAUNCH) {
    return (
      <Link href="/signup" style={{
        display: 'block',
        backgroundColor: '#f0f5ff',
        border: '1px solid #c7d7fe',
        borderRadius: '8px',
        padding: '8px 16px',
        marginBottom: '12px',
        textDecoration: 'none',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.8125rem',
        color: '#1e3a5f',
        lineHeight: 1.5,
        textAlign: 'center',
      }}>
        <span className="launch-blink" style={{ color: '#1a56db', fontWeight: 700 }}>JUST LAUNCHED</span>{' '}
        — We just went live. It only works if you use it. Post something, tell a neighbor, be one of the first.{' '}
        <span style={{ color: '#1a56db', fontWeight: 600 }}>Sign up free &rarr;</span>
      </Link>
    )
  }

  const pct = Math.min((count / TARGET) * 100, 100)
  const countStr = count.toLocaleString()
  const targetStr = TARGET.toLocaleString()

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    const shareData = {
      title: 'NYC Classifieds',
      text: `NYC Classifieds is launching at ${targetStr} verified New Yorkers. Sign up free!`,
      url: 'https://thenycclassifieds.com/signup',
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{
      backgroundColor: '#f0f5ff',
      border: '1px solid #c7d7fe',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '12px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <p style={{ fontSize: '0.8125rem', color: '#1e3a5f', textAlign: 'center', margin: '0 0 8px', lineHeight: 1.4 }}>
        <span style={{ color: '#1a56db', fontWeight: 700 }}>Launching at {targetStr} New Yorkers</span>{' '}
        — Sign up, share with friends, and help us get there.{' '}
        <Link href="/porch" style={{ color: '#059669', fontWeight: 600 }}>The Porch is open now &rarr;</Link>
      </p>
      {/* Compact progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{
          flex: 1,
          backgroundColor: '#dbeafe',
          borderRadius: '999px',
          height: '10px',
          overflow: 'hidden',
        }}>
          <div style={{
            backgroundColor: '#1a56db',
            height: '100%',
            borderRadius: '999px',
            width: `${Math.max(pct, 2)}%`,
            transition: 'width 0.6s ease',
          }} />
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e3a5f', whiteSpace: 'nowrap' }}>
          {countStr} / {targetStr}
        </span>
      </div>
      {/* Buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <Link href="/signup" style={{
          backgroundColor: '#1a56db',
          color: '#fff',
          padding: '6px 20px',
          borderRadius: '6px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          textDecoration: 'none',
        }}>
          Sign Up Free
        </Link>
        <button onClick={handleShare} style={{
          backgroundColor: '#fff',
          color: '#1a56db',
          padding: '6px 20px',
          borderRadius: '6px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          border: '1px solid #1a56db',
          cursor: 'pointer',
        }}>
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>
    </div>
  )
}
