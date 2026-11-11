import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import postgres from "postgres"

import { directDatabaseUrl } from "../../src/db/url"
import type { OrderStatus } from "../../src/features/orders/filters"
import { shipmentStatusFor } from "../../src/features/orders/status"
import { PHOTO_BUCKET } from "../../src/lib/photos"

config({ path: ".env.local", quiet: true })

export type SavedOrder = {
  type: string
  /** po / ready_stock / made_to_order */
  kind: string
  status: string
  total: number
  /** Nama customer di data customer (terbaru untuk no. HP itu). */
  customer: string
  /** Nama customer yang tersimpan di pesanan ini. */
  order_name: string
  sender_name: string | null
  card_wishes: string | null
  raw_wa_text: string | null
  method: string
  shipment_status: string | null
  items: number
  logs: number
  payments: number
  channel: string
  marketplace_order_no: string | null
  expedition: string | null
  tracking_no: string | null
  tracking_url: string | null
  tracking_link_sent_at: Date | null
  note: string | null
}

/** Ringkasan pesanan tersimpan, untuk memastikan isi database sesuai form. */
export async function readOrder(orderNo: string): Promise<SavedOrder | undefined> {
  const url = directDatabaseUrl()
  if (!url) return undefined
  const sql = postgres(url, { max: 1 })
  try {
    const [row] = await sql<SavedOrder[]>`
      select o.type, o.kind, o.status, o.total, c.name as customer, o.customer_name as order_name,
        o.sender_name, o.card_wishes,
        o.raw_wa_text, s.method, s.status as shipment_status, o.channel, o.marketplace_order_no,
        s.expedition, s.tracking_no, s.tracking_url, s.tracking_link_sent_at, o.note,
        (select count(*)::int from order_items i where i.order_id = o.id) as items,
        (select count(*)::int from order_status_logs l where l.order_id = o.id) as logs,
        (select count(*)::int from payments p where p.order_id = o.id) as payments
      from orders o
      join customers c on c.id = o.customer_id
      join shipments s on s.order_id = o.id
      where o.order_no = ${orderNo}`
    return row
  } finally {
    await sql.end()
  }
}

/**
 * Kembalikan stok packaging yang terpotong pesanan uji (packing), lalu hapus riwayatnya, supaya
 * stok asli tidak berkurang oleh test.
 */
async function restorePackagingStock(tx: postgres.TransactionSql, orderIds: string[]) {
  if (orderIds.length === 0) return
  await tx`
    update packagings p set stock = p.stock + n.qty
    from (
      select item_id, sum(case when direction = 'out' then qty else -qty end)::int as qty
      from stock_movements
      where item_type = 'packaging' and order_id = any(${orderIds}::uuid[])
      group by item_id
    ) n
    where p.id = n.item_id and n.qty > 0`
  await tx`delete from stock_movements where order_id = any(${orderIds}::uuid[])`
}

/**
 * Hapus pesanan uji (customer-nya bernama "QA Customer …") beserta item, pengiriman, log, dan
 * customer-nya. Penghitung nomor harian disesuaikan supaya pesanan asli tidak melompat nomornya.
 */
export async function removeOrderByNo(orderNo: string) {
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    await sql.begin(async (tx) => {
      const [order] = await tx<{ id: string; customer_id: string; name: string }[]>`
        select o.id, o.customer_id, c.name from orders o
        join customers c on c.id = o.customer_id where o.order_no = ${orderNo}`
      if (!order) return
      if (!order.name.startsWith("QA Customer "))
        throw new Error("Hanya pesanan uji (customer QA Customer …) yang boleh dihapus")
      await restorePackagingStock(tx, [order.id])
      await tx`delete from orders where id = ${order.id}`
      await tx`delete from customers c where c.id = ${order.customer_id}
        and not exists (select 1 from orders o where o.customer_id = c.id)`
      // Penghitung disetel ke nomor terbesar yang masih ada, apa pun urutan penghapusannya,
      // supaya pesanan asli berikutnya tidak melompati nomor.
      const date = `20${orderNo.slice(2, 4)}-${orderNo.slice(4, 6)}-${orderNo.slice(6, 8)}`
      await tx`update order_counters set last_seq = (
          select coalesce(max(substring(order_no from 9)::int), 0) from orders
          where order_no like ${`${orderNo.slice(0, 8)}%`}
        ) where date = ${date}`
    })
  } finally {
    await sql.end()
  }
}

const QA_STATUSES: OrderStatus[] = [
  "baru",
  "diproses",
  "siap_kirim",
  "dikirim",
  "selesai",
  "dibatalkan",
]
const QA_METHODS = ["kurir_internal", "instant", "pick_up"] as const

type SeedPlan = {
  status: OrderStatus
  method: (typeof QA_METHODS)[number]
  /** Sudah Lunas (pesanan baru masuk antrean masak setelah Lunas). */
  paid?: boolean
}

