// Remove `@ts-nocheck` directives, then (driven by a tsc run) restore them only
// where the file genuinely still needs suppression. Two modes:
//   node strip-dead-tsnocheck.mjs strip   < list-of-files-on-stdin
//   node strip-dead-tsnocheck.mjs restore < list-of-files-to-restore-on-stdin
// Backups of every stripped file are kept under /tmp/tsnocheck-bak/ keyed by a
// flattened path, so a removal is always reversible.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'

const BAK = '/tmp/tsnocheck-bak'
mkdirSync(BAK, { recursive: true })
const key = (f) => `${BAK}/${f.replace(/[\/]/g, '__')}`
const isDirective = (l) => /^\s*(\/\/|\/\*)\s*@ts-nocheck\s*(\*\/)?\s*$/.test(l)

const mode = process.argv[2]
const files = readFileSync(0, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean)

let n = 0
for (const f of files) {
  if (mode === 'strip') {
    const src = readFileSync(f, 'utf8')
    const lines = src.split('\n')
    const idx = lines.findIndex((l, i) => i < 5 && isDirective(l))
    if (idx === -1) continue
    writeFileSync(key(f), src) // backup full original
    lines.splice(idx, 1)
    writeFileSync(f, lines.join('\n'))
    n++
  } else if (mode === 'restore') {
    if (!existsSync(key(f))) continue
    writeFileSync(f, readFileSync(key(f), 'utf8'))
    n++
  }
}
console.log(`${mode}: ${n} files`)
