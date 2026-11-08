"use client"

import { BellRing, Siren } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { fetchUrgentOrders } from "@/features/urgent/actions"
import type { UrgentOrder } from "@/features/urgent/queries"
import { latestUrgentAt, unseenUrgent } from "@/features/urgent/seen"
import { playUrgentSound } from "@/features/urgent/sound"
import { formatJam, formatTanggal } from "@/lib/format"

const POLL_MS = 10_000
const FIRST_CHECK_DELAY_MS = 2_000

/**
 * Popup + suara di setiap akun saat ada pesanan yang baru ditandai URGENT. Tetap tampil sampai
 * "Saya mengerti"; yang sudah dilihat diingat per browser per akun.
 */
export function UrgentWatcher({
  userId,
  link,
}: {
  userId: string
  /** Ke mana tombol "Lihat" mengarah, sesuai akses role; null = tanpa tombol. */
  link: "pesanan" | "produksi" | null
}) {
  const key = `urgent:seen:${userId}`
  const [pending, setPending] = useState<UrgentOrder[]>([])
  const shownRef = useRef(new Set<string>())

  const readSeen = useCallback(() => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }, [key])

  const check = useCallback(async () => {
    const result = await fetchUrgentOrders().catch(() => null)
    if (!result?.ok) return
    const fresh = unseenUrgent(result.orders, readSeen())
    setPending(fresh)
    // Bunyi hanya untuk urgent yang belum pernah muncul di sesi ini.
    const stamp = (order: UrgentOrder) => `${order.id}:${order.urgentAt}`
    if (fresh.some((order) => !shownRef.current.has(stamp(order)))) {
      for (const order of fresh) shownRef.current.add(stamp(order))
      void playUrgentSound()
    }
  }, [readSeen])

  useEffect(() => {
    let stopped = false
    let timer: number | undefined
    async function tick() {
      await check()
      if (!stopped) timer = window.setTimeout(tick, POLL_MS)
    }
    // Cek pertama ditunda sampai halaman selesai dimuat: popup modal memberi aria-hidden ke
    // bagian lain halaman, dan bagian yang masih di-stream (Suspense) jadi gagal hydrate.
    function start() {
      timer = window.setTimeout(tick, FIRST_CHECK_DELAY_MS)
    }
    if (document.readyState === "complete") start()
    else window.addEventListener("load", start, { once: true })
    return () => {
      stopped = true
      window.clearTimeout(timer)
      window.removeEventListener("load", start)
    }
  }, [check])

  function acknowledge() {
    const latest = latestUrgentAt(pending, readSeen())
    try {
      if (latest) localStorage.setItem(key, latest)
    } catch {
      // Penyimpanan diblokir: popup bisa muncul lagi setelah muat ulang.
    }
    setPending([])
  }

  const hrefOf = (order: UrgentOrder) =>
    link === "pesanan"
      ? `/pesanan?pesanan=${encodeURIComponent(order.orderNo)}`
      : link === "produksi"
        ? `/produksi?tanggal=${order.deliveryDate}`
        : null

  return (
    <Dialog open={pending.length > 0} onOpenChange={(open) => !open && acknowledge()}>
      <DialogContent
        role="alertdialog"
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl border-2 border-[#d93a2b] bg-card p-6 sm:max-w-[480px] sm:p-7"
      >
        <DialogHeader className="items-start text-left">
          <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-trend-down text-trend-down-fg">
            <Siren className="size-6" aria-hidden />
          </span>
          <DialogTitle className="text-2xl font-bold text-trend-down-fg">
            {pending.length > 1 ? `${pending.length} pesanan URGENT` : "Pesanan URGENT"}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Pesanan dadakan, dahulukan dari antrean biasa.
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-5 space-y-3">
          {pending.map((order) => {
            const href = hrefOf(order)
            return (
              <li key={order.id} className="rounded-xl border border-border bg-white px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold text-brand-ink tabular-nums">{order.orderNo}</p>
                  <p className="text-[13px] text-text-body">
                    Kirim {formatTanggal(order.deliveryDate)}
                  </p>
                </div>
                <p className="text-sm text-text-strong">{order.customerName}</p>
                {order.note && (
                  <p className="mt-1 text-sm font-medium break-words text-trend-down-fg">
                    {order.note}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] text-text-body">
                    Ditandai {order.byName ?? "staf"} pukul {formatJam(order.urgentAt)}
                  </p>
                  {href && (
                    <Link
                      href={href}
                      onClick={acknowledge}
                      className="text-sm font-semibold text-brand-ink underline underline-offset-2"
                    >
                      Lihat {link === "pesanan" ? "pesanan" : "di Produksi"}
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-6 flex justify-end">
          <Button onClick={acknowledge} className="h-11 rounded-lg px-6" autoFocus>
            <BellRing aria-hidden />
            Saya mengerti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
