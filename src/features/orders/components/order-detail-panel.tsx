import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

import { OrderStatusBadge, PaymentBadge } from "@/components/app/order-badges"
import { Button } from "@/components/ui/button"
import { ORDER_CHANNEL_LABEL, SHIPPING_METHOD_LABEL } from "@/features/orders/constants"
import { DetailPanelFrame } from "@/features/orders/components/detail-panel-frame"
import { TrackingLink } from "@/components/app/shipment-badges"
import { OrderNoteButton } from "@/features/orders/components/order-note-dialog"
import { EditOrderDialog } from "@/features/orders/components/edit-order-dialog"
import { OrderStatusSelect } from "@/features/orders/components/order-status-select"
import { getOrderDetail, type OrderDetail } from "@/features/orders/queries"
import { isEditable } from "@/features/orders/status"
import { MarkPaidDialog } from "@/features/payments/components/mark-paid-dialog"
import { listActivePaymentMethods } from "@/features/payments/queries"
import { formatRupiah, formatTanggal, formatWaktuDibuat } from "@/lib/format"
import { formatPhone } from "@/lib/phone"
import { photoSrc } from "@/lib/photos"

const SIZE_LABEL = { large: "Large", regular: "Regular", single: null } as const

/** Panel Detail Pesanan (03-pesanan.png, F-33/F-34). Dibuka lewat ?pesanan=<no. pesanan>. */
export async function OrderDetailPanel({
  orderNo,
  closeHref,
}: {
  orderNo: string
  closeHref: string
}) {
  const [order, methods] = await Promise.all([getOrderDetail(orderNo), listActivePaymentMethods()])

  if (!order) {
    return (
      <DetailPanelFrame closeHref={closeHref} title="Detail Pesanan">
        <p className="px-5 py-6 text-sm text-text-body sm:px-6">
          Pesanan {orderNo} tidak ditemukan. Mungkin nomornya salah atau sudah dihapus.
        </p>
      </DetailPanelFrame>
    )
  }

  return (
    <DetailPanelFrame closeHref={closeHref} title="Detail Pesanan">
      <div className="px-5 pt-2 pb-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-xl font-bold text-brand-ink tabular-nums">{order.orderNo}</p>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-[13px] text-text-body">
          Dibuat {formatWaktuDibuat(order.createdAt)}
          {order.createdByName && ` oleh ${order.createdByName}`}
        </p>
      </div>

      <OrderInfo order={order} />
      <OrderItems order={order} />

      <div className="mt-auto space-y-3 px-5 pt-2 pb-5 sm:px-6">
        <div className="rounded-xl bg-nav-active/70 px-4 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <p className="font-semibold text-text-strong">Total Pembayaran</p>
            <p className="text-lg font-bold text-brand-ink tabular-nums">
              {formatRupiah(order.total)}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-[13px] text-text-body">
              <PaymentBadge paid={Boolean(order.payment)} />
              {order.payment && <span>via {order.payment.methodName}</span>}
            </div>
            {order.status !== "dibatalkan" && (
              <MarkPaidDialog
                orderId={order.id}
                orderNo={order.orderNo}
                total={order.total}
                methods={methods}
                current={
                  order.payment
                    ? { methodId: order.payment.methodId, note: order.payment.note }
                    : undefined
                }
                trigger={
                  <Button
                    variant={order.payment ? "outline" : "default"}
                    size="sm"
                    className="h-9 rounded-lg px-3.5"
                  >
                    {order.payment ? "Ubah pembayaran" : "Tandai Lunas"}
                  </Button>
                }
              />
            )}
          </div>
          {order.payment?.note && (
            <p className="mt-1.5 text-[13px] break-words text-text-strong">{order.payment.note}</p>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <OrderStatusSelect
            orderId={order.id}
            orderNo={order.orderNo}
            status={order.status}
            method={order.shipment.method}
          />
          <Button asChild className="h-12 rounded-lg px-4">
            <Link href={`/pesanan/${order.orderNo}`}>
              Lihat Detail Lengkap
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </DetailPanelFrame>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 py-1">
      <dt className="text-text-body">{label}</dt>
      <dd className="break-words whitespace-pre-line text-text-strong">{children}</dd>
    </div>
  )
}

/** Data customer/penerima, pengiriman, request, dan (Hadiah) pengirim + kartu ucapan. */
export function OrderInfo({ order }: { order: OrderDetail }) {
  const isHadiah = order.type === "hadiah"
  const shipping =
    order.shipment.method === "kurir_internal"
      ? `Kurir Internal Burnt Butter${order.shipment.courierName ? ` (${order.shipment.courierName})` : ""}`
      : SHIPPING_METHOD_LABEL[order.shipment.method]
  const card = [
    order.cardTo && `To: ${order.cardTo}`,
    order.cardWishes,
    order.cardFrom && `From: ${order.cardFrom}`,
  ].filter(Boolean)

  return (
    <section aria-labelledby="order-customer" className="border-t border-border px-5 py-4 sm:px-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 id="order-customer" className="font-semibold text-brand-ink">
          {isHadiah ? "Data Penerima" : "Data Customer"}
        </h3>
        <div className="flex flex-wrap justify-end gap-2">
          <OrderNoteButton orderId={order.id} orderNo={order.orderNo} note={order.note} />
          {isEditable(order.status) && <EditOrderDialog order={order} />}
        </div>
      </div>
      <dl className="text-sm">
        <Row label="Sumber">
          {ORDER_CHANNEL_LABEL[order.channel]}
          {order.marketplaceOrderNo && ` (${order.marketplaceOrderNo})`}
        </Row>
        <Row label={isHadiah ? "Nama Penerima" : "Nama Lengkap"}>{order.customer.name}</Row>
        <Row label="No. Telp">
          <span className="tabular-nums">{formatPhone(order.customer.phone)}</span>
        </Row>
        <Row label="Alamat">{order.shipment.address ?? "-"}</Row>
        <Row label="Tanggal Kirim">{formatTanggal(order.deliveryDate)}</Row>
        <Row label="Pengiriman">{shipping}</Row>
        {order.shipment.trackingUrl && order.shipment.method !== "ekspedisi" && (
          <Row label="Link Lacak">
            <TrackingLink url={order.shipment.trackingUrl} orderNo={order.orderNo} />
          </Row>
        )}
        <Row label="Request">{order.request ?? "-"}</Row>
        <Row label="Catatan">{order.note ?? "-"}</Row>
        {isHadiah && (
          <>
            <Row label="Pengirim">{order.senderName ?? "-"}</Row>
            <Row label="Kartu Ucapan">{card.length ? card.join("\n") : "-"}</Row>
          </>
        )}
      </dl>
    </section>
  )
}

export function OrderItems({ order }: { order: OrderDetail }) {
  return (
    <section aria-labelledby="order-items" className="border-t border-border px-5 py-4 sm:px-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 id="order-items" className="font-semibold text-brand-ink">
          Daftar Menu
        </h3>
        <Button asChild variant="outline" size="sm" className="h-9 rounded-lg bg-white px-3">
          <Link href={`/pesanan/${order.orderNo}#menu`}>Lihat Detail</Link>
        </Button>
      </div>
      <ul className="divide-y divide-border">
        {order.items.map((item) => {
          const src = photoSrc(item.photoPath)
          const size = SIZE_LABEL[item.size]
          return (
            <li key={item.id} className="flex items-center gap-3 py-2">
              {src ? (
                <Image
                  src={src}
                  alt=""
                  width={36}
                  height={36}
                  className="size-9 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span aria-hidden className="size-9 shrink-0 rounded-md bg-nav-active" />
              )}
              <p className="min-w-0 flex-1 text-sm text-text-strong">
                {item.menuName}
                {size && ` (${size})`}
              </p>
              <p className="text-sm font-semibold text-text-strong tabular-nums">
                <span className="sr-only">Jumlah </span>
                {item.qty}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
