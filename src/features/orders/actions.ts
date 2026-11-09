"use server"

import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm"
import { z } from "zod"
import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import {
  customers,
  menus,
  menuVariants,
  orderCounters,
  orderEditLogs,
  orderItems,
  orders,
  orderStatusLogs,
  paymentMethods,
  payments,
  shipments,
} from "@/db/schema"
import { CAN_INPUT_ORDER, CAN_PRODUCE } from "@/lib/access"
import { AuthorizationError, requireRole } from "@/lib/auth"
import { BULK_LIMIT, type BulkResult, summarizeBulk } from "@/lib/bulk"
import { formatRupiah, toJakartaDateString } from "@/lib/format"
import { normalizePhone } from "@/lib/phone"

import { isMarketplace, ORDER_CHANNEL_LABEL, type OrderChannel } from "./constants"
import { type DraftField, draftIssues, parseRupiahInput } from "./draft"
import {
  type DetailSnapshot,
  describeDetailChanges,
  describeItemChanges,
  describeNoteChange,
  type ItemSnapshot,
} from "./edit-log"
import { ORDER_STATUS_LABEL, ORDER_STATUSES, type OrderStatus } from "./filters"
import { ordersToCsv } from "./csv"
import { formatOrderNo } from "./order-number"
import { getOrdersForExport } from "./queries"
import { orderEditSchema, orderSubmitSchema } from "./schemas"
import { isEditable, isMenuEditable, shipmentStatusFor } from "./status"
import { changeStatuses, revalidateOrders } from "./status-change"

export type CreateOrderResult =
  | { ok: true; orderNo: string; customerName: string; total: number }
  | { ok: false; message: string; errors?: Partial<Record<DraftField, string>> }

class StaleMenuError extends Error {}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0]

