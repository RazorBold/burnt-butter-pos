"use server"

import { and, asc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getDb } from "@/db"
import { couriers, orders, shipments } from "@/db/schema"
import { sentStatusFor } from "@/features/orders/status"
import { changeStatuses } from "@/features/orders/status-change"
import { AuthorizationError, requireRole } from "@/lib/auth"
import { BULK_LIMIT, type BulkResult, type BulkSkip, summarizeBulk } from "@/lib/bulk"

import { canSetTrackingLink, normalizeTrackingUrl, SLOT_LABEL, SLOTS } from "./logic"

/** Pengiriman diatur Kasir dan Admin (PRD: peran Kasir). */
async function requireShipper(): Promise<string | BulkResult> {
  try {
    return (await requireRole(["admin", "kasir"])).id
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
}

const orderIdsSchema = z.array(z.uuid()).min(1).max(BULK_LIMIT)

const assignSchema = z.object({
  orderIds: orderIdsSchema,
  courierId: z.uuid({ error: "Pilih kurir." }),
  slot: z.enum(SLOTS, { error: "Pilih slot jam pengiriman." }),
})

/**
 * Ubah Kurir / Jadwal (F-45, F-46): kurir internal + slot 09-12 / 13-17, untuk satu pesanan
 * (panel detail) atau beberapa sekaligus (BELL-19). Hanya metode Kurir Internal, selama pesanan
 * belum selesai atau dibatalkan; pesanan lain dilewati.
 */
export async function assignCourier(input: unknown): Promise<BulkResult> {
  const userId = await requireShipper()
  if (typeof userId !== "string") return userId
  const parsed = assignSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data belum lengkap." }
  }
  const { orderIds, courierId, slot } = parsed.data
  const db = getDb()

  const [courier] = await db
    .select({ name: couriers.name })
    .from(couriers)
    .where(
      and(eq(couriers.id, courierId), eq(couriers.isActive, true), eq(couriers.type, "internal")),
    )
  if (!courier) return { ok: false, message: "Kurir ini sudah nonaktif. Pilih kurir lain." }

  const rows = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      status: orders.status,
      method: shipments.method,
    })
    .from(orders)
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .where(inArray(orders.id, orderIds))
    .orderBy(asc(orders.orderNo))
  const skipped: BulkSkip[] = []
  const done = rows.filter((row) => {
    if (row.method !== "kurir_internal") {
      skipped.push({ orderNo: row.orderNo, reason: "bukan Kurir Internal" })
    } else if (row.status === "selesai" || row.status === "dibatalkan") {
      skipped.push({
        orderNo: row.orderNo,
        reason: `sudah ${row.status === "selesai" ? "Selesai" : "Dibatalkan"}`,
      })
    } else return true
    return false
  })

  if (done.length > 0) {
    await db
      .update(shipments)
      .set({ courierId, slot })
      .where(
        inArray(
          shipments.orderId,
          done.map((row) => row.id),
        ),
      )
    revalidatePath("/pengiriman")
    for (const row of done) revalidatePath(`/pesanan/${row.orderNo}`)
  }
  const when = `${courier.name}, jam ${SLOT_LABEL[slot]}`
  return summarizeBulk({
    done: done.map((row) => row.orderNo),
    skipped,
    one: (orderNo) => `${orderNo} diantar ${when}.`,
    many: (count) => `${count} pesanan diantar ${when}.`,
  })
}

/**
 * Tandai Dikirim massal (BELL-19), mis. saat kurir berangkat membawa beberapa pesanan.
 * Hanya pesanan Siap Kirim; Kurir Internal harus sudah punya kurir, Pick Up tidak dikirim.
 * Ekspedisi (olshop) langsung Selesai setelah dikirim (sentStatusFor).
 */
