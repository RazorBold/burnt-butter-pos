"use client"

import { BadgeCheck, BellRing } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { fetchPaidOrders } from "@/features/paid-alert/actions"
import type { PaidOrder } from "@/features/paid-alert/queries"
import { latestPaidAt, unseenPaid } from "@/features/paid-alert/seen"
import { playPaidAlarm } from "@/features/paid-alert/sound"
import { formatJam, formatRupiah, formatTanggal } from "@/lib/format"

const POLL_MS = 10_000
const FIRST_CHECK_DELAY_MS = 3_000
/** Alarm diulang selama popup belum ditutup. */
const REPEAT_MS = 4_000
/** Diisi "1" oleh test e2e supaya akun QA ikut menerima pesanan uji. */
const TEST_FLAG = "paid-alert:test"

/**
 * Popup + alarm berulang di setiap akun saat ada pesanan baru yang Lunas (permintaan pemilik
 * toko, 14 Nov 2026), supaya cepat diproses. Bunyi terus sampai "Siap, diproses"; yang sudah
 * dilihat diingat per browser per akun.
 */
export function PaidWatcher({
  userId,
  link,
}: {
  userId: string
  /** Ke mana tombol "Lihat" mengarah, sesuai akses role; null = tanpa tombol. */
  link: "pesanan" | "produksi" | null
}) {
  const key = `paid:seen:${userId}`
  const [pending, setPending] = useState<PaidOrder[]>([])

  const read = useCallback((name: string) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  }, [])
  const write = useCallback((name: string, value: string) => {
    try {
      localStorage.setItem(name, value)
    } catch {
      // Penyimpanan diblokir: popup bisa muncul lagi setelah muat ulang.
    }
  }, [])

  const check = useCallback(async () => {
    const result = await fetchPaidOrders(read(TEST_FLAG) === "1").catch(() => null)
    if (!result?.ok) return
    const lastSeen = read(key)
    // Browser baru: simpan titik awal, popup hanya untuk yang lunas setelah ini.
    if (!lastSeen) {
      write(key, latestPaidAt(result.orders, result.now)!)
      return
    }
    const fresh = unseenPaid(result.orders, lastSeen)
    if (fresh.length > 0) setPending(fresh)
  }, [key, read, write])

  useEffect(() => {
    let stopped = false
    let timer: number | undefined
    async function tick() {
      await check()
      if (!stopped) timer = window.setTimeout(tick, POLL_MS)
    }
    // Cek pertama ditunda sampai halaman selesai dimuat (lihat UrgentWatcher).
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

  // Alarm berbunyi terus selama masih ada pesanan lunas yang belum ditutup.
  const hasPending = pending.length > 0
  useEffect(() => {
    if (!hasPending) return
    void playPaidAlarm()
    const timer = window.setInterval(() => void playPaidAlarm(), REPEAT_MS)
    return () => window.clearInterval(timer)
  }, [hasPending])

  function acknowledge() {
    const latest = latestPaidAt(pending, read(key))
    if (latest) write(key, latest)
    setPending([])
  }

  const hrefOf = (order: PaidOrder) =>
    link === "pesanan"
      ? `/pesanan?pesanan=${encodeURIComponent(order.orderNo)}`
      : link === "produksi"
        ? `/produksi?tanggal=${order.deliveryDate}`
        : null

  return (
    <Dialog open={hasPending} onOpenChange={(open) => !open && acknowledge()}>
      <DialogContent
        role="alertdialog"
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl border-2 border-status-selesai-fg bg-card p-6 sm:max-w-[480px] sm:p-7"
      >
        <DialogHeader className="items-start text-left">
          <span className="mb-3 flex size-12 animate-pulse items-center justify-center rounded-full bg-status-selesai text-status-selesai-fg motion-reduce:animate-none">
            <BadgeCheck className="size-6" aria-hidden />
          </span>
          <DialogTitle className="text-2xl font-bold text-status-selesai-fg">
            {pending.length > 1 ? `${pending.length} pesanan baru LUNAS` : "Pesanan baru LUNAS"}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Pembayaran sudah masuk, segera proses pesanannya.
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
                <p className="mt-1 text-sm font-semibold text-status-selesai-fg tabular-nums">
                  {formatRupiah(order.total)} · {order.methodName}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] text-text-body">
                    Lunas pukul {formatJam(order.paidAt)}
                    {order.byName && ` · dicatat ${order.byName}`}
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
            Siap, diproses
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
