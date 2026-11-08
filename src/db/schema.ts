import { relations, sql } from "drizzle-orm"
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { authUsers } from "drizzle-orm/supabase"

// Semua tabel memakai enableRLS() tanpa policy: aplikasi mengakses DB lewat koneksi server
// (Drizzle), sehingga kunci publishable Supabase tidak bisa membaca data sama sekali.

// ── Enum ────────────────────────────────────────────────────────────────────

export const userRole = pgEnum("user_role", ["admin", "kasir", "produksi", "owner"])
export const menuCategory = pgEnum("menu_category", ["pasta", "dessert", "bundle"])
export const menuSize = pgEnum("menu_size", ["large", "regular", "single"])
export const orderType = pgEnum("order_type", ["personal", "hadiah"])
export const orderChannel = pgEnum("order_channel", ["whatsapp", "shopee", "tokopedia"])
export const orderStatus = pgEnum("order_status", [
  "baru",
  "diproses",
  /** Selesai dimasak, menunggu packing (menu Packaging). Packing selesai = Siap Kirim. */
  "siap_packing",
  "siap_kirim",
  "dikirim",
  "selesai",
  "dibatalkan",
])
/** Jenis packing: Normal (stok tidak dicatat) atau Hampers (box hampers, stok terpotong). */
export const packagingType = pgEnum("packaging_type", ["normal", "hampers"])
export const shippingMethod = pgEnum("shipping_method", [
  "kurir_internal",
  "instant",
  "pick_up",
  "ekspedisi",
])
export const shipmentStatus = pgEnum("shipment_status", [
  "menunggu_kurir",
  "siap_dikirim",
  "siap_diambil",
  "dalam_perjalanan",
  "dikirim",
  "selesai",
])
export const deliverySlot = pgEnum("delivery_slot", ["09-12", "13-17"])
export const courierType = pgEnum("courier_type", ["internal", "eksternal"])
export const paymentMethodType = pgEnum("payment_method_type", [
  "bank",
  "ewallet",
  "cash",
  "marketplace",
])
export const paymentStatus = pgEnum("payment_status", ["menunggu", "lunas", "ditolak"])
export const stockItemType = pgEnum("stock_item_type", ["packaging", "raw_material"])
export const stockDirection = pgEnum("stock_direction", ["in", "out"])

// ── Kolom bersama ───────────────────────────────────────────────────────────

const id = () => uuid("id").primaryKey().defaultRandom()
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

