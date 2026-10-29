"use client"

import { ArrowLeftRight, History } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { ActiveToggleMenu, EditIconButton } from "@/components/app/row-actions"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { PackagingFormDialog } from "@/features/packagings/components/packaging-form-dialog"
import { StockMovementDialog } from "@/features/packagings/components/stock-movement-dialog"
import type { PackagingRow } from "@/features/packagings/queries"

/** Aksi baris Master Data › Stok Packaging (Admin): ubah data, catat stok, lihat riwayat. */
export function PackagingRowActions({ packaging }: { packaging: PackagingRow }) {
  const [movementOpen, setMovementOpen] = useState(false)

  return (
    <div className="flex items-center justify-end gap-1">
      <PackagingFormDialog
        packaging={packaging}
        trigger={<EditIconButton name={packaging.name} />}
      />
      <ActiveToggleMenu name={packaging.name} isActive>
        <DropdownMenuItem className="h-10" onSelect={() => setMovementOpen(true)}>
          <ArrowLeftRight aria-hidden />
          Catat stok
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="h-10">
          <Link href={`/stok-packaging?item=${packaging.id}#riwayat`}>
            <History aria-hidden />
            Lihat riwayat stok
          </Link>
        </DropdownMenuItem>
      </ActiveToggleMenu>
      <StockMovementDialog
        item={packaging}
        kind="packaging"
        mode="masuk"
        open={movementOpen}
        onOpenChange={setMovementOpen}
      />
    </div>
  )
}
