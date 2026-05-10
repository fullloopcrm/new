// @ts-nocheck
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

const VISITOR_KEY = "nycm_vid";
const SESSION_KEY = "nycm_sid";
const UTM_KEY = "nycm_utm";

type Utm = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

function getVisitorId(): string {
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v) {
      v = uuid();
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return uuid();
  }
}

function getSessionId(): string {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = uuid();
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return uuid();
  }
}

function getUtmForSession(searchParams: URLSearchParams): Utm {
  const keys: (keyof Utm)[] = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];
  const fresh: Utm = {};
  let hasFresh = false;
  for (const k of keys) {
    const v = searchParams.get(k);
    if (v) {
      fresh[k] = v;
      hasFresh = true;
    }
  }
  try {
    if (hasFresh) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const stored = sessionStorage.getItem(UTM_KEY);
    if (stored) return JSON.parse(stored) as Utm;
  } catch {}
  return {};
}

function sendEvent(
  event: string,
  extra: Record<string, unknown> = {},
  searchParams: URLSearchParams
) {
  try {
    const utm = getUtmForSession(searchParams);
    const payload = {
      event,
      path: typeof window !== "undefined" ? window.location.pathname : "",
      url: typeof window !== "undefined" ? window.location.href : "",
      referrer: typeof document !== "undefined" ? document.referrer : "",
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      ...utm,
      metadata: extra,
    };

    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/track", blob);
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
}

// Fire-and-forget event from anywhere in the app
export function trackEvent(name: string, metadata: Record<string, unknown> = {}) {
  const sp = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  sendEvent(name, metadata, sp);
}

function AnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef<string | null>(null);
  const scrollMarks = useRef<Set<number>>(new Set());
  const enterTime = useRef<number>(Date.now());

  // Pageview
  useEffect(() => {
    if (!pathname) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    scrollMarks.current = new Set();
    enterTime.current = Date.now();
    sendEvent("pageview", {}, new URLSearchParams(searchParams?.toString() || ""));
  }, [pathname, searchParams]);

  // Delegated click capture — CTAs (data-cta), tel/mailto, external, internal anchors, buttons
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Named CTA
      const cta = target.closest<HTMLElement>("[data-cta]");
      if (cta) {
        sendEvent(
          "cta_click",
          {
            name: cta.dataset.cta || "unknown",
            location: cta.dataset.ctaLocation || null,
            href: (cta as HTMLAnchorElement).href || null,
            text: (cta.textContent || "").trim().slice(0, 120),
          },
          new URLSearchParams(searchParams?.toString() || "")
        );
        return;
      }

      // Anchor classification
      const a = target.closest<HTMLAnchorElement>("a[href]");
      if (a) {
        const href = a.getAttribute("href") || "";
        const text = (a.textContent || "").trim().slice(0, 120);
        let name = "link_click";
        if (href.startsWith("tel:")) name = "phone_click";
        else if (href.startsWith("mailto:")) name = "email_click";
        else if (/^https?:\/\//i.test(href)) {
          try {
            const u = new URL(href);
            name = u.hostname === window.location.hostname ? "internal_link_click" : "external_link_click";
          } catch {
            name = "link_click";
          }
        } else {
          name = "internal_link_click";
        }
        sendEvent(
          name,
          { href, text },
          new URLSearchParams(searchParams?.toString() || "")
        );
        return;
      }

      // Button
      const btn = target.closest<HTMLButtonElement>("button");
      if (btn) {
        sendEvent(
          "button_click",
          {
            text: (btn.textContent || "").trim().slice(0, 120),
            type: btn.type || "button",
            name: btn.name || null,
          },
          new URLSearchParams(searchParams?.toString() || "")
        );
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [searchParams]);

  // Scroll depth (25/50/75/100)
  useEffect(() => {
    function onScroll() {
      if (typeof window === "undefined") return;
      const doc = document.documentElement;
      const height = doc.scrollHeight - window.innerHeight;
      if (height <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / height) * 100));
      const marks = [25, 50, 75, 100];
      for (const m of marks) {
        if (pct >= m && !scrollMarks.current.has(m)) {
          scrollMarks.current.add(m);
          sendEvent(
            "scroll_depth",
            { depth: m },
            new URLSearchParams(searchParams?.toString() || "")
          );
        }
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, searchParams]);

  // Time on page (pagehide)
  useEffect(() => {
    function onHide() {
      const dwell = Math.round((Date.now() - enterTime.current) / 1000);
      sendEvent(
        "page_leave",
        { dwell_seconds: dwell },
        new URLSearchParams(searchParams?.toString() || "")
      );
    }
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [searchParams]);

  // Rage clicks (3+ clicks in 500ms on same element)
  useEffect(() => {
    const clicks: { t: number; el: HTMLElement | null }[] = [];
    function onClick(e: MouseEvent) {
      const now = Date.now();
      const el = e.target as HTMLElement | null;
      clicks.push({ t: now, el });
      while (clicks.length && now - clicks[0].t > 500) clicks.shift();
      if (clicks.length >= 3 && clicks.every((c) => c.el === el)) {
        clicks.length = 0;
        sendEvent(
          "rage_click",
          {
            tag: el?.tagName || "",
            text: (el?.textContent || "").trim().slice(0, 120),
          },
          new URLSearchParams(searchParams?.toString() || "")
        );
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [searchParams]);

  return null;
}

export default function Analytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsInner />
    </Suspense>
  );
}
