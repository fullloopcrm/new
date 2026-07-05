// Surgically escape JSX unescaped entities flagged by react/no-unescaped-entities.
// For each flagged (line,column) we replace ONLY that single character with its
// HTML entity, applying edits right-to-left / bottom-up so earlier offsets stay
// valid. Renders identically; nothing else in the file is touched.
//
// Usage: node scripts/fix-unescaped-entities.mjs <file> [<file> ...]
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const ENTITY = { "'": '&apos;', '"': '&quot;', '’': '&rsquo;', '“': '&ldquo;', '”': '&rdquo;' }

for (const file of process.argv.slice(2)) {
  let report
  try {
    const out = execSync(`npx eslint ${JSON.stringify(file)} -f json`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 })
    report = JSON.parse(out)
  } catch (e) {
    // eslint exits non-zero when problems exist; stdout still holds the JSON.
    report = JSON.parse(e.stdout || '[]')
  }
  const msgs = (report[0]?.messages || []).filter((m) => m.ruleId === 'react/no-unescaped-entities')
  if (!msgs.length) { console.log(`0  ${file}`); continue }

  const lines = readFileSync(file, 'utf8').split('\n')
  // Sort bottom-up, right-to-left.
  msgs.sort((a, b) => (b.line - a.line) || (b.column - a.column))
  let fixed = 0
  for (const m of msgs) {
    const li = m.line - 1
    const ci = m.column - 1
    const line = lines[li]
    if (line == null) continue
    const ch = line[ci]
    const ent = ENTITY[ch]
    if (!ent) continue // unexpected char at that column — skip rather than corrupt
    lines[li] = line.slice(0, ci) + ent + line.slice(ci + 1)
    fixed++
  }
  writeFileSync(file, lines.join('\n'))
  console.log(`${fixed}  ${file}`)
}
