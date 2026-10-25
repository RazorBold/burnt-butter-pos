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
import { PAYMENT_STATE_LABEL, PAYMENT_STATES } from "@/features/payments/filters"
import type { ActivePaymentMethod } from "@/features/payments/queries"
import { useDebouncedQuery, useUrlFilters } from "@/hooks/use-url-filters"
import { cn } from "@/lib/utils"

const ALL = "semua"

/** Filter Pembayaran: cari, rentang tanggal pesanan, status bayar, metode, Reset. */
export function PaymentFilters({
  from,
  to,
  today,
  methods,
}: {
  from: string
  to: string
  today: string
  methods: ActivePaymentMethod[]
}) {
  const { current, update, pending } = useUrlFilters()
  const [query, setQuery] = useDebouncedQuery(current, update)
  const hasFilters = ["q", "dari", "sampai", "bayar", "metode"].some((key) => current.has(key))
  const state = current.get("bayar")

  return (
    <div
      className={cn(
        "grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center",
        pending && "opacity-80",
      )}
    >
      <div className="relative sm:col-span-2 lg:w-[340px]">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-body"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama, no. pesanan, atau no. telp…"
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
      <Select
        value={state ?? ALL}
        onValueChange={(value) =>
          // Filter metode hanya berlaku untuk yang lunas.
          update({
            bayar: value === ALL ? null : value,
            ...(value === "belum" ? { metode: null } : {}),
          })
        }
      >
        <SelectTrigger
          aria-label="Status bayar"
          className="h-10! w-full rounded-lg bg-white sm:w-[190px]"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua Status Bayar</SelectItem>
          {PAYMENT_STATES.map((value) => (
            <SelectItem key={value} value={value}>
              {PAYMENT_STATE_LABEL[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={current.get("metode") ?? ALL}
        disabled={state === "belum"}
        onValueChange={(value) => update({ metode: value === ALL ? null : value })}
      >
        <SelectTrigger
          aria-label="Metode bayar"
          className="h-10! w-full rounded-lg bg-white sm:w-[180px]"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua Metode</SelectItem>
          {methods.map((method) => (
            <SelectItem key={method.id} value={method.id}>
              {method.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        disabled={!hasFilters}
        onClick={() => {
          setQuery("")
          update({ q: null, dari: null, sampai: null, bayar: null, metode: null })
        }}
        className="h-10 rounded-lg bg-white px-5 lg:ml-auto"
      >
        Reset
      </Button>
    </div>
  )
}
