// Membaca pesan pesanan WhatsApp yang mengikuti template toko (Personal atau Hadiah).
// Fungsi murni: tidak tahu soal database. Nama menu dicocokkan ke katalog di tempat lain.
//
// Template (lihat test): label "Nama Lengkap:" / "Nama Penerima:", "No.Telp:", "Alamat Lengkap:",
// "Tanggal kirim:", "Nama Pengirim:", kartu ucapan "To:/Wishes:/From:", "Pilih Metode
// Pengiriman", "Request (Jika ada):", lalu "Pilihan Menu" per bagian (Size Large, Size Regular,
// Dessert, Special Bundle) dengan baris "A. Nama Menu : jumlah".

import { normalizePhone } from "@/lib/phone"

export type OrderType = "personal" | "hadiah"
export type ShippingMethod = "kurir_internal" | "instant" | "pick_up"
export type ParsedSize = "large" | "regular" | "single"

export type ParsedItem = { name: string; size: ParsedSize; qty: number }

export type ParsedOrder = {
  type: OrderType
  name: string | null
  /** Sudah dinormalkan ke 08xxxxxxxxxx; null bila kosong atau bukan nomor HP. */
  phone: string | null
  phoneRaw: string | null
  address: string | null
  /** "YYYY-MM-DD"; null bila kosong atau tidak bisa dibaca. */
  deliveryDate: string | null
  deliveryDateRaw: string | null
  senderName: string | null
  cardTo: string | null
  cardWishes: string | null
  cardFrom: string | null
  shippingMethod: ShippingMethod | null
  request: string | null
  /** Hanya menu dengan jumlah > 0. */
  items: ParsedItem[]
}

type Field =
  | "name"
  | "phone"
  | "address"
  | "date"
  | "sender"
  | "cardTo"
  | "cardWishes"
  | "cardFrom"
  | "request"

// Urutan penting: "Nama Pengirim" dicek sebelum pola nama umum.
const FIELD_LABELS: [Field, RegExp][] = [
  ["sender", /^nama\s*pengirim\b/],
  ["name", /^nama(\s*(lengkap|penerima|pemesan))?\b/],
  ["phone", /^(no\.?|nomor|nmr)\s*(telp|telpon|telepon|tlp|hp|wa|whatsapp)\b/],
  ["address", /^alamat(\s*lengkap)?\b/],
  ["date", /^(tanggal|tgl\.?)\s*(kirim|pengiriman|antar)\b/],
  ["cardTo", /^to\b/],
  ["cardWishes", /^(wishes|ucapan|pesan)\b/],
  ["cardFrom", /^from\b/],
  ["request", /^request\b/],
]

/** Field yang nilainya boleh lebih dari satu baris. */
const MULTILINE: ReadonlySet<Field> = new Set(["address", "cardWishes", "request"])

const SHIPPING_LABEL = /^(pilih\s*)?metode\s*(pengiriman|kirim)\b/
const MENU_HEADER = /^pilihan\s*menu\b/
const CARD_HEADER = /^isi\s*kartu\s*ucapan\b/
const INTRO = /^untuk\s*pemesanan\b/
const SEPARATOR = /^[-–—_=]{3,}$/

const SECTIONS: [ParsedSize, RegExp][] = [
  ["large", /^(size\s*)?large\b/],
  ["regular", /^(size\s*)?regular\b/],
  ["single", /^(dessert|special\s*bundle|bundle)$/],
]

// Tanda pilihan yang biasa dipakai customer di daftar metode pengiriman.
// Teks tebal WA (*Instant*) juga dianggap tanda pilihan.
const CHOICE_MARK = /✅|✔|✓|☑|👈|👉|⬅|←|<-|\(v\)|\[x\]|\[v\]|\s[vV]$|\*[^*]+\*/

