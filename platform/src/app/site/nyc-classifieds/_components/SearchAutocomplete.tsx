// @ts-nocheck
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { categories, boroughs, slugify, neighborhoodSlug } from '@/lib/data'

interface SearchAutocompleteProps {
  initialQuery?: string
  onSearch: (query: string) => void
  placeholder?: string
  autoFocus?: boolean
}

interface Suggestion {
  text: string
  url: string
  matchStart: number
  matchEnd: number
}

// Flatten data
const allSubs = categories.flatMap(c => c.subs)
const categoryNames = categories.map(c => c.name)
const boroughNames = boroughs.map(b => b.name)
const allNeighborhoods = boroughs.flatMap(b => b.neighborhoods)
const allTerms = [...new Set([...categoryNames, ...allSubs])]

// Lookup helpers
function findCategory(name: string) {
  return categories.find(c => c.name === name)
}
function findCategoryForSub(subName: string) {
  return categories.find(c => c.subs.includes(subName))
}
function findBorough(name: string) {
  return boroughs.find(b => b.name === name)
}
function findBoroughForNeighborhood(nhName: string) {
  return boroughs.find(b => b.neighborhoods.includes(nhName))
}

// Build the real URL for a suggestion
function buildUrl(text: string): string {
  const inIdx = text.toLowerCase().indexOf(' in ')
  if (inIdx !== -1) {
    const term = text.slice(0, inIdx).trim()
    const location = text.slice(inIdx + 4).trim()

    const cat = findCategory(term)
    const parentCat = !cat ? findCategoryForSub(term) : undefined
    const borough = findBorough(location)
    const nhBorough = !borough ? findBoroughForNeighborhood(location) : undefined

    if (cat && borough) {
      // "Jobs in Brooklyn" → /brooklyn/jobs
      return `/${borough.slug}/${cat.slug}`
    }
    if (cat && nhBorough) {
      // "Jobs in East Village" → /manhattan/east-village/jobs
      return `/${nhBorough.slug}/${neighborhoodSlug(location)}/${cat.slug}`
    }
    if (parentCat && borough) {
      // "Apartments in Brooklyn" → /brooklyn/housing/apartments
      // Route: /{borough}/{slug} where slug=category works, but there's no /{borough}/{cat}/{sub}
      // Best: /{borough}/{category} since /{borough}/{slug} handles categories
      return `/${borough.slug}/${parentCat.slug}`
    }
    if (parentCat && nhBorough) {
      // "Apartments in East Village" → /manhattan/east-village/housing/apartments
      return `/${nhBorough.slug}/${neighborhoodSlug(location)}/${parentCat.slug}/${slugify(term)}`
    }
  }

  // Plain term (no "in")
  const cat = findCategory(text)
  if (cat) return `/listings/${cat.slug}`

  const parentCat = findCategoryForSub(text)
  if (parentCat) return `/listings/${parentCat.slug}/${slugify(text)}`

  const borough = findBorough(text)
  if (borough) return `/${borough.slug}`

  return `/search?q=${encodeURIComponent(text)}`
}

// NYC abbreviation map
const nycAbbreviations: Record<string, string[]> = {
  'lic': ['Long Island City'],
  'ues': ['Upper East Side'],
  'uws': ['Upper West Side'],
  'les': ['Lower East Side'],
  'fidi': ['Financial District'],
  'bk': ['Brooklyn'],
  'si': ['Staten Island'],
  'ev': ['East Village'],
  'wv': ['West Village'],
  'bpc': ['Battery Park City'],
  'hk': ["Hell's Kitchen"],
  'soho': ['SoHo'],
  'noho': ['NoHo'],
  'dumbo': ['DUMBO'],
  'eny': ['East New York'],
  'dtown bk': ['Downtown Brooklyn'],
  'bed stuy': ['Bed-Stuy'],
  'bedstuy': ['Bed-Stuy'],
  'fh': ['Forest Hills'],
  'jh': ['Jackson Heights'],
  'ri': ['Roosevelt Island'],
}

