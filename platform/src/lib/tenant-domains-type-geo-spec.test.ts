/**
 * Executable contract for 068/069_tenant_domains_type_geo.{sql,backfill.sql}
 * (P1/W1 refill loop — the `type`/`neighborhood`/`zip_codes` gap).
 *
 * SOURCE OF TRUTH: the three files read from disk below. Mirrors the
 * nullable-first / backfill / enforce discipline already pinned by
 * tenant-domains-routing-spec.test.ts + tenant-domains-enforce-spec.test.ts
 * for the 055/056 pair.
 *
 * WHY A TEST, NOT A MIGRATION RUN: W1 does not run DB commands; 068/069 are
 * gated DDL the leader applies after approval. There is no live schema to
 * probe, so this asserts the decidable text contract of the files on disk.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url)) // .../src/lib
const addSrc = readFileSync(resolve(HERE, 'migrations/068_tenant_domains_type_geo.sql'), 'utf8')
const backfillSrc = readFileSync(resolve(HERE, 'migrations/068_tenant_domains_type_geo.backfill.sql'), 'utf8')
const enforceSrc = readFileSync(resolve(HERE, 'migrations/069_tenant_domains_type_geo_enforce.sql'), 'utf8')

describe('068 add — type/neighborhood/zip_codes added nullable, no inline default', () => {
  it('type is added with a CHECK domain of exactly {primary, neighborhood, generic}', () => {
    expect(addSrc).toMatch(/add column if not exists type text/)
    expect(addSrc).toMatch(/check\s*\(type in \('primary',\s*'neighborhood',\s*'generic'\)\)/)
  })

  it('neighborhood and zip_codes are added, nullable, with no CHECK/backfill source implied', () => {
    expect(addSrc).toMatch(/add column if not exists neighborhood text/)
    expect(addSrc).toMatch(/add column if not exists zip_codes text\[\]/)
  })

  it('none of the three columns is added NOT NULL or with an inline default (nullable-first)', () => {
    for (const decl of [
      addSrc.match(/add column if not exists type text[^;]*/i)?.[0] ?? '',
      addSrc.match(/add column if not exists neighborhood text[^;]*/i)?.[0] ?? '',
      addSrc.match(/add column if not exists zip_codes text\[\][^;]*/i)?.[0] ?? '',
    ]) {
      expect(decl).not.toBe('')
      expect(decl.toLowerCase()).not.toContain('default')
      expect(decl.toLowerCase()).not.toContain('not null')
    }
  })
})

// ---------------------------------------------------------------------------
// The is_primary -> type backfill mapping, as a decision function mirroring
// the SQL: `case when is_primary then 'primary' else 'generic' end`.
// 'neighborhood' is intentionally never reachable from this backfill (no
// signal for it from is_primary alone).
// ---------------------------------------------------------------------------
function backfilledType(isPrimary: boolean): 'primary' | 'generic' {
  return isPrimary ? 'primary' : 'generic'
}

describe('068 backfill — is_primary -> type mapping', () => {
  it('is_primary=true backfills to type primary', () => {
    expect(backfilledType(true)).toBe('primary')
  })
  it('is_primary=false backfills to type generic', () => {
    expect(backfilledType(false)).toBe('generic')
  })
  it('backfill never yields neighborhood (reserved for a future data-owning pass)', () => {
    expect([backfilledType(true), backfilledType(false)]).not.toContain('neighborhood')
  })
  it('the backfill SQL encodes exactly that case expression', () => {
    expect(backfillSrc).toMatch(/set type = case when is_primary then 'primary' else 'generic' end/)
  })
  it('the backfill does NOT touch neighborhood or zip_codes (no source of truth to assert from)', () => {
    expect(backfillSrc).not.toMatch(/set\s+neighborhood\s*=/)
    expect(backfillSrc).not.toMatch(/set\s+zip_codes\s*=/)
  })
  it('the backfill fails loud (raise exception) if any row is still type IS NULL afterward', () => {
    expect(backfillSrc).toMatch(/raise exception/)
    expect(backfillSrc).toMatch(/where type is null/)
  })
})

describe('069 enforce — guards, then sets default + NOT NULL on type only', () => {
  it('refuses to enforce when any row still has type IS NULL', () => {
    expect(enforceSrc).toMatch(/raise exception/)
    expect(enforceSrc).toMatch(/where\s+type is null/)
  })

  it('sets a forward default of \'generic\' for new inserts', () => {
    expect(enforceSrc).toMatch(/alter column type set default 'generic'/)
  })

  it('enforces NOT NULL on type', () => {
    expect(enforceSrc).toMatch(/alter column type set not null/)
  })

  it('does NOT enforce NOT NULL or a default on neighborhood/zip_codes (no source of truth)', () => {
    expect(enforceSrc).not.toMatch(/alter column neighborhood/)
    expect(enforceSrc).not.toMatch(/alter column zip_codes/)
  })
})