/** Rapikan satu baris: buang karakter tak terlihat, format tebal/miring WA, dan spasi ganda. */
function clean(line: string): string {
  return line
    .replace(/[​-‏⁠﻿]/g, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** Label isian harus diikuti titik dua, supaya kalimat biasa ("To be continued") tidak terbaca. */
function labelOf(lower: string): Field | null {
  if (!lower.includes(":")) return null
  const head = lower.slice(0, lower.indexOf(":"))
  for (const [field, label] of FIELD_LABELS) if (label.test(head)) return field
  return null
}

/** Nilai setelah label: "Nama Lengkap : Siti" → "Siti". Bagian "(Jika ada)" ikut dibuang. */
function valueAfterLabel(line: string): string {
  const colon = line.indexOf(":")
  if (colon === -1) return ""
  return line.slice(colon + 1).trim()
}

function isStructural(lower: string): boolean {
  return (
    SHIPPING_LABEL.test(lower) ||
    MENU_HEADER.test(lower) ||
    CARD_HEADER.test(lower) ||
    INTRO.test(lower) ||
    SEPARATOR.test(lower) ||
    SECTIONS.some(([, pattern]) => pattern.test(lower))
  )
}

export function shippingMethodFrom(text: string): ShippingMethod | null {
  const lower = text.toLowerCase()
  if (/pick\s*-?\s*up|pickup|ambil\s*sendiri|diambil/.test(lower)) return "pick_up"
  if (/instant|instan|gosend|go-send|grab|gojek|maxim|ojol/.test(lower)) return "instant"
  if (/kurir/.test(lower)) return "kurir_internal"
  return null
}

// prettier-ignore
const MONTHS: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, pebruari: 2, february: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, agt: 8, ags: 8, aug: 8, agustus: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oct: 10, oktober: 10, october: 10,
  nov: 11, nop: 11, november: 11, nopember: 11,
  des: 12, dec: 12, desember: 12, december: 12,
}

function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1) return null
  return date.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * "24/10/2026", "24-10", "24 Oktober 2026", "Sabtu, 24 Okt", "besok" → "2026-10-24".
 * Tanpa tahun: tahun ini, kecuali tanggalnya sudah lewat, maka tahun depan.
 * `today` adalah tanggal hari ini di WIB ("YYYY-MM-DD").
 */
export function parseDeliveryDate(raw: string, today: string): string | null {
  const text = raw.toLowerCase()
  if (/\bhari\s*ini\b/.test(text)) return today
  if (/\bbesok\b/.test(text)) return addDays(today, 1)
  if (/\blusa\b/.test(text)) return addDays(today, 2)

  const currentYear = Number(today.slice(0, 4))
  const withYear = (day: number, month: number, year?: number) => {
    if (year !== undefined) return isoDate(year < 100 ? 2000 + year : year, month, day)
    const sameYear = isoDate(currentYear, month, day)
    if (sameYear && sameYear < today) return isoDate(currentYear + 1, month, day)
    return sameYear
  }

  const numeric = text.match(/(\d{1,2})\s*[/.-]\s*(\d{1,2})(?:\s*[/.-]\s*(\d{2,4}))?/)
  if (numeric) {
    const [, day, month, year] = numeric
    return withYear(Number(day), Number(month), year ? Number(year) : undefined)
  }

  const named = text.match(/(\d{1,2})\s+([a-z]+)\.?(?:\s+(\d{4}))?/)
  if (named) {
    const month = MONTHS[named[2]]
    if (month) return withYear(Number(named[1]), month, named[3] ? Number(named[3]) : undefined)
  }
  return null
}

/** "2", "2 pcs", "x2", "2x", "dua"? (tidak), "-", "" → jumlah; selain angka dianggap 0. */
function quantityFrom(text: string): number {
  const match = text.match(/\d+/)
  return match ? Number(match[0]) : 0
}

/** "A. Spaghetti Classico : 2" → { name, qty }. Baris tanpa titik dua: "Choco Bon Bon 2". */
function menuLine(line: string): { name: string; qty: number } | null {
  const withColon = line.match(/^(?:[a-z][.)]\s*)?(.+?)\s*[:=]\s*(.*)$/i)
  if (withColon) return { name: withColon[1].trim(), qty: quantityFrom(withColon[2]) }
  const trailing = line.match(/^(?:[a-z][.)]\s*)?(.+?)\s+x?\s*(\d+)\s*(?:x|pcs|porsi|box)?$/i)
  if (trailing) return { name: trailing[1].trim(), qty: Number(trailing[2]) }
  return null
}

