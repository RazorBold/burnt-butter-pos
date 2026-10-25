"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { SelectRowCell } from "@/components/app/row-selection"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

/**
 * Baris Daftar Pesanan/Pengiriman yang membuka panel detail. Seluruh baris bisa diklik dengan
 * mouse; untuk keyboard dan pembaca layar, nomor pesanan adalah link biasa.
 * `selectId`: tampilkan checkbox aksi massal (perlu RowSelectionProvider).
 */
export function OrderRow({
  href,
  orderNo,
  selected,
  selectId,
  children,
}: {
  href: string
  orderNo: string
  selected: boolean
  selectId?: string
  children: ReactNode
}) {
  const router = useRouter()
  return (
    <TableRow
      aria-selected={selected}
      onClick={(event) => {
        const target = event.target as HTMLElement
        // Klik di menu ⋮ atau dialog (portal) tetap merambat ke sini lewat React; abaikan.
        if (!event.currentTarget.contains(target)) return
        if (target.closest("a, button, label")) return
        router.push(href, { scroll: false })
      }}
      className={cn(
        "cursor-pointer has-data-[state=checked]:bg-nav-active/50",
        selected && "bg-nav-active hover:bg-nav-active has-data-[state=checked]:bg-nav-active",
      )}
    >
      {selectId && <SelectRowCell id={selectId} label={`Pilih ${orderNo}`} />}
      <TableCell
        className={cn("font-medium text-text-strong tabular-nums", selectId ? "pl-3" : "pl-6")}
      >
        <Link
          href={href}
          scroll={false}
          aria-current={selected ? "true" : undefined}
          className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {orderNo}
        </Link>
      </TableCell>
      {children}
    </TableRow>
  )
}
