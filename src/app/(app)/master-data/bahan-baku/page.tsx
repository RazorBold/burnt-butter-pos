import { Leaf, Plus } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { StockBadge } from "@/components/app/stock-badge"
import { TablePagination } from "@/components/app/table-pagination"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ReadOnlyNote,
  SectionCard,
  SectionCardHeader,
  SectionCardSkeleton,
} from "@/features/master-data/components/section-card"
import { MovementFilter } from "@/features/packagings/components/movement-filter"
import { RawMaterialFormDialog } from "@/features/raw-materials/components/raw-material-form-dialog"
import { RawMaterialRowActions } from "@/features/raw-materials/components/raw-material-row-actions"
import {
  listRawMaterialMovements,
  listRawMaterials,
  RAW_MOVEMENT_PAGE_SIZE,
} from "@/features/raw-materials/queries"
import { CAN_EDIT_STOCK } from "@/lib/access"
import { requirePageAccess } from "@/lib/auth"
import { formatJumlah, formatWaktuDibuat } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Bahan Baku" }

const PATH = "/master-data/bahan-baku"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type SearchParams = PageProps<"/master-data/bahan-baku">["searchParams"]

export default function BahanBakuPage({ searchParams }: PageProps<"/master-data/bahan-baku">) {
  return (
    <div className="space-y-6">
      <SectionCard>
        <Suspense fallback={<SectionCardSkeleton rows={5} />}>
          <MaterialSection />
        </Suspense>
      </SectionCard>
      <Suspense fallback={<Skeleton aria-hidden className="h-[360px] rounded-2xl" />}>
        <MovementHistory searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function MaterialSection() {
  const user = await requirePageAccess("/master-data")
  const canEditData = user.role === "admin"
  const canRecord = CAN_EDIT_STOCK.includes(user.role)
  const items = await listRawMaterials()

  return (
    <>
      <SectionCardHeader
        icon={Leaf}
        title="Bahan Baku"
        description="Kelola bahan baku utama untuk produksi."
        actions={
          canEditData && (
            <RawMaterialFormDialog
              trigger={
                <Button className="h-10 rounded-lg px-4 font-semibold">
                  <Plus className="size-[18px]" aria-hidden />
                  Tambah Bahan Baku
                </Button>
              }
            />
          )
        }
      />

      {items.length === 0 ? (
        <div className="px-6 py-12">
          <p className="font-semibold text-brand-ink">Belum ada bahan baku.</p>
          <p className="mt-1 text-sm text-text-body">
            {canEditData
              ? "Tambahkan bahan seperti pasta, keju, atau daging beserta stok minimumnya."
              : "Admin bisa menambahkan bahan baku beserta stok minimumnya."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Nama Bahan</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead className="text-right">Stok Saat Ini</TableHead>
                <TableHead className="text-right">Stok Minimum</TableHead>
                <TableHead>Status</TableHead>
                {canRecord && <TableHead className="pr-6 text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-6 font-medium text-text-strong">{item.name}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatJumlah(item.stock)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatJumlah(item.minStock)}
                  </TableCell>
                  <TableCell>
                    <StockBadge status={item.status} />
                  </TableCell>
                  {canRecord && (
                    <TableCell className="pr-6">
                      <RawMaterialRowActions material={item} canEditData={canEditData} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!canEditData && (
        <ReadOnlyNote>
          {canRecord
            ? "Hanya Admin yang bisa menambah atau mengubah bahan baku. Kamu bisa mencatat stok masuk, keluar, dan hitung ulang."
            : "Hanya Admin yang bisa mengubah bahan baku. Stok dicatat oleh Admin dan tim Produksi."}
        </ReadOnlyNote>
      )}
    </>
  )
}

async function MovementHistory({ searchParams }: { searchParams: SearchParams }) {
  await requirePageAccess("/master-data")
  const params = await searchParams
  const item = typeof params.item === "string" && UUID.test(params.item) ? params.item : undefined
  const pageParam = Number(typeof params.hal === "string" ? params.hal : 1)
  const [items, { rows, total, page, pageCount }] = await Promise.all([
    listRawMaterials(),
    listRawMaterialMovements({
      rawMaterialId: item,
      page: Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1,
    }),
  ])

  return (
    <section
      id="riwayat"
      aria-labelledby="riwayat-title"
      className="scroll-mt-24 rounded-2xl border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div>
          <h2 id="riwayat-title" className="text-lg font-bold text-brand-ink">
            Riwayat Stok Bahan Baku
          </h2>
          <p className="text-sm text-text-body">Semua stok masuk, keluar, dan hitung ulang.</p>
        </div>
        <MovementFilter
          options={items.map(({ id, name }) => ({ id, name }))}
          label="Filter bahan baku"
          allLabel="Semua bahan baku"
        />
      </div>
      {rows.length === 0 ? (
        <p className="px-6 py-10 text-sm text-text-body">
          Belum ada catatan stok{item ? " untuk bahan ini" : ""}.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Waktu</TableHead>
                  <TableHead>Bahan</TableHead>
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
                    <TableCell className="font-medium text-text-strong">{row.itemName}</TableCell>
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
                      {formatJumlah(row.qty)} {row.unit}
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
            pageSize={RAW_MOVEMENT_PAGE_SIZE}
            total={total}
            noun="catatan"
          />
        </>
      )}
    </section>
  )
}
