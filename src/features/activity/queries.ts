import "server-only"

import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm"

import { getDb } from "@/db"
import {
  orderDeletions,
  orderEditLogs,
  orders,
  orderStatusLogs,
  packagings,
  paymentMethods,
  payments,
  profiles,
  stockMovements,
} from "@/db/schema"
import { EDIT_PART_LABEL } from "@/features/orders/edit-log"
import { ORDER_STATUS_LABEL, ORDER_TYPE_LABEL } from "@/features/orders/filters"
import { canAccessPath, type Role } from "@/lib/access"
import { formatJumlah, formatRupiah } from "@/lib/format"

import { type Activity, ACTIVITY_LIMIT, mergeActivity } from "./feed"

/** Data uji e2e ("QA Customer 1794…", "QA Packaging 1794…") tidak tampil untuk staf asli. */
const notTestOrder = sql`${orders.customerName} !~ '^QA Customer [0-9]'`
const notTestDeletion = sql`${orderDeletions.customerName} !~ '^QA Customer [0-9]'`
const notTestPackaging = sql`${packagings.name} !~ '^QA Packaging [0-9]'`

/** "Rp 40.000" tanpa terpotong di antara Rp dan angka. */
const rupiah = (amount: number) => formatRupiah(amount).replace(" ", " ")

const iso = (date: Date | null) => (date ?? new Date(0)).toISOString()

/**
 * Aktivitas terbaru sesuai role: semua role melihat update pesanan (Produksi tanpa nominal uang);
 * update stok hanya untuk role yang membuka Packaging & Loyang. `includeTest` untuk akun QA.
 */
