import { z } from "zod"

export const PAYMENT_METHOD_TYPES = ["bank", "ewallet", "cash"] as const
export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number]

export const PAYMENT_METHOD_TYPE_LABEL: Record<PaymentMethodType, string> = {
  bank: "Bank",
  ewallet: "E-Wallet",
  cash: "Cash",
}

export const paymentMethodFormSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Nama metode minimal 2 huruf.").max(40, "Nama terlalu panjang."),
  type: z.enum(PAYMENT_METHOD_TYPES, { error: "Pilih tipe metode." }),
  isActive: z.boolean(),
})

export function paymentMethodFormFromData(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key)
    return typeof value === "string" ? value : undefined
  }
  return {
    id: text("id") || undefined,
    name: text("name") ?? "",
    type: text("type"),
    isActive: text("isActive") !== "false",
  }
}
