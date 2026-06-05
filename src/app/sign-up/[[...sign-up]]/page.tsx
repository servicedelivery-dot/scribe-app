import { SignUp } from '@clerk/nextjs'
import Image from 'next/image'

export default function SignUpPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <Image src="/bg.png" alt="Airportr background" fill className="object-cover" priority />
      <div className="absolute inset-0 bg-[#001F5C]/70" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-8 py-5 flex items-center gap-3">
          <Image src="/logo.png" alt="Airportr" width={148} height={36} className="object-contain" />
          <div className="w-px h-8 bg-white/20" />
          <span className="text-white font-semibold text-sm tracking-wide">Academy</span>
        </div>
        <SignUp />
      </div>
    </div>
  )
}
