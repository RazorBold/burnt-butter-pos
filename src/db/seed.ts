// Data awal dari gambar desain (docs/design/06-master-data.png dan menu makanan.png).
// Aman dijalankan berulang: baris yang sudah ada dilewati.
// Jalankan: pnpm db:seed

import { config } from "dotenv"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema"
import { directDatabaseUrl } from "./url"

config({ path: ".env.local", quiet: true })

type MenuSeed = {
  name: string
  slug: string
  category: "pasta" | "dessert" | "bundle"
  description: string
  prices: { large: number; regular: number } | { single: number }
}

const MENUS: MenuSeed[] = [
  {
    name: "Spaghetti Classico Bologna Brulee",
    slug: "spaghetti-classico-bologna-brulee",
    category: "pasta",
    description:
      "Spaghetti dengan saus bolognese klasik, dipanggang dengan taburan keju yang creamy.",
    prices: { large: 65000, regular: 50000 },
  },
  {
    name: "Not Your Mac and Cheese",
    slug: "not-your-mac-and-cheese",
    category: "pasta",
    description: "Mac and cheese creamy dengan perpaduan keju spesial yang rich dan lembut.",
    prices: { large: 65000, regular: 50000 },
  },
  {
    name: "Potato Gratin Lasagna",
    slug: "potato-gratin-lasagna",
    category: "pasta",
    description: "Kentang lembut dengan saus keju dan krim, dipanggang hingga golden brown.",
    prices: { large: 65000, regular: 50000 },
  },
  {
    name: "Melt My Mac and Cheese",
    slug: "melt-my-mac-and-cheese",
    category: "pasta",
    description: "Perpaduan macaroni, saus keju melimpah, dan topping yang super creamy.",
    prices: { large: 65000, regular: 50000 },
  },
  {
    name: "Spaghetti Aglio E Olio",
    slug: "spaghetti-aglio-e-olio",
    category: "pasta",
    description:
      "Spaghetti dengan minyak zaitun, bawang putih, dan sedikit pedas yang gurih dan aromatik.",
    prices: { large: 60000, regular: 45000 },
  },
  {
    name: "Choco Bon Bon",
    slug: "choco-bon-bon",
    category: "dessert",
    description: "Kue cokelat lembut dengan lapisan ganache yang rich dan lumer di mulut.",
    prices: { single: 40000 },
  },
  {
    name: "Bundle of 3",
    slug: "bundle-of-3",
    category: "bundle",
    description: "Pilih 3 menu favorit dalam satu paket spesial.",
    prices: { single: 180000 },
  },
]

function photoPathFor(menu: MenuSeed) {
  const suffix = "large" in menu.prices ? "-large" : ""
  return `/images/menu/${menu.slug}${suffix}.webp`
}

async function main() {
  const url = directDatabaseUrl()
  if (!url)
    throw new Error("POSTGRES_URL_NON_POOLING belum ada di .env.local (jalankan vercel env pull)")

  const client = postgres(url, { prepare: false, max: 1 })
  const db = drizzle(client, { schema })

  try {
    for (const menu of MENUS) {
      await db
        .insert(schema.menus)
        .values({
          name: menu.name,
          slug: menu.slug,
          category: menu.category,
          description: menu.description,
          photoPath: photoPathFor(menu),
        })
        .onConflictDoNothing({ target: schema.menus.slug })

      const [row] = await db
        .select({ id: schema.menus.id })
        .from(schema.menus)
        .where(eq(schema.menus.slug, menu.slug))

      const variants = Object.entries(menu.prices).map(([size, price]) => ({
        menuId: row.id,
        size: size as "large" | "regular" | "single",
        price,
      }))
      await db.insert(schema.menuVariants).values(variants).onConflictDoNothing()
    }

    // Satu per satu supaya created_at berurutan (urutan tampil = urutan desain).
    for (const packaging of [
      // Stok minimum dipilih supaya status sama dengan desain (Box Dessert 30 = Menipis).
      { name: "Box Large", stock: 120, capacity: 200, minStock: 50, unit: "pcs" },
      { name: "Box Regular", stock: 80, capacity: 200, minStock: 50, unit: "pcs" },
      { name: "Box Dessert", stock: 30, capacity: 100, minStock: 40, unit: "pcs" },
      { name: "Paper Bag", stock: 200, minStock: 50, unit: "pcs" },
      { name: "Cup Dessert", stock: 50, minStock: 20, unit: "pcs" },
    ]) {
      await db
        .insert(schema.packagings)
        .values(packaging)
        .onConflictDoNothing({ target: schema.packagings.name })
    }

    await db
      .insert(schema.rawMaterials)
      .values([
        { name: "Pasta Spaghetti", unit: "kg", stock: 15, minStock: 10 },
        { name: "Keju Cheddar", unit: "kg", stock: 8, minStock: 10 },
        { name: "Daging Sapi", unit: "kg", stock: 12, minStock: 10 },
        { name: "Saus Bolognaise", unit: "kg", stock: 6, minStock: 10 },
        { name: "Kentang", unit: "kg", stock: 20, minStock: 10 },
      ])
      .onConflictDoNothing({ target: schema.rawMaterials.name })

    await db
      .insert(schema.couriers)
      .values([
        { name: "Andi", type: "internal", phone: "081234567890" },
        { name: "Budi", type: "internal", phone: "081323456789" },
        { name: "Citra Express", type: "eksternal" },
      ])
      .onConflictDoNothing({ target: schema.couriers.name })

    await db
      .insert(schema.paymentMethods)
      .values([
        { name: "Transfer Bank", type: "bank" },
        { name: "OVO", type: "ewallet" },
        { name: "DANA", type: "ewallet" },
        { name: "Cash", type: "cash" },
      ])
      .onConflictDoNothing({ target: schema.paymentMethods.name })

    console.log("Seed selesai: menu, packaging, bahan baku, kurir, metode pembayaran.")
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
