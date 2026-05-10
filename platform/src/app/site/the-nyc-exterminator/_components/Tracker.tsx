// @ts-nocheck
"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initSession, trackPageView, track } from "@/app/site/the-nyc-exterminator/_lib/tracker";

const SCROLL_MILESTONES = [25, 50, 75, 100];

export default function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
  const hitMilestones = useRef<Set<number>>(new Set());

  // Page view on route change
  useEffect(() => {
    initSession();
    trackPageView(fullPath);
    hitMilestones.current = new Set();
  }, [fullPath]);

  // Global click listener for CTAs and outbound links
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest<HTMLElement>("a, button, [data-cta]");
      if (!el) return;

      const cta = el.getAttribute("data-cta");
      if (cta) {
        track.cta(cta, {
          location: el.getAttribute("data-cta-location") || undefined,
          text: (el.textContent || "").trim().slice(0, 80),
        });
      }

      if (el.tagName === "A") {
        const a = el as HTMLAnchorElement;
        const href = a.getAttribute("href") || "";
        if (href.startsWith("tel:")) {
          track.outbound(href, { kind: "tel" });
        } else if (href.startsWith("sms:")) {
          track.outbound(href, { kind: "sms" });
        } else if (href.startsWith("mailto:")) {
          track.outbound(href, { kind: "mailto" });
        } else if (/^https?:\/\//i.test(href)) {
          try {
            const u = new URL(href);
            if (u.host !== window.location.host) {
              track.outbound(href, { kind: "external", host: u.host });
            }
          } catch {
            // ignore bad URLs
          }
        }
      }
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Scroll depth milestones
  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement;
      const scrolled = window.scrollY + window.innerHeight;
      const total = doc.scrollHeight;
      if (total <= 0) return;
      const pct = Math.min(100, Math.round((scrolled / total) * 100));
      for (const m of SCROLL_MILESTONES) {
        if (pct >= m && !hitMilestones.current.has(m)) {
          hitMilestones.current.add(m);
          track.scroll(m);
        }
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [fullPath]);

  return null;
}
