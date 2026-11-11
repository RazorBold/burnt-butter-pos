"use client"

import {
  ArrowRightLeft,
  Bell,
  CircleCheck,
  type LucideIcon,
  Package,
  PencilLine,
  ShoppingBag,
  Siren,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { Fragment, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { StockBadge } from "@/components/app/stock-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchActivity } from "@/features/activity/actions"
import { type Activity, type ActivityKind, unreadActivity } from "@/features/activity/feed"
import type { StockAlert } from "@/features/stock-alerts/alerts"
import { formatJumlah, formatWaktuDibuat } from "@/lib/format"
import { cn } from "@/lib/utils"

const POLL_MS = 20_000

const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  order: ShoppingBag,
  paid: Wallet,
  status: ArrowRightLeft,
  edit: PencilLine,
  urgent: Siren,
  stock: Package,
}

const KIND_TONE: Record<ActivityKind, string> = {
  order: "bg-status-baru text-status-baru-fg",
  paid: "bg-trend-up text-trend-up-fg",
  status: "bg-status-diproses text-status-diproses-fg",
  edit: "bg-icon-bg text-brand-ink",
  urgent: "bg-trend-down text-trend-down-fg",
  stock: "bg-status-packing text-status-packing-fg",
}

const seenKey = (userId: string) => `notif:seen:${userId}`

function readSeen(userId: string): string | null {
  try {
    return localStorage.getItem(seenKey(userId))
  } catch {
    return null
  }
}

function writeSeen(userId: string, at: string) {
  try {
    localStorage.setItem(seenKey(userId), at)
  } catch {
    // Penyimpanan diblokir: tanda belum dibaca hanya berlaku selama halaman terbuka.
  }
}

/**
 * Lonceng notifikasi: peringatan stok (Menipis/Habis) dan aktivitas terbaru (pesanan baru,
 * lunas, status, edit, urgent, stok). Diperbarui tiap 20 detik; update baru dari orang lain
 * muncul sebagai alert. Terakhir dilihat disimpan per user di browser ini.
 */
export function NotificationsMenu({
  userId,
  stockAlerts,
  initialActivity,
}: {
  userId: string
  stockAlerts: StockAlert[] | null
  initialActivity: Activity[]
}) {
  const [items, setItems] = useState(initialActivity)
  const [seenAt, setSeenAt] = useState<string | null>(null)
  const known = useRef(new Set(initialActivity.map((item) => item.id)))

  // Terakhir dilihat dibaca setelah mount (localStorage tidak ada di server). Pertama kali
  // dipakai: anggap semua sudah dilihat supaya tidak membanjiri.
  useEffect(() => {
    const stored = readSeen(userId)
    const start = stored ?? initialActivity[0]?.at ?? new Date().toISOString()
    if (!stored) writeSeen(userId, start)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkron dari localStorage
    setSeenAt(start)
  }, [userId, initialActivity])

  useEffect(() => {
    let cancelled = false
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return
      try {
        const next = await fetchActivity()
        if (cancelled) return
        const fresh = next.filter((item) => !known.current.has(item.id) && item.actorId !== userId)
        for (const item of next) known.current.add(item.id)
        setItems(next)
        if (fresh.length > 3) {
          toast.info(`${fresh.length} update baru`, { description: fresh[0].title })
        } else {
          for (const item of fresh.reverse()) {
            toast.info(item.title, { description: item.detail ?? undefined })
          }
        }
      } catch {
        // Gagal sesaat (jaringan): coba lagi di putaran berikutnya.
      }
    }, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [userId])

  const unread = unreadActivity(items, seenAt, userId)
  const unreadIds = new Set(unread.map((item) => item.id))
  const restock = stockAlerts?.length ?? 0

  function markSeen(open: boolean) {
    if (!open || !items[0]) return
    writeSeen(userId, items[0].at)
    setSeenAt(items[0].at)
  }

  const label =
    unread.length > 0
      ? `Notifikasi: ${unread.length} update baru`
      : restock > 0
        ? `Notifikasi: ${restock} stok perlu restock`
        : "Notifikasi"

  return (
    <DropdownMenu onOpenChange={markSeen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-11 rounded-full text-brand-ink"
          aria-label={label}
        >
          <Bell className="size-[22px]" />
          {unread.length > 0 ? (
            <span
              aria-hidden
              className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full bg-[#d93a2b] px-1 text-[11px] leading-5 font-bold text-white tabular-nums ring-2 ring-nav"
            >
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          ) : (
            restock > 0 && (
              <span
                aria-hidden
                className="absolute top-2 right-2.5 size-2.5 rounded-full bg-[#d93a2b] ring-2 ring-nav"
              />
            )
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] max-w-[calc(100vw-1.5rem)] p-0">
        <div className="max-h-[min(560px,75dvh)] overflow-y-auto">
          {restock > 0 && (
            <>
              <DropdownMenuLabel className="px-4 pt-3 pb-1.5 text-sm font-semibold text-brand-ink">
                Perlu restock ({restock})
              </DropdownMenuLabel>
              <div className="px-1.5 pb-1.5">
                {stockAlerts!.map((alert) => (
                  <DropdownMenuItem key={alert.id} asChild className="p-0">
                    <Link
                      href={alert.href}
                      className="flex items-center gap-3 rounded-md px-2.5 py-2"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-icon-bg text-brand-ink">
                        <Package className="size-4" aria-hidden />
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
                        </span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator className="m-0" />
            </>
          )}

          <DropdownMenuLabel className="px-4 pt-3 pb-1.5 text-sm font-semibold text-brand-ink">
            Aktivitas terbaru
          </DropdownMenuLabel>
          {items.length === 0 ? (
            <p className="flex items-center gap-2 px-4 pt-1 pb-5 text-sm text-text-body">
              <CircleCheck className="size-4" aria-hidden />
              Belum ada aktivitas.
            </p>
          ) : (
            <div role="group" aria-label="Aktivitas terbaru" className="px-1.5 pb-1.5">
              {items.map((item) => {
                const Icon = KIND_ICON[item.kind]
                const isNew = unreadIds.has(item.id)
                const body = (
                  <>
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                        KIND_TONE[item.kind],
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-text-strong">
                          {isNew && <span className="sr-only">Baru: </span>}
                          {item.title}
                        </span>
                        {isNew && (
                          <span
                            aria-hidden
                            className="mt-1.5 size-2 shrink-0 rounded-full bg-[#d93a2b]"
                          />
                        )}
                      </span>
                      {item.detail && (
                        <span className="block text-[13px] leading-snug break-words text-text-body">
                          {item.detail}
                        </span>
                      )}
                      <span className="mt-0.5 block text-xs text-text-body">
                        {formatWaktuDibuat(item.at)}
                        {item.actorName && ` · ${item.actorName}`}
                      </span>
                    </span>
                  </>
                )
                return (
                  <Fragment key={item.id}>
                    {item.href ? (
                      <DropdownMenuItem asChild className="p-0">
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-start gap-3 rounded-md px-2.5 py-2.5",
                            isNew && "bg-nav-active/60",
                          )}
                        >
                          {body}
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <div className="flex items-start gap-3 rounded-md px-2.5 py-2.5">{body}</div>
                    )}
                  </Fragment>
                )
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
