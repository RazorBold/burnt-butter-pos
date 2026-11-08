"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { MenuCategoryRef } from "@/features/menus/schemas"
import { useDebouncedQuery, useUrlFilters } from "@/hooks/use-url-filters"
import { cn } from "@/lib/utils"

const ALL = "semua"

/** Cari nama + filter kategori. Disimpan di URL (?q=&kategori=) supaya bisa dibagikan. */
export function MenuFilters({ categories }: { categories: MenuCategoryRef[] }) {
  const { current, update, pending } = useUrlFilters()
  const [query, setQuery] = useDebouncedQuery(current, update)
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
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
