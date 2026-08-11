import { Anton, IBM_Plex_Mono } from 'next/font/google'

// Display face for the streetwear-editorial layoutVariant only — oversized,
// condensed, high-impact headlines. Kept separate from the template's shared
// Bebas Neue/Inter pair (layout.tsx) so no other tenant's bundle picks it up.
export const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton' })
// Mono face for prices/SKUs/labels — the boutique-catalog detail that reads
// as "designed," not a default Tailwind card grid.
export const plexMono = IBM_Plex_Mono({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-plex-mono' })
