// Draf pesanan di form Input Pesanan: dibuat dari hasil parser WA, lalu diedit kasir.

import { normalizePhone } from "@/lib/phone"
import type { OrderType, ParsedOrder, ShippingMethod } from "@/lib/wa-parser"

export type OrderDraft = {
  type: OrderType
  name: string
  phone: string
  address: string
  /** "YYYY-MM-DD" atau kosong. */
  deliveryDate: string
  senderName: string
  cardTo: string
  cardWishes: string
  cardFrom: string
  shippingMethod: ShippingMethod | ""
  request: string
  quantities: Record<string, number>
}

export type DraftField = Exclude<keyof OrderDraft, "quantities"> | "items"

export const EMPTY_DRAFT: OrderDraft = {
  type: "personal",
  name: "",
  phone: "",
  address: "",
  deliveryDate: "",
  senderName: "",
  cardTo: "",
  cardWishes: "",
  cardFrom: "",
  shippingMethod: "",
  request: "",
  quantities: {},
}

export function draftFromParsed(
  parsed: ParsedOrder,
  quantities: Record<string, number>,
): OrderDraft {
  return {
    type: parsed.type,
    name: parsed.name ?? "",
    // Nomor yang tidak valid tetap ditampilkan apa adanya supaya kasir bisa membetulkan.
    phone: parsed.phone ?? parsed.phoneRaw ?? "",
    address: parsed.address ?? "",
    deliveryDate: parsed.deliveryDate ?? "",
    senderName: parsed.senderName ?? "",
    cardTo: parsed.cardTo ?? "",
    cardWishes: parsed.cardWishes ?? "",
    cardFrom: parsed.cardFrom ?? "",
    shippingMethod: parsed.shippingMethod ?? "",
    request: parsed.request ?? "",
    quantities,
  }
}

/** Isian wajib yang belum benar, beserta pesannya. Urutan = urutan di form. */
export function draftIssues(draft: OrderDraft, today: string): Partial<Record<DraftField, string>> {
  const issues: Partial<Record<DraftField, string>> = {}
  const nameLabel = draft.type === "hadiah" ? "Nama penerima" : "Nama"
  if (draft.name.trim().length < 2) issues.name = `${nameLabel} wajib diisi.`
  if (!draft.phone.trim()) issues.phone = "No. telp wajib diisi."
  else if (!normalizePhone(draft.phone))
    issues.phone = "Nomor HP belum benar. Contoh: 0812 3456 7890."
  if (draft.shippingMethod !== "pick_up" && !draft.address.trim())
    issues.address = "Alamat wajib untuk pesanan yang diantar."
  if (!draft.deliveryDate) issues.deliveryDate = "Tanggal kirim wajib diisi."
  else if (draft.deliveryDate < today) issues.deliveryDate = "Tanggal kirim sudah lewat."
  if (draft.type === "hadiah" && !draft.senderName.trim())
    issues.senderName = "Nama pengirim wajib untuk pesanan hadiah."
  if (!draft.shippingMethod) issues.shippingMethod = "Pilih metode pengiriman."
  if (!Object.values(draft.quantities).some((qty) => qty > 0))
    issues.items = "Pilih minimal satu menu."
  return issues
}
