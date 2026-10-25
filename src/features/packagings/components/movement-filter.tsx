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

/** Saring riwayat stok per packaging (?item=). */
export function MovementFilter({ options }: { options: { id: string; name: string }[] }) {
  const { current, update } = useUrlFilters()
  return (
    <Select
      value={current.get("item") ?? ALL}
      onValueChange={(value) => update({ item: value === ALL ? null : value })}
    >
      <SelectTrigger
        aria-label="Filter packaging"
        className="h-10! w-full rounded-lg bg-white sm:w-[220px]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Semua packaging</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
