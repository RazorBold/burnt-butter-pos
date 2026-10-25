"use server"

import { and, eq, inArray, sql } from "drizzle-orm"
import { z } from "zod"
import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import {
  customers,
  menus,
  menuVariants,
  orderCounters,
  orderItems,
  orders,
  orderStatusLogs,
  shipments,
} from "@/db/schema"
import { CAN_INPUT_ORDER } from "@/lib/access"
import { AuthorizationError, requireRole } from "@/lib/auth"
import { toJakartaDateString } from "@/lib/format"
import { normalizePhone } from "@/lib/phone"

import { type DraftField, draftIssues } from "./draft"
import { ORDER_STATUS_LABEL, ORDER_STATUSES, type OrderStatus } from "./filters"
import { formatOrderNo } from "./order-number"
import { orderEditSchema, orderSubmitSchema } from "./schemas"
import { isEditable, nextStatuses, shipmentStatusFor } from "./status"

export type CreateOrderResult =
  | { ok: true; orderNo: string; customerName: string; total: number }
  | { ok: false; message: string; errors?: Partial<Record<DraftField, string>> }

class StaleMenuError extends Error {}

/**
 * Simpan pesanan dari form Input Pesanan, dalam satu transaksi:
 * customer (dicari/diperbarui lewat no. HP) → nomor pesanan harian → pesanan berstatus Baru →
 * item dengan harga dari database → pengiriman → log status.
 * Pesanan Hadiah: customer = penerima; nama pengirim dan kartu ucapan disimpan di pesanan.
 * Pembayaran dicatat terpisah, jadi pesanan baru selalu belum bayar.
 */
export async function createOrder(input: unknown): Promise<CreateOrderResult> {
  let userId: string
  try {
    userId = (await requireRole(CAN_INPUT_ORDER)).id
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }

  const parsed = orderSubmitSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: "Data pesanan tidak terbaca. Muat ulang halaman lalu coba lagi." }
  }
  const { draft, waText } = parsed.data
  const today = toJakartaDateString(new Date())
  const issues = draftIssues(draft, today)
  if (Object.keys(issues).length > 0) {
    return { ok: false, message: "Masih ada isian yang belum lengkap.", errors: issues }
  }

  const phone = normalizePhone(draft.phone)!
  const wanted = Object.entries(draft.quantities).filter(([, qty]) => qty > 0)
  const optional = (value: string) => value.trim() || null
  const isHadiah = draft.type === "hadiah"
  const shippingMethod = draft.shippingMethod as Exclude<typeof draft.shippingMethod, "">

  try {
    const result = await getDb().transaction(async (tx) => {
      // Harga selalu dari database, bukan dari browser. Menu yang baru dinonaktifkan ditolak.
      const variants = await tx
        .select({ id: menuVariants.id, price: menuVariants.price })
        .from(menuVariants)
        .innerJoin(menus, eq(menus.id, menuVariants.menuId))
        .where(
          and(
            inArray(
              menuVariants.id,
              wanted.map(([id]) => id),
            ),
            eq(menuVariants.isActive, true),
            eq(menus.isActive, true),
          ),
        )
      if (variants.length !== wanted.length) throw new StaleMenuError()
      const priceOf = new Map(variants.map((variant) => [variant.id, variant.price]))
      const items = wanted.map(([variantId, qty]) => {
        const unitPrice = priceOf.get(variantId)!
        return { menuVariantId: variantId, qty, unitPrice, subtotal: unitPrice * qty }
      })
      const total = items.reduce((sum, item) => sum + item.subtotal, 0)

      const address = optional(draft.address)
      const [customer] = await tx
        .insert(customers)
        .values({ name: draft.name.trim(), phone, address })
        .onConflictDoUpdate({
          target: customers.phone,
          // Nama terbaru dipakai; alamat lama dipertahankan bila kali ini kosong (mis. Pick Up).
          set: {
            name: sql`excluded.name`,
            address: sql`coalesce(excluded.address, ${customers.address})`,
            updatedAt: new Date(),
          },
        })
        .returning({ id: customers.id, name: customers.name })

      const [counter] = await tx
        .insert(orderCounters)
        .values({ date: today, lastSeq: 1 })
        .onConflictDoUpdate({
          target: orderCounters.date,
          set: { lastSeq: sql`${orderCounters.lastSeq} + 1` },
        })
        .returning({ seq: orderCounters.lastSeq })
      const orderNo = formatOrderNo(today, counter.seq)

      const [order] = await tx
        .insert(orders)
        .values({
          orderNo,
          customerId: customer.id,
          type: draft.type,
          deliveryDate: draft.deliveryDate,
          request: optional(draft.request),
          total,
          rawWaText: optional(waText),
          senderName: isHadiah ? optional(draft.senderName) : null,
          cardTo: isHadiah ? optional(draft.cardTo) : null,
          cardWishes: isHadiah ? optional(draft.cardWishes) : null,
          cardFrom: isHadiah ? optional(draft.cardFrom) : null,
          createdBy: userId,
        })
        .returning({ id: orders.id })

      await tx.insert(orderItems).values(items.map((item) => ({ ...item, orderId: order.id })))
      await tx.insert(shipments).values({
        orderId: order.id,
        method: shippingMethod,
        // Kosong sampai pesanan Siap Kirim (lihat shipmentStatusFor).
        status: null,
        address,
      })
      await tx
        .insert(orderStatusLogs)
        .values({ orderId: order.id, fromStatus: null, toStatus: "baru", changedBy: userId })

      return { orderNo, customerName: customer.name, total }
    })

    revalidatePath("/pesanan")
    revalidatePath("/dashboard")
    revalidatePath("/master-data/customer")
    return { ok: true, ...result }
  } catch (error) {
    if (error instanceof StaleMenuError) {
      return {
        ok: false,
        message: "Ada menu yang baru dinonaktifkan atau dihapus. Muat ulang halaman lalu cek lagi.",
      }
    }
    throw error
  }
}

