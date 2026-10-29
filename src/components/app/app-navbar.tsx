"use client"

import { Bell, ChevronDown, Leaf, LogOut, Menu, Package, Plus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useTransition } from "react"

import { isActivePath, NAV_ITEMS } from "@/components/app/nav-items"
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

export function AppNavbar({
  user,
  allowedSections,
  canInputOrder,
  stockAlerts,
}: {
  user: NavbarUser
  allowedSections: Section[]
  canInputOrder: boolean
  stockAlerts: StockAlert[] | null
}) {
  const pathname = usePathname()
  const [orderOpen, setOrderOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const items = NAV_ITEMS.filter((item) => allowedSections.includes(item.href))

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-nav/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[76px] max-w-[1536px] items-center gap-2 px-3 sm:gap-3 sm:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="size-11 rounded-lg text-brand-ink xl:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="Buka menu"
        >
          <Menu className="size-6" />
        </Button>

        <Link href="/dashboard" className={cn("shrink-0 rounded-md", focusRing)}>
          <Wordmark />
          <span className="sr-only">Ke Dashboard</span>
        </Link>

        <nav aria-label="Menu utama" className="hidden h-full flex-1 justify-center xl:flex">
          <ul className="flex h-full items-stretch gap-0.5">
            {items.map((item) => {
              const active = isActivePath(pathname, item.href)
              return (
                <li key={item.href} className="relative flex">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "my-auto flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13.5px] font-medium whitespace-nowrap text-text-strong transition-colors hover:bg-nav-active/70 hover:text-brand-ink",
                      focusRing,
                      active && "bg-nav-active font-semibold text-brand-ink",
                    )}
                  >
                    {/* Ikon hanya mulai 1536 px (lebar desain); di 1280–1535 label saja supaya muat. */}
                    <item.icon className="hidden size-[18px] 2xl:block" aria-hidden />
                    {item.label}
                  </Link>
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-1 -bottom-px h-[3px] rounded-full bg-brand"
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-3 xl:ml-0">
          {canInputOrder && (
            <Button
              onClick={() => setOrderOpen(true)}
              aria-label="Input Pesanan"
              className="size-11 rounded-lg px-0 text-sm font-semibold sm:w-auto sm:px-5"
            >
              <Plus className="size-5 sm:size-[18px]" aria-hidden />
              <span className="hidden sm:inline">Input Pesanan</span>
            </Button>
          )}
          <NotificationsMenu stockAlerts={stockAlerts} />
          <ProfileMenu user={user} />
        </div>
      </div>

      {canInputOrder && <InputOrderDialog open={orderOpen} onOpenChange={setOrderOpen} />}

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[300px] bg-nav p-0 sm:max-w-[300px]">
          <SheetHeader className="border-b border-border px-5 py-5">
            <SheetTitle asChild>
              <div>
                <Wordmark />
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">Menu utama</SheetDescription>
          </SheetHeader>
          <nav aria-label="Menu utama" className="p-3">
            <ul className="space-y-1">
              {items.map((item) => {
                const active = isActivePath(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-12 items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-text-strong hover:bg-nav-active/70",
                        focusRing,
                        active && "bg-nav-active font-semibold text-brand-ink",
                      )}
                    >
                      <item.icon className="size-5" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
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
          <span className="hidden max-w-[120px] truncate sm:inline xl:hidden 2xl:inline">
            {user.name}
          </span>
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
