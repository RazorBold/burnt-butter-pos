"use client"

import { DateRangePicker } from "@/components/app/date-range-picker"
import { useUrlFilters } from "@/hooks/use-url-filters"

/** Rentang laporan (?dari=&sampai=). Default Bulan Ini; preset ada di dalam pemilih tanggal. */
export function ReportRangeFilter({
  from,
  to,
  defaultFrom,
  defaultTo,
}: {
  from: string
  to: string
  defaultFrom: string
  defaultTo: string
}) {
  const { update, pending } = useUrlFilters()
  return (
    <div className={pending ? "opacity-80" : undefined}>
      <DateRangePicker
        label="Periode laporan"
        from={from}
        to={to}
        onChange={(range) => {
          const isDefault = range.from === defaultFrom && range.to === defaultTo
          update({ dari: isDefault ? null : range.from, sampai: isDefault ? null : range.to })
        }}
      />
    </div>
  )
}
