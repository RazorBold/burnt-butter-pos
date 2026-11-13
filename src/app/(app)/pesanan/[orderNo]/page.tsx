import { ArrowLeft, MessageCircle, PencilLine } from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { KindBadge, OrderStatusBadge, TypeBadge } from "@/components/app/order-badges"
import { PAGE_CONTAINER, PageHeaderSkeleton } from "@/components/app/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OrderInfo } from "@/features/orders/components/order-detail-panel"
import { EDIT_PART_LABEL } from "@/features/orders/edit-log"
import { OrderStatusSelect } from "@/features/orders/components/order-status-select"
import { ORDER_STATUS_LABEL } from "@/features/orders/filters"
import { EditItemsDialog } from "@/features/orders/components/edit-items-dialog"
import { getOrderCatalog, getOrderDetail, getOrderHistory } from "@/features/orders/queries"
import { isMenuEditable } from "@/features/orders/status"
import { listActiveShippingOptions } from "@/features/shipping-options/queries"
import { requirePageAccess } from "@/lib/auth"
import { formatRupiah, formatWaktuDibuat } from "@/lib/format"
import { photoSrc } from "@/lib/photos"

export async function generateMetadata({
  params,
}: PageProps<"/pesanan/[orderNo]">): Promise<Metadata> {
  const { orderNo } = await params
  return { title: `Pesanan ${orderNo}` }
}

const SIZE_LABEL = { large: "Large", regular: "Regular", single: null } as const

// Halaman Detail Lengkap (F-34). Desain belum ada; mengikuti pola panel detail dan Master Data.
export default function OrderDetailPage({ params }: PageProps<"/pesanan/[orderNo]">) {
  return (
    <main className={PAGE_CONTAINER}>
      <Link
        href="/pesanan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-ink hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Daftar Pesanan
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <OrderDetail params={params} />
      </Suspense>
    </main>
  )
}

async function OrderDetail({ params }: Pick<PageProps<"/pesanan/[orderNo]">, "params">) {
  await requirePageAccess("/pesanan")
  const { orderNo } = await params
  const order = await getOrderDetail(decodeURIComponent(orderNo))
  if (!order) notFound()
  const [history, catalog, shippingOptions] = await Promise.all([
    getOrderHistory(order.id),
    getOrderCatalog(),
    listActiveShippingOptions(),
  ])

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-[28px] leading-tight font-bold text-brand-ink tabular-nums sm:text-[32px]">
          {order.orderNo}
        </h1>
        <OrderStatusBadge status={order.status} />
        <KindBadge kind={order.kind} />
        <TypeBadge type={order.type} />
      </div>
      <p className="mt-1.5 text-[15px] text-text-body">
        Dibuat {formatWaktuDibuat(order.createdAt)}
        {order.createdByName && ` oleh ${order.createdByName}`}.{" "}
        {order.payment
          ? `Lunas via ${order.payment.methodName}${order.payment.note ? ` (${order.payment.note})` : ""}.`
          : "Belum bayar."}
      </p>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card [&>section]:border-t-0">
            <OrderInfo order={order} shippingOptions={shippingOptions} />
          </div>

          <section
            id="menu"
            aria-labelledby="menu-title"
            className="scroll-mt-28 rounded-2xl border border-border bg-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-2 sm:px-6">
              <h2 id="menu-title" className="font-semibold text-brand-ink">
                Daftar Menu
              </h2>
              {isMenuEditable(order.status) && <EditItemsDialog order={order} catalog={catalog} />}
            </div>
            <div className="overflow-x-auto">
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5 sm:pl-6">Menu</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="pr-5 text-right sm:pr-6">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => {
                    const src = photoSrc(item.photoPath)
                    const size = SIZE_LABEL[item.size]
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="pl-5 sm:pl-6">
                          <span className="flex items-center gap-3">
                            {src ? (
                              <Image
                                src={src}
                                alt=""
                                width={40}
                                height={40}
                                className="size-10 shrink-0 rounded-md object-cover"
                              />
                            ) : (
                              <span
                                aria-hidden
                                className="size-10 shrink-0 rounded-md bg-nav-active"
                              />
                            )}
                            <span className="text-text-strong">
                              {item.menuName}
                              {size && ` (${size})`}
                              {item.note && (
                                <span className="mt-0.5 block text-[13px] font-medium text-status-diproses-fg">
                                  Catatan: {item.note}
                                </span>
                              )}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatRupiah(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
                        <TableCell className="pr-5 text-right tabular-nums sm:pr-6">
                          {formatRupiah(item.subtotal)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3} className="pl-5 font-semibold sm:pl-6">
                      Total Pembayaran
                    </TableCell>
                    <TableCell className="pr-5 text-right text-lg font-bold text-brand-ink tabular-nums sm:pr-6">
                      {formatRupiah(order.total)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section
            aria-labelledby="status-title"
            className="rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <h2 id="status-title" className="font-semibold text-brand-ink">
              Status
            </h2>
            <OrderStatusSelect
              orderId={order.id}
              orderNo={order.orderNo}
              status={order.status}
              method={order.shipment.method}
              className="mt-3 w-full"
            />
            <h3 id="riwayat" className="mt-5 scroll-mt-28 text-sm font-semibold text-text-strong">
              Riwayat
            </h3>
            <ol className="mt-2 space-y-3 border-l-2 border-border pl-4">
              {history.map((entry) => (
                <li key={entry.id} className="text-sm">
                  {entry.kind === "status" ? (
                    <p className="text-text-strong">
                      {entry.fromStatus
                        ? `${ORDER_STATUS_LABEL[entry.fromStatus]} → ${ORDER_STATUS_LABEL[entry.toStatus]}`
                        : `Dibuat sebagai ${ORDER_STATUS_LABEL[entry.toStatus]}`}
                    </p>
                  ) : (
                    <>
                      <p className="flex items-center gap-1.5 font-medium text-text-strong">
                        <PencilLine className="size-3.5 shrink-0 text-brand-ink" aria-hidden />
                        {EDIT_PART_LABEL[entry.part]}
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-text-strong">
                        {entry.changes.map((change, index) => (
                          <li key={index} className="break-words">
                            {change}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <p className="text-[13px] text-text-body">
                    {formatWaktuDibuat(entry.changedAt)}
                    {entry.changedByName &&
                      `${entry.kind === "edit" ? ", oleh " : ", "}${entry.changedByName}`}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section
            aria-labelledby="wa-title"
            className="rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <h2 id="wa-title" className="flex items-center gap-2 font-semibold text-brand-ink">
              <MessageCircle className="size-[18px]" aria-hidden />
              Pesan WhatsApp asli
            </h2>
            {order.rawWaText ? (
              <pre className="mt-3 max-h-[420px] overflow-auto rounded-lg bg-white p-3.5 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-text-strong">
                {order.rawWaText}
              </pre>
            ) : (
              <p className="mt-2 text-sm text-text-body">
                Pesanan ini diisi manual, tanpa pesan WA.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

function DetailSkeleton() {
  return (
    <div aria-hidden className="mt-3">
      <PageHeaderSkeleton />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Skeleton className="h-[520px] rounded-2xl" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
    </div>
  )
}
