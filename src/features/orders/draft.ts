// Draf pesanan di form Input Pesanan: dibuat dari hasil parser WA, lalu diedit kasir.

import { normalizePhone } from "@/lib/phone"
import type { OrderKind, OrderType, ParsedOrder, ShippingMethod } from "@/lib/wa-parser"

import { isMarketplace, type OrderChannel } from "./constants"

export type OrderDraft = {
  channel: OrderChannel
  /** Hanya marketplace. */
  marketplaceOrderNo: string
  /** Total sesuai marketplace, seperti diketik ("210.000"). Kosong = total dari harga menu. */
  marketplaceTotal: string
  type: OrderType
  /** Jenis pesanan; bawaan PO. */
  kind: OrderKind
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
  channel: "whatsapp",
  marketplaceOrderNo: "",
  marketplaceTotal: "",
  type: "normal",
  kind: "po",
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
    ...EMPTY_DRAFT,
    marketplaceOrderNo: parsed.invoiceNo ?? "",
    type: parsed.type,
    kind: parsed.kind ?? "po",
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

/** "Rp 210.000" → 210000. Tanpa angka → null. */
export function parseRupiahInput(text: string): number | null {
  const digits = text.replace(/\D/g, "")
  return digits ? Number(digits) : null
}

/** Pesanan marketplace: no. HP dan alamat opsional karena bisa disamarkan marketplace. */
function marketplaceIssues(draft: OrderDraft, today: string) {
  const issues: Partial<Record<DraftField, string>> = {}
  if (!draft.marketplaceOrderNo.trim()) issues.marketplaceOrderNo = "Nomor invoice wajib diisi."
  if (draft.name.trim().length < 2) issues.name = "Nama penerima wajib diisi."
  if (draft.phone.trim() && !normalizePhone(draft.phone))
    issues.phone = "Nomor HP belum benar. Kosongkan bila disamarkan marketplace."
  if (!draft.deliveryDate) issues.deliveryDate = "Tanggal kirim wajib diisi."
  else if (draft.deliveryDate < today) issues.deliveryDate = "Tanggal kirim sudah lewat."
  if (draft.marketplaceTotal.trim() && !parseRupiahInput(draft.marketplaceTotal))
    issues.marketplaceTotal = "Total belum benar. Kosongkan untuk memakai harga menu."
  if (!Object.values(draft.quantities).some((qty) => qty > 0))
    issues.items = "Pilih minimal satu menu."
  return issues
}

/** Isian wajib yang belum benar, beserta pesannya. Urutan = urutan di form. */
export function draftIssues(draft: OrderDraft, today: string): Partial<Record<DraftField, string>> {
  if (isMarketplace(draft.channel)) return marketplaceIssues(draft, today)
  const issues: Partial<Record<DraftField, string>> = {}
  if (draft.name.trim().length < 2) issues.name = "Nama penerima wajib diisi."
  if (!draft.phone.trim()) issues.phone = "No. telp wajib diisi."
  else if (!normalizePhone(draft.phone))
    issues.phone = "Nomor HP belum benar. Contoh: 0812 3456 7890."
  if (draft.shippingMethod !== "pick_up" && !draft.address.trim())
    issues.address = "Alamat wajib untuk pesanan yang diantar."
  if (!draft.deliveryDate) issues.deliveryDate = "Tanggal kirim wajib diisi."
  else if (draft.deliveryDate < today) issues.deliveryDate = "Tanggal kirim sudah lewat."
  if (!draft.shippingMethod) issues.shippingMethod = "Pilih metode pengiriman."
  if (!Object.values(draft.quantities).some((qty) => qty > 0))
    issues.items = "Pilih minimal satu menu."
  return issues
}
