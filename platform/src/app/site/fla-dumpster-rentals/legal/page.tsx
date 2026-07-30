import { TenantLegalHub } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Legal | FLA Dumpster Rentals' }

const identity = { name: 'FLA Dumpster Rentals', url: 'https://fladumpsterrentals.com' }

export default function LegalPage() {
  return <TenantLegalHub identity={identity} />
}
