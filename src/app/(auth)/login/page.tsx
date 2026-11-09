import type { Metadata } from "next"
import Image from "next/image"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { Wordmark } from "@/components/app/wordmark"
import { Skeleton } from "@/components/ui/skeleton"
import { LoginForm } from "@/features/auth/components/login-form"
import { safeNextPath } from "@/lib/access"
import { getCurrentUser } from "@/lib/auth"

export const metadata: Metadata = { title: "Masuk" }

const NOTICES: Record<string, string> = {
  sesi: "Sesi kamu sudah berakhir. Silakan masuk lagi.",
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="relative isolate flex min-h-dvh items-end overflow-hidden bg-page sm:items-center">
      {/* Mockup login Nov 2026: foto box pasta di kiri, kartu masuk di kanan. */}
      <Image
        src="/images/brand/bg-login.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover object-[18%_center]"
      />

      <div className="w-full px-4 pt-[38vh] pb-8 sm:px-10 sm:py-12 lg:flex lg:justify-end lg:pr-[8vw]">
        <section className="mx-auto w-full max-w-[460px] rounded-[28px] border border-white/70 bg-card/95 px-6 py-8 shadow-[0_24px_60px_-28px_rgb(76_28_4/0.45)] backdrop-blur-sm sm:px-11 sm:py-11 lg:mx-0">
          <div className="flex justify-center">
            <Wordmark size="lg" />
          </div>

          <h1 className="mt-9 text-[28px] leading-tight font-bold text-brand">Masuk</h1>
          <p className="mt-1 text-[15px] text-text-body">Pakai email dan kata sandi dari Admin.</p>

          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginGate searchParams={searchParams} />
          </Suspense>

          <p className="mt-6 border-t border-border pt-5 text-center text-[13px] leading-relaxed text-text-body">
            Lupa kata sandi? Minta Admin mengatur ulang di Master Data, menu User / Staff.
          </p>
        </section>
      </div>
    </main>
  )
}

async function LoginGate({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams
  const next = safeNextPath(typeof params.next === "string" ? params.next : null)

  // User yang sudah login dengan profil aktif tidak perlu melihat form lagi.
  const user = await getCurrentUser()
  if (user) redirect(next)

  const reason = typeof params.alasan === "string" ? params.alasan : ""
  return <LoginForm next={next} notice={NOTICES[reason]} />
}

function LoginFormSkeleton() {
  return (
    <div className="mt-6 space-y-4" aria-hidden>
      <Skeleton className="h-[70px] w-full" />
      <Skeleton className="h-[70px] w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  )
}
