"use server"

import { getCurrentUser } from "@/lib/auth"

import { listRecentPaid, type PaidOrder } from "./queries"

/**
 * Pesanan yang baru Lunas, untuk popup + alarm di semua akun (polling). `withTest` hanya
 * berlaku untuk akun QA (nama "QA …") dan dinyalakan khusus oleh test e2e, supaya pesanan uji
 * yang ditandai lunas di test lain tidak memunculkan popup yang menghalangi klik.
 */
export async function fetchPaidOrders(
  withTest = false,
): Promise<{ ok: true; orders: PaidOrder[]; now: string } | { ok: false }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false }
  const includeTest = withTest && user.name.startsWith("QA ")
  return {
    ok: true,
    orders: await listRecentPaid(user.id, includeTest),
    now: new Date().toISOString(),
  }
}
