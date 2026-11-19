// Template pesan WA / Olshop yang bisa diedit Owner (Master Data › Pengaturan, 19 Nov 2026).
// Daftar menu, pilihan pengiriman, dan harga diisi otomatis dari Master Data lewat penanda:
//   {MENU}                         semua kategori menu (kecuali add-on Birthday Box)
//   {MENU: Pasta, Dessert}         kategori tertentu, sesuai urutan yang ditulis
//   {PENGIRIMAN}                   pilihan metode pengiriman aktif
//   {HARGA: Nama Menu}             harga menu satu ukuran, mis. "Rp 14.000"
// Murni (tanpa DB) supaya bisa dipakai di klien (pratinjau) dan diuji.

import { isBirthdayBoxMenu, matchParsedItems } from "@/features/orders/catalog"
import { formatRupiah } from "@/lib/format"
import { parseWaOrder } from "@/lib/wa-parser"

export const TEMPLATE_KEYS = ["fo1", "fo2", "fo3", "olshop"] as const
export type TemplateKey = (typeof TEMPLATE_KEYS)[number]

export const TEMPLATE_LABEL: Record<TemplateKey, string> = {
  fo1: "FO1 (Normal)",
  fo2: "FO2 (Hampers)",
  fo3: "FO3 (Gabungan)",
  olshop: "Olshop",
}

/** Varian menu yang dibutuhkan untuk mengisi template (bentuknya cocok dengan CatalogVariant). */
export type TemplateMenu = {
  id: string
  menuName: string
  categoryName: string
  categorySort: number
  sized: boolean
  size: "large" | "regular" | "single"
  price: number
}

export const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  fo1: `#DetailFO1
Tanggal Pengiriman:
Jenis: PO/RS/MTO

Tipe Box: NORMAL
*Additional Birthday Box ({HARGA: Additional Birthday Box})*: Yes/No

Nama Penerima:
Nama Pengirim (Di-isi jika ada):
No.Telp:
Alamat Lengkap:

Kartu Ucapan (Di-Isi jika ada)
To:
Wishes:
From:

Pilih Metode Pengiriman :
{PENGIRIMAN}

Request (Di-isi jika ada):

——

Pilihan Menu *(mohon meng-isi jumlah)*:

{MENU: Pasta, Dessert, Special Bundle}`,
  fo2: `#DetailFO2
Tanggal Pengiriman:
Jenis: PO/RS/MTO
Tipe Box: HAMPERS

Untuk pemesanan boleh dilengkapi ya kak 🤗

Nama Penerima:
Nama Pengirim:
No.Telp:
Alamat Lengkap:

Kartu Ucapan (Template Christmas)
To:
From:

Pilih Metode Pengiriman :
{PENGIRIMAN}

Request (Jika ada):

——

Pilihan Menu (mohon meng-isi jumlah):

{MENU: Hampers}`,
  fo3: `#DetailFO3
Tanggal Pengiriman:
Jenis: PO/RS/MTO
Tipe Box: NORMAL & HAMPERS

*Untuk pemesanan boleh dilengkapi ya kak 🤗*

Nama Penerima:
Nama Pengirim:
No.Telp:
Alamat Lengkap:

Kartu Ucapan (Template Christmas)
To:
From:

Pilih Metode Pengiriman :
{PENGIRIMAN}

Request (Jika ada):

——

Pilihan Menu *(mohon meng-isi jumlah)*:

*#BOX NORMAL*

*Additional Birthday Box ({HARGA: Additional Birthday Box})*: Yes/No

{MENU: Pasta, Dessert, Special Bundle}

*#BOX CHRISTMAS*

{MENU: Hampers}`,
  olshop: `Marketplace: Tokopedia/Shopee
Tanggal pengiriman:
Nama Penerima:
Nomor Invoice:
Birthday Box: Yes/No

Pilihan Menu (mohon meng-isi jumlah):

{MENU: Pasta, Dessert, Special Bundle}

Jika ada notes/request tambahan:`,
}

