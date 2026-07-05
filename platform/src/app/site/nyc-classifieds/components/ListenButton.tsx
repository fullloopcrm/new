'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface ListenButtonProps {
  paragraphs: string[]
  onParagraphChange?: (index: number | null) => void
}

export default function ListenButton({ paragraphs, onParagraphChange }: ListenButtonProps) {
  const [playing, setPlaying] = useState(false)
  const [supported, setSupported] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const stoppedRef = useRef(false)

  // Pick the most natural-sounding free voice available
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    setSupported(true)

    const pickVoice = () => {
      const voices = speechSynthesis.getVoices()
      if (!voices.length) return

      // Ranked by natural sound quality (best first)
      const preferred = [
        'Microsoft Aria Online',    // Windows — very natural
        'Microsoft Jenny Online',   // Windows — natural female
        'Microsoft Guy Online',     // Windows — natural male
        'Google US English',        // Chrome — solid quality
        'Samantha',                 // macOS — Siri-quality
        'Karen',                    // macOS — Australian, clear
        'Daniel',                   // macOS — British, clear
        'Alex',                     // macOS — male
      ]

      for (const name of preferred) {
        const match = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'))
        if (match) {
          voiceRef.current = match
          return
        }
      }

      // Fallback: best English voice
      const english = voices.find(v => v.lang.startsWith('en-US'))
        || voices.find(v => v.lang.startsWith('en'))
      if (english) voiceRef.current = english
    }

    pickVoice()
    speechSynthesis.onvoiceschanged = pickVoice
  }, [])

  const stop = useCallback(() => {
    stoppedRef.current = true
    speechSynthesis.cancel()
    setPlaying(false)
    onParagraphChange?.(null)
  }, [onParagraphChange])

  const play = useCallback(() => {
    if (!supported) return

    // Strip markdown formatting for clean speech
    const clean = (s: string) =>
      s
        .replace(/##\s?/g, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^- /gm, '')
        .replace(/^\d+\.\s/gm, '')
        .replace(/\n+/g, '. ')
        .replace(/\s+/g, ' ')
        .trim()

    stoppedRef.current = false
    setPlaying(true)

    const outro = 'Thank you for listening to this article by The NYC Classifieds. We appreciate your time.'

    const speakOutro = () => {
      if (stoppedRef.current) return
      onParagraphChange?.(null)
      const utterance = new SpeechSynthesisUtterance(outro)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      if (voiceRef.current) utterance.voice = voiceRef.current
      utterance.onend = () => {
        setPlaying(false)
      }
      utterance.onerror = () => {
        setPlaying(false)
      }
      speechSynthesis.speak(utterance)
    }

    const speakParagraph = (i: number) => {
      if (stoppedRef.current) {
        setPlaying(false)
        onParagraphChange?.(null)
        return
      }
      if (i >= paragraphs.length) {
        setTimeout(speakOutro, 500)
        return
      }

      const text = clean(paragraphs[i])
      if (!text) {
        speakParagraph(i + 1)
        return
      }

      onParagraphChange?.(i)

      // Split long paragraphs into chunks (speechSynthesis has length limits)
      const chunks: string[] = []
      const sentences = text.split(/(?<=[.!?])\s+/)
      let current = ''
      for (const s of sentences) {
        if ((current + ' ' + s).length > 200) {
          if (current) chunks.push(current.trim())
          current = s
        } else {
          current += ' ' + s
        }
      }
      if (current.trim()) chunks.push(current.trim())

      const speakChunk = (j: number) => {
        if (stoppedRef.current) return
        if (j >= chunks.length) {
          // Brief pause between paragraphs for natural pacing
          setTimeout(() => speakParagraph(i + 1), 300)
          return
        }

        const utterance = new SpeechSynthesisUtterance(chunks[j])
        utterance.rate = 0.95
        utterance.pitch = 1.0
        if (voiceRef.current) utterance.voice = voiceRef.current
        utterance.onend = () => speakChunk(j + 1)
        utterance.onerror = () => {
          setPlaying(false)
          onParagraphChange?.(null)
        }
        speechSynthesis.speak(utterance)
      }

      speakChunk(0)
    }

    speakParagraph(0)
  }, [supported, paragraphs, onParagraphChange])

  const toggle = useCallback(() => {
    if (playing) stop()
    else play()
  }, [playing, stop, play])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) speechSynthesis.cancel()
    }
  }, [])

  if (!supported) return null

  return (
    <button
      onClick={toggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '20px',
        border: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        color: playing ? '#dc2626' : '#2563eb',
        fontSize: '0.8125rem',
        fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif",
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {playing ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
          Stop
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          Listen
        </>
      )}
    </button>
  )
}
