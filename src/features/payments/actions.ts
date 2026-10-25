"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getDb } from "@/db"
import { orders, paymentMethods, payments } from "@/db/schema"
import { AuthorizationError, requireRole } from "@/lib/auth"

/** Kasir mengonfirmasi pembayaran (PRD: peran Kasir), Admin bisa semua. */
const CAN_RECORD_PAYMENT = ["admin", "kasir"] as const

type ActionResult = { ok: boolean; message: string }

const markPaidSchema = z.object({
  orderId: z.uuid(),
  paymentMethodId: z.uuid({ error: "Pilih dibayar lewat apa." }),
  note: z.string().trim().max(200, "Catatan terlalu panjang (maks. 200 karakter)."),
})

async function requireRecorder(): Promise<string | ActionResult> {
  try {
    return (await requireRole(CAN_RECORD_PAYMENT)).id
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
}

function revalidatePayments(orderNo: string) {
  revalidatePath("/pembayaran")
  revalidatePath("/pesanan")
  revalidatePath(`/pesanan/${orderNo}`)
  revalidatePath("/dashboard")
}

/**
 * Tandai pesanan Lunas: metode bayar + catatan. Nominal = total pesanan saat itu.
 * Dipanggil lagi untuk pesanan yang sudah lunas berarti mengubah metode/catatannya.
 */
export async function markOrderPaid(input: unknown): Promise<ActionResult> {
  const userId = await requireRecorder()
  if (typeof userId !== "string") return userId

  const parsed = markPaidSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data belum lengkap." }
  }
  const { orderId, paymentMethodId, note } = parsed.data
  const db = getDb()

  const [order] = await db
    .select({ orderNo: orders.orderNo, total: orders.total, status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
  if (!order) return { ok: false, message: "Pesanan tidak ditemukan. Muat ulang halaman." }
  if (order.status === "dibatalkan") {
    return { ok: false, message: `${order.orderNo} sudah dibatalkan, tidak perlu dibayar.` }
  }
  const [method] = await db
    .select({ name: paymentMethods.name })
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, paymentMethodId), eq(paymentMethods.isActive, true)))
  if (!method) {
    return { ok: false, message: "Metode bayar ini sudah nonaktif. Pilih metode lain." }
  }

  const values = {
    paymentMethodId,
    amount: order.total,
    status: "lunas" as const,
    note: note || null,
    paidAt: new Date(),
    recordedBy: userId,
  }
  await db
    .insert(payments)
    .values({ orderId, ...values })
    .onConflictDoUpdate({ target: payments.orderId, set: { ...values, updatedAt: new Date() } })

  revalidatePayments(order.orderNo)
  return { ok: true, message: `${order.orderNo} lunas via ${method.name}.` }
}

/** Kembalikan pesanan ke Belum bayar (mis. salah tandai atau transfer ternyata belum masuk). */
export async function cancelOrderPayment(orderId: string): Promise<ActionResult> {
  const userId = await requireRecorder()
  if (typeof userId !== "string") return userId
  if (!z.uuid().safeParse(orderId).success) {
    return { ok: false, message: "Pesanan tidak dikenal. Muat ulang halaman." }
  }

  const db = getDb()
  const [order] = await db
    .select({ orderNo: orders.orderNo })
    .from(orders)
    .where(eq(orders.id, orderId))
  if (!order) return { ok: false, message: "Pesanan tidak ditemukan. Muat ulang halaman." }
  await db.delete(payments).where(eq(payments.orderId, orderId))

  revalidatePayments(order.orderNo)
  return { ok: true, message: `${order.orderNo} kembali jadi Belum bayar.` }
}