export async function listActivity(role: Role, includeTest = false): Promise<Activity[]> {
  const db = getDb()
  const showMoney = role !== "produksi"
  const showStock = canAccessPath(role, "/stok-packaging")
  const orderHref = (orderNo: string) =>
    canAccessPath(role, "/pesanan")
      ? `/pesanan?pesanan=${orderNo}`
      : canAccessPath(role, "/produksi")
        ? "/produksi"
        : null
  const orderFilter = includeTest ? undefined : notTestOrder

  const [created, paid, statuses, edits, urgents, deletions, stocks] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        at: orders.createdAt,
        customerName: orders.customerName,
        type: orders.type,
        total: orders.total,
        actorId: orders.createdBy,
        actorName: profiles.name,
      })
      .from(orders)
      .leftJoin(profiles, eq(profiles.id, orders.createdBy))
      .where(orderFilter)
      .orderBy(desc(orders.createdAt))
      .limit(ACTIVITY_LIMIT),
    db
      .select({
        id: payments.id,
        orderNo: orders.orderNo,
        at: payments.paidAt,
        method: paymentMethods.name,
        amount: payments.amount,
        actorId: payments.recordedBy,
        actorName: profiles.name,
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .innerJoin(paymentMethods, eq(paymentMethods.id, payments.paymentMethodId))
      .leftJoin(profiles, eq(profiles.id, payments.recordedBy))
      .where(and(eq(payments.status, "lunas"), isNotNull(payments.paidAt), orderFilter))
      .orderBy(desc(payments.paidAt))
      .limit(ACTIVITY_LIMIT),
    db
      .select({
        id: orderStatusLogs.id,
        orderNo: orders.orderNo,
        at: orderStatusLogs.changedAt,
        from: orderStatusLogs.fromStatus,
        to: orderStatusLogs.toStatus,
        actorId: orderStatusLogs.changedBy,
        actorName: profiles.name,
      })
      .from(orderStatusLogs)
      .innerJoin(orders, eq(orders.id, orderStatusLogs.orderId))
      .leftJoin(profiles, eq(profiles.id, orderStatusLogs.changedBy))
      .where(and(isNotNull(orderStatusLogs.fromStatus), orderFilter))
      .orderBy(desc(orderStatusLogs.changedAt))
      .limit(ACTIVITY_LIMIT),
    db
      .select({
        id: orderEditLogs.id,
        orderNo: orders.orderNo,
        at: orderEditLogs.editedAt,
        part: orderEditLogs.part,
        changes: orderEditLogs.changes,
        actorId: orderEditLogs.editedBy,
        actorName: profiles.name,
      })
      .from(orderEditLogs)
      .innerJoin(orders, eq(orders.id, orderEditLogs.orderId))
      .leftJoin(profiles, eq(profiles.id, orderEditLogs.editedBy))
      .where(orderFilter)
      .orderBy(desc(orderEditLogs.editedAt))
      .limit(ACTIVITY_LIMIT),
    db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        at: orders.urgentAt,
        note: orders.urgentNote,
        actorId: orders.urgentBy,
        actorName: profiles.name,
      })
      .from(orders)
      .leftJoin(profiles, eq(profiles.id, orders.urgentBy))
      .where(and(isNotNull(orders.urgentAt), orderFilter))
      .orderBy(desc(orders.urgentAt))
      .limit(ACTIVITY_LIMIT),
    db
      .select({
        id: orderDeletions.id,
        orderNo: orderDeletions.orderNo,
        at: orderDeletions.deletedAt,
        customerName: orderDeletions.customerName,
        type: orderDeletions.type,
        status: orderDeletions.status,
        total: orderDeletions.total,
        reason: orderDeletions.reason,
        actorId: orderDeletions.deletedBy,
        actorName: profiles.name,
      })
      .from(orderDeletions)
      .leftJoin(profiles, eq(profiles.id, orderDeletions.deletedBy))
      .where(includeTest ? undefined : notTestDeletion)
      .orderBy(desc(orderDeletions.deletedAt))
      .limit(ACTIVITY_LIMIT),
    showStock
      ? db
          .select({
            id: stockMovements.id,
            itemId: stockMovements.itemId,
            at: stockMovements.createdAt,
            name: packagings.name,
            unit: packagings.unit,
            direction: stockMovements.direction,
            qty: stockMovements.qty,
            note: stockMovements.note,
            actorId: stockMovements.createdBy,
            actorName: profiles.name,
          })
          .from(stockMovements)
          .innerJoin(packagings, eq(packagings.id, stockMovements.itemId))
          .leftJoin(profiles, eq(profiles.id, stockMovements.createdBy))
          // Pemotongan otomatis per pesanan sudah tercakup di notifikasi "lunas".
          .where(
            and(
              eq(stockMovements.itemType, "packaging"),
              isNull(stockMovements.orderId),
              includeTest ? undefined : notTestPackaging,
            ),
          )
          .orderBy(desc(stockMovements.createdAt))
          .limit(ACTIVITY_LIMIT)
      : Promise.resolve([]),
  ])

  return mergeActivity([
    created.map((row) => ({
      id: `order:${row.id}`,
      kind: "order" as const,
      at: iso(row.at),
      title: `Pesanan baru ${row.orderNo}`,
      detail: [row.customerName, ORDER_TYPE_LABEL[row.type], showMoney ? rupiah(row.total) : null]
        .filter(Boolean)
        .join(" · "),
      href: orderHref(row.orderNo),
      actorId: row.actorId,
      actorName: row.actorName,
    })),
    paid.map((row) => ({
      id: `paid:${row.id}`,
      kind: "paid" as const,
      at: iso(row.at),
      title: `${row.orderNo} lunas`,
      detail: `via ${row.method}${showMoney ? ` · ${rupiah(row.amount)}` : ""} · stok loyang & box terpotong`,
      href: orderHref(row.orderNo),
      actorId: row.actorId,
      actorName: row.actorName,
    })),
    statuses.map((row) => ({
      id: `status:${row.id}`,
      kind: "status" as const,
      at: iso(row.at),
      title: `${row.orderNo} jadi ${ORDER_STATUS_LABEL[row.to]}`,
      detail: row.from ? `${ORDER_STATUS_LABEL[row.from]} → ${ORDER_STATUS_LABEL[row.to]}` : null,
      href: orderHref(row.orderNo),
      actorId: row.actorId,
      actorName: row.actorName,
    })),
    edits.map((row) => ({
      id: `edit:${row.id}`,
      kind: "edit" as const,
      at: iso(row.at),
      title: `${row.orderNo}: ${EDIT_PART_LABEL[row.part]}`,
      detail: row.changes.slice(0, 2).join(" · ") || null,
      href: orderHref(row.orderNo),
      actorId: row.actorId,
      actorName: row.actorName,
    })),
    urgents.map((row) => ({
      id: `urgent:${row.id}:${iso(row.at)}`,
      kind: "urgent" as const,
      at: iso(row.at),
      title: `${row.orderNo} ditandai URGENT`,
      detail: row.note,
      href: orderHref(row.orderNo),
      actorId: row.actorId,
      actorName: row.actorName,
    })),
    // Pesanan sudah tidak ada, jadi tanpa tautan.
    deletions.map((row) => ({
      id: `deleted:${row.id}`,
      kind: "deleted" as const,
      at: iso(row.at),
      title: `Pesanan ${row.orderNo} dihapus`,
      detail: [
        row.customerName,
        ORDER_TYPE_LABEL[row.type],
        ORDER_STATUS_LABEL[row.status],
        showMoney ? rupiah(row.total) : null,
        row.reason ? `Alasan: ${row.reason}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      href: null,
      actorId: row.actorId,
      actorName: row.actorName,
    })),
    stocks.map((row) => ({
      id: `stock:${row.id}`,
      kind: "stock" as const,
      at: iso(row.at),
      title: `Stok ${row.name} ${row.direction === "in" ? "+" : "−"}${formatJumlah(Number(row.qty))} ${row.unit}`,
      detail: row.note,
      href: `/stok-packaging?item=${row.itemId}#riwayat`,
      actorId: row.actorId,
      actorName: row.actorName,
    })),
  ])
}
