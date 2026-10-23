"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"

/** Menampilkan pesan sekali saat diarahkan ke sini dengan ?akses=ditolak, lalu membersihkan URL. */
export function AccessDeniedToast() {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const denied = params.get("akses") === "ditolak"

  useEffect(() => {
    if (!denied) return
    // id tetap: effect bisa jalan dua kali (StrictMode di dev), toast cukup muncul sekali.
    toast.error("Halaman itu tidak tersedia untuk role kamu.", {
      id: "akses-ditolak",
      description: "Minta Admin mengubah role kamu bila perlu akses.",
    })
    router.replace(pathname, { scroll: false })
  }, [denied, pathname, router])

  return null
}
