"use server"

import { and, eq, inArray, sql } from "drizzle-orm"
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
import { formatOrderNo } from "./order-number"
import { orderSubmitSchema } from "./schemas"

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
        status: shippingMethod === "pick_up" ? null : "menunggu_kurir",
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