// ── Pengguna ────────────────────────────────────────────────────────────────

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: userRole("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS()

// ── Customer & menu ─────────────────────────────────────────────────────────

export const customers = pgTable(
  "customers",
  {
    id: id(),
    name: text("name").notNull(),
    /** Dinormalisasi ke format 08xxxxxxxxxx. Kosong bila disamarkan marketplace. */
    phone: text("phone"),
    address: text("address"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("customers_phone_idx").on(t.phone)],
).enableRLS()

export const menus = pgTable("menus", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: menuCategory("category").notNull(),
  description: text("description"),
  /** "/images/menu/<slug>-large.webp" atau path di Supabase Storage. */
  photoPath: text("photo_path"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS()

export const menuVariants = pgTable(
  "menu_variants",
  {
    id: id(),
    menuId: uuid("menu_id")
      .notNull()
      .references(() => menus.id, { onDelete: "cascade" }),
    size: menuSize("size").notNull(),
    /** Rupiah. */
    price: integer("price").notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [uniqueIndex("menu_variants_menu_size_idx").on(t.menuId, t.size)],
).enableRLS()

// ── Pesanan ─────────────────────────────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: id(),
    /** BB + YYMMDD + 3 digit, mis. BB261021001. Dibuat lewat order_counters. */
    orderNo: text("order_no").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    /**
     * Nama customer (Hadiah: penerima) seperti diketik di pesanan ini. Disimpan per pesanan
     * karena customer dikenali dari no. HP dan namanya bisa berbeda di pesanan berikutnya;
     * pesanan lama tidak boleh ikut berubah nama.
     */
    customerName: text("customer_name").notNull(),
    /** Asal pesanan: template WhatsApp atau form marketplace. */
    channel: orderChannel("channel").notNull().default("whatsapp"),
    /** No. pesanan di Shopee/Tokopedia; unik per marketplace supaya tidak terinput dua kali. */
    marketplaceOrderNo: text("marketplace_order_no"),
    type: orderType("type").notNull(),
    status: orderStatus("status").notNull().default("baru"),
    /** Diisi saat selesai packing (menu Packaging); kosong sebelum di-packing. */
    packagingType: packagingType("packaging_type"),
    deliveryDate: date("delivery_date").notNull(),
    request: text("request"),
    /** Catatan staf setelah pesanan masuk, mis. add-on pembeli. Tidak mengubah total. */
    note: text("note"),
    /** Rupiah. WhatsApp: jumlah subtotal order_items. Marketplace: diisi sesuai marketplace. */
    total: integer("total").notNull(),
    /** Teks WA asli yang ditempel saat Input Pesanan. */
    rawWaText: text("raw_wa_text"),
    /** Pesanan Hadiah: customer = penerima; pemesan dan kartu ucapan disimpan di sini. */
    senderName: text("sender_name"),
    cardTo: text("card_to"),
    cardWishes: text("card_wishes"),
    cardFrom: text("card_from"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("orders_marketplace_no_idx").on(t.channel, t.marketplaceOrderNo),
    index("orders_created_at_idx").on(t.createdAt),
    index("orders_delivery_date_idx").on(t.deliveryDate),
    index("orders_status_idx").on(t.status),
  ],
).enableRLS()

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuVariantId: uuid("menu_variant_id")
      .notNull()
      .references(() => menuVariants.id),
    qty: integer("qty").notNull(),
    /** Harga saat pesanan dibuat; tidak ikut berubah bila harga menu diubah. */
    unitPrice: integer("unit_price").notNull(),
    subtotal: integer("subtotal").notNull(),
    /** Catatan khusus menu ini (mis. "extra keju"), tampil di Produksi dan Packaging. */
    note: text("note"),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
).enableRLS()

export const orderCounters = pgTable("order_counters", {
  /** Tanggal pembuatan pesanan dalam WIB. */
  date: date("date").primaryKey(),
  lastSeq: integer("last_seq").notNull().default(0),
}).enableRLS()

export const orderStatusLogs = pgTable(
  "order_status_logs",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatus("from_status"),
    toStatus: orderStatus("to_status").notNull(),
    changedBy: uuid("changed_by").references(() => profiles.id),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_status_logs_order_idx").on(t.orderId)],
).enableRLS()

// ── Pengiriman ──────────────────────────────────────────────────────────────

export const couriers = pgTable("couriers", {
  id: id(),
  name: text("name").notNull().unique(),
  type: courierType("type").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS()

export const shipments = pgTable(
  "shipments",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: shippingMethod("method").notNull(),
    courierId: uuid("courier_id").references(() => couriers.id),
    /** Hanya untuk kurir_internal. */
    slot: deliverySlot("slot"),
    /** Hanya untuk ekspedisi: nama kurir marketplace (SPX, J&T, ...) dan nomor resi. */
    expedition: text("expedition"),
    trackingNo: text("tracking_no"),
    /** Link lacak perjalanan makanan (ojol, ekspedisi, atau kurir). Hanya http/https. */
    trackingUrl: text("tracking_url"),
    /** Kapan link lacak ditandai sudah dikirim ke customer; null = belum. Reset saat link diganti. */
    trackingLinkSentAt: timestamp("tracking_link_sent_at", { withTimezone: true }),
    /**
     * Kosong sampai pesanan Siap Kirim, lalu mengikuti metode: Kurir Internal → siap_dikirim,
     * Ekspedisi → siap_dikirim, Instant → menunggu_kurir, Pick Up → siap_diambil
     * (src/features/orders/status.ts).
     */
    status: shipmentStatus("status"),
    address: text("address"),
    addressLat: doublePrecision("address_lat"),
    addressLng: doublePrecision("address_lng"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("shipments_status_idx").on(t.status)],
).enableRLS()

// ── Pembayaran ──────────────────────────────────────────────────────────────

export const paymentMethods = pgTable("payment_methods", {
  id: id(),
  name: text("name").notNull().unique(),
  type: paymentMethodType("type").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS()

export const payments = pgTable(
  "payments",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    paymentMethodId: uuid("payment_method_id")
      .notNull()
      .references(() => paymentMethods.id),
    /** Rupiah. */
    amount: integer("amount").notNull(),
    status: paymentStatus("status").notNull().default("menunggu"),
    proofPath: text("proof_path"),
    /** Catatan kasir, mis. "BCA a.n. Siti, transfer 10.12". */
    note: text("note"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Kasir/Admin yang menandai lunas. */
    recordedBy: uuid("recorded_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  // Keputusan pemilik toko: status bayar cukup Lunas/Belum (tanpa DP), jadi satu baris per pesanan.
  (t) => [uniqueIndex("payments_order_idx").on(t.orderId)],
).enableRLS()

// ── Stok ────────────────────────────────────────────────────────────────────

export const packagings = pgTable("packagings", {
  id: id(),
  name: text("name").notNull().unique(),
  photoPath: text("photo_path"),
  stock: integer("stock").notNull().default(0),
  /** Kapasitas untuk bar "stok / kapasitas" di dashboard. */
  capacity: integer("capacity"),
  minStock: integer("min_stock"),
  unit: text("unit").notNull().default("pcs"),
  /** Box hampers per ukuran (Large/Regular); null = tanpa ukuran. */
  size: menuSize("size"),
  /** false = diarsipkan: tidak tampil di Stok Packaging, Dashboard, maupun dialog packing. */
  isActive: boolean("is_active").notNull().default(true),
  /** Belum dipakai (Nov 2026): disiapkan untuk aturan packaging otomatis per pesanan. */
  perOrderQty: integer("per_order_qty").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS()

/**
 * Belum dipakai (Nov 2026): disiapkan untuk aturan packaging otomatis per menu/ukuran. Sekarang
 * admin mengisi packaging tiap pesanan di menu Packaging.
 */
export const menuVariantPackagings = pgTable(
  "menu_variant_packagings",
  {
    menuVariantId: uuid("menu_variant_id")
      .notNull()
      .references(() => menuVariants.id, { onDelete: "cascade" }),
    packagingId: uuid("packaging_id")
      .notNull()
      .references(() => packagings.id, { onDelete: "cascade" }),
    qty: integer("qty").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.menuVariantId, t.packagingId] }),
    check("menu_variant_packagings_qty_positive", sql`${t.qty} > 0`),
  ],
).enableRLS()

export const rawMaterials = pgTable("raw_materials", {
  id: id(),
  name: text("name").notNull().unique(),
  unit: text("unit").notNull(),
  stock: numeric("stock", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
  minStock: numeric("min_stock", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS()

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: id(),
    itemType: stockItemType("item_type").notNull(),
    itemId: uuid("item_id").notNull(),
    direction: stockDirection("direction").notNull(),
    qty: numeric("qty", { precision: 10, scale: 2, mode: "number" }).notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    note: text("note"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: createdAt(),
  },
  (t) => [index("stock_movements_item_idx").on(t.itemType, t.itemId)],
).enableRLS()

// ── Chat Tim ────────────────────────────────────────────────────────────────

/** Satu ruang obrolan untuk semua staf (koordinasi). */
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: id(),
    /** Null bila akun penulis sudah dihapus. */
    authorId: uuid("author_id").references(() => profiles.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    /** "@semua": menandai semua staf aktif. */
    mentionsAll: boolean("mentions_all").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("chat_messages_created_idx").on(t.createdAt)],
).enableRLS()

/** Staf yang disebut (@nama) di sebuah pesan. */
export const chatMentions = pgTable(
  "chat_mentions",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => chatMessages.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.messageId, t.profileId] }),
    index("chat_mentions_profile_idx").on(t.profileId),
  ],
).enableRLS()

/** Kapan staf terakhir membuka Chat Tim, untuk menghitung pesan belum dibaca. */
export const chatReads = pgTable("chat_reads", {
  profileId: uuid("profile_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS()

// ── Pengaturan ──────────────────────────────────────────────────────────────

/** Profil toko. Selalu tepat satu baris (id = 1); dibaca dengan nilai bawaan bila belum ada. */
export const storeSettings = pgTable(
  "store_settings",
  {
    id: integer("id").primaryKey().default(1),
    storeName: text("store_name").notNull(),
    /** Nomor WhatsApp toko, format 08xxxxxxxxxx. */
    whatsapp: text("whatsapp"),
    /** Alamat ambil pesanan (Pick Up) dan titik awal rute kurir. */
    pickupAddress: text("pickup_address"),
    pickupMapsUrl: text("pickup_maps_url"),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedAt: updatedAt(),
  },
  (t) => [check("store_settings_single_row", sql`${t.id} = 1`)],
).enableRLS()

// ── Relasi (untuk db.query) ─────────────────────────────────────────────────

export const menusRelations = relations(menus, ({ many }) => ({
  variants: many(menuVariants),
}))

export const menuVariantsRelations = relations(menuVariants, ({ one }) => ({
  menu: one(menus, { fields: [menuVariants.menuId], references: [menus.id] }),
}))

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  createdByProfile: one(profiles, { fields: [orders.createdBy], references: [profiles.id] }),
  items: many(orderItems),
  shipment: one(shipments),
  payments: many(payments),
  statusLogs: many(orderStatusLogs),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  variant: one(menuVariants, { fields: [orderItems.menuVariantId], references: [menuVariants.id] }),
}))

export const orderStatusLogsRelations = relations(orderStatusLogs, ({ one }) => ({
  order: one(orders, { fields: [orderStatusLogs.orderId], references: [orders.id] }),
  changedByProfile: one(profiles, {
    fields: [orderStatusLogs.changedBy],
    references: [profiles.id],
  }),
}))

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, { fields: [shipments.orderId], references: [orders.id] }),
  courier: one(couriers, { fields: [shipments.courierId], references: [couriers.id] }),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  method: one(paymentMethods, {
    fields: [payments.paymentMethodId],
    references: [paymentMethods.id],
  }),
}))
