import FeedbackWidget from '@/components/FeedbackWidget'
import ClientErrorMonitor from '@/components/monitoring/ClientErrorMonitor'

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FeedbackWidget source="Referral Portal" />
      <ClientErrorMonitor slug="nycmaid" />
    </>
  )
}