type ActionResult = { ok: boolean; message: string }

async function requireOrderEditor(): Promise<string> {
  return (await requireRole(CAN_INPUT_ORDER)).id
}

function revalidateOrders(orderNo?: string) {
  revalidatePath("/pesanan")
  revalidatePath("/dashboard")
  if (orderNo) revalidatePath(`/pesanan/${orderNo}`)
}

/** Langkah dapur yang boleh dilakukan tim Produksi: Baru ↔ Diproses ↔ Siap Kirim. */
const PRODUCTION_STATUSES: readonly OrderStatus[] = ["baru", "diproses", "siap_kirim"]

/**
 * Ubah status pesanan sesuai alur (nextStatuses). Status pengiriman ikut disesuaikan
 * (shipmentStatusFor) dan perubahan dicatat di order_status_logs.
 * `limitTo`: bila diisi, status asal dan tujuan harus ada di daftar ini (dipakai Produksi).
 */
async function changeOrderStatus(
  orderId: string,
  target: string,
  userId: string,
  limitTo?: readonly OrderStatus[],
): Promise<ActionResult> {
  const status = ORDER_STATUSES.find((value) => value === target)
  if (!z.uuid().safeParse(orderId).success || !status) {
    return { ok: false, message: "Status tidak dikenal. Muat ulang halaman." }
  }

  const result = await getDb().transaction(async (tx) => {
    // FOR UPDATE: dua orang yang mengubah status bersamaan tidak saling menimpa diam-diam.
    const [current] = await tx
      .select({ status: orders.status, orderNo: orders.orderNo, method: shipments.method })
      .from(orders)
      .innerJoin(shipments, eq(shipments.orderId, orders.id))
      .where(eq(orders.id, orderId))
      .for("update")
    if (!current) return { ok: false, message: "Pesanan tidak ditemukan. Muat ulang halaman." }
    const allowed =
      nextStatuses(current.status, current.method).includes(status) &&
      (!limitTo || (limitTo.includes(current.status) && limitTo.includes(status)))
    if (!allowed) {
      return {
        ok: false,
        message: `Pesanan ${ORDER_STATUS_LABEL[current.status]} tidak bisa diubah ke ${ORDER_STATUS_LABEL[status]}. Muat ulang halaman.`,
      }
    }

    await tx.update(orders).set({ status }).where(eq(orders.id, orderId))
    await tx
      .update(shipments)
      .set({ status: shipmentStatusFor(status, current.method) })
      .where(eq(shipments.orderId, orderId))
    await tx
      .insert(orderStatusLogs)
      .values({ orderId, fromStatus: current.status, toStatus: status, changedBy: userId })
    return {
      ok: true,
      message: `Status ${current.orderNo} jadi ${ORDER_STATUS_LABEL[status]}.`,
      orderNo: current.orderNo,
    }
  })

  if (result.ok) {
    revalidateOrders("orderNo" in result ? result.orderNo : undefined)
    revalidatePath("/produksi")
  }
  return { ok: result.ok, message: result.message }
}

