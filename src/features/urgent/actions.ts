"use server"

import { getCurrentUser } from "@/lib/auth"

import { listActiveUrgent, type UrgentOrder } from "./queries"

/** Pesanan urgent yang masih berjalan, untuk popup di semua akun (polling). */
export async function fetchUrgentOrders(): Promise<
  { ok: true; orders: UrgentOrder[] } | { ok: false }
> {
  const user = await getCurrentUser()
  if (!user) return { ok: false }
  // Akun QA (nama "QA …") juga menerima pesanan uji e2e; akun asli tidak.
  return { ok: true, orders: await listActiveUrgent(user.name.startsWith("QA ")) }
}
