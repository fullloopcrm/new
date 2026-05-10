// @ts-nocheck
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

export function getTrackIds(): {
  visitor_id?: string;
  session_id?: string;
} & Utm {
  if (typeof window === "undefined") return {};
  try {
    const visitor_id = localStorage.getItem(VISITOR_KEY) || undefined;
    const session_id = sessionStorage.getItem(SESSION_KEY) || undefined;
    const utmRaw = sessionStorage.getItem(UTM_KEY);
    const utm: Utm = utmRaw ? (JSON.parse(utmRaw) as Utm) : {};
    return { visitor_id, session_id, ...utm };
  } catch {
    return {};
  }
}
