import { TenantPrivacyPolicy } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Privacy Policy | The NYC Exterminator' }

const identity = { name: 'The NYC Exterminator', url: 'https://thenycexterminator.com', email: 'hello@thenycexterminator.com', phone: '212-202-8545' }

export default function PrivacyPolicyPage() {
  return <TenantPrivacyPolicy identity={identity} />
}
