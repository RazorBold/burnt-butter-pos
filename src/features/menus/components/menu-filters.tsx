"use client"

import { Search } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORY_LABEL, MENU_CATEGORIES } from "@/features/menus/schemas"
import { cn } from "@/lib/utils"

const ALL = "semua"

/** Cari nama + filter kategori. Disimpan di URL (?q=&kategori=) supaya bisa dibagikan. */
export function MenuFilters() {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState(params.get("q") ?? "")

  // router.replace baru mengubah URL setelah navigasi selesai. Selama itu filter yang diminta
  // disimpan di `requested`, supaya perubahan berikutnya (mis. pencarian yang tertunda) dibangun
  // dari sini dan tidak menimpa kategori yang baru dipilih. Direset begitu URL berubah.
  const urlKey = params.toString()
  const [requested, setRequested] = useState<{ base: string; qs: string } | null>(null)
  const current = new URLSearchParams(requested?.base === urlKey ? requested.qs : urlKey)

  function update(next: Record<string, string | null>) {
    const search = new URLSearchParams(current)
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value)
      else search.delete(key)
    }
    const qs = search.toString()
    setRequested({ base: urlKey, qs })
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  // Ketikan disimpan ke URL setelah jeda 300 ms supaya tidak query di setiap huruf.
  // currentKey ikut jadi dependensi: bila kategori berubah selama jeda, timer lama (yang memegang
  // filter lama) dibatalkan dan dijadwalkan ulang dengan filter terbaru.
  const currentKey = current.toString()
  const requestedQuery = current.get("q") ?? ""
  useEffect(() => {
    if (query.trim() === requestedQuery) return
    const timer = setTimeout(() => update({ q: query.trim() || null }), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, currentKey])

  return (
    <div className={cn("flex flex-wrap items-center gap-2", pending && "opacity-80")}>
      <div className="relative w-full sm:w-[248px]">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-body"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama menu…"
          aria-label="Cari nama menu"
          className="h-10 rounded-lg bg-white pl-9"
        />
      </div>
      <Select
        value={current.get("kategori") ?? ALL}
        onValueChange={(value) => update({ kategori: value === ALL ? null : value })}
      >
        <SelectTrigger aria-label="Filter kategori" className="h-10! w-[168px] rounded-lg bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua Kategori</SelectItem>
          {MENU_CATEGORIES.map((category) => (
            <SelectItem key={category} value={category}>
              {CATEGORY_LABEL[category]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
