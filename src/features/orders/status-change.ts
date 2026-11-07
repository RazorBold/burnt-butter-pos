import "server-only"

import { asc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import { orders, orderStatusLogs, shipments } from "@/db/schema"
import type { BulkSkip } from "@/lib/bulk"
import type { ShippingMethod } from "@/lib/wa-parser"

import type { OrderStatus } from "./filters"
import { shipmentStatusFor, type StatusRules, statusSkipReason } from "./status"

export function revalidateOrders(orderNos: string[] = []) {
  revalidatePath("/pesanan")
  revalidatePath("/dashboard")
  revalidatePath("/produksi")
  revalidatePath("/pengiriman")
  revalidatePath("/pembayaran")
  for (const orderNo of orderNos) revalidatePath(`/pesanan/${orderNo}`)
}

/**
 * Ubah status beberapa pesanan sekaligus dalam satu transaksi. Pesanan yang langkahnya tidak
 * sah (statusSkipReason) dilewati, sisanya diubah. Status pengiriman ikut disesuaikan
 * (shipmentStatusFor) dan setiap perubahan dicatat di order_status_logs. Pemanggil wajib sudah
 * memeriksa role. `target` boleh berupa fungsi per metode kirim (mis. sentStatusFor: Tandai
 * Dikirim membawa Ekspedisi langsung ke Selesai).
 */
export async function changeStatuses(
  orderIds: string[],
  target: OrderStatus | ((method: ShippingMethod) => OrderStatus),
  userId: string,
  rules: StatusRules = {},
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
    const valid: (typeof rows)[number][] = []
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
