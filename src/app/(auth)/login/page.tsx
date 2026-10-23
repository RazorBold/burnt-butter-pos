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
    <main className="relative isolate flex min-h-dvh items-start overflow-hidden bg-page lg:items-center">
      <Image
        src="/images/brand/bg-beige.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover object-[right_top]"
      />

      {/* Di layar tegak, gambar diperbesar mengikuti tinggi layar sehingga box pasta mengisi
          ±30% bagian atas; konten dimulai di bawahnya supaya wordmark tidak menimpa ilustrasi. */}
      <div className="w-full px-4 pt-[31vh] pb-12 sm:px-10 lg:py-12 lg:pl-[9vw]">
        <div className="mx-auto w-full max-w-[380px] lg:mx-0">
          <Wordmark size="lg" />

          <section className="mt-6 rounded-2xl border border-border bg-card/95 p-6 sm:p-8 lg:mt-8">
            <h1 className="text-xl font-semibold text-brand-ink">Masuk</h1>
            <p className="mt-1 text-sm text-text-body">Pakai email dan kata sandi dari Admin.</p>

            <Suspense fallback={<LoginFormSkeleton />}>
              <LoginGate searchParams={searchParams} />
            </Suspense>

            <p className="mt-5 border-t border-border pt-4 text-[13px] leading-relaxed text-text-body">
              Lupa kata sandi? Minta Admin mengatur ulang di Master Data, menu User / Staff.
            </p>
          </section>
        </div>
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
