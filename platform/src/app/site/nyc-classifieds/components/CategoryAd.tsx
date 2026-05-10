// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { slugify } from '@/app/site/nyc-classifieds/_lib/data'

interface Ad {
  id: number
  advertiser: string
  image_url: string
  link_url: string
}

interface Props {
  categorySlug: string
  borough: string
  neighborhood: string
}

export default function CategoryAd({ categorySlug, borough, neighborhood }: Props) {
  const [ad, setAd] = useState<Ad | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const boroughSlug = slugify(borough)
    const nhSlug = slugify(neighborhood)
    fetch(`/api/ads?type=category&category=${encodeURIComponent(categorySlug)}&borough=${encodeURIComponent(boroughSlug)}&neighborhood=${encodeURIComponent(nhSlug)}`)
      .then(r => r.json())
      .then(d => { if (d.ad) setAd(d.ad) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [categorySlug, borough, neighborhood])

  if (!loaded || !ad) {
    return (
      <div style={{
        width: '100%',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
        border: '1px dashed #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        marginBottom: '16px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af' }}>
            Ad space available
          </div>
          <div style={{ fontSize: '0.625rem', color: '#c4c9d1', marginTop: '2px' }}>
            Reach {neighborhood} shoppers
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
        objectFit: 'cover',
        borderRadius: '8px',
        display: 'block',
      }}
    />
  )

  return (
    <div style={{
      width: '100%',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: '#f9fafb',
      position: 'relative',
      marginBottom: '16px',
    }}>
      {ad.link_url ? (
        <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored" style={{ display: 'block' }}>
          {content}
        </a>
      ) : content}

      <span style={{
        position: 'absolute',
        bottom: '4px',
        right: '6px',
        fontSize: '0.5625rem',
        color: 'rgba(255,255,255,0.7)',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: '1px 5px',
        borderRadius: '3px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        Ad
      </span>
    </div>
  )
}
