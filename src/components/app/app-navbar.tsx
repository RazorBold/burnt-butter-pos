"use client"

import { Bell, ChevronDown, LogOut, Menu, Plus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useTransition } from "react"

import { isActivePath, NAV_ITEMS } from "@/components/app/nav-items"
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
import { ROLE_LABEL, type Role, type Section } from "@/lib/access"
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
}: {
  user: NavbarUser
  allowedSections: Section[]
  canInputOrder: boolean
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
          <NotificationsMenu />
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

function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 rounded-full text-brand-ink"
          aria-label="Notifikasi"
        >
          <Bell className="size-[22px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-4 py-3 text-sm font-semibold text-brand-ink">
          Notifikasi
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <p className="px-4 py-6 text-sm text-text-body">
          Belum ada notifikasi. Pesanan baru dan stok yang menipis akan muncul di sini.
        </p>
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
