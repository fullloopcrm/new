import FeedbackWidget from '@/components/FeedbackWidget'
import TenantAnalyticsScript from '@/components/analytics/TenantAnalyticsScript'
import ClientErrorMonitor from '@/components/monitoring/ClientErrorMonitor'

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FeedbackWidget source="Client Portal" />
      <TenantAnalyticsScript slug="nycmaid" />
      <ClientErrorMonitor slug="nycmaid" />
    </>
  )
}
