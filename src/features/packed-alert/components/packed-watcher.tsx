"use client"

import { Check, PackageCheck } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import { InvoiceNo } from "@/components/app/order-badges"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ORDER_TYPE_LABEL } from "@/features/orders/filters"
import { fetchPackedOrders } from "@/features/packed-alert/actions"
import { type PackedOrder, packedAtOf } from "@/features/packed-alert/packed"
import { playPackedChime } from "@/features/packed-alert/sound"
import { latestAt, unseenSince } from "@/features/paid-alert/seen"
import { formatJam, formatTanggal } from "@/lib/format"

const POLL_MS = 10_000
const FIRST_CHECK_DELAY_MS = 4_000
/** Bunyi diulang selama popup belum ditutup, lebih jarang dari alarm lunas. */
const REPEAT_MS = 8_000
/** Diisi "1" oleh test e2e supaya akun QA ikut menerima pesanan uji. */
const TEST_FLAG = "packed-alert:test"

/**
 * Popup + bunyi di akun Admin saat pesanan selesai packing di menu Packaging (permintaan pemilik
 * toko, 19 Nov 2026), supaya langsung diatur pengirimannya tanpa cek manual. Yang sudah dilihat
 * diingat per browser per akun.
 */
export function PackedWatcher({ userId }: { userId: string }) {
  const key = `packed:seen:${userId}`
  const [pending, setPending] = useState<PackedOrder[]>([])

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
    const result = await fetchPackedOrders(read(TEST_FLAG) === "1").catch(() => null)
    if (!result?.ok) return
    const lastSeen = read(key)
    // Browser baru: simpan titik awal, popup hanya untuk packing setelah ini.
    if (!lastSeen) {
      write(key, latestAt(result.orders, result.now, packedAtOf)!)
      return
    }
    // Diganti tiap polling: packing baru bertambah, yang sudah dikirim/dibatalkan hilang.
    setPending(unseenSince(result.orders, lastSeen, packedAtOf))
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

  const hasPending = pending.length > 0
  useEffect(() => {
    if (!hasPending) return
    void playPackedChime()
    const timer = window.setInterval(() => void playPackedChime(), REPEAT_MS)
    return () => window.clearInterval(timer)
  }, [hasPending])

  function acknowledge() {
    const latest = latestAt(pending, read(key), packedAtOf)
    if (latest) write(key, latest)
    setPending([])
  }

  return (
    <Dialog open={hasPending} onOpenChange={(open) => !open && acknowledge()}>
      <DialogContent
        role="alertdialog"
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl border-2 border-status-siap-fg bg-card p-6 sm:max-w-[480px] sm:p-7"
      >
        <DialogHeader className="items-start text-left">
          <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-status-siap text-status-siap-fg">
            <PackageCheck className="size-6" aria-hidden />
          </span>
          <DialogTitle className="text-2xl font-bold text-status-siap-fg">
            {pending.length > 1
              ? `${pending.length} pesanan selesai packing`
              : "Pesanan selesai packing"}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Sudah Siap Kirim. Atur kurir atau kabari customer untuk diambil.
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-5 space-y-3">
          {pending.map((order) => (
            <li key={order.orderId} className="rounded-xl border border-border bg-white px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-brand-ink tabular-nums">{order.orderNo}</p>
                <p className="text-[13px] text-text-body">
                  Kirim {formatTanggal(order.deliveryDate)}
                </p>
              </div>
              <p className="text-sm text-text-strong">
                {order.customerName}
                <span className="text-text-body"> · {ORDER_TYPE_LABEL[order.type]}</span>
              </p>
              <InvoiceNo no={order.marketplaceOrderNo} className="mt-0.5" />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] text-text-body">
                  Selesai packing pukul {formatJam(order.packedAt)}
                  {order.byName && ` · oleh ${order.byName}`}
                </p>
                <Link
                  href={`/pengiriman?tanggal=${order.deliveryDate}&q=${encodeURIComponent(order.orderNo)}`}
                  onClick={acknowledge}
                  className="text-sm font-semibold text-brand-ink underline underline-offset-2"
                >
                  Atur pengiriman
                </Link>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end">
          <Button onClick={acknowledge} className="h-11 rounded-lg px-6" autoFocus>
            <Check aria-hidden />
            Oke, saya proses
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
