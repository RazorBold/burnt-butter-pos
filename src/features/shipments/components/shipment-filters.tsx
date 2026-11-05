"use client"

import { DeliveryDatePicker } from "@/components/app/delivery-date-picker"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SHIPPING_METHOD_LABEL, SHIPPING_METHODS } from "@/features/orders/constants"
import {
  SHIPMENT_STATE_LABEL,
  SHIPMENT_STATES,
  TAB_LABEL,
  TABS,
  type ShipmentTab,
} from "@/features/shipments/logic"
import type { CourierOption } from "@/features/shipments/queries"
import { useUrlFilters } from "@/hooks/use-url-filters"
import { cn } from "@/lib/utils"

const ALL = "semua"

/** Tab segmen + filter Pengiriman (04-pengiriman.png). Semua disimpan di URL. */
export function ShipmentFilters({
  date,
  today,
  tab,
  tabCounts,
  couriers,
}: {
  date: string
  today: string
  tab: ShipmentTab
  tabCounts: Record<ShipmentTab, number>
  couriers: CourierOption[]
}) {
  const { current, update, pending } = useUrlFilters()
  const hasFilters = ["tanggal", "tab", "metode", "kurir", "status"].some((key) => current.has(key))

  const select = (key: string, label: string, options: [string, string][]) => (
    <Select
      value={current.get(key) ?? ALL}
      onValueChange={(value) => update({ [key]: value === ALL ? null : value })}
    >
      <SelectTrigger aria-label={label} className="h-10! w-full rounded-lg bg-white sm:w-[170px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}</SelectItem>
        {options.map(([value, text]) => (
          <SelectItem key={value} value={value}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div className={cn("space-y-3", pending && "opacity-80")}>
      <div
        role="group"
        aria-label="Kelompok pengiriman"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {TABS.map((value) => {
          const selected = tab === value
          return (
            <button
              suppressHydrationWarning
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => update({ tab: value === "semua" ? null : value })}
              className={cn(
                "h-11 shrink-0 rounded-lg border px-4 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-card text-text-strong hover:bg-nav-active",
              )}
            >
              {TAB_LABEL[value]} <span className="tabular-nums">({tabCounts[value]})</span>
            </button>
          )
        })}
      </div>
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
        <div className="sm:col-span-2 lg:col-span-1">
          <DeliveryDatePicker date={date} today={today} />
        </div>
        {select(
          "metode",
          "Semua Metode",
          SHIPPING_METHODS.map((method) => [method, SHIPPING_METHOD_LABEL[method]]),
        )}
        {select(
          "kurir",
          "Semua Kurir",
          couriers.map((courier) => [courier.id, courier.name]),
        )}
        {select(
          "status",
          "Semua Status",
          SHIPMENT_STATES.map((state) => [state, SHIPMENT_STATE_LABEL[state]]),
        )}
        <Button
          type="button"
          variant="outline"
          disabled={!hasFilters}
          onClick={() =>
            update({ tanggal: null, tab: null, metode: null, kurir: null, status: null })
          }
          className="h-10 rounded-lg bg-white px-5 lg:ml-auto"
        >
          Reset
        </Button>
      </div>
    </div>
  )
}
