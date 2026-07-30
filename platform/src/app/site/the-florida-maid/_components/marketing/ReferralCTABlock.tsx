import Link from 'next/link'

export default function ReferralCTABlock() {
  return (
    <section className="bg-[#A8F0DC] py-20">
      <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#CC6222] tracking-wide">
            Start Earning Today
          </h2>
          <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#CC6222]/60 tracking-wide">
            Empieza a Ganar Hoy
          </h3>
          <p className="text-[#CC6222]/70 text-lg mt-2">
            Sign up in 30 seconds and start sharing your referral link.
          </p>
          <p className="text-[#CC6222]/50 italic mt-1">
            Regístrate en 30 segundos y empieza a compartir tu enlace de referido.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
          <Link href="/referral/signup" className="bg-[#CC6222] text-white px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#CC6222]/90 transition-colors text-center">
            Join Now / Únete Ahora
          </Link>
          <a href="sms:9547103636" className="border-2 border-[#CC6222] text-[#CC6222] px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#CC6222] hover:text-white transition-colors text-center">
            Text / Texto 954.710.3636
          </a>
        </div>
      </div>
    </section>
  )
}
