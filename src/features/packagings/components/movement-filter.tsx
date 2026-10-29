"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUrlFilters } from "@/hooks/use-url-filters"

const ALL = "semua"

/** Saring riwayat stok per barang (?item=): packaging atau bahan baku. */
export function MovementFilter({
  options,
  label = "Filter packaging",
  allLabel = "Semua packaging",
}: {
  options: { id: string; name: string }[]
  label?: string
  allLabel?: string
}) {
  const { current, update } = useUrlFilters()
  return (
    <Select
      value={current.get("item") ?? ALL}
      onValueChange={(value) => update({ item: value === ALL ? null : value })}
    >
      <SelectTrigger aria-label={label} className="h-10! w-full rounded-lg bg-white sm:w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
