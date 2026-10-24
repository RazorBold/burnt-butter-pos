import { Plus, UtensilsCrossed } from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"

import { ActiveBadge } from "@/components/app/active-badge"
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
import { MenuFilters } from "@/features/menus/components/menu-filters"
import { MenuFormDialog } from "@/features/menus/components/menu-form-dialog"
import { MenuRowActions } from "@/features/menus/components/menu-row-actions"
import { listMenus, type MenuRow } from "@/features/menus/queries"
import { CATEGORY_LABEL, MENU_CATEGORIES, type MenuCategory } from "@/features/menus/schemas"
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
  const canEdit = user.role === "admin"
  const params = await searchParams
  const q = typeof params.q === "string" ? params.q : undefined
  const category = MENU_CATEGORIES.find((value) => value === params.kategori) as
    MenuCategory | undefined
  const menus = await listMenus({ q, category })
  const filtered = Boolean(q || category)

  return (
    <>
      <SectionCardHeader
        icon={UtensilsCrossed}
        title="Produk & Menu"
        description="Kelola daftar menu, harga, kategori, dan ketersediaan."
        actions={
          <>
            <MenuFilters />
            {canEdit && (
              <MenuFormDialog
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

      {menus.length === 0 ? (
        <EmptyState filtered={filtered} />
      ) : (
        <MenuTable menus={menus} canEdit={canEdit} />
      )}

      {!canEdit && <ReadOnlyNote>Hanya Admin yang bisa menambah atau mengubah menu.</ReadOnlyNote>}
    </>
  )
}

function sizesLabel(menu: MenuRow) {
  const sizes = menu.variants.filter((variant) => variant.size !== "single")
  return sizes.length
    ? sizes.map((v) => (v.size === "large" ? "Large" : "Regular")).join(" / ")
    : "–"
}

function pricesLabel(menu: MenuRow) {
  return menu.variants.length ? menu.variants.map((v) => formatRupiah(v.price)).join(" / ") : "–"
}

function MenuTable({ menus, canEdit }: { menus: MenuRow[]; canEdit: boolean }) {
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
                <TableCell>{CATEGORY_LABEL[menu.category]}</TableCell>
                <TableCell>{sizesLabel(menu)}</TableCell>
                <TableCell className="tabular-nums">{pricesLabel(menu)}</TableCell>
                <TableCell>
                  <ActiveBadge active={menu.isActive} />
                </TableCell>
                {canEdit && (
                  <TableCell className="pr-6">
                    <MenuRowActions menu={menu} />
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
