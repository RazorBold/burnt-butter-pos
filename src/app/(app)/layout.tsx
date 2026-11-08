import { Suspense, type ReactNode } from "react"

import { AppNavbar } from "@/components/app/app-navbar"
import { Wordmark } from "@/components/app/wordmark"
import { Skeleton } from "@/components/ui/skeleton"
import { ChatDock } from "@/features/chat/components/chat-dock"
import { listChatMembers } from "@/features/chat/queries"
import { UrgentWatcher } from "@/features/urgent/components/urgent-watcher"
import { listStockAlerts } from "@/features/stock-alerts/queries"
import {
  CAN_EDIT_STOCK,
  CAN_INPUT_ORDER,
  canAccessPath,
  SECTION_ACCESS,
  type Section,
} from "@/lib/access"
import { requireUser } from "@/lib/auth"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      {/* Navbar membaca sesi, jadi berada di dalam Suspense; konten halaman tidak ikut menunggu. */}
      <Suspense fallback={<NavbarSkeleton />}>
        <Navbar />
      </Suspense>
      {children}
      {/* Chat Tim di sisi kanan dan popup pesanan urgent; membaca sesi, jadi di dalam Suspense. */}
      <Suspense fallback={null}>
        <TeamChat />
      </Suspense>
    </div>
  )
}

async function TeamChat() {
  const user = await requireUser()
  const members = await listChatMembers()
  // Tombol "Lihat" di popup urgent mengikuti akses role.
  const link = canAccessPath(user.role, "/pesanan")
    ? "pesanan"
    : canAccessPath(user.role, "/produksi")
      ? "produksi"
      : null
  return (
    <>
      <ChatDock me={{ id: user.id, name: user.name, role: user.role }} members={members} />
      <UrgentWatcher userId={user.id} link={link} />
    </>
  )
}

async function Navbar() {
  const user = await requireUser()
  const allowedSections = (Object.keys(SECTION_ACCESS) as Section[]).filter((section) =>
    canAccessPath(user.role, section),
  )
  // Peringatan stok hanya untuk role yang bisa restock (Admin, Produksi).
  const stockAlerts = CAN_EDIT_STOCK.includes(user.role) ? await listStockAlerts() : null

  return (
    <AppNavbar
      user={{ name: user.name, email: user.email, role: user.role }}
      allowedSections={allowedSections}
      canInputOrder={CAN_INPUT_ORDER.includes(user.role)}
      stockAlerts={stockAlerts}
    />
  )
}

function NavbarSkeleton() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-nav/95">
      <div className="mx-auto flex h-[76px] max-w-[1536px] items-center gap-4 px-4 sm:px-8">
        <Wordmark />
        <div className="hidden flex-1 justify-center gap-3 xl:flex" aria-hidden>
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-5 w-24" />
          ))}
        </div>
        <Skeleton className="ml-auto h-11 w-40 xl:ml-0" aria-hidden />
        <Skeleton className="size-11 rounded-full" aria-hidden />
      </div>
    </header>
  )
}
