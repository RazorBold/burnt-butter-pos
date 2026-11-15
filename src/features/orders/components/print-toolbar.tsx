"use client"

import { ArrowLeft, Printer } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"

/**
 * Bar atas halaman cetak (tidak ikut tercetak). Dialog print langsung dibuka sekali setelah
 * font siap; dari dialog itu bisa pilih printer atau "Simpan sebagai PDF".
 */
export function PrintToolbar({ orderNo }: { orderNo: string }) {
  const printed = useRef(false)

  useEffect(() => {
    if (printed.current) return
    printed.current = true
    let cancelled = false
    void document.fonts.ready.then(() => {
      if (!cancelled) window.print()
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-4 print:hidden">
      <Button asChild variant="outline" className="h-10 rounded-lg bg-white px-3.5">
        <Link href={`/pesanan/${orderNo}`}>
          <ArrowLeft aria-hidden />
          Kembali ke pesanan
        </Link>
      </Button>
      <div className="flex items-center gap-3">
        <p className="hidden text-[13px] text-text-body sm:block">
          Pilih &quot;Simpan sebagai PDF&quot; di dialog print untuk menyimpan.
        </p>
        <Button onClick={() => window.print()} className="h-10 rounded-lg px-4">
          <Printer aria-hidden />
          Print / PDF
        </Button>
      </div>
    </div>
  )
}
