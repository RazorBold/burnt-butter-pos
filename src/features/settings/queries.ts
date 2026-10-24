import "server-only"

import { eq } from "drizzle-orm"

import { getDb } from "@/db"
import { profiles, storeSettings } from "@/db/schema"

export type StoreSettings = {
  storeName: string
  whatsapp: string | null
  pickupAddress: string | null
  pickupMapsUrl: string | null
  updatedAt: Date | null
  updatedByName: string | null
}

export const DEFAULT_STORE_NAME = "Burnt Butter & Segelas Awan"

/** Profil toko. Sebelum pernah disimpan, yang dikembalikan adalah nilai bawaan. */
export async function getStoreSettings(): Promise<StoreSettings> {
  const [row] = await getDb()
    .select({
      storeName: storeSettings.storeName,
      whatsapp: storeSettings.whatsapp,
      pickupAddress: storeSettings.pickupAddress,
      pickupMapsUrl: storeSettings.pickupMapsUrl,
      updatedAt: storeSettings.updatedAt,
      updatedByName: profiles.name,
    })
    .from(storeSettings)
    .leftJoin(profiles, eq(profiles.id, storeSettings.updatedBy))
    .limit(1)
  return (
    row ?? {
      storeName: DEFAULT_STORE_NAME,
      whatsapp: null,
      pickupAddress: null,
      pickupMapsUrl: null,
      updatedAt: null,
      updatedByName: null,
    }
  )
}
