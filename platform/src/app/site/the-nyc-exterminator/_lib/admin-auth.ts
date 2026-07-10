import crypto from "crypto";

const COOKIE_NAME = "nyce_admin";

function getSecret(): string {
  return process.env.ADMIN_AUTH_SECRET || process.env.ADMIN_PASSWORD || "";
}

function sign(value: string): string {
  const secret = getSecret();
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function buildAuthCookie(): { name: string; value: string; maxAge: number } {
  const value = sign("authed");
  return { name: COOKIE_NAME, value, maxAge: 60 * 60 * 24 * 7 };
}

export function cookieIsValid(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const expected = sign("authed");
  if (!expected) return false;
  try {
    const a = Buffer.from(cookieValue);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function checkPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD || "";
  if (!pw) return false;
  try {
    const a = Buffer.from(input);
    const b = Buffer.from(pw);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
