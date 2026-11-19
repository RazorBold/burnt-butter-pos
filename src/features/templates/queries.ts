import "server-only"

import { eq } from "drizzle-orm"

import { getDb } from "@/db"
import { messageTemplates, profiles } from "@/db/schema"
import { getOrderCatalog } from "@/features/orders/queries"
import { templateShippingLines } from "@/features/shipping-options/options"
import { listActiveShippingOptions } from "@/features/shipping-options/queries"

import {
  DEFAULT_TEMPLATES,
  renderStoredTemplate,
  TEMPLATE_KEYS,
  type TemplateKey,
  type TemplateMenu,
} from "./render"

export type StoredTemplate = {
  key: TemplateKey
  body: string
  /** false = belum pernah diubah Owner (template bawaan). */
  custom: boolean
  updatedAt: Date | null
  updatedByName: string | null
}

/** Template yang tersimpan; yang belum pernah disimpan memakai bawaan. */
export async function listTemplates(): Promise<StoredTemplate[]> {
  const rows = await getDb()
    .select({
      key: messageTemplates.key,
      body: messageTemplates.body,
      updatedAt: messageTemplates.updatedAt,
      updatedByName: profiles.name,
    })
    .from(messageTemplates)
    .leftJoin(profiles, eq(profiles.id, messageTemplates.updatedBy))
  return TEMPLATE_KEYS.map((key) => {
    const row = rows.find((item) => item.key === key)
    return row
      ? {
          key,
          body: row.body,
          custom: true,
          updatedAt: row.updatedAt,
          updatedByName: row.updatedByName,
        }
      : { key, body: DEFAULT_TEMPLATES[key], custom: false, updatedAt: null, updatedByName: null }
  })
}

/** Data Master Data untuk mengisi penanda template: menu aktif dan pilihan pengiriman. */
export async function getTemplateSources(): Promise<{
  menus: TemplateMenu[]
  shippingLines: string[]
}> {
  const [catalog, shippingOptions] = await Promise.all([
    getOrderCatalog(),
    listActiveShippingOptions(),
  ])
  return {
    menus: catalog.map(({ id, menuName, categoryName, categorySort, sized, size, price }) => ({
      id,
      menuName,
      categoryName,
      categorySort,
      sized,
      size,
      price,
    })),
    shippingLines: templateShippingLines(shippingOptions),
  }
}

/** Template siap salin (penanda sudah diisi), untuk tombol "Salin format" di Input Pesanan. */
export async function getRenderedTemplates(): Promise<Record<TemplateKey, string>> {
  const [templates, { menus, shippingLines }] = await Promise.all([
    listTemplates(),
    getTemplateSources(),
  ])
  return Object.fromEntries(
    templates.map((template) => [
      template.key,
      renderStoredTemplate(template.key, template.body, menus, shippingLines).text,
    ]),
  ) as Record<TemplateKey, string>
}
