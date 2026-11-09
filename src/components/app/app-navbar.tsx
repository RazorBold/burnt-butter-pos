"use client"

import { Bell, CakeSlice, ChevronDown, Leaf, LogOut, Menu, Package, Plus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useTransition } from "react"

import { isActivePath, NAV_ITEMS, type NavItem } from "@/components/app/nav-items"
import { StockBadge } from "@/components/app/stock-badge"
import { Wordmark } from "@/components/app/wordmark"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { signOut } from "@/features/auth/actions"
import { InputOrderDialog } from "@/features/orders/components/input-order-dialog"
import type { StockAlert } from "@/features/stock-alerts/alerts"
import { ROLE_LABEL, type Role, type Section } from "@/lib/access"
import { formatJumlah } from "@/lib/format"
import { cn } from "@/lib/utils"

export type NavbarUser = { name: string; email: string; role: Role }

const focusRing = "outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?"
}

/**
 * Kerangka navigasi (mockup Nov 2026): sidebar kiri tetap mulai 1280 px (xl) dan topbar berisi
 * Input Pesanan, notifikasi, dan profil. Di bawah 1280 px sidebar diganti tombol menu yang membuka
 * laci dengan isi yang sama. Lebar sidebar 248 px; layout memberi padding kiri yang sama.
 */
