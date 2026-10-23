import type { Metadata } from "next"

export const metadata: Metadata = { title: "Dashboard" }

// Placeholder sampai BELL-6 (navbar) dan BELL-21..24 (isi dashboard) dikerjakan.
export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-[1536px] px-8 py-10">
      <h1 className="text-[32px] font-bold text-brand-ink">Halo, Admin!</h1>
      <p className="mt-1 text-text-body">Selamat datang di Burnt Butter &amp; Segelas Awan.</p>
    </main>
  )
}