export function parseWaOrder(text: string, today: string): ParsedOrder {
  const lines = text.split(/\r?\n/)
  const values: Partial<Record<Field, string[]>> = {}
  const items: ParsedItem[] = []
  const shippingOptions: { text: string; marked: boolean }[] = []
  let shippingInline: string | null = null

  let current: Field | null = null
  let inShipping = false
  let menuSize: ParsedSize | null = null
  const lower = text.toLowerCase()

  for (const original of lines) {
    const line = clean(original)
    const key = line.toLowerCase()
    if (!line) {
      // Baris kosong mengakhiri isian satu baris, tapi alamat/ucapan/request boleh berjeda.
      if (current && !MULTILINE.has(current)) current = null
      continue
    }

    const section = SECTIONS.find(([, pattern]) => pattern.test(key))
    if (section) {
      menuSize = section[0]
      current = null
      inShipping = false
      continue
    }
    if (MENU_HEADER.test(key) || SEPARATOR.test(key)) {
      current = null
      inShipping = false
      continue
    }

    if (menuSize) {
      const item = menuLine(line)
      if (item && item.qty > 0) items.push({ ...item, size: menuSize })
      continue
    }

    if (SHIPPING_LABEL.test(key)) {
      inShipping = true
      current = null
      const inline = valueAfterLabel(line)
      if (inline) shippingInline = inline
      continue
    }
    if (INTRO.test(key) || CARD_HEADER.test(key)) {
      current = null
      inShipping = false
      continue
    }

    const field = labelOf(key)
    if (field) {
      inShipping = false
      current = field
      const value = valueAfterLabel(line)
      values[current] = value ? [value] : []
      continue
    }

    if (inShipping) {
      const option = line.replace(/^[-•·*>]\s*/, "")
      shippingOptions.push({ text: option, marked: CHOICE_MARK.test(original.trim()) })
      continue
    }

    // Lanjutan isian sebelumnya, mis. alamat yang ditulis beberapa baris.
    if (current && !isStructural(key)) {
      const list = (values[current] ??= [])
      if (MULTILINE.has(current) || list.length === 0) list.push(line)
    }
  }

  const value = (field: Field, joiner = " ") => {
    const joined = values[field]?.join(joiner).trim()
    return joined ? joined : null
  }

  // Metode pengiriman: isian setelah label, opsi yang ditandai, atau satu-satunya opsi tersisa.
  let shippingMethod: ShippingMethod | null = shippingInline
    ? shippingMethodFrom(shippingInline)
    : null
  if (!shippingMethod) {
    const marked = shippingOptions.filter((option) => option.marked)
    if (marked.length === 1) shippingMethod = shippingMethodFrom(marked[0].text)
    else if (shippingOptions.length === 1)
      shippingMethod = shippingMethodFrom(shippingOptions[0].text)
  }

  const phoneRaw = value("phone")
  const dateRaw = value("date")
  const isHadiah =
    /pemesanan\s*hadiah|nama\s*penerima|nama\s*pengirim|kartu\s*ucapan/.test(lower) ||
    Boolean(value("sender"))

  return {
    type: isHadiah ? "hadiah" : "personal",
    name: value("name"),
    phone: normalizePhone(phoneRaw),
    phoneRaw,
    address: value("address", "\n"),
    deliveryDate: dateRaw ? parseDeliveryDate(dateRaw, today) : null,
    deliveryDateRaw: dateRaw,
    senderName: value("sender"),
    cardTo: value("cardTo"),
    cardWishes: value("cardWishes", "\n"),
    cardFrom: value("cardFrom"),
    shippingMethod,
    request: value("request", "\n"),
    items,
  }
}
