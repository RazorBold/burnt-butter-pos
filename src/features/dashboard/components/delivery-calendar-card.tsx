import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

import {
  busyLevel,
  calendarRange,
  calendarWeeks,
  type DeliveryDay,
  shiftMonth,
} from "@/features/dashboard/delivery-calendar"
import { getDeliveryCalendar } from "@/features/dashboard/queries"
import { addDays } from "@/features/orders/filters"
import { formatHariTanggal } from "@/lib/format"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
const MONTH_NAME = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

const LEVEL_CLASS = {
  0: "bg-white",
  1: "bg-tone-soft",
  2: "bg-tone-ring",
  3: "bg-brand text-white",
} as const

/**
 * Kalender Pengiriman (keputusan pemilik toko, Nov 2026): tiap tanggal menampilkan jumlah pesanan
 * yang harus dikirim, makin gelap makin sibuk, plus pengingat 7 hari ke depan. Klik tanggal untuk
 * membuka daftar pesanan dengan tanggal kirim itu.
 */
export async function DeliveryCalendarCard({
  month,
  today,
  params,
  dayHref,
}: {
  month: string
  today: string
  /** Parameter URL Dashboard saat ini, dipertahankan saat berpindah bulan. */
  params: Record<string, string | undefined>
  /** Tujuan klik tanggal sesuai hak akses; null = tidak bisa diklik. */
  dayHref: "pesanan" | "produksi" | null
}) {
  const range = calendarRange(month)
  const upcomingTo = addDays(today, 6)
  const days = await getDeliveryCalendar(
    range.from < today ? range.from : today,
    range.to > upcomingTo ? range.to : upcomingTo,
  )
  const byDate = new Map(days.map((day) => [day.date, day]))
  const weeks = calendarWeeks(month)
  const inGrid = days.filter((day) => day.date >= range.from && day.date <= range.to)
  const max = Math.max(0, ...inGrid.map((day) => day.orders))
  const monthDays = days.filter((day) => day.date.startsWith(month))
  const monthTotal = sum(monthDays, "orders")
  const monthPortions = sum(monthDays, "portions")
  const monthUnpaid = sum(monthDays, "unpaid")
  const upcoming = Array.from({ length: 7 }, (_, index) => addDays(today, index))
  const monthLabel = MONTH_NAME.format(new Date(`${month}-01T00:00:00Z`))

  const monthHref = (target: string | null) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) if (value) search.set(key, value)
    if (target) search.set("bulan", target)
    else search.delete("bulan")
    const qs = search.toString()
    return `/dashboard${qs ? `?${qs}` : ""}#kalender-pengiriman`
  }
  const hrefFor = (date: string) =>
    dayHref === "pesanan"
      ? `/pesanan?tgl=kirim&dari=${date}&sampai=${date}`
      : dayHref === "produksi"
        ? `/produksi?tanggal=${date}`
        : null

  return (
    <section
      id="kalender-pengiriman"
      aria-label="Kalender Pengiriman"
      className="tone-caramel mt-4 min-w-0 scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-card"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2.5 text-lg leading-snug font-bold text-brand-ink">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tone-soft text-tone-ink ring-1 ring-tone-ring">
            <CalendarDays className="size-[18px]" aria-hidden />
          </span>
          Kalender Pengiriman
        </h2>
        <nav aria-label="Pilih bulan" className="flex items-center gap-1.5">
          <Link
            href={monthHref(shiftMonth(month, -1))}
            scroll={false}
            aria-label="Bulan sebelumnya"
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-white text-text-strong hover:bg-nav-active"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
          <span
            aria-live="polite"
            className="min-w-[150px] text-center font-semibold text-text-strong capitalize"
          >
            {monthLabel}
          </span>
          <Link
            href={monthHref(shiftMonth(month, 1))}
            scroll={false}
            aria-label="Bulan berikutnya"
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-white text-text-strong hover:bg-nav-active"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Link>
          {month !== today.slice(0, 7) && (
            <Link
              href={monthHref(null)}
              scroll={false}
              className="ml-1 rounded-lg border border-border bg-white px-3 py-1.5 text-[13px] font-medium text-text-strong hover:bg-nav-active"
            >
              Bulan ini
            </Link>
          )}
        </nav>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <table className="w-full table-fixed border-separate border-spacing-1 text-sm">
            <caption className="sr-only">
              Jumlah pesanan yang dikirim per tanggal, {monthLabel}
            </caption>
            <thead>
              <tr>
                {WEEKDAYS.map((day) => (
                  <th
                    key={day}
                    scope="col"
                    className="pb-1 text-center text-xs font-semibold text-text-body"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0].date}>
                  {week.map((cell) => {
                    const day = byDate.get(cell.date)
                    const level = busyLevel(day?.orders ?? 0, max)
                    const href = day ? hrefFor(cell.date) : null
                    const isToday = cell.date === today
                    const past = cell.date < today
                    const dark = level === 3
                    const label = `${formatHariTanggal(cell.date)}: ${
                      day ? `${day.orders} pesanan dikirim` : "tidak ada pengiriman"
                    }${day?.unpaid ? `, ${day.unpaid} belum bayar` : ""}${isToday ? " (hari ini)" : ""}`
                    const body = (
                      <>
                        <span
                          className={cn(
                            "text-xs font-semibold tabular-nums sm:text-[13px]",
                            isToday &&
                              !dark &&
                              "flex size-6 items-center justify-center rounded-full bg-brand text-white",
                          )}
                        >
                          {Number(cell.date.slice(8))}
                        </span>
                        {day && (
                          <span className="mt-auto block leading-tight">
                            <span className="block text-base font-bold tabular-nums sm:text-lg">
                              {day.orders}
                              <span className="hidden text-xs font-medium sm:inline"> pesanan</span>
                            </span>
                            {day.unpaid > 0 && (
                              <span
                                className={cn(
                                  "hidden text-[11px] font-semibold sm:block",
                                  dark ? "text-white" : "text-trend-down-fg",
                                )}
                              >
                                {day.unpaid} belum bayar
                              </span>
                            )}
                          </span>
                        )}
                        {day && day.unpaid > 0 && (
                          <span
                            aria-hidden
                            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#d93a2b] ring-2 ring-white sm:hidden"
                          />
                        )}
                      </>
                    )
                    const cellClass = cn(
                      "relative flex h-[58px] flex-col items-start rounded-lg border p-1.5 text-left sm:h-[84px] sm:p-2",
                      LEVEL_CLASS[level],
                      dark ? "border-brand" : "border-border text-text-strong",
                      !cell.inMonth && "opacity-45",
                      past && cell.inMonth && level === 0 && "text-text-body",
                      isToday && "ring-2 ring-brand ring-offset-1",
                    )
                    return (
                      <td key={cell.date} className="p-0 align-top">
                        {href ? (
                          <Link
                            href={href}
                            aria-label={label}
                            data-testid={`kalender-${cell.date}`}
                            className={cn(
                              cellClass,
                              "transition-shadow hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                            )}
                          >
                            {body}
                          </Link>
                        ) : (
                          <div
                            aria-label={label}
                            role="img"
                            data-testid={`kalender-${cell.date}`}
                            className={cellClass}
                          >
                            {body}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[13px] text-text-body">
            Bulan ini:{" "}
            <strong className="font-semibold text-text-strong tabular-nums">{monthTotal}</strong>{" "}
            pesanan dikirim ·{" "}
            <strong className="font-semibold text-text-strong tabular-nums">{monthPortions}</strong>{" "}
            porsi
            {monthUnpaid > 0 && (
              <>
                {" "}
                ·{" "}
                <strong className="font-semibold text-trend-down-fg tabular-nums">
                  {monthUnpaid}
                </strong>{" "}
                belum bayar
              </>
            )}
            . Makin gelap = makin banyak pengiriman.
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-page/60 p-4">
          <h3 className="text-sm font-bold text-brand-ink">Pengingat 7 hari ke depan</h3>
          <ul className="mt-2 divide-y divide-border">
            {upcoming.map((date, index) => {
              const day = byDate.get(date)
              const href = day ? hrefFor(date) : null
              const when = index === 0 ? "Hari ini" : index === 1 ? "Besok" : null
              const content = (
                <>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-text-strong">
                      {when ? `${when} · ` : ""}
                      {formatHariTanggal(date)}
                    </span>
                    {day ? (
                      <span className="block text-xs text-text-body">
                        {day.portions} porsi
                        {day.pending < day.orders && ` · ${day.orders - day.pending} sudah dikirim`}
                        {day.unpaid > 0 && (
                          <span className="font-semibold text-trend-down-fg">
                            {" "}
                            · {day.unpaid} belum bayar
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="block text-xs text-text-body">Tidak ada pengiriman</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-[13px] font-bold tabular-nums",
                      day ? "bg-tone-soft text-tone-ink" : "text-text-body",
                    )}
                  >
                    {day ? `${day.orders} pesanan` : "–"}
                  </span>
                </>
              )
              return (
                <li key={date}>
                  {href ? (
                    <Link
                      href={href}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-nav-active"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-3 py-2">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}

function sum(days: DeliveryDay[], key: "orders" | "portions" | "unpaid") {
  return days.reduce((total, day) => total + day[key], 0)
}
