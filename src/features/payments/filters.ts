// Filter halaman Pembayaran dari URL (?q=&dari=&sampai=&bayar=&metode=&hal=).
// Cari, rentang tanggal, dan halaman sama dengan Daftar Pesanan.

import { parseOrderFilters } from "@/features/orders/filters"

export const PAYMENT_STATES = ["belum", "lunas"] as const
export type PaymentState = (typeof PAYMENT_STATES)[number]

export const PAYMENT_STATE_LABEL: Record<PaymentState, string> = {
  belum: "Belum bayar",
  lunas: "Lunas",
}

export type PaymentFilters = {
  q?: string
  from: string
  to: string
  state?: PaymentState
  methodId?: string
  page: number
}

type Params = Record<string, string | string[] | undefined>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parsePaymentFilters(params: Params, today: string): PaymentFilters {
  const { q, from, to, page } = parseOrderFilters(params, today)
  const one = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }
  const state = PAYMENT_STATES.find((value) => value === one("bayar"))
  const method = one("metode")
  return {
    q,
    from,
    to,
    state,
    // Filter metode hanya masuk akal untuk yang sudah lunas.
    methodId: method && UUID.test(method) && state !== "belum" ? method : undefined,
    page,
  }
}

/** Parameter URL untuk TablePagination (tanpa ?hal=). */
export function paymentFilterParams(
  filters: PaymentFilters,
  today: string,
): Record<string, string | undefined> {
  const isToday = filters.from === today && filters.to === today
  return {
    q: filters.q,
    dari: isToday ? undefined : filters.from,
    sampai: isToday ? undefined : filters.to,
    bayar: filters.state,
    metode: filters.methodId,
  }
}
