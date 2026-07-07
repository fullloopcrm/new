import { describe, it, expect } from 'vitest'
import { applyPreset, resolveMapping, buildRows, detectPreset, getPreset, normHeader, CRM_PRESETS } from './crm-presets'

describe('normHeader', () => {
  it('lowercases and strips non-alphanumerics', () => {
    expect(normHeader('First Name')).toBe('firstname')
    expect(normHeader('E-mail Address')).toBe('emailaddress')
    expect(normHeader('  Phone # ')).toBe('phone')
  })
})

describe('applyPreset — clients', () => {
  it('combines first + last name into a single name field (Jobber-style)', () => {
    const preset = getPreset('jobber')!
    const headers = ['First Name', 'Last Name', 'Phone', 'Email']
    const rows = [['Jane', 'Doe', '212-555-1212', 'jane@x.com']]
    const { rows: out, mappedFields } = applyPreset(preset, 'clients', headers, rows)
    expect(out[0].name).toBe('Jane Doe')
    expect(out[0].phone).toBe('212-555-1212')
    expect(out[0].email).toBe('jane@x.com')
    expect(mappedFields).toContain('name')
  })

  it('folds split address parts into one address string', () => {
    const preset = getPreset('jobber')!
    const headers = ['First Name', 'Street', 'City', 'Province', 'Postal Code']
    const rows = [['Sam', '5 Main St', 'Brooklyn', 'NY', '11201']]
    const { rows: out } = applyPreset(preset, 'clients', headers, rows)
    expect(out[0].address).toBe('5 Main St, Brooklyn, NY, 11201')
  })

  it('maps Housecall Pro verified headers (Display name, Mobile number, Emails)', () => {
    const preset = getPreset('housecall-pro')!
    const headers = ['Display name', 'Mobile number', 'Emails', 'Service address', 'Lead source']
    const rows = [['Acme LLC', '9175551234', 'a@acme.com', '1 Park Ave, NY', 'Google']]
    const { rows: out } = applyPreset(preset, 'clients', headers, rows)
    expect(out[0].name).toBe('Acme LLC')
    expect(out[0].phone).toBe('9175551234')
    expect(out[0].email).toBe('a@acme.com')
    expect(out[0].address).toBe('1 Park Ave, NY')
    expect(out[0].source).toBe('Google')
  })

  it('leaves unrecognized headers unmapped rather than guessing', () => {
    const preset = getPreset('generic')!
    const headers = ['name', 'phone', 'WeirdCustomColumn']
    const rows = [['Jo', '5551212', 'xyz']]
    const { unmappedHeaders } = applyPreset(preset, 'clients', headers, rows)
    expect(unmappedHeaders).toContain('WeirdCustomColumn')
    expect(unmappedHeaders).not.toContain('name')
  })

  it('drops empty values instead of emitting blank keys', () => {
    const preset = getPreset('generic')!
    const headers = ['name', 'email']
    const rows = [['Jo', '']]
    const { rows: out } = applyPreset(preset, 'clients', headers, rows)
    expect(out[0].name).toBe('Jo')
    expect('email' in out[0]).toBe(false)
  })
})

describe('applyPreset — schedules', () => {
  it('maps common schedule headers', () => {
    const preset = getPreset('generic')!
    const headers = ['Client Name', 'Client Phone', 'Start', 'Duration Hours', 'Service', 'Price']
    const rows = [['Jane Doe', '5551212', '2026-07-10 09:00', '2', 'Deep Clean', '129']]
    const { rows: out } = applyPreset(preset, 'schedules', headers, rows)
    expect(out[0].client_name).toBe('Jane Doe')
    expect(out[0].start).toBe('2026-07-10 09:00')
    expect(out[0].duration_hours).toBe('2')
    expect(out[0].service_type).toBe('Deep Clean')
    expect(out[0].price).toBe('129')
  })
})

describe('resolveMapping + buildRows (operator-editable plan)', () => {
  it('resolves a composite name plan to two indices', () => {
    const preset = getPreset('jobber')!
    const plan = resolveMapping(preset, 'clients', ['First Name', 'Last Name', 'Phone'])
    expect(plan.fields.name).toEqual([0, 1])
    expect(plan.fields.phone).toEqual([2])
  })

  it('honors an operator override of the plan when building rows', () => {
    const headers = ['First Name', 'Last Name', 'Nickname']
    const rows = [['Jane', 'Doe', 'JD']]
    // Operator decided the name should come from the Nickname column (index 2).
    const plan = { fields: { name: [2] }, unmappedHeaders: [] }
    expect(buildRows(headers, rows, plan)[0].name).toBe('JD')
  })

  it('does not double-consume a column across two fields', () => {
    const preset = getPreset('generic')!
    const plan = resolveMapping(preset, 'clients', ['name', 'phone'])
    const allIdx = Object.values(plan.fields).flat()
    expect(new Set(allIdx).size).toBe(allIdx.length)
  })
})

describe('detectPreset', () => {
  it('ranks the best-matching platform first', () => {
    const headers = ['Display name', 'Mobile number', 'Emails', 'Service address', 'Lead source']
    const ranked = detectPreset('clients', headers)
    expect(ranked[0].preset.id).toBe('housecall-pro')
    expect(ranked[0].score).toBeGreaterThan(0)
  })

  it('excludes the generic catch-all from scoring', () => {
    const ranked = detectPreset('clients', ['name', 'phone'])
    expect(ranked.every((r) => r.preset.id !== 'generic')).toBe(true)
  })
})

describe('preset integrity', () => {
  it('every preset has a clients alias set and export steps', () => {
    for (const p of CRM_PRESETS) {
      expect(Object.keys(p.clients).length).toBeGreaterThan(0)
      expect(p.exportSteps.length).toBeGreaterThan(0)
    }
  })

  it('only housecall-pro is marked verified (headers confirmed from docs)', () => {
    const verified = CRM_PRESETS.filter((p) => p.verified).map((p) => p.id)
    expect(verified).toEqual(['housecall-pro'])
  })
})
