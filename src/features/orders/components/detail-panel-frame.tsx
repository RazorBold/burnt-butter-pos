"use client"

import { X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ReactNode, useEffect, useRef } from "react"

/**
 * Bingkai panel Detail Pesanan. Layar lebar (xl): kolom kanan yang menempel saat digulir,
 * seperti 03-pesanan.png. Layar lebih kecil: laci dari kanan di atas latar gelap.
 * Ditutup lewat tombol X, klik latar, atau Esc (selama tidak ada dialog yang terbuka).
 */
export function DetailPanelFrame({
  closeHref,
  title,
  children,
}: {
  closeHref: string
  title: string
  children: ReactNode
}) {
  const router = useRouter()
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [title])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      if (document.querySelector('[role="dialog"], [role="menu"]')) return
      router.replace(closeHref, { scroll: false })
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [closeHref, router])

  return (
    <>
      <Link
        href={closeHref}
        scroll={false}
        aria-hidden
        tabIndex={-1}
        className="fixed inset-0 z-40 bg-brand-ink/30 xl:hidden"
      />
      <aside
        aria-labelledby="order-detail-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col overflow-y-auto bg-card shadow-2xl xl:sticky xl:top-24 xl:z-auto xl:max-h-[calc(100dvh-7rem)] xl:max-w-none xl:self-start xl:rounded-2xl xl:border xl:border-border xl:shadow-none"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <h2
            id="order-detail-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-bold text-brand-ink outline-none"
          >
            {title}
          </h2>
          <Link
            href={closeHref}
            scroll={false}
            aria-label="Tutup detail pesanan"
            className="flex size-9 items-center justify-center rounded-lg text-text-strong outline-none hover:bg-nav-active focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <X className="size-5" aria-hidden />
          </Link>
        </div>
        {children}
      </aside>
    </>
  )
}