/**
 * Buat `count` pesanan uji hari ini langsung di DB, untuk menguji daftar dan filter.
 * Nomornya "QA<kode>NN" (bukan BB…), jadi penghitung nomor asli tidak tersentuh.
 * Pesanan ke-1..(count-hadiah) Normal, sisanya Hampers; status dan metode bergiliran, kecuali
 * diatur lewat `plan` (satu entri per pesanan). Tanggal kirim default besok (WIB).
 */
export async function seedQaOrders(
  code: string,
  count: number,
  hadiah: number,
  options: { deliveryDate?: string; plan?: SeedPlan[] } = {},
) {
  const url = directDatabaseUrl()
  if (!url) throw new Error("DIRECT_DATABASE_URL belum diisi")
  const sql = postgres(url, { max: 1 })
  const customerName = `QA Customer ${code}`
  const phone = `0899${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`
  try {
    await sql.begin(async (tx) => {
      const [customer] = await tx<{ id: string }[]>`
        insert into customers (name, phone) values (${customerName}, ${phone}) returning id`
      for (let i = 0; i < count; i++) {
        const { status, method, paid } = options.plan?.[i] ?? {
          status: QA_STATUSES[i % QA_STATUSES.length],
          method: QA_METHODS[i % QA_METHODS.length],
        }
        const [order] = await tx<{ id: string }[]>`
          insert into orders (order_no, customer_id, customer_name, type, sender_name, status,
            delivery_date, total, created_at)
          values (${`QA${code}${String(i + 1).padStart(2, "0")}`}, ${customer.id}, ${customerName},
            ${i < count - hadiah ? "normal" : "hampers"},
            ${i < count - hadiah ? null : `QA Pengirim ${code}`},
            ${status},
            coalesce(${options.deliveryDate ?? null}::date,
              (now() at time zone 'Asia/Jakarta')::date + 1),
            ${100_000 + i * 10_000},
            now() - make_interval(secs => ${count - i}))
          returning id`
        await tx`insert into shipments (order_id, method, status)
          values (${order.id}, ${method}, ${shipmentStatusFor(status, method)})`
        if (paid) await insertPayment(tx, order.id, 100_000 + i * 10_000)
      }
    })
  } finally {
    await sql.end()
  }
  return { customerName, phone }
}

/**
 * Data laporan uji di Maret 2021 (jauh dari data asli), satu customer:
 * - 27 Feb (periode pembanding): Normal, Kurir, Selesai, 1× Bolognese L, lunas Cash 65.000.
 * - 1 Mar: Normal, Kurir Internal, Selesai, 2× Bolognese L = 130.000, lunas Bank.
 * - 2 Mar: Hampers, Instant, Dikirim, 1× Choco Bon Bon = 40.000, lunas E-Wallet.
 * - 2 Mar: Normal, Pick Up, Baru, 1× Bolognese L = 65.000, belum bayar.
 * - 3 Mar: Dibatalkan, 5× Bolognese L (tidak dihitung).
 */
