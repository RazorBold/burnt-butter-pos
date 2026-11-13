// Kategori pengiriman (Master Data › Kurir & Pengiriman). Murni supaya bisa dipakai di klien,
// server, dan diuji.

import { SHIPPING_METHOD_LABEL, SHIPPING_METHOD_NOTE } from "@/features/orders/constants"
import type { ShippingMethod } from "@/lib/wa-parser"

/** Pilihan kategori di form pesanan dan Pengiriman. */
export type ShippingOptionChoice = {
  id: string
  name: string
  /** Alur dasar: menentukan alur status (Pick Up langsung Selesai, dst.). */
  flow: ShippingMethod
  liveTracking: boolean
  note: string | null
}

/** Bawaan bila kategori belum ada (data lama): link lacak untuk Instant dan Kurir Internal. */
export function defaultLiveTracking(flow: ShippingMethod): boolean {
  return flow === "instant" || flow === "kurir_internal"
}

/** Kategori pertama (sesuai urutan) untuk alur dasar ini, mis. hasil baca pesan WA. */
export function defaultOptionFor(
  options: readonly ShippingOptionChoice[],
  flow: ShippingMethod | "",
): ShippingOptionChoice | undefined {
  return flow ? options.find((option) => option.flow === flow) : undefined
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "")

/** Kategori yang bisa dipilih customer lewat WA (Ekspedisi khusus marketplace). */
export function waShippingOptions(
  options: readonly ShippingOptionChoice[],
): ShippingOptionChoice[] {
  return options.filter((option) => option.flow !== "ekspedisi" && option.id)
}

function longestNameIn(options: readonly ShippingOptionChoice[], text: string) {
  const wanted = normalize(text)
  return options
    .filter((option) => {
      const name = normalize(option.name)
      return name.length >= 3 && wanted.includes(name)
    })
    .sort((a, b) => normalize(b.name).length - normalize(a.name).length)[0]
}

/**
 * Kategori yang namanya tertulis di pesan WA (mis. "Sameday" → kategori "Sameday", "Paxel" →
 * kategori "Paxel"). Nama kategori menentukan alurnya, jadi kategori baru dari Master Data
 * langsung terbaca tanpa mengubah kode. Isi kurung (keterangan) dicek terakhir, dan nama
 * terpanjang menang supaya "Kurir Internal Sameday" tidak jatuh ke "Kurir Internal".
 */
export function matchOptionByText(
  options: readonly ShippingOptionChoice[],
  text: string | null | undefined,
): ShippingOptionChoice | undefined {
  if (!text) return undefined
  const choices = waShippingOptions(options)
  const withoutNote = text.replace(/\([^)]*\)?/g, " ")
  return longestNameIn(choices, withoutNote) ?? longestNameIn(choices, text)
}

/**
 * Baris pilihan pengiriman untuk template WA, dari kategori aktif sesuai urutan Master Data:
 * "Sameday (Dikirim di hari yang sama)".
 */
export function templateShippingLines(options: readonly ShippingOptionChoice[]): string[] {
  return waShippingOptions(options).map((option) => {
    const note = option.note?.trim().replace(/[.\s]+$/, "")
    return note ? `${option.name} (${note})` : option.name
  })
}

/** Kategori yang sedang terpilih: id yang disimpan, atau bawaan alurnya. */
export function selectedOption(
  options: readonly ShippingOptionChoice[],
  flow: ShippingMethod | "",
  optionId: string | null | undefined,
): ShippingOptionChoice | undefined {
  const exact = optionId ? options.find((option) => option.id === optionId) : undefined
  return exact && exact.flow === flow ? exact : defaultOptionFor(options, flow)
}

/** Nama yang ditampilkan: nama kategori, atau label alur bila kategorinya sudah dihapus. */
export function shippingName(flow: ShippingMethod, optionName?: string | null): string {
  return optionName || SHIPPING_METHOD_LABEL[flow]
}

export function shippingNote(option: Pick<ShippingOptionChoice, "flow" | "note">): string {
  return option.note || SHIPPING_METHOD_NOTE[option.flow]
}

/** Link lacak berlaku bila kategori mengizinkan; tanpa kategori pakai bawaan alurnya. */
export function liveTrackingOf(flow: ShippingMethod, liveTracking?: boolean | null): boolean {
  if (flow === "pick_up") return false
  return liveTracking ?? defaultLiveTracking(flow)
}
