import { ArrowDownLeft, ArrowUpRight, Box, PackageCheck, TriangleAlert } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { KpiCard, KpiCardSkeleton } from "@/components/app/kpi-card"
import { PAGE_CONTAINER, PageHeader } from "@/components/app/page-header"
import { TablePagination } from "@/components/app/table-pagination"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MovementFilter } from "@/features/packagings/components/movement-filter"
import { PackagingStockCard } from "@/features/packagings/components/packaging-stock-card"
import {
  getTodayPackagingFlow,
  listPackagingMovements,
  listPackagings,
  MOVEMENT_PAGE_SIZE,
} from "@/features/packagings/queries"
import { CAN_EDIT_STOCK } from "@/lib/access"
import { requirePageAccess } from "@/lib/auth"
import { formatWaktuDibuat } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Stok Packaging" }

const PATH = "/stok-packaging"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type SearchParams = PageProps<"/stok-packaging">["searchParams"]

// Desain belum ada. Keputusan pemilik toko (Nov 2026): Stok Packaging hanya untuk box hampers
// (packaging lama diarsipkan). Stok keluar terpotong otomatis saat pesanan di-packing sebagai
// Hampers (menu Packaging); di sini cukup tambah stok dan hitung ulang (revisi).
export default function StokPackagingPage({ searchParams }: PageProps<"/stok-packaging">) {
  return (
    <main className={PAGE_CONTAINER}>
      <PageHeader
        title="Stok Packaging"
        description="Stok box hampers. Terpotong otomatis saat pesanan di-packing sebagai Hampers; di sini tambah stok atau revisi lewat hitung ulang."
      />
      <Suspense fallback={<StockSkeleton />}>
        <StockOverview />
      </Suspense>
      <Suspense fallback={<Skeleton aria-hidden className="mt-8 h-[420px] rounded-2xl" />}>
        <StockHistory searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function StockOverview() {
  const user = await requirePageAccess(PATH)
  const canEdit = CAN_EDIT_STOCK.includes(user.role)
  const [items, flow] = await Promise.all([listPackagings(), getTodayPackagingFlow()])
  const needRestock = items.filter((item) => item.status !== "cukup").length

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Box} label="Jenis Packaging" value={String(items.length)} />
        <KpiCard
          icon={needRestock ? TriangleAlert : PackageCheck}
          label="Perlu Restock"
          value={needRestock ? `${needRestock} jenis` : "Tidak ada"}
        />
        <KpiCard icon={ArrowDownLeft} label="Masuk Hari Ini" value={`${flow.in} pcs`} />
        <KpiCard icon={ArrowUpRight} label="Keluar Hari Ini" value={`${flow.out} pcs`} />
      </div>

      {items.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-6 py-10 text-sm text-text-body">
          Belum ada packaging. Admin bisa menambahkannya di Master Data › Stok Packaging.
        </p>
      ) : (
        <section aria-label="Stok per packaging" className="mt-6">
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {/* Yang perlu restock tampil lebih dulu. */}
            {[...items]
              .sort((a, b) => Number(a.status === "cukup") - Number(b.status === "cukup"))
              .map((item) => (
                <li key={item.id} className="flex">
                  <PackagingStockCard packaging={item} canEdit={canEdit} />
                </li>
              ))}
          </ul>
        </section>
      )}
    </>
  )
}

async function StockHistory({ searchParams }: { searchParams: SearchParams }) {
  await requirePageAccess(PATH)
  const params = await searchParams
  const item = typeof params.item === "string" && UUID.test(params.item) ? params.item : undefined
  const pageParam = Number(typeof params.hal === "string" ? params.hal : 1)
  const [items, { rows, total, page, pageCount }] = await Promise.all([
    listPackagings(),
    listPackagingMovements({
      packagingId: item,
      page: Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1,
    }),
  ])

  return (
    <section
      id="riwayat"
      aria-labelledby="riwayat-title"
      className="mt-8 scroll-mt-24 rounded-2xl border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div>
          <h2 id="riwayat-title" className="text-lg font-bold text-brand-ink">
            Riwayat Stok
          </h2>
          <p className="text-sm text-text-body">
            Semua stok masuk, terpakai untuk packing, dan hitung ulang.
          </p>
        </div>
        <MovementFilter options={items.map(({ id, name }) => ({ id, name }))} />
      </div>
      {rows.length === 0 ? (
        <p className="px-6 py-10 text-sm text-text-body">
          Belum ada catatan stok{item ? " untuk packaging ini" : ""}.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Waktu</TableHead>
                  <TableHead>Packaging</TableHead>
                  <TableHead className="text-right">Perubahan</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="pr-6">Dicatat oleh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-6 tabular-nums">
                      {formatWaktuDibuat(row.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium text-text-strong">
                      {row.packagingName}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold tabular-nums",
                        row.direction === "in" ? "text-trend-up-fg" : "text-trend-down-fg",
                      )}
                    >
                      <span className="sr-only">
                        {row.direction === "in" ? "Masuk " : "Keluar "}
                      </span>
                      {row.direction === "in" ? "+" : "−"}
                      {row.qty} {row.unit}
                    </TableCell>
                    <TableCell className="max-w-[320px] break-words">{row.note ?? "-"}</TableCell>
                    <TableCell className="pr-6">{row.createdByName ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            pathname={PATH}
            params={{ item }}
            page={page}
            pageCount={pageCount}
            pageSize={MOVEMENT_PAGE_SIZE}
            total={total}
            noun="catatan"
          />
        </>
      )}
    </section>
  )
}

function StockSkeleton() {
  return (
    <div aria-hidden>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[210px] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