/** Customer dari no. HP, atau (no. HP disamarkan marketplace) dari nama yang sama tanpa no. HP. */
async function resolveCustomer(
  tx: Tx,
  { name, phone, address }: { name: string; phone: string | null; address: string | null },
) {
  if (phone) {
    const [customer] = await tx
      .insert(customers)
      .values({ name, phone, address })
      .onConflictDoUpdate({
        target: customers.phone,
        // Nama terbaru dipakai; alamat lama dipertahankan bila kali ini kosong (mis. Pick Up).
        set: {
          name: sql`excluded.name`,
          address: sql`coalesce(excluded.address, ${customers.address})`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: customers.id, name: customers.name })
    return customer
  }
  const [existing] = await tx
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(and(isNull(customers.phone), sql`lower(${customers.name}) = lower(${name})`))
    .limit(1)
  if (existing) return existing
  const [created] = await tx
    .insert(customers)
    .values({ name, phone: null, address })
    .returning({ id: customers.id, name: customers.name })
  return created
}

/** No. pesanan marketplace ini sudah dipakai pesanan lain? Kembalikan nomor pesanan itu. */
async function duplicateMarketplaceOrder(
  channel: OrderChannel,
  marketplaceOrderNo: string,
  exceptId?: string,
) {
  const [duplicate] = await getDb()
    .select({ orderNo: orders.orderNo })
    .from(orders)
    .where(
      and(
        eq(orders.channel, channel),
        eq(orders.marketplaceOrderNo, marketplaceOrderNo),
        exceptId ? ne(orders.id, exceptId) : undefined,
      ),
    )
    .limit(1)
  return duplicate?.orderNo
}

/**
 * Simpan pesanan dari form Input Pesanan, dalam satu transaksi:
 * customer (dicari/diperbarui lewat no. HP) → nomor pesanan harian → pesanan berstatus Baru →
 * item dengan harga dari database → pengiriman → log status.
 * Pesanan Hadiah: customer = penerima; nama pengirim dan kartu ucapan disimpan di pesanan.
 * Pembayaran WhatsApp dicatat terpisah, jadi pesanan baru belum bayar. Pesanan marketplace
 * memakai metode Ekspedisi, total sesuai marketplace, dan langsung Lunas (sudah dibayar di sana).
 */
export async function createOrder(input: unknown): Promise<CreateOrderResult> {
  let userId: string
  try {
    userId = (await requireRole(CAN_INPUT_ORDER)).id
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }

  const parsed = orderSubmitSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: "Data pesanan tidak terbaca. Muat ulang halaman lalu coba lagi." }
  }
  const { draft, waText } = parsed.data
  const today = toJakartaDateString(new Date())
  const issues = draftIssues(draft, today)
  if (Object.keys(issues).length > 0) {
    return { ok: false, message: "Masih ada isian yang belum lengkap.", errors: issues }
  }

  const marketplace = isMarketplace(draft.channel)
  const marketplaceOrderNo = marketplace ? draft.marketplaceOrderNo.trim() : null
  if (marketplaceOrderNo) {
    const used = await duplicateMarketplaceOrder(draft.channel, marketplaceOrderNo)
    if (used) {
      const message = `No. pesanan ini sudah diinput sebagai ${used}.`
      return { ok: false, message, errors: { marketplaceOrderNo: message } }
    }
  }

  const phone = normalizePhone(draft.phone)
  const wanted = Object.entries(draft.quantities).filter(([, qty]) => qty > 0)
  const optional = (value: string) => value.trim() || null
  const isHadiah = !marketplace && draft.type === "hadiah"
  const shippingMethod = marketplace
    ? ("ekspedisi" as const)
    : (draft.shippingMethod as Exclude<typeof draft.shippingMethod, "">)

  try {
    const result = await getDb().transaction(async (tx) => {
      // Harga selalu dari database, bukan dari browser. Menu yang baru dinonaktifkan ditolak.
      const variants = await tx
        .select({ id: menuVariants.id, price: menuVariants.price })
        .from(menuVariants)
        .innerJoin(menus, eq(menus.id, menuVariants.menuId))
        .where(
          and(
            inArray(
              menuVariants.id,
              wanted.map(([id]) => id),
            ),
            eq(menuVariants.isActive, true),
            eq(menus.isActive, true),
          ),
        )
      if (variants.length !== wanted.length) throw new StaleMenuError()
      const priceOf = new Map(variants.map((variant) => [variant.id, variant.price]))
      const items = wanted.map(([variantId, qty]) => {
        const unitPrice = priceOf.get(variantId)!
        return { menuVariantId: variantId, qty, unitPrice, subtotal: unitPrice * qty }
      })
      // Olshop: total dari marketplace bila diisi (voucher/diskon), selain itu dari harga menu.
      const menuTotal = items.reduce((sum, item) => sum + item.subtotal, 0)
      const total = marketplace
        ? (parseRupiahInput(draft.marketplaceTotal) ?? menuTotal)
        : menuTotal

      const address = optional(draft.address)
      const customer = await resolveCustomer(tx, { name: draft.name.trim(), phone, address })

      const [counter] = await tx
        .insert(orderCounters)
        .values({ date: today, lastSeq: 1 })
        .onConflictDoUpdate({
          target: orderCounters.date,
          set: { lastSeq: sql`${orderCounters.lastSeq} + 1` },
        })
        .returning({ seq: orderCounters.lastSeq })
      const orderNo = formatOrderNo(today, counter.seq)

      const [order] = await tx
        .insert(orders)
        .values({
          orderNo,
          customerId: customer.id,
          customerName: draft.name.trim(),
          channel: draft.channel,
          marketplaceOrderNo,
          type: marketplace ? "personal" : draft.type,
          kind: draft.kind,
          deliveryDate: draft.deliveryDate,
          request: optional(draft.request),
          total,
          rawWaText: optional(waText),
          senderName: isHadiah ? optional(draft.senderName) : null,
          cardTo: isHadiah ? optional(draft.cardTo) : null,
          cardWishes: isHadiah ? optional(draft.cardWishes) : null,
          cardFrom: isHadiah ? optional(draft.cardFrom) : null,
          createdBy: userId,
        })
        .returning({ id: orders.id })

      await tx.insert(orderItems).values(items.map((item) => ({ ...item, orderId: order.id })))
      await tx.insert(shipments).values({
        orderId: order.id,
        method: shippingMethod,
        // Kosong sampai pesanan Siap Kirim (lihat shipmentStatusFor).
        status: null,
        address,
      })
      await tx
        .insert(orderStatusLogs)
        .values({ orderId: order.id, fromStatus: null, toStatus: "baru", changedBy: userId })

      if (marketplace) {
        // Metode "Shopee"/"Tokopedia" dibuat saat pertama dipakai.
        const [method] = await tx
          .insert(paymentMethods)
          .values({ name: ORDER_CHANNEL_LABEL[draft.channel], type: "marketplace" })
          .onConflictDoUpdate({
            target: paymentMethods.name,
            set: { name: sql`excluded.name` },
          })
          .returning({ id: paymentMethods.id })
        await tx.insert(payments).values({
          orderId: order.id,
          paymentMethodId: method.id,
          amount: total,
          status: "lunas",
          paidAt: new Date(),
          recordedBy: userId,
        })
      }

      return { orderNo, customerName: customer.name, total }
    })

    revalidatePath("/pesanan")
    revalidatePath("/dashboard")
    revalidatePath("/pembayaran")
    revalidatePath("/master-data/customer")
    return { ok: true, ...result }
  } catch (error) {
    if (error instanceof StaleMenuError) {
      return {
        ok: false,
        message: "Ada menu yang baru dinonaktifkan atau dihapus. Muat ulang halaman lalu cek lagi.",
      }
    }
    throw error
  }
}

