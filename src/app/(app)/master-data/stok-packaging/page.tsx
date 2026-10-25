import { Box, Package, Plus } from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import { Suspense } from "react"

import { StockBadge } from "@/components/app/stock-badge"
import { Button } from "@/components/ui/button"
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
import { PackagingFormDialog } from "@/features/packagings/components/packaging-form-dialog"
import { PackagingRowActions } from "@/features/packagings/components/packaging-row-actions"
import { listPackagings } from "@/features/packagings/queries"
import { requirePageAccess } from "@/lib/auth"
import { photoSrc } from "@/lib/photos"

export const metadata: Metadata = { title: "Stok Packaging" }

export default function MasterStokPackagingPage() {
  return (
    <SectionCard>
      <Suspense fallback={<SectionCardSkeleton rows={5} />}>
        <PackagingSection />
      </Suspense>
    </SectionCard>
  )
}

async function PackagingSection() {
  const user = await requirePageAccess("/master-data")
  const canEdit = user.role === "admin"
  const items = await listPackagings()

  return (
    <>
      <SectionCardHeader
        icon={Box}
        title="Stok Packaging"
        description="Kelola jenis packaging dan stok yang tersedia."
        actions={
          canEdit && (
            <PackagingFormDialog
              trigger={
                <Button className="h-10 rounded-lg px-4 font-semibold">
                  <Plus className="size-[18px]" aria-hidden />
                  Tambah Packaging
                </Button>
              }
            />
          )
        }
      />

      {items.length === 0 ? (
        <div className="px-6 py-12">
          <p className="font-semibold text-brand-ink">Belum ada packaging.</p>
          <p className="mt-1 text-sm text-text-body">
            Tambahkan box, paper bag, atau cup beserta stok awalnya.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[620px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Foto</TableHead>
                <TableHead>Nama Packaging</TableHead>
                <TableHead className="text-right">Stok Saat Ini</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const src = photoSrc(item.photoPath)
                return (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6">
                      {src ? (
                        <Image
                          src={src}
                          alt=""
                          width={44}
                          height={36}
                          className="h-9 w-11 rounded-md object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-11 items-center justify-center rounded-md bg-icon-bg text-brand-ink">
                          <Package className="size-4" aria-hidden />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-text-strong">{item.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.stock}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <StockBadge status={item.status} />
                    </TableCell>
                    {canEdit && (
                      <TableCell className="pr-6">
                        <PackagingRowActions packaging={item} />
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {!canEdit && (
        <ReadOnlyNote>
          Hanya Admin yang bisa menambah atau mengubah packaging. Stok masuk/keluar dicatat di menu
          Stok Packaging.
        </ReadOnlyNote>
      )}
    </>
  )
}
