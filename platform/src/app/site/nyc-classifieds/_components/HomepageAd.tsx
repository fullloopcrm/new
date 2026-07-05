'use client'

import { useEffect, useState } from 'react'

interface Ad {
  id: number
  advertiser: string
  image_url: string
  link_url: string
}

interface Props {
  categorySlug?: string
  borough?: string
  neighborhood?: string
}

export default function HomepageAd({ categorySlug, borough, neighborhood }: Props = {}) {
  const [ad, setAd] = useState<Ad | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams()
    if (categorySlug) {
      params.set('type', 'category')
      params.set('category', categorySlug)
      if (borough) params.set('borough', borough)
      if (neighborhood) params.set('neighborhood', neighborhood)
    } else {
      params.set('type', 'homepage')
    }
    fetch(`/api/ads?${params}`)
      .then(r => r.json())
      .then(d => { if (d.ad) setAd(d.ad) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [categorySlug, borough, neighborhood])

  // Show placeholder while loading or when no ad
  if (!loaded || !ad) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        borderRadius: '10px',
        backgroundColor: '#f1f5f9',
        border: '1px dashed #d1d5db',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#9ca3af',
            marginBottom: '4px',
          }}>
            Your ad here
          </div>
          <div style={{
            fontSize: '0.6875rem',
            color: '#c4c9d1',
          }}>
            Reach your neighborhood
          </div>
        </div>
      </div>
    )
  }

  const content = (
    <img
      src={ad.image_url}
      alt={`Ad from ${ad.advertiser}`}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '10px',
        display: 'block',
      }}
    />
  )

  return (
    <div style={{
      width: '100%',
      borderRadius: '10px',
      overflow: 'hidden',
      backgroundColor: '#f1f5f9',
      position: 'relative',
    }}>
      {ad.link_url ? (
        <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored" style={{ display: 'block' }}>
          {content}
        </a>
      ) : content}

      <span style={{
        position: 'absolute',
        bottom: '6px',
        right: '8px',
        fontSize: '0.5625rem',
        color: 'rgba(255,255,255,0.7)',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: '1px 6px',
        borderRadius: '3px',
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: '0.03em',
      }}>
        Ad
      </span>
    </div>
  )
}
