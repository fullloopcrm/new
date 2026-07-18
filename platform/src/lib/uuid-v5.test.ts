import { describe, it, expect } from 'vitest'
import { uuidV5 } from './uuid-v5'

const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

describe('uuidV5', () => {
  it('matches the RFC 4122 published test vector (DNS namespace + www.example.org)', () => {
    expect(uuidV5(DNS_NAMESPACE, 'www.example.org')).toBe('74738ff5-5367-5958-9aee-98fffdcd1876')
  })

  it('is deterministic — same namespace + name always yields the same id', () => {
    const a = uuidV5(DNS_NAMESPACE, 'same-input')
    const b = uuidV5(DNS_NAMESPACE, 'same-input')
    expect(a).toBe(b)
  })

  it('differs when the name differs', () => {
    expect(uuidV5(DNS_NAMESPACE, 'a')).not.toBe(uuidV5(DNS_NAMESPACE, 'b'))
  })

  it('differs when the namespace differs', () => {
    const otherNamespace = '00000000-0000-0000-0000-000000000000'
    expect(uuidV5(DNS_NAMESPACE, 'same')).not.toBe(uuidV5(otherNamespace, 'same'))
  })

  it('sets the version (5) and variant (RFC 4122) bits correctly', () => {
    const id = uuidV5(DNS_NAMESPACE, 'version-check')
    expect(id[14]).toBe('5')
    expect(['8', '9', 'a', 'b']).toContain(id[19])
  })
})
