'use client'
import { useEffect, useRef } from 'react'

interface Website {
  domain: string
  location: string
  region: string
  url: string
  lat?: number
  lng?: number
}

interface WebsitesMapProps {
  websites: Website[]
}

declare global {
  interface Window {
    L: any
  }
}

export default function WebsitesMap({ websites }: WebsitesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const getRegionColor = (region: string) => {
    const colors: Record<string, string> = {
      'Manhattan': '#3b82f6',
      'Brooklyn': '#10b981',
      'Queens': '#f59e0b',
      'Long Island': '#8b5cf6',
      'New Jersey': '#ec4899',
      'Florida': '#ef4444',
      'NYC Metro': '#6366f1',
      'National': '#64748b'
    }
    return colors[region] || '#000000'
  }

  // Initialize map once
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return

    const initMap = () => {
      // Add Leaflet CSS if not already present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      // Load Leaflet JS
      if (!window.L) {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.async = false
        
        script.onload = () => {
          createMap()
        }
        
        document.head.appendChild(script)
      } else {
        createMap()
      }
    }

    const createMap = () => {
      if (!window.L || !mapRef.current || mapInstanceRef.current) return

      // Create map
      const map = window.L.map(mapRef.current).setView([40.7589, -73.9851], 10)

      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(map)

      mapInstanceRef.current = map
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
        } catch (e) {
          console.error('Error cleaning up map:', e)
        }
      }
    }
  }, []) // Only run once on mount

  // Update markers when websites change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return

    const map = mapInstanceRef.current

    // Clear existing markers
    markersRef.current.forEach(marker => {
      try {
        marker.remove()
      } catch (e) {
        console.error('Error removing marker:', e)
      }
    })
    markersRef.current = []

    // Add new markers
    const bounds: any[] = []
    
    websites.forEach((site) => {
      if (site.lat && site.lng) {
        const color = getRegionColor(site.region)
        
        // Custom marker HTML
        const iconHtml = `
          <div style="
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: ${color};
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `
        
        const icon = window.L.divIcon({
          className: 'custom-marker',
          html: iconHtml,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          popupAnchor: [0, -10]
        })

        const marker = window.L.marker([site.lat, site.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="padding: 8px; min-width: 150px;">
              <strong style="color: #000; display: block; margin-bottom: 4px;">${site.location}</strong>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">${site.domain}</p>
              <a href="${site.url}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #0066cc; text-decoration: none;">Visit →</a>
            </div>
          `)

        markersRef.current.push(marker)
        bounds.push([site.lat, site.lng])
      }
    })

    // Fit map to show all markers
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] })
    } else {
      // If no markers, reset to NYC
      map.setView([40.7589, -73.9851], 10)
    }
  }, [websites]) // Update whenever websites change

  return (
    <div>
      <div 
        ref={mapRef} 
        className="w-full h-[1000px] rounded-lg border border-gray-200 bg-gray-100"
      />
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center">
        {['Manhattan', 'Brooklyn', 'Queens', 'Long Island', 'New Jersey', 'Florida', 'NYC Metro', 'National'].map(region => (
          <div key={region} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border border-white shadow"
              style={{ backgroundColor: getRegionColor(region) }}
            />
            <span className="text-sm text-gray-600">{region}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
