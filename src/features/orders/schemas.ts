import { z } from "zod"

import { SHIPPING_METHODS } from "./constants"

const text = (max: number) => z.string().max(max)

/**
 * Bentuk data yang dikirim form Input Pesanan. Aturan kelengkapan (wajib isi, tanggal tidak
 * lewat, dll.) dicek terpisah lewat draftIssues(), sama dengan yang dipakai di form.
 */
export const orderSubmitSchema = z.object({
  draft: z.object({
    type: z.enum(["personal", "hadiah"]),
    name: text(80),
    phone: text(30),
    address: text(300),
    deliveryDate: z.union([z.literal(""), z.iso.date()]),
    senderName: text(80),
    cardTo: text(60),
    cardWishes: text(300),
    cardFrom: text(60),
    shippingMethod: z.union([z.literal(""), z.enum(SHIPPING_METHODS)]),
    request: text(300),
    quantities: z.record(z.uuid(), z.number().int().min(0).max(99)),
  }),
  waText: text(10_000),
})

export type OrderSubmit = z.infer<typeof orderSubmitSchema>
