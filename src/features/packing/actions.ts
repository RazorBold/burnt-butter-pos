"use server"

import { z } from "zod"

import { changeStatuses } from "@/features/orders/status-change"
import { CAN_PACK } from "@/lib/access"
import { AuthorizationError, requireRole } from "@/lib/auth"

export type PackingResult = { ok: true; message: string } | { ok: false; message: string }

async function requirePacker(): Promise<string | PackingResult> {
  try {
    return (await requireRole(CAN_PACK)).id
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
}

const packSchema = z.object({
  orderId: z.uuid(),
  type: z.enum(["normal", "hampers"]),
  items: z
    .array(z.object({ packagingId: z.uuid(), qty: z.number().int().min(0).max(999) }))
    .max(50),
})

/**
 * Selesai packing (Admin, Produksi, Owner): Siap Packing → Siap Kirim, mencatat jenis packing
 * Normal/Hampers. Stok tidak dipotong di sini: loyang dan box hampers sudah terpotong otomatis
 * saat pesanan Lunas (keputusan pemilik toko, Nov 2026). Isian `items` diabaikan.
 */
export async function packOrder(input: unknown): Promise<PackingResult> {
  const userId = await requirePacker()
  if (typeof userId !== "string") return userId
  const parsed = packSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: "Data packing tidak terbaca. Muat ulang." }
  const { orderId, type } = parsed.data

  const { done, skipped } = await changeStatuses(
    [orderId],
    "siap_kirim",
    userId,
    { packing: true },
    { [orderId]: { type, uses: [] } },
  )
  if (done.length > 0) {
    return {
      ok: true,
      message:
        type === "hampers"
          ? `${done[0]} selesai packing hampers, siap dikirim.`
          : `${done[0]} selesai packing normal, siap dikirim.`,
    }
  }
  const skip = skipped[0]
  if (!skip) return { ok: false, message: "Pesanan tidak ditemukan. Muat ulang halaman." }
  if (skip.reason.startsWith("stok ") || skip.reason === "packaging tidak dikenal") {
    return { ok: false, message: `Belum bisa: ${skip.reason}. Tambah atau revisi stoknya dulu.` }
  }
  return { ok: false, message: `${skip.orderNo} tidak sedang menunggu packing. Muat ulang.` }
}

/**
 * Batal packing: Siap Kirim → Siap Packing. Stok yang terpotong saat Lunas tidak dikembalikan
 * (pesanan masih lunas); hanya potongan lama dari dialog packing (sebelum Nov 2026) yang kembali.
 */
export async function unpackOrder(orderId: unknown): Promise<PackingResult> {
  const userId = await requirePacker()
  if (typeof userId !== "string") return userId
  const id = z.uuid().safeParse(orderId)
  if (!id.success) return { ok: false, message: "Pesanan tidak terbaca. Muat ulang." }

  const { done } = await changeStatuses([id.data], "siap_packing", userId, {
    limitTo: ["siap_packing", "siap_kirim"],
  })
  if (done.length > 0) {
    return { ok: true, message: `Packing ${done[0]} dibatalkan, pesanan menunggu packing lagi.` }
  }
  return { ok: false, message: "Pesanan ini sudah dikirim atau berubah. Muat ulang halaman." }
}
