import "server-only"

import { asc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import { orders, orderStatusLogs, shipments } from "@/db/schema"
import type { BulkSkip } from "@/lib/bulk"

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
 * memeriksa role.
 */
export async function changeStatuses(
  orderIds: string[],
  target: OrderStatus,
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
        trackingNo: shipments.trackingNo,
      })
      .from(orders)
      .innerJoin(shipments, eq(shipments.orderId, orders.id))
      .where(inArray(orders.id, orderIds))
      .orderBy(asc(orders.id))
      .for("update")

    const valid: typeof rows = []
    const skipped: (BulkSkip & { from: OrderStatus })[] = []
    for (const row of rows) {
      const reason = statusSkipReason(
        {
          status: row.status,
          method: row.method,
          hasCourier: row.courierId !== null,
          hasTracking: row.trackingNo !== null,
        },
        target,
        rules,
      )
      if (reason) skipped.push({ orderNo: row.orderNo, reason, from: row.status })
      else valid.push(row)
    }

    if (valid.length > 0) {
      await tx
        .update(orders)
        .set({ status: target })
        .where(
          inArray(
            orders.id,
            valid.map((row) => row.id),
          ),
        )
      // Status pengiriman bergantung pada metode, jadi satu UPDATE per metode.
      for (const method of new Set(valid.map((row) => row.method))) {
        await tx
          .update(shipments)
          .set({ status: shipmentStatusFor(target, method) })
          .where(
            inArray(
              shipments.orderId,
              valid.filter((row) => row.method === method).map((row) => row.id),
            ),
          )
      }
      await tx.insert(orderStatusLogs).values(
        valid.map((row) => ({
          orderId: row.id,
          fromStatus: row.status,
          toStatus: target,
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