export async function seedReportOrders(code: string) {
  const url = directDatabaseUrl()
  if (!url) throw new Error("DIRECT_DATABASE_URL belum diisi")
  const sql = postgres(url, { max: 1 })
  try {
    await sql.begin(async (tx) => {
      const variant = async (menu: string, size: string) => {
        const [row] = await tx<{ id: string; price: number }[]>`
          select v.id, v.price from menu_variants v join menus m on m.id = v.menu_id
          where m.name = ${menu} and v.size = ${size}`
        return row
      }
      const method = async (type: string) => {
        const [row] = await tx<{ id: string }[]>`
          select id from payment_methods where type = ${type} order by created_at limit 1`
        return row.id
      }
      const bolo = await variant("Spaghetti Classico Bologna Brulee", "large")
      const choco = await variant("Choco Bon Bon", "single")
      const [customer] = await tx<{ id: string }[]>`
        insert into customers (name, phone)
        values (${`QA Customer ${code}`}, ${`0899${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`})
        returning id`
      const rows = [
        {
          day: "2021-02-27",
          type: "normal",
          status: "selesai",
          ship: "kurir_internal",
          item: bolo,
          qty: 1,
          pay: "cash",
        },
        {
          day: "2021-03-01",
          type: "normal",
          status: "selesai",
          ship: "kurir_internal",
          item: bolo,
          qty: 2,
          pay: "bank",
        },
        {
          day: "2021-03-02",
          type: "hampers",
          status: "dikirim",
          ship: "instant",
          item: choco,
          qty: 1,
          pay: "ewallet",
        },
        {
          day: "2021-03-02",
          type: "normal",
          status: "baru",
          ship: "pick_up",
          item: bolo,
          qty: 1,
          pay: null,
        },
        {
          day: "2021-03-03",
          type: "normal",
          status: "dibatalkan",
          ship: "kurir_internal",
          item: bolo,
          qty: 5,
          pay: null,
        },
      ]
      for (const [index, row] of rows.entries()) {
        const total = row.item.price * row.qty
        const createdAt = `${row.day}T10:0${index}:00+07:00`
        const [order] = await tx<{ id: string }[]>`
          insert into orders (order_no, customer_id, customer_name, type, status, delivery_date,
            total, created_at)
          values (${`QA${code}${String(index + 1).padStart(2, "0")}`}, ${customer.id},
            ${`QA Customer ${code}`}, ${row.type},
            ${row.status}, ${row.day}, ${total}, ${createdAt})
          returning id`
        await tx`insert into order_items (order_id, menu_variant_id, qty, unit_price, subtotal)
          values (${order.id}, ${row.item.id}, ${row.qty}, ${row.item.price}, ${total})`
        await tx`insert into shipments (order_id, method) values (${order.id}, ${row.ship})`
        if (row.pay) {
          await tx`insert into payments (order_id, payment_method_id, amount, status, paid_at)
            values (${order.id}, ${await method(row.pay)}, ${total}, 'lunas', ${createdAt})`
        }
      }
    })
  } finally {
    await sql.end()
  }
}

/** Hapus pesanan dari seedQaOrders(code) beserta customer-nya. */
export async function removeQaOrders(code: string) {
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    await sql.begin(async (tx) => {
      const rows = await tx<{ id: string }[]>`
        select id from orders where order_no like ${`QA${code}%`}`
      await restorePackagingStock(
        tx,
        rows.map((row) => row.id),
      )
      await tx`delete from orders where order_no like ${`QA${code}%`}`
      await tx`delete from customers where name = ${`QA Customer ${code}`}`
    })
  } finally {
    await sql.end()
  }
}

/** Hapus packaging uji (nama diawali "QA Packaging ") beserta riwayat stok dan fotonya. */
export async function removePackagingByName(name: string) {
  if (!name.startsWith("QA Packaging "))
    throw new Error("Hanya packaging uji (QA Packaging …) yang boleh dihapus")
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    await sql.begin(async (tx) => {
      const rows = await tx<{ id: string }[]>`select id from packagings where name = ${name}`
      for (const row of rows) {
        await tx`delete from stock_movements where item_type = 'packaging' and item_id = ${row.id}`
      }
      await tx`delete from packagings where name = ${name}`
    })
  } finally {
    await sql.end()
  }
}

/** Hapus satu customer uji (nama diawali "QA Customer "). */
export async function removeCustomerByName(name: string) {
  if (!name.startsWith("QA Customer "))
    throw new Error("Hanya customer uji (QA Customer …) yang boleh dihapus")
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    await sql`delete from customers where name = ${name}`
  } finally {
    await sql.end()
  }
}

/**
 * Simpan isi Pengaturan toko sebelum test dan kembalikan persis sesudahnya (termasuk "belum
 * pernah disimpan"), karena tabel ini hanya satu baris dan dipakai data asli.
 */
export async function snapshotStoreSettings(): Promise<() => Promise<void>> {
  const url = directDatabaseUrl()
  if (!url) return async () => {}
  const sql = postgres(url, { max: 1 })
  const [row] = await sql<Record<string, unknown>[]>`select * from store_settings where id = 1`
  await sql.end()
  return async () => {
    const restore = postgres(url, { max: 1 })
    try {
      await restore`delete from store_settings where id = 1`
      if (row) await restore`insert into store_settings ${restore(row)}`
    } finally {
      await restore.end()
    }
  }
}

/** Hapus satu akun staf uji (email qa-staff-…@example.com) dari Auth; profilnya ikut terhapus. */
export async function removeStaffByEmail(email: string) {
  if (!/^qa-staff-[\w-]+@example\.com$/.test(email))
    throw new Error("Hanya akun uji (qa-staff-…@example.com) yang boleh dihapus")
  const url = directDatabaseUrl()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !supabaseUrl || !secret) return
  const sql = postgres(url, { max: 1 })
  try {
    const rows = await sql<{ id: string }[]>`select id from auth.users where email = ${email}`
    const admin = createClient(supabaseUrl, secret, { auth: { persistSession: false } })
    for (const row of rows) await admin.auth.admin.deleteUser(row.id)
  } finally {
    await sql.end()
  }
}

/** Hapus satu metode pembayaran uji (nama diawali "QA Metode "). */
export async function removePaymentMethodByName(name: string) {
  if (!name.startsWith("QA Metode "))
    throw new Error("Hanya metode uji (QA Metode …) yang boleh dihapus")
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    await sql`delete from payment_methods where name = ${name}`
  } finally {
    await sql.end()
  }
}

