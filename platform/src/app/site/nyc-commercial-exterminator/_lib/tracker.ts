// Browser-side tracker. Persists a session id and ships events to /api/track.

const SESSION_KEY = "nyce_sid";
const SESSION_META_KEY = "nyce_sid_meta";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes of inactivity = new session

type TrackPayload = {
  type: string;
  name?: string;
  meta?: Record<string, unknown>;
};

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "sid_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readSession(): { id: string; isNew: boolean } {
  if (typeof window === "undefined") return { id: "", isNew: false };
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    const metaRaw = localStorage.getItem(SESSION_META_KEY);
    const meta = metaRaw ? (JSON.parse(metaRaw) as { last: number }) : null;
    const now = Date.now();
    if (existing && meta && now - meta.last < SESSION_TTL_MS) {
      localStorage.setItem(SESSION_META_KEY, JSON.stringify({ last: now }));
      return { id: existing, isNew: false };
    }
    const id = uuid();
    localStorage.setItem(SESSION_KEY, id);
    localStorage.setItem(SESSION_META_KEY, JSON.stringify({ last: now }));
    return { id, isNew: true };
  } catch {
    return { id: uuid(), isNew: true };
  }
}

function parseUtm() {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const pick = (k: string) => p.get(k) || undefined;
  return {
    utm_source: pick("utm_source"),
    utm_medium: pick("utm_medium"),
    utm_campaign: pick("utm_campaign"),
    utm_term: pick("utm_term"),
    utm_content: pick("utm_content"),
    gclid: pick("gclid"),
    fbclid: pick("fbclid"),
  };
}

function detectDevice(ua: string): string {
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return "desktop";
}

async function send(body: Record<string, unknown>) {
  try {
    const payload = JSON.stringify(body);
    const url = "/api/track";
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Swallow: tracking must never break the page.
  }
}

export function getSessionId(): string {
  return readSession().id;
}

export function initSession(): void {
  if (typeof window === "undefined") return;
  const { id, isNew } = readSession();
  if (!isNew) return;
  const nav = window.navigator;
  send({
    kind: "session",
    session: {
      id,
      referrer: document.referrer || null,
      landing_path: window.location.pathname + window.location.search,
      user_agent: nav.userAgent,
      language: nav.language,
      screen_w: window.screen?.width ?? null,
      screen_h: window.screen?.height ?? null,
      device: detectDevice(nav.userAgent),
      ...parseUtm(),
    },
  });
}

export function trackPageView(path?: string, title?: string): void {
  if (typeof window === "undefined") return;
  const { id } = readSession();
  send({
    kind: "pageview",
    session_id: id,
    path: path ?? window.location.pathname + window.location.search,
    title: title ?? document.title,
    referrer: document.referrer || null,
  });
}

export function trackEvent({ type, name, meta }: TrackPayload): void {
  if (typeof window === "undefined") return;
  const { id } = readSession();
  send({
    kind: "event",
    session_id: id,
    type,
    name,
    meta,
    path: window.location.pathname + window.location.search,
  });
}

export const track = {
  cta: (name: string, meta?: Record<string, unknown>) =>
    trackEvent({ type: "cta_click", name, meta }),
  outbound: (href: string, meta?: Record<string, unknown>) =>
    trackEvent({ type: "outbound_click", name: href, meta }),
  scroll: (depth: number) =>
    trackEvent({ type: "scroll_depth", name: String(depth), meta: { depth } }),
  formOpen: (formType: string) =>
    trackEvent({ type: "form_open", name: formType }),
  formAbandon: (formType: string, lastField?: string) =>
    trackEvent({ type: "form_abandon", name: formType, meta: { lastField } }),
  formSuccess: (formType: string, meta?: Record<string, unknown>) =>
    trackEvent({ type: "form_success", name: formType, meta }),
  formError: (formType: string, meta?: Record<string, unknown>) =>
    trackEvent({ type: "form_error", name: formType, meta }),
};