type ActionResult = { ok: boolean; message: string }

async function requireOrderEditor(): Promise<string> {
  return (await requireRole(CAN_INPUT_ORDER)).id
}

/** Langkah dapur yang boleh dilakukan tim Produksi: Baru ↔ Diproses ↔ Siap Kirim. */
const PRODUCTION_STATUSES: readonly OrderStatus[] = ["baru", "diproses", "siap_packing"]

function parseStatus(target: string): OrderStatus | undefined {
  return ORDER_STATUSES.find((value) => value === target)
}

/**
 * Ubah status satu pesanan sesuai alur (nextStatuses), lewat changeStatuses.
 * `limitTo`: bila diisi, status asal dan tujuan harus ada di daftar ini (dipakai Produksi).
 */
async function changeOrderStatus(
  orderId: string,
  target: string,
  userId: string,
  limitTo?: readonly OrderStatus[],
): Promise<ActionResult> {
  const status = parseStatus(target)
  if (!z.uuid().safeParse(orderId).success || !status) {
    return { ok: false, message: "Status tidak dikenal. Muat ulang halaman." }
  }

  const { done, skipped } = await changeStatuses([orderId], status, userId, { limitTo })
  if (done.length > 0) {
    return { ok: true, message: `Status ${done[0]} jadi ${ORDER_STATUS_LABEL[status]}.` }
  }
  if (skipped[0]?.reason === "belum lunas") {
    return {
      ok: false,
      message: `${skipped[0].orderNo} belum lunas. Catat pembayarannya dulu, baru bisa mulai dimasak.`,
    }
  }
  if (skipped[0]?.reason === "belum di-packing") {
    return { ok: false, message: "Tandai selesai packing lewat menu Packaging." }
  }
  if (skipped[0]?.reason.startsWith("stok ")) {
    return { ok: false, message: `Tidak bisa: ${skipped[0].reason}.` }
  }
  if (skipped.length > 0) {
    return {
      ok: false,
      message: `Pesanan ${ORDER_STATUS_LABEL[skipped[0].from]} tidak bisa diubah ke ${ORDER_STATUS_LABEL[status]}. Muat ulang halaman.`,
    }
  }
  return { ok: false, message: "Pesanan tidak ditemukan. Muat ulang halaman." }
}

