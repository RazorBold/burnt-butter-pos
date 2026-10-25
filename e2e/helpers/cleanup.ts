import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import postgres from "postgres"

import { directDatabaseUrl } from "../../src/db/url"
import { PHOTO_BUCKET } from "../../src/lib/photos"

config({ path: ".env.local", quiet: true })

export type SavedOrder = {
  type: string
  status: string
  total: number
  customer: string
  sender_name: string | null
  card_wishes: string | null
  raw_wa_text: string | null
  method: string
  shipment_status: string | null
  items: number
  logs: number
}

/** Ringkasan pesanan tersimpan, untuk memastikan isi database sesuai form. */
export async function readOrder(orderNo: string): Promise<SavedOrder | undefined> {
  const url = directDatabaseUrl()
  if (!url) return undefined
  const sql = postgres(url, { max: 1 })
  try {
    const [row] = await sql<SavedOrder[]>`
      select o.type, o.status, o.total, c.name as customer, o.sender_name, o.card_wishes,
        o.raw_wa_text, s.method, s.status as shipment_status,
        (select count(*)::int from order_items i where i.order_id = o.id) as items,
        (select count(*)::int from order_status_logs l where l.order_id = o.id) as logs
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

const QA_STATUSES = ["baru", "diproses", "siap_kirim", "dikirim", "selesai", "dibatalkan"]
const QA_METHODS = ["kurir_internal", "instant", "pick_up"]

/**
 * Buat `count` pesanan uji hari ini langsung di DB, untuk menguji daftar dan filter.
 * Nomornya "QA<kode>NN" (bukan BB…), jadi penghitung nomor asli tidak tersentuh.
 * Pesanan ke-1..(count-hadiah) Personal, sisanya Hadiah; status dan metode bergiliran.
 */
export async function seedQaOrders(code: string, count: number, hadiah: number) {
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
        const method = QA_METHODS[i % QA_METHODS.length]
        const [order] = await tx<{ id: string }[]>`
          insert into orders (order_no, customer_id, type, sender_name, status, delivery_date,
            total, created_at)
          values (${`QA${code}${String(i + 1).padStart(2, "0")}`}, ${customer.id},
            ${i < count - hadiah ? "personal" : "hadiah"},
            ${i < count - hadiah ? null : `QA Pengirim ${code}`},
            ${QA_STATUSES[i % QA_STATUSES.length]},
            (now() at time zone 'Asia/Jakarta')::date + 1, ${100_000 + i * 10_000},
            now() - make_interval(secs => ${count - i}))
          returning id`
        await tx`insert into shipments (order_id, method) values (${order.id}, ${method})`
      }
    })
  } finally {
    await sql.end()
  }
  return { customerName, phone }
}

/** Hapus pesanan dari seedQaOrders(code) beserta customer-nya. */
export async function removeQaOrders(code: string) {
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    await sql`delete from orders where order_no like ${`QA${code}%`}`
    await sql`delete from customers where name = ${`QA Customer ${code}`}`
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
