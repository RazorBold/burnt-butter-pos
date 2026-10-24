import { Plus, UsersRound } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { EditIconButton } from "@/components/app/row-actions"
import { TablePagination } from "@/components/app/table-pagination"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CustomerFormDialog } from "@/features/customers/components/customer-form-dialog"
import { CustomerSearch } from "@/features/customers/components/customer-search"
import { CUSTOMER_PAGE_SIZE, listCustomers } from "@/features/customers/queries"
import {
  ReadOnlyNote,
  SectionCard,
  SectionCardHeader,
  SectionCardSkeleton,
} from "@/features/master-data/components/section-card"
import { CAN_EDIT_CUSTOMER } from "@/lib/access"
import { requirePageAccess } from "@/lib/auth"
import { formatRupiah, formatTanggal } from "@/lib/format"
import { formatPhone } from "@/lib/phone"

export const metadata: Metadata = { title: "Customer" }

const PATH = "/master-data/customer"

export default function CustomerPage({ searchParams }: PageProps<"/master-data/customer">) {
  return (
    <SectionCard>
      <Suspense fallback={<SectionCardSkeleton rows={6} />}>
        <CustomerSection searchParams={searchParams} />
      </Suspense>
    </SectionCard>
  )
}

async function CustomerSection({
  searchParams,
}: Pick<PageProps<"/master-data/customer">, "searchParams">) {
  // Admin, Kasir, Owner (lihat SUBSECTION_ACCESS): berisi no. HP dan alamat customer.
  const user = await requirePageAccess(PATH)
  const canEdit = CAN_EDIT_CUSTOMER.includes(user.role)
  const params = await searchParams
  const q = typeof params.q === "string" ? params.q.trim() || undefined : undefined
  const requestedPage = Number(typeof params.hal === "string" ? params.hal : 1)
  const { rows, total, page, pageCount } = await listCustomers({
    q,
    page: Number.isInteger(requestedPage) ? requestedPage : 1,
  })

  return (
    <>
      <SectionCardHeader
        icon={UsersRound}
        title="Customer"
        description="Data customer yang pernah memesan beserta ringkasan pesanannya."
        actions={
          <>
            <CustomerSearch />
            {canEdit && (
              <CustomerFormDialog
                trigger={
                  <Button className="h-10 rounded-lg px-4 font-semibold">
                    <Plus className="size-[18px]" aria-hidden />
                    Tambah Customer
                  </Button>
                }
              />
            )}
          </>
        }
      />

      {rows.length === 0 ? (
        <div className="px-6 py-12">
          {q ? (
            <>
              <p className="font-semibold text-brand-ink">Tidak ada customer yang cocok.</p>
              <p className="mt-1 text-sm text-text-body">
                Coba nama lain, atau ketik sebagian no. HP seperti &ldquo;3456&rdquo;.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-brand-ink">Belum ada customer.</p>
              <p className="mt-1 text-sm text-text-body">
                Customer tercatat otomatis saat pesanan pertamanya diinput.
                {canEdit && " Kamu juga bisa menambahkannya manual."}
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Nama</TableHead>
                  <TableHead>No. HP</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead className="text-right">Pesanan</TableHead>
                  <TableHead className="text-right">Total Belanja</TableHead>
                  <TableHead>Pesanan Terakhir</TableHead>
                  {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="pl-6 font-medium text-text-strong">
                      {customer.name}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatPhone(customer.phone)}</TableCell>
                    <TableCell className="max-w-[260px]">
                      <span className="block truncate" title={customer.address ?? undefined}>
                        {customer.address ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{customer.orderCount}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRupiah(customer.totalSpent)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {customer.lastOrderAt ? formatTanggal(customer.lastOrderAt) : "Belum ada"}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="pr-6 text-right">
                        <CustomerFormDialog
                          customer={customer}
                          trigger={<EditIconButton name={customer.name} />}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            pathname={PATH}
            params={{ q }}
            page={page}
            pageCount={pageCount}
            pageSize={CUSTOMER_PAGE_SIZE}
            total={total}
            noun="customer"
          />
        </>
      )}

      {!canEdit && (
        <ReadOnlyNote>
          Hanya Admin dan Kasir yang bisa menambah atau mengubah customer.
        </ReadOnlyNote>
      )}
    </>
  )
}
