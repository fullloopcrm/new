/**
 * Signed companion header for x-tenant-id. Only middleware holds the secret,
 * so a caller who puts x-tenant-id on a raw request cannot also mint a matching
 * x-tenant-sig. Downstream helpers must verify the sig before trusting the id.
 *
 * Pure-JS HMAC-SHA256 so this works in both the Edge Runtime (middleware) and
 * the Node runtime (route handlers). Node's `crypto` module is unavailable in
 * Edge Runtime; using it here was crashing every custom-domain request.
 */

function getSecret(): string {
  const s =
    process.env.TENANT_HEADER_SIG_SECRET ||
    process.env.ADMIN_TOKEN_SECRET ||
    process.env.PORTAL_SECRET
  if (!s) {
    throw new Error(
      'TENANT_HEADER_SIG_SECRET (or ADMIN_TOKEN_SECRET / PORTAL_SECRET fallback) is required.',
    )
  }
  return s
}

function rotr(x: number, n: number): number { return ((x >>> n) | (x << (32 - n))) >>> 0 }

function sha256(data: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ]
  const bitLen = data.length * 8
  const padLen = ((data.length + 9 + 63) & ~63) - data.length
  const padded = new Uint8Array(data.length + padLen)
  padded.set(data, 0)
  padded[data.length] = 0x80
  const dv = new DataView(padded.buffer)
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000))
  dv.setUint32(padded.length - 4, bitLen >>> 0)

  const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19])
  const W = new Uint32Array(64)

  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = (padded[chunk+i*4]<<24)|(padded[chunk+i*4+1]<<16)|(padded[chunk+i*4+2]<<8)|padded[chunk+i*4+3]
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i-15],7) ^ rotr(W[i-15],18) ^ (W[i-15]>>>3)
      const s1 = rotr(W[i-2],17) ^ rotr(W[i-2],19) ^ (W[i-2]>>>10)
      W[i] = (W[i-16] + s0 + W[i-7] + s1) >>> 0
    }
    let a=H[0], b=H[1], c=H[2], d=H[3], e=H[4], f=H[5], g=H[6], h=H[7]
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0
      const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22)
      const mj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + mj) >>> 0
      h=g; g=f; f=e
      e=(d+t1)>>>0
      d=c; c=b; b=a
      a=(t1+t2)>>>0
    }
    H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0
    H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0
  }

  const out = new Uint8Array(32)
  for (let i = 0; i < 8; i++) {
    out[i*4]   = (H[i] >>> 24) & 0xff
    out[i*4+1] = (H[i] >>> 16) & 0xff
    out[i*4+2] = (H[i] >>>  8) & 0xff
    out[i*4+3] =  H[i]         & 0xff
  }
  return out
}

function hmacSha256(keyStr: string, msg: string): Uint8Array {
  const enc = new TextEncoder()
  let keyBytes: Uint8Array = enc.encode(keyStr)
  if (keyBytes.length > 64) keyBytes = sha256(keyBytes)
  const k = new Uint8Array(64)
  k.set(keyBytes)
  const oKey = new Uint8Array(64)
  const iKey = new Uint8Array(64)
  for (let i = 0; i < 64; i++) {
    oKey[i] = k[i] ^ 0x5c
    iKey[i] = k[i] ^ 0x36
  }
  const innerInput = new Uint8Array(64 + msg.length)
  innerInput.set(iKey, 0)
  innerInput.set(enc.encode(msg), 64)
  const inner = sha256(innerInput)
  const outerInput = new Uint8Array(64 + 32)
  outerInput.set(oKey, 0)
  outerInput.set(inner, 64)
  return sha256(outerInput)
}

function bytesToHex(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0')
  return s
}

export function signTenantHeader(tenantId: string): string {
  return bytesToHex(hmacSha256(getSecret(), tenantId))
}

export function verifyTenantHeaderSig(tenantId: string, sig: string | null | undefined): boolean {
  if (!sig || !tenantId) return false
  const expected = signTenantHeader(tenantId)
  if (expected.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  return diff === 0
}
