/**
 * Retry engine with exponential backoff.
 * Used for SMS, email, and any external API call that can transiently fail.
 */

export interface RetryOptions {
  maxAttempts?: number     // default 3
  baseDelayMs?: number     // default 1000 (1s)
  maxDelayMs?: number      // default 30000 (30s)
  onRetry?: (attempt: number, error: unknown) => void
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    onRetry,
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === maxAttempts) break

      // Don't retry on 4xx client errors (bad request, auth, not found)
      if (isClientError(error)) break

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs)
      onRetry?.(attempt, error)
      await sleep(delay)
    }
  }

  throw lastError
}

function isClientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    // Don't retry auth failures, bad requests, or validation errors
    if (msg.includes('401') || msg.includes('403') || msg.includes('400') || msg.includes('404')) {
      return true
    }
    if (msg.includes('invalid') || msg.includes('unauthorized') || msg.includes('forbidden')) {
      return true
    }
  }
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
