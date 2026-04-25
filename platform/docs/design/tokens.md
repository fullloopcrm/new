# Full Loop — Design Tokens (v2.4)

The canonical token list extracted from `the-loop-frame.html`. This is the
brand language for **both** backend (dashboard) and frontend (tenant sites,
client portal, team portal). Anything ad-hoc that drifts from this list is a
bug, not a variant.

## Color

| Token            | Hex        | Usage                                              |
|------------------|------------|----------------------------------------------------|
| `--bg`           | `#F4F4F1`  | Page background. Cream, never pure white.          |
| `--canvas`       | `#FFFFFF`  | Card / panel surfaces.                             |
| `--ink`          | `#1C1C1C`  | Primary text + sidebar bg + masthead rule.         |
| `--graphite`     | `#3A3A3A`  | Secondary text, body italic quotes.                |
| `--muted`        | `#7A7A78`  | Tertiary text, stat-sub.                           |
| `--muted-2`      | `#A8A8A4`  | Quaternary, sidebar default text, mark glyphs.     |
| `--line`         | `#C8C5BC`  | Strong borders.                                    |
| `--line-soft`    | `#E4E2DC`  | Soft borders (key caps, inner dividers).           |
| `--good`         | `#1F4D2C`  | Forest green. Up-arrows, live dots, pulse.        |
| `--warn`         | `#8B4513`  | Saddle brown. Overdue / at-risk. NOT red.          |

Sidebar (dark) palette:
- bg `#1C1C1C`, border `#2E2E2E`, default text `#A8A8A4`,
  brand white `#F4F4F1`, section labels `#5A5A5A`,
  scroll thumb `#333`, hover bg `rgba(255,255,255,0.025)`.

## Typography

```
--display: 'Fraunces', Georgia, serif        // headlines, big numbers
--body:    -apple-system, BlinkMacSystemFont  // body
--mono:    'JetBrains Mono', monospace        // labels, dates, badges, key caps
```

Sizes that appear:
- Masthead title: 44px / weight 500 / letter-spacing -0.03em
- Stat value: 38px / weight 500 / letter-spacing -0.025em / `tnum lnum`
- Card title: 22px / weight 500 / letter-spacing -0.02em
- Body: 14px
- Stat-sub: 11.5px
- Stat-label / bar-label: 9.5–10px uppercase, letter-spacing 0.18em
- Mono badges: 10–10.5px, letter-spacing 0.04–0.1em

## Layout rhythm

- App grid: `240px sidebar | 1fr main`
- Main padding: `16px 48px 100px` (bottom 100px to clear the sticky AI bar)
- Max content width: 1500px

Bar pattern (used for stat sections):
- Bar label: mono 10px uppercase + `border-bottom: 1px solid var(--ink)`
  underlined on a 100px slug
- Stats grid: `repeat(5, 1fr)` for full bar, or `repeat(3, 1fr)` for half
- Vertical divider rule: `border-right: 1px solid var(--line)` between stats
- Section divider rule: `border-bottom: 1px solid var(--line)` after each bar

Card grid (action tiles):
- `repeat(4, 1fr)` with `gap: 1px` and a wrapping `1px solid var(--line)`
  border so the gap reads as hairlines
- Card padding: `24px 26px`, `min-height: 130px`
- Card num (mono 10.5px) → card title (display 22px) → desc (12px muted)
- Hover: bg shifts to `#FBFBF8`, arrow slides in from left

## Components

### Sticky Selena AI bar (every page)
- Fixed bottom 16px, left 256px, right 32px, max-width 920px, centered
- White at 96% with 8px backdrop blur
- 1px ink border + soft drop shadow
- Brand: green pulsing dot + "Selena" in display 14px
- Input flush, no border, body font
- Suggestion chips: mono 10.5px, line border, soft bg
- Cmd/ key cap on the right
- Send button: 32px ink square, white arrow

### Notifications (in sidebar)
- 5px colored dot (warn `#E8A04A` / good `#4ADE80` / info `#6A6A66`)
- Single-line truncated text + mono time stamp on right
- Seen items at 0.5 opacity
- "Read all activity →" footer in mono 10px

### Status footer
- Green pulsing dot + "All systems operational" in mono 10.5px
- "Send feedback" link below with ✦ accent in `#E8A04A`

### Quote block (masthead)
- Display italic 16px, color graphite
- Curly mark glyph at -2px / -6px in muted-2 32px
- Mono attr ("— Walt Disney") in 10.5px uppercase

## Animations

- `pulse` (live dot): 2s linear infinite, opacity 1 → 0.4 → 1
- `pulse-dot` (Selena bar dot): box-shadow expanding ring on the green
- Card-arrow hover: opacity 0 → 1, translateX(-4px) → 0, 180ms ease

## Anti-patterns (don't do these)

- Pure white page bg (always cream `--bg`)
- Red for warn (use `--warn` saddle brown)
- Sans-serif headlines (always Fraunces)
- Cmd-K command palette (replaced by Selena AI bar — natural language wins)
- Stand-alone notifications page (notifications live in the sidebar)
- Generic dashboard cards with shadows (we use hairline 1px gaps, no shadows
  except on the floating AI bar)

## Reference

- `platform/docs/design/the-loop-frame.html` — full HTML mockup of The Loop page