/** Ubah Status dari Daftar/Detail Pesanan (Admin, Kasir). */
export async function updateOrderStatus(orderId: string, target: string): Promise<ActionResult> {
  try {
    return changeOrderStatus(orderId, target, await requireOrderEditor())
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
}

/** Mulai / selesai masak dari halaman Produksi (Admin, Produksi). Hanya langkah dapur. */
export async function updateProductionStatus(
  orderId: string,
  target: string,
): Promise<ActionResult> {
  let userId: string
  try {
    userId = (await requireRole(["admin", "produksi"])).id
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
  return changeOrderStatus(orderId, target, userId, PRODUCTION_STATUSES)
}

export type UpdateOrderResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: Partial<Record<DraftField, string>> }

/**
 * Edit data pesanan (customer, alamat, tanggal, metode, request, data hadiah) selama belum
 * dikirim. No. HP baru menautkan pesanan ke customer dengan nomor itu (dibuat bila belum ada).
 */
export async function updateOrderDetails(input: unknown): Promise<UpdateOrderResult> {
  try {
    await requireOrderEditor()
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
  const parsed = orderEditSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: "Data pesanan tidak terbaca. Muat ulang halaman lalu coba lagi." }
  }
  const { orderId, draft } = parsed.data
  const db = getDb()

  const [current] = await db
    .select({
      status: orders.status,
      orderNo: orders.orderNo,
      deliveryDate: orders.deliveryDate,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
  if (!current) return { ok: false, message: "Pesanan tidak ditemukan. Muat ulang halaman." }
  if (!isEditable(current.status)) {
    return {
      ok: false,
      message: `Pesanan ${ORDER_STATUS_LABEL[current.status]} tidak bisa diubah lagi.`,
    }
  }

  // Menu tidak diubah di sini; "items" diisi supaya aturan kelengkapan lain tetap sama dengan form.
  const issues = draftIssues({ ...draft, quantities: { menu: 1 } }, toJakartaDateString(new Date()))
  // Pesanan lama boleh tetap memakai tanggal kirimnya walau sudah lewat.
  if (draft.deliveryDate === current.deliveryDate) delete issues.deliveryDate
  if (Object.keys(issues).length > 0) {
    return { ok: false, message: "Masih ada isian yang belum benar.", errors: issues }
  }

  const phone = normalizePhone(draft.phone)!
  const optional = (value: string) => value.trim() || null
  const isHadiah = draft.type === "hadiah"
  const method = draft.shippingMethod as Exclude<typeof draft.shippingMethod, "">
  const address = optional(draft.address)

  await db.transaction(async (tx) => {
    const [customer] = await tx
      .insert(customers)
      .values({ name: draft.name.trim(), phone, address })
      .onConflictDoUpdate({
        target: customers.phone,
        set: {
          name: sql`excluded.name`,
          address: sql`coalesce(excluded.address, ${customers.address})`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: customers.id })

    await tx
      .update(orders)
      .set({
        customerId: customer.id,
        type: draft.type,
        deliveryDate: draft.deliveryDate,
        request: optional(draft.request),
        senderName: isHadiah ? optional(draft.senderName) : null,
        cardTo: isHadiah ? optional(draft.cardTo) : null,
        cardWishes: isHadiah ? optional(draft.cardWishes) : null,
        cardFrom: isHadiah ? optional(draft.cardFrom) : null,
      })
      .where(eq(orders.id, orderId))
    await tx
      .update(shipments)
      .set({ method, address, status: shipmentStatusFor(current.status, method) })
      .where(eq(shipments.orderId, orderId))
  })

  revalidateOrders(current.orderNo)
  revalidatePath("/master-data/customer")
  return { ok: true, message: `Data ${current.orderNo} disimpan.` }
}
