import "server-only"

import { asc } from "drizzle-orm"

import { getDb } from "@/db"
import { paymentMethods } from "@/db/schema"

export type PaymentMethodRow = typeof paymentMethods.$inferSelect

/**
 * Dikelompokkan per tipe (Bank → E-Wallet → Cash, urutan enum), lalu urutan dibuat dan nama.
 * Data awal dibuat dalam satu transaksi (created_at sama), jadi tanpa tipe urutannya acak-abjad.
 */
export async function listPaymentMethods(): Promise<PaymentMethodRow[]> {
  return getDb()
    .select()
    .from(paymentMethods)
    .orderBy(asc(paymentMethods.type), asc(paymentMethods.createdAt), asc(paymentMethods.name))
}
