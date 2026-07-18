/**
 * Per-tenant theme → CSS custom properties.
 *
 * The template's design is fixed; only the brand palette varies per tenant. We
 * resolve the tenant's colors in getSiteConfig() (theme.primary from
 * tenant.primary_color, theme.accent from secondary_color, with neutral
 * defaults) and inject them ONCE at the layout root as CSS variables. Every
 * component then reads var(--brand) etc., so a single color value re-themes the
 * whole site with zero per-component edits and no rebuild.
 *
 * We also derive a contrast-safe foreground for text/icons placed ON the brand
 * or accent color — a naive single-color swap is what produces unreadable
 * white-on-pale buttons; picking black/white by luminance prevents that.
 */
import type { SiteTheme } from './types'
import { safeColor } from '@/lib/safe-color'

/** Relative luminance (WCAG) of a #rrggbb color, 0 (black) … 1 (white). */
function luminance(hex: string): number {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return 0
  const chan = (h: string) => {
    const c = parseInt(h, 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * chan(m[1]) + 0.7152 * chan(m[2]) + 0.0722 * chan(m[3])
}

/** Readable text color to place on top of `bg`. */
function foregroundOn(bg: string): string {
  // Threshold ~0.4 keeps mid-tone brand colors legible with white text while
  // flipping to near-black on light accents (e.g. a pale mint).
  return luminance(bg) > 0.4 ? '#111827' : '#FFFFFF'
}

/** '#1E2A4A' -> '30 42 74' (space-separated channels for rgb(var(--x)/α)). */
function rgbChannels(hex: string): string {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return '0 0 0'
  return `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}`
}

/**
 * Build the `:root { --brand: … }` CSS block for a tenant's theme. Returned as a
 * plain string to inline in a <style> tag at the layout root (server-rendered
 * per tenant). Falls back to the neutral defaults already present in `theme`.
 */
export function buildThemeCss(theme: SiteTheme): string {
  const primary = safeColor(theme.primary, '#2563eb')
  const primaryAlt = safeColor(theme.primaryAlt ?? theme.primary, primary)
  const accent = safeColor(theme.accent, '#0d9488')
  const accentHover = safeColor(theme.accentHover ?? theme.accent, accent)
  const surface = safeColor(theme.surface, '#FFFFFF')

  const vars: Record<string, string> = {
    '--brand': primary,
    '--brand-alt': primaryAlt,
    '--brand-fg': foregroundOn(primary),
    '--accent': accent,
    '--accent-hover': accentHover,
    '--accent-fg': foregroundOn(accent),
    '--surface': surface,
    // RGB channels so Tailwind opacity modifiers survive the swap, e.g.
    // bg-[rgb(var(--brand-rgb)/0.7)] replaces bg-[rgb(var(--brand-rgb)/0.7)].
    '--brand-rgb': rgbChannels(primary),
    '--brand-alt-rgb': rgbChannels(primaryAlt),
    '--accent-rgb': rgbChannels(accent),
    '--accent-hover-rgb': rgbChannels(accentHover),
    '--surface-rgb': rgbChannels(surface),
  }

  const body = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
  return `:root{${body}}`
}
