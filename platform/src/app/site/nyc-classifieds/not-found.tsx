// @ts-nocheck
import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 24px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>404</h1>
      <p style={{ fontSize: '1.125rem', color: '#6b7280', marginBottom: '32px' }}>
        This page doesn't exist or has been removed.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <Link href="/" style={{
          backgroundColor: '#1a56db',
          color: '#fff',
          padding: '10px 24px',
          borderRadius: '6px',
          fontSize: '0.875rem',
          fontWeight: 600,
          textDecoration: 'none',
        }}>
          Go to Homepage
        </Link>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
          <Link href="/listings/housing" style={{ color: '#1a56db', fontSize: '0.8125rem', textDecoration: 'none' }}>Housing</Link>
          <Link href="/listings/jobs" style={{ color: '#1a56db', fontSize: '0.8125rem', textDecoration: 'none' }}>Jobs</Link>
          <Link href="/listings/for-sale" style={{ color: '#1a56db', fontSize: '0.8125rem', textDecoration: 'none' }}>For Sale</Link>
          <Link href="/listings/services" style={{ color: '#1a56db', fontSize: '0.8125rem', textDecoration: 'none' }}>Services</Link>
          <Link href="/listings/gigs" style={{ color: '#1a56db', fontSize: '0.8125rem', textDecoration: 'none' }}>Gigs</Link>
          <Link href="/porch" style={{ color: '#1a56db', fontSize: '0.8125rem', textDecoration: 'none' }}>The Porch</Link>
          <Link href="/business" style={{ color: '#1a56db', fontSize: '0.8125rem', textDecoration: 'none' }}>Business Directory</Link>
          <Link href="/blog" style={{ color: '#1a56db', fontSize: '0.8125rem', textDecoration: 'none' }}>Blog</Link>
        </div>
      </div>
    </main>
  )
}
