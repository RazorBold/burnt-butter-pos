import { Banknote, CircleCheck, Clock, Wallet } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { KpiCard, KpiCardSkeleton } from "@/components/app/kpi-card"
import { OrderNoteLine, PaymentBadge } from "@/components/app/order-badges"
import { PAGE_CONTAINER, PageHeader } from "@/components/app/page-header"
import { TablePagination } from "@/components/app/table-pagination"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PaymentFilters } from "@/features/payments/components/payment-filters"
import { PaymentRowActions } from "@/features/payments/components/payment-row-actions"
import { parsePaymentFilters, paymentFilterParams } from "@/features/payments/filters"
import {
  getPaymentSummary,
  listActivePaymentMethods,
  listOrderPayments,
  PAYMENT_PAGE_SIZE,
} from "@/features/payments/queries"
import { requirePageAccess } from "@/lib/auth"
import {
  formatRupiah,
  formatTanggal,
  formatTanggalPendek,
  formatWaktuDibuat,
  toJakartaDateString,
} from "@/lib/format"

export const metadata: Metadata = { title: "Pembayaran" }

const PATH = "/pembayaran"

type SearchParams = PageProps<"/pembayaran">["searchParams"]

// Desain belum ada. Keputusan pemilik toko: status bayar cukup Lunas / Belum bayar, plus
// dibayar lewat apa (metode dari Master Data) dan catatan.
export default function PembayaranPage({ searchParams }: PageProps<"/pembayaran">) {
  return (
    <main className={PAGE_CONTAINER}>
      <PageHeader
        title="Pembayaran"
        description="Tandai pesanan yang sudah dibayar dan catat dibayar lewat apa."
      />
      <Suspense fallback={<SummarySkeleton />}>
        <Summary searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <PaymentList searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function readFilters(searchParams: SearchParams) {
  const today = toJakartaDateString(new Date())
  return { today, filters: parsePaymentFilters(await searchParams, today) }
}

async function Summary({ searchParams }: { searchParams: SearchParams }) {
  await requirePageAccess(PATH)
  const { filters } = await readFilters(searchParams)
  const summary = await getPaymentSummary(filters.from, filters.to)

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard icon={Clock} label="Belum Bayar" value={`${summary.unpaid.count} pesanan`} />
      <KpiCard
        icon={Banknote}
        label="Nilai Belum Dibayar"
        value={formatRupiah(summary.unpaid.value)}
      />
      <KpiCard icon={CircleCheck} label="Sudah Lunas" value={`${summary.paid.count} pesanan`} />
      <KpiCard icon={Wallet} label="Total Diterima" value={formatRupiah(summary.paid.value)} />
    </div>
  )
}

async function PaymentList({ searchParams }: { searchParams: SearchParams }) {
  await requirePageAccess(PATH)
  const { today, filters } = await readFilters(searchParams)
  const [{ rows, total, page, pageCount }, methods] = await Promise.all([
    listOrderPayments(filters),
    listActivePaymentMethods(),
  ])
  const filtered = Boolean(filters.q || filters.state || filters.methodId)
  const rangeText =
    filters.from === filters.to
      ? filters.from === today
        ? "hari ini"
        : `tanggal ${formatTanggal(filters.from)}`
      : `${formatTanggal(filters.from)} sampai ${formatTanggal(filters.to)}`

  return (
    <>
      <div className="mt-6">
        <PaymentFilters from={filters.from} to={filters.to} today={today} methods={methods} />
      </div>

      <section
        aria-label="Daftar pembayaran"
        className="mt-6 rounded-2xl border border-border bg-card"
      >
        {rows.length === 0 ? (
          <div className="px-6 py-12">
            <p className="font-semibold text-brand-ink">
              {filtered
                ? "Tidak ada pesanan yang cocok dengan filter."
                : `Belum ada pesanan ${rangeText}.`}
            </p>
            <p className="mt-1 text-sm text-text-body">
              {filtered
                ? "Ubah filter atau tekan Reset."
                : "Pilih rentang tanggal lain untuk melihat pesanan sebelumnya."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">No. Pesanan</TableHead>
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>Tgl Kirim</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status Bayar</TableHead>
                    <TableHead>Dibayar Lewat</TableHead>
                    <TableHead className="pr-6 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.orderId}>
                      <TableCell className="pl-6 font-medium tabular-nums">
                        <Link
                          href={`/pesanan/${row.orderNo}`}
                          className="text-text-strong hover:underline"
                        >
                          {row.orderNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="block font-medium text-text-strong">
                          {row.customerName}
                        </span>
                        {row.type === "hadiah" && row.senderName && (
                          <span className="block text-[13px] text-text-body">
                            dari {row.senderName}
                          </span>
                        )}
                        <OrderNoteLine note={row.orderNote} />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatTanggalPendek(row.deliveryDate)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-text-strong tabular-nums">
                        {formatRupiah(row.total)}
                      </TableCell>
                      <TableCell>
                        <PaymentBadge paid={Boolean(row.payment)} />
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        {row.payment ? (
                          <>
                            <span className="block font-medium text-text-strong">
                              {row.payment.methodName}
                            </span>
                            {row.payment.note && (
                              <span className="block text-[13px] break-words text-text-strong">
                                {row.payment.note}
                              </span>
                            )}
                            <span className="block text-[13px] text-text-body">
                              {formatWaktuDibuat(row.payment.paidAt)}
                              {row.payment.recordedByName && `, ${row.payment.recordedByName}`}
                            </span>
                          </>
                        ) : (
                          <span className="text-text-body">-</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <PaymentRowActions
                          orderId={row.orderId}
                          orderNo={row.orderNo}
                          total={row.total}
                          methods={methods}
                          paid={Boolean(row.payment)}
                          current={
                            row.payment
                              ? { methodId: row.paymentMethodId, note: row.payment.note }
                              : undefined
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              pathname={PATH}
              params={paymentFilterParams(filters, today)}
              page={page}
              pageCount={pageCount}
              pageSize={PAYMENT_PAGE_SIZE}
              total={total}
              noun="pesanan"
            />
          </>
        )}
      </section>
    </>
  )
}

function SummarySkeleton() {
  return (
    <div aria-hidden className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <KpiCardSkeleton key={index} />
      ))}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div aria-hidden className="mt-6 space-y-6">
      <Skeleton className="h-[72px] rounded-2xl" />
      <Skeleton className="h-[480px] rounded-2xl" />
    </div>
  )
}
