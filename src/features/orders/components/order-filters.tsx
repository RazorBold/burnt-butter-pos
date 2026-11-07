"use client"

import { Search } from "lucide-react"

import { DateRangePicker } from "@/components/app/date-range-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ORDER_CHANNEL_LABEL,
  SHIPPING_METHOD_LABEL,
  SHIPPING_METHODS,
} from "@/features/orders/constants"
import { ORDER_STATUS_LABEL, ORDER_STATUSES, ORDER_TYPE_LABEL } from "@/features/orders/filters"
import { useDebouncedQuery, useUrlFilters } from "@/hooks/use-url-filters"
import { cn } from "@/lib/utils"

const ALL = "semua"

/**
 * Filter Daftar Pesanan (03-pesanan.png): cari, rentang tanggal, tipe, status, pengiriman, Reset.
 * Semua disimpan di URL. `from`/`to` adalah rentang yang sedang dipakai server (default hari ini).
 */
export function OrderFilters({ from, to, today }: { from: string; to: string; today: string }) {
  const { current, update, pending } = useUrlFilters()
  const [query, setQuery] = useDebouncedQuery(current, update)
  const hasFilters = ["q", "dari", "sampai", "tipe", "status", "kirim", "sumber"].some((key) =>
    current.has(key),
  )

  const select = (key: string, placeholder: string, options: [string, string][]) => (
    <Select
      value={current.get(key) ?? ALL}
      onValueChange={(value) => update({ [key]: value === ALL ? null : value })}
    >
      <SelectTrigger
        aria-label={placeholder}
        className="h-10! w-full rounded-lg bg-white sm:w-[180px]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div
      className={cn(
        "grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center",
        pending && "opacity-80",
      )}
    >
      <div className="relative sm:col-span-2 lg:w-[300px]">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-body"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama, no. pesanan, telp…"
          aria-label="Cari nama, no. pesanan, atau no. telp"
          className="h-10 rounded-lg bg-white pl-9"
        />
      </div>
      <DateRangePicker
        label="Tanggal pesanan"
        from={from}
        to={to}
        onChange={(range) => {
          const isToday = range.from === today && range.to === today
          update({ dari: isToday ? null : range.from, sampai: isToday ? null : range.to })
        }}
        className="w-full sm:col-span-2 lg:w-auto"
      />
      {select("tipe", "Semua Tipe", Object.entries(ORDER_TYPE_LABEL) as [string, string][])}
      {select(
        "status",
        "Semua Status",
        ORDER_STATUSES.map((status) => [status, ORDER_STATUS_LABEL[status]]),
      )}
      {select(
        "kirim",
        "Semua Pengiriman",
        SHIPPING_METHODS.map((method) => [method, SHIPPING_METHOD_LABEL[method]]),
      )}
      {select("sumber", "Semua Sumber", Object.entries(ORDER_CHANNEL_LABEL) as [string, string][])}
      <Button
        type="button"
        variant="outline"
        disabled={!hasFilters}
        onClick={() => {
          setQuery("")
          update({
            q: null,
            dari: null,
            sampai: null,
            tipe: null,
            status: null,
            kirim: null,
            sumber: null,
          })
        }}
        className="h-10 rounded-lg bg-white px-5 lg:ml-auto"
      >
        Reset
      </Button>
    </div>
  )
}
