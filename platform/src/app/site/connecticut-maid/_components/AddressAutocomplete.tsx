'use client'
import { useState, useEffect, useRef } from 'react'

interface AddressResult {
  formattedAddress: string
  addressLabel: string
  street: string
  number: string
  city: string
  state: string
  stateCode: string
  postalCode: string
  borough?: string
}

interface AddressAutocompleteProps {
  value?: string
  onChange?: (value: string) => void
  onSelect?: (address: { address_line1: string; city: string; state: string; zip: string }) => void
  initialValue?: string
  placeholder?: string
  className?: string
}

export default function AddressAutocomplete({ value, onChange, onSelect, initialValue = '', placeholder, className }: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value || initialValue)
  const [results, setResults] = useState<AddressResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const RADAR_KEY = process.env.NEXT_PUBLIC_RADAR_API_KEY || ''

  // Sync with external value
  useEffect(() => {
    if (value !== undefined && value !== query) {
      setQuery(value)
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchAddress = async (q: string) => {
    if (q.length < 3) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://api.radar.io/v1/search/autocomplete?query=${encodeURIComponent(q)}&country=US&layers=address`,
        { headers: { Authorization: RADAR_KEY } }
      )
      const data = await res.json()
      if (data.addresses) {
        setResults(data.addresses.slice(0, 5))
        setShowDropdown(true)
      }
    } catch (e) {
      console.error('Radar error:', e)
    }
    setLoading(false)
  }

  const handleInputChange = (val: string) => {
    setQuery(val)
    onChange?.(val)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => searchAddress(val), 300)
  }

  const handleSelect = (addr: AddressResult) => {
    const line1 = addr.number ? `${addr.number} ${addr.street}` : addr.addressLabel
    const fullAddress = `${line1}, ${addr.city || addr.borough}, ${addr.stateCode} ${addr.postalCode}`
    setQuery(fullAddress)
    setShowDropdown(false)
    onChange?.(fullAddress)
    onSelect?.({
      address_line1: line1,
      city: addr.borough || addr.city || '',
      state: addr.stateCode || addr.state || '',
      zip: addr.postalCode || ''
    })
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        placeholder={placeholder || "Start typing address..."}
        className={className || "w-full px-4 py-3 border rounded-lg text-black"}
      />
      {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">...</span>}
      
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((addr, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(addr)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <p className="text-black font-medium text-sm">{addr.addressLabel}</p>
              <p className="text-gray-500 text-xs">{addr.city}, {addr.stateCode} {addr.postalCode}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
