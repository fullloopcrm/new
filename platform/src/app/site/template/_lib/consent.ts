/**
 * Re-exports the shared consent core (`src/lib/consent/consent.ts`) under the
 * template's historical import path, so existing template code keeps working
 * unchanged. New tenant integrations should import from `@/lib/consent/consent`
 * directly.
 */
export * from '@/lib/consent/consent'
