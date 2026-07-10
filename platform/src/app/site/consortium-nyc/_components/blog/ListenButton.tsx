"use client";

import { useState, useEffect, useCallback } from "react";

export default function ListenButton() {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);

    const loadVoices = () => {
      const v = speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.cancel();
    };
  }, []);

  const pickVoice = useCallback(() => {
    // Prefer enhanced/premium macOS voices that sound human
    const preferred = [
      "Samantha (Enhanced)",
      "Samantha",
      "Karen (Enhanced)",
      "Karen",
      "Daniel (Enhanced)",
      "Daniel",
      "Alex",
      "Zarvox", // skip this one actually
      "Google UK English Female",
      "Google US English",
      "Microsoft Zira",
      "Microsoft Mark",
    ];
    for (const name of preferred) {
      if (name === "Zarvox") continue;
      const v = voices.find(
        (v) => v.name === name || (v.name.includes(name) && v.lang.startsWith("en"))
      );
      if (v) return v;
    }
    // Fallback: any English voice, prefer ones with "Enhanced" or "Premium"
    const enhanced = voices.find(
      (v) => v.lang.startsWith("en") && (v.name.includes("Enhanced") || v.name.includes("Premium"))
    );
    if (enhanced) return enhanced;
    return voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
  }, [voices]);

  const getArticleText = useCallback(() => {
    const article = document.querySelector("article");
    if (!article) return "";
    const clone = article.cloneNode(true) as HTMLElement;
    // Remove CTA boxes and nav buttons
    clone.querySelectorAll("a.inline-block, div.mt-12, div.mt-16").forEach((el) => el.remove());
    // Remove the listen button itself
    clone.querySelectorAll("button").forEach((el) => el.remove());
    return clone.innerText?.replace(/\n{3,}/g, "\n\n").trim() || "";
  }, []);

  // Chrome has a bug where speech stops after ~15s. Workaround: chunk text and speak sequentially.
  const speakText = useCallback(
    (text: string) => {
      const voice = pickVoice();
      // Split into chunks at sentence boundaries, ~200 chars each
      const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
      const chunks: string[] = [];
      let current = "";
      for (const s of sentences) {
        if ((current + s).length > 200 && current) {
          chunks.push(current.trim());
          current = s;
        } else {
          current += s;
        }
      }
      if (current.trim()) chunks.push(current.trim());

      let index = 0;

      const speakNext = () => {
        if (index >= chunks.length) {
          setPlaying(false);
          setPaused(false);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        utterance.rate = 0.92;
        utterance.pitch = 1.0;
        if (voice) utterance.voice = voice;
        utterance.onend = () => {
          index++;
          speakNext();
        };
        utterance.onerror = () => {
          setPlaying(false);
          setPaused(false);
        };
        speechSynthesis.speak(utterance);
      };

      speakNext();
    },
    [pickVoice]
  );

  const handlePlay = useCallback(() => {
    if (!supported) return;

    if (paused) {
      speechSynthesis.resume();
      setPaused(false);
      return;
    }

    if (playing) {
      speechSynthesis.pause();
      setPaused(true);
      return;
    }

    speechSynthesis.cancel();
    const text = getArticleText();
    if (!text) return;

    setPlaying(true);
    setPaused(false);
    speakText(text);
  }, [supported, paused, playing, getArticleText, speakText]);

  const handleStop = useCallback(() => {
    speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
  }, []);

  if (!supported) return null;

  return (
    <div className="flex items-center gap-2.5 mb-8">
      <button
        onClick={handlePlay}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 hover:border-teal-300 bg-white text-sm text-slate-700 hover:text-teal-600 transition-all shadow-sm"
      >
        {playing && !paused ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
            </svg>
            <span className="font-semibold font-cta">Pause</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="font-semibold font-cta">{paused ? "Resume" : "Listen to Article"}</span>
          </>
        )}
      </button>

      {(playing || paused) && (
        <button
          onClick={handleStop}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-full border border-slate-200 hover:border-red-300 bg-white text-sm text-slate-500 hover:text-red-500 transition-all shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
          <span className="font-semibold font-cta">Stop</span>
        </button>
      )}

      {playing && !paused && (
        <span className="flex items-center gap-[3px] ml-1">
          <span className="w-[3px] h-3 bg-teal-500 rounded-full animate-pulse" />
          <span className="w-[3px] h-4 bg-teal-500 rounded-full animate-pulse [animation-delay:150ms]" />
          <span className="w-[3px] h-2.5 bg-teal-500 rounded-full animate-pulse [animation-delay:300ms]" />
          <span className="w-[3px] h-5 bg-teal-500 rounded-full animate-pulse [animation-delay:100ms]" />
          <span className="w-[3px] h-3 bg-teal-500 rounded-full animate-pulse [animation-delay:250ms]" />
        </span>
      )}
    </div>
  );
}
