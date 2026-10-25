"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getDb } from "@/db"
import { couriers, orders, shipments } from "@/db/schema"
import { AuthorizationError, requireRole } from "@/lib/auth"

import { SLOT_LABEL, SLOTS } from "./logic"

type ActionResult = { ok: boolean; message: string }

const assignSchema = z.object({
  orderId: z.uuid(),
  courierId: z.uuid({ error: "Pilih kurir." }),
  slot: z.enum(SLOTS, { error: "Pilih slot jam pengiriman." }),
})

/**
 * Ubah Kurir / Jadwal (F-45, F-46): kurir internal + slot 09-12 / 13-17. Hanya untuk metode
 * Kurir Internal, dan selama pesanan belum selesai atau dibatalkan.
 */
export async function assignCourier(input: unknown): Promise<ActionResult> {
  try {
    await requireRole(["admin", "kasir"])
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
  const parsed = assignSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data belum lengkap." }
  }
  const { orderId, courierId, slot } = parsed.data
  const db = getDb()

  const [current] = await db
    .select({ orderNo: orders.orderNo, status: orders.status, method: shipments.method })
    .from(orders)
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .where(eq(orders.id, orderId))
  if (!current) return { ok: false, message: "Pesanan tidak ditemukan. Muat ulang halaman." }
  if (current.method !== "kurir_internal") {
    return { ok: false, message: "Kurir dan slot hanya untuk pesanan Kurir Internal." }
  }
  if (current.status === "selesai" || current.status === "dibatalkan") {
    return { ok: false, message: `${current.orderNo} sudah tidak bisa diatur ulang.` }
  }
  const [courier] = await db
    .select({ name: couriers.name })
    .from(couriers)
    .where(
      and(eq(couriers.id, courierId), eq(couriers.isActive, true), eq(couriers.type, "internal")),
    )
  if (!courier) return { ok: false, message: "Kurir ini sudah nonaktif. Pilih kurir lain." }

  await db.update(shipments).set({ courierId, slot }).where(eq(shipments.orderId, orderId))

  revalidatePath("/pengiriman")
  revalidatePath(`/pesanan/${current.orderNo}`)
  return {
    ok: true,
    message: `${current.orderNo} diantar ${courier.name}, jam ${SLOT_LABEL[slot]}.`,
  }
}
