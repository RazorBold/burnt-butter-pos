import { describe, expect, it } from "vitest"

import { matchParsedItems } from "@/features/orders/catalog"
import { parseWaOrder } from "@/lib/wa-parser"

import {
  checkTemplate,
  DEFAULT_TEMPLATES,
  renderStoredTemplate,
  TEMPLATE_KEYS,
  type TemplateMenu,
} from "./render"

let seq = 0
function sized(category: string, sort: number, names: string[], price = 65_000): TemplateMenu[] {
  return names.flatMap((menuName) =>
    (["large", "regular"] as const).map((size) => ({
      id: `v${++seq}`,
      menuName,
      categoryName: category,
      categorySort: sort,
      sized: true,
      size,
      price: size === "large" ? price : price - 20_000,
    })),
  )
}
function single(category: string, sort: number, menuName: string, price: number): TemplateMenu {
  return {
    id: `v${++seq}`,
    menuName,
    categoryName: category,
    categorySort: sort,
    sized: false,
    size: "single",
    price,
  }
}

// Seperti Master Data 19 Nov 2026.
const MENUS: TemplateMenu[] = [
  single("Additional Birthday Box", 0, "Additional Birthday Box", 14_000),
  ...sized("Pasta", 1, [
    "Spaghetti Classico Bologna Brulee",
    "Not Your Mac and Cheese",
    "Potato Gratin Lasagna",
    "Melt My Mac and Cheese",
    "Spaghetti Aglio E Olio",
  ]),
  ...sized("Hampers", 2, ["Classico Red", "Mac & Joy", "Melted Cheese", "Holy E Olio"]),
  single("Dessert", 3, "Choco Bon Bon", 40_000),
  single("Special Bundle", 4, "Bundle of 3", 150_000),
]
const SHIPPING = ["Pick Up", "Instant Reguler", "Sameday (Dikirim di hari yang sama)"]

describe("renderStoredTemplate", () => {
  it("FO1 bawaan: menu Pasta/Dessert/Bundle, pengiriman, dan harga Birthday Box terisi", () => {
    const { text, problems } = renderStoredTemplate("fo1", DEFAULT_TEMPLATES.fo1, MENUS, SHIPPING)
    expect(problems).toEqual([])
    expect(text).toContain("*Additional Birthday Box (Rp 14.000)*: Yes/No")
    expect(text).toContain(
      "Pilih Metode Pengiriman :\n- Pick Up\n- Instant Reguler\n- Sameday (Dikirim di hari yang sama)\n",
    )
    expect(text).toContain(
      [
        "*Size Large*",
        "A. Spaghetti Classico Bologna Brulee :",
        "B. Not Your Mac and Cheese :",
        "C. Potato Gratin Lasagna :",
        "D. Melt My Mac and Cheese :",
        "E. Spaghetti Aglio E Olio :",
      ].join("\n"),
    )
    expect(text).toContain("*Dessert*\nChoco Bon Bon :\n\n*Special Bundle*\nBundle of 3 :")
    expect(text).not.toContain("Classico Red")
    expect(text).not.toMatch(/\{/)
  })

  it("menu baru di Master Data langsung muncul; Olshop tanpa tanda tebal", () => {
    const menus = [...MENUS, ...sized("Pasta", 1, ["Lasagna Truffle"])]
    const { text } = renderStoredTemplate("olshop", DEFAULT_TEMPLATES.olshop, menus, SHIPPING)
    expect(text).toContain("Size Large\nA. Spaghetti")
    expect(text).toContain("F. Lasagna Truffle :")
    expect(text).not.toContain("*")
  })

  it("{MENU} tanpa kategori: semua kecuali add-on Birthday Box; dua kategori berukuran diberi nama", () => {
    const { text } = renderStoredTemplate("fo1", "Pilihan Menu:\n\n{MENU}", MENUS, SHIPPING)
    expect(text).not.toContain("Additional Birthday Box :")
    expect(text).toContain("*Size Large (Pasta)*")
    expect(text).toContain("*Size Regular (Hampers)*\nA. Classico Red :")
  })

  it("penanda yang tidak bisa diisi dilaporkan", () => {
    const { problems } = renderStoredTemplate(
      "fo1",
      "{MENU: Pasta, Kue Natal}\n{HARGA: Kartu}\n{ONGKIR}",
      MENUS,
      SHIPPING,
    )
    expect(problems).toEqual([
      'Kategori menu "Kue Natal" tidak ada atau belum punya menu aktif.',
      'Menu "Kartu" untuk {HARGA} tidak ada atau tidak aktif.',
      "Penanda {ONGKIR} tidak dikenal. Pakai {MENU}, {PENGIRIMAN}, atau {HARGA: …}.",
    ])
  })
})

describe("checkTemplate", () => {
  it.each(TEMPLATE_KEYS)("template bawaan %s lolos dan semua menunya terbaca", (key) => {
    expect(checkTemplate(key, DEFAULT_TEMPLATES[key], MENUS, SHIPPING).problems).toEqual([])
  })

  it("label wajib yang terhapus dan {MENU} yang hilang dilaporkan", () => {
    const body = DEFAULT_TEMPLATES.fo1.replace("No.Telp:\n", "").replace(/\{MENU[^}]*\}/, "")
    expect(checkTemplate("fo1", body, MENUS, SHIPPING).problems).toEqual([
      'Baris "No.Telp:" wajib ada supaya Isi Otomatis bisa membaca pesanan.',
      "Tambahkan {MENU} supaya daftar menu terisi otomatis dari Master Data.",
    ])
    expect(checkTemplate("olshop", "  ", MENUS, SHIPPING).problems).toEqual([
      "Template tidak boleh kosong.",
    ])
  })

  it("kategori baru dari Owner (satu harga) terbaca sebagai menu", () => {
    const menus = [...MENUS, single("Event Natal", 5, "Stollen Mini", 55_000)]
    const body = DEFAULT_TEMPLATES.olshop.replace(
      "{MENU: Pasta, Dessert, Special Bundle}",
      "{MENU: Event Natal, Pasta}",
    )
    const check = checkTemplate("olshop", body, menus, SHIPPING)
    expect(check.problems).toEqual([])
    const filled = check.text.replace("Stollen Mini :", "Stollen Mini : 2")
    const parsed = parseWaOrder(filled, "2026-11-19")
    const { quantities, unmatched } = matchParsedItems(
      parsed.items,
      menus.map((menu) => ({ ...menu, categoryId: menu.categoryName, photoPath: null })),
    )
    expect(unmatched).toEqual([])
    expect(Object.values(quantities)).toEqual([2])
  })

  it("pesanan customer dari template FO3 bawaan terbaca: normal + hampers, Birthday Box", () => {
    const { text } = renderStoredTemplate("fo3", DEFAULT_TEMPLATES.fo3, MENUS, SHIPPING)
    const filled = text
      .replace("Yes/No", "Yes")
      .replace("Nama Penerima:", "Nama Penerima: Rina")
      .replace("*Size Large*\nA. Spaghetti Classico Bologna Brulee :", (m) => `${m} 1`)
      .replace(/(\*Size Regular\*\nA\. Classico Red :)/, "$1 2")
    const parsed = parseWaOrder(filled, "2026-11-19")
    expect(parsed.birthdayBox).toBe(true)
    expect(parsed.type).toBe("normal_hampers")
    expect(parsed.items).toEqual([
      { name: "Spaghetti Classico Bologna Brulee", size: "large", qty: 1 },
      { name: "Classico Red", size: "regular", qty: 2 },
    ])
  })
})