// Strip conversational prefixes from natural language queries
// "I need a plumber" → "plumber", "find me apartments in brooklyn" → "apartments in brooklyn"
const nlPrefixes = [
  /^i(?:'m| am) looking for (?:a |an )?/i,
  /^i need (?:a |an |some )?/i,
  /^find me (?:a |an |some )?/i,
  /^looking for (?:a |an |some )?/i,
  /^where (?:can|do) i find (?:a |an |some )?/i,
  /^i want (?:a |an |to find |to get )?/i,
  /^show me (?:a |an |some )?/i,
  /^search for (?:a |an )?/i,
  /^get me (?:a |an |some )?/i,
  /^help me find (?:a |an |some )?/i,
  /^can you find (?:me )?(?:a |an |some )?/i,
  /^do you have (?:a |an |any )?/i,
  /^is there (?:a |an |any )?/i,
  /^are there (?:any )?/i,
  /^who (?:has|does|can) /i,
]

function stripNL(q: string): string {
  let cleaned = q.trim()
  for (const re of nlPrefixes) {
    cleaned = cleaned.replace(re, '')
  }
  // Remove trailing punctuation from voice
  cleaned = cleaned.replace(/[?.!]+$/, '').trim()
  return cleaned || q.trim()
}

// Rotating placeholder tips
const searchTips = [
  'apartments in east village',
  'landscaper in astoria',
  'cars in queens',
  'jobs in brooklyn',
  'plumber in park slope',
  'furniture in manhattan',
  'dog walker in harlem',
  'rooms in williamsburg',
  'electrician in the bronx',
  'bikes in greenpoint',
  'babysitter in cobble hill',
  'moving help in bushwick',
]

function matchesLocation(name: string, query: string): boolean {
  const nameLower = name.toLowerCase()
  const qLower = query.toLowerCase()
  if (nameLower.startsWith(qLower) || nameLower.includes(qLower)) return true
  const abbrevMatches = nycAbbreviations[qLower]
  if (abbrevMatches) return abbrevMatches.some(a => a.toLowerCase() === nameLower)
  return false
}

export default function SearchAutocomplete({ initialQuery = '', onSearch, placeholder, autoFocus = false }: SearchAutocompleteProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [open, setOpen] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [listening, setListening] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null)
  const [tipIdx, setTipIdx] = useState(0)
  const [hasSpeech, setHasSpeech] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // Detect speech support after mount (SSR-safe)
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SR) setHasSpeech(true)
  }, [])

  // Rotate placeholder tips
  useEffect(() => {
    if (placeholder) return
    const interval = setInterval(() => {
      setTipIdx(i => (i + 1) % searchTips.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [placeholder])

  const currentPlaceholder = placeholder || searchTips[tipIdx]

  // Eagerly computed base suggestions
  const baseSuggestions = useMemo(() => {
    const items: string[] = []
    for (const name of categoryNames) items.push(name)
    for (const sub of allSubs) items.push(sub)
    for (const term of allTerms) {
      for (const b of boroughNames) {
        items.push(`${term} in ${b}`)
      }
    }
    for (const name of boroughNames) items.push(name)
    return items
  }, [])

  // Lazy neighborhood combos
  const getNeighborhoodSuggestions = useCallback((term: string, location: string): string[] => {
    const results: string[] = []
    const termLower = term.toLowerCase()
    const matchingNeighborhoods = allNeighborhoods.filter(n => matchesLocation(n, location))
    const matchingBoroughs = boroughNames.filter(b => matchesLocation(b, location))

    for (const n of matchingNeighborhoods) {
      for (const t of allTerms) {
        if (t.toLowerCase().startsWith(termLower) || t.toLowerCase().includes(termLower)) {
          results.push(`${t} in ${n}`)
          if (results.length >= 20) return results
        }
      }
    }
    for (const b of matchingBoroughs) {
      for (const t of allTerms) {
        if (t.toLowerCase().startsWith(termLower) || t.toLowerCase().includes(termLower)) {
          const combo = `${t} in ${b}`
          if (!results.includes(combo)) results.push(combo)
          if (results.length >= 20) return results
        }
      }
    }
    return results
  }, [])

  const suggestions = useMemo((): Suggestion[] => {
    const raw = query.trim()
    if (!raw) return []

    const q = stripNL(raw)
    const inIdx = q.toLowerCase().indexOf(' in ')
    let candidates: string[]
    let matchTerm = q

    if (inIdx !== -1) {
      const term = q.slice(0, inIdx).trim()
      const location = q.slice(inIdx + 4).trim()
      if (location) {
        const termLower = term.toLowerCase()
        candidates = []
        for (const s of baseSuggestions) {
          const sLower = s.toLowerCase()
          const sInIdx = sLower.indexOf(' in ')
          if (sInIdx === -1) continue
          const sTerm = sLower.slice(0, sInIdx)
          if ((sTerm.startsWith(termLower) || sTerm.includes(termLower)) &&
              matchesLocation(s.slice(sInIdx + 4), location)) {
            candidates.push(s)
          }
        }
        const nhSuggestions = getNeighborhoodSuggestions(term, location)
        candidates.push(...nhSuggestions)
        matchTerm = term
      } else {
        const termLower = term.toLowerCase()
        candidates = baseSuggestions.filter(s => {
          const sLower = s.toLowerCase()
          const sInIdx = sLower.indexOf(' in ')
          if (sInIdx === -1) return false
          const sTerm = sLower.slice(0, sInIdx)
          return sTerm.startsWith(termLower) || sTerm.includes(termLower)
        })
        matchTerm = term
      }
    } else {
      const qLower = q.toLowerCase()
      candidates = baseSuggestions.filter(s => {
        const sLower = s.toLowerCase()
        return sLower.startsWith(qLower) || sLower.includes(qLower)
      })
    }

    // Dedupe
    const seen = new Set<string>()
    const unique: string[] = []
    for (const c of candidates) {
      const key = c.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(c)
      }
    }

    // Sort: best match first
    // Score: 0 = exact match, 1 = first word starts with query & is close length,
    //        2 = starts with query, 3 = contains query
    const qLower = matchTerm.toLowerCase()
    function score(s: string): number {
      const sLower = s.toLowerCase()
      // Extract just the term part (before " in ")
      const sIn = sLower.indexOf(' in ')
      const sTerm = sIn !== -1 ? sLower.slice(0, sIn) : sLower
      if (sTerm === qLower) return 0
      // First word of the term
      const firstWord = sTerm.split(/[\s&,]+/)[0]
      // "cars" for query "car" — first word starts with query and is very close
      if (firstWord.startsWith(qLower) && firstWord.length <= qLower.length + 2) return 1
      if (sTerm.startsWith(qLower)) return 2
      return 3
    }
    unique.sort((a, b) => {
      const sa = score(a), sb = score(b)
      if (sa !== sb) return sa - sb
      return a.length - b.length
    })

    return unique.slice(0, 7).map(text => {
      const textLower = text.toLowerCase()
      const idx = textLower.indexOf(qLower)
      return {
        text,
        url: buildUrl(text),
        matchStart: idx >= 0 ? idx : 0,
        matchEnd: idx >= 0 ? idx + qLower.length : 0,
      }
    })
  }, [query, baseSuggestions, getNeighborhoodSuggestions])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    setSelectedIdx(-1)
  }, [suggestions])

  // Navigate directly to suggestion URL
  const navigate = (suggestion: Suggestion) => {
    setOpen(false)
    setQuery(suggestion.text)
    router.push(suggestion.url)
  }

  // Free-text search fallback (no suggestion selected)
  const submitFreeText = () => {
    const trimmed = query.trim()
    if (!trimmed) return
    setOpen(false)
    const cleaned = stripNL(trimmed)
    // Try direct navigation first
    const url = buildUrl(cleaned)
    if (url && !url.startsWith('/search')) {
      router.push(url)
    } else {
      onSearch(cleaned)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        submitFreeText()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIdx(i => (i + 1) % suggestions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIdx(i => (i <= 0 ? suggestions.length - 1 : i - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIdx >= 0 && selectedIdx < suggestions.length) {
          navigate(suggestions[selectedIdx])
        } else {
          submitFreeText()
        }
        break
      case 'Escape':
        setOpen(false)
        setSelectedIdx(-1)
        break
    }
  }

  // Play a short beep to signal listening started
  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.value = 0.15
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.stop(ctx.currentTime + 0.15)
      // Second beep (higher) after a tiny gap
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.frequency.value = 1320
      gain2.gain.value = 0.15
      osc2.start(ctx.currentTime + 0.12)
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc2.stop(ctx.currentTime + 0.3)
      setTimeout(() => ctx.close(), 500)
    } catch { /* no audio context available */ }
  }, [])

  // Pause any media playing on the page
  const pauseMedia = useCallback(() => {
    document.querySelectorAll('audio, video').forEach((el) => {
      if (!(el as HTMLMediaElement).paused) (el as HTMLMediaElement).pause()
    })
  }, [])

  // Core recognition starter (called after mic permission is secured)
  const launchRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    pauseMedia()

    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onaudiostart = () => {
      playBeep()
      setVoiceStatus('Listening... speak now')
    }

    recognition.onspeechstart = () => {
      setVoiceStatus('Hearing you...')
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string
      const cleaned = stripNL(transcript)
      setQuery(cleaned)
      setOpen(true)
      setVoiceStatus(null)
      const url = buildUrl(cleaned)
      if (url && !url.startsWith('/search')) {
        router.push(url)
      } else {
        onSearch(cleaned)
      }
    }

    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
      setTimeout(() => setVoiceStatus(null), 1500)
    }

    recognition.onerror = (e: any) => {
      recognitionRef.current = null
      setListening(false)
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        setVoiceStatus('Mic blocked — tap the lock icon in your address bar and allow microphone')
      } else if (e?.error === 'no-speech') {
        setVoiceStatus('No speech detected — tap the mic and try again')
      } else if (e?.error === 'network') {
        setVoiceStatus('Network error — check connection')
      } else if (e?.error === 'aborted') {
        setVoiceStatus(null)
        return
      } else {
        setVoiceStatus('Voice error — tap the mic and try again')
      }
      setTimeout(() => setVoiceStatus(null), 10000)
    }

    recognitionRef.current = recognition
    setListening(true)
    setVoiceStatus('Starting mic...')
    try {
      recognition.start()
    } catch {
      setListening(false)
      setVoiceStatus('Voice not supported in this browser')
      recognitionRef.current = null
      setTimeout(() => setVoiceStatus(null), 10000)
    }
  }, [pauseMedia, playBeep, router, onSearch])

  const startVoice = async () => {
    // Toggle off if already listening
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
      setListening(false)
      setVoiceStatus(null)
      return
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setVoiceStatus('Voice search is not supported in this browser — try Chrome or Safari')
      setTimeout(() => setVoiceStatus(null), 10000)
      return
    }

    // Check mic permission state first
    let permState: string | null = null
    try {
      const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      permState = perm.state
    } catch { /* permissions API not available, proceed anyway */ }

    if (permState === 'denied') {
      // Already explicitly denied — give clear instructions
      setVoiceStatus('Microphone is blocked. Click the lock icon next to the URL, find Microphone, and set it to Allow. Then tap the mic again.')
      setTimeout(() => setVoiceStatus(null), 10000)
      return
    }

    if (permState === 'prompt' || permState === null) {
      // First time or unknown — request mic access via getUserMedia to trigger the browser prompt
      setVoiceStatus('Allow microphone access when your browser asks...')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // Got access — stop the stream immediately, then start recognition
        stream.getTracks().forEach(t => t.stop())
        launchRecognition()
      } catch {
        setVoiceStatus('Microphone access was denied. To enable: click the lock icon next to the URL, find Microphone, set it to Allow, then tap the mic again.')
        setTimeout(() => setVoiceStatus(null), 10000)
      }
      return
    }

    // Permission is 'granted' — go straight to recognition
    launchRecognition()
  }

  const renderHighlighted = (s: Suggestion) => {
    const { text, matchStart, matchEnd } = s
    if (matchStart === matchEnd) return text
    return (
      <>
        {text.slice(0, matchStart)}
        <strong>{text.slice(matchStart, matchEnd)}</strong>
        {text.slice(matchEnd)}
      </>
    )
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', maxWidth: '480px', width: '100%' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => { if (query.trim()) setOpen(true) }}
            onKeyDown={handleKeyDown}
            placeholder={currentPlaceholder}
            autoFocus={autoFocus}
            aria-label="Search classifieds in New York City"
            autoComplete="off"
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-haspopup="listbox"
            style={{
              width: '100%',
              padding: '10px 16px',
              paddingRight: hasSpeech ? '44px' : '16px',
              borderRadius: '8px',
              border: '1px solid #1a56db',
              fontSize: '0.9375rem',
              fontFamily: "'DM Sans', sans-serif",
              outline: 'none',
              color: '#111827',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
            }}
          />
          {hasSpeech && (
            <button
              type="button"
              onClick={startVoice}
              aria-label={listening ? 'Stop voice search' : 'Start voice search'}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: listening ? 'rgba(220,38,38,0.08)' : 'none',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: listening ? 'mic-pulse 1s infinite' : 'none',
                transition: 'background 0.2s',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={listening ? '#dc2626' : 'none'} stroke={listening ? '#dc2626' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={submitFreeText}
          style={{
            backgroundColor: 'transparent',
            color: '#1a56db',
            padding: '10px 16px',
            borderRadius: '6px',
            border: '1px solid #1a56db',
            fontSize: '0.875rem',
            fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Search
        </button>
      </div>

      {voiceStatus && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          marginTop: '6px',
          backgroundColor: listening ? '#fef2f2' : '#f3f4f6',
          border: `1px solid ${listening ? '#fecaca' : '#e5e7eb'}`,
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontFamily: "'DM Sans', sans-serif",
          color: listening ? '#dc2626' : '#374151',
          animation: listening ? 'mic-pulse 1.5s infinite' : 'none',
        }}>
          {listening && (
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626', flexShrink: 0 }} />
          )}
          {voiceStatus}
        </div>
      )}

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            listStyle: 'none',
            padding: '4px 0',
            zIndex: 50,
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.text}
              role="option"
              aria-selected={i === selectedIdx}
              onMouseDown={(e) => { e.preventDefault(); navigate(s) }}
              onMouseEnter={() => setSelectedIdx(i)}
              style={{
                padding: '8px 14px',
                fontSize: '0.875rem',
                fontFamily: "'DM Sans', sans-serif",
                color: '#111827',
                cursor: 'pointer',
                backgroundColor: i === selectedIdx ? '#f3f4f6' : 'transparent',
              }}
            >
              {renderHighlighted(s)}
            </li>
          ))}
        </ul>
      )}

      {listening && (
        <style>{`
          @keyframes mic-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      )}
    </div>
  )
}
