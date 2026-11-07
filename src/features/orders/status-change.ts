import "server-only"

import { asc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import { orders, orderStatusLogs, shipments } from "@/db/schema"
import type { PackagingUse } from "@/features/packing/needs"

/** Isian dialog packing: Normal (tanpa stok) atau Hampers dengan box yang dipakai. */
export type PackingInput = { type: "normal" | "hampers"; uses: PackagingUse[] }
import { deductPacking, returnPacking } from "@/features/packing/stock"
import type { BulkSkip } from "@/lib/bulk"
import type { ShippingMethod } from "@/lib/wa-parser"

import type { OrderStatus } from "./filters"
import {
  isPackingStep,
  PACKED_STATUSES,
  shipmentStatusFor,
  type StatusRules,
  statusSkipReason,
  UNPACKED_STATUSES,
} from "./status"

export function revalidateOrders(orderNos: string[] = []) {
  revalidatePath("/pesanan")
  revalidatePath("/dashboard")
  revalidatePath("/produksi")
  revalidatePath("/pengiriman")
  revalidatePath("/pembayaran")
  revalidatePath("/packaging")
  revalidatePath("/stok-packaging")
  for (const orderNo of orderNos) revalidatePath(`/pesanan/${orderNo}`)
}

/**
 * Ubah status beberapa pesanan sekaligus dalam satu transaksi. Pesanan yang langkahnya tidak
 * sah (statusSkipReason) dilewati, sisanya diubah. Status pengiriman ikut disesuaikan
 * (shipmentStatusFor) dan setiap perubahan dicatat di order_status_logs. Pemanggil wajib sudah
 * memeriksa role. `target` boleh berupa fungsi per metode kirim (mis. sentStatusFor: Tandai
 * Dikirim membawa Ekspedisi langsung ke Selesai).
 *
 * Stok packaging ikut di transaksi yang sama: langkah packing (Siap Packing → Siap Kirim)
 * mencatat jenis packing (`packing`) dan memotong stok box hampers yang dipakai; pesanan
 * ter-packing yang mundur ke sebelum packing atau dibatalkan mengembalikan stoknya.
 */
export async function changeStatuses(
  orderIds: string[],
  target: OrderStatus | ((method: ShippingMethod) => OrderStatus),
  userId: string,
  rules: StatusRules = {},
  packing: Record<string, PackingInput> = {},
): Promise<{ done: string[]; skipped: (BulkSkip & { from: OrderStatus })[] }> {
  const result = await getDb().transaction(async (tx) => {
    // FOR UPDATE: dua orang yang mengubah status bersamaan tidak saling menimpa diam-diam.
    // Urut id supaya dua aksi massal yang berbarengan mengunci baris dengan urutan yang sama.
    const rows = await tx
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        status: orders.status,
        method: shipments.method,
        courierId: shipments.courierId,
      })
      .from(orders)
      .innerJoin(shipments, eq(shipments.orderId, orders.id))
      .where(inArray(orders.id, orderIds))
      .orderBy(asc(orders.id))
      .for("update")

    const targetOf = (method: ShippingMethod) =>
      typeof target === "function" ? target(method) : target
    let valid: (typeof rows)[number][] = []
    const skipped: (BulkSkip & { from: OrderStatus })[] = []
    for (const row of rows) {
      const reason = statusSkipReason(
        { status: row.status, method: row.method, hasCourier: row.courierId !== null },
        targetOf(row.method),
        rules,
      )
      if (reason) skipped.push({ orderNo: row.orderNo, reason, from: row.status })
      else valid.push(row)
    }

    // Packing: potong stok dulu; pesanan yang stoknya kurang dilewati.
    const packingRows = valid.filter((row) => isPackingStep(row.status, targetOf(row.method)))
    if (packingRows.length > 0) {
      const usage = Object.fromEntries(
        Object.entries(packing).map(([id, input]) => [
          id,
          input.type === "hampers" ? input.uses : [],
        ]),
      )
      const { skipped: short } = await deductPacking(tx, packingRows, userId, usage)
      const reasonOf = new Map(short.map((item) => [item.id, item.reason]))
      for (const row of valid) {
        const reason = reasonOf.get(row.id)
        if (reason) skipped.push({ orderNo: row.orderNo, reason, from: row.status })
      }
      valid = valid.filter((row) => !reasonOf.has(row.id))
      for (const row of packingRows) {
        if (reasonOf.has(row.id)) continue
        await tx
          .update(orders)
          .set({ packagingType: packing[row.id]?.type ?? "normal" })
          .where(eq(orders.id, row.id))
      }
    }
    // Mundur dari sudah di-packing, atau dibatalkan: stok packaging dikembalikan.
    const unpacked = valid.filter(
      (row) =>
        PACKED_STATUSES.includes(row.status) && UNPACKED_STATUSES.includes(targetOf(row.method)),
    )
    if (unpacked.length > 0) {
      await tx
        .update(orders)
        .set({ packagingType: null })
        .where(
          inArray(
            orders.id,
            unpacked.map((row) => row.id),
          ),
        )
    }
    await returnPacking(tx, unpacked, userId, (orderNo) =>
      target === "dibatalkan" ? `Pesanan ${orderNo} dibatalkan` : `Packing ${orderNo} dibatalkan`,
    )

    // Status tujuan dan status pengiriman bergantung pada metode, jadi UPDATE per metode.
    for (const method of new Set(valid.map((row) => row.method))) {
      const status = targetOf(method)
      const ids = valid.filter((row) => row.method === method).map((row) => row.id)
      await tx.update(orders).set({ status }).where(inArray(orders.id, ids))
      await tx
        .update(shipments)
        .set({ status: shipmentStatusFor(status, method) })
        .where(inArray(shipments.orderId, ids))
    }
    if (valid.length > 0) {
      await tx.insert(orderStatusLogs).values(
        valid.map((row) => ({
          orderId: row.id,
          fromStatus: row.status,
          toStatus: targetOf(row.method),
          changedBy: userId,
        })),
      )
    }

    const byOrderNo = (a: { orderNo: string }, b: { orderNo: string }) =>
      a.orderNo.localeCompare(b.orderNo)
    return {
      done: valid.map((row) => row.orderNo).sort(),
      skipped: skipped.sort(byOrderNo),
    }
  })

  if (result.done.length > 0) revalidateOrders(result.done)
  return result
}