/** Hapus satu kurir uji (nama diawali "QA Kurir "). */
export async function removeCourierByName(name: string) {
  if (!name.startsWith("QA Kurir "))
    throw new Error("Hanya kurir uji (QA Kurir …) yang boleh dihapus")
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    await sql`delete from couriers where name = ${name}`
  } finally {
    await sql.end()
  }
}

/**
 * Hapus satu menu uji (berdasarkan nama persisnya) beserta fotonya di Storage.
 * DB lokal = DB produksi, jadi hanya baris yang dibuat test itu sendiri yang dihapus.
 */
export async function removeMenuByName(name: string) {
  if (!name.startsWith("QA Menu ")) throw new Error("Hanya menu uji (QA Menu …) yang boleh dihapus")
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    const rows = await sql<{ photo_path: string | null }[]>`
      delete from menus where name = ${name} returning photo_path`
    const paths = rows
      .map((row) => row.photo_path)
      .filter((p): p is string => !!p && !p.startsWith("/"))
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const secret = process.env.SUPABASE_SECRET_KEY
    if (paths.length && supabaseUrl && secret) {
      await createClient(supabaseUrl, secret, { auth: { persistSession: false } })
        .storage.from(PHOTO_BUCKET)
        .remove(paths)
    }
  } finally {
    await sql.end()
  }
}

/** Buat packaging uji (nama diawali "QA Packaging ") dengan stok awal, langsung di DB. */
export async function createQaPackaging(name: string, stock: number) {
  if (!name.startsWith("QA Packaging ")) throw new Error("Nama packaging uji harus QA Packaging …")
  const url = directDatabaseUrl()
  if (!url) throw new Error("DIRECT_DATABASE_URL belum diisi")
  const sql = postgres(url, { max: 1 })
  try {
    await sql`insert into packagings (name, stock, unit) values (${name}, ${stock}, 'pcs')`
  } finally {
    await sql.end()
  }
}

/** Stok packaging sekarang menurut DB. */
export async function readPackagingStock(name: string): Promise<number | undefined> {
  const url = directDatabaseUrl()
  if (!url) return undefined
  const sql = postgres(url, { max: 1 })
  try {
    const [row] = await sql<{ stock: number }[]>`select stock from packagings where name = ${name}`
    return row?.stock
  } finally {
    await sql.end()
  }
}

async function insertPayment(tx: postgres.TransactionSql, orderId: string, amount: number) {
  const [method] = await tx<{ id: string }[]>`
    select id from payment_methods where is_active order by created_at limit 1`
  await tx`insert into payments (order_id, payment_method_id, amount, status, paid_at)
    values (${orderId}, ${method.id}, ${amount}, 'lunas', now())`
}

/** Tandai pesanan uji Lunas langsung di DB (nominal = total), supaya bisa mulai dimasak. */
export async function markQaOrderPaid(orderNo: string) {
  const url = directDatabaseUrl()
  if (!url) throw new Error("DIRECT_DATABASE_URL belum diisi")
  const sql = postgres(url, { max: 1 })
  try {
    await sql.begin(async (tx) => {
      const [order] = await tx<{ id: string; total: number; name: string }[]>`
        select o.id, o.total, o.customer_name as name from orders o where o.order_no = ${orderNo}`
      if (!order?.name.startsWith("QA Customer "))
        throw new Error("Hanya pesanan uji (QA Customer …) yang boleh ditandai lunas lewat test")
      await insertPayment(tx, order.id, order.total)
    })
  } finally {
    await sql.end()
  }
}

/** Hapus pesan Chat Tim uji (berisi `marker`, ditulis akun QA). */
export async function removeChatMessages(marker: string) {
  if (!marker.startsWith("QA-chat-")) throw new Error("Penanda pesan uji harus QA-chat-…")
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    await sql`delete from chat_messages m using profiles p
      where p.id = m.author_id and p.name like 'QA %' and m.body like ${`%${marker}%`}`
  } finally {
    await sql.end()
  }
}

/** Hapus kategori menu uji (nama diawali "QA Kategori ") beserta menu uji di dalamnya. */
export async function removeMenuCategoryByName(name: string) {
  if (!name.startsWith("QA Kategori ")) throw new Error("Hanya kategori uji (QA Kategori …)")
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    await sql`delete from menus m using menu_categories c
      where c.id = m.category_id and c.name = ${name} and m.name like 'QA Menu %'`
    await sql`delete from menu_categories where name = ${name}`
  } finally {
    await sql.end()
  }
}

/** Hapus kategori stok packaging uji (nama diawali "QA Kategori Stok "). */
export async function removePackagingCategoryByName(name: string) {
  if (!name.startsWith("QA Kategori Stok "))
    throw new Error("Hanya kategori uji (QA Kategori Stok …)")
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    await sql`delete from packaging_categories where name = ${name}`
  } finally {
    await sql.end()
  }
}