/** Rapikan isi template: akhir baris Windows jadi "\n", spasi di akhir baris dibuang. */
export function normalizeTemplateBody(body: string): string {
  return body
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim()
}

/** Batas panjang template (karakter). */
export const TEMPLATE_MAX_LENGTH = 6000

const PLACEHOLDER = /\{\s*([A-Za-z]+)\s*(?::([^{}]*))?\}/g
const SIZE_TITLE = { large: "Large", regular: "Regular" } as const
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

type Category = { name: string; sort: number; sized: boolean; menus: TemplateMenu[] }

function categoriesOf(menus: readonly TemplateMenu[]): Category[] {
  const byName = new Map<string, Category>()
  for (const menu of menus) {
    const category = byName.get(menu.categoryName) ?? {
      name: menu.categoryName,
      sort: menu.categorySort,
      sized: menu.sized,
      menus: [],
    }
    category.menus.push(menu)
    byName.set(menu.categoryName, category)
  }
  return [...byName.values()].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
}

/** Nama menu unik dalam urutan katalog. */
function menuNames(variants: TemplateMenu[]): string[] {
  return [...new Set(variants.map((variant) => variant.menuName))]
}

function menuBlock(categories: Category[], bold: boolean, menuLines: Set<string>): string {
  const header = (text: string) => (bold ? `*${text}*` : text)
  const line = (text: string) => {
    menuLines.add(text)
    return text
  }
  const sizedCount = categories.filter((category) => category.sized).length
  const blocks: string[] = []
  for (const category of categories) {
    if (category.sized) {
      for (const size of ["large", "regular"] as const) {
        const names = menuNames(category.menus.filter((menu) => menu.size === size))
        if (names.length === 0) continue
        // Satu kategori berukuran: "Size Large" seperti template lama. Lebih dari satu: nama
        // kategori ditambahkan supaya tidak kembar ("Size Large (Hampers)").
        const title = `Size ${SIZE_TITLE[size]}${sizedCount > 1 ? ` (${category.name})` : ""}`
        blocks.push(
          [
            header(title),
            ...names.map((name, index) => line(`${LETTERS[index] ?? "-"}. ${name} :`)),
          ].join("\n"),
        )
      }
    } else {
      const names = menuNames(category.menus)
      if (names.length === 0) continue
      blocks.push([header(category.name), ...names.map((name) => line(`${name} :`))].join("\n"))
    }
  }
  return blocks.join("\n\n")
}

export type RenderResult = {
  text: string
  problems: string[]
  /** Baris menu yang dihasilkan ("A. Nama :"), untuk simulasi pengisian di `checkTemplate`. */
  menuLines: Set<string>
}

/**
 * Isi penanda template dari Master Data. `problems`: penanda yang tidak bisa diisi (kategori atau
 * menu tidak ada), ditampilkan ke Owner saat mengedit; penanda itu dibiarkan apa adanya.
 */
export function renderTemplate(
  body: string,
  menus: readonly TemplateMenu[],
  shippingLines: readonly string[],
  options: { bold: boolean },
): RenderResult {
  const problems: string[] = []
  const menuLines = new Set<string>()
  const categories = categoriesOf(menus)
  const text = body.replace(PLACEHOLDER, (whole, rawName: string, rawArg?: string) => {
    const name = rawName.toUpperCase()
    const args = (rawArg ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)

    if (name === "MENU") {
      if (args.length === 0) {
        const all = categories.filter(
          (category) => !category.menus.every((menu) => isBirthdayBoxMenu(menu.menuName)),
        )
        return menuBlock(all, options.bold, menuLines)
      }
      const picked: Category[] = []
      for (const arg of args) {
        const category = categories.find((item) => sameName(item.name, arg))
        if (category) picked.push(category)
        else problems.push(`Kategori menu "${arg}" tidak ada atau belum punya menu aktif.`)
      }
      return menuBlock(picked, options.bold, menuLines)
    }
    if (name === "PENGIRIMAN") {
      if (shippingLines.length === 0) {
        problems.push("Belum ada pilihan pengiriman aktif di Master Data.")
        return whole
      }
      return shippingLines.map((line) => `- ${line}`).join("\n")
    }
    if (name === "HARGA") {
      const menu = menus.find((item) => sameName(item.menuName, args[0] ?? ""))
      if (!menu) {
        problems.push(`Menu "${args[0] ?? ""}" untuk {HARGA} tidak ada atau tidak aktif.`)
        return whole
      }
      return formatRupiah(menu.price)
    }
    problems.push(`Penanda ${whole} tidak dikenal. Pakai {MENU}, {PENGIRIMAN}, atau {HARGA: …}.`)
    return whole
  })
  return { text, problems: [...new Set(problems)], menuLines }
}

