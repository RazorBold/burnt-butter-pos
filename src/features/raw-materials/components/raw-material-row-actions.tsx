"use client"

import { ArrowLeftRight, History } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { ActiveToggleMenu, EditIconButton } from "@/components/app/row-actions"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { StockMovementDialog } from "@/features/packagings/components/stock-movement-dialog"
import { RawMaterialFormDialog } from "@/features/raw-materials/components/raw-material-form-dialog"
import type { RawMaterialRow } from "@/features/raw-materials/queries"

/**
 * Aksi baris Master Data › Bahan Baku. Admin: ubah data + menu ⋮ (catat stok, riwayat).
 * Produksi: hanya tombol Catat stok.
 */
export function RawMaterialRowActions({
  material,
  canEditData,
}: {
  material: RawMaterialRow
  canEditData: boolean
}) {
  const [movementOpen, setMovementOpen] = useState(false)
  const dialog = (
    <StockMovementDialog
      item={material}
      kind="raw_material"
      mode="masuk"
      open={movementOpen}
      onOpenChange={setMovementOpen}
    />
  )

  if (!canEditData) {
    return (
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMovementOpen(true)}
          className="h-9 rounded-lg bg-white px-3"
          aria-label={`Catat stok ${material.name}`}
        >
          <ArrowLeftRight aria-hidden />
          Catat stok
        </Button>
        {dialog}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <RawMaterialFormDialog
        material={material}
        trigger={<EditIconButton name={material.name} />}
      />
      <ActiveToggleMenu name={material.name} isActive>
        <DropdownMenuItem className="h-10" onSelect={() => setMovementOpen(true)}>
          <ArrowLeftRight aria-hidden />
          Catat stok
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="h-10">
          <Link href={`/master-data/bahan-baku?item=${material.id}#riwayat`}>
            <History aria-hidden />
            Lihat riwayat stok
          </Link>
        </DropdownMenuItem>
      </ActiveToggleMenu>
      {dialog}
    </div>
  )
}
