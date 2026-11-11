import { ArrowRight, CircleAlert, PencilLine } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

import {
  KindBadge,
  OrderStatusBadge,
  PaymentBadge,
  UrgentBadge,
} from "@/components/app/order-badges"
import { Button } from "@/components/ui/button"
import { ORDER_CHANNEL_LABEL, SHIPPING_METHOD_LABEL } from "@/features/orders/constants"
import { DetailPanelFrame } from "@/features/orders/components/detail-panel-frame"
import { TrackingLinkTools } from "@/features/orders/components/tracking-link-tools"
import { OrderNoteButton } from "@/features/orders/components/order-note-dialog"
import { EditOrderDialog } from "@/features/orders/components/edit-order-dialog"
import { OrderStatusSelect } from "@/features/orders/components/order-status-select"
import { EditItemsDialog } from "@/features/orders/components/edit-items-dialog"
import { EDIT_PART_LABEL } from "@/features/orders/edit-log"
import { getOrderCatalog, getOrderDetail, type OrderDetail } from "@/features/orders/queries"
import { isEditable, isMenuEditable, isUrgent } from "@/features/orders/status"
import { UrgentButton } from "@/features/orders/components/urgent-dialog"
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
  const [order, methods, catalog] = await Promise.all([
    getOrderDetail(orderNo),
    listActivePaymentMethods(),
    getOrderCatalog(),
  ])

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
          <KindBadge kind={order.kind} />
          {isUrgent(order) && <UrgentBadge />}
        </div>
        <p className="mt-1 text-[13px] text-text-body">
          Dibuat {formatWaktuDibuat(order.createdAt)}
          {order.createdByName && ` oleh ${order.createdByName}`}
        </p>
        {order.lastEdit && (
          <p className="mt-0.5 flex items-start gap-1.5 text-[13px] text-text-strong">
            <PencilLine className="mt-0.5 size-3.5 shrink-0 text-brand-ink" aria-hidden />
            <span>
              {EDIT_PART_LABEL[order.lastEdit.part]} {formatWaktuDibuat(order.lastEdit.at)}
              {order.lastEdit.byName && (
                <>
                  {" "}
                  oleh <span className="font-semibold">{order.lastEdit.byName}</span>
                </>
              )}
              .{" "}
              <Link
                href={`/pesanan/${order.orderNo}#riwayat`}
                className="font-medium text-brand-ink underline underline-offset-2"
              >
                Lihat riwayat
              </Link>
            </span>
          </p>
        )}
        {isUrgent(order) && order.urgentNote && (
          <p className="mt-2 text-sm font-medium break-words text-trend-down-fg">
            Urgent: {order.urgentNote}
          </p>
        )}
        {(isUrgent(order) || (order.status !== "selesai" && order.status !== "dibatalkan")) && (
          <div className="mt-3">
            <UrgentButton orderId={order.id} orderNo={order.orderNo} urgent={isUrgent(order)} />
          </div>
        )}
      </div>

      <OrderInfo order={order} />
      <OrderItems
        order={order}
        action={isMenuEditable(order.status) && <EditItemsDialog order={order} catalog={catalog} />}
      />

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
          <PaidDifference order={order} />
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
  const hasGift =
    order.type === "hampers" || order.type === "normal_hampers" || Boolean(order.senderName)
  const hasGiftCard = Boolean(
    order.cardTo || order.cardWishes || order.cardFrom || order.senderName,
  )
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
          Data Penerima
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
        <Row label={hasGift ? "Nama Penerima" : "Nama Lengkap"}>{order.customer.name}</Row>
        <Row label="No. Telp">
          <span className="tabular-nums">{formatPhone(order.customer.phone)}</span>
        </Row>
        <Row label="Alamat">{order.shipment.address ?? "-"}</Row>
        <Row label="Tanggal Kirim">{formatTanggal(order.deliveryDate)}</Row>
        <Row label="Pengiriman">{shipping}</Row>
        {order.shipment.trackingUrl && order.shipment.method !== "ekspedisi" && (
          <Row label="Link Lacak">
            <TrackingLinkTools
              orderId={order.id}
              orderNo={order.orderNo}
              url={order.shipment.trackingUrl}
              sentAt={order.shipment.trackingLinkSentAt}
            />
          </Row>
        )}
        <Row label="Request">{order.request ?? "-"}</Row>
        <Row label="Catatan">{order.note ?? "-"}</Row>
        {hasGiftCard && (
          <>
            {order.senderName && <Row label="Pengirim">{order.senderName}</Row>}
            {card.length > 0 && <Row label="Kartu Ucapan">{card.join("\n")}</Row>}
          </>
        )}
      </dl>
    </section>
  )
}

/**
 * Pesanan Lunas yang menunya diubah sehingga total beda dari yang dibayar: tampilkan selisihnya
 * supaya admin menagih atau mengembalikan. Setelah beres, "Ubah pembayaran" menyamakan nominal.
 */
export function PaidDifference({ order }: { order: OrderDetail }) {
  if (!order.payment || order.payment.amount === order.total) return null
  const diff = order.total - order.payment.amount
  return (
    <p className="mt-2 flex items-start gap-1.5 text-[13px] font-medium text-status-diproses-fg">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        Dibayar {formatRupiah(order.payment.amount)}.{" "}
        {diff > 0
          ? `Customer kurang bayar ${formatRupiah(diff)}.`
          : `Customer lebih bayar ${formatRupiah(-diff)}, kembalikan.`}{" "}
        Setelah beres, klik Ubah pembayaran.
      </span>
    </p>
  )
}

export function OrderItems({ order, action }: { order: OrderDetail; action?: ReactNode }) {
  return (
    <section aria-labelledby="order-items" className="border-t border-border px-5 py-4 sm:px-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 id="order-items" className="font-semibold text-brand-ink">
          Daftar Menu
        </h3>
        <div className="flex flex-wrap gap-2">
          {action}
          <Button asChild variant="outline" size="sm" className="h-9 rounded-lg bg-white px-3">
            <Link href={`/pesanan/${order.orderNo}#menu`}>Lihat Detail</Link>
          </Button>
        </div>
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
                {item.note && (
                  <span className="mt-0.5 block text-[13px] font-medium break-words text-status-diproses-fg">
                    Catatan: {item.note}
                  </span>
                )}
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
