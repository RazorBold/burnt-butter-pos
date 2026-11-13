import { describe, expect, it } from "vitest"

import { canSetTrackingLink, hasTrackingLink } from "@/features/shipments/logic"

import {
  defaultOptionFor,
  liveTrackingOf,
  matchOptionByText,
  selectedOption,
  shippingName,
  type ShippingOptionChoice,
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
    option("Instant", "instant", true),
    option("Sameday", "instant", true),
    option("Kurir Internal", "kurir_internal", true),
  ]

  it("memilih kategori yang namanya tertulis di pesan WA", () => {
    expect(matchOptionByText(options, "Sameday (dikirim di hari yang sama)", "instant")?.id).toBe(
      "Sameday",
    )
    expect(matchOptionByText(options, "Same Day ✅", "instant")?.id).toBe("Sameday")
    expect(matchOptionByText(options, "Instant", "instant")?.id).toBe("Instant")
  })

  it("tanpa nama yang cocok atau alur berbeda: kosong (pakai bawaan alur)", () => {
    expect(matchOptionByText(options, "GoSend", "instant")).toBeUndefined()
    expect(matchOptionByText(options, "Sameday", "kurir_internal")).toBeUndefined()
    expect(matchOptionByText(options, null, "instant")).toBeUndefined()
  })
})