/** FO dikirim lewat WhatsApp (judul tebal); Olshop ditempel ke chat marketplace (tanpa tanda *). */
export function renderStoredTemplate(
  key: TemplateKey,
  body: string,
  menus: readonly TemplateMenu[],
  shippingLines: readonly string[],
): RenderResult {
  return renderTemplate(body, menus, shippingLines, { bold: key !== "olshop" })
}

const REQUIRED: Record<"fo" | "olshop", [RegExp, string][]> = {
  fo: [
    [/tanggal\s*(pengiriman|kirim)\s*:/i, "Tanggal Pengiriman:"],
    [/nama\s*penerima\s*:/i, "Nama Penerima:"],
    [/no\.?\s*telp\s*:|no\.?\s*hp\s*:/i, "No.Telp:"],
    [/alamat[^:\n]*:/i, "Alamat Lengkap:"],
    [/metode\s*pengiriman/i, "Pilih Metode Pengiriman :"],
  ],
  olshop: [
    [/marketplace\s*:/i, "Marketplace:"],
    [/tanggal\s*(pengiriman|kirim)\s*:/i, "Tanggal pengiriman:"],
    [/nama\s*penerima\s*:/i, "Nama Penerima:"],
    [/(nomor|no\.?)\s*invoice\s*:/i, "Nomor Invoice:"],
  ],
}

/**
 * Cek sebelum disimpan: penanda bisa diisi, label wajib ada, dan setiap menu di template benar
 * terbaca Isi Otomatis (disimulasikan: semua menu diisi 1 lalu dibaca parser).
 */
export function checkTemplate(
  key: TemplateKey,
  body: string,
  menus: readonly TemplateMenu[],
  shippingLines: readonly string[],
): RenderResult {
  const rendered = renderStoredTemplate(key, body, menus, shippingLines)
  const problems = [...rendered.problems]
  if (!body.trim()) {
    return { text: "", problems: ["Template tidak boleh kosong."], menuLines: new Set() }
  }
  if (body.length > TEMPLATE_MAX_LENGTH) {
    problems.push(`Template terlalu panjang (maks. ${TEMPLATE_MAX_LENGTH} karakter).`)
  }
  for (const [pattern, label] of REQUIRED[key === "olshop" ? "olshop" : "fo"]) {
    if (!pattern.test(rendered.text)) {
      problems.push(`Baris "${label}" wajib ada supaya Isi Otomatis bisa membaca pesanan.`)
    }
  }
  if (!/\{\s*menu\b/i.test(body)) {
    problems.push("Tambahkan {MENU} supaya daftar menu terisi otomatis dari Master Data.")
  } else {
    // Setiap baris menu "A. Nama :" / "Nama :" diisi 1, lalu dibaca seperti pesan customer.
    const filled = rendered.text
      .split("\n")
      .map((line) => (rendered.menuLines.has(line) ? `${line} 1` : line))
      .join("\n")
    const parsed = parseWaOrder(filled, "2026-01-01")
    const { unmatched } = matchParsedItems(parsed.items, menus.map(asCatalog))
    for (const item of unmatched) {
      problems.push(`Menu "${item.name}" tidak terbaca Isi Otomatis di posisi ini.`)
    }
  }
  return { ...rendered, problems: [...new Set(problems)] }
}

function asCatalog(menu: TemplateMenu) {
  return { ...menu, categoryId: menu.categoryName, photoPath: null }
}
