import { describe, expect, it } from "vitest"

import { canSetTrackingLink, hasTrackingLink } from "@/features/shipments/logic"
import { parseWaOrder } from "@/lib/wa-parser"
import { FO1_TEMPLATE, withShippingChoices } from "@/lib/wa-parser/templates"

import {
  defaultOptionFor,
  liveTrackingOf,
  matchOptionByText,
  selectedOption,
  shippingName,
  type ShippingOptionChoice,
  templateShippingLines,
} from "./options"
import { shippingOptionFormSchema } from "./schemas"

const option = (
  id: string,
  flow: ShippingOptionChoice["flow"],
  liveTracking = false,
): ShippingOptionChoice => ({ id, name: id, flow, liveTracking, note: null })

const OPTIONS = [
  option("Pick Up", "pick_up"),
  option("GoSend", "instant", true),
  option("Lalamove", "instant", false),
  option("Kurir Internal", "kurir_internal", true),
]

describe("kategori pengiriman", () => {
  it("memilih kategori pertama untuk alur hasil baca WA", () => {
    expect(defaultOptionFor(OPTIONS, "instant")?.id).toBe("GoSend")
    expect(defaultOptionFor(OPTIONS, "")).toBeUndefined()
    expect(defaultOptionFor(OPTIONS, "ekspedisi")).toBeUndefined()
  })

  it("memakai kategori yang dipilih bila alurnya cocok", () => {
    expect(selectedOption(OPTIONS, "instant", "Lalamove")?.id).toBe("Lalamove")
    // Alur diganti lewat Isi Otomatis: id lama tidak cocok, pakai bawaan alur baru.
    expect(selectedOption(OPTIONS, "pick_up", "Lalamove")?.id).toBe("Pick Up")
  })

  it("nama tampil jatuh ke label alur untuk data lama", () => {
    expect(shippingName("instant", "GoSend")).toBe("GoSend")
    expect(shippingName("kurir_internal", null)).toBe("Kurir Internal")
  })

  it("live tracking mengikuti kategori; Pick Up tidak pernah", () => {
    expect(liveTrackingOf("instant", false)).toBe(false)
    expect(liveTrackingOf("ekspedisi", true)).toBe(true)
    expect(liveTrackingOf("pick_up", true)).toBe(false)
    // Tanpa kategori: bawaan lama (Instant & Kurir Internal).
    expect(liveTrackingOf("instant", null)).toBe(true)
    expect(liveTrackingOf("ekspedisi", undefined)).toBe(false)
    expect(hasTrackingLink("instant", false)).toBe(false)
    expect(canSetTrackingLink("ekspedisi", "dikirim", true)).toBe(true)
    expect(canSetTrackingLink("instant", "selesai", true)).toBe(false)
  })

  it("form menolak live tracking untuk Pick Up dan nama kosong", () => {
    const base = { name: "GoSend", flow: "instant", liveTracking: true, note: "", isActive: true }
    expect(shippingOptionFormSchema.safeParse(base).success).toBe(true)
    const pickUp = shippingOptionFormSchema.safeParse({ ...base, flow: "pick_up" })
    expect(pickUp.success).toBe(false)
    expect(shippingOptionFormSchema.safeParse({ ...base, name: " " }).success).toBe(false)
  })
})

describe("matchOptionByText", () => {
  const options = [
    option("Pick Up", "pick_up"),
    option("Instant", "instant", true),
    option("Sameday", "instant", true),
    option("Kurir Internal", "kurir_internal", true),
    option("Paxel", "kurir_internal"),
    option("Ekspedisi", "ekspedisi"),
  ]

  it("memilih kategori yang namanya tertulis di pesan WA", () => {
    expect(matchOptionByText(options, "Sameday (Dikirim di hari yang sama)")?.id).toBe("Sameday")
    expect(matchOptionByText(options, "Same Day ✅")?.id).toBe("Sameday")
    expect(matchOptionByText(options, "Instant")?.id).toBe("Instant")
  })

  it("kategori baru tanpa kata kunci tetap terbaca, alurnya dari Master Data", () => {
    const paxel = matchOptionByText(options, "Paxel ✅")
    expect(paxel?.id).toBe("Paxel")
    expect(paxel?.flow).toBe("kurir_internal")
  })

  it("nama di keterangan (dalam kurung) kalah dari nama di depan", () => {
    expect(matchOptionByText(options, "Paxel (lebih murah dari Instant)")?.id).toBe("Paxel")
  })

  it("tanpa nama yang cocok, atau Ekspedisi: kosong (pakai bawaan alur)", () => {
    expect(matchOptionByText(options, "GoSend")).toBeUndefined()
    expect(matchOptionByText(options, "Ekspedisi JNE")).toBeUndefined()
    expect(matchOptionByText(options, null)).toBeUndefined()
  })
})

describe("template WA dari kategori", () => {
  const options: ShippingOptionChoice[] = [
    {
      id: "a",
      name: "Pick Up",
      flow: "pick_up",
      liveTracking: false,
      note: "Ambil sendiri di toko.",
    },
    { id: "b", name: "Paxel", flow: "kurir_internal", liveTracking: false, note: null },
    { id: "c", name: "Ekspedisi", flow: "ekspedisi", liveTracking: false, note: "Marketplace" },
  ]

  it("baris pilihan mengikuti kategori aktif, tanpa Ekspedisi", () => {
    expect(templateShippingLines(options)).toEqual(["Pick Up (Ambil sendiri di toko)", "Paxel"])
  })

  it("blok Pilih Metode Pengiriman diganti, sisanya tetap", () => {
    const filled = withShippingChoices(FO1_TEMPLATE, templateShippingLines(options))
    expect(filled).toContain(
      "Pilih Metode Pengiriman : \n- Pick Up (Ambil sendiri di toko)\n- Paxel\n\nRequest",
    )
    expect(filled).not.toContain("- Instant")
    expect(filled.replace(/Pilih Metode[\s\S]*?\n\n/, "")).toBe(
      FO1_TEMPLATE.replace(/Pilih Metode[\s\S]*?\n\n/, ""),
    )
    expect(withShippingChoices(FO1_TEMPLATE, [])).toBe(FO1_TEMPLATE)
  })

  it("template hasil Master Data terbaca lagi oleh parser", () => {
    const filled = withShippingChoices(FO1_TEMPLATE, templateShippingLines(options)).replace(
      "- Paxel",
      "- Paxel ✅",
    )
    const parsed = parseWaOrder(filled, "2026-11-14")
    expect(parsed.shippingMethod).toBeNull()
    expect(matchOptionByText(options, parsed.shippingText)?.id).toBe("b")
  })
})