export function AppNavbar({
  user,
  allowedSections,
  canInputOrder,
  stockAlerts,
  newOrderCount,
  version,
}: {
  user: NavbarUser
  allowedSections: Section[]
  canInputOrder: boolean
  stockAlerts: StockAlert[] | null
  /** Pesanan berstatus Baru (badge di menu Pesanan); null = role tanpa akses Pesanan. */
  newOrderCount: number | null
  version: string
}) {
  const pathname = usePathname()
  const [orderOpen, setOrderOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const items = NAV_ITEMS.filter((item) => allowedSections.includes(item.href))

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-border bg-nav xl:flex">
        <Link
          href="/dashboard"
          className={cn("mx-6 mt-7 mb-7 block w-fit shrink-0 rounded-md", focusRing)}
        >
          <Wordmark />
          <span className="sr-only">Ke Dashboard</span>
        </Link>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-5">
          <SidebarNav items={items} pathname={pathname} newOrderCount={newOrderCount} />
          <AppInfoCard version={version} className="mt-auto" />
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-border bg-nav/95 backdrop-blur-sm">
        <div className="flex h-[76px] items-center gap-2 px-3 sm:gap-3 sm:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="size-11 rounded-lg text-brand-ink xl:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Buka menu"
          >
            <Menu className="size-6" />
          </Button>

          <Link href="/dashboard" className={cn("shrink-0 rounded-md xl:hidden", focusRing)}>
            <Wordmark />
            <span className="sr-only">Ke Dashboard</span>
          </Link>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            {canInputOrder && (
              <Button
                onClick={() => setOrderOpen(true)}
                aria-label="Input Pesanan"
                className="size-11 rounded-lg px-0 text-sm font-semibold shadow-sm sm:w-auto sm:px-5"
              >
                <Plus className="size-5 sm:size-[18px]" aria-hidden />
                <span className="hidden sm:inline">Input Pesanan</span>
              </Button>
            )}
            <NotificationsMenu stockAlerts={stockAlerts} />
            <ProfileMenu user={user} />
          </div>
        </div>
      </header>

      {canInputOrder && <InputOrderDialog open={orderOpen} onOpenChange={setOrderOpen} />}

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex w-[280px] flex-col bg-nav p-0 sm:max-w-[280px]">
          <SheetHeader className="px-6 pt-7 pb-5">
            <SheetTitle asChild>
              <div>
                <Wordmark />
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">Menu utama</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-5">
            <SidebarNav
              items={items}
              pathname={pathname}
              newOrderCount={newOrderCount}
              onNavigate={() => setMenuOpen(false)}
            />
            <AppInfoCard version={version} className="mt-auto" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

/** Daftar menu sidebar: menu aktif = isian cokelat dengan teks putih (mockup Nov 2026). */
function SidebarNav({
  items,
  pathname,
  newOrderCount,
  onNavigate,
}: {
  items: NavItem[]
  pathname: string
  newOrderCount: number | null
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="Menu utama" className="border-b border-border pb-5">
      <ul className="space-y-1">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href)
          const badge = item.href === "/pesanan" && newOrderCount ? newOrderCount : null
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-[10px] px-3.5 text-[15px] font-medium text-text-strong transition-colors",
                  focusRing,
                  active
                    ? "bg-brand font-semibold text-white shadow-[0_4px_12px_-4px_rgb(117_65_34/0.55)]"
                    : "hover:bg-nav-active hover:text-brand-ink",
                )}
              >
                <item.icon
                  className={cn("size-5 shrink-0", active ? "text-white" : "text-brand-ink")}
                  aria-hidden
                />
                <span className="flex-1">{item.label}</span>
                {badge !== null && (
                  <span
                    className={cn(
                      "min-w-7 rounded-full border px-2 py-px text-center text-xs font-semibold tabular-nums",
                      active
                        ? "border-white/40 bg-white/15 text-white"
                        : "border-[#e3cdb9] bg-white text-brand-ink",
                    )}
                  >
                    {badge > 99 ? "99+" : badge}
                    <span className="sr-only"> pesanan baru</span>
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function AppInfoCard({ version, className }: { version: string; className?: string }) {
  return (
    <div
      className={cn(
        "mt-6 flex items-center gap-3 rounded-xl border border-border bg-nav-active/60 px-3.5 py-3",
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand">
        <CakeSlice className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-semibold text-brand-ink">Burnt Butter</span>
        <span className="block text-xs text-text-body">Order Management</span>
        <span className="block text-xs text-text-body tabular-nums">v{version}</span>
      </span>
    </div>
  )
}

/**
 * Lonceng notifikasi (F-03). Isinya peringatan stok packaging dan bahan baku yang Menipis atau
 * Habis (BELL-33), hanya untuk role yang bisa restock. `stockAlerts` null = role lain.
 */
function NotificationsMenu({ stockAlerts }: { stockAlerts: StockAlert[] | null }) {
  const count = stockAlerts?.length ?? 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-11 rounded-full text-brand-ink"
          aria-label={count > 0 ? `Notifikasi: ${count} stok perlu restock` : "Notifikasi"}
        >
          <Bell className="size-[22px]" />
          {count > 0 && (
            <span
              aria-hidden
              className="absolute top-2 right-2.5 size-2.5 rounded-full bg-[#d93a2b] ring-2 ring-nav"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] max-w-[calc(100vw-1.5rem)] p-0">
        <DropdownMenuLabel className="px-4 py-3 text-sm font-semibold text-brand-ink">
          {count > 0 ? `Stok perlu restock (${count})` : "Notifikasi"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {count === 0 ? (
          <p className="px-4 py-6 text-sm text-text-body">
            {stockAlerts
              ? "Stok aman. Packaging dan bahan baku yang menipis atau habis akan muncul di sini."
              : "Belum ada notifikasi."}
          </p>
        ) : (
          <div className="max-h-[min(420px,70dvh)] overflow-y-auto p-1.5">
            {stockAlerts!.map((alert) => {
              const Icon = alert.kind === "packaging" ? Package : Leaf
              return (
                <DropdownMenuItem key={`${alert.kind}-${alert.id}`} asChild className="p-0">
                  <Link
                    href={alert.href}
                    className="flex items-start gap-3 rounded-md px-2.5 py-2.5"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-icon-bg text-brand-ink">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-text-strong">
                          {alert.name}
                        </span>
                        <StockBadge status={alert.status} className="px-2 py-0.5 text-xs" />
                      </span>
                      <span className="block text-[13px] text-text-body tabular-nums">
                        Sisa {formatJumlah(alert.stock)} {alert.unit}
                        {alert.minStock !== null &&
                          `, minimum ${formatJumlah(alert.minStock)} ${alert.unit}`}
                        <span className="sr-only">
                          {alert.kind === "packaging" ? " (packaging)" : " (bahan baku)"}
                        </span>
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ProfileMenu({ user }: { user: NavbarUser }) {
  const [pending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          suppressHydrationWarning
          type="button"
          className={cn(
            "flex h-11 items-center gap-2.5 rounded-full border border-border bg-white/70 p-1 text-sm font-medium text-text-strong transition-colors hover:bg-white sm:h-12 sm:pr-3",
            focusRing,
          )}
          aria-label={`Akun ${user.name}`}
        >
          <Avatar className="size-9">
            <AvatarFallback className="bg-icon-bg text-[13px] font-semibold text-brand-ink">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[140px] truncate sm:inline">{user.name}</span>
          <ChevronDown className="hidden size-4 text-text-body sm:block" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="px-3 py-2.5">
          <p className="truncate font-semibold text-text-strong">{user.name}</p>
          <p className="truncate text-xs font-normal text-text-body">{user.email}</p>
          <p className="mt-1 text-xs font-medium text-brand">{ROLE_LABEL[user.role]}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={() => startTransition(() => signOut())}
          className="h-10 px-3 text-[14px]"
        >
          <LogOut aria-hidden />
          {pending ? "Keluar…" : "Keluar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
