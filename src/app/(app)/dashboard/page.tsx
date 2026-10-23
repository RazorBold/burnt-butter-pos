import type { Metadata } from "next"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { signOut } from "@/features/auth/actions"
import { ROLE_LABEL } from "@/lib/access"
import { requirePageAccess } from "@/lib/auth"

export const metadata: Metadata = { title: "Dashboard" }

// Isi dashboard menyusul di BELL-21..24; navbar dan menu profil (tempat tombol Keluar) di BELL-6.
export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-[1536px] px-8 py-10">
      <Suspense fallback={<GreetingSkeleton />}>
        <Greeting />
      </Suspense>
    </main>
  )
}

async function Greeting() {
  const user = await requirePageAccess("/dashboard")

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[32px] font-bold text-brand-ink">Halo, {user.name}!</h1>
        <p className="mt-1 text-text-body">
          Selamat datang di Burnt Butter &amp; Segelas Awan. Kamu masuk sebagai{" "}
          {ROLE_LABEL[user.role]}.
        </p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline" className="h-10 px-4">
          Keluar
        </Button>
      </form>
    </div>
  )
}

function GreetingSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />
    </div>
  )
}
