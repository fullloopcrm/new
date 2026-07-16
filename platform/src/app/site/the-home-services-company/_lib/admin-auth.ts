import { cookies } from "next/headers";
import { safeEqual, signWithSecret } from "@/lib/secret-compare";

const COOKIE_NAME = "admin_session";

// Session value = a fixed marker signed with ADMIN_PASSWORD as secret, not the
// unsigned literal "authenticated" that used to sit here — that let anyone set
// admin_session=authenticated on their own request and pass isAdminAuthenticated()
// with zero credentials, since only a plain === check gated it, not a secret.
// signWithSecret throws if ADMIN_PASSWORD is unset (fail closed) rather than
// signing with a publicly-computable key. This module currently has no live
// login route wired to it (dead code), but is hardened to the same pattern as
// the other site-clone admin-auth modules so it isn't a footgun if reactivated.
function sessionValue(): string {
  return signWithSecret("authenticated", process.env.ADMIN_PASSWORD);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session?.value) return false;
  try {
    return safeEqual(session.value, sessionValue());
  } catch {
    return false;
  }
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(password, expected);
}

export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
