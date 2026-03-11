import { randomBytes } from 'crypto'

export function generateToken(): string {
  return randomBytes(16).toString('hex')
}

export function isTokenValid(expiresAt: string): boolean {
  return new Date(expiresAt) > new Date()
}
