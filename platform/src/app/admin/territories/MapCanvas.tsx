'use client'

/**
 * Leaflet canvas for the territory map. Loaded via next/dynamic({ssr:false})
 * so leaflet's window access never runs on the server. Renders 3,144 county
 * polygons colored by the selected category's claim status, plus tenant pins.
 */
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip } from 'react-leaflet'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import 'leaflet/dist/leaflet.css'

export type ClaimStatus = 'available' | 'pending' | 'claimed'

export interface TenantPin {
  id: string
  name: string
  lat: number
  lng: number
  industry: string | null
}

interface Props {
  countyToTerritory: Record<string, string>
  /** territory_id -> status for the selected category. Missing = available. */
  territoryStatus: Record<string, ClaimStatus>
  pins: TenantPin[]
  onCountyClick: (territoryId: string, countyName: string, fips: string) => void
}

const COLORS: Record<ClaimStatus | 'unknown', string> = {
  available: '#10b981',
  pending: '#f59e0b',
  claimed: '#ef4444',
  unknown: '#cbd5e1', // light slate — outside the 50 states (PR etc.)
}

export default function MapCanvas({
  countyToTerritory,
  territoryStatus,
  pins,
  onCountyClick,
}: Props) {
  const [counties, setCounties] = useState<FeatureCollection | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/geo/counties-10m.json')
      .then((r) => r.json())
      .then((topo) => {
        if (cancelled) return
        const fc = feature(topo, topo.objects.counties) as unknown as FeatureCollection
        setCounties(fc)
      })
      .catch(() => setCounties(null))
    return () => {
      cancelled = true
    }
  }, [])

  const fipsToStatus = useMemo(() => {
    return (fips: string): ClaimStatus | 'unknown' => {
      const terr = countyToTerritory[fips]
      if (!terr) return 'unknown'
      return territoryStatus[terr] ?? 'available'
    }
  }, [countyToTerritory, territoryStatus])

  // Remount the GeoJSON layer when status coloring changes (style fn is read at mount).
  const layerKey = useMemo(
    () => `${Object.keys(territoryStatus).length}:${Object.keys(countyToTerritory).length}`,
    [territoryStatus, countyToTerritory],
  )

  function styleFn(f?: Feature<Geometry>) {
    const fips = String(f?.id ?? '')
    const status = fipsToStatus(fips)
    return {
      fillColor: COLORS[status],
      fillOpacity: status === 'unknown' ? 0.3 : 0.72,
      color: '#ffffff',
      weight: 0.4,
    }
  }

  return (
    <MapContainer
      center={[38, -96]}
      zoom={4}
      minZoom={3}
      maxZoom={10}
      preferCanvas
      style={{ height: '100%', width: '100%', background: '#e8edf1' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
      />
      {counties && (
        <GeoJSON
          key={layerKey}
          data={counties}
          style={styleFn as never}
          onEachFeature={(f, layer) => {
            const fips = String(f.id ?? '')
            const terr = countyToTerritory[fips]
            const name = (f.properties?.name as string) ?? 'County'
            layer.on('click', () => {
              if (terr) onCountyClick(terr, name, fips)
            })
            layer.bindTooltip(name, { sticky: true })
          }}
        />
      )}
      {pins.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={5}
          pathOptions={{ color: '#fafafa', fillColor: '#6366f1', fillOpacity: 1, weight: 1.5 }}
        >
          <Tooltip>
            {p.name}
            {p.industry ? ` · ${p.industry}` : ''}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