export async function markShipmentsSent(orderIds: unknown): Promise<BulkResult> {
  const userId = await requireShipper()
  if (typeof userId !== "string") return userId
  const ids = orderIdsSchema.safeParse(orderIds)
  if (!ids.success) {
    return { ok: false, message: "Pilihan pesanan tidak terbaca. Muat ulang halaman." }
  }
  return summarizeBulk({
    ...(await changeStatuses(ids.data, sentStatusFor, userId, { requireCourier: true })),
    one: (orderNo) => `${orderNo} ditandai dikirim.`,
    many: (count) => `${count} pesanan ditandai dikirim.`,
  })
}

const trackingLinkSchema = z.object({ orderId: z.uuid(), url: z.string().max(500) })

/** Link lacak perjalanan makanan (Admin, Kasir), bukan untuk olshop. Kosong = link dihapus. */
export async function saveTrackingLink(input: unknown): Promise<BulkResult> {
  const userId = await requireShipper()
  if (typeof userId !== "string") return userId
  const parsed = trackingLinkSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: "Link terlalu panjang atau tidak terbaca." }
  const { orderId, url } = parsed.data
  const trackingUrl = url.trim() ? normalizeTrackingUrl(url) : null
  if (url.trim() && !trackingUrl) {
    return { ok: false, message: "Link belum benar. Contoh: https://gojek.com/track/abc" }
  }

  const db = getDb()
  const [current] = await db
    .select({
      orderNo: orders.orderNo,
      status: orders.status,
      method: shipments.method,
      trackingUrl: shipments.trackingUrl,
    })
    .from(orders)
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .where(eq(orders.id, orderId))
  if (!current) return { ok: false, message: "Pesanan tidak ditemukan. Muat ulang halaman." }
  if (!canSetTrackingLink(current.method, current.status)) {
    return { ok: false, message: `${current.orderNo} tidak bisa diberi link lacak.` }
  }

  // Link baru (atau dihapus) berarti belum dikirim ke customer.
  const changed = trackingUrl !== current.trackingUrl
  await db
    .update(shipments)
    .set(changed ? { trackingUrl, trackingLinkSentAt: null } : { trackingUrl })
    .where(eq(shipments.orderId, orderId))
  revalidatePath("/pengiriman")
  revalidatePath("/pesanan")
  revalidatePath(`/pesanan/${current.orderNo}`)
  return {
    ok: true,
    message: trackingUrl
      ? `Link lacak ${current.orderNo} disimpan.`
      : `Link lacak ${current.orderNo} dihapus.`,
  }
}

const linkSentSchema = z.object({ orderId: z.uuid(), sent: z.boolean() })

/**
 * Tandai link lacak sudah (atau belum) dikirim ke customer (Admin, Kasir). Hanya untuk pesanan
 * yang punya link lacak.
 */
export async function markTrackingLinkSent(input: unknown): Promise<BulkResult> {
  const userId = await requireShipper()
  if (typeof userId !== "string") return userId
  const parsed = linkSentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: "Pesanan tidak terbaca. Muat ulang halaman." }
  const { orderId, sent } = parsed.data

  const db = getDb()
  const [current] = await db
    .select({ orderNo: orders.orderNo, trackingUrl: shipments.trackingUrl })
    .from(orders)
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .where(eq(orders.id, orderId))
  if (!current) return { ok: false, message: "Pesanan tidak ditemukan. Muat ulang halaman." }
  if (!current.trackingUrl) {
    return { ok: false, message: `${current.orderNo} belum punya link lacak.` }
  }

  await db
    .update(shipments)
    .set({ trackingLinkSentAt: sent ? new Date() : null })
    .where(eq(shipments.orderId, orderId))
  revalidatePath("/pengiriman")
  revalidatePath("/pesanan")
  revalidatePath(`/pesanan/${current.orderNo}`)
  return {
    ok: true,
    message: sent
      ? `Link lacak ${current.orderNo} ditandai sudah dikirim ke customer.`
      : `Tanda kirim link ${current.orderNo} dibatalkan.`,
  }
}
