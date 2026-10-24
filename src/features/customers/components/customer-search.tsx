"use client"

import { Search } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Cari nama atau no. HP. Disimpan di URL (?q=) dan selalu kembali ke halaman 1. */
export function CustomerSearch() {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState(params.get("q") ?? "")
  const urlQuery = params.get("q") ?? ""

  // Ketikan disimpan ke URL setelah jeda 300 ms supaya tidak query di setiap huruf.
  useEffect(() => {
    if (query.trim() === urlQuery) return
    const timer = setTimeout(() => {
      const search = new URLSearchParams(params.toString())
      if (query.trim()) search.set("q", query.trim())
      else search.delete("q")
      search.delete("hal")
      const qs = search.toString()
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
    }, 300)
    return () => clearTimeout(timer)
  }, [query, urlQuery, params, pathname, router])

  return (
    <div className={cn("relative w-full sm:w-[260px]", pending && "opacity-80")}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-body"
        aria-hidden
      />
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Cari nama atau no. HP…"
        aria-label="Cari nama atau no. HP customer"
        className="h-10 rounded-lg bg-white pl-9"
      />
    </div>
  )
}
