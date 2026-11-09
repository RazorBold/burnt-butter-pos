import Image from "next/image"
import { Suspense, type ReactNode } from "react"

import { AppNavbar } from "@/components/app/app-navbar"
import { Wordmark } from "@/components/app/wordmark"
import { Skeleton } from "@/components/ui/skeleton"
import { ChatDock } from "@/features/chat/components/chat-dock"
import { listChatMembers } from "@/features/chat/queries"
import { countNewOrders } from "@/features/orders/queries"
import { UrgentWatcher } from "@/features/urgent/components/urgent-watcher"
import { listStockAlerts } from "@/features/stock-alerts/queries"
import {
  CAN_EDIT_RAW_STOCK,
  CAN_EDIT_STOCK,
  CAN_INPUT_ORDER,
  canAccessPath,
  SECTION_ACCESS,
  type Section,
} from "@/lib/access"
import { requireUser } from "@/lib/auth"

import packageJson from "../../../package.json"

/**
 * Kerangka aplikasi (mockup Nov 2026): sidebar kiri 248 px mulai 1280 px (xl), topbar, lalu isi
 * halaman di atas latar ilustrasi (box di kanan atas) yang menempel di layar.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-page xl:pl-[248px]">
      {/* Ponsel/tablet: latar polos supaya ilustrasi tidak menimpa judul halaman. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 hidden lg:block xl:left-[248px]"
      >
        <Image
          src="/images/brand/bg-app.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) calc(100vw - 248px), 100vw"
          className="object-cover object-[right_top]"
        />
      </div>
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
  const [stockAlerts, newOrderCount] = await Promise.all([
    // Peringatan stok hanya untuk role yang bisa restock: packaging (Admin, Produksi), bahan baku (Owner).
    CAN_EDIT_STOCK.includes(user.role) || CAN_EDIT_RAW_STOCK.includes(user.role)
      ? listStockAlerts({
          packaging: CAN_EDIT_STOCK.includes(user.role),
          rawMaterials: CAN_EDIT_RAW_STOCK.includes(user.role),
        })
      : Promise.resolve(null),
    canAccessPath(user.role, "/pesanan") ? countNewOrders() : Promise.resolve(null),
  ])

  return (
    <AppNavbar
      user={{ name: user.name, email: user.email, role: user.role }}
      allowedSections={allowedSections}
      canInputOrder={CAN_INPUT_ORDER.includes(user.role)}
      stockAlerts={stockAlerts}
      newOrderCount={newOrderCount}
      version={packageJson.version}
    />
  )
}

function NavbarSkeleton() {
  return (
    <>
      <aside
        aria-hidden
        className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col gap-2 border-r border-border bg-nav px-4 xl:flex"
      >
        <Wordmark className="mx-2 mt-7 mb-7" />
        {Array.from({ length: 9 }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full rounded-[10px]" />
        ))}
      </aside>
      <header className="sticky top-0 z-30 border-b border-border bg-nav/95">
        <div className="flex h-[76px] items-center gap-4 px-4 sm:px-8">
          <Wordmark className="xl:hidden" />
          <Skeleton className="ml-auto h-11 w-40" aria-hidden />
          <Skeleton className="size-11 rounded-full" aria-hidden />
        </div>
      </header>
    </>
  )
}