/** Ubah Status dari Daftar/Detail Pesanan (Admin, Kasir). */
export async function updateOrderStatus(orderId: string, target: string): Promise<ActionResult> {
  try {
    return changeOrderStatus(orderId, target, await requireOrderEditor())
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
}

const orderIdsSchema = z.array(z.uuid()).min(1).max(BULK_LIMIT)

/**
 * Aksi massal Daftar Pesanan (BELL-19): ubah status atau batalkan pesanan terpilih.
 * Pesanan yang langkahnya tidak sah dilewati dan disebut di hasil.
 */
export async function updateOrderStatuses(orderIds: unknown, target: string): Promise<BulkResult> {
  let userId: string
  try {
    userId = await requireOrderEditor()
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
  const ids = orderIdsSchema.safeParse(orderIds)
  const status = parseStatus(target)
  if (!ids.success || !status) {
    return { ok: false, message: "Pilihan pesanan tidak terbaca. Muat ulang halaman." }
  }

  const label = ORDER_STATUS_LABEL[status]
  return summarizeBulk({
    ...(await changeStatuses(ids.data, status, userId)),
    one: (orderNo) =>
      status === "dibatalkan" ? `${orderNo} dibatalkan.` : `Status ${orderNo} jadi ${label}.`,
    many: (count) =>
      status === "dibatalkan" ? `${count} pesanan dibatalkan.` : `${count} pesanan jadi ${label}.`,
  })
}

/** Mulai / selesai masak dari halaman Produksi (Admin, Produksi). Hanya langkah dapur. */
export async function updateProductionStatus(
  orderId: string,
  target: string,
): Promise<ActionResult> {
  let userId: string
  try {
    userId = (await requireRole(CAN_PRODUCE)).id
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
  return changeOrderStatus(orderId, target, userId, PRODUCTION_STATUSES)
}

export type ExportOrdersResult =
  { ok: true; csv: string; count: number } | { ok: false; message: string }

/** Unduh CSV pesanan terpilih (BELL-19), urut nomor pesanan. */
export async function exportOrdersCsv(orderIds: unknown): Promise<ExportOrdersResult> {
  try {
    await requireOrderEditor()
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
  const ids = orderIdsSchema.safeParse(orderIds)
  if (!ids.success) {
    return { ok: false, message: "Pilihan pesanan tidak terbaca. Muat ulang halaman." }
  }
  const rows = await getOrdersForExport(ids.data)
  if (rows.length === 0)
    return { ok: false, message: "Pesanan tidak ditemukan. Muat ulang halaman." }
  return { ok: true, csv: ordersToCsv(rows), count: rows.length }
}

const orderNoteSchema = z.string().trim().max(300, "Catatan terlalu panjang (maks. 300 karakter).")

/** Catatan pesanan, mis. add-on pembeli (Admin, Kasir). Kosong = catatan dihapus. */
export async function updateOrderNote(orderId: unknown, note: unknown): Promise<ActionResult> {
  let userId: string
  try {
    userId = await requireOrderEditor()
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
  const id = z.uuid().safeParse(orderId)
  const text = orderNoteSchema.safeParse(note)
  if (!id.success) return { ok: false, message: "Pesanan tidak dikenal. Muat ulang halaman." }
  if (!text.success) {
    return { ok: false, message: text.error.issues[0]?.message ?? "Catatan belum benar." }
  }

  const order = await getDb().transaction(async (tx) => {
    const [current] = await tx
      .select({ orderNo: orders.orderNo, note: orders.note })
      .from(orders)
      .where(eq(orders.id, id.data))
      .for("update")
    if (!current) return null
    const next = text.data || null
    await tx.update(orders).set({ note: next }).where(eq(orders.id, id.data))
    const changes = describeNoteChange(current.note, next)
    if (changes.length > 0) {
      await tx
        .insert(orderEditLogs)
        .values({ orderId: id.data, part: "catatan", changes, editedBy: userId })
    }
    return current
  })
  if (!order) return { ok: false, message: "Pesanan tidak ditemukan. Muat ulang halaman." }

  revalidateOrders([order.orderNo])
  return {
    ok: true,
    message: text.data ? `Catatan ${order.orderNo} disimpan.` : `Catatan ${order.orderNo} dihapus.`,
  }
}

export type UpdateOrderResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: Partial<Record<DraftField, string>> }

/**
 * Edit data pesanan (customer, alamat, tanggal, metode, request, data hadiah) selama belum
 * dikirim. No. HP baru menautkan pesanan ke customer dengan nomor itu (dibuat bila belum ada).
 */
export async function updateOrderDetails(input: unknown): Promise<UpdateOrderResult> {
  let userId: string
  try {
    userId = await requireOrderEditor()
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
  const parsed = orderEditSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: "Data pesanan tidak terbaca. Muat ulang halaman lalu coba lagi." }
  }
  const { orderId, draft } = parsed.data
  const db = getDb()

  const [current] = await db
    .select({
      status: orders.status,
      orderNo: orders.orderNo,
      deliveryDate: orders.deliveryDate,
      channel: orders.channel,
      // Untuk log edit: nilai sebelum diubah.
      name: orders.customerName,
      phone: customers.phone,
      address: shipments.address,
      kind: orders.kind,
      type: orders.type,
      method: shipments.method,
      request: orders.request,
      senderName: orders.senderName,
      cardTo: orders.cardTo,
      cardWishes: orders.cardWishes,
      cardFrom: orders.cardFrom,
      marketplaceOrderNo: orders.marketplaceOrderNo,
      total: orders.total,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .where(eq(orders.id, orderId))
  if (!current) return { ok: false, message: "Pesanan tidak ditemukan. Muat ulang halaman." }
  if (!isEditable(current.status)) {
    return {
      ok: false,
      message: `Pesanan ${ORDER_STATUS_LABEL[current.status]} tidak bisa diubah lagi.`,
    }
  }

  const marketplace = isMarketplace(current.channel)
  // Menu tidak diubah di sini; "items" diisi supaya aturan kelengkapan lain tetap sama dengan form.
  const issues = draftIssues(
    { ...draft, channel: current.channel, quantities: { menu: 1 } },
    toJakartaDateString(new Date()),
  )
  // Pesanan lama boleh tetap memakai tanggal kirimnya walau sudah lewat.
  if (draft.deliveryDate === current.deliveryDate) delete issues.deliveryDate
  if (Object.keys(issues).length > 0) {
    return { ok: false, message: "Masih ada isian yang belum benar.", errors: issues }
  }

  const marketplaceOrderNo = marketplace ? draft.marketplaceOrderNo.trim() : null
  if (marketplaceOrderNo) {
    const used = await duplicateMarketplaceOrder(current.channel, marketplaceOrderNo, orderId)
    if (used) {
      const message = `No. pesanan ini sudah diinput sebagai ${used}.`
      return { ok: false, message, errors: { marketplaceOrderNo: message } }
    }
  }

  const phone = normalizePhone(draft.phone)
  const optional = (value: string) => value.trim() || null
  const isHadiah = !marketplace && draft.type === "hadiah"
  const method = marketplace
    ? ("ekspedisi" as const)
    : (draft.shippingMethod as Exclude<typeof draft.shippingMethod, "">)
  const address = optional(draft.address)
  // Total dikosongkan saat edit = total lama tetap dipakai.
  const total = marketplace ? (parseRupiahInput(draft.marketplaceTotal) ?? undefined) : undefined
  const before: DetailSnapshot = {
    name: current.name,
    phone: current.phone,
    address: current.address,
    deliveryDate: current.deliveryDate,
    kind: current.kind,
    type: current.type,
    method: current.method,
    request: current.request,
    senderName: current.senderName,
    cardTo: current.cardTo,
    cardWishes: current.cardWishes,
    cardFrom: current.cardFrom,
    marketplaceOrderNo: current.marketplaceOrderNo,
    total: current.total,
  }
  const changes = describeDetailChanges(before, {
    name: draft.name.trim(),
    phone: phone ?? current.phone,
    address,
    deliveryDate: draft.deliveryDate,
    kind: draft.kind,
    type: marketplace ? "personal" : draft.type,
    method,
    request: optional(draft.request),
    senderName: isHadiah ? optional(draft.senderName) : null,
    cardTo: isHadiah ? optional(draft.cardTo) : null,
    cardWishes: isHadiah ? optional(draft.cardWishes) : null,
    cardFrom: isHadiah ? optional(draft.cardFrom) : null,
    marketplaceOrderNo,
    total: total ?? current.total,
  })

  await db.transaction(async (tx) => {
    // Tanpa no. HP (disamarkan marketplace), pesanan tetap memakai customer yang sekarang.
    const customer = phone
      ? await resolveCustomer(tx, { name: draft.name.trim(), phone, address })
      : undefined

    await tx
      .update(orders)
      .set({
        customerId: customer?.id,
        customerName: draft.name.trim(),
        marketplaceOrderNo,
        total,
        type: marketplace ? "personal" : draft.type,
        kind: draft.kind,
        deliveryDate: draft.deliveryDate,
        request: optional(draft.request),
        senderName: isHadiah ? optional(draft.senderName) : null,
        cardTo: isHadiah ? optional(draft.cardTo) : null,
        cardWishes: isHadiah ? optional(draft.cardWishes) : null,
        cardFrom: isHadiah ? optional(draft.cardFrom) : null,
      })
      .where(eq(orders.id, orderId))
    await tx
      .update(shipments)
      .set({ method, address, status: shipmentStatusFor(current.status, method) })
      .where(eq(shipments.orderId, orderId))
    if (total !== undefined) {
      await tx.update(payments).set({ amount: total }).where(eq(payments.orderId, orderId))
    }
    if (changes.length > 0) {
      await tx.insert(orderEditLogs).values({ orderId, part: "data", changes, editedBy: userId })
    }
  })

  revalidateOrders([current.orderNo])
  revalidatePath("/master-data/customer")
  return { ok: true, message: `Data ${current.orderNo} disimpan.` }
}

const orderItemsSchema = z.object({
  orderId: z.uuid(),
  items: z
    .array(
      z.object({
        menuVariantId: z.uuid(),
        qty: z.number().int().min(1).max(99),
        note: z.string().trim().max(120, "Catatan menu paling panjang 120 huruf."),
      }),
    )
    .min(1, "Pesanan harus berisi minimal satu menu.")
    .max(50),
})

export type UpdateOrderItemsResult =
  { ok: true; message: string; warning?: string } | { ok: false; message: string }

/**
 * Ubah menu pesanan (Admin, Kasir): tambah, ganti jumlah, hapus, dan catatan per menu. Hanya
 * selama Baru atau Diproses (belum selesai dimasak). Menu yang sudah ada tetap memakai harga
 * saat dipesan; menu baru memakai harga sekarang. Total WhatsApp dihitung ulang; total
 * marketplace tetap (sesuai marketplace). Pembayaran Lunas tidak diubah, tapi selisihnya
 * dilaporkan supaya bisa ditagih atau dikembalikan.
 */
export async function updateOrderItems(input: unknown): Promise<UpdateOrderItemsResult> {
  let userId: string
  try {
    userId = await requireOrderEditor()
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
  const parsed = orderItemsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data menu tidak terbaca." }
  }
  const { orderId } = parsed.data
  // Varian yang sama digabung.
  const merged = new Map<string, { qty: number; note: string }>()
  for (const item of parsed.data.items) {
    const current = merged.get(item.menuVariantId)
    merged.set(item.menuVariantId, {
      qty: (current?.qty ?? 0) + item.qty,
      note: current?.note || item.note,
    })
  }

  class Rejected extends Error {}
  try {
    const result = await getDb().transaction(async (tx) => {
      const [order] = await tx
        .select({
          orderNo: orders.orderNo,
          status: orders.status,
          channel: orders.channel,
          total: orders.total,
        })
        .from(orders)
        .where(eq(orders.id, orderId))
        .for("update")
      if (!order) throw new Rejected("Pesanan tidak ditemukan. Muat ulang halaman.")
      if (!isMenuEditable(order.status)) {
        throw new Rejected(
          `Menu ${order.orderNo} sudah terkunci karena pesanan ${ORDER_STATUS_LABEL[order.status]}.`,
        )
      }

      const existing = await tx
        .select({
          menuVariantId: orderItems.menuVariantId,
          unitPrice: orderItems.unitPrice,
          qty: orderItems.qty,
          note: orderItems.note,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId))
      const oldPrice = new Map(existing.map((item) => [item.menuVariantId, item.unitPrice]))
      const added = [...merged.keys()].filter((id) => !oldPrice.has(id))
      const prices =
        added.length === 0
          ? []
          : await tx
              .select({ id: menuVariants.id, price: menuVariants.price })
              .from(menuVariants)
              .innerJoin(menus, eq(menus.id, menuVariants.menuId))
              .where(
                and(
                  inArray(menuVariants.id, added),
                  eq(menuVariants.isActive, true),
                  eq(menus.isActive, true),
                ),
              )
      if (prices.length !== added.length) {
        throw new Rejected("Ada menu yang sudah nonaktif. Muat ulang lalu pilih lagi.")
      }
      const newPrice = new Map(prices.map((item) => [item.id, item.price]))

      const rows = [...merged].map(([menuVariantId, { qty, note }]) => {
        const unitPrice = oldPrice.get(menuVariantId) ?? newPrice.get(menuVariantId)!
        return {
          orderId,
          menuVariantId,
          qty,
          unitPrice,
          subtotal: unitPrice * qty,
          note: note || null,
        }
      })
      await tx.delete(orderItems).where(eq(orderItems.orderId, orderId))
      await tx.insert(orderItems).values(rows)

      // Log edit: nama menu + ukuran untuk semua varian yang terlibat.
      const variantIds = [...new Set([...oldPrice.keys(), ...merged.keys()])]
      const names = await tx
        .select({ id: menuVariants.id, name: menus.name, size: menuVariants.size })
        .from(menuVariants)
        .innerJoin(menus, eq(menus.id, menuVariants.menuId))
        .where(inArray(menuVariants.id, variantIds))
      const labelOf = new Map(
        names.map((row) => [
          row.id,
          row.size === "single"
            ? row.name
            : `${row.name} (${row.size === "large" ? "Large" : "Regular"})`,
        ]),
      )
      const snapshot = (item: { menuVariantId: string; qty: number; note: string | null }) =>
        ({
          menuVariantId: item.menuVariantId,
          label: labelOf.get(item.menuVariantId) ?? "Menu",
          qty: item.qty,
          note: item.note,
        }) satisfies ItemSnapshot
      const changes = describeItemChanges(existing.map(snapshot), rows.map(snapshot))
      if (changes.length > 0) {
        await tx.insert(orderEditLogs).values({ orderId, part: "menu", changes, editedBy: userId })
      }

      const total = isMarketplace(order.channel)
        ? order.total
        : rows.reduce((sum, row) => sum + row.subtotal, 0)
      if (total !== order.total)
        await tx.update(orders).set({ total }).where(eq(orders.id, orderId))

      const [payment] = await tx
        .select({ amount: payments.amount })
        .from(payments)
        .where(and(eq(payments.orderId, orderId), eq(payments.status, "lunas")))
      return { orderNo: order.orderNo, total, paidAmount: payment?.amount ?? null }
    })

    revalidateOrders([result.orderNo])
    const diff = result.paidAmount === null ? 0 : result.total - result.paidAmount
    return {
      ok: true,
      message: `Menu ${result.orderNo} disimpan. Total ${formatRupiah(result.total)}.`,
      warning:
        diff > 0
          ? `Sudah lunas ${formatRupiah(result.paidAmount!)}. Customer kurang bayar ${formatRupiah(diff)}.`
          : diff < 0
            ? `Sudah lunas ${formatRupiah(result.paidAmount!)}. Lebih bayar ${formatRupiah(-diff)}, kembalikan ke customer.`
            : undefined,
    }
  } catch (error) {
    if (error instanceof Rejected) return { ok: false, message: error.message }
    throw error
  }
}

const urgentSchema = z.object({
  orderId: z.uuid(),
  urgent: z.boolean(),
  note: z.string().trim().max(120, "Alasan paling panjang 120 huruf.").optional(),
})

/**
 * Tandai / hapus urgent (Admin, Kasir) untuk pesanan dadakan. Semua staf yang sedang membuka
 * aplikasi mendapat popup + suara (src/features/urgent). Pesanan Selesai atau Dibatalkan tidak
 * bisa ditandai urgent.
 */
export async function setOrderUrgent(input: unknown): Promise<ActionResult> {
  let userId: string
  try {
    userId = await requireOrderEditor()
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
  const parsed = urgentSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak terbaca." }
  }
  const { orderId, urgent, note } = parsed.data

  const db = getDb()
  const [order] = await db
    .select({ orderNo: orders.orderNo, status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
  if (!order) return { ok: false, message: "Pesanan tidak ditemukan. Muat ulang halaman." }
  if (urgent && (order.status === "selesai" || order.status === "dibatalkan")) {
    return {
      ok: false,
      message: `Pesanan ${ORDER_STATUS_LABEL[order.status]} tidak bisa ditandai urgent.`,
    }
  }

  await db
    .update(orders)
    .set(
      urgent
        ? { urgentAt: sql`now()`, urgentBy: userId, urgentNote: note || null }
        : { urgentAt: null, urgentBy: null, urgentNote: null },
    )
    .where(eq(orders.id, orderId))
  revalidateOrders([order.orderNo])
  return {
    ok: true,
    message: urgent
      ? `${order.orderNo} ditandai URGENT. Semua staf mendapat pemberitahuan.`
      : `Tanda urgent ${order.orderNo} dihapus.`,
  }
}
