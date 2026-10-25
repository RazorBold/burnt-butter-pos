"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

/**
 * Baris Daftar Pesanan yang membuka panel detail. Seluruh baris bisa diklik dengan mouse;
 * untuk keyboard dan pembaca layar, nomor pesanan adalah link biasa.
 */
export function OrderRow({
  href,
  orderNo,
  selected,
  children,
}: {
  href: string
  orderNo: string
  selected: boolean
  children: ReactNode
}) {
  const router = useRouter()
  return (
    <TableRow
      aria-selected={selected}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a, button")) return
        router.push(href, { scroll: false })
      }}
      className={cn("cursor-pointer", selected && "bg-nav-active hover:bg-nav-active")}
    >
      <TableCell className="pl-6 font-medium text-text-strong tabular-nums">
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
