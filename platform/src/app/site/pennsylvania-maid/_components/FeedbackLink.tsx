import Link from 'next/link'

export default function FeedbackLink({ className = '' }: { className?: string }) {
  return (
    <div className={`text-center py-4 ${className}`}>
      <Link href="/feedback" className="inline-block bg-red-600 text-yellow-300 px-5 py-2.5 rounded-md font-bold text-sm tracking-wide uppercase hover:bg-red-700 transition-colors shadow-sm">
        Feedback | Suggestions?
      </Link>
    </div>
  )
}
