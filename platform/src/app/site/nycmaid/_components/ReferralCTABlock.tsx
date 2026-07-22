import Link from 'next/link'

export default function ReferralCTABlock() {
  return (
    <section className="bg-[#A8F0DC] py-20">
      <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide">
            Start Earning Today
          </h2>
          <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A]/60 tracking-wide">
            Empieza a Ganar Hoy
          </h3>
          <p className="text-[#1E2A4A]/70 text-lg mt-2">
            Sign up in 30 seconds and start sharing your referral link.
          </p>
          <p className="text-[#1E2A4A]/50 italic mt-1">
            Regístrate en 30 segundos y empieza a compartir tu enlace de referido.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
          <Link href="/referral/signup" className="bg-[#1E2A4A] text-white px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors text-center">
            Join Now / Únete Ahora
          </Link>
          <a href="sms:2122028400" className="border-2 border-[#1E2A4A] text-[#1E2A4A] px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A] hover:text-white transition-colors text-center">
            Text / Texto 212.202.8400
          </a>
        </div>
      </div>
    </section>
  )
}
