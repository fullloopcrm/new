import { TenantPrivacyPolicy } from '@/components/legal/TenantLegalPages'

export const metadata = { title: 'Privacy Policy | The NYC Mobile Salon' }

const identity = { name: 'The NYC Mobile Salon', url: 'https://thenycmobilesalon.com', email: 'thenycmobilesalon@gmail.com' }

export default function PrivacyPolicyPage() {
  return <TenantPrivacyPolicy identity={identity} />
}
