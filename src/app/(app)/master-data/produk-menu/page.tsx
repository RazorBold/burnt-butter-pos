import { Plus, UtensilsCrossed } from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"

import { ActiveBadge } from "@/components/app/active-badge"
import { ActiveToggleMenu, EditIconButton } from "@/components/app/row-actions"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ReadOnlyNote,
  SectionCard,
  SectionCardHeader,
  SectionCardSkeleton,
} from "@/features/master-data/components/section-card"
import { setMenusActive } from "@/features/menus/actions"
import { CategoryManager } from "@/features/menus/components/category-manager"
import { DeleteMenuButton } from "@/features/menus/components/delete-menu-button"
import { MenuFilters } from "@/features/menus/components/menu-filters"
import { MenuFormDialog } from "@/features/menus/components/menu-form-dialog"
import { listMenuCategories, listMenus, type MenuRow } from "@/features/menus/queries"
import type { MenuCategoryRef } from "@/features/menus/schemas"
import { CAN_MANAGE_MENU } from "@/lib/access"
import { requirePageAccess } from "@/lib/auth"
import { formatRupiah } from "@/lib/format"
import { photoSrc } from "@/lib/photos"

export const metadata: Metadata = { title: "Produk & Menu" }

export default function ProdukMenuPage({ searchParams }: PageProps<"/master-data/produk-menu">) {
  return (
    <SectionCard>
      <Suspense fallback={<SectionCardSkeleton rows={7} />}>
        <MenuSection searchParams={searchParams} />
      </Suspense>
    </SectionCard>
  )
}

async function MenuSection({
  searchParams,
}: Pick<PageProps<"/master-data/produk-menu">, "searchParams">) {
  const user = await requirePageAccess("/master-data")
  // Keputusan pemilik toko (Nov 2026): menu dan kategori diatur Owner saja.
  const canEdit = CAN_MANAGE_MENU.includes(user.role)
  const params = await searchParams
  const q = typeof params.q === "string" ? params.q : undefined
  const categoryRows = await listMenuCategories()
  const categories: MenuCategoryRef[] = categoryRows.map(({ id, name, sized }) => ({
    id,
    name,
    sized,
  }))
  const categoryId = categories.find((category) => category.id === params.kategori)?.id
  const menus = await listMenus({ q, categoryId })
  const filtered = Boolean(q || categoryId)

  return (
    <>
      <SectionCardHeader
        icon={UtensilsCrossed}
        title="Produk & Menu"
        description="Kelola daftar menu, harga, kategori, dan ketersediaan."
        actions={
          <>
            <MenuFilters categories={categories} />
            {canEdit && (
              <MenuFormDialog
                categories={categories}
                trigger={
                  <Button className="h-10 rounded-lg px-4 font-semibold">
                    <Plus className="size-[18px]" aria-hidden />
                    Tambah Menu
                  </Button>
                }
              />
            )}
          </>
        }
      />

      <CategoryManager categories={categoryRows} canEdit={canEdit} />

      {menus.length === 0 ? (
        <EmptyState filtered={filtered} />
      ) : (
        <MenuTable menus={menus} categories={categories} canEdit={canEdit} />
      )}

      {!canEdit && (
        <ReadOnlyNote>
          Hanya Owner yang bisa menambah, mengubah, atau menghapus menu dan kategori.
        </ReadOnlyNote>
      )}
    </>
  )
}

function sizesLabel(menu: MenuRow) {
  const sizes = menu.variants.filter((variant) => variant.size !== "single")
  return sizes.length
    ? sizes.map((v) => (v.size === "large" ? "Large" : "Regular")).join(" / ")
    : "–"
}

/**
 * Loyang per porsi, ringkas seperti kolom harga: "Loyang 1 / 1" (Large / Regular),
 * "Loyang 3 Regular" (menu satu harga), atau "Tanpa loyang".
 */
function loyangLabel(menu: MenuRow) {
  const single = menu.variants.find((v) => v.size === "single")
  if (single) {
    return single.loyangSize && single.loyangSize !== "single" && single.loyangQty > 0
      ? `Loyang ${single.loyangQty} ${single.loyangSize === "large" ? "Large" : "Regular"}`
      : "Tanpa loyang"
  }
  const qty = menu.variants.map((v) => v.loyangQty)
  return qty.every((value) => value <= 0) ? "Tanpa loyang" : `Loyang ${qty.join(" / ")}`
}

function pricesLabel(menu: MenuRow) {
  return menu.variants.length ? menu.variants.map((v) => formatRupiah(v.price)).join(" / ") : "–"
}

function MenuTable({
  menus,
  categories,
  canEdit,
}: {
  menus: MenuRow[]
  categories: MenuCategoryRef[]
  canEdit: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[88px] pl-6">Foto</TableHead>
            <TableHead>Nama Menu</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Ukuran</TableHead>
            <TableHead>Harga</TableHead>
            <TableHead>Status</TableHead>
            {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {menus.map((menu) => {
            const src = photoSrc(menu.photoPath)
            return (
              <TableRow key={menu.id} className={menu.isActive ? undefined : "text-text-body"}>
                <TableCell className="pl-6">
                  <div className="relative h-11 w-14 overflow-hidden rounded-lg bg-icon-bg">
                    {src && <Image src={src} alt="" fill sizes="56px" className="object-cover" />}
                  </div>
                </TableCell>
                <TableCell className="max-w-[320px]">
                  <p className="font-medium text-text-strong">{menu.name}</p>
                  {menu.description && (
                    <p className="truncate text-[13px] text-text-body" title={menu.description}>
                      {menu.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>{menu.category?.name ?? "–"}</TableCell>
                <TableCell>{sizesLabel(menu)}</TableCell>
                <TableCell className="tabular-nums">
                  {pricesLabel(menu)}
                  <span className="block text-[13px] text-text-body">
                    {loyangLabel(menu)}
                  </span>
                </TableCell>
                <TableCell>
                  <ActiveBadge active={menu.isActive} />
                </TableCell>
                {canEdit && (
                  <TableCell className="pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <MenuFormDialog
                        menu={menu}
                        categories={categories}
                        trigger={<EditIconButton name={menu.name} />}
                      />
                      <DeleteMenuButton id={menu.id} name={menu.name} />
                      <ActiveToggleMenu
                        name={menu.name}
                        isActive={menu.isActive}
                        toggle={setMenusActive.bind(null, [menu.id], !menu.isActive)}
                      />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-start gap-2 px-6 py-12">
      <p className="font-semibold text-brand-ink">
        {filtered ? "Tidak ada menu yang cocok." : "Belum ada menu."}
      </p>
      <p className="text-sm text-text-body">
        {filtered
          ? "Coba kata kunci lain atau tampilkan semua kategori."
          : "Tambahkan menu pertama lewat tombol Tambah Menu."}
      </p>
      {filtered && (
        <Link
          href="/master-data/produk-menu"
          className="mt-1 text-sm font-semibold text-brand underline-offset-4 hover:underline"
        >
          Tampilkan semua menu
        </Link>
      )}
    </div>
  )
}
