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
  ORDER_KIND_LABEL,
  ORDER_KINDS,
  SHIPPING_METHOD_LABEL,
  SHIPPING_METHODS,
} from "@/features/orders/constants"
import {
  type DateBasis,
  ORDER_STATUS_LABEL,
  ORDER_STATUSES,
  ORDER_TYPE_LABEL,
} from "@/features/orders/filters"
import { useDebouncedQuery, useUrlFilters } from "@/hooks/use-url-filters"
import { cn } from "@/lib/utils"

const ALL = "semua"

const BASIS_LABEL: Record<DateBasis, string> = { dibuat: "Tgl Pesan", kirim: "Tgl Kirim" }

/**
 * Filter Daftar Pesanan (03-pesanan.png): cari, rentang tanggal, jenis, tipe, status, pengiriman, Reset.
 * Semua disimpan di URL. `from`/`to` adalah rentang yang sedang dipakai server (default hari ini).
 * Tombol "Tgl Pesan / Tgl Kirim" memilih dasar rentang tanggal (?tgl=kirim).
 */
export function OrderFilters({
  basis,
  from,
  to,
  today,
}: {
  basis: DateBasis
  from: string
  to: string
  today: string
}) {
  const { current, update, pending } = useUrlFilters()
  const [query, setQuery] = useDebouncedQuery(current, update)
  const hasFilters = [
    "q",
    "tgl",
    "dari",
    "sampai",
    "jenis",
    "tipe",
    "status",
    "kirim",
    "sumber",
  ].some((key) => current.has(key))

  const select = (
    key: string,
    placeholder: string,
    options: [string, string][],
    widthClass: string,
  ) => (
    <Select
      value={current.get(key) ?? ALL}
      onValueChange={(value) => update({ [key]: value === ALL ? null : value })}
    >
      <SelectTrigger
        aria-label={placeholder}
        className={cn(
          "h-9! w-full rounded-lg bg-white px-2.5 text-[13px] text-text-strong",
          widthClass,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL} className="text-[13px]">
          {placeholder}
        </SelectItem>
        {options.map(([value, label]) => (
          <SelectItem key={value} value={value} className="text-[13px]">
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3",
        pending && "opacity-80",
      )}
    >
      <div className="relative w-full sm:w-[220px] lg:w-[230px]">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-text-body"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama, no. pesanan, telp…"
          aria-label="Cari nama, no. pesanan, atau no. telp"
          className="h-9 rounded-lg bg-white pl-8 text-[13px] placeholder:text-[13px]"
        />
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <div
          role="group"
          aria-label="Filter tanggal berdasarkan"
          className="flex h-9 shrink-0 rounded-lg border border-border bg-white p-0.5"
        >
          {(["dibuat", "kirim"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={basis === value}
              onClick={() => {
                if (basis === value) return
                // Ganti dasar tanggal: rentang kembali ke hari ini supaya tidak membingungkan.
                update({ tgl: value === "kirim" ? "kirim" : null, dari: null, sampai: null })
              }}
              className={cn(
                "rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap text-text-body outline-none hover:text-text-strong focus-visible:ring-3 focus-visible:ring-ring/50",
                basis === value && "bg-brand text-white hover:text-white",
              )}
            >
              {BASIS_LABEL[value]}
            </button>
          ))}
        </div>
        <DateRangePicker
          label={basis === "kirim" ? "Tanggal kirim" : "Tanggal pesanan"}
          presets={basis === "kirim" ? "future" : "past"}
          from={from}
          to={to}
          onChange={(range) => {
            const isToday = range.from === today && range.to === today
            update({ dari: isToday ? null : range.from, sampai: isToday ? null : range.to })
          }}
          className="h-9! min-w-0 flex-1 justify-start gap-2 rounded-lg bg-white px-2.5 text-[13px] sm:flex-none"
        />
      </div>
      {select(
        "sumber",
        "Semua Sumber",
        Object.entries(ORDER_CHANNEL_LABEL) as [string, string][],
        "sm:w-[135px]",
      )}
      {select(
        "jenis",
        "Semua Jenis",
        ORDER_KINDS.map((kind) => [kind, ORDER_KIND_LABEL[kind]]),
        "sm:w-[130px]",
      )}
      {select(
        "tipe",
        "Semua Tipe",
        Object.entries(ORDER_TYPE_LABEL) as [string, string][],
        "sm:w-[120px]",
      )}
      {select(
        "kirim",
        "Semua Pengiriman",
        SHIPPING_METHODS.map((method) => [method, SHIPPING_METHOD_LABEL[method]]),
        "sm:w-[155px]",
      )}
      {select(
        "status",
        "Semua Status",
        ORDER_STATUSES.map((status) => [status, ORDER_STATUS_LABEL[status]]),
        "sm:w-[135px]",
      )}
      <Button
        type="button"
        variant="outline"
        disabled={!hasFilters}
        onClick={() => {
          setQuery("")
          update({
            q: null,
            tgl: null,
            dari: null,
            sampai: null,
            sumber: null,
            jenis: null,
            tipe: null,
            kirim: null,
            status: null,
          })
        }}
        className="h-9 rounded-lg bg-white px-3.5 text-[13px] lg:ml-auto"
      >
        Reset
      </Button>
    </div>
  )
}
