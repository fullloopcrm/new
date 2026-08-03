import FeedbackLink from '@/app/site/nycmaid/_components/FeedbackLink'

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FeedbackLink />
    </>
  )
}
