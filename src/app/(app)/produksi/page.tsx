import { ChefHat, CircleCheck, Clock, UtensilsCrossed } from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import { Suspense } from "react"

import { KpiCard, KpiCardSkeleton } from "@/components/app/kpi-card"
import { PAGE_CONTAINER, PageHeader } from "@/components/app/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { DeliveryDatePicker } from "@/components/app/delivery-date-picker"
import { ProductionOrderCard } from "@/features/production/components/production-order-card"
import { listProductionOrders } from "@/features/production/queries"
import {
  type MenuSummary,
  type ProductionStage,
  productionTotals,
  STAGE_LABEL,
  stageOf,
  summarizeProduction,
} from "@/features/production/summary"
import { requirePageAccess } from "@/lib/auth"
import { formatHariTanggal, toJakartaDateString } from "@/lib/format"
import { photoSrc } from "@/lib/photos"

export const metadata: Metadata = { title: "Produksi" }

const PATH = "/produksi"
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const SIZE_LABEL = { large: "Large", regular: "Regular", single: "Porsi" } as const
const STAGES: ProductionStage[] = ["belum", "proses", "selesai"]

type SearchParams = PageProps<"/produksi">["searchParams"]

// Desain belum ada. Keputusan pemilik toko: rekap per tanggal kirim. "Selesai masak" =
// status pesanan Siap Kirim, jadi pesanan langsung masuk Pengiriman.
export default function ProduksiPage({ searchParams }: PageProps<"/produksi">) {
  return (
    <main className={PAGE_CONTAINER}>
      <Suspense fallback={<ProductionSkeleton />}>
        <Production searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Production({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePageAccess(PATH)
  const canEdit = user.role === "admin" || user.role === "produksi"
  const today = toJakartaDateString(new Date())
  const params = await searchParams
  const date =
    typeof params.tanggal === "string" &&
    ISO_DATE.test(params.tanggal) &&
    !Number.isNaN(Date.parse(params.tanggal))
      ? params.tanggal
      : today

  const orders = await listProductionOrders(date)
  const menus = summarizeProduction(orders)
  const totals = productionTotals(orders)
  const dateLabel = date === today ? "hari ini" : formatHariTanggal(date)

  return (
    <>
      <PageHeader
        title="Produksi"
        description={`Porsi yang harus dimasak untuk pesanan yang dikirim ${dateLabel}.`}
        actions={<DeliveryDatePicker date={date} today={today} />}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={UtensilsCrossed}
          label="Total Porsi"
          value={`${totals.donePortions} / ${totals.portions}`}
        />
        <KpiCard icon={Clock} label="Belum Mulai" value={`${totals.orders.belum} pesanan`} />
        <KpiCard icon={ChefHat} label="Sedang Dimasak" value={`${totals.orders.proses} pesanan`} />
        <KpiCard
          icon={CircleCheck}
          label="Selesai Masak"
          value={`${totals.orders.selesai} pesanan`}
        />
      </div>

      {orders.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-6 py-12 text-center text-text-body">
          Belum ada pesanan yang dikirim {dateLabel}.
        </p>
      ) : (
        <>
          <section aria-labelledby="rekap-title" className="mt-8">
            <h2 id="rekap-title" className="text-lg font-bold text-brand-ink">
              Rekap per Menu
            </h2>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {menus.map((menu, index) => (
                <li key={menu.menuName} className="flex">
                  <MenuSummaryCard menu={menu} id={`menu-${index}`} />
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="board-title" className="mt-8">
            <h2 id="board-title" className="text-lg font-bold text-brand-ink">
              Pesanan
            </h2>
            <div className="mt-3 grid items-start gap-4 lg:grid-cols-3">
              {STAGES.map((stage) => {
                const inStage = orders.filter((order) => stageOf(order.status) === stage)
                return (
                  <section
                    key={stage}
                    aria-labelledby={`stage-${stage}`}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <h3
                      id={`stage-${stage}`}
                      className="flex items-center justify-between font-semibold text-text-strong"
                    >
                      {STAGE_LABEL[stage]}
                      <span className="rounded-md bg-nav-active px-2 py-0.5 text-sm text-brand-ink tabular-nums">
                        {inStage.length}
                      </span>
                    </h3>
                    {inStage.length === 0 ? (
                      <p className="mt-3 text-sm text-text-body">Tidak ada pesanan.</p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {inStage.map((order) => (
                          <li key={order.id}>
                            <ProductionOrderCard order={order} canEdit={canEdit} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
          </section>
        </>
      )}
    </>
  )
}

/** Kartu rekap satu menu: foto, total porsi, per ukuran, dan bar porsi yang sudah selesai. */
function MenuSummaryCard({ menu, id }: { menu: MenuSummary; id: string }) {
  const src = photoSrc(menu.photoPath)
  const percent = menu.total ? Math.round((menu.done / menu.total) * 100) : 0
  return (
    <article
      aria-labelledby={id}
      className="flex w-full flex-col rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-3">
        {src ? (
          <Image
            src={src}
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span aria-hidden className="size-14 shrink-0 rounded-xl bg-nav-active" />
        )}
        <div className="min-w-0">
          <h3 id={id} className="text-sm font-medium text-text-strong">
            {menu.menuName}
          </h3>
          <p className="text-[22px] leading-tight font-bold text-brand-ink tabular-nums">
            {menu.total} <span className="text-sm font-medium text-text-body">porsi</span>
          </p>
        </div>
      </div>
      <dl className="mt-3 space-y-0.5 text-sm">
        {menu.sizes.map((size) => (
          <div key={size.size} className="flex justify-between gap-2">
            <dt className="text-text-body">{SIZE_LABEL[size.size]}</dt>
            <dd className="text-text-strong tabular-nums">
              {size.done} / {size.total} selesai
            </dd>
          </div>
        ))}
      </dl>
      <div
        role="img"
        aria-label={`${menu.done} dari ${menu.total} porsi selesai dimasak`}
        className="mt-auto h-2 overflow-hidden rounded-full bg-nav-active"
      >
        <div className="h-full rounded-full bg-[#2e9b3a]" style={{ width: `${percent}%` }} />
      </div>
    </article>
  )
}

function ProductionSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>
      <Skeleton className="mt-8 h-[320px] rounded-2xl" />
    </div>
  )
}
