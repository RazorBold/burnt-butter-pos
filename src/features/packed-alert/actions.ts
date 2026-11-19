"use server"

import { PACKED_ALERT_ROLES } from "@/lib/access"
import { getCurrentUser } from "@/lib/auth"

import type { PackedOrder } from "./packed"
import { listRecentPacked } from "./queries"

/**
 * Pesanan yang baru selesai packing, untuk popup + bunyi di akun Admin (polling). `withTest`
 * hanya berlaku untuk akun QA (nama "QA …") dan dinyalakan khusus oleh test e2e.
 */
export async function fetchPackedOrders(
  withTest = false,
): Promise<{ ok: true; orders: PackedOrder[]; now: string } | { ok: false }> {
  const user = await getCurrentUser()
  if (!user || !PACKED_ALERT_ROLES.includes(user.role)) return { ok: false }
  const includeTest = withTest && user.name.startsWith("QA ")
  return {
    ok: true,
    orders: await listRecentPacked(user.id, includeTest),
    now: new Date().toISOString(),
  }
}
