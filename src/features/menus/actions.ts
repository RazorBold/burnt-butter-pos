"use server"

import { and, eq, inArray, like, notInArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import { menus, menuVariants } from "@/db/schema"
import { AuthorizationError, requireRole } from "@/lib/auth"
import { fieldErrors } from "@/lib/form"
import { photoFromForm, removeStoredPhoto, uploadPhoto } from "@/lib/photo-storage"
import { photoFileError } from "@/lib/photos"

import { menuFormFromData, menuFormSchema, slugify } from "./schemas"

const PAGE_PATH = "/master-data/produk-menu"

export type MenuFormState = {
  ok?: boolean
  message?: string
  errors?: Record<string, string>
}

type Size = "large" | "regular" | "single"

function authMessage(error: unknown) {
  if (error instanceof AuthorizationError) return error.message
  throw error
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "menu"
  const taken = await getDb()
    .select({ slug: menus.slug })
    .from(menus)
    .where(like(menus.slug, `${base}%`))
  const used = new Set(taken.map((row) => row.slug))
  if (!used.has(base)) return base
  for (let i = 2; ; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`
}

export async function saveMenu(_prev: MenuFormState, formData: FormData): Promise<MenuFormState> {
  try {
    await requireRole(["admin"])
  } catch (error) {
    return { message: authMessage(error) }
  }

  const parsed = menuFormSchema.safeParse(menuFormFromData(formData))
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Periksa lagi isian yang ditandai." }
  }
  const input = parsed.data

  const photo = photoFromForm(formData)
  const photoError = photo && photoFileError(photo)
  if (photoError) return { errors: { photo: photoError } }

  const db = getDb()
  const existing = input.id
    ? (
        await db
          .select({ slug: menus.slug, photoPath: menus.photoPath })
          .from(menus)
          .where(eq(menus.id, input.id))
          .limit(1)
      )[0]
    : undefined
  if (input.id && !existing) return { message: "Menu tidak ditemukan. Muat ulang halaman." }

  const slug = existing?.slug ?? (await uniqueSlug(input.name))

  let photoPath = existing?.photoPath ?? null
  if (photo) {
    const uploaded = await uploadPhoto("menu", slug, photo)
    if ("error" in uploaded) return { errors: { photo: uploaded.error } }
    photoPath = uploaded.path
  }

  const prices: { size: Size; price: number }[] =
    input.sizing === "two_sizes"
      ? [
          { size: "large", price: input.priceLarge! },
          { size: "regular", price: input.priceRegular! },
        ]
      : [{ size: "single", price: input.priceSingle! }]

  await db.transaction(async (tx) => {
    const values = {
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      photoPath,
      isActive: input.isActive,
    }
    const [menu] = input.id
      ? await tx.update(menus).set(values).where(eq(menus.id, input.id)).returning({ id: menus.id })
      : await tx
          .insert(menus)
          .values({ ...values, slug })
          .returning({ id: menus.id })

    for (const { size, price } of prices) {
      await tx
        .insert(menuVariants)
        .values({ menuId: menu.id, size, price, isActive: true })
        .onConflictDoUpdate({
          target: [menuVariants.menuId, menuVariants.size],
          set: { price, isActive: true },
        })
    }
    // Ukuran yang tidak dipakai lagi dinonaktifkan, bukan dihapus: pesanan lama masih merujuknya.
    await tx
      .update(menuVariants)
      .set({ isActive: false })
      .where(
        and(
          eq(menuVariants.menuId, menu.id),
          notInArray(
            menuVariants.size,
            prices.map((p) => p.size),
          ),
        ),
      )
  })

  // Foto lama di Storage dibuang setelah data tersimpan (foto bawaan /images/... dibiarkan).
  if (photo) await removeStoredPhoto(existing?.photoPath)

  revalidatePath(PAGE_PATH)
  return { ok: true, message: input.id ? "Perubahan menu disimpan." : "Menu baru ditambahkan." }
}

export async function setMenusActive(
  ids: string[],
  isActive: boolean,
): Promise<{ ok: boolean; message: string }> {
  try {
    await requireRole(["admin"])
  } catch (error) {
    return { ok: false, message: authMessage(error) }
  }
  if (ids.length === 0) return { ok: false, message: "Tidak ada menu yang dipilih." }

  await getDb().update(menus).set({ isActive }).where(inArray(menus.id, ids))
  revalidatePath(PAGE_PATH)
  return {
    ok: true,
    message: isActive
      ? "Menu diaktifkan kembali."
      : "Menu dinonaktifkan. Tidak muncul di pesanan baru.",
  }
}
